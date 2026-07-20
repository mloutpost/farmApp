import type { GeoJSON } from "geojson";

export interface LngLatBBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/** First outer ring as [lng,lat][] (closed or not). Point → small square around it. */
export function geojsonToOuterRing(geo: GeoJSON | null | undefined): number[][] | null {
  if (!geo) return null;
  if (geo.type === "Polygon") {
    const ring = geo.coordinates[0] as number[][] | undefined;
    return ring && ring.length >= 3 ? ring : null;
  }
  if (geo.type === "MultiPolygon") {
    const poly = geo.coordinates[0];
    const ring = poly?.[0] as number[][] | undefined;
    return ring && ring.length >= 3 ? ring : null;
  }
  if (geo.type === "Point") {
    const [lng, lat] = geo.coordinates as number[];
    const d = 0.00008;
    return [
      [lng - d, lat - d],
      [lng + d, lat - d],
      [lng + d, lat + d],
      [lng - d, lat + d],
      [lng - d, lat - d],
    ];
  }
  return null;
}

export function ringBBox(ring: number[][]): LngLatBBox {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const pt of ring) {
    const lng = pt[0];
    const lat = pt[1];
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLng, minLat, maxLng, maxLat };
}

export function mergeBBoxes(a: LngLatBBox, b: LngLatBBox): LngLatBBox {
  return {
    minLng: Math.min(a.minLng, b.minLng),
    minLat: Math.min(a.minLat, b.minLat),
    maxLng: Math.max(a.maxLng, b.maxLng),
    maxLat: Math.max(a.maxLat, b.maxLat),
  };
}

/** Meters per degree latitude (approximate). */
const M_LAT = 111_320;

function metersPerDegLng(latDeg: number): number {
  return M_LAT * Math.cos((latDeg * Math.PI) / 180);
}

/** Local east/north meters relative to refLng/refLat (small areas: shapes keep real proportions). */
export function lngLatToMetric(lng: number, lat: number, refLng: number, refLat: number): [number, number] {
  const mLng = metersPerDegLng(refLat);
  const x = (lng - refLng) * mLng;
  const y = (lat - refLat) * M_LAT;
  return [x, y];
}

export interface MetricBBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function metricBBoxFromRingMeters(ring: [number, number][]): MetricBBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function mergeMetricBBoxes(a: MetricBBox, b: MetricBBox): MetricBBox {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/** Project a lng/lat ring to SVG using local metric space + uniform scale (no lng/lat skew). */
export function projectRingToSvgMetric(
  ringLngLat: number[][],
  refLng: number,
  refLat: number,
  fitBBox: MetricBBox,
  width: number,
  height: number,
  padding = 8
): [number, number][] {
  const ring: [number, number][] = ringLngLat.map(([lng, lat]) => lngLatToMetric(lng, lat, refLng, refLat));
  return projectMetricRingToSvg(ring, fitBBox, width, height, padding);
}

export function projectMetricRingToSvg(
  ring: [number, number][],
  fitBBox: MetricBBox,
  width: number,
  height: number,
  padding = 8
): [number, number][] {
  const bw = Math.max(fitBBox.maxX - fitBBox.minX, 1e-9);
  const bh = Math.max(fitBBox.maxY - fitBBox.minY, 1e-9);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const scale = Math.min(innerW / bw, innerH / bh);
  const ox = padding + (innerW - bw * scale) / 2;
  const oy = padding + (innerH - bh * scale) / 2;
  return ring.map(([x, y]) => {
    const sx = ox + (x - fitBBox.minX) * scale;
    const sy = oy + (fitBBox.maxY - y) * scale;
    return [sx, sy];
  });
}

export function ringCentroid(ring: number[][]): [number, number] {
  let sx = 0;
  let sy = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    sx += ring[i][0];
    sy += ring[i][1];
  }
  return [sx / n, sy / n];
}

/** Map lng/lat to SVG coords; y inverted so north is up. */
export function projectRingToSvg(
  ring: number[][],
  bbox: LngLatBBox,
  width: number,
  height: number,
  padding = 8
): [number, number][] {
  const { minLng, minLat, maxLng, maxLat } = bbox;
  const bw = Math.max(maxLng - minLng, 1e-12);
  const bh = Math.max(maxLat - minLat, 1e-12);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  return ring.map(([lng, lat]) => {
    const x = padding + ((lng - minLng) / bw) * innerW;
    const y = padding + (1 - (lat - minLat) / bh) * innerH;
    return [x, y];
  });
}

export function svgPathFromRing(projected: [number, number][]): string {
  if (projected.length === 0) return "";
  const [x0, y0] = projected[0];
  const rest = projected.slice(1);
  let d = `M ${x0} ${y0}`;
  for (const [x, y] of rest) {
    d += ` L ${x} ${y}`;
  }
  d += " Z";
  return d;
}

/** Grid cell bbox inside unit square [0,1]x[0,1], row-major. */
export function gridCellBounds(index: number, total: number, cols: number): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const rows = Math.ceil(total / cols);
  const row = Math.floor(index / cols);
  const col = index % cols;
  const w = 1 / cols;
  const h = 1 / rows;
  return { x: col * w, y: row * h, w, h };
}

export function zoomForBBox(bbox: LngLatBBox): number {
  const latSpan = Math.max(bbox.maxLat - bbox.minLat, 1e-8);
  const lngSpan = Math.max(bbox.maxLng - bbox.minLng, 1e-8);
  const span = Math.max(latSpan, lngSpan);
  if (span > 0.5) return 8;
  if (span > 0.1) return 10;
  if (span > 0.02) return 12;
  if (span > 0.005) return 14;
  if (span > 0.001) return 16;
  if (span > 0.0003) return 17;
  return 18;
}

export function bboxCenter(bbox: LngLatBBox): [number, number] {
  return [(bbox.minLng + bbox.maxLng) / 2, (bbox.minLat + bbox.maxLat) / 2];
}

export function bboxFromGeometry(geo: GeoJSON): LngLatBBox | null {
  const ring = geojsonToOuterRing(geo);
  if (!ring) return null;
  return ringBBox(ring);
}
