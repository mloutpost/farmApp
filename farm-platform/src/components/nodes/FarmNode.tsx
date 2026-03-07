"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FarmNode as FarmNodeType } from "@/types";

function FarmNodeComponent({ data, selected }: NodeProps) {
  const node = data as unknown as FarmNodeType & { label: string };
  return (
    <div
      className={`group rounded-xl border-2 px-4 py-3 min-w-[160px] transition-all duration-200 ${
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
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-base">
          🏠
        </span>
        <span className="font-semibold text-text-primary truncate">{node.label}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-accent !border-2 !border-bg !-right-1.5"
      />
    </div>
  );
}

export default memo(FarmNodeComponent);
