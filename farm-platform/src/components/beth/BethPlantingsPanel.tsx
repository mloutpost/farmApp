"use client";

import { useMemo, useState } from "react";
import { useFarmStore } from "@/store/farm-store";
import CropPicker from "@/components/detail/CropPicker";
import BethCropSymbol from "@/components/beth/BethCropSymbol";
import type { CropEntry } from "@/lib/crop-catalog";
import type { FarmNode, FarmProfile, GardenData, Planting } from "@/types";
import {
  flattenPlantingsFromNodes,
  type FlatPlantingRef,
  updatePlantingInStore,
  removePlantingInStore,
  addPlantingToGardenBed,
  addPlantingToBedNode,
} from "@/lib/beth-plantings";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deriveStatus(datePlanted: string | undefined, currentStatus: Planting["status"]): Planting["status"] {
  if (currentStatus === "harvested" || currentStatus === "failed") return currentStatus;
  if (!datePlanted) return "planned";
  const today = new Date().toISOString().slice(0, 10);
  if (datePlanted > today) return "planned";
  return currentStatus === "growing" ? "growing" : "planted";
}

function computeExpectedHarvest(datePlanted: string | undefined, dtm: number | undefined): string | undefined {
  if (!datePlanted || !dtm) return undefined;
  const d = new Date(datePlanted + "T12:00:00");
  d.setDate(d.getDate() + dtm);
  return d.toISOString().slice(0, 10);
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function suggestPlantingDate(entry: CropEntry, profile: FarmProfile): string | undefined {
  const lastFrost = profile.lastFrostSpring;
  if (!lastFrost) return undefined;
  const year = new Date().getFullYear();
  const frostDate = lastFrost.length <= 5 ? `${year}-${lastFrost}` : lastFrost;
  if (entry.sowMethod === "transplant" && entry.sowIndoorsWeeks) {
    return addDaysToDate(frostDate, 14);
  }
  if (entry.directSowFrostWeeks != null) {
    return addDaysToDate(frostDate, -(entry.directSowFrostWeeks * 7));
  }
  return addDaysToDate(frostDate, 14);
}

type AddTarget =
  | { kind: "garden-bed"; gardenId: string; bedId: string; label: string }
  | { kind: "bed-node"; bedNodeId: string; label: string };

function buildAddTargets(nodes: FarmNode[]): AddTarget[] {
  const out: AddTarget[] = [];
  for (const n of nodes) {
    if (n.kind === "garden") {
      for (const b of (n.data as GardenData).beds ?? []) {
        out.push({
          kind: "garden-bed",
          gardenId: n.id,
          bedId: b.id,
          label: `${n.name} — ${b.name}`,
        });
      }
    }
    if (n.kind === "bed") {
      out.push({ kind: "bed-node", bedNodeId: n.id, label: n.name });
    }
  }
  return out;
}

export default function BethPlantingsPanel() {
  const nodes = useFarmStore((s) => s.nodes);
  const profile = useFarmStore((s) => s.profile);
  const updateNodeData = useFarmStore((s) => s.updateNodeData);

  const rows = useMemo(() => flattenPlantingsFromNodes(nodes), [nodes]);
  const addTargets = useMemo(() => buildAddTargets(nodes), [nodes]);
  const [addTargetKey, setAddTargetKey] = useState<string>("");

  const setAddTargetFromKey = (key: string) => {
    setAddTargetKey(key);
  };

  const handleAdd = () => {
    if (!addTargetKey) return;
    const planting: Planting = {
      id: uid(),
      crop: "",
      status: "planned",
    };
    const t = addTargets.find((x) => {
      if (x.kind === "garden-bed") return `${x.gardenId}:${x.bedId}` === addTargetKey;
      return x.bedNodeId === addTargetKey;
    });
    if (!t) return;
    if (t.kind === "garden-bed") {
      addPlantingToGardenBed(t.gardenId, t.bedId, planting, nodes, updateNodeData);
    } else {
      addPlantingToBedNode(t.bedNodeId, planting, nodes, updateNodeData);
    }
  };

  const onUpdate = (ref: FlatPlantingRef, p: Planting) => {
    updatePlantingInStore(nodes, ref, p, updateNodeData);
  };

  const onRemove = (ref: FlatPlantingRef) => {
    removePlantingInStore(nodes, ref, updateNodeData);
  };

  const handleCropSelect = (ref: FlatPlantingRef, planting: Planting, crop: string, entry: CropEntry | null) => {
    const updates: Partial<Planting> = { crop };
    if (entry) {
      updates.catalogId = entry.id;
      updates.daysToMaturity = entry.dtmMin;
      updates.spacing = `${entry.spacingIn}" apart`;
      updates.rowSpacingIn = entry.rowSpacingIn;
      updates.plantingDepthIn = entry.plantingDepthIn;
      updates.sowMethod = entry.sowMethod === "both" ? undefined : entry.sowMethod;
      if (!planting.datePlanted) {
        const suggested = suggestPlantingDate(entry, profile);
        if (suggested) {
          updates.datePlanted = suggested;
          updates.status = deriveStatus(suggested, planting.status);
          updates.dateExpectedHarvest = computeExpectedHarvest(suggested, entry.dtmMin);
        }
      }
    } else {
      updates.catalogId = undefined;
    }
    const merged = { ...planting, ...updates };
    if (!updates.dateExpectedHarvest) {
      merged.dateExpectedHarvest = computeExpectedHarvest(merged.datePlanted, merged.daysToMaturity);
    }
    onUpdate(ref, merged);
  };

  const field =
    "rounded-md border border-amber-900/30 bg-white/95 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 shadow-sm outline-none ring-amber-900/15 focus:ring-2 font-[family-name:var(--font-beth-serif,ui-serif,Georgia,serif)]";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-amber-900/25 border-dashed bg-[#faf0e0] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
        <h3 className="mb-1 font-[family-name:var(--font-beth-script)] text-2xl text-amber-950">
          Add planting
        </h3>
        <p className="mb-4 text-sm text-stone-700 font-[family-name:var(--font-beth-serif,ui-serif,Georgia,serif)]">
          Pick a bed, then add a row. Search crops by name below each row.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="block font-[family-name:var(--font-beth-script)] text-lg text-amber-950">
              Where
            </label>
            <select
              value={addTargetKey}
              onChange={(e) => setAddTargetFromKey(e.target.value)}
              className={`mt-1 w-full ${field}`}
            >
              <option value="">Select garden bed or bed…</option>
              {addTargets.map((t) => (
                <option
                  key={t.kind === "garden-bed" ? `${t.gardenId}:${t.bedId}` : t.bedNodeId}
                  value={t.kind === "garden-bed" ? `${t.gardenId}:${t.bedId}` : t.bedNodeId}
                >
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!addTargetKey}
            className="min-h-[44px] rounded-lg border-2 border-amber-950/80 bg-amber-900 px-5 py-2 font-[family-name:var(--font-beth-script)] text-xl text-amber-50 shadow-md hover:bg-amber-950 disabled:opacity-40"
          >
            Add row
          </button>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="rounded-lg border border-dashed border-amber-900/30 px-4 py-6 text-center font-[family-name:var(--font-beth-serif,ui-serif,Georgia,serif)] text-stone-800">
          No plantings yet. Add beds in a garden or create a bed node, then add plantings here.
        </p>
      )}

      <ul className="space-y-5">
        {rows.map((ref) => {
          const p = ref.planting;
          const ctx =
            ref.source === "garden-bed"
              ? `${ref.nodeName} · ${ref.bedName ?? "Bed"}`
              : ref.nodeName;
          const displayName = (p.crop || "").trim() || "Choose a crop…";
          return (
            <li
              key={`${ref.nodeId}-${ref.bedId ?? "b"}-${p.id}`}
              className="rounded-xl border-2 border-amber-900/20 bg-[#fffdf8] p-4 shadow-[2px_3px_0_rgba(120,53,15,0.12)]"
            >
              <p className="mb-3 font-[family-name:var(--font-beth-script)] text-xl text-amber-950/90">
                {ctx}
              </p>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <BethCropSymbol catalogId={p.catalogId} cropName={p.crop} size="lg" />

                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="font-[family-name:var(--font-beth-serif,ui-serif,Georgia,serif)] text-lg font-semibold text-stone-900 leading-snug">
                      {displayName}
                    </p>
                    <p className="text-xs text-stone-600">Crop — tap to search or change</p>
                  </div>

                  <CropPicker
                    variant="paper"
                    value={p.crop}
                    catalogId={p.catalogId}
                    onChange={(crop, entry) => handleCropSelect(ref, p, crop, entry)}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="font-[family-name:var(--font-beth-script)] text-lg text-amber-950 whitespace-nowrap">
                      Variety
                    </label>
                    <input
                      value={p.variety ?? ""}
                      onChange={(e) => onUpdate(ref, { ...p, variety: e.target.value || undefined })}
                      placeholder="e.g. heirloom"
                      className={`min-w-[8rem] flex-1 ${field}`}
                    />
                    <label className="sr-only" htmlFor={`status-${p.id}`}>
                      Status
                    </label>
                    <select
                      id={`status-${p.id}`}
                      value={p.status}
                      onChange={(e) =>
                        onUpdate(ref, {
                          ...p,
                          status: e.target.value as Planting["status"],
                        })
                      }
                      className={`${field} min-w-[9rem]`}
                    >
                      <option value="planned">Planned</option>
                      <option value="planted">Planted</option>
                      <option value="growing">Growing</option>
                      <option value="harvested">Harvested</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex flex-col gap-1 font-[family-name:var(--font-beth-serif,ui-serif,Georgia,serif)] text-stone-800">
                      <span className="font-[family-name:var(--font-beth-script)] text-lg text-amber-950">
                        Planted
                      </span>
                      <input
                        type="date"
                        value={p.datePlanted ?? ""}
                        onChange={(e) => {
                          const datePlanted = e.target.value || undefined;
                          const status = deriveStatus(datePlanted, p.status);
                          const dateExpectedHarvest = computeExpectedHarvest(datePlanted, p.daysToMaturity);
                          onUpdate(ref, { ...p, datePlanted, status, dateExpectedHarvest });
                        }}
                        className={field}
                      />
                    </label>
                    <label className="flex flex-col gap-1 font-[family-name:var(--font-beth-serif,ui-serif,Georgia,serif)] text-stone-800">
                      <span className="font-[family-name:var(--font-beth-script)] text-lg text-amber-950">
                        Harvest
                      </span>
                      <input
                        type="date"
                        value={p.dateExpectedHarvest ?? ""}
                        onChange={(e) =>
                          onUpdate(ref, { ...p, dateExpectedHarvest: e.target.value || undefined })
                        }
                        className={field}
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(ref)}
                    className="font-[family-name:var(--font-beth-script)] text-lg text-amber-900/80 underline decoration-amber-900/30 hover:text-red-900 hover:decoration-red-800"
                  >
                    Remove planting
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
