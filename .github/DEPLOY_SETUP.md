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

## Add Firebase config for production (required)

The build needs your Firebase web app config so Auth/Firestore work in production. Add these as **repository secrets** (Settings → Secrets → Actions):

| Secret | Where to find |
|--------|---------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings → General → Your apps → Web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same (e.g. `farm-platform-f003f.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same (e.g. `farm-platform-f003f`) |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same (e.g. `farm-platform-f003f.appspot.com`) |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Same |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Same (optional, for Analytics) |

Without these, production uses a placeholder and Auth/Firestore will fail.

## Notes

- The workflow builds from `farm-platform/` (static export to `out/`) and deploys to Firebase Hosting.
- The Maps API key is loaded from Firestore `app_settings/main` at runtime (no build-time secret needed).

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| "FIREBASE_SERVICE_ACCOUNT secret is not set" | Add the secret in repo **Settings** → **Secrets and variables** → **Actions** |
| 404 on /flow, /settings, etc. | Ensure `firebase.json` has rewrites (already added) |
| Auth 400 / "client is offline" / placeholder key in prod | Add all `NEXT_PUBLIC_FIREBASE_*` secrets (see above) |
| "Build did not produce out/ folder" | Ensure `next.config.ts` has `output: "export"` |
| Production shows old content | 1) Check **Actions** tab – did the last deploy succeed? 2) Trigger a manual deploy 3) Hard-refresh (Cmd+Shift+R) |
| Deploy succeeds but map doesn't load | Add `googleMapsApiKey` to Firestore `app_settings/main` and add your production domain to the Maps API key's allowed referrers |
