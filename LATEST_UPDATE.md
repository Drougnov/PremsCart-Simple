# Marketplace and trade update — 18 October 2026

## Deploy the complete update

The supplied screenshots show the old frontend (admin student links, Refresh trades, History) with newer API restrictions. Replace BOTH frontend and backend with this version. Do not copy the whole project inside backend. Follow DEPLOY_FIX.md and commit deletions with git add -A. Keep your current database and Render environment variables. The Docker build now rejects backend/backend and backend/checks nesting. Entry HTML is served with no-store; compiled JS/CSS have content hashes.

1. Extract into a new folder and use its complete project contents at your Git repository root.
2. Replace old backend/frontend/checks/docs folders while retaining private configuration and user uploads. Do not merge nested project copies.
3. Push all replacements and deletions, then deploy the latest commit on your existing Render service.
4. Open the site once with Ctrl+F5 after deployment to discard the previously cached frontend. Normal data changes need no refresh.

## Admin

Admins see Administration and Account settings only. Account settings supports display name and optional new password, verified against the current password. Changing the password invalidates older sessions. Student trade/post/profile APIs remain blocked for admins. A SessionVersion column is added automatically without resetting users.

## Cards, photos and controls

- Fixed 4:3 image region with contain-fit so product photos are not cropped. Two-line card titles and consistent price/footer placement.
- Category icons for no-photo posts. New posts no longer receive unrelated stock desk images. Legacy default /images/other.jpg values are cleared to use placeholders.
- Fixed-price purchases display a price and Fixed price tag instead of an amount input.
- Item descriptions initially show up to 320 characters with See more / See less.
- Softer focus outlines, themed selects and supported native picker styling. Older browsers retain their platform popup but use themed closed controls.
- Item status replaces redundant Campus text. Hero CTA says Explore the goods.

## Trades

- All trades, Active, Rejected tabs. Completed and cancelled trades remain under All trades.
- One visible conversation per buyer and item. Existing duplicate attempts are grouped, with active state preferred. Messages from prior attempts are combined chronologically; old records/reviews are retained.
- A new offer after cancellation/rejection reuses the previous attempt. Duplicate pending requests open the existing conversation.
- Decline offer removed. Red Cancel this trade is the single cancellation action. A seller cancelling a pending incoming offer marks it Rejected; buyer cancellation marks it Cancelled.
- Finished conversations have a red Delete trade and chat action with confirmation. It hides all closed attempts for that participant only. Active conversations must be cancelled/completed first.
- Trade state polls every five seconds while visible, and revalidates on focus, reconnect and local writes. Chat polls every four seconds. No refresh button or automatic-refresh badge is shown. Unsent drafts stay intact.
- Handover remains possible before the planned time after scheduling; both people must confirm physical exchange.

## Demo database catalog

This version seeds one verified STUDENT demo account and 24 approved items when the backend starts with DemoCatalog:Enabled enabled (enabled in the included appsettings.json).

Email: demo_catalog@bscse.puc.ac.bd
Password: GoodsDemo!4827
Name: Demo Goods Seller

The catalog includes books, calculators, stationery, Arduino boards, laptops, headphones, keyboards, a mouse, wristwatch, shoulder bag, water bottles and a stool. Prices and conditions vary; fixed and negotiable items are mixed. Descriptions explicitly identify demonstration posts, and real stock photographs are illustrative. Source credits are included.

The seed uses the configured database, is transactional, and skips existing titles for that demo seller. It does not reset passwords, existing transactions or other users. Set DemoCatalog__Enabled=false in Render to stop future seed runs; existing demo data remains. If that email belongs to a non-demo account, startup refuses to take it over.

The demo seed was executed and checked in a temporary SQLite database here. Your live Render database is populated only when you deploy and start this release; no live database connection was available in this session.
