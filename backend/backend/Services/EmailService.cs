using System.Net;
using System.Net.Mail;

namespace PremsCart.Services;

public class EmailService
{
    private readonly IConfiguration configuration;

    public EmailService(IConfiguration configuration)
    {
        this.configuration = configuration;
    }

    public async Task SendCodeAsync(string email, string code)
    {
        using var client = new SmtpClient(configuration["Email:Host"] ?? "localhost",
            configuration.GetValue<int>("Email:Port", 1025));
        client.EnableSsl = configuration.GetValue<bool>("Email:UseSsl");
        if (!string.IsNullOrWhiteSpace(configuration["Email:Username"]))
            client.Credentials = new NetworkCredential(configuration["Email:Username"], configuration["Email:Password"]);
        using var message = new MailMessage(configuration["Email:From"]!, email,
            "Verify your PremsCart account", $"Your verification code is {code}. It expires in 10 minutes.");
        await client.SendMailAsync(message);
    }
}
