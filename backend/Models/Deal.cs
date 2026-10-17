namespace PremsCart.Models;

public class Deal
{
    public int Id { get; set; }
    public int ListingId { get; set; }
    public Listing Listing { get; set; } = null!;
    public int BuyerId { get; set; }
    public User Buyer { get; set; } = null!;
    public decimal Amount { get; set; }
    public int LastOfferById { get; set; }
    // Pending -> Accepted -> Scheduled -> Completed. Rejected/Cancelled are final.
    public string Status { get; set; } = "Pending";
    public string? PickupLocation { get; set; }
    public DateTime? PickupTime { get; set; }
    public bool BuyerConfirmed { get; set; }
    public bool SellerConfirmed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
