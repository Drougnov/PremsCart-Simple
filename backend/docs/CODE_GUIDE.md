# Explain the code to your teacher

## The one-minute explanation

“PremsCart connects students who want to buy and sell items inside the university. React displays the pages. When someone performs an action, React sends an HTTP request to an ASP.NET Core controller. The controller checks the rules and uses Entity Framework Core to read or update PostgreSQL. The result comes back as JSON and React updates the page.”

## Read the code in this order

| Read | What to understand |
| --- | --- |
| `backend/Models/User.cs`, `Listing.cs`, `Deal.cs` | The main objects and their properties |
| `backend/Data/AppDbContext.cs` | How those objects become database tables |
| `backend/Controllers/ListingsController.cs` | Basic read/create/update operations |
| `backend/Controllers/DealsController.cs` | The offer and pickup rules |
| `frontend/src/api.js` | How the frontend contacts the backend |
| `frontend/src/pages/Marketplace.jsx` | Fetching and displaying listings |
| `frontend/src/pages/ListingDetail.jsx` | Sending an offer |
| `frontend/src/components/TradeDetail.jsx` | Buttons/forms for a trade |
| `backend/Controllers/AuthController.cs` | Registration, codes, login, logout |
| `backend/Program.cs` | How all pieces are registered and started |

The `checks` folder is optional test code. It is not an extra application layer.

## The six database classes

| Class/table | Stores | Main connections |
| --- | --- | --- |
| User | Name, email, password hash, department, role, verification, suspension | A user can sell listings and buy through deals |
| Listing | Title, description, photo path, price, category, condition, availability | Belongs to one seller |
| Deal | Current price, buyer, status, pickup plan, both confirmations | Belongs to one listing and one buyer |
| Message | Sender, body, time | Belongs to one deal |
| Review | Rating, comment, reviewer and reviewed person | Belongs to a completed deal |
| Report | Report reason and resolution | Belongs to a listing and reporter |

The seller of a deal is found through `deal.Listing.SellerId`. There is no duplicate seller field to keep synchronized.

## Example: sending an offer

1. Open `frontend/src/pages/ListingDetail.jsx`.
2. Find the form with **Send offer & start chat**.
3. It sends the listing ID and amount to `api('/deals', ...)`.
4. `api.js` turns the object into JSON and sends a POST request.
5. ASP.NET routes it to `DealsController.Offer`.
6. The method finds the listing and rejects invalid cases, such as buying your own item.
7. It creates a `Deal` with status `Pending`, and adds its first message.
8. `SaveChangesAsync()` stores the new records.
9. React receives the deal ID and opens My trades.

This is a complete frontend-to-database flow you can explain line by line.

## Example: accepting an offer

`DealsController.Act` receives an action such as `accept`.

- It loads the deal, buyer, listing, and seller.
- It checks that the signed-in user is one of the participants.
- It checks that the user is receiving the offer, not accepting their own offer.
- It marks the deal `Accepted` and the listing `Reserved`.
- It rejects competing pending offers for the same item.
- It saves everything in one database transaction.

A database transaction means that these related changes either all succeed or all fail. A unique database index also prevents two accepted deals for one item. Those two short protections are retained because selling one item twice would be a serious bug.

## Trade statuses

| Status | Meaning | What normally happens next |
| --- | --- | --- |
| Pending | Someone has proposed a price | The other person accepts, rejects, or counters |
| Accepted | Both sides agree on the price; item reserved | Seller records the pickup plan |
| Scheduled | Location and time are recorded | Both people confirm after handover |
| Completed | Both people confirmed; item sold | Each participant can leave one review |
| Rejected | Recipient declined, or another buyer reserved the item | History stays visible |
| Cancelled | A participant withdrew before handover confirmation | Reserved item becomes available again |

`LastOfferById` tells the app whose turn it is. A counteroffer updates the price and changes that ID. Chat keeps a short history of trade actions.

## React concepts used

- **Component:** a function that returns part of the page. `ListingCard` is reused for every item.
- **Props:** values passed to a component, such as a listing or current user.
- **useState:** stores changing values such as filters, messages, or errors.
- **useEffect:** fetches data after a page opens; the chat effect also starts and cleans up a polling timer.
- **map:** turns an array of listings into cards.
- **Conditional rendering:** displays an admin link only for an admin, or a review form only after completion. The backend still checks permissions independently.
- **Hash navigation:** URLs such as `#/trades/3` choose a page. `App.jsx` listens for `hashchange`, so no routing dependency is needed.

`ActionForm` handles ordinary loading and error messages for forms. The page supplies the actual save function. This avoids repeating the same try/catch code in every form.

## C# concepts used

- **Class/object:** `Listing` describes an item; a particular listing is an object.
- **Properties:** `Title`, `Price`, and `SellerId` hold an object's data.
- **Constructor:** receives dependencies, such as `AppDbContext`, and assigns them to private fields.
- **Encapsulation:** controllers keep their database dependency in a private field; helper methods such as `CanOpen` are private.
- **Inheritance:** controllers inherit shared user-ID helpers from `BaseController`; `AppDbContext` inherits EF Core's `DbContext`.
- **Method overriding:** `AppDbContext` overrides `OnModelCreating` to configure database rules.
- **Abstraction:** a controller can call `SaveChangesAsync()` without writing the underlying database protocol.
- **LINQ:** `Where`, `Select`, `AnyAsync`, and related expressions describe database queries.
- **async/await:** lets the server wait for database/email operations without blocking a thread unnecessarily.
- **Request record:** the small records in `Requests.cs` are containers for form input, not database tables. They keep accepted fields explicit.
- **Attributes:** `[HttpPost]` defines an endpoint, `[Authorize]` restricts access, and `[Required]` validates input.

This is a small layered web application. Do not describe it as microservices or claim every design pattern is implemented.

## Authentication, explained simply

1. Registration checks the configured email domain and hashes the password.
2. The email service sends a random six-digit code.
3. The app stores a hash of the code and an expiry, not the code itself.
4. Correct code entry marks the user verified.
5. Correct sign-in creates an encrypted authentication cookie managed by ASP.NET.
6. Subsequent requests identify the user through the cookie.
7. The app checks whether that account has been suspended.

`HttpOnly` stops JavaScript from reading the session cookie. `SameSite=Strict` and the custom request header help prevent another website from sending unwanted changes. There is no JWT token stored in localStorage.

## Why the frontend cannot decide permissions

A hidden button is only a user-interface choice. A user could manually call the API. Therefore the backend checks ownership, participant IDs, verified sessions, and administrator roles before changing records.

## Where to make common changes

| Change | File |
| --- | --- |
| Colors, spacing, responsive layout | `frontend/src/styles.css` |
| Navigation and routes | `frontend/src/App.jsx` |
| Categories/conditions | `frontend/src/api.js` and `backend/Controllers/ListingsController.cs` |
| Pickup locations | `frontend/src/components/TradeDetail.jsx` and `backend/Controllers/DealsController.cs` |
| Verification domain | `University:EmailDomain` configuration |
| Demo names/listings | `backend/Data/SeedData.cs` |
| Offer or completion rule | `backend/Controllers/DealsController.cs` |
| Database connection | .NET user-secrets, as in the run guide |

Keep frontend choices and backend validation lists consistent.

## Honest limitations to explain

- Local Mailpit demonstrates the code flow; it does not prove ownership of a real university inbox.
- Chat refreshes every four seconds rather than using a real-time socket.
- Payment happens directly between students at handover.
- Public launch, scaling, production operations, and future-outlook features are outside this classroom edition.
- Read `TEST_RESULTS.md` before describing what has actually been tested.

## Explaining the frontend refresh

- `styles.css` defines the shared colors, spacing and responsive layouts. It does not change business rules.
- `UI.jsx` contains reusable form, loading and image-fallback components. A `useRef` flag prevents a second save while the first request is pending.
- `ListingDetail.jsx` checks the user's existing trades before offering another purchase request.
- `TradeDetail.jsx` uses a small clock update to enable handover at the right time. The C# controller remains the authority for permission and time checks.
- `Chat.jsx` fetches messages again after each polling interval, ignores older responses, and only follows the latest message when the reader is near the bottom.
- `frontend/tests` tests the real components with simulated API replies. These tests are separate from the application and are not needed to demonstrate or run it.

The backend still follows the same short controller → EF Core → database flow explained above.
