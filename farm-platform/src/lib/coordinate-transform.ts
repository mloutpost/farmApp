/**
 * Transform GeoJSON coordinates from a source CRS to WGS84 (EPSG:4326).
 * Survey DXF files typically use State Plane or UTM, not lat/lng.
 */

import proj4 from "proj4";
import type { FeatureCollection, Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon } from "geojson";

const WGS84 = "EPSG:4326";

// Register NAD83 UTM and State Plane definitions (proj4 only has WGS84 UTM by default)
proj4.defs("EPSG:26912", "+proj=utm +zone=12 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");
proj4.defs("EPSG:26913", "+proj=utm +zone=13 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");
proj4.defs("EPSG:26914", "+proj=utm +zone=14 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");
proj4.defs("EPSG:26915", "+proj=utm +zone=15 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");
proj4.defs("EPSG:26916", "+proj=utm +zone=16 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");
proj4.defs("EPSG:26917", "+proj=utm +zone=17 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");
proj4.defs("EPSG:2264", "+proj=lcc +lat_1=27.83333333333334 +lat_2=26.16666666666667 +lat_0=25.66666666666667 +lon_0=-98.5 +x_0=300000.0000000001 +y_0=5000000 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048006096012192 +no_defs");
proj4.defs("EPSG:2278", "+proj=lcc +lat_1=34.91666666666666 +lat_2=33.18333333333333 +lat_0=32.13333333333334 +lon_0=-98 +x_0=600000 +y_0=2000000 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048006096012192 +no_defs");

export const CRS_OPTIONS = [
  { value: "EPSG:4326", label: "WGS84 (lat/lng) – no transform" },
  { value: "EPSG:26912", label: "NAD83 UTM Zone 12N (W 114°–108°)" },
  { value: "EPSG:26913", label: "NAD83 UTM Zone 13N (W 108°–102°)" },
  { value: "EPSG:26914", label: "NAD83 UTM Zone 14N (W 102°–96°)" },
  { value: "EPSG:26915", label: "NAD83 UTM Zone 15N (W 96°–90°)" },
  { value: "EPSG:26916", label: "NAD83 UTM Zone 16N (W 90°–84°)" },
  { value: "EPSG:26917", label: "NAD83 UTM Zone 17N (W 84°–78°)" },
  { value: "EPSG:2264", label: "NAD83 State Plane Texas South (ft)" },
  { value: "EPSG:2278", label: "NAD83 State Plane Texas North (ft)" },
] as const;

export type CrsOption = (typeof CRS_OPTIONS)[number]["value"];

function transformCoords(
  coords: number[],
  fromCrs: string,
  toCrs: string
): number[] {
  if (fromCrs === toCrs) return coords;
  const [x, y] = coords;
  const [lng, lat] = proj4(fromCrs, toCrs, [x, y]);
  return [lng, lat];
}

function transformCoordinate(
  coord: number[],
  fromCrs: string,
  toCrs: string
): number[] {
  if (coord.length >= 2) {
    const [x, y] = coord;
    const [lng, lat] = proj4(fromCrs, toCrs, [x, y]);
    return coord.length === 2 ? [lng, lat] : [lng, lat, coord[2]];
  }
  return coord;
}

type Geometry = Point | LineString | Polygon | MultiPoint | MultiLineString | MultiPolygon;

function transformGeometry(
  geom: Geometry,
  fromCrs: string,
  toCrs: string
): Geometry {
  if (fromCrs === toCrs) return geom;

  const transformPosition = (pos: number[]) =>
    transformCoordinate(pos, fromCrs, toCrs);

  const transformRing = (ring: number[][]) => ring.map(transformPosition);

  if (geom.type === "Point") {
    return {
      ...geom,
      coordinates: transformPosition(geom.coordinates),
    };
  }
  if (geom.type === "LineString") {
    return {
      ...geom,
      coordinates: geom.coordinates.map(transformPosition),
    };
  }
  if (geom.type === "Polygon") {
    return {
      ...geom,
      coordinates: geom.coordinates.map(transformRing),
    };
  }
  if (geom.type === "MultiPoint") {
    return {
      ...geom,
      coordinates: geom.coordinates.map(transformPosition),
    };
  }
  if (geom.type === "MultiLineString") {
    return {
      ...geom,
      coordinates: geom.coordinates.map((ring) => ring.map(transformPosition)),
    };
  }
  if (geom.type === "MultiPolygon") {
    return {
      ...geom,
      coordinates: geom.coordinates.map((poly) =>
        poly.map((ring) => ring.map(transformPosition))
      ),
    };
  }
  return geom;
}

export function transformGeoJsonToWgs84(
  geojson: FeatureCollection,
  fromCrs: string
): FeatureCollection {
  if (fromCrs === WGS84) return geojson;

  return {
    ...geojson,
    features: geojson.features.map((f) => ({
      ...f,
      geometry:
        f.geometry && transformGeometry(f.geometry as Geometry, fromCrs, WGS84),
    })),
  };
}

/** Compute [minLng, minLat, maxLng, maxLat] from GeoJSON */
export function getGeoJsonBounds(geojson: FeatureCollection): [number, number, number, number] | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  let hasAny = false;

  function addCoord(coord: number[]) {
    if (coord.length >= 2) {
      const [x, y] = coord;
      minLng = Math.min(minLng, x);
      minLat = Math.min(minLat, y);
      maxLng = Math.max(maxLng, x);
      maxLat = Math.max(maxLat, y);
      hasAny = true;
    }
  }

  function processCoords(coords: unknown): void {
    if (Array.isArray(coords)) {
      if (typeof coords[0] === "number") {
        addCoord(coords as number[]);
      } else {
        (coords as unknown[]).forEach(processCoords);
      }
    }
  }

  for (const f of geojson.features) {
    if (f.geometry && "coordinates" in f.geometry) {
      processCoords(f.geometry.coordinates);
    }
  }

  if (!hasAny) return null;
  return [minLng, minLat, maxLng, maxLat];
}
