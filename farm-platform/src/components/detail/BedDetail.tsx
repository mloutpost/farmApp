"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFarmStore } from "@/store/farm-store";
import FrostPlanting from "./FrostPlanting";
import CropPicker, { CropInfoCard } from "./CropPicker";
import { polygonSideLengths, polygonPerimeterFt, formatFt, formatArea } from "@/lib/geo-calc";
import type { CropEntry } from "@/lib/crop-catalog";
import type { FarmNode, BedNodeData, Planting } from "@/types";

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
          <CropPicker value={planting.crop} catalogId={planting.catalogId} onChange={handleCropSelect} />
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
          <span className="text-[10px] text-text-muted shrink-0" title="Planting depth">{planting.plantingDepthIn}&quot;</span>
        )}
        {planting.sowMethod && (
          <span className="text-[10px] text-text-muted shrink-0">{planting.sowMethod === "direct-sow" ? "DS" : "TP"}</span>
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
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[planting.status]}`}>{planting.status}</span>
        <button onClick={onRemove} className="text-text-muted hover:text-danger transition-colors shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
      {planting.catalogId && <CropInfoCard catalogId={planting.catalogId} />}
    </div>
  );
}

export default function BedDetail({ node }: { node: FarmNode }) {
  const router = useRouter();
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const parentGarden = useFarmStore((s) => node.parentId ? s.nodes.find((n) => n.id === node.parentId) : null);
  const data = node.data as BedNodeData;
  const plantings = data.plantings ?? [];

  const geoInfo = useMemo(() => {
    const geo = node.geometry as any;
    if (geo?.type !== "Polygon" || !geo.coordinates?.[0]) return null;
    const ring = geo.coordinates[0] as number[][];
    const vertexRing = ring.length > 0 && ring[0][0] === ring[ring.length - 1]?.[0] ? ring.slice(0, -1) : ring;
    const sides = polygonSideLengths(vertexRing);
    const perimeter = polygonPerimeterFt(vertexRing);
    return { sides, perimeter };
  }, [node.geometry]);

  const addPlanting = () => {
    const newPlanting: Planting = { id: uid(), crop: "", status: "planned", season: new Date().getFullYear() };
    updateNodeData(node.id, { plantings: [...plantings, newPlanting] } as Partial<BedNodeData>);
  };

  const updatePlanting = (p: Planting) => {
    updateNodeData(node.id, { plantings: plantings.map((pl) => (pl.id === p.id ? p : pl)) } as Partial<BedNodeData>);
  };

  const removePlanting = (id: string) => {
    updateNodeData(node.id, { plantings: plantings.filter((pl) => pl.id !== id) } as Partial<BedNodeData>);
  };

  return (
    <div className="space-y-6">
      {parentGarden && (
        <button
          onClick={() => router.push(`/node?id=${parentGarden.id}`)}
          className="flex items-center gap-2 text-xs text-accent hover:text-accent-hover transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Part of: {parentGarden.name}
        </button>
      )}

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
          <label className="block text-xs font-medium text-text-secondary mb-1">Bed Type</label>
          <select value={data.bedType ?? ""} onChange={(e) => updateNodeData(node.id, { bedType: e.target.value || undefined } as Partial<BedNodeData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="raised">Raised Bed</option>
            <option value="in-ground">In-Ground</option>
            <option value="container">Container</option>
            <option value="hugel">Hugelkultur</option>
            <option value="keyhole">Keyhole</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Sq. Ft.</label>
          <input type="number" value={data.sqft ?? ""} onChange={(e) => updateNodeData(node.id, { sqft: e.target.value ? Number(e.target.value) : undefined } as Partial<BedNodeData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Sun Exposure</label>
          <select value={data.sunExposure ?? ""} onChange={(e) => updateNodeData(node.id, { sunExposure: e.target.value || undefined } as Partial<BedNodeData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="full">Full Sun</option>
            <option value="partial">Partial Sun</option>
            <option value="shade">Shade</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Soil Type</label>
          <input type="text" value={data.soilType ?? ""} onChange={(e) => updateNodeData(node.id, { soilType: e.target.value } as Partial<BedNodeData>)} placeholder="e.g. Sandy loam" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Irrigation</label>
          <select value={data.irrigationType ?? ""} onChange={(e) => updateNodeData(node.id, { irrigationType: e.target.value || undefined } as Partial<BedNodeData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="drip">Drip</option>
            <option value="soaker">Soaker Hose</option>
            <option value="sprinkler">Sprinkler</option>
            <option value="hand">Hand Watering</option>
            <option value="none">None</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Mulch</label>
          <input type="text" value={data.mulchType ?? ""} onChange={(e) => updateNodeData(node.id, { mulchType: e.target.value } as Partial<BedNodeData>)} placeholder="e.g. Straw, wood chips" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
      </div>

      {data.bedType === "raised" && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Width (ft)</label>
            <input type="number" value={data.widthFt ?? ""} onChange={(e) => updateNodeData(node.id, { widthFt: e.target.value ? Number(e.target.value) : undefined } as Partial<BedNodeData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Length (ft)</label>
            <input type="number" value={data.lengthFt ?? ""} onChange={(e) => updateNodeData(node.id, { lengthFt: e.target.value ? Number(e.target.value) : undefined } as Partial<BedNodeData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Depth (in)</label>
            <input type="number" value={data.depthIn ?? ""} onChange={(e) => updateNodeData(node.id, { depthIn: e.target.value ? Number(e.target.value) : undefined } as Partial<BedNodeData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Season Notes</label>
        <textarea value={data.seasonNotes ?? ""} onChange={(e) => updateNodeData(node.id, { seasonNotes: e.target.value } as Partial<BedNodeData>)} placeholder="Notes about this bed..." rows={2} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Plantings</h3>
          <button onClick={addPlanting} className="text-xs font-medium text-accent hover:text-accent-hover transition-colors">+ Add Planting</button>
        </div>
        <div className="space-y-2">
          {plantings.map((p) => (
            <PlantingRow key={p.id} planting={p} onUpdate={updatePlanting} onRemove={() => removePlanting(p.id)} />
          ))}
        </div>
        {plantings.length === 0 && (
          <p className="text-xs text-text-muted">No plantings yet. Add one to plan what goes in this bed.</p>
        )}
        {plantings.length > 0 && plantings.some((p) => p.daysToMaturity) && (
          <div className="mt-3 pt-2 border-t border-border/50">
            {plantings.filter((p) => p.daysToMaturity).map((p) => (
              <div key={p.id} className="mb-1">
                <span className="text-[10px] text-text-muted mr-2">{p.crop}:</span>
                <FrostPlanting daysToMaturity={p.daysToMaturity} datePlanted={p.datePlanted} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
