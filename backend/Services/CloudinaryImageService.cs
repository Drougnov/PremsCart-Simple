using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace PremsCart.Services;

/// <summary>
/// Sends authenticated uploads from the server to Cloudinary. The API secret
/// never enters the browser; the database stores only the HTTPS image URL.
/// No third-party NuGet package is required for Cloudinary's REST API.
/// </summary>
public sealed class CloudinaryImageService(HttpClient http, IConfiguration config, IHostEnvironment host)
{
    private string CloudName => config["Cloudinary:CloudName"]?.Trim() ?? "";
    private string ApiKey => config["Cloudinary:ApiKey"]?.Trim() ?? "";
    private string ApiSecret => config["Cloudinary:ApiSecret"]?.Trim() ?? "";

    public bool IsProduction => host.IsProduction();

    public bool IsConfigured =>
        Regex.IsMatch(CloudName, "^[a-zA-Z0-9_-]+$") &&
        !string.IsNullOrWhiteSpace(ApiKey) &&
        !string.IsNullOrWhiteSpace(ApiSecret);

    public bool IsAllowedImageUrl(string? url)
    {
        if (string.IsNullOrEmpty(url) || !IsConfigured) return false;
        // Accept only this application's own generated Cloudinary URLs.
        // Prevents saving arbitrary remote links or unsafe relative paths.
        var pattern = @"\Ahttps://res\.cloudinary\.com/" + Regex.Escape(CloudName)
            + @"/image/upload/(?:v[0-9]+/)?premscart/premscart_[a-f0-9]{32}\.(?:jpg|jpeg|png)\z";
        return Regex.IsMatch(url, pattern, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    }

    public async Task<string> UploadAsync(byte[] bytes, bool png, CancellationToken ct = default)
    {
        if (!IsConfigured) throw new InvalidOperationException("Cloudinary is not configured.");

        var id = "premscart/premscart_" + Guid.NewGuid().ToString("N");
        var extension = png ? ".png" : ".jpg";
        using var request = new HttpRequestMessage(HttpMethod.Post,
            $"https://api.cloudinary.com/v1_1/{CloudName}/image/upload");
        // HTTP Basic authentication for Cloudinary's server-side Upload API.
        // The request is always sent over HTTPS.
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{ApiKey}:{ApiSecret}")));
        using var data = new MultipartFormDataContent();
        using var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(png ? "image/png" : "image/jpeg");
        data.Add(file, "file", "product" + extension);
        data.Add(new StringContent(id), "public_id");
        request.Content = data;

        using var result = await http.SendAsync(request, ct);
        if (!result.IsSuccessStatusCode)
            throw new HttpRequestException($"Cloudinary upload returned HTTP {(int)result.StatusCode}.");

        await using var stream = await result.Content.ReadAsStreamAsync(ct);
        using var json = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        if (!json.RootElement.TryGetProperty("secure_url", out var urlElement))
            throw new InvalidOperationException("Cloudinary did not return a secure URL.");
        var url = urlElement.GetString();
        if (!IsAllowedImageUrl(url))
            throw new InvalidOperationException("Cloudinary returned an unexpected URL.");
        return url!;
    }
}
