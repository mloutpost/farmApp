/**
 * Fetches app settings from Firestore (app_settings/main).
 * Used for config that may be updated without redeploying (e.g. Google Maps API key).
 * Retries on "offline" since Firestore can report that briefly after Auth redirect.
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface AppSettings {
  googleMapsApiKey?: string;
  updatedAt?: Date;
}

const STORAGE_KEY = "farm_app_settings";

let cached: AppSettings | null = null;

/** Sync read of cached Maps key (e.g. from sessionStorage after sign-in redirect). */
export function getCachedMapsKey(): string {
  const s = loadFromStorage();
  return s.googleMapsApiKey?.trim() ?? "";
}

function loadFromStorage(): AppSettings {
  try {
    const raw = typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppSettings;
      if (parsed.googleMapsApiKey) return parsed;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function saveToStorage(s: AppSettings) {
  try {
    if (typeof window !== "undefined" && s.googleMapsApiKey) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ googleMapsApiKey: s.googleMapsApiKey }));
    }
  } catch {
    /* ignore */
  }
}

export async function getAppSettings(): Promise<AppSettings> {
  if (cached) return cached;

  const stored = loadFromStorage();
  const maxRetries = 3;
  const retryDelay = 800;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const snap = await getDoc(doc(db, "app_settings", "main"));
      const data: AppSettings = snap.exists() ? (snap.data() as AppSettings) : {};
      cached = data;
      if (data.googleMapsApiKey) saveToStorage(data);
      return cached ?? {};
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      const isOffline = /offline|unavailable|network/i.test(msg);
      if (isOffline && attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, retryDelay));
        continue;
      }
      console.warn("[Farm] Failed to load app_settings from Firestore:", e);
      return stored;
    }
  }
  return stored;
}
