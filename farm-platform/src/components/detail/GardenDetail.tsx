"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFarmStore } from "@/store/farm-store";
import { useMapStore } from "@/store/map-store";
import FrostPlanting from "./FrostPlanting";
import CropPicker, { CropInfoCard } from "./CropPicker";
import { polygonSideLengths, polygonPerimeterFt, formatFt, formatArea } from "@/lib/geo-calc";
import type { CropEntry } from "@/lib/crop-catalog";
import type { FarmNode, GardenData, BedNodeData, Bed, Planting } from "@/types";
import { NODE_KIND_COLORS } from "@/types";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-500/20 text-blue-400",
  planted: "bg-yellow-500/20 text-yellow-400",
  growing: "bg-green-500/20 text-green-400",
  harvested: "bg-accent/20 text-accent",
  failed: "bg-danger/20 text-danger",
};

function PlantingRow({ planting, onUpdate, onRemove }: {
  planting: Planting;
  onUpdate: (p: Planting) => void;
  onRemove: () => void;
}) {
  const handleCropSelect = (crop: string, entry: CropEntry | null) => {
    const updates: Partial<Planting> = { crop };
    if (entry) {
      updates.catalogId = entry.id;
      updates.daysToMaturity = entry.dtmMin;
      updates.spacing = `${entry.spacingIn}" apart`;
      updates.rowSpacingIn = entry.rowSpacingIn;
      updates.plantingDepthIn = entry.plantingDepthIn;
      updates.sowMethod = entry.sowMethod === "both" ? undefined : entry.sowMethod;
    } else {
      updates.catalogId = undefined;
    }
    onUpdate({ ...planting, ...updates });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 rounded-md bg-bg px-3 py-2">
        <div className="flex-1 min-w-0">
          <CropPicker
            value={planting.crop}
            catalogId={planting.catalogId}
            onChange={handleCropSelect}
          />
        </div>
        <input
          value={planting.variety ?? ""}
          onChange={(e) => onUpdate({ ...planting, variety: e.target.value })}
          placeholder="Variety"
          className="w-24 bg-transparent text-xs text-text-secondary placeholder:text-text-muted outline-none"
        />
        <input
          type="number"
          value={planting.daysToMaturity ?? ""}
          onChange={(e) => onUpdate({ ...planting, daysToMaturity: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="DTM"
          title="Days to maturity"
          className="w-12 bg-transparent text-xs text-text-secondary placeholder:text-text-muted outline-none text-center"
        />
        {planting.plantingDepthIn != null && (
          <span className="text-[10px] text-text-muted shrink-0" title="Planting depth">
            {planting.plantingDepthIn}&quot;
          </span>
        )}
        {planting.sowMethod && (
          <span className="text-[10px] text-text-muted shrink-0">
            {planting.sowMethod === "direct-sow" ? "DS" : "TP"}
          </span>
        )}
        <select
          value={planting.status}
          onChange={(e) => onUpdate({ ...planting, status: e.target.value as Planting["status"] })}
          className="text-xs bg-transparent rounded px-1 py-0.5 border border-border text-text-primary"
        >
          <option value="planned">Planned</option>
          <option value="planted">Planted</option>
          <option value="growing">Growing</option>
          <option value="harvested">Harvested</option>
          <option value="failed">Failed</option>
        </select>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[planting.status]}`}>
          {planting.status}
        </span>
        <button onClick={onRemove} className="text-text-muted hover:text-danger transition-colors shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      {planting.catalogId && <CropInfoCard catalogId={planting.catalogId} />}
    </div>
  );
}

function BedSection({ bed, nodeId }: { bed: Bed; nodeId: string }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const nodes = useFarmStore((s) => s.nodes);
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const gardenData = node.data as GardenData;

  const updateBed = (updated: Bed) => {
    const newBeds = gardenData.beds.map((b) => (b.id === bed.id ? updated : b));
    updateNodeData(nodeId, { beds: newBeds } as Partial<GardenData>);
  };

  const addPlanting = () => {
    const newPlanting: Planting = {
      id: uid(),
      crop: "",
      status: "planned",
      season: new Date().getFullYear(),
    };
    updateBed({ ...bed, plantings: [...bed.plantings, newPlanting] });
  };

  const updatePlanting = (p: Planting) => {
    updateBed({ ...bed, plantings: bed.plantings.map((pl) => (pl.id === p.id ? p : pl)) });
  };

  const removePlanting = (id: string) => {
    updateBed({ ...bed, plantings: bed.plantings.filter((pl) => pl.id !== id) });
  };

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-3">
      <div className="flex items-center justify-between mb-2">
        <input
          value={bed.name}
          onChange={(e) => updateBed({ ...bed, name: e.target.value })}
          className="text-sm font-medium bg-transparent text-text-primary outline-none"
        />
        <button
          onClick={addPlanting}
          className="text-xs text-accent hover:text-accent-hover transition-colors"
        >
          + Planting
        </button>
      </div>
      <div className="space-y-1">
        {bed.plantings.map((p) => (
          <PlantingRow key={p.id} planting={p} onUpdate={updatePlanting} onRemove={() => removePlanting(p.id)} />
        ))}
      </div>
      {bed.plantings.length > 0 && bed.plantings.some((p) => p.daysToMaturity) && (
        <div className="mt-2 pt-2 border-t border-border/50">
          {bed.plantings.filter((p) => p.daysToMaturity).map((p) => (
            <div key={p.id} className="mb-1">
              <span className="text-[10px] text-text-muted mr-2">{p.crop}:</span>
              <FrostPlanting daysToMaturity={p.daysToMaturity} datePlanted={p.datePlanted} />
            </div>
          ))}
        </div>
      )}
      {bed.plantings.length === 0 && (
        <p className="text-xs text-text-muted py-2">No plantings yet. Add one above.</p>
      )}
    </div>
  );
}

export default function GardenDetail({ node }: { node: FarmNode }) {
  const router = useRouter();
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const allNodes = useFarmStore((s) => s.nodes);
  const childBeds = useMemo(() => allNodes.filter((n) => n.parentId === node.id && n.kind === "bed"), [allNodes, node.id]);
  const data = node.data as GardenData;

  const geoInfo = useMemo(() => {
    const geo = node.geometry as any;
    if (geo?.type !== "Polygon" || !geo.coordinates?.[0]) return null;
    const ring = geo.coordinates[0] as number[][];
    const vertexRing = ring.length > 0 && ring[0][0] === ring[ring.length - 1]?.[0] ? ring.slice(0, -1) : ring;
    const sides = polygonSideLengths(vertexRing);
    const perimeter = polygonPerimeterFt(vertexRing);
    return { sides, perimeter };
  }, [node.geometry]);

  const addBed = () => {
    const newBed: Bed = {
      id: uid(),
      name: `Bed ${data.beds.length + 1}`,
      plantings: [],
    };
    updateNodeData(node.id, { beds: [...data.beds, newBed] } as Partial<GardenData>);
  };

  return (
    <div className="space-y-6">
      {(data.sqft || geoInfo) && (
        <div className="rounded-lg bg-accent/5 border border-accent/20 p-3">
          <div className="flex items-center gap-4 flex-wrap">
            {data.sqft != null && data.sqft > 0 && (
              <div>
                <div className="text-[10px] text-text-muted uppercase">Area</div>
                <div className="text-sm font-semibold text-accent">{formatArea(data.sqft)}</div>
              </div>
            )}
            {geoInfo && (
              <>
                <div>
                  <div className="text-[10px] text-text-muted uppercase">Perimeter</div>
                  <div className="text-sm font-medium text-text-primary">{formatFt(geoInfo.perimeter)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-text-muted uppercase">Sides</div>
                  <div className="text-xs text-text-secondary">{geoInfo.sides.map((s) => formatFt(s)).join(" x ")}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Size (sq ft)</label>
          <input
            type="number"
            value={data.sqft ?? ""}
            onChange={(e) => updateNodeData(node.id, { sqft: e.target.value ? Number(e.target.value) : undefined } as Partial<GardenData>)}
            className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Sun Exposure</label>
          <select
            value={data.sunExposure ?? ""}
            onChange={(e) => updateNodeData(node.id, { sunExposure: e.target.value || undefined } as Partial<GardenData>)}
            className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
          >
            <option value="">Select...</option>
            <option value="full">Full Sun</option>
            <option value="partial">Partial Sun</option>
            <option value="shade">Shade</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Soil Type</label>
          <input
            type="text"
            value={data.soilType ?? ""}
            onChange={(e) => updateNodeData(node.id, { soilType: e.target.value } as Partial<GardenData>)}
            placeholder="e.g. Sandy loam"
            className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={data.inGround !== false}
              onChange={(e) => updateNodeData(node.id, { inGround: e.target.checked } as Partial<GardenData>)}
              className="rounded border-border"
            />
            In-ground (vs raised)
          </label>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Season Notes</label>
        <textarea
          value={data.seasonNotes ?? ""}
          onChange={(e) => updateNodeData(node.id, { seasonNotes: e.target.value } as Partial<GardenData>)}
          placeholder="Notes about this season..."
          rows={2}
          className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none"
        />
      </div>

      {childBeds.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">Beds on Map</h3>
            <button
              onClick={() => {
                useMapStore.getState().setDrawMode("polygon");
                useMapStore.getState().setPendingParentId(node.id);
                router.push("/");
              }}
              className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
            >
              + Draw Bed
            </button>
          </div>
          <div className="space-y-1.5">
            {childBeds.map((bed) => {
              const bedData = bed.data as BedNodeData;
              const plantingCount = bedData.plantings?.length ?? 0;
              return (
                <button
                  key={bed.id}
                  onClick={() => router.push(`/node?id=${bed.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-bg-surface p-3 text-left hover:bg-bg-surface/80 transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: NODE_KIND_COLORS.bed }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{bed.name}</div>
                    <div className="text-xs text-text-muted">
                      {bedData.sqft ? `${bedData.sqft} sq ft` : ""}
                      {bedData.sqft && plantingCount > 0 ? " -- " : ""}
                      {plantingCount > 0 ? `${plantingCount} planting${plantingCount > 1 ? "s" : ""}` : ""}
                      {!bedData.sqft && plantingCount === 0 ? "No data yet" : ""}
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {childBeds.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-sm text-text-secondary mb-2">Draw beds on the map for this garden</p>
          <button
            onClick={() => {
              useMapStore.getState().setDrawMode("polygon");
              useMapStore.getState().setPendingParentId(node.id);
              router.push("/");
            }}
            className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
          >
            + Draw Bed on Map
          </button>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Quick Beds (no geometry)</h3>
          <button onClick={addBed} className="text-xs font-medium text-accent hover:text-accent-hover transition-colors">
            + Add Bed
          </button>
        </div>
        <div className="space-y-3">
          {data.beds.map((bed) => (
            <BedSection key={bed.id} bed={bed} nodeId={node.id} />
          ))}
        </div>
        {data.beds.length === 0 && (
          <p className="text-xs text-text-muted">Quick beds don't show on the map. Use "Draw Bed on Map" above to create beds with boundaries.</p>
        )}
      </div>
    </div>
  );
}
