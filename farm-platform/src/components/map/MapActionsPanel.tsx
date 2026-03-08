"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMapStore } from "@/store/map-store";
import { useFarmStore } from "@/store/farm-store";
import { NODE_KIND_COLORS, NODE_KIND_LABELS, AREA_KINDS, POINT_KINDS, LINE_KINDS } from "@/types";
import type { NodeKind, FarmNode } from "@/types";
import { NodeKindIcon } from "@/components/icons/FarmIcons";

const MODES = [
  { id: "polygon" as const, label: "Area", help: "Click corners to draw a polygon. Double-click to finish." },
  { id: "point" as const, label: "Point", help: "Click the map to place a point." },
  { id: "line" as const, label: "Line", help: "Click points along the line. Double-click to finish." },
] as const;

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-text-primary hover:bg-bg-surface transition-colors"
      >
        {title}
        <span className="text-text-muted shrink-0">
          {open ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          )}
        </span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function kindGeometryCategory(kind: NodeKind): "area" | "point" | "line" {
  if ((AREA_KINDS as readonly string[]).includes(kind)) return "area";
  if ((POINT_KINDS as readonly string[]).includes(kind)) return "point";
  if ((LINE_KINDS as readonly string[]).includes(kind)) return "line";
  return "point";
}

interface NodeGroup {
  kind: NodeKind;
  label: string;
  color: string;
  category: "area" | "point" | "line";
  nodes: FarmNode[];
  childNodes: FarmNode[];
}

function GroupRow({
  group,
  layerVisibility,
  markerVisibility,
  toggleLayerVisibility,
  toggleMarkerVisibility,
  toggleGroupVisibility,
}: {
  group: NodeGroup;
  layerVisibility: Record<string, boolean>;
  markerVisibility: Record<string, boolean>;
  toggleLayerVisibility: (layerId: string) => void;
  toggleMarkerVisibility: (nodeId: string) => void;
  toggleGroupVisibility: (group: NodeGroup, allVisible: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [mergeResult, setMergeResult] = useState<string | null>(null);
  const mergeLineNodes = useFarmStore((s) => s.mergeLineNodes);

  const allNodes = [...group.nodes, ...group.childNodes];

  const allVisible = allNodes.every((n) => {
    const cat = kindGeometryCategory(n.kind);
    if (cat === "point") return markerVisibility[n.id] !== false;
    return layerVisibility[`node-${n.id}`] !== false;
  });

  const canMerge = group.category === "line" && group.nodes.length > 1;

  const handleMerge = () => {
    const reduced = mergeLineNodes(group.kind);
    if (reduced > 0) {
      setMergeResult(`Merged: removed ${reduced} segments`);
    } else {
      setMergeResult("No connected segments found");
    }
    setTimeout(() => setMergeResult(null), 3000);
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 py-1">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-text-muted hover:text-text-secondary shrink-0"
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <span className="shrink-0" style={{ color: group.color }}>
          <NodeKindIcon kind={group.kind} size={14} />
        </span>
        <span className="text-xs font-medium text-text-primary truncate flex-1 min-w-0">
          {group.label}
        </span>
        <span className="text-[10px] text-text-muted tabular-nums shrink-0">{allNodes.length}</span>
        <button
          type="button"
          role="switch"
          aria-checked={allVisible}
          onClick={(e) => { e.stopPropagation(); toggleGroupVisibility(group, allVisible); }}
          className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 ${allVisible ? "bg-accent" : "bg-border"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${allVisible ? "translate-x-4" : "translate-x-0"}`} />
        </button>
      </div>

      {expanded && (
        <div className="pl-5 space-y-0.5">
          {canMerge && (
            <div className="py-1">
              <button
                type="button"
                onClick={handleMerge}
                className="text-[11px] font-medium text-accent hover:text-accent-hover transition-colors"
              >
                Merge connected segments
              </button>
              {mergeResult && (
                <p className="text-[10px] text-text-muted mt-0.5">{mergeResult}</p>
              )}
            </div>
          )}
          {group.nodes.map((node) => {
            const isPoint = group.category === "point";
            const visible = isPoint
              ? markerVisibility[node.id] !== false
              : layerVisibility[`node-${node.id}`] !== false;
            const nodeChildren = group.childNodes.filter((c) => c.parentId === node.id);

            return (
              <div key={node.id}>
                <div className="flex items-center justify-between gap-2 py-0.5">
                  <span className="text-xs text-text-secondary truncate min-w-0 flex-1">{node.name}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={visible}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPoint) toggleMarkerVisibility(node.id);
                      else toggleLayerVisibility(`node-${node.id}`);
                    }}
                    className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 ${visible ? "bg-accent/70" : "bg-border"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${visible ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                {nodeChildren.length > 0 && (
                  <div className="pl-4 space-y-0.5">
                    {nodeChildren.map((child) => {
                      const childVisible = layerVisibility[`node-${child.id}`] !== false;
                      return (
                        <div key={child.id} className="flex items-center justify-between gap-2 py-0.5">
                          <span className="text-[11px] text-text-muted truncate min-w-0 flex-1">{child.name}</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={childVisible}
                            onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(`node-${child.id}`); }}
                            className={`relative inline-flex w-7 h-4 rounded-full transition-colors shrink-0 ${childVisible ? "bg-accent/60" : "bg-border"}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${childVisible ? "translate-x-3" : "translate-x-0"}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {group.childNodes.filter((c) => !group.nodes.some((n) => n.id === c.parentId)).map((orphan) => {
            const childVisible = layerVisibility[`node-${orphan.id}`] !== false;
            return (
              <div key={orphan.id} className="flex items-center justify-between gap-2 py-0.5">
                <span className="text-xs text-text-secondary truncate min-w-0 flex-1">{orphan.name}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={childVisible}
                  onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(`node-${orphan.id}`); }}
                  className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 ${childVisible ? "bg-accent/70" : "bg-border"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${childVisible ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MapActionsPanel() {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const {
    drawMode,
    setDrawMode,
    undoLastPoint,
    pendingGeometry,
    layers,
    toggleLayerVisibility,
    editingNodeId,
    setEditingNodeId,
    hiddenMarkerIds,
    toggleMarkerVisibility: storeToggleMarker,
    setMarkerVisibility,
  } = useMapStore();

  const farmNodes = useFarmStore((s) => s.nodes);
  const editingNode = useFarmStore((s) => s.nodes.find((n) => n.id === editingNodeId));

  const drawing = drawMode !== "none";
  const activeMode = MODES.find((m) => m.id === drawMode);
  const canUndo =
    pendingGeometry &&
    pendingGeometry.type !== "Point" &&
    (pendingGeometry.coordinates as number[][]).length > 0;

  const surveyLayers = layers.filter((l) => l.id.startsWith("survey-"));

  const layerVisibility = useMemo(() => {
    const vis: Record<string, boolean> = {};
    layers.forEach((l) => { vis[l.id] = l.visible; });
    return vis;
  }, [layers]);

  const groups = useMemo<NodeGroup[]>(() => {
    const parentIds = new Set(farmNodes.filter((n) => n.parentId).map((n) => n.parentId!));
    const childrenByParentKind = new Map<NodeKind, FarmNode[]>();
    const map = new Map<NodeKind, FarmNode[]>();

    farmNodes.forEach((n) => {
      if (!n.geometry) return;
      if (n.parentId) {
        const parent = farmNodes.find((p) => p.id === n.parentId);
        if (parent) {
          let list = childrenByParentKind.get(parent.kind);
          if (!list) { list = []; childrenByParentKind.set(parent.kind, list); }
          list.push(n);
          return;
        }
      }
      let list = map.get(n.kind);
      if (!list) { list = []; map.set(n.kind, list); }
      list.push(n);
    });

    const categoryOrder: Record<string, number> = { area: 0, line: 1, point: 2 };
    const result: NodeGroup[] = [];
    map.forEach((nodes, kind) => {
      result.push({
        kind,
        label: NODE_KIND_LABELS[kind],
        color: NODE_KIND_COLORS[kind],
        category: kindGeometryCategory(kind),
        nodes: nodes.sort((a, b) => a.name.localeCompare(b.name)),
        childNodes: (childrenByParentKind.get(kind) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
      });
    });
    result.sort((a, b) => {
      const catDiff = (categoryOrder[a.category] ?? 9) - (categoryOrder[b.category] ?? 9);
      if (catDiff !== 0) return catDiff;
      return a.label.localeCompare(b.label);
    });
    return result;
  }, [farmNodes]);

  const markerVisibility = useMemo(() => {
    const vis: Record<string, boolean> = {};
    farmNodes.forEach((n) => {
      vis[n.id] = !hiddenMarkerIds.has(n.id);
    });
    return vis;
  }, [farmNodes, hiddenMarkerIds]);

  const toggleGroupVisibility = (group: NodeGroup, allCurrentlyVisible: boolean) => {
    const allNodes = [...group.nodes, ...group.childNodes];
    allNodes.forEach((n) => {
      const cat = kindGeometryCategory(n.kind);
      if (cat === "point") {
        setMarkerVisibility(n.id, !allCurrentlyVisible);
      } else {
        const layerId = `node-${n.id}`;
        const layer = layers.find((l) => l.id === layerId);
        if (layer && layer.visible === allCurrentlyVisible) {
          toggleLayerVisibility(layerId);
        }
      }
    });
  };

  const handleSaveChanges = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1500);
  };

  if (editingNodeId && editingNode) {
    const color = NODE_KIND_COLORS[editingNode.kind as keyof typeof NODE_KIND_COLORS] ?? "#22c55e";
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-bg-elevated/95 backdrop-blur border border-border p-1.5 px-3 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-medium text-text-primary">Editing: {editingNode.name}</span>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/node?id=${editingNodeId}`)}
          className="rounded-md bg-bg-elevated/95 backdrop-blur border border-border px-3 py-2 text-xs font-medium text-accent hover:bg-accent/10 shadow-lg transition-colors"
        >
          Open Details
        </button>
        <button
          type="button"
          onClick={() => setEditingNodeId(null)}
          className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-black hover:bg-accent-hover shadow-lg transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setPanelOpen(!panelOpen)}
        className="flex items-center gap-2 rounded-lg bg-bg-elevated/95 backdrop-blur border border-border px-3 py-2 shadow-lg text-sm font-medium text-text-primary hover:bg-bg-surface transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        Map Actions
      </button>

      {panelOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setPanelOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-full mt-2 z-50 w-72 rounded-xl border border-border bg-bg-elevated shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-bg-surface/50">
              <h3 className="text-sm font-semibold text-text-primary">Map Actions</h3>
            </div>

            <CollapsibleSection title="Draw" defaultOpen={false}>
              <div className="space-y-2">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDrawMode(drawMode === m.id ? "none" : m.id)}
                    className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                      drawMode === m.id
                        ? "bg-accent/20 text-accent"
                        : "text-text-secondary hover:bg-bg-surface hover:text-text-primary"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
                {drawing && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    {canUndo && (
                      <button
                        type="button"
                        onClick={undoLastPoint}
                        className="flex-1 rounded-md bg-bg-surface px-2 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
                      >
                        Undo
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDrawMode("none")}
                      className="flex-1 rounded-md bg-danger/10 px-2 py-1.5 text-xs font-medium text-danger hover:bg-danger/20"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {activeMode && (
                  <p className="text-xs text-text-muted mt-2">{activeMode.help}</p>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Layers" defaultOpen={true}>
              <div className="space-y-1 max-h-[50vh] overflow-y-auto overflow-x-hidden">
                {surveyLayers.length > 0 && (
                  <div className="mb-2 pb-2 border-b border-border">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Imports</p>
                    {surveyLayers.map((layer) => (
                      <div key={layer.id} className="flex items-center justify-between gap-2 py-0.5">
                        <span className="text-xs text-text-secondary truncate min-w-0 flex-1">{layer.name}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={layer.visible}
                          onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                          className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 ${layer.visible ? "bg-accent/70" : "bg-border"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${layer.visible ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {groups.length === 0 ? (
                  <p className="text-xs text-text-muted">No layers yet. Draw on the map to add.</p>
                ) : (
                  groups.map((group) => (
                    <GroupRow
                      key={group.kind}
                      group={group}
                      layerVisibility={layerVisibility}
                      markerVisibility={markerVisibility}
                      toggleLayerVisibility={toggleLayerVisibility}
                      toggleMarkerVisibility={storeToggleMarker}
                      toggleGroupVisibility={toggleGroupVisibility}
                    />
                  ))
                )}
              </div>
            </CollapsibleSection>

            <div className="p-3 border-t border-border bg-bg-surface/30">
              <button
                type="button"
                onClick={handleSaveChanges}
                className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {savedFeedback ? "Saved" : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
