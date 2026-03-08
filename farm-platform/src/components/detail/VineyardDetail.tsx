"use client";

import { useState } from "react";
import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, VineyardData } from "@/types";

export default function VineyardDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as VineyardData;
  const [newVariety, setNewVariety] = useState("");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Crop</label>
          <select value={data.vineCrop ?? ""} onChange={(e) => updateNodeData(node.id, { vineCrop: e.target.value || undefined } as Partial<VineyardData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="grape">Grape</option>
            <option value="muscadine">Muscadine</option>
            <option value="blackberry">Blackberry</option>
            <option value="raspberry">Raspberry</option>
            <option value="blueberry">Blueberry</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Trellis Type</label>
          <select value={data.trellisType ?? ""} onChange={(e) => updateNodeData(node.id, { trellisType: e.target.value || undefined } as Partial<VineyardData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">None</option>
            <option value="VSP">VSP (Vertical Shoot)</option>
            <option value="high-wire">High Wire</option>
            <option value="T-trellis">T-Trellis</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Acreage</label>
          <input type="number" value={data.acreage ?? ""} onChange={(e) => updateNodeData(node.id, { acreage: e.target.value ? Number(e.target.value) : undefined } as Partial<VineyardData>)} step="0.01" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Planted Year</label>
          <input type="number" value={data.plantedYear ?? ""} onChange={(e) => updateNodeData(node.id, { plantedYear: e.target.value ? Number(e.target.value) : undefined } as Partial<VineyardData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Rows</label>
          <input type="number" value={data.rowCount ?? ""} onChange={(e) => updateNodeData(node.id, { rowCount: e.target.value ? Number(e.target.value) : undefined } as Partial<VineyardData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Row Spacing (ft)</label>
          <input type="number" value={data.rowSpacingFt ?? ""} onChange={(e) => updateNodeData(node.id, { rowSpacingFt: e.target.value ? Number(e.target.value) : undefined } as Partial<VineyardData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1">Vines per Row</label>
          <input type="number" value={data.vinesPerRow ?? ""} onChange={(e) => updateNodeData(node.id, { vinesPerRow: e.target.value ? Number(e.target.value) : undefined } as Partial<VineyardData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Varieties</h3>
        <div className="flex gap-2 mb-2">
          <input type="text" value={newVariety} onChange={(e) => setNewVariety(e.target.value)} onKeyDown={(e) => {
            if (e.key === "Enter" && newVariety.trim()) {
              updateNodeData(node.id, { varieties: [...data.varieties, newVariety.trim()] } as Partial<VineyardData>);
              setNewVariety("");
            }
          }} placeholder="Add variety..." className="flex-1 rounded-md border border-border bg-bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted" />
          <button onClick={() => {
            if (newVariety.trim()) {
              updateNodeData(node.id, { varieties: [...data.varieties, newVariety.trim()] } as Partial<VineyardData>);
              setNewVariety("");
            }
          }} className="text-xs text-accent hover:text-accent-hover">Add</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.varieties.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-xs text-text-secondary">
              {v}
              <button onClick={() => updateNodeData(node.id, { varieties: data.varieties.filter((_, j) => j !== i) } as Partial<VineyardData>)} className="text-danger hover:text-danger/80">x</button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Pruning Log</h3>
          <button onClick={() => updateNodeData(node.id, { pruningLog: [...data.pruningLog, { date: new Date().toISOString().slice(0, 10) }] } as Partial<VineyardData>)} className="text-xs text-accent hover:text-accent-hover transition-colors">+ Add</button>
        </div>
        {data.pruningLog.length === 0 ? (
          <p className="text-xs text-text-muted">No entries yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data.pruningLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-bg px-3 py-2">
                <input type="date" value={entry.date} onChange={(e) => {
                  const log = [...data.pruningLog]; log[i] = { ...log[i], date: e.target.value };
                  updateNodeData(node.id, { pruningLog: log } as Partial<VineyardData>);
                }} className="bg-transparent text-xs text-text-primary outline-none" />
                <input type="text" value={entry.notes ?? ""} onChange={(e) => {
                  const log = [...data.pruningLog]; log[i] = { ...log[i], notes: e.target.value };
                  updateNodeData(node.id, { pruningLog: log } as Partial<VineyardData>);
                }} placeholder="Notes..." className="flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted" />
                <button onClick={() => updateNodeData(node.id, { pruningLog: data.pruningLog.filter((_, j) => j !== i) } as Partial<VineyardData>)} className="text-xs text-danger shrink-0">x</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Spray Schedule</h3>
          <button onClick={() => updateNodeData(node.id, { spraySchedule: [...data.spraySchedule, { date: new Date().toISOString().slice(0, 10), product: "" }] } as Partial<VineyardData>)} className="text-xs text-accent hover:text-accent-hover transition-colors">+ Add</button>
        </div>
        {data.spraySchedule.length === 0 ? (
          <p className="text-xs text-text-muted">No entries yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data.spraySchedule.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-bg px-3 py-2">
                <input type="date" value={entry.date} onChange={(e) => {
                  const log = [...data.spraySchedule]; log[i] = { ...log[i], date: e.target.value };
                  updateNodeData(node.id, { spraySchedule: log } as Partial<VineyardData>);
                }} className="bg-transparent text-xs text-text-primary outline-none" />
                <input type="text" value={entry.product} onChange={(e) => {
                  const log = [...data.spraySchedule]; log[i] = { ...log[i], product: e.target.value };
                  updateNodeData(node.id, { spraySchedule: log } as Partial<VineyardData>);
                }} placeholder="Product" className="flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted" />
                <button onClick={() => updateNodeData(node.id, { spraySchedule: data.spraySchedule.filter((_, j) => j !== i) } as Partial<VineyardData>)} className="text-xs text-danger shrink-0">x</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
