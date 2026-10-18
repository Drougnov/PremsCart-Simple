using System.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PremsCart.Data;
using PremsCart.Models;

namespace PremsCart.Controllers;

[Route("api/deals")]
public class DealsController : BaseController
{
    private readonly AppDbContext db;

    public DealsController(AppDbContext db)
    {
        this.db = db;
    }

    [HttpGet]
    public async Task<IActionResult> List() => Ok(await db.Deals
        .Where(d => (d.BuyerId == CurrentUserId && !d.BuyerDeleted) || (d.Listing.SellerId == CurrentUserId && !d.SellerDeleted))
        .OrderByDescending(d => d.CreatedAt)
        .Select(d => new
        {
            d.Id,
            d.ListingId,
            title = d.Listing.Title,
            imageUrl = d.Listing.ImageUrl,
            category = d.Listing.Category,
            d.BuyerId,
            viewerId = CurrentUserId,
            isSeller = d.Listing.SellerId == CurrentUserId,
            sellerId = d.Listing.SellerId,
            buyerName = d.Buyer.Name,
            sellerName = d.Listing.Seller.Name,
            d.Listing.Negotiable,
            d.Amount,
            d.Status,
            d.LastOfferById,
            d.PickupLocation,
            d.PickupTime,
            d.BuyerConfirmed,
            d.SellerConfirmed,
            reviewed = db.Reviews.Any(r => r.DealId == d.Id && r.ReviewerId == CurrentUserId)
        })
        .ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Offer(OfferRequest input)
    {
        if (input.Amount != decimal.Truncate(input.Amount))
            return BadRequest(new { error = "Use whole taka only." });
        var listing = await db.Listings.Include(l => l.Seller).SingleOrDefaultAsync(l => l.Id == input.ListingId);
        if (listing == null) return NotFound();
        if (listing.SellerId == CurrentUserId) return BadRequest(new { error = "You cannot buy your own item." });
        if (!listing.IsApproved || listing.IsHidden || listing.Status != "Available" || listing.Seller.IsSuspended)
            return BadRequest(new { error = "This item is unavailable." });
        if (!listing.Negotiable && input.Amount != listing.Price)
            return BadRequest(new { error = "This item has a fixed price." });
        var previous = await db.Deals.Where(d => d.ListingId == listing.Id && d.BuyerId == CurrentUserId)
            .OrderByDescending(d => d.Id).FirstOrDefaultAsync();
        if (previous != null)
        {
            if (previous.Status is "Accepted" or "Scheduled" or "Completed" or "Pending") return Ok(new { previous.Id });
            previous.Status = "Pending";
            previous.Amount = input.Amount;
            previous.LastOfferById = CurrentUserId;
            previous.BuyerDeleted = false;
            previous.SellerDeleted = false;
            previous.PickupLocation = null;
            previous.PickupTime = null;
            previous.BuyerConfirmed = previous.SellerConfirmed = false;
            db.Messages.Add(new Message { DealId = previous.Id, SenderId = CurrentUserId,
                Body = $"New offer in this conversation: ৳{input.Amount:0.##}." });
            await db.SaveChangesAsync();
            return Ok(new { previous.Id });
        }
        var deal = new Deal
        {
            ListingId = listing.Id,
            BuyerId = CurrentUserId,
            Amount = decimal.Round(input.Amount, 2),
            LastOfferById = CurrentUserId
        };
        db.Deals.Add(deal);
        db.Messages.Add(new Message
        {
            Deal = deal,
            SenderId = CurrentUserId,
            Body = $"Offer sent: ৳{deal.Amount:0.##}."
        });
        await db.SaveChangesAsync();
        return Ok(new { deal.Id });
    }

    [HttpPost("{id:int}/action")]
    public async Task<IActionResult> Act(int id, DealActionRequest input)
    {
        // One database transaction: either all related changes succeed, or none do.
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        var deal = await db.Deals.Include(d => d.Listing).ThenInclude(l => l.Seller)
            .Include(d => d.Buyer).SingleOrDefaultAsync(d => d.Id == id);
        if (deal == null) return NotFound();
        var seller = deal.Listing.SellerId == CurrentUserId;
        if (!seller && deal.BuyerId != CurrentUserId) return Forbid();
        bool pending = deal.Status == "Pending";
        bool otherTurn = deal.LastOfferById != CurrentUserId;

        switch (input.Action)
        {
            case "counter":
                if (!pending || !otherTurn || !deal.Listing.Negotiable || deal.Listing.Status != "Available")
                    return BadRequest(new { error = "A counteroffer is not available now." });
                if (input.Amount is null or < 1 or > 1000000 || input.Amount != decimal.Truncate(input.Amount.Value))
                    return BadRequest(new { error = "Enter a whole-taka price between 1 and 1,000,000." });
                deal.Amount = decimal.Round(input.Amount.Value, 2);
                deal.LastOfferById = CurrentUserId;
                break;
            case "accept":
                if (!pending || !otherTurn || deal.Listing.Status != "Available" || !deal.Listing.IsApproved ||
                    deal.Listing.IsHidden || deal.Listing.Seller.IsSuspended || deal.Buyer.IsSuspended)
                    return BadRequest(new { error = "This offer cannot be accepted." });
                deal.Status = "Accepted";
                deal.Listing.Status = "Reserved";
                var competing = await db.Deals.Where(d => d.ListingId == deal.ListingId && d.Id != id && d.Status == "Pending").ToListAsync();
                foreach (var other in competing) other.Status = "Rejected";
                break;
            case "reject":
                if (!pending || !otherTurn) return BadRequest(new { error = "Only the offer recipient can reject a pending offer." });
                deal.Status = "Rejected";
                break;
            case "cancel":
                if (deal.Status is not ("Pending" or "Accepted" or "Scheduled") || deal.BuyerConfirmed || deal.SellerConfirmed)
                    return BadRequest(new { error = "This trade can no longer be cancelled." });
                if (deal.Status is "Accepted" or "Scheduled") deal.Listing.Status = "Available";
                deal.Status = pending && seller ? "Rejected" : "Cancelled";
                break;
            case "schedule":
                if (!seller)
                    return BadRequest(new { error = $"You are signed in as the buyer. Only {deal.Listing.Seller.Name}, the seller, can save this pickup plan. Use separate browser profiles for two accounts." });
                if (deal.Status is not ("Accepted" or "Scheduled"))
                    return BadRequest(new { error = "Accept the offer before arranging pickup. The current status updates automatically." });
                if (deal.BuyerConfirmed || deal.SellerConfirmed)
                    return BadRequest(new { error = "Pickup cannot change after either person confirms handover." });
                if (input.Location is not ("Main Gate" or "Library" or "Cafeteria") ||
                    input.Time == null || input.Time.Value.Kind != DateTimeKind.Utc || input.Time <= DateTime.UtcNow)
                    return BadRequest(new { error = "Choose a campus location and a future pickup time." });
                deal.PickupLocation = input.Location;
                deal.PickupTime = input.Time;
                deal.Status = "Scheduled";
                break;
            case "complete":
                if (deal.Status != "Scheduled")
                    return BadRequest(new { error = "Arrange pickup before confirming handover." });
                if (seller) deal.SellerConfirmed = true;
                else deal.BuyerConfirmed = true;
                if (deal.BuyerConfirmed && deal.SellerConfirmed)
                {
                    deal.Status = "Completed";
                    deal.Listing.Status = "Sold";
                }
                break;
            default:
                return BadRequest(new { error = "Unknown action." });
        }
        db.Messages.Add(new Message
        {
            DealId = deal.Id,
            SenderId = CurrentUserId,
            Body = $"Trade update: {input.Action}. Agreed/current offer: ৳{deal.Amount:0.##}."
        });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(new { message = "Trade updated." });
    }

    // Remove a finished conversation only for the requesting participant.
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deal = await db.Deals.Include(d => d.Listing).SingleOrDefaultAsync(d => d.Id == id);
        if (deal == null) return NotFound();
        var seller = deal.Listing.SellerId == CurrentUserId;
        if (!seller && deal.BuyerId != CurrentUserId) return Forbid();
        if (deal.Status is not ("Completed" or "Cancelled" or "Rejected"))
            return BadRequest(new { error = "Cancel or complete this trade before deleting its conversation." });
        var conversation = await db.Deals.Where(d => d.ListingId == deal.ListingId && d.BuyerId == deal.BuyerId).ToListAsync();
        if (conversation.Any(d => d.Status is "Pending" or "Accepted" or "Scheduled"))
            return BadRequest(new { error = "Cancel or complete the active trade in this conversation first." });
        foreach (var attempt in conversation)
        {
            if (seller) attempt.SellerDeleted = true;
            else attempt.BuyerDeleted = true;
        }
        await db.SaveChangesAsync();
        return Ok(new { message = "Trade and chat removed from your view." });
    }

    [HttpGet("{id:int}/messages")]
    public async Task<IActionResult> Messages(int id)
    {
        if (!await CanOpen(id)) return Forbid();
        var deal = await db.Deals.FindAsync(id);
        return Ok(await db.Messages.Where(m => m.Deal.ListingId == deal!.ListingId && m.Deal.BuyerId == deal.BuyerId).OrderBy(m => m.Id)
            .Select(m => new { m.Id, m.SenderId, m.Body, m.SentAt }).ToListAsync());
    }

    [HttpPost("{id:int}/messages")]
    public async Task<IActionResult> Send(int id, MessageRequest input)
    {
        if (!await CanOpen(id)) return Forbid();
        if (string.IsNullOrWhiteSpace(input.Body)) return BadRequest(new { error = "Write a message first." });
        db.Messages.Add(new Message { DealId = id, SenderId = CurrentUserId, Body = input.Body.Trim() });
        await db.SaveChangesAsync();
        return Ok(new { message = "Sent." });
    }

    private Task<bool> CanOpen(int id) => db.Deals.AnyAsync(d => d.Id == id &&
        ((d.BuyerId == CurrentUserId && !d.BuyerDeleted) || (d.Listing.SellerId == CurrentUserId && !d.SellerDeleted)));
}
