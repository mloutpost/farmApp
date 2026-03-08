"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, GateData } from "@/types";

export default function GateDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as GateData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
          <select value={data.gateType ?? ""} onChange={(e) => updateNodeData(node.id, { gateType: e.target.value || undefined } as Partial<GateData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="farm-gate">Farm Gate</option>
            <option value="cattle-guard">Cattle Guard</option>
            <option value="swing">Swing Gate</option>
            <option value="slide">Slide Gate</option>
            <option value="electric">Electric / Automatic</option>
            <option value="pedestrian">Pedestrian</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Width</label>
          <input type="text" value={data.width ?? ""} onChange={(e) => updateNodeData(node.id, { width: e.target.value } as Partial<GateData>)} placeholder="e.g. 12 ft" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Material</label>
          <input type="text" value={data.material ?? ""} onChange={(e) => updateNodeData(node.id, { material: e.target.value } as Partial<GateData>)} placeholder="e.g. Steel tube" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Condition</label>
          <select value={data.condition ?? ""} onChange={(e) => updateNodeData(node.id, { condition: e.target.value || undefined } as Partial<GateData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <input type="checkbox" checked={data.lockable ?? false} onChange={(e) => updateNodeData(node.id, { lockable: e.target.checked } as Partial<GateData>)} className="rounded" />
            Lockable
          </label>
        </div>
      </div>
    </div>
  );
}
