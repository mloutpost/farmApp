"use client";

import { useState, useCallback, useMemo } from "react";
import { useFarmStore } from "@/store/farm-store";
import { useMapStore } from "@/store/map-store";
import { transformGeoJsonToWgs84, CRS_OPTIONS, type CrsOption } from "@/lib/coordinate-transform";
import { polygonAreaSqFt, polygonAcres, lineStringLengthFt, formatArea, formatFt } from "@/lib/geo-calc";
import {
  AREA_KINDS,
  POINT_KINDS,
  LINE_KINDS,
  NODE_KIND_LABELS,
  NODE_KIND_COLORS,
  type NodeKind,
} from "@/types";
import { NodeKindIcon } from "@/components/icons/FarmIcons";
import { IconFolder } from "@/components/icons/FarmIcons";
import type { Feature, FeatureCollection, Geometry } from "geojson";

type GeoType = "Polygon" | "Point" | "LineString";

interface ParsedFeature {
  index: number;
  name: string;
  geoType: GeoType;
  geometry: Geometry;
  kind: NodeKind;
  include: boolean;
  measurement: string;
  properties: Record<string, unknown>;
}

const GEO_TYPE_KINDS: Record<GeoType, NodeKind[]> = {
  Polygon: [...AREA_KINDS],
  Point: [...POINT_KINDS],
  LineString: [...LINE_KINDS],
};

const GEO_TYPE_DEFAULT_KIND: Record<GeoType, NodeKind> = {
  Polygon: "field",
  Point: "barn",
  LineString: "fence",
};

function normalizeGeoType(type: string): GeoType | null {
  if (type === "Polygon" || type === "MultiPolygon") return "Polygon";
  if (type === "Point" || type === "MultiPoint") return "Point";
  if (type === "LineString" || type === "MultiLineString") return "LineString";
  return null;
}

function extractName(f: Feature, index: number): string {
  const props = f.properties ?? {};
  return (
    props.name ??
    props.Name ??
    props.NAME ??
    props.label ??
    props.Label ??
    props.title ??
    props.description ??
    props.layer ??
    props.Layer ??
    props.id ??
    `Feature ${index + 1}`
  ) as string;
}

function measure(geometry: Geometry, crs: CrsOption): string {
  try {
    const geo = crs === "EPSG:4326" ? geometry : transformSingleGeometry(geometry, crs);
    if (geo.type === "Polygon" && geo.coordinates?.[0]) {
      const ring = geo.coordinates[0] as number[][];
      const sqft = polygonAreaSqFt(ring);
      if (sqft >= 43560) return `${polygonAcres(ring).toFixed(2)} acres`;
      return formatArea(sqft);
    }
    if (geo.type === "LineString" && geo.coordinates) {
      return formatFt(lineStringLengthFt(geo.coordinates as number[][]));
    }
  } catch { /* skip */ }
  return "";
}

function transformSingleGeometry(geom: Geometry, fromCrs: string): Geometry {
  const fc: FeatureCollection = {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: geom, properties: {} }],
  };
  const transformed = transformGeoJsonToWgs84(fc, fromCrs);
  return transformed.features[0].geometry!;
}

const ACCEPT = ".geojson,.json,.GeoJSON,.JSON";

export default function GeoJsonNodeImport() {
  const [features, setFeatures] = useState<ParsedFeature[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [sourceCrs, setSourceCrs] = useState<CrsOption>("EPSG:4326");
  const [imported, setImported] = useState(false);

  const addNode = useFarmStore((s) => s.addNode);
  const addGroup = useFarmStore((s) => s.addGroup);
  const setFitToLayerId = useMapStore((s) => s.setFitToLayerId);

  const parseFile = useCallback(async (file: File) => {
    setError(null);
    setFeatures([]);
    setImported(false);
    setFileName(file.name);

    try {
      const text = await file.text();
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text);
      } catch {
        setError("Invalid JSON file.");
        return;
      }

      if (parsed.type === "Feature") {
        parsed = { type: "FeatureCollection", features: [parsed as unknown as Feature] };
      }

      if (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
        setError("Expected a GeoJSON FeatureCollection (or single Feature).");
        return;
      }

      const fc = parsed as unknown as FeatureCollection;
      const coordSample = fc.features[0]?.geometry;
      if (coordSample && "coordinates" in coordSample) {
        const flat = JSON.stringify(coordSample.coordinates);
        const nums = flat.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
        const hasLargeValues = nums.some((n) => Math.abs(n) > 180);
        if (hasLargeValues) {
          setSourceCrs("EPSG:26914");
        } else {
          setSourceCrs("EPSG:4326");
        }
      }

      const result: ParsedFeature[] = [];
      fc.features.forEach((f, i) => {
        if (!f.geometry) return;
        const geoType = normalizeGeoType(f.geometry.type);
        if (!geoType) return;

        result.push({
          index: i,
          name: extractName(f, i),
          geoType,
          geometry: f.geometry,
          kind: GEO_TYPE_DEFAULT_KIND[geoType],
          include: true,
          measurement: "",
          properties: (f.properties ?? {}) as Record<string, unknown>,
        });
      });

      if (result.length === 0) {
        setError("No supported geometry features found (need Polygon, Point, or LineString).");
        return;
      }

      setFeatures(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read file.");
    }
  }, []);

  useMemo(() => {
    if (features.length === 0) return;
    setFeatures((prev) =>
      prev.map((f) => ({
        ...f,
        measurement: measure(f.geometry, sourceCrs),
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceCrs, features.length]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  }, [parseFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
    e.target.value = "";
  }, [parseFile]);

  const toggleAll = useCallback((include: boolean) => {
    setFeatures((prev) => prev.map((f) => ({ ...f, include })));
  }, []);

  const toggleFeature = useCallback((index: number) => {
    setFeatures((prev) =>
      prev.map((f) => (f.index === index ? { ...f, include: !f.include } : f))
    );
  }, []);

  const setFeatureKind = useCallback((index: number, kind: NodeKind) => {
    setFeatures((prev) =>
      prev.map((f) => (f.index === index ? { ...f, kind } : f))
    );
  }, []);

  const setFeatureName = useCallback((index: number, name: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.index === index ? { ...f, name } : f))
    );
  }, []);

  const setBulkKind = useCallback((geoType: GeoType, kind: NodeKind) => {
    setFeatures((prev) =>
      prev.map((f) => (f.geoType === geoType ? { ...f, kind } : f))
    );
  }, []);

  const selectedCount = features.filter((f) => f.include).length;

  const geoTypeCounts = useMemo(() => {
    const counts: Partial<Record<GeoType, number>> = {};
    features.forEach((f) => {
      counts[f.geoType] = (counts[f.geoType] ?? 0) + 1;
    });
    return counts;
  }, [features]);

  const handleImport = useCallback(() => {
    const toImport = features.filter((f) => f.include);
    if (toImport.length === 0) return;

    const groupName = fileName.replace(/\.(geojson|json)$/i, "") || "Import";
    const groupId = toImport.length > 1 ? addGroup(groupName) : undefined;

    const needsTransform = sourceCrs !== "EPSG:4326";

    toImport.forEach((f) => {
      let geometry = f.geometry;
      if (needsTransform) {
        geometry = transformSingleGeometry(geometry, sourceCrs);
      }

      let geoJson: Record<string, unknown>;
      if (geometry.type === "MultiPolygon") {
        const coords = (geometry as any).coordinates[0];
        geoJson = { type: "Polygon", coordinates: coords };
      } else if (geometry.type === "MultiLineString") {
        const coords = (geometry as any).coordinates[0];
        geoJson = { type: "LineString", coordinates: coords };
      } else if (geometry.type === "MultiPoint") {
        const coords = (geometry as any).coordinates[0];
        geoJson = { type: "Point", coordinates: coords };
      } else {
        geoJson = geometry as unknown as Record<string, unknown>;
      }

      addNode(f.kind, f.name, geoJson as any, groupId);
    });

    setImported(true);
  }, [features, sourceCrs, fileName, addNode, addGroup]);

  const handleReset = useCallback(() => {
    setFeatures([]);
    setError(null);
    setFileName("");
    setImported(false);
  }, []);

  if (imported) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-success/10 border border-success/30 px-4 py-3 text-sm text-success flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Imported {selectedCount} feature{selectedCount !== 1 ? "s" : ""} as farm nodes.
        </div>
        <button
          onClick={handleReset}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-surface transition-colors"
        >
          Import another file
        </button>
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <div className="space-y-4">
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent/50 transition-colors"
        >
          <input
            type="file"
            accept={ACCEPT}
            onChange={onInputChange}
            className="hidden"
            id="geojson-node-file"
          />
          <label htmlFor="geojson-node-file" className="cursor-pointer block">
            <span className="block mb-2 text-accent"><IconFolder size={48} /></span>
            <span className="text-accent font-medium">Drop a GeoJSON file here</span>
            <span className="text-text-secondary"> or click to browse</span>
            <span className="block text-xs text-text-muted mt-2">.geojson or .json</span>
          </label>
        </div>
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{fileName}</h3>
          <p className="text-xs text-text-muted mt-0.5">
            {features.length} feature{features.length !== 1 ? "s" : ""} found
            {Object.entries(geoTypeCounts).map(([type, count]) => (
              <span key={type} className="ml-2 inline-flex items-center gap-1 text-text-secondary">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                {count} {type}
              </span>
            ))}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">Source coordinate system</label>
          <select
            value={sourceCrs}
            onChange={(e) => setSourceCrs(e.target.value as CrsOption)}
            className="rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary w-64"
          >
            {CRS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {(Object.entries(geoTypeCounts) as [GeoType, number][]).map(([geoType, count]) => (
          <div key={geoType}>
            <label className="block text-xs text-text-muted mb-1">
              All {count} {geoType}{count !== 1 ? "s" : ""} as
            </label>
            <select
              onChange={(e) => setBulkKind(geoType, e.target.value as NodeKind)}
              className="rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
            >
              {GEO_TYPE_KINDS[geoType].map((k) => (
                <option key={k} value={k}>{NODE_KIND_LABELS[k]}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-bg-surface px-3 py-2 flex items-center gap-3 border-b border-border">
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={features.every((f) => f.include)}
              onChange={(e) => toggleAll(e.target.checked)}
              className="accent-accent"
            />
            Select all
          </label>
          <span className="text-xs text-text-muted ml-auto">
            {selectedCount} of {features.length} selected
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {features.map((f) => (
            <div
              key={f.index}
              className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                f.include ? "bg-bg-elevated" : "bg-bg-elevated/40 opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={f.include}
                onChange={() => toggleFeature(f.index)}
                className="accent-accent shrink-0"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: NODE_KIND_COLORS[f.kind] }}
                />
                <NodeKindIcon kind={f.kind} size={14} />
              </div>
              <input
                type="text"
                value={f.name}
                onChange={(e) => setFeatureName(f.index, e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-text-primary border-none outline-none focus:ring-0 truncate"
              />
              <span className="text-[10px] font-mono text-text-muted shrink-0 w-16 text-right">
                {f.geoType}
              </span>
              {f.measurement && (
                <span className="text-[10px] text-text-secondary shrink-0 w-20 text-right">
                  {f.measurement}
                </span>
              )}
              <select
                value={f.kind}
                onChange={(e) => setFeatureKind(f.index, e.target.value as NodeKind)}
                className="shrink-0 rounded border border-border bg-bg-surface px-2 py-1 text-xs text-text-primary"
              >
                {GEO_TYPE_KINDS[f.geoType].map((k) => (
                  <option key={k} value={k}>{NODE_KIND_LABELS[k]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleImport}
          disabled={selectedCount === 0}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-black hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Import {selectedCount} feature{selectedCount !== 1 ? "s" : ""} as nodes
        </button>
        <button
          onClick={handleReset}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-surface transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
