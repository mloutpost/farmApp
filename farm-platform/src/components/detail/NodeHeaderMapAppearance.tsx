"use client";

import { useFarmStore } from "@/store/farm-store";
import { NODE_KIND_COLORS, nodeColor } from "@/types";
import type { FarmNode } from "@/types";

type Props = {
  node: FarmNode;
  geoType: string | null;
};

export default function NodeHeaderMapAppearance({ node, geoType }: Props) {
  const groups = useFarmStore((s) => s.groups);
  const updateNode = useFarmStore((s) => s.updateNode);

  const showColor =
    geoType === "Polygon" || geoType === "LineString" || geoType === "Point";
  const showHatch =
    node.kind === "field" || node.kind === "pasture" || node.kind === "orchard";

  if (!showColor && !showHatch) return null;

  const resolved = nodeColor(node, groups);
  const pickerValue = node.color ?? resolved;

  return (
    <div className="flex flex-wrap items-center gap-3 pl-3 ml-1 border-l border-border/70">
      {showColor && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-text-muted whitespace-nowrap">
            Map color
          </span>
          <input
            type="color"
            value={pickerValue}
            onChange={(e) => updateNode(node.id, { color: e.target.value })}
            className="h-7 w-9 cursor-pointer rounded border border-border bg-bg-surface p-0.5"
            title="Color on map"
            aria-label="Map color"
          />
          {node.color != null && (
            <button
              type="button"
              onClick={() => updateNode(node.id, { color: undefined })}
              className="text-[10px] text-accent hover:text-accent-hover whitespace-nowrap"
            >
              Reset
            </button>
          )}
          {node.color == null && (
            <span className="text-[10px] text-text-muted max-w-[7rem] truncate" title={NODE_KIND_COLORS[node.kind]}>
              default
            </span>
          )}
        </div>
      )}
      {showHatch && (
        <label className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-text-muted whitespace-nowrap">
            Hatch
          </span>
          <select
            value={node.cropHatch ?? "auto"}
            onChange={(e) => {
              const v = e.target.value as "auto" | "on" | "off";
              updateNode(node.id, { cropHatch: v === "auto" ? undefined : v });
            }}
            className="rounded-md border border-border bg-bg-surface px-2 py-1 text-[11px] text-text-primary outline-none focus:ring-1 focus:ring-accent"
            aria-label="Crop area hatch pattern"
          >
            <option value="auto">Auto (when crop is set)</option>
            <option value="on">Always on</option>
            <option value="off">Off</option>
          </select>
        </label>
      )}
    </div>
  );
}
