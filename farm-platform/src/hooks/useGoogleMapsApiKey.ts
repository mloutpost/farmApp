"use client";

import { useState, useEffect } from "react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/google-maps";
import { getAppSettings } from "@/lib/app-settings";

/**
 * Returns the Google Maps API key from env or Firestore (app_settings/main).
 */
export function useGoogleMapsApiKey(): { key: string; loading: boolean } {
  const [key, setKey] = useState(GOOGLE_MAPS_API_KEY);
  const [loading, setLoading] = useState(!GOOGLE_MAPS_API_KEY);

  useEffect(() => {
    if (GOOGLE_MAPS_API_KEY) {
      setKey(GOOGLE_MAPS_API_KEY);
      setLoading(false);
      return;
    }
    getAppSettings().then((s) => {
      setKey(s.googleMapsApiKey ?? "");
      setLoading(false);
    });
  }, []);

  return { key, loading };
}
