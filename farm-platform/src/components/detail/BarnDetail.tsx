"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, BarnData } from "@/types";

export default function BarnDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as BarnData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Purpose</label>
          <select value={data.purpose ?? ""} onChange={(e) => updateNodeData(node.id, { purpose: e.target.value || undefined } as Partial<BarnData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="equipment">Equipment Storage</option>
            <option value="livestock">Livestock Shelter</option>
            <option value="hay">Hay Storage</option>
            <option value="workshop">Workshop</option>
            <option value="greenhouse">Greenhouse</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Dimensions</label>
          <input type="text" value={data.dimensions ?? ""} onChange={(e) => updateNodeData(node.id, { dimensions: e.target.value } as Partial<BarnData>)} placeholder="e.g. 40x60 ft" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1">Capacity</label>
          <input type="text" value={data.capacity ?? ""} onChange={(e) => updateNodeData(node.id, { capacity: e.target.value } as Partial<BarnData>)} placeholder="e.g. 200 bales, 4 stalls" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Equipment (comma-separated)</label>
        <input
          type="text"
          value={data.equipment.join(", ")}
          onChange={(e) => updateNodeData(node.id, { equipment: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) } as Partial<BarnData>)}
          placeholder="e.g. Tractor, Mower, Tiller"
          className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
        />
      </div>
    </div>
  );
}
