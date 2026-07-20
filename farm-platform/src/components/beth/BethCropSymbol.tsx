"use client";

import type { ReactNode } from "react";
import { getCropById, searchCrops } from "@/lib/crop-catalog";
import type { CropCategory } from "@/lib/crop-catalog";

const INK = "#44403c";
const ACCENT = "#78350f";

/** Simple journal-style SVG glyphs by crop family (not emoji). */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className="h-full w-full"
      fill="none"
      stroke={INK}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function SymbolNightshade() {
  return (
    <Glyph>
      <ellipse cx="20" cy="22" rx="9" ry="8" />
      <path d="M20 14v-4M16 11c1.5-2 4.5-2 8 0" />
      <path d="M14 20c-2 4 1 8 6 8s8-4 6-8" opacity={0.85} />
    </Glyph>
  );
}

function SymbolCucurbit() {
  return (
    <Glyph>
      <ellipse cx="20" cy="22" rx="10" ry="7" transform="rotate(-8 20 22)" />
      <path d="M12 17c2-6 8-8 14-4M18 12c2-3 6-4 10-2" />
    </Glyph>
  );
}

function SymbolLegume() {
  return (
    <Glyph>
      <path d="M14 12c8 4 12 12 12 20M14 12c-2 8 2 16 10 20" />
      <ellipse cx="20" cy="18" rx="3" ry="5" />
    </Glyph>
  );
}

function SymbolBrassica() {
  return (
    <Glyph>
      <path d="M20 8v24M12 14c4-4 12-4 16 0M14 22c3-2 9-2 12 0" />
      <path d="M16 30h8" />
    </Glyph>
  );
}

function SymbolLeafy() {
  return (
    <Glyph>
      <path d="M20 28V14M12 22c2-10 16-10 16 2a8 8 0 01-16 0z" />
    </Glyph>
  );
}

function SymbolRoot() {
  return (
    <Glyph>
      <path d="M20 8 L15 30 L20 24 L25 30 Z" />
    </Glyph>
  );
}

function SymbolAllium() {
  return (
    <Glyph>
      <circle cx="20" cy="16" r="6" />
      <path d="M20 22v12M14 32h12" />
    </Glyph>
  );
}

function SymbolHerb() {
  return (
    <Glyph>
      <path d="M20 30V18M14 24c2-8 12-8 12 0" />
      <path d="M16 20l4-8 4 8" />
    </Glyph>
  );
}

function SymbolFruit() {
  return (
    <Glyph>
      <circle cx="16" cy="20" r="5" />
      <circle cx="24" cy="22" r="5" />
      <path d="M20 12v4" stroke={ACCENT} />
    </Glyph>
  );
}

function SymbolGrain() {
  return (
    <Glyph>
      <path d="M12 28c4-12 12-12 16 0M16 28c3-10 9-10 12 0" />
      <path d="M20 10v6" />
    </Glyph>
  );
}

function SymbolTree() {
  return (
    <Glyph>
      <path d="M20 32V22M14 30h12" strokeWidth={2} />
      <circle cx="20" cy="14" r="9" />
    </Glyph>
  );
}

function SymbolRowCrop() {
  return (
    <Glyph>
      <path d="M14 30V14M20 30V10M26 30V16" />
      <path d="M12 18h16" opacity={0.4} />
    </Glyph>
  );
}

function SymbolForage() {
  return (
    <Glyph>
      <path d="M8 30c4-14 20-14 24 0M12 30c3-10 15-10 18 0" />
    </Glyph>
  );
}

function SymbolSprout() {
  return (
    <Glyph>
      <path d="M20 30V18" stroke={ACCENT} />
      <path d="M14 22c2-6 12-6 12 0" />
      <ellipse cx="20" cy="16" rx="6" ry="4" />
    </Glyph>
  );
}

const BY_CATEGORY: Record<CropCategory, ReactNode> = {
  nightshade: <SymbolNightshade />,
  cucurbit: <SymbolCucurbit />,
  legume: <SymbolLegume />,
  brassica: <SymbolBrassica />,
  "leafy-green": <SymbolLeafy />,
  root: <SymbolRoot />,
  allium: <SymbolAllium />,
  herb: <SymbolHerb />,
  fruit: <SymbolFruit />,
  grain: <SymbolGrain />,
  tree: <SymbolTree />,
  "row-crop": <SymbolRowCrop />,
  forage: <SymbolForage />,
  other: <SymbolSprout />,
};

function resolveCategory(catalogId: string | undefined, cropName: string | undefined): CropCategory {
  if (catalogId) {
    const e = getCropById(catalogId);
    if (e) return e.category;
  }
  const q = (cropName ?? "").trim();
  if (!q) return "other";
  const exact = searchCrops(q).find((c) => c.name.toLowerCase() === q.toLowerCase());
  if (exact) return exact.category;
  const loose = searchCrops(q)[0];
  return loose?.category ?? "other";
}

export default function BethCropSymbol({
  catalogId,
  cropName,
  size = "lg",
}: {
  catalogId?: string;
  cropName?: string;
  size?: "md" | "lg";
}) {
  const cat = resolveCategory(catalogId, cropName);
  const dim = size === "lg" ? "h-14 w-14 sm:h-16 sm:w-16" : "h-10 w-10";
  return (
    <div
      className={`${dim} shrink-0 rounded-full border-2 border-amber-900/35 bg-[#f0e6d4] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]`}
      title={cropName || "Crop"}
      role="img"
      aria-label={cropName ? `Crop symbol for ${cropName}` : "Crop symbol"}
    >
      {BY_CATEGORY[cat] ?? BY_CATEGORY.other}
    </div>
  );
}
