"use client";

import { useMemo, useState, useCallback } from "react";
import { useFarmStore } from "@/store/farm-store";
import { searchCrops, CROP_CATEGORIES, getCropById } from "@/lib/crop-catalog";
import type { CropEntry } from "@/lib/crop-catalog";
import { collectCatalogCropIdsFromFarm, entriesFromCatalogIds } from "@/lib/spring-quick-start";
import { exportSpringQuickStartPrint } from "@/lib/pdf-export";

export default function SpringQuickStartPanel() {
  const nodes = useFarmStore((s) => s.nodes);
  const profile = useFarmStore((s) => s.profile);
  const year = profile.currentSeason ?? new Date().getFullYear();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [q, setQ] = useState("");

  const searchResults = useMemo(() => searchCrops(q).slice(0, 50), [q]);

  const selectedEntries = useMemo(
    () => entriesFromCatalogIds([...selectedIds]).sort((a, b) => a.name.localeCompare(b.name)),
    [selectedIds],
  );

  const addFromFarm = useCallback(() => {
    const ids = collectCatalogCropIdsFromFarm(nodes);
    setSelectedIds((prev) => new Set([...prev, ...ids]));
  }, [nodes]);

  const addCrop = useCallback((id: string) => {
    setSelectedIds((prev) => new Set(prev).add(id));
    setQ("");
  }, []);

  const removeCrop = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setSelectedIds(new Set()), []);

  const handlePrint = () => {
    if (selectedEntries.length === 0) return;
    exportSpringQuickStartPrint(selectedEntries, profile, year);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 pb-16">
      <p className="text-sm text-text-secondary mb-6">
        Pick crops you plan to grow this spring. The printable guide uses your farm profile (zone, last frost) plus catalog
        data: timing, spacing, depth, companions, a general nutrient checklist, yield references, and pest/disease scouting notes.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={addFromFarm}
          className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface transition-colors"
        >
          Add crops from farm
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={selectedIds.size === 0}
          className="rounded-md border border-border px-3 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
        >
          Clear selection
        </button>
        <button
          type="button"
          onClick={handlePrint}
          disabled={selectedEntries.length === 0}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-hover transition-colors disabled:opacity-40"
        >
          Open printable PDF
        </button>
      </div>

      <div className="rounded-xl border border-border bg-bg-elevated p-4 mb-6">
        <label className="block text-xs font-medium text-text-secondary mb-2">Search catalog to add</label>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a crop name…"
          autoComplete="off"
          className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted mb-2"
        />
        {q.trim() && (
          <ul className="max-h-48 overflow-y-auto rounded-md border border-border/60 divide-y divide-border/40">
            {searchResults.map((c: CropEntry) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => addCrop(c.id)}
                  disabled={selectedIds.has(c.id)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-bg-surface disabled:opacity-50"
                >
                  <span className="font-medium text-text-primary">{c.name}</span>
                  <span className="text-text-muted ml-2">{CROP_CATEGORIES[c.category]}</span>
                </button>
              </li>
            ))}
            {searchResults.length === 0 && (
              <li className="px-3 py-4 text-xs text-text-muted text-center">No matches</li>
            )}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-bg-elevated p-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3">
          Selected ({selectedIds.size})
        </h2>
        {selectedEntries.length === 0 ? (
          <p className="text-xs text-text-muted">No crops yet — search above or load from your farm.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {selectedEntries.map((c) => (
              <li
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-surface pl-3 pr-1 py-1 text-xs"
              >
                <span className="text-text-primary">{c.name}</span>
                <button
                  type="button"
                  onClick={() => removeCrop(c.id)}
                  className="rounded-full p-1 text-text-muted hover:text-red-400 hover:bg-red-500/10"
                  aria-label={`Remove ${c.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
