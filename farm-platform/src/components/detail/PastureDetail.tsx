"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, PastureData, GrazingEntry } from "@/types";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function PastureDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as PastureData;

  const addGrazing = () => {
    const entry: GrazingEntry = { id: uid(), dateIn: new Date().toISOString().split("T")[0], headCount: data.headCount ?? 0 };
    updateNodeData(node.id, { grazingLog: [...data.grazingLog, entry] } as Partial<PastureData>);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Acreage</label>
          <input type="number" value={data.acreage ?? ""} onChange={(e) => updateNodeData(node.id, { acreage: e.target.value ? Number(e.target.value) : undefined } as Partial<PastureData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" step="0.1" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Forage Type</label>
          <input type="text" value={data.forageType ?? ""} onChange={(e) => updateNodeData(node.id, { forageType: e.target.value } as Partial<PastureData>)} placeholder="e.g. Fescue" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Livestock Species</label>
          <input type="text" value={data.livestockSpecies ?? ""} onChange={(e) => updateNodeData(node.id, { livestockSpecies: e.target.value } as Partial<PastureData>)} placeholder="e.g. Cattle" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Head Count</label>
          <input type="number" value={data.headCount ?? ""} onChange={(e) => updateNodeData(node.id, { headCount: e.target.value ? Number(e.target.value) : undefined } as Partial<PastureData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Breed</label>
          <input type="text" value={data.livestockBreed ?? ""} onChange={(e) => updateNodeData(node.id, { livestockBreed: e.target.value } as Partial<PastureData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Carrying Capacity</label>
          <input type="text" value={data.carryingCapacity ?? ""} onChange={(e) => updateNodeData(node.id, { carryingCapacity: e.target.value } as Partial<PastureData>)} placeholder="e.g. 1 AU per 2 acres" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Grazing Rotation</h3>
          <button onClick={addGrazing} className="text-xs font-medium text-accent hover:text-accent-hover transition-colors">+ Log Rotation</button>
        </div>
        {data.grazingLog.length === 0 ? (
          <p className="text-xs text-text-muted">No grazing rotations logged.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {data.grazingLog.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-md bg-bg-surface px-3 py-2">
                <span className="text-xs text-text-muted shrink-0">{g.dateIn}</span>
                {g.dateOut && <span className="text-xs text-text-muted">to {g.dateOut}</span>}
                <span className="text-xs text-accent">{g.headCount} head</span>
                {g.notes && <span className="text-xs text-text-muted truncate">{g.notes}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
