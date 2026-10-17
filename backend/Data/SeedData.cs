using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PremsCart.Models;

namespace PremsCart.Data;

public static class SeedData
{
    public static async Task CreateAsync(AppDbContext db, PasswordHasher<User> hasher)
    {
        if (await db.Users.AnyAsync()) return;
        var seller = MakeUser("Ayesha Rahman", "seller", "Student", hasher);
        var buyer = MakeUser("Rafi Ahmed", "buyer", "Student", hasher);
        var admin = MakeUser("Campus Admin", "admin", "Admin", hasher);
        db.Users.AddRange(seller, buyer, admin);
        await db.SaveChangesAsync();
        db.Listings.AddRange(
            MakeListing(seller, "A fresh chapter: study books", "A bundle of study books for your desk. Sample campus item; replace with your own details and photo.", "Books", 450, "/images/books.jpg"),
            MakeListing(seller, "Casio scientific calculator", "A reliable scientific calculator in great working condition. Comes with its protective cover.", "Electronics", 950, "/images/electronics.jpg"),
            MakeListing(seller, "A fresh start for your desk", "Notebook and pen for study notes. Sample campus stationery item.", "Stationery", 220, "/images/stationery.jpg"),
            MakeListing(buyer, "Arduino starter essentials", "Arduino Uno development board. A useful starting point for a university electronics project.", "Project parts", 650, "/images/parts.jpg")
        );
        await db.SaveChangesAsync();
    }

    private static User MakeUser(string name, string email, string role, PasswordHasher<User> hasher)
    {
        var user = new User { Name = name, Email = email + "@bscse.puc.ac.bd", Department = "Computer Science & Engineering", Role = role, IsVerified = true };
        user.PasswordHash = hasher.HashPassword(user, "Campus123!");
        return user;
    }

    private static Listing MakeListing(User seller, string title, string description, string category, decimal price, string image) =>
        new()
        {
            SellerId = seller.Id,
            Title = title,
            Description = description,
            Category = category,
            Price = price,
            ImageUrl = image,
            IsApproved = true,
            Condition = "Good"
        };
}
