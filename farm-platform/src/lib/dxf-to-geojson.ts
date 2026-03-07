/**
 * Convert DXF entities to GeoJSON.
 * Supports LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC.
 * DXF uses (x,y,z); we output [x,y] as GeoJSON coordinates.
 * Survey data may need coordinate transform (proj4) - add later.
 */

import DxfParser from "dxf-parser";
import type { GeoJSON } from "geojson";

export interface ImportLogEntry {
  step: string;
  message: string;
  progress?: number;
}

export type ImportLogCallback = (entry: ImportLogEntry) => void;

interface DxfPoint {
  x: number;
  y: number;
  z?: number;
}

interface LineEntity {
  type: string;
  vertices?: DxfPoint[];
}

interface LwpolylineEntity {
  type: string;
  vertices: Array<DxfPoint & { bulge?: number }>;
}

interface PolylineEntity {
  type: string;
  vertices: Array<DxfPoint>;
}

interface CircleEntity {
  type: string;
  center: DxfPoint;
  radius: number;
}

interface ArcEntity {
  type: string;
  center: DxfPoint;
  radius: number;
  startAngle: number;
  endAngle: number;
}

type DxfEntity = LineEntity | LwpolylineEntity | PolylineEntity | CircleEntity | ArcEntity;

function toCoord(p: DxfPoint): [number, number] {
  return [p.x, p.y];
}

function arcToLineString(center: DxfPoint, radius: number, startDeg: number, endDeg: number): [number, number][] {
  const points: [number, number][] = [];
  const steps = Math.max(8, Math.ceil(Math.abs(endDeg - startDeg) / 10));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = (startDeg + t * (endDeg - startDeg)) * (Math.PI / 180);
    points.push([center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle)]);
  }
  return points;
}

function circleToPolygon(center: DxfPoint, radius: number): [number, number][] {
  return arcToLineString(center, radius, 0, 360);
}

export interface DxfToGeoJsonResult {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: GeoJSON;
    properties: { layer: string; entityType: string };
  }>;
  layers: string[];
  /** All layer names defined in the DXF (from LAYER table) */
  allLayers: string[];
  /** Entity type counts: converted vs skipped */
  entityTypeCounts: Record<string, { converted: number; skipped: number }>;
}

export interface DxfToGeoJsonOptions {
  onLog?: ImportLogCallback;
}

function ensureCount(
  counts: Record<string, { converted: number; skipped: number }>,
  type: string
): { converted: number; skipped: number } {
  if (!counts[type]) counts[type] = { converted: 0, skipped: 0 };
  return counts[type];
}

export function dxfToGeoJson(
  dxfText: string,
  options?: DxfToGeoJsonOptions
): DxfToGeoJsonResult {
  const log = options?.onLog ?? (() => {});

  log({ step: "parse", message: "Starting DXF parse...", progress: 0 });

  const parser = new DxfParser();
  let dxf: ReturnType<DxfParser["parseSync"]>;
  try {
    dxf = parser.parseSync(dxfText);
  } catch (e) {
    log({ step: "parse", message: `Parse failed: ${e instanceof Error ? e.message : String(e)}`, progress: 0 });
    throw e;
  }

  log({ step: "parse", message: "DXF parsed successfully", progress: 10 });

  if (!dxf || !dxf.entities) {
    log({ step: "entities", message: "No entities found in DXF", progress: 100 });
    return {
      type: "FeatureCollection",
      features: [],
      layers: [],
      allLayers: [],
      entityTypeCounts: {},
    };
  }

  const entityCount = dxf.entities.length;
  log({ step: "entities", message: `Found ${entityCount} entity(ies) in DXF`, progress: 15 });

  const allLayers: string[] = [];
  const layerTable = dxf.tables?.layer as { layers?: Record<string, { name: string }> } | undefined;
  if (layerTable?.layers) {
    allLayers.push(...Object.keys(layerTable.layers));
    log({ step: "layers", message: `Layers in DXF: ${allLayers.length} — ${allLayers.join(", ") || "(none)"}`, progress: 20 });
  } else {
    log({ step: "layers", message: "No LAYER table in DXF (entities may still have layer property)", progress: 20 });
  }

  const features: DxfToGeoJsonResult["features"] = [];
  const layerSet = new Set<string>();
  const entityTypeCounts: Record<string, { converted: number; skipped: number }> = {};

  const entities = dxf.entities as DxfEntity[];
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const layer = (entity as { layer?: string }).layer ?? "0";
    layerSet.add(layer);
    const props = { layer, entityType: entity.type };

    if (i > 0 && i % 50 === 0) {
      const pct = 20 + Math.floor((60 * i) / entities.length);
      log({ step: "convert", message: `Processing entity ${i + 1}/${entities.length}...`, progress: pct });
    }

    try {
      if (entity.type === "LINE" && "vertices" in entity) {
        const verts = (entity as LineEntity).vertices;
        if (!verts || verts.length < 2) {
          ensureCount(entityTypeCounts, "LINE").skipped++;
          continue;
        }
        const coords = verts.map(toCoord);
        features.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
          properties: props,
        });
        ensureCount(entityTypeCounts, "LINE").converted++;
      } else if (entity.type === "LWPOLYLINE" && "vertices" in entity) {
        const verts = (entity as LwpolylineEntity).vertices;
        if (!verts || verts.length < 2) {
          ensureCount(entityTypeCounts, "LWPOLYLINE").skipped++;
          continue;
        }
        const coords: [number, number][] = [];
        for (let j = 0; j < verts.length; j++) {
          coords.push(toCoord(verts[j]));
        }
        const closed = (entity as { shape?: boolean }).shape ?? false;
        if (closed && coords.length >= 4) {
          features.push({
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [coords] },
            properties: props,
          });
        } else {
          features.push({
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties: props,
          });
        }
        ensureCount(entityTypeCounts, "LWPOLYLINE").converted++;
      } else if (entity.type === "POLYLINE" && "vertices" in entity) {
        const polyVerts = (entity as PolylineEntity).vertices;
        if (!polyVerts || polyVerts.length < 2) {
          ensureCount(entityTypeCounts, "POLYLINE").skipped++;
          continue;
        }
        const polyEntity = entity as PolylineEntity & { shape?: boolean };
        const coords = polyVerts.map(toCoord);
        const closed = polyEntity.shape ?? false;
        if (closed && coords.length >= 4) {
          features.push({
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [coords] },
            properties: props,
          });
        } else {
          features.push({
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties: props,
          });
        }
        ensureCount(entityTypeCounts, "POLYLINE").converted++;
      } else if (entity.type === "CIRCLE" && "center" in entity && "radius" in entity) {
        const ring = circleToPolygon(entity.center, entity.radius);
        features.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [ring] },
          properties: props,
        });
        ensureCount(entityTypeCounts, "CIRCLE").converted++;
      } else if (entity.type === "ARC" && "center" in entity && "radius" in entity) {
        const arc = entity as ArcEntity;
        const ring = arcToLineString(arc.center, arc.radius, arc.startAngle, arc.endAngle);
        features.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: ring },
          properties: props,
        });
        ensureCount(entityTypeCounts, "ARC").converted++;
      } else {
        ensureCount(entityTypeCounts, entity.type).skipped++;
      }
    } catch (e) {
      ensureCount(entityTypeCounts, entity.type).skipped++;
      log({ step: "convert", message: `Skipped ${entity.type}: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  const typeSummary = Object.entries(entityTypeCounts)
    .map(([t, c]) => `${t}: ${c.converted} converted, ${c.skipped} skipped`)
    .join("; ");
  log({
    step: "done",
    message: `Done. ${features.length} features from ${layerSet.size} layer(s). Entity summary: ${typeSummary || "none"}`,
    progress: 100,
  });

  return {
    type: "FeatureCollection",
    features,
    layers: Array.from(layerSet),
    allLayers,
    entityTypeCounts,
  };
}
