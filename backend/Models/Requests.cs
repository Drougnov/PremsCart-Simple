using System.ComponentModel.DataAnnotations;

namespace PremsCart.Models;

public record RegisterRequest(
    [Required, StringLength(80, MinimumLength = 2)] string Name,
    [Required, EmailAddress, StringLength(160)] string Email,
    [Required, StringLength(100, MinimumLength = 8)] string Password,
    [Required, StringLength(80)] string Department);
public record LoginRequest([Required] string Email, [Required] string Password);
public record VerifyRequest([Required] string Email, [Required] string Code);
public record EmailRequest([Required, EmailAddress] string Email);
public record ListingRequest(
    [Required, StringLength(100, MinimumLength = 3)] string Title,
    [Required, StringLength(2000, MinimumLength = 10)] string Description,
    [Required] string Category, [Required] string Condition,
    [Range(1, 1000000)] decimal Price, bool Negotiable, string? ImageUrl);
public record OfferRequest(int ListingId, [Range(1, 1000000)] decimal Amount);
public record DealActionRequest([Required] string Action, decimal? Amount, string? Location, DateTime? Time);
public record MessageRequest([Required, StringLength(1500)] string Body);
public record ReviewRequest(int DealId, [Range(1, 5)] int Rating, [Required, StringLength(1000)] string Comment);
public record ReportRequest(int ListingId, [Required, StringLength(1000)] string Reason);
public record AccountRequest([Required, StringLength(80, MinimumLength = 2)] string Name, [Required] string CurrentPassword, [StringLength(100, MinimumLength = 8)] string? NewPassword, string? ConfirmPassword);
public record AdminActionRequest([Required] string Action);
