"use client";

import { useState } from "react";
import Link from "next/link";
import { useMapStore } from "@/store/map-store";

const NODE_PALETTE_ITEMS = [
  { id: "garden", label: "+ Garden", icon: "🌱" },
  { id: "bed", label: "Bed", icon: "🛏" },
  { id: "well", label: "Well", icon: "💧" },
  { id: "fence", label: "Fence", icon: "🚧" },
  { id: "equipment", label: "+ Equipment", icon: "🔧" },
];

export function SurveyImportStatus() {
  const [dismissed, setDismissed] = useState(false);
  const lastImport = useMapStore((s) => s.lastImport);

  if (dismissed || !lastImport) return null;

  return (
    <div className="rounded-lg border border-border bg-bg-elevated/95 backdrop-blur shadow-lg p-3 w-64">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-text-primary">Survey Import Status</span>
        <button
          onClick={() => setDismissed(true)}
          className="text-text-muted hover:text-text-primary p-0.5"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <p className="text-xs text-text-secondary">
        Last Import: {lastImport.filename} — {lastImport.success ? "Success" : "Failed"}
      </p>
    </div>
  );
}

export function NodePalette() {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated/95 backdrop-blur shadow-lg p-3 w-48">
      <span className="text-sm font-semibold text-text-primary block mb-2">Node Palette</span>
      <div className="space-y-1.5">
        {NODE_PALETTE_ITEMS.map((item) => (
          <button
            key={item.id}
            className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-left text-sm text-text-secondary hover:bg-bg-surface hover:text-text-primary transition-colors"
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MapLayerControl() {
  const [open, setOpen] = useState(true);
  const layers = useMapStore((s) => s.layers);
  const toggleLayerVisibility = useMapStore((s) => s.toggleLayerVisibility);
  const surveyLayers = layers.filter((l) => l.id.startsWith("survey-"));

  return (
    <div className="rounded-lg border border-border bg-bg-elevated/95 backdrop-blur shadow-lg overflow-hidden w-56">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-semibold text-text-primary">Layer Control</span>
        <button
          onClick={() => setOpen(!open)}
          className="text-text-muted hover:text-text-primary p-0.5"
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? "−" : "+"}
        </button>
      </div>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {surveyLayers.length > 0 ? (
            surveyLayers.map((layer) => (
              <div
                key={layer.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-xs text-text-primary truncate">{layer.name}</span>
                <button
                  onClick={() => toggleLayerVisibility(layer.id)}
                  className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                    layer.visible ? "bg-accent" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      layer.visible ? "left-4" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            ))
          ) : (
            <p className="text-xs text-text-muted">No layers</p>
          )}
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-md bg-accent/20 px-2 py-1.5 text-xs font-medium text-accent hover:bg-accent/30 transition-colors mt-2"
          >
            <span>⚙+</span>
            Survey Import Tool
          </Link>
        </div>
      )}
    </div>
  );
}
