# A simple presentation and demonstration

## Before class

Run the steps in `RUN_LOCALLY.md`. Open three independent sessions: seller in a normal browser, buyer in a private window, admin in a second browser/profile.

Passwords for seeded accounts are `Campus123!`. Emails are `seller@bscse.puc.ac.bd`, `buyer@bscse.puc.ac.bd`, and `admin@bscse.puc.ac.bd`.

Check these workflows locally before relying on them during class. Automated controller checks are not a full browser rehearsal.

## 8–10 minute story

### 1. Introduce the problem — 30 seconds

“Students need a convenient place to find useful items from other students. PremsCart brings listings, negotiation, pickup, and reputation into one campus marketplace.”

Do not claim the problem has been validated by surveys unless your team actually conducted them.

### 2. Browse — 1 minute

Open the marketplace. Search for a calculator. Show the category, condition, maximum-price, and sorting controls. Open the seller's profile and explain the verified badge.

### 3. Create and approve a listing — 1 minute

As seller, choose **Sell an item**. Enter a title, description, price, category, and condition. Upload a small JPEG or PNG if available. Submit.

Show **My listings → Awaiting approval**.

As admin, open **Admin → Items**, inspect the details, and approve. Refresh the marketplace and show the item.

### 4. Negotiate — 1–2 minutes

As buyer, open a negotiable listing and offer less than the listed price. For example, offer ৳800 on the ৳950 calculator.

As seller, refresh My trades. Counter with ৳850.

As buyer, refresh and accept ৳850. Explain that the item is now reserved and cannot be accepted for another buyer.

### 5. Chat and pickup — 1 minute

Send a message as the buyer: “Can we meet at the Library?”

Wait up to four seconds in the seller session. Reply and agree on a time about one minute ahead.

As seller, select **Library**, enter the agreed future time, and save the pickup plan. Explain that this replaces the complex pickup-negotiation and QR system.

### 6. Explain the code while time passes — 1 minute

Open `ListingDetail.jsx`, `api.js`, and `DealsController.cs`.

Show how a button/form sends JSON, how the controller checks the rules, and where `SaveChangesAsync()` writes the result.

### 7. Complete and review — 1 minute

Once pickup is arranged, both people may confirm the physical exchange even before the scheduled time. Their status updates automatically; no manual refresh is needed.

As seller, confirm handover. The trade still waits for the buyer.

As buyer, confirm handover. Both sessions should show Completed after refresh, and the listing becomes Sold.

Leave a rating and review. Show the result on the other person's profile. Explain that a person cannot review before completion or review twice.

### 8. Moderation — 1 minute

Report another listing as the buyer. As admin, open Reports, hide the listing if appropriate, and resolve the report.

Suspend the buyer. In that session, refresh My trades to demonstrate blocked access. Restore the account afterwards; sign in again if its session was rejected.

## Optional verification demonstration

Start Mailpit before class. Register a new university-domain address, open Mailpit, copy the code, and verify it.

Say explicitly: “For the local demo, Mailpit captures email. For real users, SMTP must deliver the code to the actual university inbox.”

## Suggested team division

| Team member from proposal | Explain |
| --- | --- |
| Biplob Barua | Models, DbContext, authentication, backend checks |
| Mohammad Saymon | React pages, shared components, forms, responsive CSS |
| Tawsif Sukkur Shan | Trade workflow, chat, reviews, moderation, testing |

## Likely viva questions

**Why keep React and .NET?** They match our proposal. We simplified the implementation rather than changing the project's technology.

**Why no cart?** This edition is peer-to-peer item trading. One item and one buyer form a deal; a store-style checkout is outside this scope.

**Why not use SignalR?** Four-second polling demonstrates chat with ordinary HTTP and is easier to explain.

**What stops a student from editing another listing?** The controller compares the signed-in user's ID with the listing's seller ID.

**How do you stop two buyers purchasing the same item?** Acceptance updates the deal and item together, and the database allows only one accepted/scheduled/completed deal per listing.

**Why do both people confirm?** It prevents one person from unilaterally claiming that the physical handover is complete.

**Where is OOP?** In the model classes, object instances, private controller fields, constructor dependencies, controller inheritance, and the DbContext method override.

**What was actually tested?** Read the exact build, frontend interaction, and controller-check results in `TEST_RESULTS.md`. Do not claim the SQLite checks prove PostgreSQL concurrency, email delivery, or browser behavior.
