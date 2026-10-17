# Screen-by-screen review and frontend refresh

Date: 10 October 2026. Project: PremsCart Simple campus edition.

The frontend has been redesigned while retaining the simple C# backend and existing database schema. All backend C# source files match the previously delivered version. This review covers the proposal's existing features only; future-outlook features remain excluded.

## What was actually checked

- Every page component, shared component, route and corresponding API contract was reviewed in source.
- **43 frontend interaction checks passed** using React Testing Library and jsdom, with simulated API responses. These exercise the real React components and user actions, but do not draw a browser layout or contact the backend.
- **58 backend controller checks passed** against a temporary SQLite fixture, using the actual C# controllers.
- React production build passed; C# build passed with zero warnings and zero errors.
- Local image/font references were checked in the packaged production files.

**No live browser or PostgreSQL end-to-end verification was completed.** The supported browser QA capability was unavailable. Responsive layouts were implemented and reviewed in CSS; they have not been visually approved from browser screenshots. The tests below must not be presented as proof that every browser layout or real two-account workflow passed.

## Screen coverage

| Screen / state | Changes and problems addressed | Automated interaction coverage |
| --- | --- | --- |
| Shared header and navigation | Clear active navigation, account identity, consistent CTA, keyboard skip link, dismissible session notice, narrower-screen layout | Working item route, legacy route, unknown route, protected-page redirect, admin restriction, sign-out |
| Marketplace / home | New emerald hero, real photography, clearer exploration action, larger cards, icon category chips, filter toolbar, skeleton loading, explicit retry and Clear filters | Search/category/sort request parameters, clear filters, failed request recovery |
| My items | Consistent item cards, visible full-width Edit item button, no duplicate Sell CTA | Item loading, correct edit link, absence of duplicate create action |
| Item details | Separate photo and purchase panels, stronger price hierarchy, verified seller indicator, existing-trade CTA, clearer unavailable state | New offer, fixed-price read-only amount, own item, sold item, existing offer |
| Item reporting | Confirmation replaces the form after success, preventing accidental repeated reports from the same view | Report request and success state |
| Create item | Numbered sections, local photo preview, prominent upload area, honest-photo guidance, upload size/type feedback, save disabled during upload | Multipart PNG submission, saved photo path, oversize rejection, upload-pending save block, integer validity |
| Edit item | Existing photo retained; early owner/status checks; edits still request approval | Ownership rejection and existing-item PUT request with retained photo |
| Sign in | Password visibility toggle, clearer labels, continuation to the intended page | Supplied underscore email, show/hide control, login and return destination |
| Register | Consistent fields, separate password hint, registration-to-verification handoff | Name/department/email/password submission and verification screen |
| Verify email | Six-digit code field, resend busy state, clear success message | Resend request and successful code verification |
| My trades | Clear active/history filters, selected conversation state, refresh busy state, explicit missing-trade message | History filter, missing ID, failed loading instead of false empty history |
| Pending offer | Improved price/progress hierarchy; recipient actions remain distinct from sender state | Acceptance, counteroffer, no self-accept button, cancellation confirmation |
| Pickup plan | Current plan displayed first, explicit Change pickup plan action, future local-time input | Seller schedule with UTC payload, buyer restriction, edit/show current plan |
| Handover | Confirmation button unlocks automatically at the scheduled time; explicit handover confirmation retained | Early block, timed unlock, elapsed-time confirmation |
| Completed / closed trade | Clear review section; rejected/cancelled trades no longer show misleading progress | Review submission, already-reviewed state, cancellation and rejected state |
| Private chat | Distinct message bubbles, counterpart header, auto-scroll near the bottom, new-message control while reading history, draft retained on failure | Send/trim/display/clear, failed-send draft retention |
| Public profile | Refreshed identity panel, readable trade/rating statistics, review cards and empty state | Review rendering, accessible rating text, empty reviews |
| Admin items | Improved summary cards, searchable moderation queue, pending-only filter, consistent action buttons | Approval, hide and restore requests |
| Admin reports | Clear open/resolved status and separated moderation actions | Report-resolution endpoint and action |
| Admin users | Search by name/email, confirmation before suspension, visible restore action | Search, suspend confirmation, restoration and non-admin restriction |
| Shared forms / assets | Duplicate-submit guard, accessible loading states, failed-image fallback | Double-submit prevention, failed-image display, stale-session event |

## Confirmed defects fixed

1. Item cards used `#/listing/...`, but the application recognised only `#/item/...`. Cards now use the correct route; old links also remain supported.
2. An unknown trade ID silently selected the first trade. It now displays a clear unavailable-trade message.
3. Returning to an item could offer a second request even with a pending trade. Existing active trades now display an Open your trade action.
4. Pickup confirmation stayed disabled until another render or manual refresh. A lightweight frontend timer updates its availability; the backend still enforces the time independently.
5. Item submission could be clicked during an upload. The save button is disabled until the upload finishes.
6. Rejected/cancelled trades showed an empty active progress sequence. Closed status is now explicit.
7. Failed marketplace/trade loads could look like genuinely empty data. They now have separate error/retry states.
8. Signing in from a protected route lost the intended destination. The destination is now retained.
9. Repeated chat polling could overlap and display older responses after newer ones. Polling now waits for each request and ignores superseded responses.
10. Chat refresh failure after a successful send could imply the message itself failed. The UI now distinguishes a sent message from a subsequent refresh problem.

## Visual design changes

The shared CSS now uses an emerald-and-cream palette, clearer headings, consistent 10–24 px corner radii, restrained shadows, larger text and deliberate spacing. Product imagery remains real and locally bundled. Buttons use consistent prominence; hover styles do not move the layout. Keyboard focus is visible, small-screen form text is 16 px, and reduced-motion preferences suppress optional animation.

The frontend remains plain React and ordinary CSS. Test libraries are development dependencies only and are not shipped in the browser bundle. No new backend architecture, database table, authentication mechanism or deployment service was introduced.

## Local browser acceptance pass still required

Run `RUN_LOCALLY.md`, then use two independent browser profiles with buyer and seller accounts. Use a third profile for admin if needed. Ordinary tabs share a login cookie.

1. At desktop and phone widths (for example 1440, 768 and 390 px), open every screen above. Check clipping, readable text, photo fitting, keyboard focus and button reachability.
2. Register and verify using your configured mail service. Mailpit is a local demo inbox only.
3. Upload a real PNG under 2 MB, submit, approve as admin, and verify the item appears. Reload to verify persistence.
4. Search and open that item; send an offer as buyer; counter and accept across the two accounts.
5. Send chat messages both ways, including a long message. Read older messages while the other account sends a new one.
6. Save/update a future pickup time as seller. Check the buyer sees the plan after refreshing. Confirm that early completion is unavailable.
7. After the pickup time, confirm separately as both people, then submit both reviews and check the public profiles.
8. Report an item; hide/restore it as admin; resolve the report. Suspend/restore a test account and confirm its session loses access.
9. Test a deliberate network failure and verify errors are recoverable without losing form text.

Record these as locally passed only after completing them on the presentation machine. See `TEST_RESULTS.md` and `verification/` for the automated evidence already available.
