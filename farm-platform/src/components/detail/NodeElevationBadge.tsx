"use client";

import { useDemStore } from "@/store/dem-store";
import { getElevationAt } from "@/lib/dem-elevation";
import type { FarmNode } from "@/types";

function getCentroid(geometry: FarmNode["geometry"]): [number, number] | null {
  if (!geometry || !("type" in geometry)) return null;
  const g = geometry as { type: string; coordinates: number[] | number[][] | number[][][] };
  if (g.type === "Point" && Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
    const c = g.coordinates as number[];
    return [c[0], c[1]];
  }
  if (g.type === "LineString" && Array.isArray(g.coordinates) && g.coordinates.length > 0) {
    const coords = g.coordinates as number[][];
    const mid = Math.floor(coords.length / 2);
    const p = coords[mid];
    return p && p.length >= 2 ? [p[0], p[1]] : null;
  }
  if (g.type === "Polygon" && Array.isArray(g.coordinates) && g.coordinates.length > 0) {
    const ring = g.coordinates[0] as number[][];
    if (!ring || ring.length < 3) return null;
    let sumLng = 0;
    let sumLat = 0;
    for (const p of ring) {
      if (Array.isArray(p) && p.length >= 2) {
        sumLng += p[0];
        sumLat += p[1];
      }
    }
    return [sumLng / ring.length, sumLat / ring.length];
  }
  return null;
}

export default function NodeElevationBadge({ node }: { node: FarmNode }) {
  const raster = useDemStore((s) => s.raster);
  const centroid = getCentroid(node.geometry);
  if (!raster || !centroid) return null;

  const elev = getElevationAt(raster, centroid[0], centroid[1]);
  if (elev == null) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-bg-surface px-2 py-1 text-xs text-text-secondary">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20M12 2l-4 6h8l-4-6z" />
      </svg>
      Elevation: {elev.toFixed(0)} m
    </span>
  );
}
