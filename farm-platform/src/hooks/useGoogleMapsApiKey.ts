"use client";

import { useState, useEffect } from "react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/google-maps";
import { getAppSettings, getCachedMapsKey } from "@/lib/app-settings";

/**
 * Returns the Google Maps API key from Firestore (app_settings/main).
 * Uses sessionStorage cache after sign-in redirect when Firestore is briefly offline.
 */
export function useGoogleMapsApiKey(): { key: string; loading: boolean } {
  const [key, setKey] = useState(() => getCachedMapsKey() || GOOGLE_MAPS_API_KEY || "");
  const [loading, setLoading] = useState(!key);

  useEffect(() => {
    if (key) setLoading(false);
    getAppSettings().then((s) => {
      const k = s.googleMapsApiKey?.trim() ?? "";
      if (k) {
        setKey(k);
      } else if (!key) {
        setKey(GOOGLE_MAPS_API_KEY || "");
        if (!GOOGLE_MAPS_API_KEY) {
          console.warn("[Farm] No Google Maps API key. Add to Firestore app_settings/main (googleMapsApiKey) or .env.local for local dev.");
        }
      }
      setLoading(false);
    });
  }, []);

  return { key, loading };
}
