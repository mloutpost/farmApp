/**
 * Fetches app settings from Firestore (app_settings/main).
 * Used for config that may be updated without redeploying (e.g. Google Maps API key).
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface AppSettings {
  googleMapsApiKey?: string;
  updatedAt?: Date;
}

let cached: AppSettings | null = null;

export async function getAppSettings(): Promise<AppSettings> {
  if (cached) return cached;
  try {
    const snap = await getDoc(doc(db, "app_settings", "main"));
    cached = snap.exists() ? (snap.data() as AppSettings) : {};
    return cached ?? {};
  } catch (e) {
    console.warn("[Farm] Failed to load app_settings from Firestore:", e);
    return {};
  }
}
