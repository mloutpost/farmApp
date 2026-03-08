"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, GreenhouseData, Bed, Planting } from "@/types";
import CropPicker, { CropInfoCard } from "./CropPicker";
import type { CropEntry } from "@/lib/crop-catalog";
import FrostPlanting from "./FrostPlanting";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function PlantingRow({ planting, onUpdate, onRemove }: { planting: Planting; onUpdate: (p: Planting) => void; onRemove: () => void }) {
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
        <select value={planting.status} onChange={(e) => onUpdate({ ...planting, status: e.target.value as Planting["status"] })} className="bg-transparent text-[10px] text-text-muted outline-none">
          <option value="planned">Planned</option>
          <option value="planted">Planted</option>
          <option value="growing">Growing</option>
          <option value="harvested">Harvested</option>
          <option value="failed">Failed</option>
        </select>
        {planting.daysToMaturity && <span className="text-[10px] text-text-muted shrink-0">{planting.daysToMaturity}d</span>}
        <button onClick={onRemove} className="text-xs text-danger hover:text-danger/80 shrink-0">x</button>
      </div>
      {planting.catalogId && <CropInfoCard catalogId={planting.catalogId} />}
    </div>
  );
}

export default function GreenhouseDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as GreenhouseData;

  const addBed = () => {
    const bed: Bed = { id: uid(), name: `Bed ${data.beds.length + 1}`, plantings: [] };
    updateNodeData(node.id, { beds: [...data.beds, bed] } as Partial<GreenhouseData>);
  };

  const updateBed = (bedId: string, updates: Partial<Bed>) => {
    updateNodeData(node.id, {
      beds: data.beds.map((b) => (b.id === bedId ? { ...b, ...updates } : b)),
    } as Partial<GreenhouseData>);
  };

  const removeBed = (bedId: string) => {
    updateNodeData(node.id, { beds: data.beds.filter((b) => b.id !== bedId) } as Partial<GreenhouseData>);
  };

  const addPlanting = (bedId: string) => {
    const bed = data.beds.find((b) => b.id === bedId);
    if (!bed) return;
    const p: Planting = { id: uid(), crop: "", status: "planned" };
    updateBed(bedId, { plantings: [...bed.plantings, p] });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Structure</label>
          <select value={data.structureType ?? ""} onChange={(e) => updateNodeData(node.id, { structureType: e.target.value || undefined } as Partial<GreenhouseData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="glass">Glass Greenhouse</option>
            <option value="polycarbonate">Polycarbonate</option>
            <option value="poly-film">Poly Film</option>
            <option value="high-tunnel">High Tunnel</option>
            <option value="cold-frame">Cold Frame</option>
            <option value="shade-house">Shade House</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Sq. Ft.</label>
          <input type="number" value={data.sqft ?? ""} onChange={(e) => updateNodeData(node.id, { sqft: e.target.value ? Number(e.target.value) : undefined } as Partial<GreenhouseData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Heating</label>
          <select value={data.heatingType ?? ""} onChange={(e) => updateNodeData(node.id, { heatingType: e.target.value || undefined } as Partial<GreenhouseData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">None</option>
            <option value="propane">Propane</option>
            <option value="electric">Electric</option>
            <option value="wood">Wood</option>
            <option value="passive">Passive Solar</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Cooling</label>
          <select value={data.coolingType ?? ""} onChange={(e) => updateNodeData(node.id, { coolingType: e.target.value || undefined } as Partial<GreenhouseData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">None</option>
            <option value="fan">Exhaust Fan</option>
            <option value="shade-cloth">Shade Cloth</option>
            <option value="evaporative">Evaporative</option>
            <option value="roll-up-sides">Roll-up Sides</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Min Temp (F)</label>
          <input type="number" value={data.minTempF ?? ""} onChange={(e) => updateNodeData(node.id, { minTempF: e.target.value ? Number(e.target.value) : undefined } as Partial<GreenhouseData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Max Temp (F)</label>
          <input type="number" value={data.maxTempF ?? ""} onChange={(e) => updateNodeData(node.id, { maxTempF: e.target.value ? Number(e.target.value) : undefined } as Partial<GreenhouseData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
      </div>

      <FrostPlanting />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Beds & Plantings</h3>
          <button onClick={addBed} className="text-xs text-accent hover:text-accent-hover transition-colors">+ Add Bed</button>
        </div>
        {data.beds.map((bed) => (
          <div key={bed.id} className="mb-4 rounded-lg border border-border bg-bg-surface p-4">
            <div className="flex items-center gap-2 mb-3">
              <input value={bed.name} onChange={(e) => updateBed(bed.id, { name: e.target.value })} className="flex-1 bg-transparent text-sm font-medium text-text-primary outline-none" />
              <button onClick={() => addPlanting(bed.id)} className="text-[10px] text-accent hover:text-accent-hover">+ Plant</button>
              <button onClick={() => removeBed(bed.id)} className="text-[10px] text-danger hover:text-danger/80">Remove</button>
            </div>
            <div className="space-y-1.5">
              {bed.plantings.map((p) => (
                <PlantingRow
                  key={p.id}
                  planting={p}
                  onUpdate={(updated) => updateBed(bed.id, { plantings: bed.plantings.map((x) => (x.id === updated.id ? updated : x)) })}
                  onRemove={() => updateBed(bed.id, { plantings: bed.plantings.filter((x) => x.id !== p.id) })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Season Notes</label>
        <textarea value={data.seasonNotes ?? ""} onChange={(e) => updateNodeData(node.id, { seasonNotes: e.target.value } as Partial<GreenhouseData>)} rows={3} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" placeholder="Notes about this season..." />
      </div>
    </div>
  );
}
