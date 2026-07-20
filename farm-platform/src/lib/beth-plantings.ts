import type { FarmNode, GardenData, BedNodeData, Planting, Bed, NodeData } from "@/types";

/** One planting row with enough context to update farm-store. */
export interface FlatPlantingRef {
  planting: Planting;
  nodeId: string;
  nodeName: string;
  source: "garden-bed" | "bed-node";
  /** Inner bed id when source is garden-bed */
  bedId?: string;
  bedName?: string;
}

export function flattenPlantingsFromNodes(nodes: FarmNode[]): FlatPlantingRef[] {
  const out: FlatPlantingRef[] = [];
  for (const n of nodes) {
    if (n.kind === "garden") {
      const d = n.data as GardenData;
      for (const bed of d.beds ?? []) {
        for (const p of bed.plantings ?? []) {
          out.push({
            planting: p,
            nodeId: n.id,
            nodeName: n.name,
            source: "garden-bed",
            bedId: bed.id,
            bedName: bed.name,
          });
        }
      }
    }
    if (n.kind === "bed") {
      const d = n.data as BedNodeData;
      for (const p of d.plantings ?? []) {
        out.push({
          planting: p,
          nodeId: n.id,
          nodeName: n.name,
          source: "bed-node",
        });
      }
    }
  }
  return out;
}

export function updatePlantingInStore(
  nodes: FarmNode[],
  ref: FlatPlantingRef,
  planting: Planting,
  updateNodeData: (id: string, data: Partial<NodeData>) => void
): void {
  const node = nodes.find((x) => x.id === ref.nodeId);
  if (!node) return;
  if (ref.source === "bed-node") {
    const d = node.data as BedNodeData;
    updateNodeData(ref.nodeId, {
      plantings: d.plantings.map((x) => (x.id === ref.planting.id ? planting : x)),
    } as Partial<BedNodeData>);
    return;
  }
  const d = node.data as GardenData;
  const beds = d.beds.map((b: Bed) =>
    b.id === ref.bedId
      ? {
          ...b,
          plantings: b.plantings.map((x) => (x.id === ref.planting.id ? planting : x)),
        }
      : b
  );
  updateNodeData(ref.nodeId, { beds } as Partial<GardenData>);
}

export function removePlantingInStore(
  nodes: FarmNode[],
  ref: FlatPlantingRef,
  updateNodeData: (id: string, data: Partial<NodeData>) => void
): void {
  const node = nodes.find((x) => x.id === ref.nodeId);
  if (!node) return;
  if (ref.source === "bed-node") {
    const d = node.data as BedNodeData;
    updateNodeData(ref.nodeId, {
      plantings: d.plantings.filter((x) => x.id !== ref.planting.id),
    } as Partial<BedNodeData>);
    return;
  }
  const d = node.data as GardenData;
  const beds = d.beds.map((b: Bed) =>
    b.id === ref.bedId
      ? { ...b, plantings: b.plantings.filter((x) => x.id !== ref.planting.id) }
      : b
  );
  updateNodeData(ref.nodeId, { beds } as Partial<GardenData>);
}

export function addPlantingToGardenBed(
  gardenNodeId: string,
  bedId: string,
  planting: Planting,
  nodes: FarmNode[],
  updateNodeData: (id: string, data: Partial<NodeData>) => void
): void {
  const node = nodes.find((x) => x.id === gardenNodeId);
  if (!node || node.kind !== "garden") return;
  const d = node.data as GardenData;
  const beds = d.beds.map((b: Bed) =>
    b.id === bedId ? { ...b, plantings: [...b.plantings, planting] } : b
  );
  updateNodeData(gardenNodeId, { beds } as Partial<GardenData>);
}

export function addPlantingToBedNode(
  bedNodeId: string,
  planting: Planting,
  nodes: FarmNode[],
  updateNodeData: (id: string, data: Partial<NodeData>) => void
): void {
  const node = nodes.find((x) => x.id === bedNodeId);
  if (!node || node.kind !== "bed") return;
  const d = node.data as BedNodeData;
  updateNodeData(bedNodeId, {
    plantings: [...d.plantings, planting],
  } as Partial<BedNodeData>);
}
