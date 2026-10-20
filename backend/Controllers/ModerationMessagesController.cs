using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PremsCart.Data;
using PremsCart.Models;
namespace PremsCart.Controllers;
[Route("api/moderation-messages")]
public class ModerationMessagesController(AppDbContext db) : BaseController
{
    [HttpGet]
    public async Task<IActionResult> List() => Ok(await db.ModerationMessages
        .Where(m => m.SenderId == CurrentUserId || m.RecipientId == CurrentUserId)
        .OrderByDescending(m => m.SentAt).ThenByDescending(m => m.Id)
        .Select(m => new { m.Id, m.SenderId, m.RecipientId, sender = m.Sender.Name,
            recipient = m.Recipient.Name, m.ListingId, title = m.Listing.Title, m.Body, m.SentAt }).ToListAsync());

    [HttpPost("{id:int}/reply")]
    public async Task<IActionResult> Reply(int id, MessageRequest input)
    {
        var original = await db.ModerationMessages.Include(m => m.Sender).Include(m => m.Recipient).SingleOrDefaultAsync(m => m.Id == id);
        if (original == null) return NotFound();
        if (original.RecipientId != CurrentUserId && original.SenderId != CurrentUserId) return Forbid();
        var other = original.SenderId == CurrentUserId ? original.Recipient : original.Sender;
        if (!IsAdmin && other.Role != "Admin") return Forbid();
        if (string.IsNullOrWhiteSpace(input.Body)) return BadRequest(new { error = "Write a message." });
        db.ModerationMessages.Add(new ModerationMessage { SenderId = CurrentUserId,
            RecipientId = other.Id, ListingId = original.ListingId, Body = input.Body.Trim() });
        await db.SaveChangesAsync();
        return Ok(new { message = "Reply sent." });
    }
}
