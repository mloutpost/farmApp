"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMapStore } from "@/store/map-store";
import { useFencePlannerStore } from "@/store/fence-planner-store";
import { useDemStore } from "@/store/dem-store";
import FencePlannerPanel from "@/components/fence/FencePlannerPanel";
import DemImport from "./DemImport";
import ElevationProfilePanel, { ElevationProfileButton } from "./ElevationProfilePanel";
import PlantingSuitabilityPanel from "@/components/terrain/PlantingSuitabilityPanel";
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
  const fencePlannerOpen = useFencePlannerStore((s) => s.isOpen);
  const openFencePlanner = useFencePlannerStore((s) => s.open);
  const demRaster = useDemStore((s) => s.raster);
  const hillshadeVisible = useDemStore((s) => s.hillshadeVisible);
  const hillshadeOpacity = useDemStore((s) => s.hillshadeOpacity);
  const hillshadeSmoothness = useDemStore((s) => s.hillshadeSmoothness);
  const hillshadeZFactor = useDemStore((s) => s.hillshadeZFactor);
  const hillshadeScale = useDemStore((s) => s.hillshadeScale);
  const slopeVisible = useDemStore((s) => s.slopeVisible);
  const aspectVisible = useDemStore((s) => s.aspectVisible);
  const drainageVisible = useDemStore((s) => s.drainageVisible);
  const frostPocketsVisible = useDemStore((s) => s.frostPocketsVisible);
  const contoursVisible = useDemStore((s) => s.contoursVisible);
  const setHillshadeVisible = useDemStore((s) => s.setHillshadeVisible);
  const setHillshadeOpacity = useDemStore((s) => s.setHillshadeOpacity);
  const setHillshadeSmoothness = useDemStore((s) => s.setHillshadeSmoothness);
  const setHillshadeZFactor = useDemStore((s) => s.setHillshadeZFactor);
  const setHillshadeScale = useDemStore((s) => s.setHillshadeScale);
  const setSlopeVisible = useDemStore((s) => s.setSlopeVisible);
  const setAspectVisible = useDemStore((s) => s.setAspectVisible);
  const setDrainageVisible = useDemStore((s) => s.setDrainageVisible);
  const setFrostPocketsVisible = useDemStore((s) => s.setFrostPocketsVisible);
  const setContoursVisible = useDemStore((s) => s.setContoursVisible);
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

            <CollapsibleSection title="Tools" defaultOpen={false}>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => openFencePlanner()}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-text-secondary hover:bg-bg-surface hover:text-text-primary transition-colors flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 8V4h4M4 20v-4h4M20 8V4h-4M20 20v-4h-4" />
                    <rect x="4" y="8" width="16" height="8" rx="1" />
                  </svg>
                  Fence Planner
                </button>
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5">Terrain (DEM)</p>
                  <DemImport compact />
                  <ElevationProfileButton />
                  <PlantingSuitabilityPanel />
                </div>
              </div>
            </CollapsibleSection>

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
                {demRaster && (
                  <div className="mb-2 pb-2 border-b border-border">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Terrain Analysis</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 py-0.5">
                        <span className="text-xs text-text-secondary truncate min-w-0 flex-1">Hillshade</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={hillshadeVisible}
                          onClick={(e) => { e.stopPropagation(); setHillshadeVisible(!hillshadeVisible); }}
                          className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 ${hillshadeVisible ? "bg-accent/70" : "bg-border"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${hillshadeVisible ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                      </div>
                      {hillshadeVisible && (
                        <>
                          <div className="flex items-center gap-2 py-0.5">
                            <span className="text-[10px] text-text-muted shrink-0">Opacity</span>
                            <input
                              type="range"
                              min="0.2"
                              max="0.9"
                              step="0.05"
                              value={hillshadeOpacity}
                              onChange={(e) => setHillshadeOpacity(parseFloat(e.target.value))}
                              className="flex-1 h-1.5 accent-accent"
                            />
                            <span className="text-[10px] text-text-muted tabular-nums w-8">{Math.round(hillshadeOpacity * 100)}%</span>
                          </div>
                          <div className="flex items-center gap-2 py-0.5">
                            <span className="text-[10px] text-text-muted shrink-0">Z factor</span>
                            <input
                              type="range"
                              min="0.1"
                              max="5"
                              step="0.1"
                              value={hillshadeZFactor}
                              onChange={(e) => setHillshadeZFactor(parseFloat(e.target.value))}
                              className="flex-1 h-1.5 accent-accent"
                              title="Vertical exaggeration (QGIS). Adjust if gradient looks wrong."
                            />
                            <span className="text-[10px] text-text-muted tabular-nums w-8">{hillshadeZFactor.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-2 py-0.5">
                            <span className="text-[10px] text-text-muted shrink-0">Scale</span>
                            <input
                              type="number"
                              min="1000"
                              max="200000"
                              step="1000"
                              value={hillshadeScale ?? ""}
                              onChange={(e) => {
                                const v = e.target.value ? parseFloat(e.target.value) : null;
                                setHillshadeScale(v && !Number.isNaN(v) ? v : null);
                              }}
                              placeholder="auto"
                              className="w-20 rounded border border-border bg-bg-surface px-1.5 py-0.5 text-[10px] text-text-primary"
                              title="Vertical/horizontal ratio (m/deg). Auto for WGS84."
                            />
                            <span className="text-[9px] text-text-muted">m/deg</span>
                          </div>
                          <div className="flex items-center gap-2 py-0.5">
                            <span className="text-[10px] text-text-muted shrink-0">Smooth</span>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.1"
                              value={hillshadeSmoothness}
                              onChange={(e) => setHillshadeSmoothness(parseFloat(e.target.value))}
                              className="flex-1 h-1.5 accent-accent"
                            />
                            <span className="text-[10px] text-text-muted tabular-nums w-6">{hillshadeSmoothness.toFixed(1)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex items-center justify-between gap-2 py-0.5">
                        <span className="text-xs text-text-secondary truncate min-w-0 flex-1">Slope</span>
                        <button type="button" role="switch" aria-checked={slopeVisible} onClick={(e) => { e.stopPropagation(); setSlopeVisible(!slopeVisible); }} className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 ${slopeVisible ? "bg-accent/70" : "bg-border"}`}><span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${slopeVisible ? "translate-x-4" : "translate-x-0"}`} /></button>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-0.5">
                        <span className="text-xs text-text-secondary truncate min-w-0 flex-1">Aspect</span>
                        <button type="button" role="switch" aria-checked={aspectVisible} onClick={(e) => { e.stopPropagation(); setAspectVisible(!aspectVisible); }} className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 ${aspectVisible ? "bg-accent/70" : "bg-border"}`}><span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${aspectVisible ? "translate-x-4" : "translate-x-0"}`} /></button>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-0.5">
                        <span className="text-xs text-text-secondary truncate min-w-0 flex-1">Drainage</span>
                        <button type="button" role="switch" aria-checked={drainageVisible} onClick={(e) => { e.stopPropagation(); setDrainageVisible(!drainageVisible); }} className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 ${drainageVisible ? "bg-accent/70" : "bg-border"}`}><span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${drainageVisible ? "translate-x-4" : "translate-x-0"}`} /></button>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-0.5">
                        <span className="text-xs text-text-secondary truncate min-w-0 flex-1">Frost Pockets</span>
                        <button type="button" role="switch" aria-checked={frostPocketsVisible} onClick={(e) => { e.stopPropagation(); setFrostPocketsVisible(!frostPocketsVisible); }} className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 ${frostPocketsVisible ? "bg-accent/70" : "bg-border"}`}><span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${frostPocketsVisible ? "translate-x-4" : "translate-x-0"}`} /></button>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-0.5">
                        <span className="text-xs text-text-secondary truncate min-w-0 flex-1">Contours</span>
                        <button type="button" role="switch" aria-checked={contoursVisible} onClick={(e) => { e.stopPropagation(); setContoursVisible(!contoursVisible); }} className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 ${contoursVisible ? "bg-accent/70" : "bg-border"}`}><span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${contoursVisible ? "translate-x-4" : "translate-x-0"}`} /></button>
                      </div>
                    </div>
                  </div>
                )}
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

      {fencePlannerOpen && <FencePlannerPanel />}
      <ElevationProfilePanel />
    </div>
  );
}
