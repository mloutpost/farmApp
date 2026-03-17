"use client";

import { useCallback } from "react";
import { useDemStore } from "@/store/dem-store";
import { loadDemFromFile } from "@/lib/dem-elevation";

const DEM_ACCEPT = ".tif,.tiff,.geotiff,.TIF,.TIFF";

export default function DemImport({ compact = false }: { compact?: boolean }) {
  const { setRaster, setLoading, setError, setHillshadeVisible: setVisible, loading, error } = useDemStore();

  const handleFile = useCallback(async (f: File) => {
    setLoading(true);
    setError(null);
    try {
      const raster = await loadDemFromFile(f);
      setRaster(raster);
      setVisible(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load DEM";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [setRaster, setLoading, setError, setVisible]);

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

  if (compact) {
    return (
      <div>
        <input
          type="file"
          accept={DEM_ACCEPT}
          onChange={onInputChange}
          className="hidden"
          id="dem-file-compact"
        />
        <label
          htmlFor="dem-file-compact"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-surface hover:text-text-primary transition-colors cursor-pointer"
        >
          {loading ? (
            <span>Loading...</span>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import GeoTIFF (.tif)
            </>
          )}
        </label>
        {error && <p className="text-[10px] text-danger mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">
        Export from QGIS as GeoTIFF (WGS84). Recommended: clip to your farm area to keep file under 20 MB.
      </p>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent/50 transition-colors"
      >
        <input
          type="file"
          accept={DEM_ACCEPT}
          onChange={onInputChange}
          className="hidden"
          id="dem-file"
        />
        <label htmlFor="dem-file" className="cursor-pointer block">
          {loading ? (
            <span className="text-text-secondary">Loading DEM...</span>
          ) : (
            <>
              <span className="block mb-2 text-accent">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </span>
              <span className="text-accent font-medium">Drop GeoTIFF here</span>
              <span className="text-text-secondary"> or click to browse</span>
            </>
          )}
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
