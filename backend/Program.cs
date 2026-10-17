using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PremsCart.Data;
using PremsCart.Models;
using PremsCart.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Database")));
builder.Services.AddScoped<PasswordHasher<User>>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "PremsCart.Session";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = 401;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = 403;
            return Task.CompletedTask;
        };
        // Recheck the database so suspending an account also blocks existing sessions.
        options.Events.OnValidatePrincipal = async context =>
        {
            var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var id = int.Parse(context.Principal!.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            if (!await db.Users.AnyAsync(u => u.Id == id && !u.IsSuspended && u.IsVerified))
                context.RejectPrincipal();
        };
    });
builder.Services.AddAuthorization();
var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // This is a NEW classroom database. Never point it at the old project's database.
    await db.Database.EnsureCreatedAsync();
    if (app.Environment.IsDevelopment() && builder.Configuration.GetValue<bool>("SeedDemoData"))
        await SeedData.CreateAsync(db, scope.ServiceProvider.GetRequiredService<PasswordHasher<User>>());
    // Optionally create exactly one administrator on a fresh production deployment.
    // Unlike the local demo accounts, the credentials come from Render secrets.
    // Never reset an existing administrator's password on redeploy.
    if (app.Environment.IsProduction())
    {
        var adminEmail = builder.Configuration["InitialAdmin:Email"]?.Trim().ToLowerInvariant();
        var adminPassword = builder.Configuration["InitialAdmin:Password"];
        if (!string.IsNullOrWhiteSpace(adminEmail) && !string.IsNullOrWhiteSpace(adminPassword)
            && !await db.Users.AnyAsync(u => u.Role == "Admin"))
        {
            var universityDomain = builder.Configuration["University:EmailDomain"] ?? "bscse.puc.ac.bd";
            if (!adminEmail.EndsWith("@" + universityDomain, StringComparison.OrdinalIgnoreCase)
                || adminPassword.Length < 12)
                throw new InvalidOperationException(
                    "InitialAdmin must have an allowed university email and a password of at least 12 characters.");
            if (await db.Users.AnyAsync(u => u.Email == adminEmail))
                throw new InvalidOperationException(
                    "InitialAdmin email is already used by a non-admin account. Select a different email.");
            var admin = new User
            {
                Name = "Campus Admin",
                Email = adminEmail,
                Department = "Campus administration",
                Role = "Admin",
                IsVerified = true
            };
            admin.PasswordHash = scope.ServiceProvider
                .GetRequiredService<PasswordHasher<User>>().HashPassword(admin, adminPassword);
            db.Users.Add(admin);
            await db.SaveChangesAsync();
            app.Logger.LogInformation("An initial administrator was created.");
        }
    }
}

app.Use(async (context, next) =>
{
    // The same-origin frontend supplies this header on every change request.
    // No CORS is enabled, so a different website cannot send these requests.
    if (context.Request.Path.StartsWithSegments("/api") &&
        context.Request.Method is not ("GET" or "HEAD" or "OPTIONS") &&
        context.Request.Headers["X-PremsCart"] != "1")
    {
        context.Response.StatusCode = 400;
        await context.Response.WriteAsJsonAsync(new { error = "Invalid request origin." });
        return;
    }
    try
    {
        await next();
    }
    catch (Exception ex) when (ex is DbUpdateException || ex is Npgsql.PostgresException)
    {
        app.Logger.LogWarning(ex, "Database change was not completed");
        context.Response.StatusCode = 409;
        await context.Response.WriteAsJsonAsync(new { error = "This record changed or already exists. Refresh and try again." });
    }
});
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.Use(SessionGuard.CheckAsync);
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");
app.Run();
