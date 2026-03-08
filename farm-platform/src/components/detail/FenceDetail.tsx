"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, FenceData } from "@/types";

export default function FenceDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as FenceData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
          <select value={data.fenceType ?? ""} onChange={(e) => updateNodeData(node.id, { fenceType: e.target.value || undefined } as Partial<FenceData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="electric">Electric</option>
            <option value="barbed">Barbed Wire</option>
            <option value="woven-wire">Woven Wire</option>
            <option value="board">Board</option>
            <option value="temporary">Temporary</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Length (ft)</label>
          <input type="number" value={data.lengthFt ?? ""} onChange={(e) => updateNodeData(node.id, { lengthFt: e.target.value ? Number(e.target.value) : undefined } as Partial<FenceData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Post Spacing</label>
          <input type="text" value={data.postSpacing ?? ""} onChange={(e) => updateNodeData(node.id, { postSpacing: e.target.value } as Partial<FenceData>)} placeholder="e.g. 8 ft" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Condition</label>
          <select value={data.condition ?? ""} onChange={(e) => updateNodeData(node.id, { condition: e.target.value || undefined } as Partial<FenceData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
      </div>
    </div>
  );
}
