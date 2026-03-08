"use client";

import { useState, useRef, useCallback } from "react";
import { useFarmStore } from "@/store/farm-store";
import { useMapStore } from "@/store/map-store";
import { lookupHardinessZone } from "@/lib/hardiness-zone";
import { lookupSunExposure } from "@/lib/sun-exposure";
import { GOOGLE_MAPS_API_KEY } from "@/lib/google-maps";

interface GeocodingResult {
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
    viewport: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
}

export default function AddressSearch() {
  const updateProfile = useFarmStore((s) => s.updateProfile);
  const profile = useFarmStore((s) => s.profile);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [lookupStatus, setLookupStatus] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchLocationData = useCallback(async (lat: number, lng: number) => {
    setLookupStatus("Looking up hardiness zone & sun data...");

    const [zone, sun] = await Promise.all([
      lookupHardinessZone(lat, lng),
      lookupSunExposure(lat, lng, GOOGLE_MAPS_API_KEY || undefined),
    ]);

    const updates: Record<string, unknown> = {};
    if (zone) updates.hardinessZone = zone;
    if (sun) {
      updates.sunshineHoursPerYear = sun.sunshineHoursPerYear;
      updates.sunExposure = sun.category;
      updates.sunDataSource = sun.source;
    }

    if (Object.keys(updates).length > 0) {
      useFarmStore.getState().updateProfile(updates);
    }

    const parts: string[] = [];
    if (zone) parts.push(`Zone ${zone}`);
    if (sun) parts.push(`${sun.sunshineHoursPerYear} hrs/yr sun (${sun.source})`);
    setLookupStatus(parts.length > 0 ? parts.join(" | ") : "");
  }, []);

  const geocode = useCallback(async (address: string) => {
    if (!address.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    setError("");

    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ address });

      if (response.results.length === 0) {
        setError("No results found");
        setResults([]);
      } else {
        setResults(
          response.results.map((r) => ({
            formatted_address: r.formatted_address,
            geometry: {
              location: {
                lat: r.geometry.location.lat(),
                lng: r.geometry.location.lng(),
              },
              viewport: {
                northeast: {
                  lat: r.geometry.viewport.getNorthEast().lat(),
                  lng: r.geometry.viewport.getNorthEast().lng(),
                },
                southwest: {
                  lat: r.geometry.viewport.getSouthWest().lat(),
                  lng: r.geometry.viewport.getSouthWest().lng(),
                },
              },
            },
          }))
        );
      }
    } catch {
      setError("Geocoding failed. Check your API key.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => geocode(value), 400);
  };

  const selectResult = (result: GeocodingResult) => {
    const { lat, lng } = result.geometry.location;
    const roundedLat = Math.round(lat * 1e6) / 1e6;
    const roundedLng = Math.round(lng * 1e6) / 1e6;
    updateProfile({
      locationLat: roundedLat,
      locationLng: roundedLng,
      defaultZoom: 17,
    });
    useMapStore.getState().setCenter([lng, lat]);
    useMapStore.getState().setZoom(17);
    setQuery(result.formatted_address);
    setResults([]);
    fetchLocationData(roundedLat, roundedLng);
  };

  const useCurrentMapCenter = () => {
    const [lng, lat] = useMapStore.getState().center;
    const zoom = useMapStore.getState().zoom;
    const roundedLat = Math.round(lat * 1e6) / 1e6;
    const roundedLng = Math.round(lng * 1e6) / 1e6;
    updateProfile({
      locationLat: roundedLat,
      locationLng: roundedLng,
      defaultZoom: zoom,
    });
    setQuery("");
    setResults([]);
    fetchLocationData(roundedLat, roundedLng);
  };

  const hasLocation = profile.locationLat != null && profile.locationLng != null;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">
          Search Address
        </label>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Type your farm address..."
            className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted pr-8"
          />
          {searching && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}

        {results.length > 0 && (
          <ul className="mt-1 rounded-md border border-border bg-bg-surface shadow-lg max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => selectResult(r)}
                  className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  {r.formatted_address}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={useCurrentMapCenter}
          className="rounded-md border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-elevated transition-colors"
        >
          Use Current Map View
        </button>

        {hasLocation && (
          <>
            <span className="text-xs text-text-muted">
              {profile.locationLat!.toFixed(4)}, {profile.locationLng!.toFixed(4)}
            </span>
            <button
              type="button"
              onClick={() => fetchLocationData(profile.locationLat!, profile.locationLng!)}
              className="text-xs text-accent hover:text-accent-hover transition-colors"
            >
              Refresh zone & sun
            </button>
          </>
        )}
      </div>

      {lookupStatus && (
        <p className="text-xs text-text-secondary">{lookupStatus}</p>
      )}
    </div>
  );
}
