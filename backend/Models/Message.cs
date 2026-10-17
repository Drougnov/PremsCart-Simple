using System.ComponentModel.DataAnnotations;

namespace PremsCart.Models;

public class Message
{
    public int Id { get; set; }
    public int DealId { get; set; }
    public Deal Deal { get; set; } = null!;
    public int SenderId { get; set; }
    [MaxLength(1500)] public string Body { get; set; } = "";
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
