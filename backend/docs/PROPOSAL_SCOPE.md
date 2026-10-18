# Proposal scope and decisions

The supplied ten-page proposal is the source of scope. The long manual and previous ZIP contain many later additions; those do not expand this edition.

| Proposal page | Requirement | Simple implementation |
| --- | --- | --- |
| 3–4 | University-verified student trade | University-domain email, emailed code, verified badge, signed-in trading |
| 4 | Secure login and role management | Password hashing, HTTP-only authentication cookie, Student/Admin roles |
| 4 | Detailed listings and image uploads | Title, description, one uploaded image, price, condition, category |
| 4 | Category browsing and smart filters | Text search, category, condition, max price, newest/lowest-price sort |
| 5 | Peer-to-peer exchange and seller profiles | Seller profile with verified badge, completed trade count, rating and reviews |
| 5 | Full transaction history | My trades includes pending, accepted, scheduled, completed, rejected, and cancelled trades |
| 5 | Offers, accept, reject, counteroffers | One current offer per trade; only the recipient accepts/rejects/counters; changes recorded in chat |
| 5 | Campus pickup | Main Gate, Library, Cafeteria; seller saves the plan agreed in chat |
| 6 | Ratings and reviews | One overall 1–5 rating and a written review about communication, promptness, accuracy, and handover |
| 6 | Reports and moderation | Students report listings; admin views reports and hides/restores listings |
| 6 | Account suspension | Admin suspends/restores student accounts; next authenticated request rechecks the account |
| 7 | React, ASP.NET Core, PostgreSQL | Kept, with plain JavaScript/CSS and one small C# backend |
| 8 | Listings oversight and approvals | New/edited listings require admin approval |
| 8 | Live chat | Private trade conversation fetched through ordinary HTTP every four seconds |
| 10 | Future outlook | Excluded entirely |

## Deliberate simplifications

- Only individual student item sales; no store, inventory, shipping, cart, online payment, rental, giveaway, or wanted-post flows.
- A purchase request is just an offer at the listed price. There is no separate checkout module.
- The buyer sends an offer to open a conversation. The conversation stays attached to that trade.
- Messages refresh by polling; there are no WebSockets, presence, read receipts, attachments, or typing indicators.
- Pickup details are agreed in chat and recorded by the seller. Either person can cancel before handover confirmation.
- Both participants confirm after the physical exchange, before or after the scheduled pickup time. No QR scanner, expiring tokens, or handoff service.
- No hard deletion of transactions, users, or listings. Administrators can hide listings and suspend accounts while keeping history.
- Public profiles expose name, department, verification, and reputation; they do not expose email addresses.
- Ratings use one score plus a detailed comment, rather than several score fields.
- The administration area has listing, report, and user tabs. Role escalation is not exposed in the UI.
- Six data classes. Controllers use EF Core directly. No redundant repository or mapping layer.
- Database creation uses `EnsureCreated` for this new fixed-schema classroom edition. This is not an upgrade system for the old application.

## Verification meaning

The app proves that someone can receive a code at the configured institutional email address when real SMTP is used. It does not connect to a university student-information system. Mailpit and the preverified seeded accounts are local demonstrations only.

The proposed domain must be confirmed with the university. The configuration makes this change a single setting rather than a code rewrite.
