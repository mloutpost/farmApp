"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  CROP_CATALOG,
  CROP_CATEGORIES,
  searchCrops,
  getCropById,
  type CropEntry,
  type CropCategory,
} from "@/lib/crop-catalog";
import { groupCompanionsByBenefit } from "@/lib/companion-sort";

interface CropPickerProps {
  value: string;
  catalogId?: string;
  categories?: CropCategory[];
  placeholder?: string;
  onChange: (crop: string, entry: CropEntry | null) => void;
}

export default function CropPicker({ value, catalogId, categories, placeholder, onChange }: CropPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /** Shown when closed; also seeds search when opening (avoids empty query + Enter selecting first catalog item) */
  const resolvedLabel = useMemo(() => {
    if (value?.trim()) return value.trim();
    if (catalogId) return getCropById(catalogId)?.name ?? "";
    return "";
  }, [value, catalogId]);

  const results = useMemo(() => {
    const all = searchCrops(query);
    if (!categories || categories.length === 0) return all;
    return all.filter((c) => categories.includes(c.category));
  }, [query, categories]);

  const grouped = useMemo(() => {
    const map = new Map<CropCategory, CropEntry[]>();
    for (const c of results) {
      const list = map.get(c.category) ?? [];
      list.push(c);
      map.set(c.category, list);
    }
    return map;
  }, [results]);

  const flatList = useMemo(() => results, [results]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  const handleSelect = useCallback(
    (entry: CropEntry) => {
      onChange(entry.name, entry);
      setQuery("");
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setQuery(resolvedLabel);
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIdx((prev) => Math.min(prev + 1, flatList.length - 1));
        itemRefs.current[highlightIdx + 1]?.scrollIntoView({ block: "nearest" });
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIdx((prev) => Math.max(prev - 1, 0));
        itemRefs.current[highlightIdx - 1]?.scrollIntoView({ block: "nearest" });
        break;
      case "Enter":
        e.preventDefault();
        // Empty query must not commit the highlighted row (was easy to trigger while tabbing / navigating).
        if (!query.trim()) {
          setOpen(false);
          return;
        }
        if (flatList[highlightIdx]) handleSelect(flatList[highlightIdx]);
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  const dtmLabel = (entry: CropEntry) => {
    if (entry.category === "tree" && entry.dtmMin >= 365) {
      const yMin = Math.round(entry.dtmMin / 365);
      const yMax = Math.round(entry.dtmMax / 365);
      return `${yMin}-${yMax}yr`;
    }
    return `${entry.dtmMin}-${entry.dtmMax}d`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        value={open ? query : resolvedLabel}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery(resolvedLabel);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Search crops..."}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none min-w-0"
      />

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-80 max-h-80 overflow-y-auto rounded-lg border border-border bg-bg-elevated shadow-xl">
          {flatList.length === 0 && (
            <div className="px-3 py-4 text-xs text-text-muted text-center">
              No crops found. Type a name to search or enter a custom crop.
            </div>
          )}

          {Array.from(grouped.entries()).map(([cat, entries]) => (
            <div key={cat}>
              <div className="sticky top-0 bg-bg-elevated/95 backdrop-blur px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border/50">
                {CROP_CATEGORIES[cat]}
              </div>
              {entries.map((entry) => {
                const idx = flatList.indexOf(entry);
                return (
                  <button
                    key={entry.id}
                    ref={(el) => { itemRefs.current[idx] = el; }}
                    onClick={() => handleSelect(entry)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                      idx === highlightIdx
                        ? "bg-accent/10 text-accent"
                        : "text-text-primary hover:bg-bg-surface"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{entry.name}</div>
                      {entry.botanical && (
                        <div className="text-[10px] text-text-muted italic truncate">{entry.botanical}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-text-secondary">{dtmLabel(entry)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        entry.frostTolerance === "hardy"
                          ? "bg-blue-500/20 text-blue-400"
                          : entry.frostTolerance === "semi-hardy"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {entry.frostTolerance}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          {query.trim() && !flatList.some((c) => c.name.toLowerCase() === query.toLowerCase()) && (
            <button
              onClick={() => {
                onChange(query.trim(), null);
                setQuery("");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 text-xs text-accent hover:bg-bg-surface border-t border-border/50"
            >
              Use custom: &quot;{query.trim()}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function CropInfoCard({ catalogId }: { catalogId: string }) {
  const [expanded, setExpanded] = useState(false);
  const entry = getCropById(catalogId);
  if (!entry) return null;

  const isTree = entry.category === "tree";
  const isRowCrop = entry.category === "row-crop";
  const isForage = entry.category === "forage";
  const companionGroups = groupCompanionsByBenefit(entry.companions);

  return (
    <div className="rounded-md border border-accent/20 bg-accent/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-semibold text-accent uppercase">
            {isTree ? "Tree Guide" : isForage ? "Forage Guide" : isRowCrop ? "Crop Guide" : "Crop Guide"}
          </span>
          <span className="text-[10px] text-text-secondary truncate">{entry.name}</span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`shrink-0 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-accent/10">
          <div className="grid grid-cols-3 gap-2 pt-2">
            {isTree && entry.yearsToBearing != null && (
              <InfoCell label="Years to Bearing" value={`${entry.yearsToBearing} years`} />
            )}
            {isTree && entry.productiveLifeYears != null && (
              <InfoCell label="Productive Life" value={`${entry.productiveLifeYears} years`} />
            )}
            {isTree && entry.treesPerAcre != null && (
              <InfoCell label="Trees / Acre" value={`${entry.treesPerAcre}`} />
            )}
            {!isTree && (
              <InfoCell label="DTM" value={`${entry.dtmMin}-${entry.dtmMax} days`} />
            )}
            {!isTree && entry.plantingDepthIn > 0 && (
              <InfoCell label="Depth" value={`${entry.plantingDepthIn}"`} />
            )}
            {!isTree && !isForage && entry.spacingIn > 0 && (
              <InfoCell label="Spacing" value={`${entry.spacingIn}" apart`} />
            )}
            {!isForage && entry.rowSpacingIn > 0 && (
              <InfoCell label="Row Spacing" value={`${entry.rowSpacingIn}"`} />
            )}
            <InfoCell label="Sun" value={entry.sun.replace("-", "/")} />
            <InfoCell label="Water" value={entry.water} />
            <InfoCell label="Frost" value={entry.frostTolerance} />
            <InfoCell label="Zones" value={`${entry.zoneMin}-${entry.zoneMax}`} />
            {!isTree && <InfoCell label="Sow" value={entry.sowMethod} />}
            {entry.sowIndoorsWeeks != null && entry.sowIndoorsWeeks > 0 && (
              <InfoCell label="Start Indoors" value={`${entry.sowIndoorsWeeks} wks before frost`} />
            )}
            {entry.directSowFrostWeeks != null && (
              <InfoCell
                label="Direct Sow"
                value={
                  entry.directSowFrostWeeks < 0
                    ? `${Math.abs(entry.directSowFrostWeeks)} wks before frost`
                    : `${entry.directSowFrostWeeks} wks after frost`
                }
              />
            )}
            <InfoCell label="Soil pH" value={`${entry.soilPhMin}-${entry.soilPhMax}`} />
            {entry.seedingRate && <InfoCell label="Seeding Rate" value={entry.seedingRate} />}
            {isForage && entry.cuttingsPerYear != null && (
              <InfoCell label="Cuttings / Year" value={`${entry.cuttingsPerYear}`} />
            )}
            {isForage && entry.productiveLifeYears != null && (
              <InfoCell label="Stand Life" value={`${entry.productiveLifeYears} years`} />
            )}
          </div>

          {(entry.yieldPerPlant || entry.yieldPer10ft || entry.yieldPerAcre) && (
            <div className="grid grid-cols-2 gap-2">
              {entry.yieldPerPlant && (
                <InfoCell label={isTree ? "Yield / Tree" : "Yield / Plant"} value={entry.yieldPerPlant} />
              )}
              {entry.yieldPer10ft && <InfoCell label="Yield / 10ft Row" value={entry.yieldPer10ft} />}
              {entry.yieldPerAcre && <InfoCell label="Yield / Acre" value={entry.yieldPerAcre} />}
            </div>
          )}

          <div className="text-[10px] text-text-secondary">{entry.waterNotes}</div>

          {isTree && entry.pollinationNotes && (
            <div>
              <div className="text-[10px] font-medium text-blue-400 mb-0.5">Pollination</div>
              <div className="text-[10px] text-text-secondary">{entry.pollinationNotes}</div>
            </div>
          )}

          {entry.companions.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-medium text-green-400">
                {isRowCrop || isForage ? "Good rotation partners" : "Good companions"}
              </div>
              {companionGroups.pest.length > 0 && (
                <div>
                  <div className="text-[10px] font-medium text-emerald-400/90 mb-0.5">Pest management</div>
                  <div className="text-[10px] text-text-secondary">{companionGroups.pest.join(", ")}</div>
                </div>
              )}
              {companionGroups.nutrient.length > 0 && (
                <div>
                  <div className="text-[10px] font-medium text-teal-400/90 mb-0.5">Nutrient & soil restoration</div>
                  <div className="text-[10px] text-text-secondary">{companionGroups.nutrient.join(", ")}</div>
                </div>
              )}
              {companionGroups.general.length > 0 && (
                <div>
                  <div className="text-[10px] font-medium text-green-400/80 mb-0.5">Other companions</div>
                  <div className="text-[10px] text-text-secondary">{companionGroups.general.join(", ")}</div>
                </div>
              )}
            </div>
          )}

          {entry.avoid.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-red-400 mb-0.5">
                {isRowCrop || isForage ? "Avoid" : "Avoid planting near"}
              </div>
              <div className="text-[10px] text-text-secondary">{entry.avoid.join(", ")}</div>
            </div>
          )}

          {entry.pests.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-yellow-400 mb-0.5">Common pests</div>
              <div className="text-[10px] text-text-secondary">{entry.pests.join(", ")}</div>
            </div>
          )}

          {entry.diseases.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-orange-400 mb-0.5">Common diseases</div>
              <div className="text-[10px] text-text-secondary">{entry.diseases.join(", ")}</div>
            </div>
          )}

          <div className="text-[10px] text-text-muted italic">{entry.notes}</div>
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="text-[11px] text-text-primary font-medium">{value}</div>
    </div>
  );
}
