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
        listings = await db.Listings.OrderByDescending(l => l.CreatedAt)
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
        if (listing == null) return NotFound();
        switch (input.Action)
        {
            case "approve": listing.IsApproved = true; listing.IsHidden = false; break;
            case "hide": listing.IsHidden = true; break;
            case "restore": listing.IsHidden = false; break;
            default: return BadRequest();
        }
        await db.SaveChangesAsync();
        return Ok(new { message = "Listing updated." });
    }

    [HttpPost("reports/{id:int}")]
    public async Task<IActionResult> Resolve(int id)
    {
        var report = await db.Reports.FindAsync(id);
        if (report == null) return NotFound();
        report.IsResolved = true;
        await db.SaveChangesAsync();
        return Ok(new { message = "Report resolved." });
    }
}
