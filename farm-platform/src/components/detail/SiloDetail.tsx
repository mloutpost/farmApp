"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, SiloData } from "@/types";

export default function SiloDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as SiloData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
          <select value={data.siloType ?? ""} onChange={(e) => updateNodeData(node.id, { siloType: e.target.value || undefined } as Partial<SiloData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="upright">Upright Silo</option>
            <option value="bunker">Bunker Silo</option>
            <option value="bag">Silage Bag</option>
            <option value="grain-bin">Grain Bin</option>
            <option value="flat-storage">Flat Storage</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Condition</label>
          <select value={data.condition ?? ""} onChange={(e) => updateNodeData(node.id, { condition: e.target.value || undefined } as Partial<SiloData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Capacity (bushels)</label>
          <input type="number" value={data.capacityBushels ?? ""} onChange={(e) => updateNodeData(node.id, { capacityBushels: e.target.value ? Number(e.target.value) : undefined } as Partial<SiloData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Capacity (tons)</label>
          <input type="number" value={data.capacityTons ?? ""} onChange={(e) => updateNodeData(node.id, { capacityTons: e.target.value ? Number(e.target.value) : undefined } as Partial<SiloData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Current Contents</label>
          <input type="text" value={data.currentContents ?? ""} onChange={(e) => updateNodeData(node.id, { currentContents: e.target.value } as Partial<SiloData>)} placeholder="e.g. Corn, Wheat" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Fill Level (%)</label>
          <input type="number" value={data.fillLevel ?? ""} onChange={(e) => updateNodeData(node.id, { fillLevel: e.target.value ? Number(e.target.value) : undefined } as Partial<SiloData>)} min="0" max="100" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1">Conditioning</label>
          <select value={data.conditioningType ?? ""} onChange={(e) => updateNodeData(node.id, { conditioningType: e.target.value || undefined } as Partial<SiloData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">None</option>
            <option value="aeration">Aeration</option>
            <option value="drying">Drying</option>
          </select>
        </div>
      </div>

      {data.fillLevel != null && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-muted">Fill Level</span>
            <span className="text-xs font-medium text-text-primary">{data.fillLevel}%</span>
          </div>
          <div className="h-2 rounded-full bg-bg overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, Math.max(0, data.fillLevel))}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
