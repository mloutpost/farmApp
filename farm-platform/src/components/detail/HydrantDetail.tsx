"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, HydrantData } from "@/types";

export default function HydrantDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as HydrantData;

  const addMaintenance = () => {
    updateNodeData(node.id, {
      maintenanceLog: [...data.maintenanceLog, { date: new Date().toISOString().slice(0, 10), task: "" }],
    } as Partial<HydrantData>);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Hydrant Type</label>
          <select value={data.hydrantType ?? ""} onChange={(e) => updateNodeData(node.id, { hydrantType: e.target.value || undefined } as Partial<HydrantData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="standpipe">Standpipe</option>
            <option value="frost-free">Frost-Free</option>
            <option value="post">Post Hydrant</option>
            <option value="yard">Yard Hydrant</option>
            <option value="quick-connect">Quick-Connect</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Thread Size</label>
          <input type="text" value={data.threadSize ?? ""} onChange={(e) => updateNodeData(node.id, { threadSize: e.target.value } as Partial<HydrantData>)} placeholder='e.g. 3/4" NH' className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Flow Rate (GPM)</label>
          <input type="number" value={data.flowRateGPM ?? ""} onChange={(e) => updateNodeData(node.id, { flowRateGPM: e.target.value ? Number(e.target.value) : undefined } as Partial<HydrantData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Pressure (PSI)</label>
          <input type="number" value={data.pressurePSI ?? ""} onChange={(e) => updateNodeData(node.id, { pressurePSI: e.target.value ? Number(e.target.value) : undefined } as Partial<HydrantData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div className="col-span-2">
          <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <input type="checkbox" checked={data.frostProof ?? false} onChange={(e) => updateNodeData(node.id, { frostProof: e.target.checked } as Partial<HydrantData>)} className="rounded" />
            Frost-proof design
          </label>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Maintenance Log</h3>
          <button onClick={addMaintenance} className="text-xs text-accent hover:text-accent-hover transition-colors">+ Add</button>
        </div>
        {data.maintenanceLog.length === 0 ? (
          <p className="text-xs text-text-muted">No entries yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data.maintenanceLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-bg px-3 py-2">
                <input type="date" value={entry.date} onChange={(e) => {
                  const log = [...data.maintenanceLog]; log[i] = { ...log[i], date: e.target.value };
                  updateNodeData(node.id, { maintenanceLog: log } as Partial<HydrantData>);
                }} className="bg-transparent text-xs text-text-primary outline-none" />
                <input type="text" value={entry.task} onChange={(e) => {
                  const log = [...data.maintenanceLog]; log[i] = { ...log[i], task: e.target.value };
                  updateNodeData(node.id, { maintenanceLog: log } as Partial<HydrantData>);
                }} placeholder="Task..." className="flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted" />
                <button onClick={() => updateNodeData(node.id, { maintenanceLog: data.maintenanceLog.filter((_, j) => j !== i) } as Partial<HydrantData>)} className="text-xs text-danger shrink-0">x</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
