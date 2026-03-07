/**
 * Seeds the app_settings document in Firestore.
 * Run with: npx tsx scripts/seed-app-settings.ts
 *
 * Loads .env.local for NEXT_PUBLIC_FIREBASE_PROJECT_ID.
 * Requires one of:
 * - GOOGLE_APPLICATION_CREDENTIALS env var pointing to your service account JSON
 * - Or: gcloud auth application-default login
 *
 * After running, add your Google Maps API key in Firebase Console:
 * Firestore → app_settings → main → googleMapsApiKey
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import * as admin from "firebase-admin";
import * as path from "path";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
if (!projectId) {
  console.error("Set NEXT_PUBLIC_FIREBASE_PROJECT_ID or GCLOUD_PROJECT");
  process.exit(1);
}

async function seed() {
  if (admin.apps.length === 0) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath) {
      const resolved = path.isAbsolute(credPath) ? credPath : path.resolve(process.cwd(), credPath);
      const serviceAccount = require(resolved);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId });
    } else {
      admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
    }
  }

  const db = admin.firestore();
  const docRef = db.collection("app_settings").doc("main");

  await docRef.set(
    {
      googleMapsApiKey: "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log("Created app_settings/main in Firestore.");
  console.log("Add your Google Maps API key in Firebase Console:");
  console.log("  Firestore → app_settings → main → googleMapsApiKey");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
