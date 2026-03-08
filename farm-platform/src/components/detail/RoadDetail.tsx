"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, RoadData } from "@/types";

export default function RoadDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as RoadData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
          <select value={data.roadType ?? ""} onChange={(e) => updateNodeData(node.id, { roadType: e.target.value || undefined } as Partial<RoadData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="paved">Paved</option>
            <option value="gravel">Gravel</option>
            <option value="dirt">Dirt</option>
            <option value="improved">Improved Dirt</option>
            <option value="two-track">Two-track</option>
            <option value="path">Path / Trail</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Surface</label>
          <input type="text" value={data.surface ?? ""} onChange={(e) => updateNodeData(node.id, { surface: e.target.value } as Partial<RoadData>)} placeholder="e.g. #57 gravel" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Length (ft)</label>
          <input type="number" value={data.lengthFt ?? ""} onChange={(e) => updateNodeData(node.id, { lengthFt: e.target.value ? Number(e.target.value) : undefined } as Partial<RoadData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Width (ft)</label>
          <input type="number" value={data.widthFt ?? ""} onChange={(e) => updateNodeData(node.id, { widthFt: e.target.value ? Number(e.target.value) : undefined } as Partial<RoadData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Load Rating</label>
          <input type="text" value={data.loadRating ?? ""} onChange={(e) => updateNodeData(node.id, { loadRating: e.target.value } as Partial<RoadData>)} placeholder="e.g. Heavy equipment" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Maintenance</label>
          <input type="text" value={data.maintenanceSchedule ?? ""} onChange={(e) => updateNodeData(node.id, { maintenanceSchedule: e.target.value } as Partial<RoadData>)} placeholder="e.g. Grade annually" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Drainage Notes</label>
        <textarea value={data.drainageNotes ?? ""} onChange={(e) => updateNodeData(node.id, { drainageNotes: e.target.value } as Partial<RoadData>)} rows={2} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" placeholder="Culverts, problem areas..." />
      </div>
    </div>
  );
}
