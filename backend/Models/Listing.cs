using System.ComponentModel.DataAnnotations;

namespace PremsCart.Models;

public class Listing
{
    public int Id { get; set; }
    public int SellerId { get; set; }
    public User Seller { get; set; } = null!;
    [MaxLength(100)] public string Title { get; set; } = "";
    [MaxLength(2000)] public string Description { get; set; } = "";
    public string Category { get; set; } = "Books";
    public string Condition { get; set; } = "Good";
    public decimal Price { get; set; }
    public bool Negotiable { get; set; } = true;
    public string ImageUrl { get; set; } = "/images/books.jpg";
    // Approval and availability are separate: hiding a listing never cancels a deal.
    public bool IsApproved { get; set; }
    public bool IsHidden { get; set; }
    public string Status { get; set; } = "Available";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
