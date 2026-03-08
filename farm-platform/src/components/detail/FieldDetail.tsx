"use client";

import { useFarmStore } from "@/store/farm-store";
import CropPicker, { CropInfoCard } from "./CropPicker";
import type { CropEntry, CropCategory } from "@/lib/crop-catalog";
import type { FarmNode, FieldData, SoilTest } from "@/types";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const FIELD_CATEGORIES: CropCategory[] = ["row-crop", "forage", "grain", "legume"];

export default function FieldDetail({ node }: { node: FarmNode }) {
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const data = node.data as FieldData;

  const handleCropSelect = (crop: string, entry: CropEntry | null) => {
    const updates: Partial<FieldData> = { currentCrop: crop };
    if (entry) {
      updates.catalogId = entry.id;
      if (entry.seedingRate) updates.seedingRate = entry.seedingRate;
      if (entry.yieldPerAcre) updates.expectedYield = entry.yieldPerAcre;
    } else {
      updates.catalogId = undefined;
    }
    updateNodeData(node.id, updates as Partial<FieldData>);
  };

  const addSoilTest = () => {
    const t: SoilTest = { id: uid(), date: new Date().toISOString().split("T")[0] };
    updateNodeData(node.id, { soilTests: [...data.soilTests, t] } as Partial<FieldData>);
  };

  const updateSoilTest = (updated: SoilTest) => {
    updateNodeData(node.id, { soilTests: data.soilTests.map((t) => (t.id === updated.id ? updated : t)) } as Partial<FieldData>);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Acreage</label>
          <input type="number" value={data.acreage ?? ""} onChange={(e) => updateNodeData(node.id, { acreage: e.target.value ? Number(e.target.value) : undefined } as Partial<FieldData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" step="0.1" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Soil Type</label>
          <input type="text" value={data.soilType ?? ""} onChange={(e) => updateNodeData(node.id, { soilType: e.target.value } as Partial<FieldData>)} placeholder="e.g. Clay loam" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Tillage Method</label>
          <select value={data.tillageMethod ?? ""} onChange={(e) => updateNodeData(node.id, { tillageMethod: e.target.value || undefined } as Partial<FieldData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary">
            <option value="">Select...</option>
            <option value="no-till">No-Till</option>
            <option value="conventional">Conventional</option>
            <option value="strip-till">Strip-Till</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Current Crop</label>
          <div className="rounded-md border border-border bg-bg-surface px-3 py-2">
            <CropPicker
              value={data.currentCrop ?? ""}
              catalogId={data.catalogId}
              categories={FIELD_CATEGORIES}
              placeholder="Search field crops, forages..."
              onChange={handleCropSelect}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Variety</label>
          <input type="text" value={data.currentVariety ?? ""} onChange={(e) => updateNodeData(node.id, { currentVariety: e.target.value } as Partial<FieldData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Seeding Rate</label>
          <input type="text" value={data.seedingRate ?? ""} onChange={(e) => updateNodeData(node.id, { seedingRate: e.target.value } as Partial<FieldData>)} placeholder="e.g. 32,000 seeds/acre" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Expected Yield</label>
          <input type="text" value={data.expectedYield ?? ""} onChange={(e) => updateNodeData(node.id, { expectedYield: e.target.value } as Partial<FieldData>)} placeholder="e.g. 180 bu/acre" className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted" />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Date Planted</label>
          <input type="date" value={data.datePlanted ?? ""} onChange={(e) => updateNodeData(node.id, { datePlanted: e.target.value } as Partial<FieldData>)} className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary" />
        </div>
      </div>

      {data.catalogId && <CropInfoCard catalogId={data.catalogId} />}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Soil Tests</h3>
          <button onClick={addSoilTest} className="text-xs font-medium text-accent hover:text-accent-hover transition-colors">+ Add Test</button>
        </div>
        {data.soilTests.length === 0 ? (
          <p className="text-xs text-text-muted">No soil tests recorded.</p>
        ) : (
          <div className="space-y-2">
            {data.soilTests.map((t) => (
              <div key={t.id} className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-bg-surface p-3">
                <div><label className="text-[10px] text-text-muted">Date</label><input type="date" value={t.date} onChange={(e) => updateSoilTest({ ...t, date: e.target.value })} className="w-full bg-transparent text-xs text-text-primary outline-none" /></div>
                <div><label className="text-[10px] text-text-muted">pH</label><input type="number" value={t.ph ?? ""} onChange={(e) => updateSoilTest({ ...t, ph: e.target.value ? Number(e.target.value) : undefined })} className="w-full bg-transparent text-xs text-text-primary outline-none" step="0.1" /></div>
                <div><label className="text-[10px] text-text-muted">N</label><input type="number" value={t.nitrogen ?? ""} onChange={(e) => updateSoilTest({ ...t, nitrogen: e.target.value ? Number(e.target.value) : undefined })} className="w-full bg-transparent text-xs text-text-primary outline-none" /></div>
                <div><label className="text-[10px] text-text-muted">P</label><input type="number" value={t.phosphorus ?? ""} onChange={(e) => updateSoilTest({ ...t, phosphorus: e.target.value ? Number(e.target.value) : undefined })} className="w-full bg-transparent text-xs text-text-primary outline-none" /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
