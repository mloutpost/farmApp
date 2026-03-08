"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, DitchData } from "@/types";

export default function DitchDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as DitchData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
          <select value={data.ditchType ?? ""} onChange={(e) => updateNodeData(node.id, { ditchType: e.target.value || undefined } as Partial<DitchData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="open">Open Ditch</option>
            <option value="tiled">Tiled / Tile Drain</option>
            <option value="french-drain">French Drain</option>
            <option value="swale">Swale</option>
            <option value="grassed-waterway">Grassed Waterway</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Condition</label>
          <select value={data.condition ?? ""} onChange={(e) => updateNodeData(node.id, { condition: e.target.value || undefined } as Partial<DitchData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Length (ft)</label>
          <input type="number" value={data.lengthFt ?? ""} onChange={(e) => updateNodeData(node.id, { lengthFt: e.target.value ? Number(e.target.value) : undefined } as Partial<DitchData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Depth (ft)</label>
          <input type="number" value={data.depthFt ?? ""} onChange={(e) => updateNodeData(node.id, { depthFt: e.target.value ? Number(e.target.value) : undefined } as Partial<DitchData>)} step="0.5" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Drainage Area</label>
          <input type="text" value={data.drainageArea ?? ""} onChange={(e) => updateNodeData(node.id, { drainageArea: e.target.value } as Partial<DitchData>)} placeholder="e.g. North field, 15 acres" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Outlet To</label>
          <input type="text" value={data.outletTo ?? ""} onChange={(e) => updateNodeData(node.id, { outletTo: e.target.value } as Partial<DitchData>)} placeholder="e.g. Creek, pond" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Maintenance Notes</label>
        <textarea value={data.maintenanceNotes ?? ""} onChange={(e) => updateNodeData(node.id, { maintenanceNotes: e.target.value } as Partial<DitchData>)} rows={2} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" placeholder="Cleaning schedule, problem spots..." />
      </div>
    </div>
  );
}
