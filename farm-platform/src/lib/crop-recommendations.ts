import type {
  FarmNode,
  FarmProfile,
  Planting,
  GardenData,
  BedNodeData,
  FieldData,
  GreenhouseData,
} from "@/types";
import type { CropEntry } from "./crop-catalog";
import { CROP_CATALOG, getCropById } from "./crop-catalog";

export interface CropRecommendation {
  cropId: string;
  cropName: string;
  reason: string;
  score: number;
  tags: string[];
}

const HIGH_DEMAND_IDS = new Set([
  "tomato", "pepper-bell", "pepper-hot", "lettuce", "basil",
  "cilantro", "parsley", "mint", "strawberry", "blueberry",
  "raspberry", "blackberry", "cucumber", "zucchini", "kale",
]);

function parseZoneNumber(zone?: string): number | null {
  if (!zone) return null;
  const m = zone.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function getPlantingsFromNode(node: FarmNode): Planting[] {
  const d = node.data;
  if (d.kind === "bed") return (d as BedNodeData).plantings ?? [];
  if (d.kind === "garden") {
    return (d as GardenData).beds?.flatMap((b) => b.plantings) ?? [];
  }
  if (d.kind === "greenhouse") {
    return (d as GreenhouseData).beds?.flatMap((b) => b.plantings) ?? [];
  }
  if (d.kind === "field" && (d as FieldData).currentCrop) {
    return [{ id: "field-current", crop: (d as FieldData).currentCrop!, status: "growing" }];
  }
  return [];
}

function getNodeSoilPh(node: FarmNode): number | null {
  const d = node.data;
  if (d.kind === "field") {
    const tests = (d as FieldData).soilTests;
    if (tests?.length) return tests[tests.length - 1].ph ?? null;
  }
  return null;
}

function getPlantedCropFamilies(node: FarmNode, season?: number): Set<string> {
  const plantings = getPlantingsFromNode(node);
  const families = new Set<string>();

  for (const p of plantings) {
    if (season && p.season && p.season !== season) continue;
    const entry = p.catalogId
      ? getCropById(p.catalogId)
      : CROP_CATALOG.find((c) => c.name.toLowerCase() === p.crop.toLowerCase());
    if (entry) families.add(entry.category);
  }
  return families;
}

function getNearbyPlantedCropNames(
  node: FarmNode,
  allNodes: FarmNode[],
): Set<string> {
  const names = new Set<string>();
  const related = new Set([node.id, ...(node.connections ?? [])]);
  if (node.parentId) related.add(node.parentId);

  for (const n of allNodes) {
    if (!related.has(n.id) && n.parentId !== node.id) continue;
    for (const p of getPlantingsFromNode(n)) {
      names.add(p.crop);
    }
  }
  return names;
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000,
  );
}

function scoreZone(crop: CropEntry, farmZone: number | null): number {
  if (farmZone === null) return 10;
  if (farmZone >= crop.zoneMin && farmZone <= crop.zoneMax) return 25;
  const dist = Math.min(
    Math.abs(farmZone - crop.zoneMin),
    Math.abs(farmZone - crop.zoneMax),
  );
  return dist <= 1 ? 10 : 0;
}

function scoreCompanion(crop: CropEntry, nearbyNames: Set<string>): number {
  for (const comp of crop.companions) {
    if (nearbyNames.has(comp)) return 15;
  }
  return 0;
}

function scoreRotation(
  crop: CropEntry,
  lastSeasonFamilies: Set<string>,
): number {
  if (lastSeasonFamilies.size === 0) return 20;
  return lastSeasonFamilies.has(crop.category) ? 0 : 20;
}

function scoreMarketDemand(crop: CropEntry): number {
  return HIGH_DEMAND_IDS.has(crop.id) ? 15 : 0;
}

function scoreSeasonFit(
  crop: CropEntry,
  firstFrostFall?: string,
): number {
  if (!firstFrostFall) return 8;
  const today = new Date().toISOString().slice(0, 10);
  const remaining = daysBetween(today, firstFrostFall);
  if (remaining <= 0) return crop.frostTolerance === "hardy" ? 15 : 0;
  return remaining >= crop.dtmMin ? 15 : 0;
}

function scoreSoilMatch(crop: CropEntry, ph: number | null): number {
  if (ph === null) return 5;
  return ph >= crop.soilPhMin && ph <= crop.soilPhMax ? 10 : 0;
}

function buildReason(
  crop: CropEntry,
  scores: Record<string, number>,
): string {
  const parts: string[] = [];
  if (scores.zone === 25) parts.push("perfect zone match");
  if (scores.companion > 0) parts.push("companion to nearby crops");
  if (scores.rotation > 0) parts.push("good rotation choice");
  if (scores.market > 0) parts.push("high market demand");
  if (scores.season > 0) parts.push("fits remaining season");
  if (scores.soil === 10) parts.push("ideal soil pH");
  if (parts.length === 0) parts.push("general fit for your farm");
  return parts.join(" · ");
}

function buildTags(
  crop: CropEntry,
  scores: Record<string, number>,
): string[] {
  const tags: string[] = [crop.category];
  if (scores.market > 0) tags.push("high-demand");
  if (crop.frostTolerance === "hardy") tags.push("frost-hardy");
  if (scores.companion > 0) tags.push("companion");
  if (scores.rotation > 0) tags.push("rotation");
  return tags;
}

function isPlantableNode(node: FarmNode): boolean {
  return ["bed", "garden", "field", "greenhouse"].includes(node.kind);
}

export function getRecommendations(
  node: FarmNode,
  allNodes: FarmNode[],
  profile: FarmProfile,
  limit = 8,
): CropRecommendation[] {
  if (!isPlantableNode(node)) return [];

  const farmZone = parseZoneNumber(profile.hardinessZone);
  const soilPh = getNodeSoilPh(node);
  const nearby = getNearbyPlantedCropNames(node, allNodes);
  const currentSeason = profile.currentSeason ?? new Date().getFullYear();
  const lastSeasonFamilies = getPlantedCropFamilies(node, currentSeason - 1);
  const currentPlantings = getPlantingsFromNode(node);
  const alreadyPlanted = new Set(
    currentPlantings
      .filter((p) => !p.season || p.season === currentSeason)
      .map((p) => (p.catalogId ?? p.crop).toLowerCase()),
  );

  const results: CropRecommendation[] = [];

  for (const crop of CROP_CATALOG) {
    if (alreadyPlanted.has(crop.id) || alreadyPlanted.has(crop.name.toLowerCase())) {
      continue;
    }

    const scores = {
      zone: scoreZone(crop, farmZone),
      companion: scoreCompanion(crop, nearby),
      rotation: scoreRotation(crop, lastSeasonFamilies),
      market: scoreMarketDemand(crop),
      season: scoreSeasonFit(crop, profile.firstFrostFall),
      soil: scoreSoilMatch(crop, soilPh),
    };

    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    if (total <= 10) continue;

    results.push({
      cropId: crop.id,
      cropName: crop.name,
      reason: buildReason(crop, scores),
      score: Math.min(total, 100),
      tags: buildTags(crop, scores),
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
