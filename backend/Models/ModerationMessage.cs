using System.ComponentModel.DataAnnotations;
namespace PremsCart.Models;
public class ModerationMessage
{
    public int Id { get; set; }
    public int SenderId { get; set; }
    public User Sender { get; set; } = null!;
    public int RecipientId { get; set; }
    public User Recipient { get; set; } = null!;
    public int ListingId { get; set; }
    public Listing Listing { get; set; } = null!;
    [MaxLength(1500)] public string Body { get; set; } = "";
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
