"use client";

import { useState } from "react";
import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, WoodlotData } from "@/types";

export default function WoodlotDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as WoodlotData;
  const [newSpecies, setNewSpecies] = useState("");

  const addHarvest = () => {
    updateNodeData(node.id, {
      harvestLog: [...data.harvestLog, { date: new Date().toISOString().slice(0, 10) }],
    } as Partial<WoodlotData>);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Purpose</label>
          <select value={data.purpose ?? ""} onChange={(e) => updateNodeData(node.id, { purpose: e.target.value || undefined } as Partial<WoodlotData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="firewood">Firewood</option>
            <option value="timber">Timber / Lumber</option>
            <option value="maple-syrup">Maple Syrup</option>
            <option value="nut-harvest">Nut Harvest</option>
            <option value="conservation">Conservation</option>
            <option value="mixed">Mixed Use</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Acreage</label>
          <input type="number" value={data.acreage ?? ""} onChange={(e) => updateNodeData(node.id, { acreage: e.target.value ? Number(e.target.value) : undefined } as Partial<WoodlotData>)} step="0.1" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Cords on Hand</label>
          <input type="number" value={data.cordsOnHand ?? ""} onChange={(e) => updateNodeData(node.id, { cordsOnHand: e.target.value ? Number(e.target.value) : undefined } as Partial<WoodlotData>)} step="0.5" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Board Feet (est.)</label>
          <input type="number" value={data.boardFeetEstimate ?? ""} onChange={(e) => updateNodeData(node.id, { boardFeetEstimate: e.target.value ? Number(e.target.value) : undefined } as Partial<WoodlotData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1">Last Harvest</label>
          <input type="date" value={data.lastHarvestDate ?? ""} onChange={(e) => updateNodeData(node.id, { lastHarvestDate: e.target.value } as Partial<WoodlotData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Primary Species</h3>
        <div className="flex gap-2 mb-2">
          <input type="text" value={newSpecies} onChange={(e) => setNewSpecies(e.target.value)} onKeyDown={(e) => {
            if (e.key === "Enter" && newSpecies.trim()) {
              updateNodeData(node.id, { primarySpecies: [...data.primarySpecies, newSpecies.trim()] } as Partial<WoodlotData>);
              setNewSpecies("");
            }
          }} placeholder="e.g. Red Oak, Maple..." className="flex-1 rounded-md border border-border bg-bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted" />
          <button onClick={() => {
            if (newSpecies.trim()) {
              updateNodeData(node.id, { primarySpecies: [...data.primarySpecies, newSpecies.trim()] } as Partial<WoodlotData>);
              setNewSpecies("");
            }
          }} className="text-xs text-accent hover:text-accent-hover">Add</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.primarySpecies.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-xs text-text-secondary">
              {s}
              <button onClick={() => updateNodeData(node.id, { primarySpecies: data.primarySpecies.filter((_, j) => j !== i) } as Partial<WoodlotData>)} className="text-danger hover:text-danger/80">x</button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Harvest Log</h3>
          <button onClick={addHarvest} className="text-xs text-accent hover:text-accent-hover transition-colors">+ Add</button>
        </div>
        {data.harvestLog.length === 0 ? (
          <p className="text-xs text-text-muted">No harvests logged.</p>
        ) : (
          <div className="space-y-2">
            {data.harvestLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-bg px-3 py-2">
                <input type="date" value={entry.date} onChange={(e) => {
                  const log = [...data.harvestLog]; log[i] = { ...log[i], date: e.target.value };
                  updateNodeData(node.id, { harvestLog: log } as Partial<WoodlotData>);
                }} className="bg-transparent text-xs text-text-primary outline-none" />
                <input type="text" value={entry.species ?? ""} onChange={(e) => {
                  const log = [...data.harvestLog]; log[i] = { ...log[i], species: e.target.value };
                  updateNodeData(node.id, { harvestLog: log } as Partial<WoodlotData>);
                }} placeholder="Species" className="w-24 bg-transparent text-xs text-text-primary outline-none border-b border-border placeholder:text-text-muted" />
                <input type="number" value={entry.cords ?? ""} onChange={(e) => {
                  const log = [...data.harvestLog]; log[i] = { ...log[i], cords: e.target.value ? Number(e.target.value) : undefined };
                  updateNodeData(node.id, { harvestLog: log } as Partial<WoodlotData>);
                }} placeholder="Cords" className="w-16 bg-transparent text-xs text-text-primary outline-none border-b border-border placeholder:text-text-muted" />
                <input type="number" value={entry.boardFeet ?? ""} onChange={(e) => {
                  const log = [...data.harvestLog]; log[i] = { ...log[i], boardFeet: e.target.value ? Number(e.target.value) : undefined };
                  updateNodeData(node.id, { harvestLog: log } as Partial<WoodlotData>);
                }} placeholder="Bd ft" className="w-16 bg-transparent text-xs text-text-primary outline-none border-b border-border placeholder:text-text-muted" />
                <button onClick={() => updateNodeData(node.id, { harvestLog: data.harvestLog.filter((_, j) => j !== i) } as Partial<WoodlotData>)} className="text-xs text-danger shrink-0">x</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Management Notes</label>
        <textarea value={data.managementNotes ?? ""} onChange={(e) => updateNodeData(node.id, { managementNotes: e.target.value } as Partial<WoodlotData>)} rows={3} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" placeholder="Thinning plans, trails, wildlife..." />
      </div>
    </div>
  );
}
