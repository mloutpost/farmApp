"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, SpringData } from "@/types";

export default function SpringDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as SpringData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Flow Rate (GPM)</label>
          <input type="number" value={data.flowRateGPM ?? ""} onChange={(e) => updateNodeData(node.id, { flowRateGPM: e.target.value ? Number(e.target.value) : undefined } as Partial<SpringData>)} step="0.1" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Seasonal?</label>
          <select value={data.seasonal == null ? "" : String(data.seasonal)} onChange={(e) => updateNodeData(node.id, { seasonal: e.target.value === "" ? undefined : e.target.value === "true" } as Partial<SpringData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Unknown</option>
            <option value="false">Year-round</option>
            <option value="true">Seasonal</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Captured / Developed?</label>
          <select value={data.capturedDeveloped == null ? "" : String(data.capturedDeveloped)} onChange={(e) => updateNodeData(node.id, { capturedDeveloped: e.target.value === "" ? undefined : e.target.value === "true" } as Partial<SpringData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Unknown</option>
            <option value="true">Yes</option>
            <option value="false">No (natural)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Conveyance</label>
          <input type="text" value={data.conveyanceType ?? ""} onChange={(e) => updateNodeData(node.id, { conveyanceType: e.target.value } as Partial<SpringData>)} placeholder="e.g. Pipe to cistern" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Water Quality</h3>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-text-muted">pH</label>
            <input type="number" value={data.waterQuality.ph ?? ""} onChange={(e) => updateNodeData(node.id, { waterQuality: { ...data.waterQuality, ph: e.target.value ? Number(e.target.value) : undefined } } as Partial<SpringData>)} step="0.1" className="w-full bg-transparent border-b border-border text-xs text-text-primary outline-none pb-1" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted">TDS (ppm)</label>
            <input type="number" value={data.waterQuality.tds ?? ""} onChange={(e) => updateNodeData(node.id, { waterQuality: { ...data.waterQuality, tds: e.target.value ? Number(e.target.value) : undefined } } as Partial<SpringData>)} className="w-full bg-transparent border-b border-border text-xs text-text-primary outline-none pb-1" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted">Hardness</label>
            <input type="number" value={data.waterQuality.hardness ?? ""} onChange={(e) => updateNodeData(node.id, { waterQuality: { ...data.waterQuality, hardness: e.target.value ? Number(e.target.value) : undefined } } as Partial<SpringData>)} className="w-full bg-transparent border-b border-border text-xs text-text-primary outline-none pb-1" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted">Iron (ppm)</label>
            <input type="number" value={data.waterQuality.iron ?? ""} onChange={(e) => updateNodeData(node.id, { waterQuality: { ...data.waterQuality, iron: e.target.value ? Number(e.target.value) : undefined } } as Partial<SpringData>)} step="0.01" className="w-full bg-transparent border-b border-border text-xs text-text-primary outline-none pb-1" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Notes</label>
        <textarea value={data.notes ?? ""} onChange={(e) => updateNodeData(node.id, { notes: e.target.value } as Partial<SpringData>)} rows={3} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" placeholder="Location details, history, concerns..." />
      </div>
    </div>
  );
}
