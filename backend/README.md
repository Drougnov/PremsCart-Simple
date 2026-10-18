# PremsCart — Simple campus edition

A small, readable implementation of the **V1 proposal**, made for a university presentation.

**Start with [RUN_LOCALLY.md](RUN_LOCALLY.md).** The ready-built frontend is included. Once PostgreSQL and .NET are installed, you can run the project without installing frontend tools.

## What is included

- University email registration and code verification; secure sign-in.
- Student and administrator roles.
- Items with a photo, price, condition, category, and approval.
- Search, category/condition filters, maximum price, and price sorting.
- Buyer offers, seller responses, counteroffers, and fixed-price purchases.
- Campus pickup at Main Gate, Library, or Cafeteria.
- Transaction history and confirmation by both participants.
- Private, trade-specific chat with simple four-second polling.
- Public student profiles and reviews after completed trades.
- Item reports, approval/hiding, and account suspension by admins.

The proposal's future outlook is excluded: no multi-university support, storefronts, or AI recommendations. Extras from the old project are also omitted: no QR scanner, cart, rentals, giveaway/wanted posts, wishlist, coupons, payments, SignalR, or notification system.

## Simple structure

| Folder | Purpose |
| --- | --- |
| `backend/Models` | Six database classes and small request records |
| `backend/Data` | Database connection/model and sample data |
| `backend/Controllers` | Request handling and business rules |
| `backend/Services` | Sending verification emails and checking stale account sessions |
| `frontend/src/pages` | One React page per feature |
| `frontend/src/components` | Shared buttons/forms/cards and trade UI |
| `frontend/src/api.js` | One function for HTTP requests |
| `frontend/src/styles.css` | Ordinary CSS, including mobile layouts |
| `frontend/tests` | Optional React interaction checks with simulated API responses |
| `checks` | Optional controller checks; not part of the application |
| `docs` | Proposal map, code explanation, demo, and test results |

React uses JavaScript, not TypeScript. The frontend has no router library, state library, Tailwind, or UI framework. The backend has no repository/service layers for ordinary CRUD, no AutoMapper, no CQRS, and no JWT infrastructure. One application and one database are enough.

## Important boundaries

This is a **separate project with a separate database named `premscart_simple`**. It does not import, change, or migrate your previous project's database. Do not configure it to use the old database.

The code accepts the `bscse.puc.ac.bd` domain you supplied, including addresses such as `biplob_44009@bscse.puc.ac.bd`. The email code verifies mailbox access when real SMTP is configured; it is not an official university enrollment check.

Mailpit is a local development inbox, not a real student mailbox. The seeded accounts are explicitly preverified demonstration accounts. For genuine email ownership verification, configure an SMTP server delivering to the student's actual inbox.

## Read before presenting

1. `RUN_LOCALLY.md` — installation and commands.
2. `docs/CODE_GUIDE.md` — how the code works, with examples.
3. `docs/TEACHER_DEMO.md` — two-student demonstration and team division.
4. `docs/PROPOSAL_SCOPE.md` — exact scope and simplification decisions.
5. `docs/TEST_RESULTS.md` — actual results and checks still required locally.
6. `docs/SCREEN_REVIEW.md` — every screen reviewed, fixes made, and remaining browser checks.

Real photographs and Font Awesome icons are bundled locally. Photo credits appear in the footer and `frontend/public/photo-credits.html`. Font and icon licenses are included.

**Upgrading the previous simple version? Read `UPDATE_EXISTING.md` first.**
