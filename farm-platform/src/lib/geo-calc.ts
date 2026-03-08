const R_FEET = 20902231;
const R_METERS = 6371000;
const DEG = Math.PI / 180;

function toRad(deg: number) {
  return deg * DEG;
}

/** Remove consecutive near-duplicate points from a coordinate ring */
function dedup(ring: number[][], eps = 1e-7): number[][] {
  if (ring.length < 2) return ring;
  const out: number[][] = [ring[0]];
  for (let i = 1; i < ring.length; i++) {
    const prev = out[out.length - 1];
    if (Math.abs(ring[i][0] - prev[0]) > eps || Math.abs(ring[i][1] - prev[1]) > eps) {
      out.push(ring[i]);
    }
  }
  return out;
}

/** Haversine distance between two [lng, lat] points, in feet */
export function distanceFt(a: number[], b: number[]): number {
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLat = lat2 - lat1;
  const dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_FEET * Math.asin(Math.sqrt(h));
}

/** Polygon area via equirectangular projection + shoelace, returned in sq ft */
export function polygonAreaSqFt(ring: number[][]): number {
  const pts = dedup(ring);
  if (pts.length < 3) return 0;

  const refLat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const ftPerDegLat = DEG * R_FEET;
  const ftPerDegLng = ftPerDegLat * Math.cos(toRad(refLat));

  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const xi = pts[i][0] * ftPerDegLng;
    const yi = pts[i][1] * ftPerDegLat;
    const xj = pts[j][0] * ftPerDegLng;
    const yj = pts[j][1] * ftPerDegLat;
    area += xi * yj - xj * yi;
  }
  return Math.abs(area) / 2;
}

/** Polygon acreage */
export function polygonAcres(ring: number[][]): number {
  return polygonAreaSqFt(ring) / 43560;
}

/** Side lengths of a polygon ring in feet */
export function polygonSideLengths(ring: number[][]): number[] {
  const pts = dedup(ring);
  const sides: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const next = pts[(i + 1) % pts.length];
    sides.push(distanceFt(pts[i], next));
  }
  return sides;
}

/** Perimeter in feet */
export function polygonPerimeterFt(ring: number[][]): number {
  return polygonSideLengths(ring).reduce((a, b) => a + b, 0);
}

/** Total length of a linestring in feet */
export function lineStringLengthFt(coords: number[][]): number {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += distanceFt(coords[i], coords[i + 1]);
  }
  return total;
}

/**
 * Fallback sun exposure estimate based on latitude alone.
 * Prefer profile.sunExposure (from Google Solar API or Open-Meteo) when available.
 */
export function estimateSunExposure(lat: number): "full" | "partial" | "shade" {
  const absLat = Math.abs(lat);
  if (absLat < 35) return "full";
  if (absLat < 50) return "partial";
  return "shade";
}

/** Format feet to a human-readable string */
export function formatFt(ft: number): string {
  if (ft >= 5280) return `${(ft / 5280).toFixed(2)} mi`;
  if (ft >= 100) return `${Math.round(ft)} ft`;
  return `${ft.toFixed(1)} ft`;
}

/** Format sq ft to human-readable */
export function formatArea(sqft: number): string {
  if (sqft >= 43560) return `${(sqft / 43560).toFixed(2)} acres`;
  return `${Math.round(sqft).toLocaleString()} sq ft`;
}
