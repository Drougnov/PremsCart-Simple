# Run PremsCart locally on Windows

Already using the previous simple version? Follow `UPDATE_EXISTING.md` to preserve your database and uploaded photos.

## 1. Install two things

- .NET **10 SDK**, not only the runtime.
- PostgreSQL, including pgAdmin or SQL Shell. Remember the `postgres` password you choose.

Node.js is needed only when you want to edit and rebuild the React frontend. A compiled frontend is already included.

Open PowerShell and check:

```powershell
dotnet --version
```

It should show a `10.x` SDK. PostgreSQL should be running as a Windows service.

## 2. Extract the ZIP

For example, extract it to `D:\Projects\PremsCart-Simple`.

Open that folder in VS Code using **File → Open Folder**.

## 3. Create a NEW database

Open pgAdmin, connect to your local server, right-click **Databases → Create → Database**, enter `premscart_simple`, and save.

Alternatively, execute this SQL once in a query tool connected to your `postgres` database:

```sql
CREATE DATABASE premscart_simple;
```

Do not use your old `premscart_db`. There is no migration/import from the previous project.

## 4. Save the local database password and enable demo accounts

In PowerShell, open the backend directory:

```powershell
cd D:\Projects\PremsCart-Simple\backend
dotnet user-secrets set "ConnectionStrings:Database" "Host=localhost;Port=5432;Database=premscart_simple;Username=postgres;Password=YOUR_POSTGRES_PASSWORD"
dotnet user-secrets set "SeedDemoData" "true"
```

Replace `YOUR_POSTGRES_PASSWORD` with your PostgreSQL password. Keep your real password out of source code.

Demo accounts are inserted only when the database contains no users. Enable seeding before the first startup. Seeding does not overwrite existing records.

## 5. Start the website

Still inside `backend`:

```powershell
dotnet run
```

Open **http://localhost:5000** in your browser.

Keep PowerShell open while presenting. Stop the app with `Ctrl+C`.

The app creates its six tables on the first run. It does not automatically migrate a previously created schema after future code/model changes.

## 6. Sign in with the demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Seller | `seller@bscse.puc.ac.bd` | `Campus123!` |
| Buyer | `buyer@bscse.puc.ac.bd` | `Campus123!` |
| Admin | `admin@bscse.puc.ac.bd` | `Campus123!` |

Use a normal browser window for the seller, an InPrivate/Incognito window for the buyer, and a second browser/profile for admin. Two ordinary tabs share the same sign-in cookie.

These accounts are local demonstration fixtures. Do not publish them as real accounts. The seed is disabled outside the Development environment.

## 7. Demonstrate email verification (optional setup, feature included)

The demo accounts work without an email tool. To register and verify a new account, run Mailpit locally. It captures messages instead of sending real email.

Get the Windows Mailpit executable from its official project, then run it in another PowerShell window:

```powershell
.\mailpit.exe
```

Mailpit normally listens for SMTP on port `1025` and provides its inbox at **http://localhost:8025**. Those are the app's default settings.

1. Register a new address ending in `@bscse.puc.ac.bd` in the app.
2. Open the local Mailpit inbox.
3. Copy the six-digit code from the message.
4. Enter it on the verification screen. You are signed in automatically and taken to your profile.

If registration says email could not be sent, the account has still been saved. Start Mailpit, choose **Need to verify your email?**, and resend. Wait one minute between code requests. Codes expire after ten minutes and allow five incorrect attempts.

### Real university email instead of Mailpit

The default domain is `bscse.puc.ac.bd`, matching the supplied student address. Then set your own SMTP settings:

```powershell
dotnet user-secrets set "University:EmailDomain" "CONFIRMED_STUDENT_EMAIL_DOMAIN"
dotnet user-secrets set "Email:Host" "YOUR_SMTP_HOST"
dotnet user-secrets set "Email:Port" "587"
dotnet user-secrets set "Email:UseSsl" "true"
dotnet user-secrets set "Email:From" "YOUR_SENDER_EMAIL"
dotnet user-secrets set "Email:Username" "YOUR_SMTP_USERNAME"
dotnet user-secrets set "Email:Password" "YOUR_SMTP_PASSWORD"
```

Restart the backend. Seeded demo addresses remain unchanged; the domain setting applies to new registrations. SMTP credentials and provider requirements must come from your email provider. Real external delivery was not tested here.

## Editing React

Install Node.js 22.22.2+ (22.x), 24.15.0+ (24.x), or 26+ if you want to change or test the frontend. Open a **second** terminal:

```powershell
cd D:\Projects\PremsCart-Simple\frontend
npm ci
npm run dev
```

Use the address printed by Vite, normally **http://localhost:5173**. Keep the backend running on port 5000. Vite forwards `/api` and `/uploads` to it.

After editing, rebuild the frontend:

```powershell
npm run build
```

The new files go into `backend/wwwroot`. Refresh **http://localhost:5000** to use the rebuilt version. Your uploaded images stay in `wwwroot/uploads`.

## Optional automated checks

From the project root:

```powershell
dotnet run --project checks
```

These use temporary SQLite storage and call the real controllers. They do not replace the PostgreSQL/browser demo. The app itself always uses PostgreSQL.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `dotnet` is not recognized | Install .NET 10 SDK, then reopen PowerShell. |
| Database authentication fails | Check your saved connection string, password, and PostgreSQL service. |
| Database does not exist | Create `premscart_simple` in pgAdmin. |
| Empty page or missing frontend | Run `npm ci` and `npm run build` inside `frontend`. |
| New listing does not appear | Admin must approve it; check My listings. |
| Cannot edit a listing | Resolve its pending offers first. Reserved/sold listings cannot be edited. |
| Handover button is disabled | Arrange pickup first. Either person can then confirm physical handover before or after the planned time. Both must confirm; status updates automatically. |
| No code email | Start Mailpit/configure SMTP, then resend from the verification screen. |
| Sign-in temporarily blocked | Five wrong passwords lock the account for 15 minutes. |
| Demo accounts missing | Seed only runs on an empty database with `SeedDemoData=true` in Development. Do not delete useful data to reseed. |
| Port 5000 is busy | Stop the other process using it, then restart. |

Keep both the PostgreSQL database and `backend/wwwroot/uploads` if you want to preserve your demo data and images.
