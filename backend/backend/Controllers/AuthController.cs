using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PremsCart.Data;
using PremsCart.Models;
using PremsCart.Services;

namespace PremsCart.Controllers;

[Route("api/auth")]
public class AuthController : BaseController
{
    private readonly AppDbContext db;
    private readonly PasswordHasher<User> hasher;
    private readonly EmailService emailService;
    private readonly IConfiguration configuration;

    public AuthController(AppDbContext db, PasswordHasher<User> hasher, EmailService emailService, IConfiguration configuration)
    {
        this.db = db;
        this.hasher = hasher;
        this.emailService = emailService;
        this.configuration = configuration;
    }

    [AllowAnonymous, HttpGet("settings")]
    public IActionResult Settings() => Ok(new { emailDomain = configuration["University:EmailDomain"] });

    [AllowAnonymous, HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest input)
    {
        var email = input.Email.Trim().ToLowerInvariant();
        var domain = configuration["University:EmailDomain"] ?? "bscse.puc.ac.bd";
        if (!email.EndsWith("@" + domain, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = $"Use your @{domain} university email." });
        if (await db.Users.AnyAsync(u => u.Email == email))
            return BadRequest(new { error = "This email is already registered. Sign in or resend verification." });
        var user = new User { Name = input.Name.Trim(), Email = email, Department = input.Department.Trim() };
        user.PasswordHash = hasher.HashPassword(user, input.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return await SendCode(user);
    }

    [AllowAnonymous, HttpPost("resend")]
    public async Task<IActionResult> Resend(EmailRequest input)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == input.Email.Trim().ToLowerInvariant());
        if (user == null || user.IsVerified)
            return BadRequest(new { error = "Use an unverified registered email." });
        if (user.VerificationExpires > DateTime.UtcNow.AddMinutes(9))
            return BadRequest(new { error = "Please wait one minute before requesting another code." });
        return await SendCode(user);
    }

    private async Task<IActionResult> SendCode(User user)
    {
        var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        user.VerificationHash = Hash(code);
        user.VerificationExpires = DateTime.UtcNow.AddMinutes(10);
        user.VerificationAttempts = 0;
        await db.SaveChangesAsync();
        try
        {
            await emailService.SendCodeAsync(user.Email, code);
        }
        catch (System.Net.Mail.SmtpException)
        {
            return StatusCode(503, new { error = "Account saved, but email could not be sent. Start Mailpit or configure SMTP, then resend the code." });
        }
        return Ok(new { message = "Verification code sent. Check your inbox." });
    }

    [AllowAnonymous, HttpPost("verify")]
    public async Task<IActionResult> Verify(VerifyRequest input)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == input.Email.Trim().ToLowerInvariant());
        if (user == null || user.IsSuspended || user.IsVerified || user.VerificationExpires == null ||
            user.VerificationExpires < DateTime.UtcNow || user.VerificationAttempts >= 5)
            return BadRequest(new { error = "Code expired or unavailable. Request a new code." });
        user.VerificationAttempts++;
        if (Hash(input.Code.Trim()) != user.VerificationHash)
        {
            await db.SaveChangesAsync();
            return BadRequest(new { error = "Incorrect code." });
        }
        user.IsVerified = true;
        user.VerificationHash = null;
        user.VerificationExpires = null;
        await db.SaveChangesAsync();
        return await SignIn(user);
    }

    [AllowAnonymous, HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest input)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == input.Email.Trim().ToLowerInvariant());
        if (user == null) return Unauthorized(new { error = "Email or password is incorrect." });
        if (user.LockedUntil > DateTime.UtcNow)
            return StatusCode(429, new { error = "Too many attempts. Try again in 15 minutes." });
        if (hasher.VerifyHashedPassword(user, user.PasswordHash, input.Password) == PasswordVerificationResult.Failed)
        {
            user.LoginAttempts++;
            if (user.LoginAttempts >= 5)
            {
                user.LockedUntil = DateTime.UtcNow.AddMinutes(15);
                user.LoginAttempts = 0;
            }
            await db.SaveChangesAsync();
            return Unauthorized(new { error = "Email or password is incorrect." });
        }
        if (!user.IsVerified || user.IsSuspended)
            return StatusCode(403, new { error = "Verify your email first, or contact an administrator if suspended." });
        user.LoginAttempts = 0;
        user.LockedUntil = null;
        await db.SaveChangesAsync();
        return await SignIn(user);
    }

    private async Task<IActionResult> SignIn(User user)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Role, user.Role) };
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme)));
        return Ok(user);
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me() => Ok(await db.Users.FindAsync(CurrentUserId));

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync();
        return Ok(new { message = "Signed out." });
    }

    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
