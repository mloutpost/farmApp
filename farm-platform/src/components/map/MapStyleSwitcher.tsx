"use client";

import { useMapStore } from "@/store/map-store";
import { MAP_TYPE_OPTIONS } from "@/lib/google-maps";
import type { GoogleMapType } from "@/lib/google-maps";

const MAP_ICONS: Record<GoogleMapType, React.ReactNode> = {
  satellite: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  ),
  hybrid: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  ),
  roadmap: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 18l4-4M8 14l4-4M12 10l4-4M16 6v12" />
      <path d="M4 18h16" />
    </svg>
  ),
  terrain: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20l4-8 4 4 4-4 4 8" />
      <path d="M4 20h16" />
    </svg>
  ),
};

export default function MapStyleSwitcher() {
  const { mapType, setMapType } = useMapStore();

  return (
    <div className="flex gap-0.5 rounded-lg bg-bg-elevated/95 backdrop-blur border border-border p-1 shadow-lg">
      {MAP_TYPE_OPTIONS.map((opt) => {
        const active = mapType === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => setMapType(opt.key)}
            aria-label={`${opt.label} map`}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
              active
                ? "bg-accent/20 text-accent"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-surface"
            }`}
          >
            {MAP_ICONS[opt.key]}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
