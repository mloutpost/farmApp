"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, RainwaterData } from "@/types";

export default function RainwaterDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as RainwaterData;

  const addMaintenance = () => {
    updateNodeData(node.id, {
      maintenanceLog: [...data.maintenanceLog, { date: new Date().toISOString().slice(0, 10), task: "" }],
    } as Partial<RainwaterData>);
  };

  const fillPct = data.capacityGallons && data.currentGallons != null
    ? Math.min(100, Math.max(0, (data.currentGallons / data.capacityGallons) * 100))
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Collection Type</label>
          <select value={data.collectionType ?? ""} onChange={(e) => updateNodeData(node.id, { collectionType: e.target.value || undefined } as Partial<RainwaterData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="barrel">Rain Barrel</option>
            <option value="cistern">Cistern</option>
            <option value="tank">Above-ground Tank</option>
            <option value="underground">Underground Tank</option>
            <option value="IBC-tote">IBC Tote</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Capacity (gal)</label>
          <input type="number" value={data.capacityGallons ?? ""} onChange={(e) => updateNodeData(node.id, { capacityGallons: e.target.value ? Number(e.target.value) : undefined } as Partial<RainwaterData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Current (gal)</label>
          <input type="number" value={data.currentGallons ?? ""} onChange={(e) => updateNodeData(node.id, { currentGallons: e.target.value ? Number(e.target.value) : undefined } as Partial<RainwaterData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Roof Area (sq ft)</label>
          <input type="number" value={data.roofAreaSqFt ?? ""} onChange={(e) => updateNodeData(node.id, { roofAreaSqFt: e.target.value ? Number(e.target.value) : undefined } as Partial<RainwaterData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Filter Type</label>
          <input type="text" value={data.filterType ?? ""} onChange={(e) => updateNodeData(node.id, { filterType: e.target.value } as Partial<RainwaterData>)} placeholder="e.g. First-flush diverter" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Connected To</label>
          <input type="text" value={data.connectedTo ?? ""} onChange={(e) => updateNodeData(node.id, { connectedTo: e.target.value } as Partial<RainwaterData>)} placeholder="e.g. Garden drip, Barn" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div className="col-span-2">
          <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <input type="checkbox" checked={data.potable ?? false} onChange={(e) => updateNodeData(node.id, { potable: e.target.checked } as Partial<RainwaterData>)} className="rounded" />
            Potable (treated for drinking)
          </label>
        </div>
      </div>

      {fillPct != null && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-muted">Fill Level</span>
            <span className="text-xs font-medium text-text-primary">{Math.round(fillPct)}% ({data.currentGallons} / {data.capacityGallons} gal)</span>
          </div>
          <div className="h-2.5 rounded-full bg-bg overflow-hidden">
            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${fillPct}%` }} />
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Maintenance Log</h3>
          <button onClick={addMaintenance} className="text-xs text-accent hover:text-accent-hover transition-colors">+ Add</button>
        </div>
        {data.maintenanceLog.length === 0 ? (
          <p className="text-xs text-text-muted">No entries yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data.maintenanceLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-bg px-3 py-2">
                <input type="date" value={entry.date} onChange={(e) => {
                  const log = [...data.maintenanceLog]; log[i] = { ...log[i], date: e.target.value };
                  updateNodeData(node.id, { maintenanceLog: log } as Partial<RainwaterData>);
                }} className="bg-transparent text-xs text-text-primary outline-none" />
                <input type="text" value={entry.task} onChange={(e) => {
                  const log = [...data.maintenanceLog]; log[i] = { ...log[i], task: e.target.value };
                  updateNodeData(node.id, { maintenanceLog: log } as Partial<RainwaterData>);
                }} placeholder="Task..." className="flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted" />
                <button onClick={() => updateNodeData(node.id, { maintenanceLog: data.maintenanceLog.filter((_, j) => j !== i) } as Partial<RainwaterData>)} className="text-xs text-danger shrink-0">x</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
