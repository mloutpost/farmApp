"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, SmokehouseData } from "@/types";

export default function SmokehouseDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as SmokehouseData;

  const addSmokingEntry = () => {
    updateNodeData(node.id, {
      smokingLog: [...data.smokingLog, { date: new Date().toISOString().slice(0, 10), product: "" }],
    } as Partial<SmokehouseData>);
  };

  const addRecipe = () => {
    updateNodeData(node.id, {
      brineRecipes: [...data.brineRecipes, { name: "", ingredients: "" }],
    } as Partial<SmokehouseData>);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Smoker Type</label>
          <select value={data.smokerType ?? ""} onChange={(e) => updateNodeData(node.id, { smokerType: e.target.value || undefined } as Partial<SmokehouseData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="offset">Offset Smoker</option>
            <option value="vertical">Vertical / Cabinet</option>
            <option value="cold-smoke">Cold Smoker</option>
            <option value="hot-smoke">Hot Smoker</option>
            <option value="smokehouse-building">Smokehouse Building</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Fuel / Wood</label>
          <select value={data.fuelType ?? ""} onChange={(e) => updateNodeData(node.id, { fuelType: e.target.value || undefined } as Partial<SmokehouseData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="hickory">Hickory</option>
            <option value="oak">Oak</option>
            <option value="mesquite">Mesquite</option>
            <option value="apple">Apple</option>
            <option value="cherry">Cherry</option>
            <option value="pecan">Pecan</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1">Capacity</label>
          <input type="text" value={data.capacity ?? ""} onChange={(e) => updateNodeData(node.id, { capacity: e.target.value } as Partial<SmokehouseData>)} placeholder="e.g. 4 racks, ~100 lbs" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Smoking Log</h3>
          <button onClick={addSmokingEntry} className="text-xs text-accent hover:text-accent-hover transition-colors">+ Add</button>
        </div>
        {data.smokingLog.length === 0 ? (
          <p className="text-xs text-text-muted">No sessions logged.</p>
        ) : (
          <div className="space-y-2">
            {data.smokingLog.slice().reverse().map((entry, i) => {
              const idx = data.smokingLog.length - 1 - i;
              return (
                <div key={i} className="rounded-md bg-bg px-3 py-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input type="date" value={entry.date} onChange={(e) => {
                      const log = [...data.smokingLog]; log[idx] = { ...log[idx], date: e.target.value };
                      updateNodeData(node.id, { smokingLog: log } as Partial<SmokehouseData>);
                    }} className="bg-transparent text-xs text-text-primary outline-none" />
                    <input type="text" value={entry.product} onChange={(e) => {
                      const log = [...data.smokingLog]; log[idx] = { ...log[idx], product: e.target.value };
                      updateNodeData(node.id, { smokingLog: log } as Partial<SmokehouseData>);
                    }} placeholder="Product (bacon, jerky...)" className="flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted" />
                    <button onClick={() => updateNodeData(node.id, { smokingLog: data.smokingLog.filter((_, j) => j !== idx) } as Partial<SmokehouseData>)} className="text-xs text-danger shrink-0">x</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={entry.weightLbs ?? ""} onChange={(e) => {
                      const log = [...data.smokingLog]; log[idx] = { ...log[idx], weightLbs: e.target.value ? Number(e.target.value) : undefined };
                      updateNodeData(node.id, { smokingLog: log } as Partial<SmokehouseData>);
                    }} placeholder="lbs" className="w-16 bg-transparent text-[10px] text-text-primary outline-none border-b border-border placeholder:text-text-muted" />
                    <input type="number" value={entry.tempF ?? ""} onChange={(e) => {
                      const log = [...data.smokingLog]; log[idx] = { ...log[idx], tempF: e.target.value ? Number(e.target.value) : undefined };
                      updateNodeData(node.id, { smokingLog: log } as Partial<SmokehouseData>);
                    }} placeholder="Temp F" className="w-16 bg-transparent text-[10px] text-text-primary outline-none border-b border-border placeholder:text-text-muted" />
                    <input type="number" value={entry.durationHrs ?? ""} onChange={(e) => {
                      const log = [...data.smokingLog]; log[idx] = { ...log[idx], durationHrs: e.target.value ? Number(e.target.value) : undefined };
                      updateNodeData(node.id, { smokingLog: log } as Partial<SmokehouseData>);
                    }} placeholder="Hours" className="w-16 bg-transparent text-[10px] text-text-primary outline-none border-b border-border placeholder:text-text-muted" />
                    <input type="text" value={entry.method ?? ""} onChange={(e) => {
                      const log = [...data.smokingLog]; log[idx] = { ...log[idx], method: e.target.value };
                      updateNodeData(node.id, { smokingLog: log } as Partial<SmokehouseData>);
                    }} placeholder="Method" className="flex-1 bg-transparent text-[10px] text-text-primary outline-none placeholder:text-text-muted" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Brine / Cure Recipes</h3>
          <button onClick={addRecipe} className="text-xs text-accent hover:text-accent-hover transition-colors">+ Add</button>
        </div>
        {data.brineRecipes.length === 0 ? (
          <p className="text-xs text-text-muted">No recipes saved.</p>
        ) : (
          <div className="space-y-2">
            {data.brineRecipes.map((recipe, i) => (
              <div key={i} className="rounded-md bg-bg px-3 py-2 space-y-1">
                <div className="flex items-center gap-2">
                  <input type="text" value={recipe.name} onChange={(e) => {
                    const list = [...data.brineRecipes]; list[i] = { ...list[i], name: e.target.value };
                    updateNodeData(node.id, { brineRecipes: list } as Partial<SmokehouseData>);
                  }} placeholder="Recipe name..." className="flex-1 bg-transparent text-xs font-medium text-text-primary outline-none placeholder:text-text-muted" />
                  <button onClick={() => updateNodeData(node.id, { brineRecipes: data.brineRecipes.filter((_, j) => j !== i) } as Partial<SmokehouseData>)} className="text-xs text-danger shrink-0">x</button>
                </div>
                <textarea value={recipe.ingredients} onChange={(e) => {
                  const list = [...data.brineRecipes]; list[i] = { ...list[i], ingredients: e.target.value };
                  updateNodeData(node.id, { brineRecipes: list } as Partial<SmokehouseData>);
                }} placeholder="Ingredients and instructions..." rows={2} className="w-full bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted resize-none" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
