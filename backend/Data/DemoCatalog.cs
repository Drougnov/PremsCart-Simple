using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PremsCart.Models;
namespace PremsCart.Data;

// Explicit demonstration catalog. No real user's data is replaced or reset.
public static class DemoCatalog
{
    public const string Email = "demo_catalog@bscse.puc.ac.bd";
    public const string Password = "GoodsDemo!4827";
    public static async Task CreateAsync(AppDbContext db, PasswordHasher<User> hasher)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        // Serialize concurrent deployment seeds on PostgreSQL.
        if (db.Database.ProviderName == "Npgsql.EntityFrameworkCore.PostgreSQL")
            await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(71820418)");
        var seller = await db.Users.SingleOrDefaultAsync(u => u.Email == Email);
        if (seller != null && (seller.Role != "Student" || seller.Department != "Demonstration account"))
            throw new InvalidOperationException("Demo catalog email is already in use by another account; disable DemoCatalog:Enabled.");
        if (seller == null)
        {
            seller = new User { Name = "Demo Goods Seller", Email = Email, Department = "Demonstration account", IsVerified = true };
            seller.PasswordHash = hasher.HashPassword(seller, Password);
            db.Users.Add(seller);
            await db.SaveChangesAsync();
        }
        var items = new (string Title, string Category, decimal Price, string Image)[] {
            ("Semester reading bundle", "Books", 450m, "/images/books.jpg"),
            ("Pre-loved paperback collection", "Books", 600m, "/images/books.jpg"),
            ("Library corner book bundle", "Books", 350m, "/images/books.jpg"),
            ("Weekend reading stack", "Books", 750m, "/images/books.jpg"),
            ("Casio scientific calculator", "Electronics", 1500m, "/images/electronics.jpg"),
            ("Scientific calculator for engineering", "Electronics", 1250m, "/images/electronics.jpg"),
            ("Arduino Uno development board", "Project parts", 650m, "/images/parts.jpg"),
            ("Arduino board for lab practice", "Project parts", 700m, "/images/parts.jpg"),
            ("Spare Arduino Uno for projects", "Project parts", 550m, "/images/parts.jpg"),
            ("Notebook and pen study set", "Stationery", 220m, "/images/stationery.jpg"),
            ("Daily notes notebook with pen", "Stationery", 180m, "/images/stationery.jpg"),
            ("Class notes starter set", "Stationery", 250m, "/images/stationery.jpg"),
            ("Laptop for coursework", "Electronics", 35000m, "/images/demo/laptop.jpg"),
            ("Laptop for coding practice", "Electronics", 32000m, "/images/demo/laptop.jpg"),
            ("Over-ear study headphones", "Electronics", 1800m, "/images/demo/headphones.jpg"),
            ("Headphones for online classes", "Electronics", 2200m, "/images/demo/headphones.jpg"),
            ("Computer keyboard", "Electronics", 1200m, "/images/demo/keyboard.jpg"),
            ("Desk mouse", "Electronics", 650m, "/images/demo/mouse.jpg"),
            ("Minimal wristwatch", "Other", 900m, "/images/demo/watch.jpg"),
            ("Everyday shoulder bag", "Other", 800m, "/images/demo/bag.jpg"),
            ("Reusable water bottle", "Other", 450m, "/images/demo/bottle.jpg"),
            ("Study room stool", "Other", 2500m, "/images/demo/chair.jpg"),
            ("Spare keyboard for desktop", "Electronics", 950m, "/images/demo/keyboard.jpg"),
            ("Water bottle for class days", "Other", 500m, "/images/demo/bottle.jpg")
        };
        var existing = await db.Listings.Where(l => l.SellerId == seller.Id).Select(l => l.Title).ToListAsync();
        var index = 0;
        foreach (var item in items)
        {
            index++;
            if (existing.Contains(item.Title)) continue;
            db.Listings.Add(new Listing {
                SellerId = seller.Id, Title = item.Title, Category = item.Category, Price = item.Price,
                ImageUrl = item.Image, IsApproved = true, Negotiable = index % 2 == 0,
                Condition = new[] { "Good", "Like new", "New", "Fair" }[index % 4],
                Description = "DEMO ITEM — for exploring the marketplace and testing trades. " + item.Title +
                    ". The photograph is a representative real stock image, not a claim about an actual item for sale. " +
                    "Use chat to try offers and pickup arrangements. No real purchase or payment is expected.",
                CreatedAt = DateTime.UtcNow.AddMinutes(-index * 30)
            });
        }
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
    }
}
