using System.ComponentModel.DataAnnotations;

namespace PremsCart.Models;

public class Report
{
    public int Id { get; set; }
    public int ListingId { get; set; }
    public Listing Listing { get; set; } = null!;
    public int ReporterId { get; set; }
    public User Reporter { get; set; } = null!;
    [MaxLength(1000)] public string Reason { get; set; } = "";
    public bool IsResolved { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
