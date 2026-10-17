using Microsoft.EntityFrameworkCore;
using PremsCart.Models;

namespace PremsCart.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Listing> Listings => Set<Listing>();
    public DbSet<Deal> Deals => Set<Deal>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Report> Reports => Set<Report>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<User>().HasIndex(u => u.Email).IsUnique();
        model.Entity<Listing>().Property(x => x.Price).HasPrecision(12, 2);
        model.Entity<Deal>().Property(x => x.Amount).HasPrecision(12, 2);
        model.Entity<Review>().HasIndex(x => new { x.DealId, x.ReviewerId }).IsUnique();
        // PostgreSQL enforces one reserved deal per item, even for simultaneous requests.
        model.Entity<Deal>().HasIndex(x => x.ListingId).IsUnique()
            .HasFilter("\"Status\" IN ('Accepted', 'Scheduled', 'Completed')");
        model.Entity<Deal>().HasIndex(x => new { x.ListingId, x.BuyerId }).IsUnique()
            .HasFilter("\"Status\" = 'Pending'");
        foreach (var relationship in model.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            relationship.DeleteBehavior = DeleteBehavior.Restrict;
    }
}
