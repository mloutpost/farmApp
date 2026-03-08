"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, PowerlineData } from "@/types";

export default function PowerlineDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as PowerlineData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
          <select value={data.lineType ?? ""} onChange={(e) => updateNodeData(node.id, { lineType: e.target.value || undefined } as Partial<PowerlineData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="overhead">Overhead</option>
            <option value="underground">Underground</option>
            <option value="solar-run">Solar Run</option>
            <option value="generator">Generator Feed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Voltage</label>
          <input type="text" value={data.voltage ?? ""} onChange={(e) => updateNodeData(node.id, { voltage: e.target.value } as Partial<PowerlineData>)} placeholder="e.g. 240V single-phase" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Length (ft)</label>
          <input type="number" value={data.lengthFt ?? ""} onChange={(e) => updateNodeData(node.id, { lengthFt: e.target.value ? Number(e.target.value) : undefined } as Partial<PowerlineData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Amperage</label>
          <input type="number" value={data.amperage ?? ""} onChange={(e) => updateNodeData(node.id, { amperage: e.target.value ? Number(e.target.value) : undefined } as Partial<PowerlineData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Service Panel</label>
          <input type="text" value={data.servicePanel ?? ""} onChange={(e) => updateNodeData(node.id, { servicePanel: e.target.value } as Partial<PowerlineData>)} placeholder="e.g. 200A main" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
      </div>
    </div>
  );
}
