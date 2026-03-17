import type { DemRaster } from "./dem-elevation";

function getElev(raster: DemRaster, col: number, row: number): number | null {
  if (col < 0 || col >= raster.width || row < 0 || row >= raster.height) return null;
  const idx = col + row * raster.width;
  const v = raster.data[idx];
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (raster.noDataValue != null && Math.abs(v - raster.noDataValue) < 1e-6) return null;
  return v;
}

function getElevBilinear(raster: DemRaster, col: number, row: number): number | null {
  const c0 = Math.floor(col);
  const r0 = Math.floor(row);
  const cx = col - c0;
  const ry = row - r0;
  const e00 = getElev(raster, c0, r0);
  const e10 = getElev(raster, c0 + 1, r0);
  const e01 = getElev(raster, c0, r0 + 1);
  const e11 = getElev(raster, c0 + 1, r0 + 1);
  if (e00 == null || e10 == null || e01 == null || e11 == null) return null;
  return e00 * (1 - cx) * (1 - ry) + e10 * cx * (1 - ry) + e01 * (1 - cx) * ry + e11 * cx * ry;
}

/** Horn (1981) 3x3 weighted slope - matches QGIS. zFactor scales elevation for correct gradient. */
function slopeAspectHorn(
  e: (number | null)[][],
  cellsize: number,
  zFactor: number
): { slope: number; aspect: number } | null {
  const [e00, e01, e02, e10, e11, e12, e20, e21, e22] = [
    e[0][0], e[0][1], e[0][2], e[1][0], e[1][1], e[1][2], e[2][0], e[2][1], e[2][2],
  ];
  if (e00 == null || e01 == null || e02 == null || e10 == null || e11 == null ||
      e12 == null || e20 == null || e21 == null || e22 == null) return null;
  const dzx = (e02 + 2 * e12 + e22) - (e00 + 2 * e10 + e20);
  const dzy = (e20 + 2 * e21 + e22) - (e00 + 2 * e01 + e02);
  const dzdx = (zFactor * dzx) / (8 * cellsize);
  const dzdy = (zFactor * dzy) / (8 * cellsize);
  const slope = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
  let aspect = Math.atan2(-dzdy, dzdx);
  if (aspect < 0) aspect += 2 * Math.PI;
  return { slope, aspect };
}

/** Apply subtle Gaussian blur to smooth rough shading (sigma ~0.8). */
function gaussianBlurRgba(data: Uint8ClampedArray, w: number, h: number, sigma: number): void {
  const r = Math.ceil(sigma * 2);
  const kernel: number[] = [];
  let sum = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(v);
    sum += v;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

  const tmp = new Uint8ClampedArray(data.length);
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      for (let c = 0; c < 4; c++) {
        let v = 0;
        for (let k = -r; k <= r; k++) {
          const nc = Math.max(0, Math.min(w - 1, col + k));
          v += data[(nc + row * w) * 4 + c] * kernel[k + r];
        }
        tmp[(col + row * w) * 4 + c] = Math.round(v);
      }
    }
  }
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      for (let c = 0; c < 4; c++) {
        let v = 0;
        for (let k = -r; k <= r; k++) {
          const nr = Math.max(0, Math.min(h - 1, row + k));
          v += tmp[(col + nr * w) * 4 + c] * kernel[k + r];
        }
        data[(col + row * w) * 4 + c] = Math.round(v);
      }
    }
  }
}

/**
 * Generate hillshade image data (grayscale 0-255) from DEM.
 * Light from NW (azimuth 315°, altitude 45°) by default.
 * @param maxDim - If set, downsample to fit within this dimension (for performance).
 * @param options - zFactor (vertical units vs horizontal), scale (m/deg for geographic), azimuth, altitude, smoothness.
 */
export function generateHillshade(
  raster: DemRaster,
  maxDim?: number,
  options: {
    zFactor?: number;
    scale?: number;
    azimuth?: number;
    altitude?: number;
    smoothness?: number;
  } = {}
): { data: Uint8ClampedArray; width: number; height: number } {
  const {
    zFactor = 1,
    scale,
    azimuth = 315,
    altitude = 45,
    smoothness = 1.5,
  } = options;
  let { width, height } = raster;
  if (maxDim && (width > maxDim || height > maxDim)) {
    const s = maxDim / Math.max(width, height);
    width = Math.round(width * s);
    height = Math.round(height * s);
  }

  const out = new Uint8ClampedArray(width * height * 4);

  const srcW = raster.width;
  const srcH = raster.height;
  const scaleX = srcW / width;
  const scaleY = srcH / height;

  const [minLng, minLat, maxLng, maxLat] = raster.bbox;
  const centerLat = (minLat + maxLat) / 2;
  const latRad = (centerLat * Math.PI) / 180;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(latRad);
  const scaleFactor = scale ?? mPerDegLng;
  const cellsizeX = Math.abs(raster.scaleX) * scaleFactor;
  const cellsizeY = Math.abs(raster.scaleY) * (scale ?? mPerDegLat);
  const cellsize = (cellsizeX + cellsizeY) / 2;

  const zenith = (altitude * Math.PI) / 180;
  const azimuthRad = (azimuth * Math.PI) / 180;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const srcCol = col * scaleX;
      const srcRow = row * scaleY;
      const eGrid: (number | null)[][] = [];
      for (let dr = -1; dr <= 1; dr++) {
        const r: (number | null)[] = [];
        for (let dc = -1; dc <= 1; dc++) {
          r.push(getElevBilinear(raster, srcCol + dc, srcRow + dr));
        }
        eGrid.push(r);
      }
      const sa = slopeAspectHorn(eGrid, cellsize, zFactor);

      let shade = 128;

      if (sa) {
        const raw =
          255 *
          (Math.cos(zenith) * Math.cos(sa.slope) +
            Math.sin(zenith) * Math.sin(sa.slope) * Math.cos(azimuthRad - sa.aspect));
        const contrast = 1.15;
        const brightness = 35;
        shade = Math.max(0, Math.min(255, Math.round(128 + (raw - 128) * contrast + brightness)));
      }

      const idx = (col + row * width) * 4;
      out[idx] = shade;
      out[idx + 1] = shade;
      out[idx + 2] = shade;
      out[idx + 3] = 160;
    }
  }

  const sigma = Math.max(0, Math.min(3, smoothness));
  if (sigma > 0) gaussianBlurRgba(out, width, height, sigma);

  return { data: out, width, height };
}
