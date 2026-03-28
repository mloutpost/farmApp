import type { FarmNode, FieldData, OrchardData, PastureData } from "@/types";

/** True if the node has a crop/forage/orchard variety assigned (for map hatching). */
export function nodeHasCropArea(node: FarmNode): boolean {
  if (node.kind === "field") {
    const t = (node.data as FieldData).currentCrop?.trim();
    return !!t;
  }
  if (node.kind === "pasture") {
    const t = (node.data as PastureData).forageType?.trim();
    return !!t;
  }
  if (node.kind === "orchard") {
    const v = (node.data as OrchardData).varieties;
    return Array.isArray(v) && v.some((s) => typeof s === "string" && s.trim().length > 0);
  }
  return false;
}
