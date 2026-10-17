# Deploy PremsCart Simple to Render

This package adds a Dockerfile, a .dockerignore file, and an optional one-time production admin bootstrap to the uploaded project. The frontend and backend run together in ONE Render Docker web service. PostgreSQL is a separate service. The original local demo seeding remains DEVELOPMENT ONLY.

## 1. Upload this project's contents to a GitHub repository

Extract the ZIP. Open the `PremsCart-Simple` folder. Upload **the contents** of that folder into a new GitHub repository. Its GitHub root must contain `Dockerfile`, `backend`, and `frontend` (not a second enclosing `PremsCart-Simple/` folder). Make the repository private if you prefer. Do not upload passwords or `.env` files.

## 2. Create an empty PostgreSQL database

For a short demo: in Render, click New > Postgres, select the Free plan and a region, and create the database. NOTE: Render's free Postgres expires 30 days after creation and has no backups. Paid Postgres or a compatible external Postgres provider is appropriate for longer-term use.

Copy the five INTERNAL connection fields from the Render Postgres page (host, port, database, user and password). Keep the Render web app and Postgres in the same region. Use the INTERNAL host, not the external connection URL.

## 3. Create the Render Web Service

Open dashboard.render.com > New > Web Service > connect GitHub repository. Set:

- Name: `premscart-simple` (or another available name)
- Branch: `main`
- Language/runtime: `Docker`
- Root directory: blank (repository root)
- Dockerfile path: `./Dockerfile`
- Docker build context: `.` (if shown)
- Instance type: `Free` for a demo
- Docker command override: blank (use Dockerfile ENTRYPOINT)

## 4. Set Render environment variables before deploying

In the Web Service environment settings, add the following keys and values (substitute database credentials):

    ASPNETCORE_ENVIRONMENT = Production
    AllowedHosts = *
    ConnectionStrings__Database = Host=YOUR_INTERNAL_DB_HOST;Port=5432;Database=YOUR_DB_NAME;Username=YOUR_DB_USER;Password=YOUR_DB_PASSWORD
    InitialAdmin__Email = your-real-admin@bscse.puc.ac.bd
    InitialAdmin__Password = YOUR_OWN_RANDOM_PASSWORD_OF_AT_LEAST_12_CHARACTERS

Optional: add `University__EmailDomain=bscse.puc.ac.bd` (this is the default). Optionally add `PORT=10000`; the Dockerfile already listens on 10000. Never put these secrets in source control.

If you use **external PostgreSQL**, use the actual external host and provider-required TLS connection fields (e.g., `SSL Mode=Require` for a provider that requires TLS), instead of the Render internal host.

## 5. Deploy and confirm the app runs

Press Create Web Service (or Deploy). The Dockerfile installs Node dependencies, compiles React into `backend/wwwroot`, publishes .NET 10, and starts the ASP.NET app on port 10000. `Database.EnsureCreatedAsync()` makes tables automatically inside the existing database. Watch Render Deploys/Logs.

Visit `https://YOUR-SERVICE.onrender.com/` and try signing in with your `InitialAdmin__Email` and `InitialAdmin__Password` via the Sign in page. The admin URL is `/#/admin`.

You can remove the InitialAdmin credentials from Render environment settings after the first successful creation (the stored account remains). Updating `InitialAdmin__Password` later will **not** change an existing admin password.

## 6. Important limitations

1. **New students need real email sending:** `Email__Host` defaults to local Mailpit which does not exist on Render. Without working SMTP, registration saves an unverified user who cannot sign in. Configure an SMTP provider that supports a port permitted on Render Free (ports 25, 465 and 587 are blocked; a provider on 2525 may work), or implement an email API provider. Suggested keys: `Email__Host`, `Email__Port`, `Email__UseSsl`, `Email__From`, `Email__Username`, `Email__Password`. Verify the provider supports STARTTLS for the selected port.
2. **Images uploaded through the app WILL DISAPPEAR after a free Render service stops or restarts:** the code writes to `wwwroot/uploads`. A paid Render service with a correctly configured persistent disk, or an object-storage integration, is required for durability. The bundled sample photos are in the image and do persist.
3. **Free Render Postgres expires 30 days after creation.** Preserve your work in a paid or other durable database; back it up regularly.
4. **The free web service sleeps after 15 minutes idle** and can take about a minute to wake.
5. **Demo credentials are intentionally NOT present in production.** Do not change `ASPNETCORE_ENVIRONMENT` to `Development` publicly just to seed accounts.
6. This package only contains deployment preparation. A full Docker build/deployment and live email integration were not run in the preparation environment.

Official docs: https://render.com/docs/docker , https://render.com/docs/free , https://render.com/docs/postgresql-creating-connecting
