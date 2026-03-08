"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, CoopData } from "@/types";
import { useState } from "react";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function CoopDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as CoopData;
  const [newBreed, setNewBreed] = useState("");

  const addEggEntry = () => {
    updateNodeData(node.id, {
      eggLog: [...data.eggLog, { date: new Date().toISOString().slice(0, 10), count: 0 }],
    } as Partial<CoopData>);
  };

  const addFlockEvent = () => {
    updateNodeData(node.id, {
      flockLog: [...data.flockLog, { date: new Date().toISOString().slice(0, 10), event: "" }],
    } as Partial<CoopData>);
  };

  const weekAvg = (() => {
    const recent = data.eggLog.slice(-7);
    if (recent.length === 0) return null;
    const total = recent.reduce((s, e) => s + e.count, 0);
    return (total / recent.length).toFixed(1);
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Coop Type</label>
          <select value={data.coopType ?? ""} onChange={(e) => updateNodeData(node.id, { coopType: e.target.value || undefined } as Partial<CoopData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="stationary">Stationary</option>
            <option value="tractor">Chicken Tractor</option>
            <option value="A-frame">A-Frame</option>
            <option value="shed">Shed</option>
            <option value="barn-section">Barn Section</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Bird Type</label>
          <select value={data.birdType ?? ""} onChange={(e) => updateNodeData(node.id, { birdType: e.target.value || undefined } as Partial<CoopData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="chicken-layer">Chicken (Layer)</option>
            <option value="chicken-meat">Chicken (Meat)</option>
            <option value="duck">Duck</option>
            <option value="turkey">Turkey</option>
            <option value="quail">Quail</option>
            <option value="guinea">Guinea</option>
            <option value="goose">Goose</option>
            <option value="mixed">Mixed Flock</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Flock Size</label>
          <input type="number" value={data.flockSize ?? ""} onChange={(e) => updateNodeData(node.id, { flockSize: e.target.value ? Number(e.target.value) : undefined } as Partial<CoopData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Sq. Ft.</label>
          <input type="number" value={data.sqft ?? ""} onChange={(e) => updateNodeData(node.id, { sqft: e.target.value ? Number(e.target.value) : undefined } as Partial<CoopData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Nest Boxes</label>
          <input type="number" value={data.nestBoxes ?? ""} onChange={(e) => updateNodeData(node.id, { nestBoxes: e.target.value ? Number(e.target.value) : undefined } as Partial<CoopData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Egg Color</label>
          <input type="text" value={data.eggColor ?? ""} onChange={(e) => updateNodeData(node.id, { eggColor: e.target.value } as Partial<CoopData>)} placeholder="e.g. Brown, Blue, Mixed" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Feed Type</label>
          <input type="text" value={data.feedType ?? ""} onChange={(e) => updateNodeData(node.id, { feedType: e.target.value } as Partial<CoopData>)} placeholder="e.g. Layer pellet" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Feed (lbs/week)</label>
          <input type="number" value={data.feedLbsPerWeek ?? ""} onChange={(e) => updateNodeData(node.id, { feedLbsPerWeek: e.target.value ? Number(e.target.value) : undefined } as Partial<CoopData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div className="col-span-2 flex gap-4">
          <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <input type="checkbox" checked={data.heatedWater ?? false} onChange={(e) => updateNodeData(node.id, { heatedWater: e.target.checked } as Partial<CoopData>)} className="rounded" />
            Heated Water
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <input type="checkbox" checked={data.supplementalLight ?? false} onChange={(e) => updateNodeData(node.id, { supplementalLight: e.target.checked } as Partial<CoopData>)} className="rounded" />
            Supplemental Light
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Breeds</h3>
        <div className="flex gap-2 mb-2">
          <input type="text" value={newBreed} onChange={(e) => setNewBreed(e.target.value)} onKeyDown={(e) => {
            if (e.key === "Enter" && newBreed.trim()) {
              updateNodeData(node.id, { breeds: [...data.breeds, newBreed.trim()] } as Partial<CoopData>);
              setNewBreed("");
            }
          }} placeholder="Add breed..." className="flex-1 rounded-md border border-border bg-bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted" />
          <button onClick={() => {
            if (newBreed.trim()) {
              updateNodeData(node.id, { breeds: [...data.breeds, newBreed.trim()] } as Partial<CoopData>);
              setNewBreed("");
            }
          }} className="text-xs text-accent hover:text-accent-hover">Add</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.breeds.map((b, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-xs text-text-secondary">
              {b}
              <button onClick={() => updateNodeData(node.id, { breeds: data.breeds.filter((_, j) => j !== i) } as Partial<CoopData>)} className="text-danger hover:text-danger/80">x</button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Egg Log
            {weekAvg && <span className="ml-2 text-xs font-normal text-text-muted">({weekAvg} avg/day last 7)</span>}
          </h3>
          <button onClick={addEggEntry} className="text-xs text-accent hover:text-accent-hover transition-colors">+ Add</button>
        </div>
        {data.eggLog.length === 0 ? (
          <p className="text-xs text-text-muted">No entries yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data.eggLog.slice(-14).reverse().map((entry, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-bg px-3 py-2">
                <input type="date" value={entry.date} onChange={(e) => {
                  const log = [...data.eggLog];
                  const idx = data.eggLog.length - 1 - i;
                  log[idx] = { ...log[idx], date: e.target.value };
                  updateNodeData(node.id, { eggLog: log } as Partial<CoopData>);
                }} className="bg-transparent text-xs text-text-primary outline-none" />
                <input type="number" value={entry.count} onChange={(e) => {
                  const log = [...data.eggLog];
                  const idx = data.eggLog.length - 1 - i;
                  log[idx] = { ...log[idx], count: Number(e.target.value) || 0 };
                  updateNodeData(node.id, { eggLog: log } as Partial<CoopData>);
                }} className="w-16 bg-transparent text-xs text-text-primary outline-none border-b border-border text-center" />
                <span className="text-[10px] text-text-muted">eggs</span>
                <input type="text" value={entry.notes ?? ""} onChange={(e) => {
                  const log = [...data.eggLog];
                  const idx = data.eggLog.length - 1 - i;
                  log[idx] = { ...log[idx], notes: e.target.value };
                  updateNodeData(node.id, { eggLog: log } as Partial<CoopData>);
                }} placeholder="Notes..." className="flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted" />
                <button onClick={() => {
                  const idx = data.eggLog.length - 1 - i;
                  updateNodeData(node.id, { eggLog: data.eggLog.filter((_, j) => j !== idx) } as Partial<CoopData>);
                }} className="text-xs text-danger shrink-0">x</button>
              </div>
            ))}
            {data.eggLog.length > 14 && <p className="text-[10px] text-text-muted text-center">Showing last 14 of {data.eggLog.length}</p>}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Flock Events</h3>
          <button onClick={addFlockEvent} className="text-xs text-accent hover:text-accent-hover transition-colors">+ Add</button>
        </div>
        {data.flockLog.length === 0 ? (
          <p className="text-xs text-text-muted">No events yet.</p>
        ) : (
          <div className="space-y-1.5">
            {data.flockLog.slice().reverse().map((entry, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-bg px-3 py-2">
                <input type="date" value={entry.date} onChange={(e) => {
                  const log = [...data.flockLog];
                  const idx = data.flockLog.length - 1 - i;
                  log[idx] = { ...log[idx], date: e.target.value };
                  updateNodeData(node.id, { flockLog: log } as Partial<CoopData>);
                }} className="bg-transparent text-xs text-text-primary outline-none" />
                <select value={entry.event} onChange={(e) => {
                  const log = [...data.flockLog];
                  const idx = data.flockLog.length - 1 - i;
                  log[idx] = { ...log[idx], event: e.target.value };
                  updateNodeData(node.id, { flockLog: log } as Partial<CoopData>);
                }} className="bg-transparent text-xs text-text-primary outline-none">
                  <option value="">Event...</option>
                  <option value="added">Added Birds</option>
                  <option value="lost">Lost / Died</option>
                  <option value="hatched">Hatched</option>
                  <option value="processed">Processed</option>
                  <option value="sold">Sold</option>
                  <option value="broody">Went Broody</option>
                  <option value="molting">Molting</option>
                  <option value="treated">Treated / Medicated</option>
                  <option value="other">Other</option>
                </select>
                <input type="number" value={entry.count ?? ""} onChange={(e) => {
                  const log = [...data.flockLog];
                  const idx = data.flockLog.length - 1 - i;
                  log[idx] = { ...log[idx], count: e.target.value ? Number(e.target.value) : undefined };
                  updateNodeData(node.id, { flockLog: log } as Partial<CoopData>);
                }} placeholder="#" className="w-12 bg-transparent text-xs text-text-primary outline-none border-b border-border placeholder:text-text-muted" />
                <button onClick={() => {
                  const idx = data.flockLog.length - 1 - i;
                  updateNodeData(node.id, { flockLog: data.flockLog.filter((_, j) => j !== idx) } as Partial<CoopData>);
                }} className="text-xs text-danger shrink-0">x</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
