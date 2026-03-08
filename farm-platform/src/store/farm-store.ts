import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import type {
  FarmNode,
  FarmGroup,
  FarmProfile,
  FarmTask,
  FinancialEntry,
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
} from "@/types";
import { NODE_KIND_COLORS, NODE_KIND_LABELS } from "@/types";
import type { GeoJSON } from "geojson";
import { mergeLineSegments } from "@/lib/merge-lines";

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

function computeNextDueDate(current: string, recurrence: string): string {
  const d = new Date(current + "T12:00:00");
  switch (recurrence) {
    case "daily": d.setDate(d.getDate() + 1); break;
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "biweekly": d.setDate(d.getDate() + 14); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "yearly": d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().slice(0, 10);
}

function emptyData(kind: NodeKind): NodeData {
  switch (kind) {
    case "garden":
      return { kind: "garden", beds: [], amendments: [] };
    case "bed":
      return { kind: "bed", plantings: [] };
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
    case "vineyard":
      return { kind: "vineyard", varieties: [], pruningLog: [], spraySchedule: [] };
    case "woodlot":
      return { kind: "woodlot", primarySpecies: [], harvestLog: [] };
    case "corral":
      return { kind: "corral", connectedPastures: [] };
    case "building":
      return { kind: "building" };
    case "coop":
      return { kind: "coop", breeds: [], eggLog: [], flockLog: [] };
    case "cellar":
      return { kind: "cellar", inventory: [] };
    case "smokehouse":
      return { kind: "smokehouse", smokingLog: [], brineRecipes: [] };
    case "rainwater":
      return { kind: "rainwater", maintenanceLog: [] };
  }
}

interface FarmStore {
  nodes: FarmNode[];
  groups: FarmGroup[];
  profile: FarmProfile;
  selectedId: string | null;
  tasks: FarmTask[];
  finances: FinancialEntry[];
  flowPositions: Record<string, { x: number; y: number }>;

  addNode: (kind: NodeKind, name: string, geometry: GeoJSON, groupId?: string, parentId?: string) => string;
  addGroup: (name: string, color?: string) => string;
  updateGroup: (id: string, updates: Partial<FarmGroup>) => void;
  removeGroup: (id: string) => void;
  updateNode: (id: string, updates: Partial<FarmNode>) => void;
  changeNodeKind: (id: string, newKind: NodeKind) => void;
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
  mergeLineNodes: (kind: NodeKind) => number;

  updateProfile: (updates: Partial<FarmProfile>) => void;

  addTask: (task: Omit<FarmTask, "id" | "createdAt" | "updatedAt">) => string;
  updateTask: (id: string, updates: Partial<FarmTask>) => void;
  removeTask: (id: string) => void;
  completeTask: (id: string) => void;

  addFinancialEntry: (entry: Omit<FinancialEntry, "id" | "createdAt">) => string;
  updateFinancialEntry: (id: string, updates: Partial<FinancialEntry>) => void;
  removeFinancialEntry: (id: string) => void;

  setFlowPosition: (nodeId: string, pos: { x: number; y: number }) => void;
  setFlowPositions: (positions: Record<string, { x: number; y: number }>) => void;

  getFlowState: () => { nodes: Node[]; edges: Edge[] };
}

export const useFarmStore = create<FarmStore>((set, get) => ({
  nodes: [],
  groups: [],
  profile: { name: "My Farm", currentSeason: new Date().getFullYear() },
  selectedId: null,
  tasks: [],
  finances: [],
  flowPositions: {},

  addNode: (kind, name, geometry, groupId, parentId) => {
    const id = uid();
    const ts = now();
    const node: FarmNode = {
      id,
      kind,
      name,
      groupId,
      parentId,
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

  changeNodeKind: (id, newKind) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? { ...n, kind: newKind, data: emptyData(newKind), updatedAt: now() }
          : n
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

  mergeLineNodes: (kind) => {
    const { nodes } = get();
    const targets = nodes.filter(
      (n) => n.kind === kind && n.geometry && (n.geometry as { type: string }).type === "LineString"
    );
    if (targets.length < 2) return 0;

    const lines: number[][][] = [];
    for (const n of targets) {
      const geo = n.geometry as { type: string; coordinates?: number[][] | number[][][] };
      const coords = geo?.coordinates;
      if (!coords) continue;
      if (Array.isArray(coords[0]) && typeof coords[0][0] === "number") {
        lines.push(coords as number[][]);
      } else if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
        (coords as number[][][]).forEach((ring) => {
          if (Array.isArray(ring) && ring.length >= 2) lines.push(ring);
        });
      }
    }
    if (lines.length < 2) return 0;

    const merged = mergeLineSegments(lines);
    const targetIds = new Set(targets.map((n) => n.id));
    const label = NODE_KIND_LABELS[kind] ?? kind;
    const ts = now();

    const newNodes: FarmNode[] = merged.map((coords, i) => ({
      id: uid(),
      kind,
      name: merged.length === 1 ? label : `${label} ${i + 1}`,
      geometry: { type: "LineString", coordinates: coords } as GeoJSON,
      connections: [],
      data: emptyData(kind),
      activityLog: [],
      harvestLog: [],
      photos: [],
      createdAt: ts,
      updatedAt: ts,
    }));

    set((s) => ({
      nodes: [
        ...s.nodes.filter((n) => !targetIds.has(n.id)),
        ...newNodes,
      ],
    }));

    return targets.length - merged.length;
  },

  updateProfile: (updates) => {
    set((s) => ({ profile: { ...s.profile, ...updates } }));
  },

  addTask: (task) => {
    const id = uid();
    const ts = now();
    set((s) => ({ tasks: [...s.tasks, { ...task, id, createdAt: ts, updatedAt: ts }] }));
    return id;
  },

  updateTask: (id, updates) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: now() } : t)),
    }));
  },

  removeTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  completeTask: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const ts = now();
    const today = ts.slice(0, 10);

    if (task.recurrence !== "none") {
      const nextDue = computeNextDueDate(task.dueDate ?? today, task.recurrence);
      if (!task.recurrenceEndDate || nextDue <= task.recurrenceEndDate) {
        const newId = uid();
        set((s) => ({
          tasks: [
            ...s.tasks.map((t) => (t.id === id ? { ...t, status: "done" as const, completedDate: today, updatedAt: ts } : t)),
            { ...task, id: newId, dueDate: nextDue, status: "todo" as const, completedDate: undefined, createdAt: ts, updatedAt: ts },
          ],
        }));
        return;
      }
    }

    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: "done" as const, completedDate: today, updatedAt: ts } : t)),
    }));
  },

  addFinancialEntry: (entry) => {
    const id = uid();
    set((s) => ({ finances: [...s.finances, { ...entry, id, createdAt: now() }] }));
    return id;
  },

  updateFinancialEntry: (id, updates) => {
    set((s) => ({
      finances: s.finances.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  },

  removeFinancialEntry: (id) => {
    set((s) => ({ finances: s.finances.filter((f) => f.id !== id) }));
  },

  setFlowPosition: (nodeId, pos) => {
    set((s) => ({ flowPositions: { ...s.flowPositions, [nodeId]: pos } }));
  },

  setFlowPositions: (positions) => {
    set({ flowPositions: positions });
  },

  getFlowState: () => {
    const { nodes, flowPositions } = get();
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    const edgeSet = new Set<string>();

    nodes.forEach((n, i) => {
      const saved = flowPositions[n.id];
      flowNodes.push({
        id: n.id,
        type: "farmNode",
        position: saved ?? { x: 100 + (i % 4) * 240, y: 80 + Math.floor(i / 4) * 160 },
        data: { label: n.name, kind: n.kind, color: NODE_KIND_COLORS[n.kind] ?? "#94a3b8" },
      });

      n.connections.forEach((targetId) => {
        const key = [n.id, targetId].sort().join("--");
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          flowEdges.push({
            id: `e-${key}`,
            source: n.id,
            target: targetId,
            type: "default",
            animated: false,
            style: { stroke: "var(--border-color)", strokeWidth: 2 },
          });
        }
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  },
}));
