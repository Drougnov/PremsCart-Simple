using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PremsCart.Services;
using PremsCart.Data;
using PremsCart.Models;

namespace PremsCart.Controllers;

[Route("api/listings")]
public class ListingsController : BaseController
{
    private readonly AppDbContext db;
    private readonly CloudinaryImageService? images;

    // The optional service preserves existing local developer checks.
    public ListingsController(AppDbContext db, CloudinaryImageService? images = null)
    {
        this.db = db;
        this.images = images;
    }

    public static readonly string[] Categories = ["Books", "Electronics", "Stationery", "Project parts", "Other"];
    public static readonly string[] Conditions = ["New", "Like new", "Good", "Fair"];

    [AllowAnonymous, HttpGet]
    public async Task<IActionResult> Browse(string? search, string? category, string? condition,
        decimal? maxPrice, string? sort, bool mine = false)
    {
        var query = db.Listings.Include(l => l.Seller).AsQueryable();
        if (mine)
        {
            if (User.Identity?.IsAuthenticated != true) return Unauthorized();
            query = query.Where(l => l.SellerId == CurrentUserId);
        }
        else
            query = query.Where(l => l.IsApproved && !l.IsHidden && !l.Seller.IsSuspended && l.Status == "Available");
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(l => l.Title.ToLower().Contains(search.ToLower()) || l.Description.ToLower().Contains(search.ToLower()));
        if (!string.IsNullOrEmpty(category)) query = query.Where(l => l.Category == category);
        if (!string.IsNullOrEmpty(condition)) query = query.Where(l => l.Condition == condition);
        if (maxPrice != null) query = query.Where(l => l.Price <= maxPrice);
        query = sort == "price" ? query.OrderBy(l => l.Price) : query.OrderByDescending(l => l.CreatedAt);
        return Ok(await query.Select(l => new
        {
            l.Id,
            l.Title,
            l.Description,
            l.Category,
            l.Condition,
            l.Price,
            l.Negotiable,
            l.ImageUrl,
            l.Status,
            l.IsApproved,
            l.IsHidden,
            l.SellerId,
            sellerName = l.Seller.Name,
            l.CreatedAt
        }).ToListAsync());
    }

    [AllowAnonymous, HttpGet("{id:int}")]
    public async Task<IActionResult> Detail(int id)
    {
        var listing = await db.Listings.Include(l => l.Seller).SingleOrDefaultAsync(l => l.Id == id);
        if (listing == null) return NotFound();
        var owner = User.Identity?.IsAuthenticated == true && (CurrentUserId == listing.SellerId || IsAdmin);
        if ((!listing.IsApproved || listing.IsHidden || listing.Seller.IsSuspended) && !owner) return NotFound();
        return Ok(new
        {
            listing.Id,
            listing.Title,
            listing.Description,
            listing.Category,
            listing.Condition,
            listing.Price,
            listing.Negotiable,
            listing.ImageUrl,
            listing.Status,
            listing.SellerId,
            sellerName = listing.Seller.Name,
            listing.Seller.Department,
            listing.Seller.IsVerified
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(ListingRequest input)
    {
        var error = Validate(input);
        if (error != null) return BadRequest(new { error });
        var listing = new Listing { SellerId = CurrentUserId };
        Apply(listing, input);
        db.Listings.Add(listing);
        await db.SaveChangesAsync();
        return Ok(new { listing.Id });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Edit(int id, ListingRequest input)
    {
        // A short DB transaction keeps an edit from racing an accepted offer.
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        var listing = await db.Listings.FindAsync(id);
        if (listing == null) return NotFound();
        if (listing.SellerId != CurrentUserId) return Forbid();
        if (listing.Status != "Available" || await db.Deals.AnyAsync(d => d.ListingId == id && d.Status == "Pending"))
            return BadRequest(new { error = "Resolve pending offers before editing. Reserved or sold items cannot be edited." });
        var error = Validate(input);
        if (error != null) return BadRequest(new { error });
        Apply(listing, input);
        listing.IsApproved = false;
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(new { message = "Updated and sent for approval." });
    }

    [HttpPost("upload"), RequestSizeLimit(3_000_000)]
    public async Task<IActionResult> Upload(IFormFile? file)
    {
        if (file == null || file.Length == 0 || file.Length > 2_000_000)
            return BadRequest(new { error = "Choose a PNG or JPEG image smaller than 2 MB." });
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        var bytes = stream.ToArray();
        bool png = bytes.Length > 8 && bytes.Take(8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        bool jpeg = bytes.Length > 3 && bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255;
        if (!png && !jpeg) return BadRequest(new { error = "Only PNG and JPEG images are supported." });
        // In production, never save user uploads to Render's temporary disk.
        // Cloudinary URLs persist across Render deploys/restarts.
        if (images?.IsConfigured == true)
        {
            try
            {
                var cloudUrl = await images.UploadAsync(bytes, png, HttpContext?.RequestAborted ?? CancellationToken.None);
                return Ok(new { imageUrl = cloudUrl });
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException
                or System.Text.Json.JsonException or InvalidOperationException)
            {
                return StatusCode(502, new { error = "Image storage is unavailable. Please try again." });
            }
        }
        if (images?.IsProduction == true)
            return StatusCode(503, new { error = "Cloudinary storage is not configured. Contact an administrator." });

        // Keep the original local workflow for offline development and existing checks.
        var name = Guid.NewGuid().ToString("N") + (png ? ".png" : ".jpg");
        Directory.CreateDirectory("wwwroot/uploads");
        await System.IO.File.WriteAllBytesAsync("wwwroot/uploads/" + name, bytes);
        return Ok(new { imageUrl = "/uploads/" + name });
    }

    private string? Validate(ListingRequest input)
    {
        if (input.Price != decimal.Truncate(input.Price)) return "Use whole taka only (for example, 1500).";
        if (!Categories.Contains(input.Category) || !Conditions.Contains(input.Condition)) return "Choose a valid category and condition.";
        if (string.IsNullOrWhiteSpace(input.Title) || string.IsNullOrWhiteSpace(input.Description)) return "Title and description are required.";
        if (!string.IsNullOrEmpty(input.ImageUrl) &&
            !System.Text.RegularExpressions.Regex.IsMatch(input.ImageUrl, @"^(/uploads/(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})\.(png|jpg)|/images/(books|electronics|stationery|parts|other)\.(svg|jpg))$") &&
            images?.IsAllowedImageUrl(input.ImageUrl) != true)
            return "Upload a valid product image.";
        return null;
    }

    private static void Apply(Listing listing, ListingRequest input)
    {
        listing.Title = input.Title.Trim();
        listing.Description = input.Description.Trim();
        listing.Category = input.Category;
        listing.Condition = input.Condition;
        listing.Price = input.Price;
        listing.Negotiable = input.Negotiable;
        listing.ImageUrl = input.ImageUrl ?? "/images/other.jpg";
    }
}
