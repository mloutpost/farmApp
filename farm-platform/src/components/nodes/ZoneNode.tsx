"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FarmNode as FarmNodeType } from "@/types";

const ZONE_ICONS: Record<string, string> = {
  garden: "🌱",
  field: "🌾",
  pasture: "🐄",
  orchard: "🍎",
  infrastructure: "🏗",
  other: "📍",
};

function ZoneNodeComponent({ data, selected }: NodeProps) {
  const node = data as unknown as FarmNodeType & { label: string };
  const icon = ZONE_ICONS[node.zoneType ?? "other"] ?? "📍";
  return (
    <div
      className={`group rounded-lg border-2 px-3 py-2.5 min-w-[140px] transition-all duration-200 ${
        selected
          ? "border-accent bg-accent/10 shadow-md ring-2 ring-accent/20"
          : "border-border/70 bg-bg-elevated hover:border-accent/30 hover:bg-bg-surface"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-accent/90 !border-2 !border-bg !-left-1"
      />
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-sm">
          {icon}
        </span>
        <span className="font-medium text-text-primary text-sm truncate">{node.label}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-accent/90 !border-2 !border-bg !-right-1"
      />
    </div>
  );
}

export default memo(ZoneNodeComponent);
