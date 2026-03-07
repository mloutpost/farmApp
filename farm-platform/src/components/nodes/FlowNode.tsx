"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FarmNode, FlowNodeData } from "@/types";

function FlowNodeComponent({ data, selected }: NodeProps) {
  const node = data as unknown as FarmNode & { label: string };
  const variant = node.flowVariant ?? "water_source";
  const d = node.flowData;

  return (
    <div
      className={`group rounded-xl border-2 px-4 py-3 min-w-[160px] max-w-[200px] transition-all duration-200 ${
        selected
          ? "border-accent bg-accent/15 shadow-lg shadow-accent/25 ring-2 ring-accent/30"
          : "border-border/80 bg-bg-surface hover:border-accent/40 hover:bg-bg-elevated"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-accent !border-2 !border-bg !-left-1.5"
      />
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-sm">
            {getIcon(variant)}
          </span>
          <span className="font-semibold text-text-primary truncate text-sm">{node.label}</span>
        </div>
        {d && <FlowNodeDataDisplay variant={variant} data={d} />}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-accent !border-2 !border-bg !-right-1.5"
      />
    </div>
  );
}

function getIcon(variant: string): string {
  const icons: Record<string, string> = {
    water_source: "💧",
    water_distribution: "🔀",
    garden: "🌱",
    raised_bed: "🛏",
    field: "🌾",
    livestock_system: "💩",
    compost_facility: "♻",
    pasture: "🐄",
  };
  return icons[variant] ?? "📍";
}

function FlowNodeDataDisplay({ variant, data }: { variant: string; data: FlowNodeData }) {
  const items: { label: string; value: string | number }[] = [];

  if (data.level != null) items.push({ label: "Level", value: `${data.level}%` });
  if (data.flow) items.push({ label: "Flow", value: data.flow });
  if (data.soilPh != null) items.push({ label: "Soil pH", value: data.soilPh });
  if (data.crop) items.push({ label: "Crop", value: data.crop });
  if (data.yieldEst) items.push({ label: "Yield Est", value: data.yieldEst });
  if (data.plantDate) items.push({ label: "Plant Date", value: data.plantDate });
  if (data.harvestEst) items.push({ label: "Harvest Est", value: data.harvestEst });
  if (data.automation) items.push({ label: "Automation", value: data.automation });
  if (data.data != null) items.push({ label: "Data", value: `${data.data}%` });
  if (data.cattleCount != null) items.push({ label: "Cattle Count", value: data.cattleCount });

  if (items.length === 0) return null;

  return (
    <div className="space-y-0.5 text-[10px] text-text-secondary">
      {items.map(({ label, value }) => (
        <div key={label} className="flex justify-between gap-2">
          <span className="text-text-muted">{label}:</span>
          <span className="truncate font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default memo(FlowNodeComponent);
