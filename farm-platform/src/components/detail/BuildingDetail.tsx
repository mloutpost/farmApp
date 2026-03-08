"use client";

import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, BuildingData } from "@/types";

export default function BuildingDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as BuildingData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Building Type</label>
          <select value={data.buildingType ?? ""} onChange={(e) => updateNodeData(node.id, { buildingType: e.target.value || undefined } as Partial<BuildingData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="house">House</option>
            <option value="cabin">Cabin</option>
            <option value="mobile-home">Mobile Home / Trailer</option>
            <option value="apartment">Apartment / Guest House</option>
            <option value="bunkhouse">Bunkhouse</option>
            <option value="office">Office</option>
            <option value="garage">Garage</option>
            <option value="shed">Shed</option>
            <option value="storage">Storage Building</option>
            <option value="equipment-shelter">Equipment Shelter</option>
            <option value="wash-station">Wash Station</option>
            <option value="milk-house">Milk House</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Sq. Ft.</label>
          <input type="number" value={data.sqft ?? ""} onChange={(e) => updateNodeData(node.id, { sqft: e.target.value ? Number(e.target.value) : undefined } as Partial<BuildingData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Stories</label>
          <input type="number" value={data.stories ?? ""} onChange={(e) => updateNodeData(node.id, { stories: e.target.value ? Number(e.target.value) : undefined } as Partial<BuildingData>)} min="1" max="5" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Year Built</label>
          <input type="number" value={data.yearBuilt ?? ""} onChange={(e) => updateNodeData(node.id, { yearBuilt: e.target.value ? Number(e.target.value) : undefined } as Partial<BuildingData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Construction</label>
          <select value={data.construction ?? ""} onChange={(e) => updateNodeData(node.id, { construction: e.target.value || undefined } as Partial<BuildingData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="wood-frame">Wood Frame</option>
            <option value="pole-barn">Pole Barn</option>
            <option value="metal">Metal / Steel</option>
            <option value="block">Block / CMU</option>
            <option value="brick">Brick</option>
            <option value="log">Log</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Roof</label>
          <select value={data.roofType ?? ""} onChange={(e) => updateNodeData(node.id, { roofType: e.target.value || undefined } as Partial<BuildingData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="metal">Metal</option>
            <option value="shingle">Shingle</option>
            <option value="flat">Flat / Membrane</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Foundation</label>
          <select value={data.foundation ?? ""} onChange={(e) => updateNodeData(node.id, { foundation: e.target.value || undefined } as Partial<BuildingData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="slab">Slab</option>
            <option value="crawl-space">Crawl Space</option>
            <option value="basement">Basement</option>
            <option value="pier">Pier / Post</option>
            <option value="none">None (skids, etc.)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Condition</label>
          <select value={data.condition ?? ""} onChange={(e) => updateNodeData(node.id, { condition: e.target.value || undefined } as Partial<BuildingData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Power</label>
          <select value={data.power ?? ""} onChange={(e) => updateNodeData(node.id, { power: e.target.value || undefined } as Partial<BuildingData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="grid">Grid</option>
            <option value="solar">Solar</option>
            <option value="generator">Generator</option>
            <option value="none">None</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Water</label>
          <select value={data.water ?? ""} onChange={(e) => updateNodeData(node.id, { water: e.target.value || undefined } as Partial<BuildingData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="well">Well</option>
            <option value="municipal">Municipal</option>
            <option value="spring">Spring</option>
            <option value="rainwater">Rainwater</option>
            <option value="none">None</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Septic / Sewer</label>
          <select value={data.septic ?? ""} onChange={(e) => updateNodeData(node.id, { septic: e.target.value || undefined } as Partial<BuildingData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="septic">Septic</option>
            <option value="sewer">Sewer</option>
            <option value="composting">Composting Toilet</option>
            <option value="outhouse">Outhouse</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Heating</label>
          <input type="text" value={data.heating ?? ""} onChange={(e) => updateNodeData(node.id, { heating: e.target.value } as Partial<BuildingData>)} placeholder="e.g. Wood stove, propane, heat pump" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Cooling</label>
          <input type="text" value={data.cooling ?? ""} onChange={(e) => updateNodeData(node.id, { cooling: e.target.value } as Partial<BuildingData>)} placeholder="e.g. Window AC, mini-split" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Current Use</label>
        <input type="text" value={data.currentUse ?? ""} onChange={(e) => updateNodeData(node.id, { currentUse: e.target.value } as Partial<BuildingData>)} placeholder="e.g. Primary residence, seasonal cabin, tool storage" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
          <input type="checkbox" checked={data.insured ?? false} onChange={(e) => updateNodeData(node.id, { insured: e.target.checked } as Partial<BuildingData>)} className="rounded" />
          Insured
        </label>
      </div>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Notes</label>
        <textarea value={data.notes ?? ""} onChange={(e) => updateNodeData(node.id, { notes: e.target.value } as Partial<BuildingData>)} rows={3} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" placeholder="Maintenance history, renovation plans, insurance details..." />
      </div>
    </div>
  );
}
