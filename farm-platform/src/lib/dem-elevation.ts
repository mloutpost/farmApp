import { fromBlob } from "geotiff";

export interface DemRaster {
  width: number;
  height: number;
  data: Float32Array | Float64Array | Uint16Array | Int16Array;
  /** [minLng, minLat, maxLng, maxLat] in WGS84 */
  bbox: [number, number, number, number];
  /** Pixel (0,0) = top-left. worldX = originX + px * scaleX, worldY = originY - py * scaleY (Y flipped) */
  originX: number;
  originY: number;
  scaleX: number;
  scaleY: number;
  noDataValue: number | null;
}

function getNumericValue(
  data: DemRaster["data"],
  index: number,
  noData: number | null
): number | null {
  const v = data[index];
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (noData != null && Math.abs(v - noData) < 1e-6) return null;
  return v;
}

/**
 * Load a DEM from a GeoTIFF file (e.g. exported from QGIS).
 * Expects WGS84 (EPSG:4326) for simplest use. Other projections require proj4 transform.
 */
export async function loadDemFromFile(file: File): Promise<DemRaster> {
  const tiff = await fromBlob(file);
  const image = await tiff.getImage(0);

  const rasters = await image.readRasters();
  const rasterData = rasters[0] as Float32Array | Float64Array | Uint16Array | Int16Array;
  if (!rasterData || !rasterData.length) {
    throw new Error("No raster data in GeoTIFF");
  }

  const width = image.fileDirectory.getValue("ImageWidth") as number;
  const height = image.fileDirectory.getValue("ImageLength") as number;
  if (!width || !height) {
    throw new Error("GeoTIFF missing ImageWidth or ImageLength");
  }

  const hasScale = image.fileDirectory.hasTag("ModelPixelScale");
  const hasTiepoint = image.fileDirectory.hasTag("ModelTiepoint");

  let originX: number;
  let originY: number;
  let scaleX: number;
  let scaleY: number;
  let bbox: [number, number, number, number];

  if (hasScale && hasTiepoint) {
    const s = image.fileDirectory.getValue("ModelPixelScale") as number[];
    const t = image.fileDirectory.getValue("ModelTiepoint") as number[];
    const [sx, sy] = s;
    const [, , , gx, gy] = t;
    originX = gx;
    originY = gy;
    scaleX = sx;
    scaleY = -sy;
    bbox = [
      originX,
      originY + height * scaleY,
      originX + width * scaleX,
      originY,
    ];
  } else if (typeof (image as { getBoundingBox?: () => number[] }).getBoundingBox === "function") {
    const b = (image as { getBoundingBox: () => number[] }).getBoundingBox();
    bbox = [b[0], b[1], b[2], b[3]];
    const [minX, minY, maxX, maxY] = bbox;
    originX = minX;
    originY = maxY;
    scaleX = (maxX - minX) / width;
    scaleY = -(maxY - minY) / height;
  } else {
    throw new Error("GeoTIFF missing ModelPixelScale/ModelTiepoint or getBoundingBox");
  }

  let noDataValue: number | null = null;
  if (image.fileDirectory.hasTag("GDAL_NODATA")) {
    const nd = image.fileDirectory.getValue("GDAL_NODATA");
    if (typeof nd === "string") noDataValue = parseFloat(nd);
  }

  return {
    width,
    height,
    data: rasterData,
    bbox: [bbox[0], bbox[1], bbox[2], bbox[3]],
    originX,
    originY,
    scaleX,
    scaleY,
    noDataValue,
  };
}

/**
 * Get elevation at a WGS84 (lng, lat) point. Returns meters or null if outside bounds / no data.
 */
export function getElevationAt(raster: DemRaster, lng: number, lat: number): number | null {
  const [minLng, minLat, maxLng, maxLat] = raster.bbox;
  if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) return null;

  const px = (lng - raster.originX) / raster.scaleX;
  const py = (raster.originY - lat) / raster.scaleY;

  const col = Math.floor(px);
  const row = Math.floor(py);

  if (col < 0 || col >= raster.width - 1 || row < 0 || row >= raster.height - 1) {
    const idx = Math.max(0, Math.min(col + row * raster.width, raster.data.length - 1));
    return getNumericValue(raster.data, idx, raster.noDataValue);
  }

  const idx = col + row * raster.width;
  return getNumericValue(raster.data, idx, raster.noDataValue);
}
