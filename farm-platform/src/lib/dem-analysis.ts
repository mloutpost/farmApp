import type { DemRaster } from "./dem-elevation";

function getElev(raster: DemRaster, col: number, row: number): number | null {
  if (col < 0 || col >= raster.width || row < 0 || row >= raster.height) return null;
  const idx = col + row * raster.width;
  const v = raster.data[idx];
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (raster.noDataValue != null && Math.abs(v - raster.noDataValue) < 1e-6) return null;
  return v;
}

export interface SlopeAspectResult {
  slopeDeg: number;
  slopePct: number;
  aspectDeg: number;
}

/** Compute slope (degrees, %) and aspect (0-360) at a pixel. */
export function computeSlopeAspect(
  raster: DemRaster,
  col: number,
  row: number
): SlopeAspectResult | null {
  const e = getElev(raster, col, row);
  const eW = getElev(raster, col - 1, row);
  const eE = getElev(raster, col + 1, row);
  const eS = getElev(raster, col, row + 1);
  const eN = getElev(raster, col, row - 1);
  if (e == null || eW == null || eE == null || eS == null || eN == null) return null;

  const cellsize = (Math.abs(raster.scaleX) + Math.abs(raster.scaleY)) / 2;
  const dzdx = (eE - eW) / (2 * cellsize);
  const dzdy = (eS - eN) / (2 * cellsize);
  const slopeRad = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
  const slopeDeg = (slopeRad * 180) / Math.PI;
  const slopePct = Math.tan(slopeRad) * 100;
  let aspectDeg = (Math.atan2(-dzdy, dzdx) * 180) / Math.PI;
  if (aspectDeg < 0) aspectDeg += 360;

  return { slopeDeg, slopePct, aspectDeg };
}

/** Generate slope raster (0-255 mapped to 0-45°). Returns RGBA. */
export function generateSlopeRaster(
  raster: DemRaster,
  maxDim?: number
): { data: Uint8ClampedArray; width: number; height: number } {
  let { width, height } = raster;
  if (maxDim && (width > maxDim || height > maxDim)) {
    const s = maxDim / Math.max(width, height);
    width = Math.round(width * s);
    height = Math.round(height * s);
  }
  const scaleX = raster.width / width;
  const scaleY = raster.height / height;
  const out = new Uint8ClampedArray(width * height * 4);

  const maxSlopeDeg = 45;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const sc = Math.floor(col * scaleX);
      const sr = Math.floor(row * scaleY);
      const sa = computeSlopeAspect(raster, sc, sr);
      const idx = (col + row * width) * 4;
      if (sa) {
        const t = Math.min(1, sa.slopeDeg / maxSlopeDeg);
        const r = Math.round(34 + t * 221);
        const g = Math.round(197 - t * 197);
        const b = Math.round(127 - t * 127);
        out[idx] = r;
        out[idx + 1] = g;
        out[idx + 2] = b;
        out[idx + 3] = 200;
      } else {
        out[idx] = out[idx + 1] = out[idx + 2] = 128;
        out[idx + 3] = 0;
      }
    }
  }
  return { data: out, width, height };
}

/** Generate aspect raster (0-360 → hue). Returns RGBA. */
export function generateAspectRaster(
  raster: DemRaster,
  maxDim?: number
): { data: Uint8ClampedArray; width: number; height: number } {
  let { width, height } = raster;
  if (maxDim && (width > maxDim || height > maxDim)) {
    const s = maxDim / Math.max(width, height);
    width = Math.round(width * s);
    height = Math.round(height * s);
  }
  const scaleX = raster.width / width;
  const scaleY = raster.height / height;
  const out = new Uint8ClampedArray(width * height * 4);

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const sc = Math.floor(col * scaleX);
      const sr = Math.floor(row * scaleY);
      const sa = computeSlopeAspect(raster, sc, sr);
      const idx = (col + row * width) * 4;
      if (sa) {
        const h = sa.aspectDeg / 360;
        const [r, g, b] = hslToRgb(h, 0.7, 0.5);
        out[idx] = r;
        out[idx + 1] = g;
        out[idx + 2] = b;
        out[idx + 3] = 200;
      } else {
        out[idx] = out[idx + 1] = out[idx + 2] = 128;
        out[idx + 3] = 0;
      }
    }
  }
  return { data: out, width, height };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = Math.round(l * 255);
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/** D8 flow direction: 0=E, 1=SE, 2=S, 3=SW, 4=W, 5=NW, 6=N, 7=NE, -1=sink */
const D8_DX = [1, 1, 0, -1, -1, -1, 0, 1];
const D8_DY = [0, 1, 1, 1, 0, -1, -1, -1];

/** Flow accumulation (count of cells draining into each cell). Downsampled for performance. */
export function computeFlowAccumulation(
  raster: DemRaster,
  maxDim = 256
): { data: Float32Array; width: number; height: number } {
  let w = raster.width;
  let h = raster.height;
  if (w > maxDim || h > maxDim) {
    const s = maxDim / Math.max(w, h);
    w = Math.round(w * s);
    h = Math.round(h * s);
  }
  const scaleX = raster.width / w;
  const scaleY = raster.height / h;

  const elev = new Float32Array(w * h);
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const sc = Math.floor(col * scaleX);
      const sr = Math.floor(row * scaleY);
      const e = getElev(raster, sc, sr);
      elev[col + row * w] = e ?? -9999;
    }
  }

  const flowDir = new Int8Array(w * h);
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const idx = col + row * w;
      const e = elev[idx];
      if (e <= -9999) {
        flowDir[idx] = -1;
        continue;
      }
      let minE = e;
      let best = -1;
      for (let d = 0; d < 8; d++) {
        const nc = col + D8_DX[d];
        const nr = row + D8_DY[d];
        if (nc < 0 || nc >= w || nr < 0 || nr >= h) continue;
        const ne = elev[nc + nr * w];
        if (ne < minE && ne > -9999) {
          minE = ne;
          best = d;
        }
      }
      flowDir[idx] = best;
    }
  }

  const acc = new Float32Array(w * h);
  for (let i = 0; i < acc.length; i++) acc[i] = 1;

  const order: number[] = [];
  const visited = new Set<number>();
  const visit = (idx: number) => {
    if (visited.has(idx)) return;
    visited.add(idx);
    const d = flowDir[idx];
    if (d >= 0) {
      const col = idx % w;
      const row = Math.floor(idx / w);
      const nc = col + D8_DX[d];
      const nr = row + D8_DY[d];
      if (nc >= 0 && nc < w && nr >= 0 && nr < h) {
        visit(nc + nr * w);
      }
    }
    order.push(idx);
  };
  for (let i = 0; i < w * h; i++) visit(i);

  for (let i = order.length - 1; i >= 0; i--) {
    const idx = order[i];
    const d = flowDir[idx];
    if (d >= 0) {
      const col = idx % w;
      const row = Math.floor(idx / w);
      const nc = col + D8_DX[d];
      const nr = row + D8_DY[d];
      if (nc >= 0 && nc < w && nr >= 0 && nr < h) {
        const nidx = nc + nr * w;
        acc[nidx] += acc[idx];
      }
    }
  }

  return { data: acc, width: w, height: h };
}

/** Convert flow accumulation to RGBA (log scale, blue gradient). */
export function flowAccumToRgba(
  acc: { data: Float32Array; width: number; height: number }
): Uint8ClampedArray {
  const { data, width, height } = acc;
  const out = new Uint8ClampedArray(width * height * 4);
  let max = 1;
  for (let i = 0; i < data.length; i++) {
    if (Number.isFinite(data[i])) max = Math.max(max, data[i]);
  }
  const logMax = Math.log(max + 1);
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    const t = Number.isFinite(v) ? Math.log(v + 1) / logMax : 0;
    const idx = i * 4;
    out[idx] = Math.round(59 + t * 196);
    out[idx + 1] = Math.round(130 + t * 125);
    out[idx + 2] = Math.round(246 - t * 119);
    out[idx + 3] = t > 0.01 ? 180 : 0;
  }
  return out;
}

/** Frost pockets: local minima (cell lower than all 8 neighbors). Returns RGBA. */
export function generateFrostPocketsRaster(
  raster: DemRaster,
  maxDim?: number
): { data: Uint8ClampedArray; width: number; height: number } {
  let { width, height } = raster;
  if (maxDim && (width > maxDim || height > maxDim)) {
    const s = maxDim / Math.max(width, height);
    width = Math.round(width * s);
    height = Math.round(height * s);
  }
  const scaleX = raster.width / width;
  const scaleY = raster.height / height;
  const out = new Uint8ClampedArray(width * height * 4);

  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
  ];

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const sc = Math.floor(col * scaleX);
      const sr = Math.floor(row * scaleY);
      const e = getElev(raster, sc, sr);
      const idx = (col + row * width) * 4;
      if (e == null) {
        out[idx] = out[idx + 1] = out[idx + 2] = 128;
        out[idx + 3] = 0;
        continue;
      }
      let isMin = true;
      for (const [dc, dr] of neighbors) {
        const ne = getElev(raster, sc + dc, sr + dr);
        if (ne != null && ne < e) {
          isMin = false;
          break;
        }
      }
      if (isMin) {
        out[idx] = 147;
        out[idx + 1] = 51;
        out[idx + 2] = 234;
        out[idx + 3] = 200;
      } else {
        out[idx] = out[idx + 1] = out[idx + 2] = 0;
        out[idx + 3] = 0;
      }
    }
  }
  return { data: out, width, height };
}

export interface ContourLine {
  elevation: number;
  segments: number[][][];
}

/** Generate contour line segments at given intervals. Each segment is [[lng,lat],[lng,lat]]. */
export function generateContours(
  raster: DemRaster,
  interval: number,
  maxDim = 256
): ContourLine[] {
  let w = raster.width;
  let h = raster.height;
  if (w > maxDim || h > maxDim) {
    const s = maxDim / Math.max(w, h);
    w = Math.round(w * s);
    h = Math.round(h * s);
  }
  const scaleX = raster.width / w;
  const scaleY = raster.height / h;

  const elev = new Float32Array(w * h);
  let minE = Infinity;
  let maxE = -Infinity;
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const sc = Math.floor(col * scaleX);
      const sr = Math.floor(row * scaleY);
      const e = getElev(raster, sc, sr);
      const v = e ?? -9999;
      elev[col + row * w] = v;
      if (v > -9999) {
        minE = Math.min(minE, v);
        maxE = Math.max(maxE, v);
      }
    }
  }

  const toLngLat = (px: number, py: number) => {
    const lng = raster.originX + (px / w) * (raster.bbox[2] - raster.bbox[0]);
    const lat = raster.originY - (py / h) * (raster.originY - raster.bbox[1]);
    return [lng, lat] as [number, number];
  };

  const contours: ContourLine[] = [];
  const start = Math.ceil(minE / interval) * interval;
  for (let level = start; level <= maxE; level += interval) {
    const segments: number[][][] = [];
    const cross = (a: number, b: number) => (a < level && b >= level) || (a >= level && b < level);
    const t = (a: number, b: number) => (level - a) / (b - a);

    for (let row = 0; row < h - 1; row++) {
      for (let col = 0; col < w - 1; col++) {
        const e00 = elev[col + row * w];
        const e10 = elev[col + 1 + row * w];
        const e01 = elev[col + (row + 1) * w];
        const e11 = elev[col + 1 + (row + 1) * w];
        if (e00 <= -9999 || e10 <= -9999 || e01 <= -9999 || e11 <= -9999) continue;

        const pts: [number, number][] = [];
        if (cross(e00, e10)) pts.push([col + t(e00, e10), row]);
        if (cross(e10, e11)) pts.push([col + 1, row + t(e10, e11)]);
        if (cross(e11, e01)) pts.push([col + 1 - t(e11, e01), row + 1]);
        if (cross(e01, e00)) pts.push([col, row + 1 - t(e01, e00)]);

        if (pts.length === 2) {
          segments.push([toLngLat(pts[0][0], pts[0][1]), toLngLat(pts[1][0], pts[1][1])]);
        } else if (pts.length === 4) {
          const center = (e00 + e10 + e01 + e11) / 4;
          if (center >= level) {
            segments.push([toLngLat(pts[0][0], pts[0][1]), toLngLat(pts[2][0], pts[2][1])]);
            segments.push([toLngLat(pts[1][0], pts[1][1]), toLngLat(pts[3][0], pts[3][1])]);
          } else {
            segments.push([toLngLat(pts[0][0], pts[0][1]), toLngLat(pts[3][0], pts[3][1])]);
            segments.push([toLngLat(pts[1][0], pts[1][1]), toLngLat(pts[2][0], pts[2][1])]);
          }
        }
      }
    }
    if (segments.length > 0) contours.push({ elevation: level, segments });
  }

  return contours;
}

export interface PlantingSuitabilityResult {
  score: number;
  slopeScore: number;
  aspectScore: number;
  drainageScore: number;
  frostScore: number;
}

/** Compute planting suitability 0-100 for a polygon. Samples centroid and nearby points. */
export function computePlantingSuitability(
  raster: DemRaster,
  ring: number[][]
): PlantingSuitabilityResult | null {
  if (!ring || ring.length < 3) return null;

  let sumLng = 0;
  let sumLat = 0;
  for (const p of ring) {
    if (Array.isArray(p) && p.length >= 2) {
      sumLng += p[0];
      sumLat += p[1];
    }
  }
  const cx = sumLng / ring.length;
  const cy = sumLat / ring.length;

  const [minLng, minLat, maxLng, maxLat] = raster.bbox;
  if (cx < minLng || cx > maxLng || cy < minLat || cy > maxLat) return null;

  const px = (cx - raster.originX) / raster.scaleX;
  const py = (raster.originY - cy) / raster.scaleY;
  const col = Math.floor(px);
  const row = Math.floor(py);

  const sa = computeSlopeAspect(raster, col, row);
  if (!sa) return null;

  const acc = computeFlowAccumulation(raster, 128);
  const accCol = Math.min(Math.floor((col / raster.width) * acc.width), acc.width - 1);
  const accRow = Math.min(Math.floor((row / raster.height) * acc.height), acc.height - 1);
  const accIdx = accCol + accRow * acc.width;
  const flowAcc = acc.data[accIdx] ?? 1;

  const neighbors = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  let isFrostPocket = true;
  const e = getElev(raster, col, row);
  if (e != null) {
    for (const [dc, dr] of neighbors) {
      const ne = getElev(raster, col + dc, row + dr);
      if (ne != null && ne < e) {
        isFrostPocket = false;
        break;
      }
    }
  }

  const slopeScore = Math.max(0, 100 - sa.slopeDeg * 4);
  const aspectSouth = 180;
  const aspectDiff = Math.abs(sa.aspectDeg - aspectSouth);
  const aspectScore = Math.max(0, 100 - Math.min(aspectDiff, 360 - aspectDiff) / 1.8);
  const logAcc = Math.log(flowAcc + 1);
  const drainageScore = Math.max(0, 100 - logAcc * 15);
  const frostScore = isFrostPocket ? 40 : 100;

  const score = Math.round(
    (slopeScore * 0.35 + aspectScore * 0.25 + drainageScore * 0.25 + frostScore * 0.15)
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    slopeScore: Math.round(slopeScore),
    aspectScore: Math.round(aspectScore),
    drainageScore: Math.round(drainageScore),
    frostScore,
  };
}
