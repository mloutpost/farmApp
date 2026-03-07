import { create } from "zustand";
import type { FarmNode, FarmNodeType, FlowNodeVariant } from "@/types";
import type { Node, Edge } from "@xyflow/react";

function defaultPosition(type: FarmNodeType, siblingIndex: number): { x: number; y: number } {
  if (type === "farm") return { x: 80, y: 80 };
  if (type === "zone") return { x: 260, y: 60 + siblingIndex * 100 };
  return { x: 440, y: 40 + siblingIndex * 70 };
}

/** Infrastructure flow demo matching mockup */
const INFRASTRUCTURE_NODES: FarmNode[] = [
  {
    id: "water-source",
    type: "zone",
    parentId: null,
    name: "Water Source",
    zoneType: "infrastructure",
    flowVariant: "water_source",
    flowData: { level: 88, flow: "55GPM" },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "water-dist",
    type: "zone",
    parentId: null,
    name: "Water Distribution",
    zoneType: "infrastructure",
    flowVariant: "water_distribution",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "garden-a",
    type: "zone",
    parentId: null,
    name: "Garden A",
    zoneType: "garden",
    flowVariant: "garden",
    flowData: { data: 88, plantDate: "5110", harvestEst: "83tos", automation: "ON" },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "bed-1",
    type: "sub",
    parentId: null,
    name: "Raised-Bed",
    subType: "raised_bed",
    flowVariant: "raised_bed",
    flowData: { plantDate: "Sep 17", harvestEst: "Sep 24, 2024", crop: "Carrots" },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "bed-2",
    type: "sub",
    parentId: null,
    name: "Raised-Bed",
    subType: "raised_bed",
    flowVariant: "raised_bed",
    flowData: { plantDate: "Sep 17", harvestEst: "Sep 24, 2024", crop: "Kale" },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "bed-3",
    type: "sub",
    parentId: null,
    name: "Raised-Bed",
    subType: "raised_bed",
    flowVariant: "raised_bed",
    flowData: { plantDate: "Sep 17", harvestEst: "Sep 24, 2024" },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "field-1",
    type: "zone",
    parentId: null,
    name: "Field 1",
    zoneType: "field",
    flowVariant: "field",
    flowData: { soilPh: 6.9, crop: "Corn", yieldEst: "200 bu/acre" },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "field-2",
    type: "zone",
    parentId: null,
    name: "Field 2",
    zoneType: "field",
    flowVariant: "field",
    flowData: { soilPh: 6.9, crop: "Corn", yieldEst: "30 bu/acre" },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "livestock-manure",
    type: "zone",
    parentId: null,
    name: "Livestock Manure System",
    zoneType: "pasture",
    flowVariant: "livestock_system",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "compost",
    type: "zone",
    parentId: null,
    name: "Compost Facility",
    zoneType: "infrastructure",
    flowVariant: "compost_facility",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "cattle-pasture",
    type: "zone",
    parentId: null,
    name: "Cattle Pasture",
    zoneType: "pasture",
    flowVariant: "pasture",
    flowData: { cattleCount: 50 },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/** Edges for infrastructure flow (sourceId -> targetId) */
const INFRASTRUCTURE_EDGES: [string, string][] = [
  ["water-source", "water-dist"],
  ["water-dist", "garden-a"],
  ["water-dist", "field-1"],
  ["water-dist", "field-2"],
  ["garden-a", "bed-1"],
  ["garden-a", "bed-2"],
  ["garden-a", "bed-3"],
  ["livestock-manure", "compost"],
];

const DEMO_NODES: FarmNode[] = INFRASTRUCTURE_NODES;

interface NodeStore {
  nodes: FarmNode[];
  flowNodePositions: Record<string, { x: number; y: number }>;
  flowEdges: [string, string][];
  selectedNodeId: string | null;
  nodePanelOpen: boolean;
  useInfrastructureFlow: boolean;

  setNodes: (nodes: FarmNode[]) => void;
  setFlowEdges: (edges: [string, string][]) => void;
  addNode: (node: Omit<FarmNode, "id" | "createdAt" | "updatedAt">) => string;
  updateNode: (id: string, updates: Partial<FarmNode>) => void;
  removeNode: (id: string) => void;
  setSelectedNode: (id: string | null) => void;
  setNodePanelOpen: (open: boolean) => void;
  toggleNodePanel: () => void;
  setFlowNodePosition: (id: string, pos: { x: number; y: number }) => void;
  getFlowState: () => { nodes: Node[]; edges: Edge[] };
}

export const useNodeStore = create<NodeStore>((set, get) => ({
  nodes: DEMO_NODES,
  flowNodePositions: {},
  flowEdges: INFRASTRUCTURE_EDGES,
  selectedNodeId: null,
  nodePanelOpen: true,
  useInfrastructureFlow: true,

  setNodes: (nodes) => set({ nodes }),
  addNode: (node) => {
    const id = `node-${Date.now()}`;
    const now = new Date();
    set((s) => ({
      nodes: [...s.nodes, { ...node, id, createdAt: now, updatedAt: now }],
    }));
    return id;
  },
  updateNode: (id, updates) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: new Date() } : n
      ),
    }));
  },
  removeNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id && n.parentId !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }));
  },
  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setNodePanelOpen: (open) => set({ nodePanelOpen: open }),
  toggleNodePanel: () => set((s) => ({ nodePanelOpen: !s.nodePanelOpen })),
  setFlowNodePosition: (id, pos) => {
    set((s) => ({
      flowNodePositions: { ...s.flowNodePositions, [id]: pos },
    }));
  },
  setFlowEdges: (edges) => set({ flowEdges: edges }),

  getFlowState: () => {
    const { nodes, flowNodePositions, flowEdges: storedEdges, useInfrastructureFlow } = get();
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    if (useInfrastructureFlow && storedEdges.length > 0) {
      // Infrastructure flow: use stored edges, dagre layout by connection structure
      const positions = getInfrastructurePositions(nodes, storedEdges);
      nodes.forEach((n) => {
        const pos = flowNodePositions[n.id] ?? positions[n.id] ?? { x: 100, y: 100 };
        flowNodes.push({
          id: n.id,
          type: n.flowVariant ? "flow" : n.type,
          position: pos,
          data: { label: n.name, ...n },
        });
      });
      storedEdges.forEach(([src, tgt], i) => {
        if (nodeMap.has(src) && nodeMap.has(tgt)) {
          flowEdges.push({ id: `e-${src}-${tgt}-${i}`, source: src, target: tgt });
        }
      });
    } else {
      const byParent = new Map<string | null, FarmNode[]>();
      nodes.forEach((n) => {
        const key = n.parentId ?? "__root__";
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key)!.push(n);
      });
      nodes.forEach((n) => {
        const siblings = byParent.get(n.parentId ?? "__root__") ?? [];
        const idx = siblings.findIndex((s) => s.id === n.id);
        const pos = flowNodePositions[n.id] ?? defaultPosition(n.type, idx);
        flowNodes.push({
          id: n.id,
          type: n.type,
          position: pos,
          data: { label: n.name, ...n },
          parentId: n.parentId ?? undefined,
          extent: n.parentId ? "parent" : undefined,
        });
        if (n.parentId) {
          flowEdges.push({ id: `e-${n.parentId}-${n.id}`, source: n.parentId, target: n.id });
        }
      });
    }

    return { nodes: flowNodes, edges: flowEdges };
  },
}));

function getInfrastructurePositions(
  nodes: FarmNode[],
  edges: [string, string][]
): Record<string, { x: number; y: number }> {
  const result: Record<string, { x: number; y: number }> = {};
  const outEdges = new Map<string, string[]>();
  nodes.forEach((n) => outEdges.set(n.id, []));
  edges.forEach(([src, tgt]) => outEdges.get(src)?.push(tgt));

  const ranks = new Map<string, number>();
  const visit = (id: string, r: number) => {
    if ((ranks.get(id) ?? -1) >= r) return;
    ranks.set(id, r);
    for (const tgt of outEdges.get(id) ?? []) visit(tgt, r + 1);
  };
  const roots = nodes.filter((n) => !edges.some(([, t]) => t === n.id)).map((n) => n.id);
  roots.length ? roots.forEach((id) => visit(id, 0)) : nodes.forEach((n) => visit(n.id, 0));

  const byRank = new Map<number, string[]>();
  nodes.forEach((n) => {
    const r = ranks.get(n.id) ?? 0;
    if (!byRank.has(r)) byRank.set(r, []);
    byRank.get(r)!.push(n.id);
  });

  const RANK_SEP = 220;
  const NODE_SEP = 140;
  byRank.forEach((ids, rank) => {
    ids.forEach((id, idx) => {
      result[id] = { x: 120 + rank * RANK_SEP, y: 80 + idx * NODE_SEP };
    });
  });
  return result;
}
