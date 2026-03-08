"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, StreamData } from "@/types";

export default function StreamDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as StreamData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Approximate Flow</label>
          <input type="text" value={data.flow ?? ""} onChange={(e) => updateNodeData(node.id, { flow: e.target.value } as Partial<StreamData>)} placeholder="e.g. 20 GPM" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={!data.seasonal}
              onChange={(e) => updateNodeData(node.id, { seasonal: !e.target.checked } as Partial<StreamData>)}
              className="rounded border-border"
            />
            Perennial (year-round)
          </label>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Riparian Buffer (ft)</label>
          <input type="number" value={data.riparianBufferFt ?? ""} onChange={(e) => updateNodeData(node.id, { riparianBufferFt: e.target.value ? Number(e.target.value) : undefined } as Partial<StreamData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Erosion Notes</label>
        <textarea value={data.erosionNotes ?? ""} onChange={(e) => updateNodeData(node.id, { erosionNotes: e.target.value } as Partial<StreamData>)} placeholder="Note any erosion concerns..." rows={2} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Water Rights / Usage Notes</label>
        <textarea value={data.waterRights ?? ""} onChange={(e) => updateNodeData(node.id, { waterRights: e.target.value } as Partial<StreamData>)} rows={2} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary resize-none" />
      </div>
    </div>
  );
}
