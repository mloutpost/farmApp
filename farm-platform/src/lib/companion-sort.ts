/**
 * Classify catalog companion labels for display order.
 * Heuristic: nutrient / rotation / N-fixing cues are checked before pest-herb cues.
 */

export type CompanionBenefit = "pest" | "nutrient" | "general";

export function classifyCompanionBenefit(raw: string): CompanionBenefit {
  const s = raw.toLowerCase();

  // Nutrient cycling, N-fixing, rotations, cover/forage, soil restoration
  if (
    s.includes("cover crop") ||
    s.includes("nurse crop") ||
    s.includes("rotation") ||
    s.includes("double-crop") ||
    s.includes("overseed") ||
    s.includes("clover") ||
    s.includes("comfrey") ||
    s.includes("alfalfa") ||
    s.includes("legume") ||
    s.includes("soybean") ||
    s.includes("cowpeas") ||
    s.includes("grain sorghum") ||
    s.includes("pulse crop") ||
    s.includes("small grains") ||
    s.includes("all pasture") ||
    s.includes("native grasses") ||
    s.includes("native groundcovers") ||
    /\b(bean|peas?)\b/.test(s) ||
    /\b(wheat|barley|oats|ryegrass|fescue|timothy|orchardgrass|bermudagrass|canola)\b/.test(s)
  ) {
    return "nutrient";
  }

  // Pest suppression, repellents, trap crops, beneficial / pollinator habitat
  if (
    /\b(marigold|nasturtium|basil|garlic|onion|chive|leek|shallot|tansy|rue|dill|borage|rosemary|thyme|oregano|sage|hyssop|lavender|chamomile|sunflower|tarragon|parsley|horseradish|radish|rose)\b/.test(s) ||
    s.includes("wildflowers") ||
    s.includes("pollinator")
  ) {
    return "pest";
  }

  return "general";
}

const collator = new Intl.Collator("en", { sensitivity: "base" });

function sortAlpha(a: string, b: string): number {
  return collator.compare(a, b);
}

export function groupCompanionsByBenefit(companions: string[]): {
  pest: string[];
  nutrient: string[];
  general: string[];
} {
  const pest: string[] = [];
  const nutrient: string[] = [];
  const general: string[] = [];
  for (const c of companions) {
    const k = classifyCompanionBenefit(c);
    if (k === "pest") pest.push(c);
    else if (k === "nutrient") nutrient.push(c);
    else general.push(c);
  }
  pest.sort(sortAlpha);
  nutrient.sort(sortAlpha);
  general.sort(sortAlpha);
  return { pest, nutrient, general };
}

/** Flat list: pest management → nutrient & soil → other (alphabetical within each). */
export function sortCompanionsByBenefit(companions: string[]): string[] {
  const { pest, nutrient, general } = groupCompanionsByBenefit(companions);
  return [...pest, ...nutrient, ...general];
}

/** Printable line for exports (e.g. spring quick start HTML). */
export function formatCompanionsGrouped(companions: string[]): string {
  const { pest, nutrient, general } = groupCompanionsByBenefit(companions);
  const parts: string[] = [];
  if (pest.length) parts.push(`Pest management: ${pest.join(", ")}`);
  if (nutrient.length) parts.push(`Nutrient & soil restoration: ${nutrient.join(", ")}`);
  if (general.length) parts.push(`Other companions: ${general.join(", ")}`);
  return parts.join(". ");
}
