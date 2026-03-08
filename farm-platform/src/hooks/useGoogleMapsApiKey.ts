"use client";

import { useState, useEffect } from "react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/google-maps";
import { getAppSettings } from "@/lib/app-settings";

/**
 * Returns the Google Maps API key from Firestore (app_settings/main).
 * Falls back to env var only if Firestore has no key (e.g. local dev).
 */
export function useGoogleMapsApiKey(): { key: string; loading: boolean } {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppSettings().then((s) => {
      const k = s.googleMapsApiKey?.trim() ?? "";
      if (k) {
        setKey(k);
      } else {
        setKey(GOOGLE_MAPS_API_KEY);
        if (!GOOGLE_MAPS_API_KEY) {
          console.warn("[Farm] No Google Maps API key. Add to Firestore app_settings/main (googleMapsApiKey) or .env.local for local dev.");
        }
      }
      setLoading(false);
    });
  }, []);

  return { key, loading };
}
