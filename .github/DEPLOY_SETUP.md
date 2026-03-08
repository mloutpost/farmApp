# Deploy on Push Setup

The app deploys to Firebase Hosting automatically when you push to `main` or `master`. You can also trigger a deploy manually from **Actions** → **Deploy to Firebase Hosting** → **Run workflow**.

## One-time setup: Add Firebase service account to GitHub

1. **Create a service account key**:
   - [Google Cloud Console](https://console.cloud.google.com/) → your project (`farm-platform-f003f`)
   - **IAM & Admin** → **Service Accounts**
   - Create or select a service account
   - **Keys** → **Add Key** → **Create new key** → **JSON**
   - Download the JSON file

2. **Add the JSON as a GitHub secret**:
   - Repo → **Settings** → **Secrets and variables** → **Actions**
   - **New repository secret**
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: paste the **entire** contents of the JSON file (including `{` and `}`)

3. **Grant the service account Firebase Hosting Admin** (if needed):
   - In IAM, ensure the service account has **Firebase Hosting Admin** or **Editor** role

4. **Push to main** – the workflow will build and deploy.

## Notes

- The workflow builds from `farm-platform/` (static export to `out/`) and deploys to Firebase Hosting.
- The Maps API key is loaded from Firestore `app_settings/main` at runtime (no build-time secret needed).

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| "FIREBASE_SERVICE_ACCOUNT secret is not set" | Add the secret in repo **Settings** → **Secrets and variables** → **Actions** |
| "Build did not produce out/ folder" | Ensure `next.config.ts` has `output: "export"` |
| Production shows old content | 1) Check **Actions** tab – did the last deploy succeed? 2) Trigger a manual deploy: **Actions** → **Deploy to Firebase Hosting** → **Run workflow** 3) Hard-refresh (Cmd+Shift+R) or clear cache |
| Deploy succeeds but map doesn't load | Add `googleMapsApiKey` to Firestore `app_settings/main` and add your production domain to the Maps API key's allowed referrers in Google Cloud Console |
