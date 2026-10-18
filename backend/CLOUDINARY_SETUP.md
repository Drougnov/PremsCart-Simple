# Persistent product pictures for Render Free — Cloudinary

This version keeps the existing React picture chooser and `POST /api/listings/upload` API,
but stores new uploaded pictures in Cloudinary instead of `wwwroot/uploads` when
Cloudinary environment variables are configured.

## 1. Create Cloudinary account

Sign up for the **Image and Video API / Programmable Media** free account at
https://cloudinary.com/users/register_free . This free tier has usage limits.

In your Cloudinary console, find your **Cloud name**, **API Key**, and **API Secret**
(sometimes found in **API Keys** or the project dashboard). Copy them privately.
You do not need an unsigned upload preset: uploads are authenticated in your .NET backend.

## 2. Configure your existing Render web service

Render Dashboard > your `premscart-simple` Web Service > Environment > Add Environment Variable:

| Key | Value |
| --- | --- |
| `Cloudinary__CloudName` | Your Cloudinary cloud name |
| `Cloudinary__ApiKey` | Your Cloudinary API key |
| `Cloudinary__ApiSecret` | Your Cloudinary API secret (keep private) |

ASP.NET Core maps double underscores to nested configuration keys. Do not add these
keys to committed `appsettings.json`, `.env` files in GitHub, or React/Vite variables.

Keep the existing `ConnectionStrings__Database` pointing to Neon PostgreSQL;
this remains responsible for text, users and image URLs. Do not put a
`postgresql://` URI in the Npgsql connection string.

## 3. Deploy this project

Replace your GitHub repository files with the contents of this updated ZIP,
including `backend/Services/CloudinaryImageService.cs`, the modified controller
and `Program.cs`, then commit. Render can deploy the new commit automatically.
Alternatively use **Manual Deploy > Deploy latest commit**.

## 4. Verify

1. Sign in as a student account.
2. Create a product and select a JPEG or PNG photo (up to 2,000,000 bytes).
3. The upload API should return an HTTPS `imageUrl` beginning with
   `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/`.
4. Save the item. Its `imageUrl` field is stored in Neon PostgreSQL.
5. Open Cloudinary Media Library. Your file should be in the `premscart` path.
6. Restart/redeploy the Render web service, refresh the product, and check the photo.

## Important operational notes

- With Cloudinary settings missing in **Production**, product image uploads will
  return an explanatory HTTP 503 error rather than silently saving to ephemeral disk.
- For **Development** only, absent settings continue to save files to
  `wwwroot/uploads` to keep local development and existing checks functional.
- Static bundled photos under `/images` stay where they were; they need no migration.
- Previously uploaded `/uploads/...` files are **not** automatically migrated or
  restored. If still available, users need to replace those photos; if lost on
  a Render restart, they cannot be recovered from an image URL alone.
- Unused images from abandoned drafts and replaced item photos are not
  automatically deleted from Cloudinary in this version. Review your Media Library
  periodically. Automatic garbage collection requires tracking asset IDs and
  safely handling in-flight uploads.
- This ZIP's actual user-upload flow is for **listing/product photos only**;
  profile/store photo upload endpoints do not exist in the current simple app.
- Cloudinary Free is subject to storage, bandwidth and transformation usage caps.
- Keep the Cloudinary API Secret on the server; never publish it or send screenshots
  showing the entire value.

Official documentation:
- https://cloudinary.com/documentation/upload_images
- https://cloudinary.com/documentation/image_upload_api_reference
- https://cloudinary.com/documentation/billing_and_plans
