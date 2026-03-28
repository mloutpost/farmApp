import type { NodeData, NodeKind } from "@/types";
import { AREA_KINDS } from "@/types";
import { estimateSunExposure, polygonAcres, polygonAreaSqFt } from "@/lib/geo-calc";

const AREA_KIND_SET = new Set<string>(AREA_KINDS);

export type PolygonAreaUpdateOptions = {
  /** Farm profile sun; when set, used for garden/bed instead of latitude estimate */
  profileSun?: "full" | "partial" | "shade";
};

/**
 * Partial `node.data` fields derived from a polygon ring (lng/lat), matching
 * TypePickerModal / geo-calc conventions. Returns null if the kind does not
 * store footprint from geometry or the ring is invalid.
 */
export function polygonAreaDataUpdatesForKind(
  kind: NodeKind,
  ring: number[][],
  opts?: PolygonAreaUpdateOptions
): Partial<NodeData> | null {
  if (!AREA_KIND_SET.has(kind)) return null;
  if (ring.length < 3) return null;

  const areaSqFt = polygonAreaSqFt(ring);
  if (!Number.isFinite(areaSqFt) || areaSqFt <= 0) return null;

  const acres = polygonAcres(ring);
  const roundedAcres = Math.round(acres * 100) / 100;
  const roundedSqft = Math.round(areaSqFt);
  const centerLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
  const estimatedSun = opts?.profileSun ?? estimateSunExposure(centerLat);

  switch (kind) {
    case "garden":
      return { sqft: roundedSqft, sunExposure: estimatedSun } as Partial<NodeData>;
    case "greenhouse":
    case "corral":
    case "building":
      return { sqft: roundedSqft } as Partial<NodeData>;
    case "field":
    case "pasture":
    case "orchard":
    case "pond":
    case "vineyard":
    case "woodlot":
      return { acreage: roundedAcres } as Partial<NodeData>;
    case "bed":
      return { sqft: roundedSqft, sunExposure: estimatedSun } as Partial<NodeData>;
    default:
      return null;
  }
}
