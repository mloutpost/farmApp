"use client";

import { useRouter } from "next/navigation";
import { useMapStore } from "@/store/map-store";
import { useFarmStore } from "@/store/farm-store";
import { NODE_KIND_LABELS, NODE_KIND_COLORS } from "@/types";

const MODES = [
  { id: "polygon" as const, label: "Area", help: "Click corners to draw a polygon. Double-click to finish." },
  { id: "point" as const, label: "Point", help: "Click the map to place a point." },
  { id: "line" as const, label: "Line", help: "Click points along the line. Double-click to finish." },
] as const;

export default function DrawToolbar() {
  const router = useRouter();
  const { drawMode, setDrawMode, undoLastPoint, pendingGeometry, editingNodeId, setEditingNodeId } = useMapStore();
  const editingNode = useFarmStore((s) => s.nodes.find((n) => n.id === editingNodeId));

  const drawing = drawMode !== "none";
  const editing = editingNodeId != null;
  const activeMode = MODES.find((m) => m.id === drawMode);
  const canUndo =
    pendingGeometry &&
    pendingGeometry.type !== "Point" &&
    (pendingGeometry.coordinates as number[][]).length > 0;

  if (editing && editingNode) {
    const color = NODE_KIND_COLORS[editingNode.kind];
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-bg-elevated/95 backdrop-blur border border-border p-1.5 px-3 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-medium text-text-primary">
            Editing: {editingNode.name}
          </span>
        </div>
        <button
          onClick={() => router.push(`/node?id=${editingNodeId}`)}
          className="rounded-md bg-bg-elevated/95 backdrop-blur border border-border px-3 py-2 text-xs font-medium text-accent hover:bg-accent/10 shadow-lg transition-colors"
        >
          Open Details
        </button>
        <button
          onClick={() => setEditingNodeId(null)}
          className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-black hover:bg-accent-hover shadow-lg transition-colors"
        >
          Done
        </button>
        <span className="text-xs text-text-muted bg-bg-elevated/80 backdrop-blur rounded-md px-3 py-2 border border-border shadow-lg">
          Drag vertices to reshape. Drag shape to move.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 rounded-lg bg-bg-elevated/95 backdrop-blur border border-border p-1 shadow-lg">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setDrawMode(drawMode === m.id ? "none" : m.id)}
            className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              drawMode === m.id
                ? "bg-accent/20 text-accent"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-surface"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {drawing && (
        <div className="flex items-center gap-2">
          {canUndo && (
            <button
              onClick={undoLastPoint}
              className="rounded-md bg-bg-elevated/95 backdrop-blur border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary shadow-lg transition-colors"
            >
              Undo
            </button>
          )}
          <button
            onClick={() => setDrawMode("none")}
            className="rounded-md bg-bg-elevated/95 backdrop-blur border border-border px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 shadow-lg transition-colors"
          >
            Cancel
          </button>
          {activeMode && (
            <span className="text-xs text-text-muted bg-bg-elevated/80 backdrop-blur rounded-md px-3 py-2 border border-border shadow-lg">
              {activeMode.help}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
