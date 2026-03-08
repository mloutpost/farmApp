"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, IrrigationData } from "@/types";

export default function IrrigationDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as IrrigationData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
          <select value={data.irrigationType ?? ""} onChange={(e) => updateNodeData(node.id, { irrigationType: e.target.value || undefined } as Partial<IrrigationData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="drip-tape">Drip Tape</option>
            <option value="drip-line">Drip Line</option>
            <option value="sprinkler">Sprinkler</option>
            <option value="pivot">Center Pivot</option>
            <option value="flood">Flood</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Length (ft)</label>
          <input type="number" value={data.lengthFt ?? ""} onChange={(e) => updateNodeData(node.id, { lengthFt: e.target.value ? Number(e.target.value) : undefined } as Partial<IrrigationData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Diameter</label>
          <input type="text" value={data.diameter ?? ""} onChange={(e) => updateNodeData(node.id, { diameter: e.target.value } as Partial<IrrigationData>)} placeholder='e.g. 3/4"' className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Flow Capacity</label>
          <input type="text" value={data.flowCapacity ?? ""} onChange={(e) => updateNodeData(node.id, { flowCapacity: e.target.value } as Partial<IrrigationData>)} placeholder="e.g. 5 GPM" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1">Schedule</label>
          <input type="text" value={data.schedule ?? ""} onChange={(e) => updateNodeData(node.id, { schedule: e.target.value } as Partial<IrrigationData>)} placeholder="e.g. 30 min daily at 6am" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
      </div>
    </div>
  );
}
