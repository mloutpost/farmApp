"use client";

import { useState } from "react";
import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, ShopData } from "@/types";

export default function ShopDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as ShopData;
  const [newEquip, setNewEquip] = useState("");
  const [newSupply, setNewSupply] = useState("");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Purpose</label>
          <select value={data.purpose ?? ""} onChange={(e) => updateNodeData(node.id, { purpose: e.target.value || undefined } as Partial<ShopData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="mechanic">Mechanic / Equipment</option>
            <option value="woodworking">Woodworking</option>
            <option value="welding">Welding / Fabrication</option>
            <option value="general">General Workshop</option>
            <option value="processing">Processing / Packaging</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Dimensions</label>
          <input type="text" value={data.dimensions ?? ""} onChange={(e) => updateNodeData(node.id, { dimensions: e.target.value } as Partial<ShopData>)} placeholder='e.g. 30x40' className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1">Power</label>
          <select value={data.power ?? ""} onChange={(e) => updateNodeData(node.id, { power: e.target.value || undefined } as Partial<ShopData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">None</option>
            <option value="single-phase">Single Phase (120/240V)</option>
            <option value="three-phase">Three Phase</option>
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Equipment</h3>
        <div className="flex gap-2 mb-2">
          <input type="text" value={newEquip} onChange={(e) => setNewEquip(e.target.value)} onKeyDown={(e) => {
            if (e.key === "Enter" && newEquip.trim()) {
              updateNodeData(node.id, { equipment: [...data.equipment, newEquip.trim()] } as Partial<ShopData>);
              setNewEquip("");
            }
          }} placeholder="Add equipment..." className="flex-1 rounded-md border border-border bg-bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted" />
          <button onClick={() => {
            if (newEquip.trim()) {
              updateNodeData(node.id, { equipment: [...data.equipment, newEquip.trim()] } as Partial<ShopData>);
              setNewEquip("");
            }
          }} className="text-xs text-accent hover:text-accent-hover">Add</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.equipment.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-xs text-text-secondary">
              {item}
              <button onClick={() => updateNodeData(node.id, { equipment: data.equipment.filter((_, j) => j !== i) } as Partial<ShopData>)} className="text-danger hover:text-danger/80">x</button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Supplies / Inventory</h3>
        <div className="flex gap-2 mb-2">
          <input type="text" value={newSupply} onChange={(e) => setNewSupply(e.target.value)} onKeyDown={(e) => {
            if (e.key === "Enter" && newSupply.trim()) {
              updateNodeData(node.id, { supplies: [...data.supplies, newSupply.trim()] } as Partial<ShopData>);
              setNewSupply("");
            }
          }} placeholder="Add supply..." className="flex-1 rounded-md border border-border bg-bg-surface px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted" />
          <button onClick={() => {
            if (newSupply.trim()) {
              updateNodeData(node.id, { supplies: [...data.supplies, newSupply.trim()] } as Partial<ShopData>);
              setNewSupply("");
            }
          }} className="text-xs text-accent hover:text-accent-hover">Add</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.supplies.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-xs text-text-secondary">
              {item}
              <button onClick={() => updateNodeData(node.id, { supplies: data.supplies.filter((_, j) => j !== i) } as Partial<ShopData>)} className="text-danger hover:text-danger/80">x</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
