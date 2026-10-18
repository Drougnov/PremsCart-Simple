// Optional controller checks using a temporary SQLite database.
// This does NOT test PostgreSQL concurrency, HTTP cookies, SMTP, or browser layout.
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.DependencyInjection;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using PremsCart.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using PremsCart.Controllers;
using PremsCart.Data;
using PremsCart.Models;

using var connection = new SqliteConnection("Data Source=:memory:");
await connection.OpenAsync();
var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options;
await using var db = new AppDbContext(options);
await db.Database.EnsureCreatedAsync();
await SeedData.CreateAsync(db, new PasswordHasher<User>());
var seller = await db.Users.SingleAsync(u => u.Email.StartsWith("seller@"));
var buyer = await db.Users.SingleAsync(u => u.Email.StartsWith("buyer@"));
var admin = await db.Users.SingleAsync(u => u.Role == "Admin");
var item = await db.Listings.FirstAsync(l => l.SellerId == seller.Id);
var deals = new DealsController(db);
var community = new CommunityController(db);
var listings = new ListingsController(db);
var moderation = new AdminController(db);
int passed = 0;

void As(BaseController controller, User user)
{
    controller.ControllerContext = new ControllerContext
    {
        HttpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(new[] {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Role, user.Role)
            }, "check"))
        }
    };
}

void Check(bool condition, string name)
{
    if (!condition) throw new Exception("FAILED: " + name);
    passed++;
    Console.WriteLine("PASS: " + name);
}

DealActionRequest Action(string action, decimal? amount = null, string? location = null, DateTime? time = null)
    => new(action, amount, location, time);

As(deals, seller);
Check(await deals.Offer(new(item.Id, 350)) is BadRequestObjectResult, "Seller cannot buy own item");
As(deals, buyer);
Check(await deals.Offer(new(item.Id, 350)) is OkObjectResult, "Buyer sends offer");
var deal = await db.Deals.SingleAsync();
Check(await deals.Offer(new(item.Id, 350)) is OkObjectResult && await db.Deals.CountAsync() == 1, "Duplicate offer returns existing conversation");
Check(await deals.Act(deal.Id, Action("accept")) is BadRequestObjectResult, "Cannot accept own offer");
As(deals, admin);
Check(await deals.Messages(deal.Id) is ForbidResult, "Non-participant cannot read chat");
Check(await deals.Send(deal.Id, new("Intrusion")) is ForbidResult, "Non-participant cannot send chat");
As(deals, seller);
Check(await deals.Act(deal.Id, Action("counter", 123.5m)) is BadRequestObjectResult, "Fractional counteroffer is rejected while the seller can counter");
Check(await deals.Act(deal.Id, Action("counter", 400)) is OkObjectResult, "Seller counteroffers");
As(deals, buyer);
Check(await deals.Send(deal.Id, new("Library works for me.")) is OkObjectResult, "Buyer sends chat");
Check(await deals.Act(deal.Id, Action("accept")) is OkObjectResult && item.Status == "Reserved", "Accept reserves item");
As(community, buyer);
Check(await community.Review(new(deal.Id, 5, "Great")) is BadRequestObjectResult, "Review blocked before completion");
Check(await deals.Act(deal.Id, Action("schedule", location: "Library", time: DateTime.UtcNow.AddHours(1))) is BadRequestObjectResult, "Buyer cannot set seller pickup plan");
As(deals, seller);
Check(await deals.Act(deal.Id, Action("schedule", location: "Elsewhere", time: DateTime.UtcNow.AddHours(1))) is BadRequestObjectResult, "Only campus pickup locations allowed");
Check(await deals.Act(deal.Id, Action("schedule", location: "Library", time: DateTime.UtcNow.AddHours(1))) is OkObjectResult, "Seller schedules pickup");
Check(deal.PickupTime > DateTime.UtcNow, "Pickup is still in the future during both confirmations");
Check(await deals.Act(deal.Id, Action("complete")) is OkObjectResult && deal.Status == "Scheduled", "Early first confirmation does not complete trade");
Check(await deals.Act(deal.Id, Action("cancel")) is BadRequestObjectResult, "Cannot cancel after handover confirmation");
As(deals, buyer);
Check(await deals.Act(deal.Id, Action("complete")) is OkObjectResult && item.Status == "Sold", "Both early confirmations complete trade");
Check(await deals.Act(deal.Id, Action("complete")) is BadRequestObjectResult, "Completed trade cannot be completed again");
As(community, buyer);
Check(await community.Review(new(deal.Id, 5, "Clear communication and on-time pickup.")) is OkObjectResult, "Buyer reviews seller");
Check(await community.Review(new(deal.Id, 4, "Duplicate")) is BadRequestObjectResult, "Duplicate review blocked");
As(community, seller);
Check(await community.Review(new(deal.Id, 5, "Friendly buyer.")) is OkObjectResult, "Seller reviews buyer");
As(community, admin);
Check(await community.Review(new(deal.Id, 5, "Outsider")) is ForbidResult, "Non-participant review blocked");

var fixedItem = await db.Listings.FirstAsync(l => l.SellerId == seller.Id && l.Id != item.Id);
fixedItem.Negotiable = false;
await db.SaveChangesAsync();
As(deals, buyer);
Check(await deals.Offer(new(fixedItem.Id, 1)) is BadRequestObjectResult, "Fixed price cannot be negotiated");
Check(await deals.Offer(new(fixedItem.Id, fixedItem.Price)) is OkObjectResult, "Fixed-price request works");
var fixedDeal = await db.Deals.SingleAsync(d => d.ListingId == fixedItem.Id);
As(deals, seller);
Check(await deals.Act(fixedDeal.Id, Action("accept")) is OkObjectResult, "Seller accepts fixed-price request");
As(deals, buyer);
Check(await deals.Act(fixedDeal.Id, Action("cancel")) is OkObjectResult && fixedItem.Status == "Available", "Cancellation releases reserved item");

As(listings, seller);
Check(await listings.Create(new("Desk lamp", "Working study lamp with cable.", "Other", "Good", 250, true, null)) is OkObjectResult, "Create item");
var lamp = await db.Listings.SingleAsync(l => l.Title == "Desk lamp");
Check(!lamp.IsApproved, "New item requires approval");
As(listings, buyer);
Check(await listings.Edit(lamp.Id, new("Changed title", "Changed description here.", "Other", "Good", 200, true, null)) is ForbidResult, "Only owner can edit item");
As(moderation, admin);
Check(await moderation.ListingAction(lamp.Id, new("approve")) is OkObjectResult && lamp.IsApproved, "Admin approves item");
As(community, buyer);
Check(await community.Report(new(lamp.Id, "Possible misleading description")) is OkObjectResult, "Student reports item");
Check(await moderation.ListingAction(lamp.Id, new("hide")) is OkObjectResult && lamp.IsHidden, "Admin hides item");
Check(await moderation.Resolve((await db.Reports.SingleAsync()).Id) is OkObjectResult, "Admin resolves report");
Check(await moderation.UserAction(buyer.Id, new("suspend")) is OkObjectResult && buyer.IsSuspended, "Admin marks account suspended");
Check(await moderation.UserAction(buyer.Id, new("restore")) is OkObjectResult && !buyer.IsSuspended, "Admin restores account");
Check(await moderation.UserAction(admin.Id, new("suspend")) is BadRequestObjectResult, "Admin suspension blocked");
// Check code verification without replacing the real email sender or faking delivery.
var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
{
    ["University:EmailDomain"] = "bscse.puc.ac.bd"
}).Build();
var passwords = new PasswordHasher<User>();
var auth = new AuthController(db, passwords, new EmailService(configuration), configuration);
var services = new ServiceCollection();
services.AddLogging();
services.AddDataProtection();
services.AddAuthentication("Cookies").AddCookie("Cookies");
using var provider = services.BuildServiceProvider();
auth.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { RequestServices = provider } };
Check(await auth.Register(new("Invalid Student", "someone@example.com", "Campus123!", "CSE")) is BadRequestObjectResult,
    "Registration rejects non-university email");
var unverified = new User
{
    Name = "Verification test", Email = "verify@bscse.puc.ac.bd", Department = "CSE",
    VerificationHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes("123456"))),
    VerificationExpires = DateTime.UtcNow.AddMinutes(10)
};
unverified.PasswordHash = passwords.HashPassword(unverified, "Campus123!");
db.Users.Add(unverified);
await db.SaveChangesAsync();
Check(await auth.Verify(new(unverified.Email, "999999")) is BadRequestObjectResult && !unverified.IsVerified,
    "Wrong code does not verify user");
unverified.VerificationExpires = DateTime.UtcNow.AddMinutes(-1);
await db.SaveChangesAsync();
Check(await auth.Verify(new(unverified.Email, "123456")) is BadRequestObjectResult,
    "Expired code is rejected");
unverified.VerificationExpires = DateTime.UtcNow.AddMinutes(10);
unverified.VerificationAttempts = 5;
await db.SaveChangesAsync();
Check(await auth.Verify(new(unverified.Email, "123456")) is BadRequestObjectResult,
    "Verification attempt limit is enforced");
unverified.VerificationAttempts = 0;
await db.SaveChangesAsync();
Check(await auth.Verify(new(unverified.Email, "123456")) is OkObjectResult && unverified.IsVerified,
    "Correct unexpired code verifies user");
Check(auth.Response.Headers.SetCookie.ToString().Contains(".AspNetCore.Cookies"),
    "Verification issues a real authentication cookie");
Check(await auth.Verify(new(unverified.Email, "123456")) is BadRequestObjectResult,
    "Verification code cannot be reused");
Check(await auth.Login(new(unverified.Email, "wrong-password")) is UnauthorizedObjectResult,
    "Incorrect password is rejected");
for (int attempt = 0; attempt < 4; attempt++)
    await auth.Login(new(unverified.Email, "wrong-password"));
Check(await auth.Login(new(unverified.Email, "Campus123!")) is ObjectResult { StatusCode: 429 },
    "Repeated failed logins temporarily lock the account");
var json = System.Text.Json.JsonSerializer.Serialize(unverified);
Check(!json.Contains("PasswordHash") && !json.Contains("VerificationHash"),
    "Serialized user excludes password and verification hashes");

// Regression checks for the reported UI/API issues.
As(listings, seller);
Check(await listings.Create(new("Decimal price", "Description for a test item.", "Other", "Good", 100.5m, true, null)) is BadRequestObjectResult,
    "Fractional item prices are rejected");
As(deals, buyer);
Check(await deals.Offer(new(fixedItem.Id, 100.5m)) is BadRequestObjectResult,
    "Fractional offers are rejected");


// Use a genuine 1x1 PNG, then submit the returned path to the actual item endpoint.
var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY9kAAAAASUVORK5CYII=");
using var pngStream = new MemoryStream(png);
var upload = await listings.Upload(new FormFile(pngStream, 0, png.Length, "file", "test.png"));
Check(upload is OkObjectResult, "Valid small PNG uploads");
var imagePath = ((OkObjectResult)upload).Value!.GetType().GetProperty("imageUrl")!.GetValue(((OkObjectResult)upload).Value)!.ToString()!;
try
{
    Check(await listings.Create(new("Uploaded photo", "Photo path regression test.", "Other", "Good", 100, true, imagePath)) is OkObjectResult,
        "Uploaded PNG path can be saved with an item");
}
finally { File.Delete("wwwroot" + imagePath); }
Check(await listings.Create(new("Legacy photo", "Existing upload remains valid.", "Other", "Good", 100, true,
    "/uploads/12345678-1234-1234-1234-123456789abc.png")) is OkObjectResult,
    "Previously uploaded hyphenated image paths remain accepted");
Check(await listings.Upload(null) is BadRequestObjectResult, "Missing image gives a friendly validation error");
Check(await listings.Create(new("Unsafe photo", "Path validation stays enabled.", "Other", "Good", 100, true,
    "/uploads/../../appsettings.json")) is BadRequestObjectResult, "Unsafe image path remains blocked");

var realFormatUser = new User { Name = "Biplob", Email = "biplob_44009@bscse.puc.ac.bd", Department = "CSE" };
db.Users.Add(realFormatUser);
await db.SaveChangesAsync();
var emailResult = await auth.Register(new("Biplob", realFormatUser.Email, "Campus123!", "CSE"));
Check(System.Text.Json.JsonSerializer.Serialize(((BadRequestObjectResult)emailResult).Value).Contains("already registered"),
    "Actual underscore-based BSCSE email passes the domain check");

var context = new DefaultHttpContext();
context.User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, buyer.Id.ToString()) }, "check"));
context.Request.Path = "/api/deals/1/action";
context.Request.Headers["X-PremsCart-User"] = seller.Id.ToString();
context.Response.Body = new MemoryStream();
bool reachedAction = false;
await SessionGuard.CheckAsync(context, _ => { reachedAction = true; return Task.CompletedTask; });
Check(context.Response.StatusCode == 409 && !reachedAction,
    "Stale seller tab cannot act with a buyer cookie");
context.Request.Headers["X-PremsCart-User"] = buyer.Id.ToString();
await SessionGuard.CheckAsync(context, _ => { reachedAction = true; return Task.CompletedTask; });
Check(reachedAction, "Matching session is allowed through");

As(deals, seller);
var sellerTrades = System.Text.Json.JsonSerializer.Serialize(((OkObjectResult)await deals.List()).Value);
Check(sellerTrades.Contains("\"isSeller\":true"), "Trade response explicitly identifies the seller");
As(deals, buyer);
var buyerTrades = System.Text.Json.JsonSerializer.Serialize(((OkObjectResult)await deals.List()).Value);
Check(buyerTrades.Contains("\"isSeller\":false"), "Trade response explicitly identifies the buyer");


As(deals, admin);
Check(await deals.Delete(deal.Id) is ForbidResult, "Outsider cannot delete a trade");
As(deals, buyer);
Check(await deals.Delete(deal.Id) is OkObjectResult && deal.BuyerDeleted && !deal.SellerDeleted,
    "Delete is scoped to the requesting participant");
Check(await deals.Messages(deal.Id) is ForbidResult, "Deleted conversation cannot be opened by that participant");
Check(await deals.Send(deal.Id, new("Hidden chat")) is ForbidResult, "Deleted conversation cannot receive messages from that participant");
var remainingBuyer = System.Text.Json.JsonSerializer.Serialize(((OkObjectResult)await deals.List()).Value);
Check(!remainingBuyer.Contains("\"Id\":" + deal.Id + ","), "Deleted trade disappears from buyer list");
As(deals, seller);
Check(await deals.Messages(deal.Id) is OkObjectResult, "Other participant keeps their conversation");
Check(await db.Reviews.CountAsync(r => r.DealId == deal.Id) == 2 && await db.Deals.AnyAsync(d => d.Id == deal.Id),
    "Deletion preserves completed transaction and both reviews");
As(community, buyer);
Check(await community.Profile(admin.Id) is NotFoundResult, "Admin has no public student profile");
As(deals, buyer);
await deals.Offer(new(fixedItem.Id, fixedItem.Price));
var activeDeal = await db.Deals.SingleAsync(d => d.ListingId == fixedItem.Id && d.Status == "Pending");
Check(await deals.Delete(activeDeal.Id) is BadRequestObjectResult, "Active transaction cannot be hidden before cancellation");
context.User = new ClaimsPrincipal(new ClaimsIdentity(new[] {
    new Claim(ClaimTypes.NameIdentifier, admin.Id.ToString()), new Claim(ClaimTypes.Role, "Admin") }, "check"));
context.Request.Headers["X-PremsCart-User"] = admin.Id.ToString();
foreach (var path in new[] { "/api/deals", "/api/community/reviews", "/api/listings/upload" })
{
    context.Request.Path = path;
    context.Request.Method = "POST";
    reachedAction = false;
    await SessionGuard.CheckAsync(context, _ => { reachedAction = true; return Task.CompletedTask; });
    Check(context.Response.StatusCode == 403 && !reachedAction, "Admin student action blocked: " + path);
}

As(deals, buyer);
Check(await deals.Act(activeDeal.Id, Action("cancel")) is OkObjectResult, "Buyer cancels attempt before retry");
var attemptsBefore = await db.Deals.CountAsync();
Check(await deals.Offer(new(fixedItem.Id, fixedItem.Price)) is OkObjectResult && await db.Deals.CountAsync() == attemptsBefore,
    "Retry reopens same buyer/item attempt without creating another trade");
Check(activeDeal.Status == "Pending" && !activeDeal.BuyerDeleted && !activeDeal.SellerDeleted, "Reopened conversation is visible to both participants");
As(deals, seller);
Check(await deals.Act(activeDeal.Id, Action("cancel")) is OkObjectResult && activeDeal.Status == "Rejected",
    "Seller cancellation of pending offer appears in Rejected tab");
var messagesBefore = await db.Messages.CountAsync(m => m.DealId == activeDeal.Id);
As(deals, buyer);
await deals.Offer(new(fixedItem.Id, fixedItem.Price));
Check(await db.Messages.CountAsync(m => m.DealId == activeDeal.Id) == messagesBefore + 1, "Reoffer preserves prior messages");

auth.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[] {
    new Claim(ClaimTypes.NameIdentifier, admin.Id.ToString()), new Claim(ClaimTypes.Role, "Admin") }, "check"));
Check(await auth.UpdateAccount(new("Updated Admin", "wrong", null, null)) is BadRequestObjectResult,
    "Admin changes require current password");
Check(await auth.UpdateAccount(new("Updated Admin", "Campus123!", "NewPassword!123", "Mismatch")) is BadRequestObjectResult,
    "Admin password confirmation must match");
Check(await auth.UpdateAccount(new("Updated Admin", "Campus123!", "NewPassword!123", "NewPassword!123")) is OkObjectResult,
    "Admin can change name and password");
Check(admin.Name == "Updated Admin" && admin.SessionVersion == 1 && passwords.VerifyHashedPassword(admin, admin.PasswordHash, "NewPassword!123") != PasswordVerificationResult.Failed,
    "Password is hashed and prior session version is revoked");
auth.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, buyer.Id.ToString()) }, "check"));
Check(await auth.UpdateAccount(new("Student", "Campus123!", null, null)) is ForbidResult, "Student cannot use admin account settings");
await DemoCatalog.CreateAsync(db, passwords);
var demo = await db.Users.SingleAsync(u => u.Email == DemoCatalog.Email);
Check(demo.IsVerified && demo.Role == "Student" && passwords.VerifyHashedPassword(demo, demo.PasswordHash, DemoCatalog.Password) != PasswordVerificationResult.Failed,
    "Demo seller created with working hashed credentials");
Check(await db.Listings.CountAsync(l => l.SellerId == demo.Id) == 24, "24 varied demo items inserted in database");
await DemoCatalog.CreateAsync(db, passwords);
Check(await db.Listings.CountAsync(l => l.SellerId == demo.Id) == 24, "Repeated demo seed creates no duplicate items");
As(listings, seller);
await listings.Create(new("Without photo", "A valid no-photo item description", "Books", "Good", 100, true, null));
Check((await db.Listings.SingleAsync(l => l.Title == "Without photo")).ImageUrl == "", "No-photo posts retain an empty photo for category placeholder");
Console.WriteLine($"\n{passed} controller checks passed. SQLite test fixture only; see docs/TEST_RESULTS.md.");
