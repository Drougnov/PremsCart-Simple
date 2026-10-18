# Validation — 17 October 2026

## Actual results for this update

- `npm run build`: PASS; production frontend rebuilt into backend/wwwroot.
- `npm test`: PASS, 48 frontend interaction checks, 0 failures. Uses React Testing Library and jsdom with simulated API responses.
- `.NET 10 Release build`: PASS, 0 warnings and 0 errors.
- Controller checks: PASS, 71 checks using a temporary in-memory SQLite database and the real controller methods.
- `git diff --check`: PASS.

## Covered behavior

- Verification returns the user and issues an actual ASP.NET authentication cookie; frontend opens profile without calling login. Wrong, expired and reused codes remain rejected.
- Admin navigation redirects to Administration; no My trades, My items, Sell or student profile links. Server session guard blocks student action APIs; admin public profile returns 404.
- Future pickup times allow handover confirmation. One confirmation leaves the trade Scheduled; the second completes it and marks the item Sold. Cancellation remains blocked after a confirmation.
- Finished trades and chats can be removed from one participant’s view. Active trade deletion and outsider deletion are rejected. Reviews and transaction records remain, and the other participant retains chat access.
- Automatic five-second trade refresh preserves unsent chat drafts. Marketplace reconnect refresh preserves search filters. Shared refresh trigger is also wired to item detail, My items, profiles and administration.
- History contains only finished trades; All includes active trades too.
- Existing offer, counteroffer, pickup scheduling, uploads, moderation, reviews, session-change guards and login checks still pass.

## Limits

No live Render deployment, real SMTP delivery, real browser visual review, or two-account HTTP end-to-end session was performed. The controller tests do not establish PostgreSQL concurrency behavior. The additive PostgreSQL startup ALTER TABLE statements compile but were not executed against a live PostgreSQL database here. Existing data must be retained during redeployment; do not reset the database.

## Live acceptance check

1. Redeploy the existing service with the same database and environment configuration; verify startup successfully adds the two boolean columns.
2. Register using a deliverable university email, enter its code and confirm profile opens without another login.
3. In separate browser profiles, use buyer and seller accounts. Offer, accept and arrange a future pickup; check the other screen updates automatically.
4. After physical exchange, confirm on each account before that time. One confirmation must not complete the trade; both must mark it Completed/Sold.
5. Delete the finished conversation on one account; it disappears only there, with the other account’s chat and published reviews intact.
6. Sign in as admin and verify only Administration opens, including when visiting student page URLs.

Current raw output is in `docs/verification/`.
