using System.ComponentModel.DataAnnotations;

namespace PremsCart.Models;

public class Review
{
    public int Id { get; set; }
    public int DealId { get; set; }
    public Deal Deal { get; set; } = null!;
    public int ReviewerId { get; set; }
    public User Reviewer { get; set; } = null!;
    public int RevieweeId { get; set; }
    public User Reviewee { get; set; } = null!;
    public int Rating { get; set; }
    [MaxLength(1000)] public string Comment { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
