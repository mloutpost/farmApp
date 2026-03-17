"use client";

import { useState } from "react";
import { useDemStore } from "@/store/dem-store";
import { useFarmStore } from "@/store/farm-store";
import { computePlantingSuitability } from "@/lib/dem-analysis";
import { AREA_KINDS } from "@/types";
import type { FarmNode } from "@/types";

function getPolygonRing(node: FarmNode): number[][] | null {
  const g = node.geometry;
  if (!g || !("type" in g)) return null;
  const geo = g as { type: string; coordinates: number[][][] };
  if (geo.type !== "Polygon" || !Array.isArray(geo.coordinates) || geo.coordinates.length === 0) return null;
  const ring = geo.coordinates[0];
  return Array.isArray(ring) ? ring : null;
}

export default function PlantingSuitabilityPanel() {
  const raster = useDemStore((s) => s.raster);
  const nodes = useFarmStore((s) => s.nodes);
  const areaNodes = nodes.filter((n) => AREA_KINDS.includes(n.kind as any) && getPolygonRing(n));
  const [selectedId, setSelectedId] = useState<string>("");
  const [result, setResult] = useState<ReturnType<typeof computePlantingSuitability>>(null);

  const handleAnalyze = () => {
    if (!raster || !selectedId) return;
    const node = areaNodes.find((n) => n.id === selectedId);
    const ring = node ? getPolygonRing(node) : null;
    if (!ring) return;
    setResult(computePlantingSuitability(raster, ring));
  };

  if (!raster) return null;

  return (
    <div className="mt-2 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-text-muted">Planting Suitability</p>
      <select
        value={selectedId}
        onChange={(e) => { setSelectedId(e.target.value); setResult(null); }}
        className="w-full rounded-md border border-border bg-bg-surface px-2 py-1.5 text-xs text-text-primary"
      >
        <option value="">Select area...</option>
        {areaNodes.map((n) => (
          <option key={n.id} value={n.id}>{n.name}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!selectedId}
        className="w-full rounded-md bg-accent/20 px-2 py-1.5 text-xs font-medium text-accent hover:bg-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Analyze
      </button>
      {result && (
        <div className="rounded-md border border-border bg-bg-surface p-2 text-xs">
          <div className="font-medium text-text-primary mb-1.5">
            Suitability: {result.score}/100
          </div>
          <div className="space-y-0.5 text-text-muted">
            <div>Slope: {result.slopeScore}/100</div>
            <div>Aspect: {result.aspectScore}/100</div>
            <div>Drainage: {result.drainageScore}/100</div>
            <div>Frost: {result.frostScore}/100</div>
          </div>
        </div>
      )}
    </div>
  );
}
