# Deploy Cloudinary Fix to Render

## ✅ What Was Done

1. ✅ Fixed the Cloudinary upload method in ProductController.php
2. ✅ Changed from `$result->getSecurePath()` to `$result['secure_url']`
3. ✅ Added proper error handling
4. ✅ Pushed code to GitHub (commit: `189e45a`)
5. ✅ Fixed render.yaml — all secrets now use `generateValue: true` (no hardcoded credentials)

## 🔧 Environment Variables to Set in Render

`render.yaml` now uses `generateValue: true` for all secrets. Open your Render dashboard → Service → **Environment** tab and verify / set the following:

| Key | Description | How to Set |
|-----|-------------|------------|
| `DB_URL` | Neon PostgreSQL connection string | Click **Connect** on your Neon DB dashboard, copy the pooler URL |
| `CLOUDINARY_URL` | Cloudinary storage credentials | Format: `cloudinary://<API_KEY>:<API_SECRET>@<CLOUD_NAME>` |
| `CHAPA_SECRET_KEY` | Live Chapa secret key (starts with `CHASECK_LIVE-`) | From your Chapa dashboard → Settings → API Keys |
| `APP_SECRET` | Generated automatically | Leave as-is (Render auto-generates) |

> ⚠️ **CRITICAL** — The `CHAPA_SECRET_KEY` still shows `CHASECK_TEST-xxxxxxxx` placeholder in old Render env vars. You MUST replace it with your **live** Chapa secret key (`CHASECK_LIVE-...`) before payments will work end-to-end. The old placeholder will cause webhook signature verification to fail, meaning `processCustomerPurchase` / `processPurchase` never runs in the webhook, and the MLM tree is never updated. This is the root cause of the "could not register node" error.

## 🔧 What You Need to Do on Render

