# Actual verification results

Date: 10 October 2026.

## Completed checks

| Check | Result | What this establishes |
| --- | --- | --- |
| ASP.NET Core backend build | PASS; 0 warnings, 0 errors | C# source compiles with .NET SDK 10.0.401 |
| React production build | PASS; 43 modules transformed | JSX imports and the Vite production bundle build successfully |
| Frontend interaction checks | PASS; 43 checks | Actual React components exercised in jsdom with simulated API responses; not browser or backend end-to-end tests |
| Controller checks | PASS; 58 checks | Real controller methods and EF persistence work in the temporary SQLite fixture described below |
| Frontend formatting | Completed with Prettier | Consistent JavaScript, JSX, and CSS formatting |
| Backend whitespace formatting | Completed with dotnet format's folder mode | Consistent C# indentation without adding architecture or dependencies |
| Package inspection | Completed | ZIP excludes node_modules, bin/obj, local credentials, and old-project data; includes the built frontend |

Build and controller output is retained in `docs/verification/`. Workspace-specific paths in the backend build log have been shortened for readability.

See `SCREEN_REVIEW.md` for the complete screen-by-screen audit and frontend improvements. Backend C# source was compared with the preceding ZIP and is unchanged.

## What the 58 controller checks cover

- Offers: own-item rejection, valid buyer offer, duplicate prevention, own-offer acceptance prevention.
- Private chat: outsiders cannot read or send; a participant can send.
- Counteroffer and acceptance: price negotiation and listing reservation.
- Pickup: only seller schedules; only campus locations; no early confirmation.
- Completion: two confirmations required; cancellation blocked after the first; repeated completion rejected.
- Reviews: only completed deals and participants; one review per participant; both directions supported.
- Fixed-price requests and cancellation releasing a reserved listing.
- Listing creation, approval requirement, and owner-only editing.
- Listing approval, reporting, hiding, and report resolution.
- Account suspension/restoration and protecting admin accounts from suspension.
- University-domain rejection on registration.
- Incorrect, expired, exhausted, correct, and reused verification codes.
- Wrong-password rejection and temporary login lockout.
- Password/code hashes excluded from serialized user data.

The checks invoke the **actual controllers**, not copies of their business logic. They use EF Core with a temporary SQLite database, not PostgreSQL. The pickup-time test changes its own database fixture to an elapsed time; the application contains no completion bypass.

## Regression fixes checked in this update

- Valid PNG upload followed by item creation using the returned image path.
- Acceptance of previous hyphenated upload filenames, and rejection of unsafe paths.
- Fractional item prices, offers, and counteroffers rejected; controls increment by one.
- Supplied underscore-based `@bscse.puc.ac.bd` address passes the domain validation.
- Session guard blocks stale-tab requests; matching sessions pass through.
- Trade responses report the actual requester’s seller/buyer role.
- Downloaded photo assets opened and visually inspected. This is asset verification, not browser layout testing.

The reported pickup screenshot is consistent with a shared-session mismatch, but that cause cannot be established conclusively from the screenshot alone. The added guard is tested, as is the seller scheduling workflow.

## Not verified here

- A complete application run against PostgreSQL. This environment did not provide a usable PostgreSQL service; running it as a separate service account was blocked by the environment's process permissions.
- PostgreSQL-specific SQL execution, simultaneous acceptance races, serializable transaction retries, or production load behavior.
- Full HTTP middleware/model-validation/role-filter execution, authentication-cookie behavior, or cross-browser sessions. The session guard is tested directly with HTTP contexts; it does not replace a complete browser check.
- Real SMTP delivery, Mailpit end-to-end operation, or actual institutional email ownership. Verification tests use a known test code in their own fixture.
- HTTP file upload and image serving in a live browser.
- Browser layout screenshots, responsive interactions, accessibility audit, or an end-to-end two-account browser demo. The supported browser QA capability was unavailable in this environment.
- Public hosting or production readiness. This deliverable is a local classroom project.

**No mocked UI screenshot or static page has been reported as a successful live workflow.**

## Reproduce the successful checks

From the project root:

```powershell
dotnet build backend
dotnet run --project checks
```

For frontend interaction checks and a fresh build (use a supported Node.js version listed in `UPDATE_EXISTING.md`):

```powershell
cd frontend
npm ci
npm test
npm run build
```

## Local acceptance checklist

Use `TEACHER_DEMO.md` with the real PostgreSQL database and independent browser sessions:

- [ ] First startup creates tables; seeded accounts sign in.
- [ ] Unverified users cannot sign in; correct emailed code verifies a new account.
- [ ] New and edited listings wait for admin approval.
- [ ] Image upload survives a restart; invalid files are rejected.
- [ ] Search, condition/category/price filters, and sorting behave correctly.
- [ ] Seller cannot buy own item; outsider cannot edit another person's item.
- [ ] Offer, counteroffer, accept/reject, and fixed-price request work across sessions.
- [ ] An accepted listing disappears from available marketplace results.
- [ ] Chat refreshes between buyer and seller; unrelated users cannot read it.
- [ ] Seller records pickup at a permitted campus location.
- [ ] Early completion is blocked; both confirmations complete the trade.
- [ ] Cancellation before confirmation releases the item.
- [ ] Each participant can leave exactly one review after completion.
- [ ] Report, hide/restore, suspend/restore work; suspended sessions lose access.
- [ ] Reloading the app retains stored data.
- [ ] Check at desktop width and a narrow phone width; all forms remain usable.

Do not present these unchecked items as already passed. Complete them on the presentation machine before class.
