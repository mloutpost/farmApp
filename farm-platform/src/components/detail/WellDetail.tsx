"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, WellData } from "@/types";

export default function WellDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as WellData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
          <select value={data.wellType ?? ""} onChange={(e) => updateNodeData(node.id, { wellType: e.target.value || undefined } as Partial<WellData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="drilled">Drilled Well</option>
            <option value="dug">Dug Well</option>
            <option value="spring">Spring</option>
            <option value="pond">Pond</option>
            <option value="cistern">Cistern</option>
            <option value="municipal">Municipal</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Depth (ft)</label>
          <input type="number" value={data.depth ?? ""} onChange={(e) => updateNodeData(node.id, { depth: e.target.value ? Number(e.target.value) : undefined } as Partial<WellData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Pump Type</label>
          <input type="text" value={data.pumpType ?? ""} onChange={(e) => updateNodeData(node.id, { pumpType: e.target.value } as Partial<WellData>)} placeholder="e.g. Submersible" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Pump HP</label>
          <input type="number" value={data.pumpHP ?? ""} onChange={(e) => updateNodeData(node.id, { pumpHP: e.target.value ? Number(e.target.value) : undefined } as Partial<WellData>)} step="0.5" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Flow Rate (GPM)</label>
          <input type="number" value={data.flowRate ?? ""} onChange={(e) => updateNodeData(node.id, { flowRate: e.target.value ? Number(e.target.value) : undefined } as Partial<WellData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Pressure (PSI)</label>
          <input type="number" value={data.pressure ?? ""} onChange={(e) => updateNodeData(node.id, { pressure: e.target.value ? Number(e.target.value) : undefined } as Partial<WellData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Water Quality</h3>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-text-muted">pH</label>
            <input type="number" value={data.waterQuality.ph ?? ""} onChange={(e) => updateNodeData(node.id, { waterQuality: { ...data.waterQuality, ph: e.target.value ? Number(e.target.value) : undefined } } as Partial<WellData>)} step="0.1" className="w-full bg-transparent border-b border-border text-xs text-text-primary outline-none pb-1" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted">TDS (ppm)</label>
            <input type="number" value={data.waterQuality.tds ?? ""} onChange={(e) => updateNodeData(node.id, { waterQuality: { ...data.waterQuality, tds: e.target.value ? Number(e.target.value) : undefined } } as Partial<WellData>)} className="w-full bg-transparent border-b border-border text-xs text-text-primary outline-none pb-1" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted">Hardness</label>
            <input type="number" value={data.waterQuality.hardness ?? ""} onChange={(e) => updateNodeData(node.id, { waterQuality: { ...data.waterQuality, hardness: e.target.value ? Number(e.target.value) : undefined } } as Partial<WellData>)} className="w-full bg-transparent border-b border-border text-xs text-text-primary outline-none pb-1" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted">Iron (ppm)</label>
            <input type="number" value={data.waterQuality.iron ?? ""} onChange={(e) => updateNodeData(node.id, { waterQuality: { ...data.waterQuality, iron: e.target.value ? Number(e.target.value) : undefined } } as Partial<WellData>)} step="0.01" className="w-full bg-transparent border-b border-border text-xs text-text-primary outline-none pb-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
