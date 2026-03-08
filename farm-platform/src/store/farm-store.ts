import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import type {
  FarmNode,
  FarmGroup,
  FarmProfile,
  NodeKind,
  NodeData,
  ActivityEntry,
  HarvestEntry,
  PhotoEntry,
  GardenData,
  FieldData,
  PastureData,
  OrchardData,
  WellData,
  PumpData,
  BarnData,
  CompostData,
  IrrigationData,
  FenceData,
  StreamData,
  NODE_KIND_COLORS,
} from "@/types";
import type { GeoJSON } from "geojson";

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

function emptyData(kind: NodeKind): NodeData {
  switch (kind) {
    case "garden":
      return { kind: "garden", beds: [], amendments: [] };
    case "field":
      return { kind: "field", soilTests: [], rotationHistory: [] };
    case "pasture":
      return { kind: "pasture", grazingLog: [], improvements: [], hayHarvests: [] };
    case "orchard":
      return { kind: "orchard", varieties: [], pruningLog: [], spraySchedule: [] };
    case "well":
      return { kind: "well", waterQuality: {} };
    case "pump":
      return { kind: "pump", destinationNodeIds: [] };
    case "barn":
      return { kind: "barn", equipment: [] };
    case "compost":
      return { kind: "compost", temperatureLog: [], inputs: [], applications: [] };
    case "irrigation":
      return { kind: "irrigation", zonesServed: [] };
    case "fence":
      return { kind: "fence", connectedPastures: [] };
    case "stream":
      return { kind: "stream" };
    case "pond":
      return { kind: "pond", waterQuality: {}, maintenanceLog: [], stockedFish: [] };
    case "greenhouse":
      return { kind: "greenhouse", beds: [] };
    case "spring":
      return { kind: "spring", waterQuality: {} };
    case "shop":
      return { kind: "shop", equipment: [], supplies: [] };
    case "silo":
      return { kind: "silo" };
    case "beehive":
      return { kind: "beehive", inspectionLog: [], harvestLog: [], treatments: [] };
    case "gate":
      return { kind: "gate" };
    case "road":
      return { kind: "road" };
    case "pipeline":
      return { kind: "pipeline", destinationNodeIds: [] };
    case "ditch":
      return { kind: "ditch" };
    case "powerline":
      return { kind: "powerline", servesNodeIds: [] };
  }
}

interface FarmStore {
  nodes: FarmNode[];
  groups: FarmGroup[];
  profile: FarmProfile;
  selectedId: string | null;

  addNode: (kind: NodeKind, name: string, geometry: GeoJSON, groupId?: string) => string;
  addGroup: (name: string, color?: string) => string;
  updateGroup: (id: string, updates: Partial<FarmGroup>) => void;
  removeGroup: (id: string) => void;
  updateNode: (id: string, updates: Partial<FarmNode>) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  removeNode: (id: string) => void;
  setSelected: (id: string | null) => void;

  addConnection: (a: string, b: string) => void;
  removeConnection: (a: string, b: string) => void;

  logActivity: (nodeId: string, entry: Omit<ActivityEntry, "id">) => void;
  logHarvest: (nodeId: string, entry: Omit<HarvestEntry, "id">) => void;
  addPhoto: (nodeId: string, entry: Omit<PhotoEntry, "id">) => void;
  removePhoto: (nodeId: string, photoId: string) => void;

  bulkLogActivity: (nodeIds: string[], entry: Omit<ActivityEntry, "id">) => void;

  copyLastSeason: (fromYear: number, toYear: number) => void;

  updateProfile: (updates: Partial<FarmProfile>) => void;

  getFlowState: () => { nodes: Node[]; edges: Edge[] };
}

export const useFarmStore = create<FarmStore>((set, get) => ({
  nodes: [],
  groups: [],
  profile: { name: "My Farm", currentSeason: new Date().getFullYear() },
  selectedId: null,

  addNode: (kind, name, geometry, groupId) => {
    const id = uid();
    const ts = now();
    const node: FarmNode = {
      id,
      kind,
      name,
      groupId,
      geometry,
      connections: [],
      data: emptyData(kind),
      activityLog: [],
      harvestLog: [],
      photos: [],
      createdAt: ts,
      updatedAt: ts,
    };
    set((s) => ({ nodes: [...s.nodes, node] }));
    return id;
  },

  addGroup: (name, color) => {
    const id = uid();
    set((s) => ({ groups: [...s.groups, { id, name, color }] }));
    return id;
  },

  updateGroup: (id, updates) => {
    set((s) => ({
      groups: s.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }));
  },

  removeGroup: (id) => {
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== id),
      nodes: s.nodes.map((n) =>
        n.groupId === id ? { ...n, groupId: undefined } : n
      ),
    }));
  },

  updateNode: (id, updates) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: now() } : n
      ),
    }));
  },

  updateNodeData: (id, dataUpdates) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, ...dataUpdates } as NodeData, updatedAt: now() }
          : n
      ),
    }));
  },

  removeNode: (id) => {
    set((s) => ({
      nodes: s.nodes
        .filter((n) => n.id !== id)
        .map((n) => ({
          ...n,
          connections: n.connections.filter((c) => c !== id),
        })),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },

  setSelected: (id) => set({ selectedId: id }),

  addConnection: (a, b) => {
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id === a && !n.connections.includes(b))
          return { ...n, connections: [...n.connections, b], updatedAt: now() };
        if (n.id === b && !n.connections.includes(a))
          return { ...n, connections: [...n.connections, a], updatedAt: now() };
        return n;
      }),
    }));
  },

  removeConnection: (a, b) => {
    set((s) => ({
      nodes: s.nodes.map((n) => {
        if (n.id === a)
          return { ...n, connections: n.connections.filter((c) => c !== b), updatedAt: now() };
        if (n.id === b)
          return { ...n, connections: n.connections.filter((c) => c !== a), updatedAt: now() };
        return n;
      }),
    }));
  },

  logActivity: (nodeId, entry) => {
    const e: ActivityEntry = { ...entry, id: uid() };
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, activityLog: [e, ...n.activityLog], updatedAt: now() }
          : n
      ),
    }));
  },

  logHarvest: (nodeId, entry) => {
    const e: HarvestEntry = { ...entry, id: uid() };
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, harvestLog: [e, ...n.harvestLog], updatedAt: now() }
          : n
      ),
    }));
  },

  addPhoto: (nodeId, entry) => {
    const e: PhotoEntry = { ...entry, id: uid() };
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, photos: [e, ...n.photos], updatedAt: now() }
          : n
      ),
    }));
  },

  removePhoto: (nodeId, photoId) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, photos: n.photos.filter((p) => p.id !== photoId), updatedAt: now() }
          : n
      ),
    }));
  },

  bulkLogActivity: (nodeIds, entry) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        nodeIds.includes(n.id)
          ? { ...n, activityLog: [{ ...entry, id: uid() }, ...n.activityLog], updatedAt: now() }
          : n
      ),
    }));
  },

  copyLastSeason: (fromYear, toYear) => {
    set((s) => {
      const updated = s.nodes.map((n) => {
        if (n.data.kind !== "garden") return n;
        const gardenData = n.data as GardenData;
        const newBeds = gardenData.beds.map((bed) => {
          const prevPlantings = bed.plantings.filter((p) => p.season === fromYear);
          const copied = prevPlantings.map((p) => ({
            ...p,
            id: uid(),
            season: toYear,
            status: "planned" as const,
            datePlanted: undefined,
            dateExpectedHarvest: undefined,
          }));
          return { ...bed, plantings: [...bed.plantings, ...copied] };
        });
        return {
          ...n,
          data: { ...gardenData, beds: newBeds },
          updatedAt: now(),
        };
      });
      return { nodes: updated };
    });
  },

  updateProfile: (updates) => {
    set((s) => ({ profile: { ...s.profile, ...updates } }));
  },

  getFlowState: () => {
    const { nodes } = get();
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    const edgeSet = new Set<string>();

    const kindToColor: Record<string, string> = {
      garden: "#22c55e", field: "#84cc16", pasture: "#a3e635", orchard: "#4ade80",
      well: "#38bdf8", pump: "#60a5fa",
      barn: "#94a3b8", compost: "#a78bfa",
      irrigation: "#22d3ee", fence: "#78716c", stream: "#0ea5e9",
    };

    nodes.forEach((n, i) => {
      flowNodes.push({
        id: n.id,
        type: "farmNode",
        position: { x: 100 + (i % 4) * 240, y: 80 + Math.floor(i / 4) * 160 },
        data: { label: n.name, kind: n.kind, color: kindToColor[n.kind] ?? "#94a3b8" },
      });

      n.connections.forEach((targetId) => {
        const key = [n.id, targetId].sort().join("--");
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          flowEdges.push({
            id: `e-${key}`,
            source: n.id,
            target: targetId,
            type: "smoothstep",
            animated: false,
            style: { stroke: "var(--border-color)" },
          });
        }
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  },
}));
