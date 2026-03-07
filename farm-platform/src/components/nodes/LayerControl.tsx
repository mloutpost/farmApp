"use client";

import { useState } from "react";
import { useMapStore } from "@/store/map-store";

export default function LayerControl() {
  const [open, setOpen] = useState(false);
  const layers = useMapStore((s) => s.layers);
  const toggleLayerVisibility = useMapStore((s) => s.toggleLayerVisibility);
  const surveyLayers = layers.filter((l) => l.id.startsWith("survey-"));

  if (surveyLayers.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm font-medium text-text-primary hover:border-accent/50 transition-colors flex items-center gap-2"
      >
        <LayersIcon />
        Layer Control
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute bottom-full left-0 mb-2 z-20 w-64 rounded-lg border border-border bg-bg-elevated shadow-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-border">
              <h4 className="text-sm font-semibold text-text-primary">Layer Control</h4>
            </div>
            <ul className="p-2 max-h-48 overflow-y-auto">
              {surveyLayers.map((layer) => (
                <li
                  key={layer.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-bg-surface transition-colors"
                >
                  <span className="text-sm text-text-primary truncate">{layer.name}</span>
                  <button
                    onClick={() => toggleLayerVisibility(layer.id)}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      layer.visible ? "bg-accent" : "bg-border"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        layer.visible ? "left-5" : "left-1"
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
    </svg>
  );
}
