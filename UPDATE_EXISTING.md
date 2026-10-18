# Update your existing simple project

This release preserves your current database. At startup it adds `BuyerDeleted` and `SellerDeleted` boolean columns to `Deals` if they do not exist. No tables or transaction records are removed. Keep your existing database connection and configuration.

1. Stop the running backend and frontend.
2. Keep a backup of your existing project folder. In particular, retain `backend/wwwroot/uploads` and any local configuration.
3. Extract the corrected ZIP into a separate folder.
4. Copy your existing `backend/wwwroot/uploads` folder into the new project's `backend/wwwroot/uploads`. Do not delete those uploaded photos.
5. Use your existing database connection. The project keeps the same .NET UserSecretsId (`PremsCart-Simple`), so user-secrets set earlier remain available on the same Windows account.
6. Inside the new `backend` folder, run:

```powershell
dotnet user-secrets set "University:EmailDomain" "bscse.puc.ac.bd"
dotnet run
```

7. Open http://localhost:5000 and hard-refresh with **Ctrl+F5**. The compiled frontend is already included.
8. Sign out of old tabs. Use a normal window and an InPrivate window, or separate browser profiles, to demonstrate two accounts. Ordinary tabs share the same login cookie.

Existing users keep their current email addresses and passwords. Old seeded users therefore still sign in with `seller@student.puc.ac.bd`, `buyer@student.puc.ac.bd`, and `admin@student.puc.ac.bd` if those were created in your database. New empty databases seed the corrected `@bscse.puc.ac.bd` demo addresses. No users or trades are rewritten to change email domains.

If you use the React development server, run `npm ci` in `frontend` once to install the current frontend dependencies, then `npm run dev`.

## Corrections included

- Real local photographs for the welcome screens and sample items; no remote image dependency while presenting.
- Locally bundled Font Awesome icons.
- Whole-taka price/offer controls (`step=1`), with backend rejection of fractional inputs.
- Registration accepts the supplied `@bscse.puc.ac.bd` domain, including underscores in the username.
- “Item”/“post” wording in the interface; internal API/table names remain stable.
- Prominent full-width Edit item buttons.
- One global Sell an item action; duplicate create actions removed. It is hidden while already creating/editing an item.
- Uploaded image filenames now match save validation. Previously uploaded hyphenated filenames are accepted too.
- Trade responses explicitly identify whether the requester is the seller; pickup errors distinguish wrong account, wrong status, and an already-confirmed handover.
- Pages refresh the active account on window focus. The backend rejects stale-tab requests if a different account is signed in, instead of executing an action as that other person.
- Pickup time is shown in your local timezone and starts with a future default.

The screenshot alone cannot prove the exact cause of the pickup failure. The shared-cookie account mismatch is now guarded and tested; seller pickup scheduling also remains covered by the workflow checks.

For a new installation, use `RUN_LOCALLY.md`. For test limitations, see `docs/TEST_RESULTS.md`.

## Modern frontend refresh

This update also redesigns every page and fixes item navigation, existing-offer actions, invalid trade selection, chat request ordering, and handover controls. The current release also updates the backend and applies the two additive visibility columns described above.

Read `docs/SCREEN_REVIEW.md` for the screen-by-screen changes. The download includes the compiled frontend; you do not need Node.js just to run it. Optional frontend development/tests require Node.js **22.22.2+ within version 22, 24.15.0+ within version 24, or 26+**, matching the installed test dependency's supported versions. Run `npm ci`, then `npm test` or `npm run dev` from `frontend`.

## Verification, admin and trade update — 17 October 2026

- Successful email verification creates the same secure session as login and opens the new student profile.
- Admin sign-in opens Administration. Student navigation, student profile and trading/posting APIs are unavailable to admins.
- On finished trades, **Delete trade and chat** removes the conversation from your own account view after confirmation. It does not erase the other participant’s record, published reviews or transaction history in the database. Cancel active trades first; partially confirmed handovers must be completed.
- Confirm handover once pickup is arranged and the physical exchange has happened, even if the scheduled time is still in the future. Both people must confirm.
- Visible marketplace, My items, item detail, profiles, administration and trades refresh every five seconds and on focus/reconnect/local changes. Chat polls every four seconds. Drafts and filters remain intact. No manual refresh is required during normal use.
- **All trades** includes active and finished trades. **History (closed)** includes Completed, Cancelled and Rejected trades. Both remain because they differ.

For Render: replace the project files in your repository and redeploy the existing service, keeping its environment variables and database. The Docker build rebuilds the frontend. The database account needs permission to add the two columns. Do not reset the database. No Render deployment was performed as part of this ZIP update.
