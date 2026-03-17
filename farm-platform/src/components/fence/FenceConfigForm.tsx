"use client";

import { useFencePlannerStore } from "@/store/fence-planner-store";
import type { FenceBomFenceType } from "@/lib/fence-bom";

const FENCE_TYPES: { value: FenceBomFenceType; label: string }[] = [
  { value: "electric", label: "Electric" },
  { value: "barbed", label: "Barbed Wire" },
  { value: "woven-wire", label: "Woven Wire" },
  { value: "woven-wire-high-tensile", label: "Woven Wire (High-Tensile)" },
  { value: "board", label: "Board" },
  { value: "temporary", label: "Temporary (Polywire)" },
];

export default function FenceConfigForm() {
  const { config, setConfig } = useFencePlannerStore();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">Fence configuration</h3>

      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Fence type</label>
        <select
          value={config.fenceType ?? "electric"}
          onChange={(e) => setConfig({ fenceType: e.target.value as FenceBomFenceType })}
          className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
        >
          {FENCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {(config.fenceType === "electric" || config.fenceType === "barbed" || config.fenceType === "woven-wire" || config.fenceType === "woven-wire-high-tensile" || config.fenceType === "board") && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Post spacing (ft)</label>
          <input
            type="number"
            min={4}
            max={20}
            value={config.postSpacingFt ?? 12}
            onChange={(e) => setConfig({ postSpacingFt: Number(e.target.value) || 8 })}
            className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
          />
        </div>
      )}

      {(config.fenceType === "electric" || config.fenceType === "barbed" || config.fenceType === "temporary") && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Wire strands</label>
          <input
            type="number"
            min={1}
            max={10}
            value={config.wireStrands ?? 3}
            onChange={(e) => setConfig({ wireStrands: Number(e.target.value) || 1 })}
            className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
          />
        </div>
      )}

      {config.fenceType === "electric" && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Insulators per post</label>
          <input
            type="number"
            min={1}
            max={10}
            value={config.insulatorsPerPost ?? 1}
            onChange={(e) => setConfig({ insulatorsPerPost: Number(e.target.value) || 1 })}
            className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Gates</label>
          <input
            type="number"
            min={0}
            value={config.gateCount ?? 0}
            onChange={(e) => setConfig({ gateCount: Number(e.target.value) || 0 })}
            className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Gate width (ft)</label>
          <input
            type="number"
            min={4}
            max={24}
            value={config.gateWidthFt ?? 12}
            onChange={(e) => setConfig({ gateWidthFt: Number(e.target.value) || 12 })}
            className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
          />
        </div>
      </div>
    </div>
  );
}
