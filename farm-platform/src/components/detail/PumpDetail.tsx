"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, PumpData } from "@/types";

export default function PumpDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as PumpData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Pump Type</label>
          <input type="text" value={data.pumpType ?? ""} onChange={(e) => updateNodeData(node.id, { pumpType: e.target.value } as Partial<PumpData>)} placeholder="e.g. Centrifugal" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">HP</label>
          <input type="number" value={data.hp ?? ""} onChange={(e) => updateNodeData(node.id, { hp: e.target.value ? Number(e.target.value) : undefined } as Partial<PumpData>)} step="0.5" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">GPM Capacity</label>
          <input type="number" value={data.gpmCapacity ?? ""} onChange={(e) => updateNodeData(node.id, { gpmCapacity: e.target.value ? Number(e.target.value) : undefined } as Partial<PumpData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Power Source</label>
          <select value={data.powerSource ?? ""} onChange={(e) => updateNodeData(node.id, { powerSource: e.target.value || undefined } as Partial<PumpData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="electric">Electric</option>
            <option value="solar">Solar</option>
            <option value="pto">PTO</option>
            <option value="gas">Gas</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Pressure Setting (PSI)</label>
          <input type="number" value={data.pressureSetting ?? ""} onChange={(e) => updateNodeData(node.id, { pressureSetting: e.target.value ? Number(e.target.value) : undefined } as Partial<PumpData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
      </div>
    </div>
  );
}
