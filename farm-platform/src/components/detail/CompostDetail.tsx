"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, CompostData } from "@/types";

export default function CompostDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as CompostData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
          <select value={data.compostType ?? ""} onChange={(e) => updateNodeData(node.id, { compostType: e.target.value || undefined } as Partial<CompostData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="static">Static Pile</option>
            <option value="tumbler">Tumbler</option>
            <option value="windrow">Windrow</option>
            <option value="vermicompost">Vermicompost</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Volume (cu yards)</label>
          <input type="number" value={data.volumeCuYards ?? ""} onChange={(e) => updateNodeData(node.id, { volumeCuYards: e.target.value ? Number(e.target.value) : undefined } as Partial<CompostData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1">Current Stage</label>
          <div className="flex gap-2">
            {(["building", "active", "curing", "finished"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateNodeData(node.id, { stage: s } as Partial<CompostData>)}
                className={`rounded-md px-3 py-2 text-xs font-medium capitalize transition-colors ${
                  data.stage === s ? "bg-accent/20 text-accent" : "bg-bg-surface text-text-secondary hover:text-text-primary border border-border"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
