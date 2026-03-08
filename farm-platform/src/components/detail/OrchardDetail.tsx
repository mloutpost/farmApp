"use client";

import { useFarmStore } from "@/store/farm-store";
import CropPicker, { CropInfoCard } from "./CropPicker";
import type { CropEntry } from "@/lib/crop-catalog";
import type { FarmNode, OrchardData } from "@/types";
import type { CropCategory } from "@/lib/crop-catalog";

const TREE_CATEGORIES: CropCategory[] = ["tree", "fruit"];

export default function OrchardDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as OrchardData;

  const handleTreeSelect = (crop: string, entry: CropEntry | null) => {
    const updates: Partial<OrchardData> = {};
    if (entry) {
      updates.catalogId = entry.id;
      if (entry.treesPerAcre) updates.spacing = `~${entry.treesPerAcre} trees/acre`;
      if (entry.productiveLifeYears) updates.productiveYears = entry.productiveLifeYears;
      if (!data.varieties.includes(crop)) {
        updates.varieties = [...data.varieties, crop];
      }
    } else if (crop && !data.varieties.includes(crop)) {
      updates.varieties = [...data.varieties, crop];
      updates.catalogId = undefined;
    }
    updateNodeData(node.id, updates as Partial<OrchardData>);
  };

  const removeVariety = (v: string) => {
    updateNodeData(node.id, { varieties: data.varieties.filter((x) => x !== v) } as Partial<OrchardData>);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Acreage</label>
          <input type="number" value={data.acreage ?? ""} onChange={(e) => updateNodeData(node.id, { acreage: e.target.value ? Number(e.target.value) : undefined } as Partial<OrchardData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" step="0.1" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Tree Count</label>
          <input type="number" value={data.treeCount ?? ""} onChange={(e) => updateNodeData(node.id, { treeCount: e.target.value ? Number(e.target.value) : undefined } as Partial<OrchardData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Spacing</label>
          <input type="text" value={data.spacing ?? ""} onChange={(e) => updateNodeData(node.id, { spacing: e.target.value } as Partial<OrchardData>)} placeholder="e.g. 15ft x 20ft" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Rootstock</label>
          <input type="text" value={data.rootstock ?? ""} onChange={(e) => updateNodeData(node.id, { rootstock: e.target.value } as Partial<OrchardData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Tree Age (years)</label>
          <input type="number" value={data.treeAge ?? ""} onChange={(e) => updateNodeData(node.id, { treeAge: e.target.value ? Number(e.target.value) : undefined } as Partial<OrchardData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Productive Years</label>
          <input type="number" value={data.productiveYears ?? ""} onChange={(e) => updateNodeData(node.id, { productiveYears: e.target.value ? Number(e.target.value) : undefined } as Partial<OrchardData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Add Tree/Crop Type</label>
        <div className="rounded-md border border-border bg-bg-surface px-3 py-2">
          <CropPicker
            value=""
            categories={TREE_CATEGORIES}
            placeholder="Search tree & fruit crops..."
            onChange={handleTreeSelect}
          />
        </div>
      </div>

      {data.catalogId && <CropInfoCard catalogId={data.catalogId} />}

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2">Varieties</label>
        {data.varieties.length === 0 ? (
          <p className="text-xs text-text-muted">No varieties added. Use the picker above to add tree types.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.varieties.map((v) => (
              <span key={v} className="flex items-center gap-1.5 rounded-md bg-accent/10 border border-accent/20 px-2.5 py-1 text-xs text-text-primary">
                {v}
                <button onClick={() => removeVariety(v)} className="text-text-muted hover:text-danger transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
