"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FarmNode as FarmNodeType } from "@/types";

function SubNodeComponent({ data, selected }: NodeProps) {
  const node = data as unknown as FarmNodeType & { label: string };
  return (
    <div
      className={`group rounded-lg border px-2.5 py-2 min-w-[100px] transition-all duration-200 ${
        selected
          ? "border-accent bg-accent/10 shadow-sm"
          : "border-border/60 bg-bg-surface hover:border-accent/30"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-1.5 !h-1.5 !bg-accent/70 !border !border-bg !-left-0.5"
      />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-accent/80">▢</span>
        <span className="text-text-primary text-xs font-medium truncate">{node.label}</span>
      </div>
    </div>
  );
}

export default memo(SubNodeComponent);
