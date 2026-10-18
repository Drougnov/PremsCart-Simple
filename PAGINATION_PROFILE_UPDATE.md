# Pagination and profile update — 18 October 2026

## Changes
- Marketplace and My items show 12 items per page. Previous/Next controls show the page and item range. The API queries only the requested page. Filters reset to page 1; background refresh preserves the selected page and clamps it if items disappear.
- Marketplace cards no longer repeat an Available badge. My items retains approval/status information.
- The owner link on an available item opens that exact item's edit page. Reserved/sold items explain why editing is unavailable. Existing pending-offer validation remains enforced.
- Descriptions initially show up to 180 characters and four explicit lines. See more/See less toggles the full description, including descriptions made of many short lines.
- Students: open your avatar/profile, then Edit profile. Admins: open Account settings. Both can update display name, department, and profile photo, remove their photo, and change their password with the current password. Verified email and role cannot be changed here.
- Photos use the existing Cloudinary configuration in production, accept PNG/JPEG up to 2 MB, and appear in the header, public student profile and seller detail. Select a photo, wait for upload, then Save profile.
- Admins retain their separate workspace without student trade statistics.
- Startup adds Users.AvatarUrl if missing; existing accounts, items and trades remain in the database. Demo catalog seeding remains idempotent.

## Apply on Windows
1. Back up D:\Projects\PremsCart-Simple\PremsCart-Connected outside that folder.
2. Extract the new ZIP into a separate folder. Open the extracted PremsCart-Connected folder: it contains backend, frontend, checks and Dockerfile.
3. Copy its contents into your existing repository root, replacing files. Do not put the enclosing project folder inside backend. Keep your existing .git folder, local secrets and uploaded files. If you still have backend/backend, backend/frontend or backend/checks, use the earlier DEPLOY_FIX.md clean replacement procedure.
4. In PowerShell, run these commands ONE LINE AT A TIME:

```powershell
cd "D:\Projects\PremsCart-Simple\PremsCart-Connected"
git add -A
git status
git commit -m "Add item pagination and editable user profiles"
git push origin main
git log -1 --oneline
```

5. Wait for Render to deploy that new commit. Check its source commit matches git log. If automatic deployment is disabled, deploy the latest commit manually. Preserve your existing database and Cloudinary environment settings.
6. Once live, load the site with Ctrl+F5 once. Ongoing item data still refreshes automatically.
7. Verify Next/Previous on Marketplace, Edit your item, See more on a multiline description, and Edit profile for a student and Account settings for admin. Save a photo, navigate away and return to confirm persistence.

For local validation with Node and .NET 10:
```powershell
cd frontend
npm ci
npm run build
npm test
cd ..
dotnet build backend/PremsCart.csproj -c Release
dotnet run --project checks -c Release
```

The ZIP is a source update, not an already-deployed change. No live Render database or production upload service was accessed while preparing it.
