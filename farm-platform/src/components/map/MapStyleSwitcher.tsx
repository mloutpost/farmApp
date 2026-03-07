"use client";

import { useMapStore } from "@/store/map-store";
import { MAP_TYPE_OPTIONS } from "@/lib/google-maps";
import type { GoogleMapType } from "@/lib/google-maps";

export default function MapStyleSwitcher() {
  const { mapType, setMapType } = useMapStore();

  return (
    <div className="flex gap-1 rounded-lg bg-bg-elevated/90 p-1 backdrop-blur-md border border-border">
      {MAP_TYPE_OPTIONS.map((opt) => {
        const active = mapType === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => setMapType(opt.key)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
              active
                ? "bg-accent/15 text-accent"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-surface"
            }`}
          >
            <span className="text-sm">{opt.icon}</span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
