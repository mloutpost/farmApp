"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, CorralData } from "@/types";

export default function CorralDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as CorralData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Purpose</label>
          <select value={data.purpose ?? ""} onChange={(e) => updateNodeData(node.id, { purpose: e.target.value || undefined } as Partial<CorralData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="holding">Holding Pen</option>
            <option value="sorting">Sorting</option>
            <option value="loading">Loading Chute</option>
            <option value="training">Training Arena</option>
            <option value="run">Animal Run</option>
            <option value="exercise">Exercise Lot</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Surface</label>
          <select value={data.surfaceType ?? ""} onChange={(e) => updateNodeData(node.id, { surfaceType: e.target.value || undefined } as Partial<CorralData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="dirt">Dirt</option>
            <option value="gravel">Gravel</option>
            <option value="concrete">Concrete</option>
            <option value="grass">Grass</option>
            <option value="sand">Sand</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Sq. Ft.</label>
          <input type="number" value={data.sqft ?? ""} onChange={(e) => updateNodeData(node.id, { sqft: e.target.value ? Number(e.target.value) : undefined } as Partial<CorralData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Capacity</label>
          <input type="text" value={data.capacity ?? ""} onChange={(e) => updateNodeData(node.id, { capacity: e.target.value } as Partial<CorralData>)} placeholder="e.g. 20 head" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Shelter</label>
          <input type="text" value={data.shelterType ?? ""} onChange={(e) => updateNodeData(node.id, { shelterType: e.target.value } as Partial<CorralData>)} placeholder="e.g. 3-sided lean-to" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Animals</label>
          <input type="text" value={data.animals ?? ""} onChange={(e) => updateNodeData(node.id, { animals: e.target.value } as Partial<CorralData>)} placeholder="e.g. Cattle, Horses" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
      </div>
    </div>
  );
}
