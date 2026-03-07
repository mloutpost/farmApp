# App Settings (Firestore)

The `app_settings/main` document stores config like the Google Maps API key. You can update it in Firebase Console without redeploying.

## 1. Create the document

Run the seed script (requires Firebase Admin credentials):

```bash
# Option A: Use a service account key
# Download from Firebase Console → Project Settings → Service Accounts
export GOOGLE_APPLICATION_CREDENTIALS=./path/to/serviceAccountKey.json
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
npm run seed:app-settings

# Option B: Use gcloud auth (if you use Google Cloud)
gcloud auth application-default login
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
npm run seed:app-settings
```

## 2. Add your Google Maps API key

1. Open [Firebase Console](https://console.firebase.google.com) → your project
2. Go to **Firestore Database**
3. Find or create the `app_settings` collection
4. Open the `main` document
5. Add or edit the `googleMapsApiKey` field with your key

## 3. Firestore rules

Ensure `app_settings` is readable. Deploy the rules:

```bash
firebase deploy --only firestore:rules
```

Or add this in Firebase Console → Firestore → Rules:

```
match /app_settings/{document} {
  allow read: if true;
  allow write: if false;
}
```

## Priority

The app checks for the API key in this order:

1. `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local` (takes precedence)
2. `googleMapsApiKey` from Firestore `app_settings/main`
