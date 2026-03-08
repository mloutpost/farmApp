"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, BeehiveData } from "@/types";

export default function BeehiveDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as BeehiveData;

  const addInspection = () => {
    updateNodeData(node.id, {
      inspectionLog: [...data.inspectionLog, { date: new Date().toISOString().slice(0, 10), notes: "" }],
    } as Partial<BeehiveData>);
  };

  const addHarvest = () => {
    updateNodeData(node.id, {
      harvestLog: [...data.harvestLog, { date: new Date().toISOString().slice(0, 10) }],
    } as Partial<BeehiveData>);
  };

  const addTreatment = () => {
    updateNodeData(node.id, {
      treatments: [...data.treatments, { date: new Date().toISOString().slice(0, 10), product: "" }],
    } as Partial<BeehiveData>);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Hive Type</label>
          <select value={data.hiveType ?? ""} onChange={(e) => updateNodeData(node.id, { hiveType: e.target.value || undefined } as Partial<BeehiveData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="langstroth">Langstroth</option>
            <option value="top-bar">Top Bar</option>
            <option value="warre">Warre</option>
            <option value="flow-hive">Flow Hive</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Colony Count</label>
          <input type="number" value={data.colonyCount ?? ""} onChange={(e) => updateNodeData(node.id, { colonyCount: e.target.value ? Number(e.target.value) : undefined } as Partial<BeehiveData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Queen Status</label>
          <select value={data.queenStatus ?? ""} onChange={(e) => updateNodeData(node.id, { queenStatus: e.target.value || undefined } as Partial<BeehiveData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Unknown</option>
            <option value="present">Present</option>
            <option value="queenless">Queenless</option>
            <option value="supersedure">Supersedure Cell</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Honey Supers</label>
          <input type="number" value={data.honeySupers ?? ""} onChange={(e) => updateNodeData(node.id, { honeySupers: e.target.value ? Number(e.target.value) : undefined } as Partial<BeehiveData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Last Inspection</label>
          <input type="date" value={data.lastInspection ?? ""} onChange={(e) => updateNodeData(node.id, { lastInspection: e.target.value } as Partial<BeehiveData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Inspection Log</h3>
          <button onClick={addInspection} className="text-xs text-accent hover:text-accent-hover transition-colors">+ Add</button>
        </div>
        {data.inspectionLog.length === 0 ? (
          <p className="text-xs text-text-muted">No inspections recorded.</p>
        ) : (
          <div className="space-y-2">
            {data.inspectionLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md bg-bg px-3 py-2">
                <input type="date" value={entry.date} onChange={(e) => {
                  const log = [...data.inspectionLog];
                  log[i] = { ...log[i], date: e.target.value };
                  updateNodeData(node.id, { inspectionLog: log } as Partial<BeehiveData>);
                }} className="bg-transparent text-xs text-text-primary outline-none shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1 text-[10px] text-text-muted">
                      <input type="checkbox" checked={entry.queenSeen ?? false} onChange={(e) => {
                        const log = [...data.inspectionLog];
                        log[i] = { ...log[i], queenSeen: e.target.checked };
                        updateNodeData(node.id, { inspectionLog: log } as Partial<BeehiveData>);
                      }} className="rounded" /> Queen
                    </label>
                    <input type="number" value={entry.miteCount ?? ""} onChange={(e) => {
                      const log = [...data.inspectionLog];
                      log[i] = { ...log[i], miteCount: e.target.value ? Number(e.target.value) : undefined };
                      updateNodeData(node.id, { inspectionLog: log } as Partial<BeehiveData>);
                    }} placeholder="Mites" className="w-16 bg-transparent text-[10px] text-text-primary outline-none border-b border-border placeholder:text-text-muted" />
                  </div>
                  <input type="text" value={entry.notes ?? ""} onChange={(e) => {
                    const log = [...data.inspectionLog];
                    log[i] = { ...log[i], notes: e.target.value };
                    updateNodeData(node.id, { inspectionLog: log } as Partial<BeehiveData>);
                  }} placeholder="Notes..." className="w-full bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted" />
                </div>
                <button onClick={() => updateNodeData(node.id, { inspectionLog: data.inspectionLog.filter((_, j) => j !== i) } as Partial<BeehiveData>)} className="text-xs text-danger shrink-0">x</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Honey Harvest</h3>
          <button onClick={addHarvest} className="text-xs text-accent hover:text-accent-hover transition-colors">+ Add</button>
        </div>
        {data.harvestLog.length === 0 ? (
          <p className="text-xs text-text-muted">No harvests recorded.</p>
        ) : (
          <div className="space-y-2">
            {data.harvestLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-bg px-3 py-2">
                <input type="date" value={entry.date} onChange={(e) => {
                  const log = [...data.harvestLog];
                  log[i] = { ...log[i], date: e.target.value };
                  updateNodeData(node.id, { harvestLog: log } as Partial<BeehiveData>);
                }} className="bg-transparent text-xs text-text-primary outline-none" />
                <input type="number" value={entry.poundsHoney ?? ""} onChange={(e) => {
                  const log = [...data.harvestLog];
                  log[i] = { ...log[i], poundsHoney: e.target.value ? Number(e.target.value) : undefined };
                  updateNodeData(node.id, { harvestLog: log } as Partial<BeehiveData>);
                }} placeholder="lbs honey" className="w-20 bg-transparent text-xs text-text-primary outline-none border-b border-border placeholder:text-text-muted" />
                <input type="number" value={entry.poundsWax ?? ""} onChange={(e) => {
                  const log = [...data.harvestLog];
                  log[i] = { ...log[i], poundsWax: e.target.value ? Number(e.target.value) : undefined };
                  updateNodeData(node.id, { harvestLog: log } as Partial<BeehiveData>);
                }} placeholder="lbs wax" className="w-20 bg-transparent text-xs text-text-primary outline-none border-b border-border placeholder:text-text-muted" />
                <button onClick={() => updateNodeData(node.id, { harvestLog: data.harvestLog.filter((_, j) => j !== i) } as Partial<BeehiveData>)} className="text-xs text-danger shrink-0">x</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Treatments</h3>
          <button onClick={addTreatment} className="text-xs text-accent hover:text-accent-hover transition-colors">+ Add</button>
        </div>
        {data.treatments.length === 0 ? (
          <p className="text-xs text-text-muted">No treatments recorded.</p>
        ) : (
          <div className="space-y-2">
            {data.treatments.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-bg px-3 py-2">
                <input type="date" value={entry.date} onChange={(e) => {
                  const list = [...data.treatments];
                  list[i] = { ...list[i], date: e.target.value };
                  updateNodeData(node.id, { treatments: list } as Partial<BeehiveData>);
                }} className="bg-transparent text-xs text-text-primary outline-none" />
                <input type="text" value={entry.product} onChange={(e) => {
                  const list = [...data.treatments];
                  list[i] = { ...list[i], product: e.target.value };
                  updateNodeData(node.id, { treatments: list } as Partial<BeehiveData>);
                }} placeholder="Product" className="flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted" />
                <button onClick={() => updateNodeData(node.id, { treatments: data.treatments.filter((_, j) => j !== i) } as Partial<BeehiveData>)} className="text-xs text-danger shrink-0">x</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
