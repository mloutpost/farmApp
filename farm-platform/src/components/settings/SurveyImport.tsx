"use client";

import { useState, useCallback } from "react";
import { dxfToGeoJson, type DxfToGeoJsonResult, type ImportLogEntry } from "@/lib/dxf-to-geojson";
import { transformGeoJsonToWgs84, CRS_OPTIONS, type CrsOption } from "@/lib/coordinate-transform";
import { useMapStore } from "@/store/map-store";
import type { MapLayer } from "@/types";
import type { FeatureCollection } from "geojson";

const DXF_ACCEPT = ".dxf,.DXF";
const GEOJSON_ACCEPT = ".geojson,.json,.GeoJSON,.JSON";

function isBinaryDxf(buffer: ArrayBuffer): boolean {
  const arr = new Uint8Array(buffer.slice(0, 22));
  const str = String.fromCharCode(...arr);
  return str.startsWith("AutoCAD Binary DXF");
}

function parseGeoJson(text: string): DxfToGeoJsonResult {
  let parsed: FeatureCollection;
  try {
    parsed = JSON.parse(text) as FeatureCollection;
  } catch {
    throw new Error("Invalid JSON");
  }
  if (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    throw new Error("Invalid GeoJSON: must be a FeatureCollection with features array");
  }
  const layers = new Set<string>();
  const features = parsed.features
    .filter((f) => f.geometry != null)
    .map((f) => {
      const layer = f.properties?.layer ?? f.properties?.name ?? "0";
      layers.add(String(layer));
      return {
        type: "Feature" as const,
        geometry: f.geometry!,
        properties: {
          layer: String(layer),
          entityType: f.geometry?.type ?? "unknown",
        },
      };
    });
  return {
    type: "FeatureCollection",
    features,
    layers: Array.from(layers),
    allLayers: Array.from(layers),
    entityTypeCounts: {},
  };
}

export default function SurveyImport() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DxfToGeoJsonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [layerName, setLayerName] = useState("");
  const [sourceCrs, setSourceCrs] = useState<CrsOption>("EPSG:26914");
  const [importLog, setImportLog] = useState<ImportLogEntry[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const setLayers = useMapStore((s) => s.setLayers);
  const setFitToLayerId = useMapStore((s) => s.setFitToLayerId);
  const setLastImport = useMapStore((s) => s.setLastImport);
  const layers = useMapStore((s) => s.layers);

  const addLog = useCallback((entry: ImportLogEntry) => {
    setImportLog((prev) => [...prev, entry]);
    if (entry.progress !== undefined) setImportProgress(entry.progress);
  }, []);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    setResult(null);
    setImportLog([]);
    setImportProgress(0);
    setLoading(true);
    setLayerName(f.name.replace(/\.(dxf|geojson|json)$/i, "") || "Survey");

    try {
      const ext = f.name.toLowerCase();
      const isGeoJson = ext.endsWith(".geojson") || ext.endsWith(".json");

      if (isGeoJson) {
        addLog({ step: "read", message: `Reading GeoJSON file: ${f.name}`, progress: 10 });
        const text = await f.text();
        addLog({ step: "parse", message: "Parsing GeoJSON...", progress: 30 });
        const geojson = parseGeoJson(text);
        addLog({ step: "done", message: `Parsed ${geojson.features.length} features from ${geojson.layers.length} layer(s)`, progress: 100 });
        setResult(geojson);
        setSourceCrs("EPSG:4326");
      } else if (ext.endsWith(".dxf")) {
        addLog({ step: "read", message: `Reading DXF file: ${f.name}`, progress: 5 });
        const buffer = await f.arrayBuffer();
        if (isBinaryDxf(buffer)) {
          addLog({ step: "error", message: "Binary DXF detected", progress: 0 });
          setError(
            "Binary DXF detected. Please export as ASCII DXF from your CAD software (e.g. AutoCAD: Save As → DXF → ASCII). Or use GeoJSON from QGIS instead."
          );
          setLoading(false);
          return;
        }
        const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
        addLog({ step: "decode", message: `Decoded ${(text.length / 1024).toFixed(1)} KB of text`, progress: 8 });
        const geojson = dxfToGeoJson(text, {
          onLog: addLog,
        });
        setResult(geojson);
        setSourceCrs("EPSG:26914");
        if (geojson.features.length === 0) {
          setError(
            "No supported geometry found in DXF. The file may use unsupported entity types, or try exporting as GeoJSON from QGIS."
          );
        }
      } else {
        addLog({ step: "error", message: "Unsupported format" });
        setError("Unsupported format. Use .dxf, .geojson, or .json");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to parse file";
      addLog({ step: "error", message: msg });
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
      e.target.value = "";
    },
    [handleFile]
  );

  const addToMap = useCallback(() => {
    if (!result || result.features.length === 0) return;
    const name = layerName.trim() || "Survey Import";
    addLog({ step: "transform", message: `Transforming ${result.features.length} features from ${sourceCrs} to WGS84...`, progress: 50 });
    const geojson = transformGeoJsonToWgs84(result as FeatureCollection, sourceCrs);
    addLog({ step: "add", message: `Adding layer "${name}" to map...`, progress: 90 });
    const layerId = `survey-${Date.now()}`;
    const newLayer: MapLayer = {
      id: layerId,
      farmId: "farm-1",
      name,
      type: "boundary",
      geojson,
      visible: true,
      opacity: 0.8,
      createdAt: new Date(),
    };
    setLayers([...layers, newLayer]);
    setFitToLayerId(layerId);
    setLastImport({ filename: file?.name ?? "Survey", success: true });
    addLog({ step: "done", message: `Layer "${name}" added. Map will fit to bounds.`, progress: 100 });
    setResult(null);
    setFile(null);
    setLayerName("");
  }, [result, layerName, sourceCrs, layers, setLayers, setFitToLayerId, setLastImport, addLog, file]);

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="rounded-lg border border-border bg-bg-elevated p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Survey import (GeoJSON / DXF)
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          <strong>GeoJSON</strong> (recommended): Export from QGIS as GeoJSON (WGS84).
          <br />
          <strong>DXF</strong>: ASCII DXF only. Select your survey&apos;s coordinate system below – DXF typically uses UTM or State Plane, not lat/lng.
        </p>

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent/50 transition-colors"
        >
          <input
            type="file"
            accept={`${DXF_ACCEPT},${GEOJSON_ACCEPT}`}
            onChange={onInputChange}
            className="hidden"
            id="survey-file"
          />
          <label htmlFor="survey-file" className="cursor-pointer block">
            {loading ? (
              <span className="text-text-secondary">Parsing...</span>
            ) : (
              <>
                <span className="text-4xl block mb-2">📁</span>
                <span className="text-accent font-medium">Drop GeoJSON or DXF here</span>
                <span className="text-text-secondary"> or click to browse</span>
              </>
            )}
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {(loading || importLog.length > 0) && (
          <div className="mt-4 space-y-3">
            {loading && (
              <div className="h-2 rounded-full bg-bg-surface overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            )}
            <details className="rounded-lg border border-border bg-bg-surface">
              <summary className="px-4 py-2 text-sm font-medium text-text-primary cursor-pointer select-none">
                Import log ({importLog.length} entries)
              </summary>
              <div className="max-h-48 overflow-y-auto px-4 py-2 font-mono text-xs text-text-secondary space-y-1 border-t border-border">
                {importLog.map((entry, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-text-muted shrink-0">[{entry.step}]</span>
                    <span>{entry.message}</span>
                    {entry.progress !== undefined && (
                      <span className="text-accent shrink-0">{entry.progress}%</span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-lg border border-border bg-bg-surface p-4 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Layers found</h3>
            {result.allLayers.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {result.allLayers.map((name) => (
                  <li
                    key={name}
                    className="rounded-md bg-bg-elevated px-2 py-1 text-xs font-medium text-text-primary"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">
                {result.layers.length > 0
                  ? `From entities: ${result.layers.join(", ")}`
                  : "No layers detected"}
              </p>
            )}
            {Object.keys(result.entityTypeCounts).length > 0 && (
              <div className="text-xs text-text-secondary">
                <span className="font-medium">Entity summary: </span>
                {Object.entries(result.entityTypeCounts)
                  .map(([t, c]) => `${t}: ${c.converted}✓ ${c.skipped}✗`)
                  .join(" · ")}
              </div>
            )}
          </div>
        )}

        {result && result.features.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
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
              <input
                type="text"
                value={layerName}
                onChange={(e) => setLayerName(e.target.value)}
                placeholder="Layer name"
                className="rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted w-48"
              />
              <button
                onClick={addToMap}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-hover transition-colors"
              >
                Add to map
              </button>
            </div>
            <div className="text-sm text-text-secondary">
              {result.features.length} feature{result.features.length !== 1 ? "s" : ""}
              {result.layers.length > 0 && ` across ${result.layers.length} layer(s)`}
            </div>
          </div>
        )}
      </section>

      {layers.some((l) => l.id.startsWith("survey-")) && (
        <section className="rounded-lg border border-border bg-bg-elevated p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Imported survey layers
          </h2>
          <ul className="space-y-2">
            {layers
              .filter((l) => l.id.startsWith("survey-"))
              .map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between text-sm text-text-secondary"
                >
                  {l.name}
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
