import type { FarmNode, FieldData, GardenData, BedNodeData, GreenhouseData, OrchardData, VineyardData } from "@/types";
import { formatCompanionsGrouped } from "@/lib/companion-sort";
import { CROP_CATALOG, CROP_CATEGORIES, getCropById, type CropCategory, type CropEntry } from "@/lib/crop-catalog";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Match a free-text crop name to a catalog id (exact name, case-insensitive). */
export function resolveCatalogIdFromName(name: string): string | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  const hit = CROP_CATALOG.find((c) => c.name.toLowerCase() === q);
  return hit?.id;
}

/**
 * Collect catalog crop ids from fields, gardens, beds, greenhouses, orchards, vineyards.
 */
export function collectCatalogCropIdsFromFarm(nodes: FarmNode[]): string[] {
  const seen = new Set<string>();

  const add = (id: string | undefined) => {
    if (id && getCropById(id)) seen.add(id);
  };

  for (const n of nodes) {
    if (n.kind === "field") {
      const d = n.data as FieldData;
      add(d.catalogId);
      if (!d.catalogId && d.currentCrop) add(resolveCatalogIdFromName(d.currentCrop));
    }
    if (n.kind === "orchard") {
      const d = n.data as OrchardData;
      add(d.catalogId);
      for (const v of d.varieties ?? []) add(resolveCatalogIdFromName(v));
    }
    if (n.kind === "vineyard") {
      const d = n.data as VineyardData;
      for (const v of d.varieties ?? []) add(resolveCatalogIdFromName(v));
    }
    if (n.kind === "garden") {
      const d = n.data as GardenData;
      for (const bed of d.beds ?? []) {
        for (const p of bed.plantings ?? []) {
          add(p.catalogId);
          if (!p.catalogId && p.crop) add(resolveCatalogIdFromName(p.crop));
        }
      }
    }
    if (n.kind === "bed") {
      const d = n.data as BedNodeData;
      for (const p of d.plantings ?? []) {
        add(p.catalogId);
        if (!p.catalogId && p.crop) add(resolveCatalogIdFromName(p.crop));
      }
    }
    if (n.kind === "greenhouse") {
      const d = n.data as GreenhouseData;
      for (const bed of d.beds ?? []) {
        for (const p of bed.plantings ?? []) {
          add(p.catalogId);
          if (!p.catalogId && p.crop) add(resolveCatalogIdFromName(p.crop));
        }
      }
    }
  }
  return [...seen];
}

export function entriesFromCatalogIds(ids: string[]): CropEntry[] {
  return ids.map((id) => getCropById(id)).filter((e): e is CropEntry => !!e);
}

export function springPlantingTiming(c: CropEntry, lastFrostNote?: string): string {
  const frost = lastFrostNote?.trim() ? ` Using your recorded last spring frost (${lastFrostNote.trim()}), align outdoor work to local forecasts.` : "";
  if (c.sowMethod === "transplant" && c.sowIndoorsWeeks != null) {
    return `Start seeds indoors about ${c.sowIndoorsWeeks} weeks before last frost; harden off and transplant after frost danger for your area. Days to maturity (from transplant): ~${c.dtmMin}–${c.dtmMax}.${frost}`;
  }
  if (c.directSowFrostWeeks != null) {
    const w = c.directSowFrostWeeks;
    const when =
      w <= 0
        ? `Direct sow about ${Math.abs(w)} week${Math.abs(w) === 1 ? "" : "s"} before average last frost`
        : `Direct sow about ${w} week${w === 1 ? "" : "s"} after last frost`;
    return `${when}. Days to maturity: ~${c.dtmMin}–${c.dtmMax}.${frost}`;
  }
  return `${c.sowMethod === "transplant" ? "Transplant" : "Direct sow"} when soil and weather match this crop (zones ${c.zoneMin}–${c.zoneMax}, ${c.frostTolerance} to frost). Typical DTM: ${c.dtmMin}–${c.dtmMax} days.${frost}`;
}

export function nutrientEnrichmentBullets(c: CropEntry): string[] {
  const lines: string[] = [
    `Target soil pH ${c.soilPhMin}–${c.soilPhMax}. Test soil; lime to raise or sulfur to lower as needed before planting.`,
    `2–4 weeks before planting: incorporate 1–2″ compost or well-rotted manure (unless crop prefers low fertility—see notes).`,
  ];
  const cat = c.category as CropCategory;
  if (cat === "legume") {
    lines.push(`Legume: use Rhizobium inoculant if seed is not pre-inoculated; avoid heavy N at planting.`);
  } else if (cat === "nightshade" || cat === "cucurbit") {
    lines.push(`Heavy feeder: modest balanced starter at planting; side-dress at bloom/fruit set per soil test, not by habit.`);
  } else if (cat === "brassica") {
    lines.push(`Brassica: split nitrogen applications; watch boron—deficiency and toxicity are both common.`);
  } else if (cat === "grain" || cat === "row-crop") {
    lines.push(`Field/grain: follow soil-test NPK; split N where regional guides recommend (e.g. topdress small grains).`);
  } else if (cat === "fruit" || cat === "tree") {
    lines.push(`Perennial: light early feed; avoid late-season nitrogen that delays hardening-off.`);
  } else {
    lines.push(`Mid-season: sidedress or foliar feed only if tissue test or clear deficiency symptoms justify it.`);
  }
  lines.push(`Water: ${c.waterNotes}`);
  return lines;
}

export function yieldHarvestSummary(c: CropEntry): string {
  const parts: string[] = [];
  if (c.yieldPerAcre) parts.push(`Yield guide (per acre): ${c.yieldPerAcre}.`);
  if (c.yieldPer10ft) parts.push(`Per 10 ft row: ${c.yieldPer10ft}.`);
  if (c.yieldPerPlant) parts.push(`Per plant: ${c.yieldPerPlant}.`);
  if (c.harvestWindowDays) parts.push(`Typical harvest window ~${c.harvestWindowDays} days once mature.`);
  if (c.seedingRate) parts.push(`Seeding rate: ${c.seedingRate}.`);
  if (parts.length === 0) parts.push(`See crop notes for yield expectations.`);
  return parts.join(" ");
}

export function buildSpringQuickStartHtml(
  entries: CropEntry[],
  farmName: string,
  year: number,
  opts?: { lastFrostSpring?: string; hardinessZone?: string },
): string {
  const frostLine = [opts?.hardinessZone ? `Zone ${escapeHtml(opts.hardinessZone)}` : null, opts?.lastFrostSpring ? `Last frost (spring): ${escapeHtml(opts.lastFrostSpring)}` : null]
    .filter(Boolean)
    .join(" · ");

  const cards = entries
    .map((c) => {
      const nuts = nutrientEnrichmentBullets(c).map((l) => `<li>${escapeHtml(l)}</li>`).join("");
      const companions = c.companions.length ? escapeHtml(formatCompanionsGrouped(c.companions)) : "—";
      const avoid = c.avoid.length ? escapeHtml(c.avoid.join(", ")) : "—";
      const pests = c.pests.length ? escapeHtml(c.pests.slice(0, 6).join(", ")) : "—";
      const diseases = c.diseases.length ? escapeHtml(c.diseases.slice(0, 6).join(", ")) : "—";

      return `
<section class="crop-card">
  <h2>${escapeHtml(c.name)} <span class="cat">${escapeHtml(CROP_CATEGORIES[c.category])}</span></h2>
  ${c.botanical ? `<p class="botanical">${escapeHtml(c.botanical)}</p>` : ""}
  <h3>Spring timing</h3>
  <p>${escapeHtml(springPlantingTiming(c, opts?.lastFrostSpring))}</p>
  <h3>Planting specifics</h3>
  <ul class="specs">
    <li><strong>Method:</strong> ${escapeHtml(c.sowMethod)} (${escapeHtml(c.frostTolerance)} to frost)</li>
    <li><strong>Depth:</strong> ${c.plantingDepthIn}" · <strong>In-row spacing:</strong> ${c.spacingIn}" · <strong>Row spacing:</strong> ${c.rowSpacingIn}"</li>
    <li><strong>Sun / water:</strong> ${escapeHtml(c.sun)} / ${escapeHtml(c.water)}</li>
    <li><strong>Companions:</strong> ${companions}</li>
    <li><strong>Avoid near:</strong> ${avoid}</li>
  </ul>
  <h3>Nutrient & soil (general guidance)</h3>
  <ul>${nuts}</ul>
  <h3>Yield & harvest (reference)</h3>
  <p>${escapeHtml(yieldHarvestSummary(c))}</p>
  <h3>Pests & diseases to scout</h3>
  <p><strong>Pests:</strong> ${pests}<br/><strong>Diseases:</strong> ${diseases}</p>
  <h3>Notes</h3>
  <p class="notes">${escapeHtml(c.notes)}</p>
</section>`;
    })
    .join("\n");

  return `
<p class="subtitle">Spring quick start · ${year} · Selected crops (${entries.length})</p>
${frostLine ? `<p class="frost-line">${frostLine}</p>` : ""}
<p class="disclaimer">This guide is generated from your crop catalog and farm profile. Adjust all dates to your microclimate, soil tests, and extension recommendations.</p>
${cards || "<p>No crops selected.</p>"}
`;
}
