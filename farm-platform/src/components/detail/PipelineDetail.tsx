"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, PipelineData } from "@/types";

export default function PipelineDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as PipelineData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Pipe Material</label>
          <select value={data.pipeType ?? ""} onChange={(e) => updateNodeData(node.id, { pipeType: e.target.value || undefined } as Partial<PipelineData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="pvc">PVC</option>
            <option value="hdpe">HDPE</option>
            <option value="galvanized">Galvanized Steel</option>
            <option value="copper">Copper</option>
            <option value="poly">Poly Pipe</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Contents</label>
          <select value={data.contents ?? ""} onChange={(e) => updateNodeData(node.id, { contents: e.target.value || undefined } as Partial<PipelineData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="water">Water</option>
            <option value="gas">Gas</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Diameter (in)</label>
          <input type="number" value={data.diameterIn ?? ""} onChange={(e) => updateNodeData(node.id, { diameterIn: e.target.value ? Number(e.target.value) : undefined } as Partial<PipelineData>)} step="0.25" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Length (ft)</label>
          <input type="number" value={data.lengthFt ?? ""} onChange={(e) => updateNodeData(node.id, { lengthFt: e.target.value ? Number(e.target.value) : undefined } as Partial<PipelineData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Buried Depth (in)</label>
          <input type="number" value={data.buriedDepthIn ?? ""} onChange={(e) => updateNodeData(node.id, { buriedDepthIn: e.target.value ? Number(e.target.value) : undefined } as Partial<PipelineData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Pressure Rating</label>
          <input type="text" value={data.pressureRating ?? ""} onChange={(e) => updateNodeData(node.id, { pressureRating: e.target.value } as Partial<PipelineData>)} placeholder="e.g. 160 PSI" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
      </div>
    </div>
  );
}
