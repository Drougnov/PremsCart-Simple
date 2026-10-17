using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PremsCart.Data;
using PremsCart.Models;

namespace PremsCart.Controllers;

[Route("api/community")]
public class CommunityController : BaseController
{
    private readonly AppDbContext db;

    public CommunityController(AppDbContext db)
    {
        this.db = db;
    }

    [AllowAnonymous, HttpGet("profiles/{id:int}")]
    public async Task<IActionResult> Profile(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null || user.IsSuspended) return NotFound();
        var reviews = await db.Reviews.Where(r => r.RevieweeId == id).OrderByDescending(r => r.CreatedAt)
            .Select(r => new { r.Rating, r.Comment, author = r.Reviewer.Name, r.CreatedAt }).ToListAsync();
        var completed = await db.Deals.CountAsync(d => d.Status == "Completed" && (d.BuyerId == id || d.Listing.SellerId == id));
        return Ok(new
        {
            user.Id,
            user.Name,
            user.Department,
            user.IsVerified,
            user.JoinedAt,
            completed,
            rating = reviews.Count == 0 ? 0 : reviews.Average(r => r.Rating),
            reviews
        });
    }

    [HttpPost("reviews")]
    public async Task<IActionResult> Review(ReviewRequest input)
    {
        var deal = await db.Deals.Include(d => d.Listing).SingleOrDefaultAsync(d => d.Id == input.DealId);
        if (deal == null) return NotFound();
        if (deal.BuyerId != CurrentUserId && deal.Listing.SellerId != CurrentUserId) return Forbid();
        if (deal.Status != "Completed") return BadRequest(new { error = "Complete the trade before reviewing." });
        if (string.IsNullOrWhiteSpace(input.Comment)) return BadRequest(new { error = "Write a short review." });
        if (await db.Reviews.AnyAsync(r => r.DealId == deal.Id && r.ReviewerId == CurrentUserId))
            return BadRequest(new { error = "You already reviewed this trade." });
        db.Reviews.Add(new Review
        {
            DealId = deal.Id,
            ReviewerId = CurrentUserId,
            RevieweeId = deal.BuyerId == CurrentUserId ? deal.Listing.SellerId : deal.BuyerId,
            Rating = input.Rating,
            Comment = input.Comment.Trim()
        });
        await db.SaveChangesAsync();
        return Ok(new { message = "Review published." });
    }

    [HttpPost("reports")]
    public async Task<IActionResult> Report(ReportRequest input)
    {
        if (!await db.Listings.AnyAsync(l => l.Id == input.ListingId && l.IsApproved && !l.IsHidden)) return NotFound();
        if (string.IsNullOrWhiteSpace(input.Reason)) return BadRequest(new { error = "Please describe the issue." });
        db.Reports.Add(new Report { ListingId = input.ListingId, ReporterId = CurrentUserId, Reason = input.Reason.Trim() });
        await db.SaveChangesAsync();
        return Ok(new { message = "Report sent to the administrator." });
    }
}
