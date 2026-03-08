"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, CellarData } from "@/types";

export default function CellarDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as CellarData;

  const addItem = () => {
    updateNodeData(node.id, {
      inventory: [...data.inventory, { item: "", quantity: "", storedDate: new Date().toISOString().slice(0, 10) }],
    } as Partial<CellarData>);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
          <select value={data.cellarType ?? ""} onChange={(e) => updateNodeData(node.id, { cellarType: e.target.value || undefined } as Partial<CellarData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="underground">Underground</option>
            <option value="walkout">Walkout / Basement</option>
            <option value="converted">Converted Space</option>
            <option value="spring-house">Spring House</option>
            <option value="cooler">Walk-in Cooler</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Sq. Ft.</label>
          <input type="number" value={data.sqft ?? ""} onChange={(e) => updateNodeData(node.id, { sqft: e.target.value ? Number(e.target.value) : undefined } as Partial<CellarData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Avg Temp (F)</label>
          <input type="number" value={data.avgTempF ?? ""} onChange={(e) => updateNodeData(node.id, { avgTempF: e.target.value ? Number(e.target.value) : undefined } as Partial<CellarData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Avg Humidity (%)</label>
          <input type="number" value={data.avgHumidity ?? ""} onChange={(e) => updateNodeData(node.id, { avgHumidity: e.target.value ? Number(e.target.value) : undefined } as Partial<CellarData>)} min="0" max="100" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1">Shelving / Layout</label>
          <input type="text" value={data.shelving ?? ""} onChange={(e) => updateNodeData(node.id, { shelving: e.target.value } as Partial<CellarData>)} placeholder="e.g. 4 wooden shelves, wire racks" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Inventory</h3>
          <button onClick={addItem} className="text-xs text-accent hover:text-accent-hover transition-colors">+ Add Item</button>
        </div>
        {data.inventory.length === 0 ? (
          <p className="text-xs text-text-muted">No items stored.</p>
        ) : (
          <div className="space-y-2">
            {data.inventory.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-bg px-3 py-2">
                <input type="text" value={entry.item} onChange={(e) => {
                  const inv = [...data.inventory];
                  inv[i] = { ...inv[i], item: e.target.value };
                  updateNodeData(node.id, { inventory: inv } as Partial<CellarData>);
                }} placeholder="Item..." className="flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted" />
                <input type="text" value={entry.quantity} onChange={(e) => {
                  const inv = [...data.inventory];
                  inv[i] = { ...inv[i], quantity: e.target.value };
                  updateNodeData(node.id, { inventory: inv } as Partial<CellarData>);
                }} placeholder="Qty" className="w-20 bg-transparent text-xs text-text-primary outline-none border-b border-border placeholder:text-text-muted" />
                <input type="date" value={entry.storedDate} onChange={(e) => {
                  const inv = [...data.inventory];
                  inv[i] = { ...inv[i], storedDate: e.target.value };
                  updateNodeData(node.id, { inventory: inv } as Partial<CellarData>);
                }} className="bg-transparent text-[10px] text-text-muted outline-none" title="Stored date" />
                <input type="date" value={entry.expiresDate ?? ""} onChange={(e) => {
                  const inv = [...data.inventory];
                  inv[i] = { ...inv[i], expiresDate: e.target.value || undefined };
                  updateNodeData(node.id, { inventory: inv } as Partial<CellarData>);
                }} className="bg-transparent text-[10px] text-text-muted outline-none" title="Expires" />
                <button onClick={() => updateNodeData(node.id, { inventory: data.inventory.filter((_, j) => j !== i) } as Partial<CellarData>)} className="text-xs text-danger shrink-0">x</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
