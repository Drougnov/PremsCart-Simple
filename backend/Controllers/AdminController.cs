using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PremsCart.Data;
using PremsCart.Models;

namespace PremsCart.Controllers;

[Authorize(Roles = "Admin"), Route("api/admin")]
public class AdminController : BaseController
{
    private readonly AppDbContext db;

    public AdminController(AppDbContext db)
    {
        this.db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Dashboard() => Ok(new
    {
        users = await db.Users.OrderBy(u => u.Name).Select(u => new { u.Id, u.Name, u.Email, u.IsVerified, u.IsSuspended, u.Role }).ToListAsync(),
        listings = await db.Listings.Where(l => !l.IsDeleted).OrderByDescending(l => l.CreatedAt)
            .Select(l => new { l.Id, l.Title, l.Description, l.ImageUrl, l.Price, l.IsApproved, l.IsHidden, l.Status, seller = l.Seller.Name }).ToListAsync(),
        reports = await db.Reports.OrderBy(r => r.IsResolved).ThenByDescending(r => r.CreatedAt)
            .Select(r => new { r.Id, r.ListingId, title = r.Listing.Title, r.Reason, r.IsResolved, reporter = r.Reporter.Name }).ToListAsync()
    });

    [HttpPost("users/{id:int}")]
    public async Task<IActionResult> UserAction(int id, AdminActionRequest input)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound();
        if (user.Role == "Admin") return BadRequest(new { error = "Admin accounts cannot be suspended here." });
        if (input.Action is not ("suspend" or "restore")) return BadRequest();
        user.IsSuspended = input.Action == "suspend";
        await db.SaveChangesAsync();
        return Ok(new { message = "Account updated." });
    }

    [HttpPost("listings/{id:int}")]
    public async Task<IActionResult> ListingAction(int id, AdminActionRequest input)
    {
        var listing = await db.Listings.FindAsync(id);
        if (listing == null || listing.IsDeleted) return NotFound();
        switch (input.Action)
        {
            case "approve": listing.IsApproved = true; listing.IsHidden = false; break;
            case "hide": listing.IsHidden = true; break;
            case "restore": listing.IsHidden = false; break;
            default: return BadRequest();
        }
        Notify(listing.SellerId, listing.Id, $"Your item ‘{listing.Title}’ has been {(input.Action == "hide" ? "hidden" : input.Action == "approve" ? "approved" : "restored")} by an administrator.");
        await db.SaveChangesAsync();
        return Ok(new { message = "Listing updated." });
    }

    [HttpPost("listings/{id:int}/message")]
    public async Task<IActionResult> MessageOwner(int id, MessageRequest input)
    {
        var listing = await db.Listings.FindAsync(id);
        if (listing == null) return NotFound();
        if (string.IsNullOrWhiteSpace(input.Body)) return BadRequest(new { error = "Write a message." });
        Notify(listing.SellerId, id, input.Body.Trim());
        await db.SaveChangesAsync();
        return Ok(new { message = "Message sent to item owner." });
    }

    private void Notify(int recipientId, int listingId, string body) =>
        db.ModerationMessages.Add(new ModerationMessage { SenderId = CurrentUserId,
            RecipientId = recipientId, ListingId = listingId, Body = body });

    [HttpPost("reports/{id:int}")]
    public async Task<IActionResult> Resolve(int id, AdminActionRequest? input = null)
    {
        var report = await db.Reports.Include(r => r.Listing).SingleOrDefaultAsync(r => r.Id == id);
        if (report == null) return NotFound();
        var action = input?.Action ?? "resolve";
        if (action is not ("hide" or "resolve")) return BadRequest();
        if (report.IsResolved) return Ok(new { message = "Report already resolved." });
        if (action == "hide")
        {
            report.Listing.IsHidden = true;
            Notify(report.Listing.SellerId, report.ListingId, $"Your item ‘{report.Listing.Title}’ has been hidden following a report review. Reply here to discuss this decision.");
        }
        report.IsResolved = true;
        Notify(report.ReporterId, report.ListingId, action == "hide"
            ? $"Your report about ‘{report.Listing.Title}’ was reviewed. The item has been hidden and your report is resolved."
            : $"Your report about ‘{report.Listing.Title}’ was reviewed and marked resolved. No additional visibility change was made by this action.");
        await db.SaveChangesAsync();
        return Ok(new { message = "Report resolved and reporter notified." });
    }
}
