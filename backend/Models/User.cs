using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PremsCart.Models;

public class User
{
    public int Id { get; set; }
    [MaxLength(80)] public string Name { get; set; } = "";
    [MaxLength(160)] public string Email { get; set; } = "";
    [MaxLength(80)] public string Department { get; set; } = "";
    [JsonIgnore] public string PasswordHash { get; set; } = "";
    [MaxLength(1000)] public string AvatarUrl { get; set; } = "";
    public string Role { get; set; } = "Student";
    public bool IsVerified { get; set; }
    public bool IsSuspended { get; set; }
    [JsonIgnore] public string? VerificationHash { get; set; }
    [JsonIgnore] public DateTime? VerificationExpires { get; set; }
    [JsonIgnore] public int VerificationAttempts { get; set; }
    [JsonIgnore] public int LoginAttempts { get; set; }
    [JsonIgnore] public DateTime? LockedUntil { get; set; }
    [JsonIgnore] public int SessionVersion { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
