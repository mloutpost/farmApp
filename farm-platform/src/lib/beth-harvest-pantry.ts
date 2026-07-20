import type { FarmNode } from "@/types";

export interface HarvestLine {
  id: string;
  date: string;
  crop: string;
  amount: number;
  unit: string;
  nodeId: string;
  nodeName: string;
}

/** Harvest log rows from garden and bed nodes (farm proceeds). */
export function collectHarvestLines(nodes: FarmNode[]): HarvestLine[] {
  const out: HarvestLine[] = [];
  for (const n of nodes) {
    if (n.kind !== "garden" && n.kind !== "bed") continue;
    for (const h of n.harvestLog ?? []) {
      out.push({
        id: h.id,
        date: h.date,
        crop: h.crop,
        amount: h.amount,
        unit: h.unit,
        nodeId: n.id,
        nodeName: n.name,
      });
    }
  }
  out.sort((a, b) => b.date.localeCompare(a.date));
  return out;
}

export interface HarvestAggregate {
  crop: string;
  unit: string;
  total: number;
}

export function aggregateHarvestByCropUnit(lines: HarvestLine[]): HarvestAggregate[] {
  const map = new Map<string, HarvestAggregate>();
  for (const h of lines) {
    const crop = h.crop.trim();
    const unitRaw = h.unit.trim() || "ea";
    const key = `${crop.toLowerCase()}\x1e${unitRaw.toLowerCase()}`;
    const cur = map.get(key);
    if (cur) cur.total += h.amount;
    else map.set(key, { crop: crop || "Crop", unit: unitRaw, total: h.amount });
  }
  return Array.from(map.values()).sort((a, b) => a.crop.localeCompare(b.crop));
}
