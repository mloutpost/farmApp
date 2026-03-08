"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, PondData } from "@/types";

export default function PondDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as PondData;

  const addMaintenance = () => {
    updateNodeData(node.id, {
      maintenanceLog: [...data.maintenanceLog, { date: new Date().toISOString().slice(0, 10), task: "", notes: "" }],
    } as Partial<PondData>);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
          <select value={data.pondType ?? ""} onChange={(e) => updateNodeData(node.id, { pondType: e.target.value || undefined } as Partial<PondData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="natural">Natural</option>
            <option value="excavated">Excavated</option>
            <option value="dam">Dam / Impoundment</option>
            <option value="tank">Above-ground Tank</option>
            <option value="cistern">Cistern</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Purpose</label>
          <select value={data.purpose ?? ""} onChange={(e) => updateNodeData(node.id, { purpose: e.target.value || undefined } as Partial<PondData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="irrigation">Irrigation</option>
            <option value="livestock">Livestock</option>
            <option value="aquaculture">Aquaculture / Fish</option>
            <option value="fire-suppression">Fire Suppression</option>
            <option value="recreation">Recreation</option>
            <option value="stormwater">Stormwater</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Surface Area (acres)</label>
          <input type="number" value={data.acreage ?? ""} onChange={(e) => updateNodeData(node.id, { acreage: e.target.value ? Number(e.target.value) : undefined } as Partial<PondData>)} step="0.01" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Max Depth (ft)</label>
          <input type="number" value={data.depthFt ?? ""} onChange={(e) => updateNodeData(node.id, { depthFt: e.target.value ? Number(e.target.value) : undefined } as Partial<PondData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Volume (gallons)</label>
          <input type="number" value={data.volumeGallons ?? ""} onChange={(e) => updateNodeData(node.id, { volumeGallons: e.target.value ? Number(e.target.value) : undefined } as Partial<PondData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Water Source</label>
          <input type="text" value={data.waterSource ?? ""} onChange={(e) => updateNodeData(node.id, { waterSource: e.target.value } as Partial<PondData>)} placeholder="e.g. Spring-fed, Runoff" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Spillway</label>
          <input type="text" value={data.spillwayType ?? ""} onChange={(e) => updateNodeData(node.id, { spillwayType: e.target.value } as Partial<PondData>)} placeholder="e.g. Pipe, Rock" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Dam Condition</label>
          <select value={data.damCondition ?? ""} onChange={(e) => updateNodeData(node.id, { damCondition: e.target.value || undefined } as Partial<PondData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">N/A</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Water Quality</h3>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-text-muted">pH</label>
            <input type="number" value={data.waterQuality.ph ?? ""} onChange={(e) => updateNodeData(node.id, { waterQuality: { ...data.waterQuality, ph: e.target.value ? Number(e.target.value) : undefined } } as Partial<PondData>)} step="0.1" className="w-full bg-transparent border-b border-border text-xs text-text-primary outline-none pb-1" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted">TDS (ppm)</label>
            <input type="number" value={data.waterQuality.tds ?? ""} onChange={(e) => updateNodeData(node.id, { waterQuality: { ...data.waterQuality, tds: e.target.value ? Number(e.target.value) : undefined } } as Partial<PondData>)} className="w-full bg-transparent border-b border-border text-xs text-text-primary outline-none pb-1" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted">Hardness</label>
            <input type="number" value={data.waterQuality.hardness ?? ""} onChange={(e) => updateNodeData(node.id, { waterQuality: { ...data.waterQuality, hardness: e.target.value ? Number(e.target.value) : undefined } } as Partial<PondData>)} className="w-full bg-transparent border-b border-border text-xs text-text-primary outline-none pb-1" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted">Iron (ppm)</label>
            <input type="number" value={data.waterQuality.iron ?? ""} onChange={(e) => updateNodeData(node.id, { waterQuality: { ...data.waterQuality, iron: e.target.value ? Number(e.target.value) : undefined } } as Partial<PondData>)} step="0.01" className="w-full bg-transparent border-b border-border text-xs text-text-primary outline-none pb-1" />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Maintenance Log</h3>
          <button onClick={addMaintenance} className="text-xs text-accent hover:text-accent-hover transition-colors">+ Add Entry</button>
        </div>
        {data.maintenanceLog.length === 0 ? (
          <p className="text-xs text-text-muted">No entries yet.</p>
        ) : (
          <div className="space-y-2">
            {data.maintenanceLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-bg px-3 py-2">
                <input type="date" value={entry.date} onChange={(e) => {
                  const log = [...data.maintenanceLog];
                  log[i] = { ...log[i], date: e.target.value };
                  updateNodeData(node.id, { maintenanceLog: log } as Partial<PondData>);
                }} className="bg-transparent text-xs text-text-primary outline-none" />
                <input type="text" value={entry.task} onChange={(e) => {
                  const log = [...data.maintenanceLog];
                  log[i] = { ...log[i], task: e.target.value };
                  updateNodeData(node.id, { maintenanceLog: log } as Partial<PondData>);
                }} placeholder="Task..." className="flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted" />
                <button onClick={() => {
                  updateNodeData(node.id, { maintenanceLog: data.maintenanceLog.filter((_, j) => j !== i) } as Partial<PondData>);
                }} className="text-xs text-danger hover:text-danger/80">x</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
