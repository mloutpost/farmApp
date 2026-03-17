import { polygonPerimeterFt, lineStringLengthFt } from "./geo-calc";
import type { GeoJSON } from "geojson";

export type FenceBomFenceType =
  | "electric"
  | "barbed"
  | "woven-wire"
  | "board"
  | "woven-wire-high-tensile"
  | "temporary";

export interface FenceBomConfig {
  fenceType: FenceBomFenceType;
  postSpacingFt: number;
  cornerPostCount?: number;
  gateCount: number;
  gateWidthFt: number;
  wireStrands: number;
  /** For electric: insulators per line post */
  insulatorsPerPost?: number;
}

export interface BOMLineItem {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface FenceBomResult {
  lengthFt: number;
  cornerPosts: number;
  linePosts: number;
  totalPosts: number;
  wireLengthFt: number;
  gates: number;
  gateWidthFt: number;
  items: BOMLineItem[];
}

const DEFAULT_POST_SPACING: Record<FenceBomFenceType, number> = {
  electric: 12,
  barbed: 8,
  "woven-wire": 8,
  "woven-wire-high-tensile": 12,
  board: 8,
  temporary: 12,
};

const DEFAULT_STRANDS: Record<FenceBomFenceType, number> = {
  electric: 3,
  barbed: 4,
  "woven-wire": 1,
  "woven-wire-high-tensile": 1,
  board: 0,
  temporary: 1,
};

function getPerimeterFt(geometry: GeoJSON): number {
  if (!geometry || !("type" in geometry)) return 0;
  const geo = geometry as { type: string; coordinates?: number[][] | number[] | number[][][] };
  if (geo.type === "Polygon" && Array.isArray(geo.coordinates?.[0])) {
    return polygonPerimeterFt(geo.coordinates[0] as number[][]);
  }
  if (geo.type === "LineString" && Array.isArray(geo.coordinates)) {
    return lineStringLengthFt(geo.coordinates as number[][]);
  }
  return 0;
}

function getVertexCount(geometry: GeoJSON): number {
  if (!geometry || !("type" in geometry)) return 0;
  const geo = geometry as { type: string; coordinates?: number[][] | number[] | number[][][] };
  if (geo.type === "Polygon" && Array.isArray(geo.coordinates?.[0])) {
    const ring = geo.coordinates[0] as number[][];
    return ring.length - 1;
  }
  if (geo.type === "LineString" && Array.isArray(geo.coordinates)) {
    return (geo.coordinates as number[][]).length;
  }
  return 0;
}

export function computeFenceBom(
  geometry: GeoJSON,
  config: Partial<FenceBomConfig>
): FenceBomResult {
  const lengthFt = getPerimeterFt(geometry);
  const vertexCount = getVertexCount(geometry);

  const fenceType = config.fenceType ?? "electric";
  const postSpacingFt = config.postSpacingFt ?? DEFAULT_POST_SPACING[fenceType];
  const gateCount = config.gateCount ?? 0;
  const gateWidthFt = config.gateWidthFt ?? 12;
  const wireStrands = config.wireStrands ?? DEFAULT_STRANDS[fenceType];
  const cornerPostCount = config.cornerPostCount ?? vertexCount;
  const insulatorsPerPost = config.insulatorsPerPost ?? 1;

  const gateTotalWidthFt = gateCount * gateWidthFt;
  const fencedLengthFt = Math.max(0, lengthFt - gateTotalWidthFt);
  const linePosts = postSpacingFt > 0 ? Math.ceil(fencedLengthFt / postSpacingFt) : 0;
  const cornerPosts = Math.max(cornerPostCount, vertexCount >= 3 ? vertexCount : 0);
  const totalPosts = cornerPosts + linePosts;
  const wireLengthFt = lengthFt * wireStrands;

  const items: BOMLineItem[] = [];

  switch (fenceType) {
    case "electric":
      items.push(
        { name: "Corner/end posts", quantity: cornerPosts, unit: "posts" },
        { name: "Line posts", quantity: linePosts, unit: "posts" },
        { name: "Electric wire", quantity: Math.ceil(wireLengthFt / 1320), unit: "rolls (1/4 mi)", notes: `${wireLengthFt.toLocaleString()} ft total` },
        { name: "Insulators", quantity: linePosts * insulatorsPerPost * wireStrands, unit: "pcs" },
        { name: "Staples", quantity: Math.ceil(totalPosts * 4), unit: "pcs", notes: "~4 per post" }
      );
      if (gateCount > 0) {
        items.push({ name: "Gates", quantity: gateCount, unit: "gates", notes: `${gateWidthFt} ft wide` });
      }
      break;

    case "barbed":
      items.push(
        { name: "Corner posts (6–8 ft)", quantity: cornerPosts, unit: "posts" },
        { name: "Line posts (4–5 ft)", quantity: linePosts, unit: "posts" },
        { name: "Barbed wire", quantity: Math.ceil(wireLengthFt / 1320), unit: "rolls (1/4 mi)", notes: `${wireLengthFt.toLocaleString()} ft, ${wireStrands} strands` },
        { name: "Staples", quantity: Math.ceil(totalPosts * wireStrands * 2), unit: "pcs" }
      );
      if (gateCount > 0) {
        items.push({ name: "Gates", quantity: gateCount, unit: "gates", notes: `${gateWidthFt} ft wide` });
      }
      break;

    case "woven-wire":
    case "woven-wire-high-tensile":
      items.push(
        { name: "Corner posts", quantity: cornerPosts, unit: "posts" },
        { name: "Line posts", quantity: linePosts, unit: "posts" },
        { name: "Woven wire", quantity: Math.ceil(lengthFt / 330), unit: "rolls (330 ft)", notes: `${lengthFt.toLocaleString()} ft` },
        { name: "Staples", quantity: Math.ceil(totalPosts * 12), unit: "pcs", notes: "~12 per post" }
      );
      if (gateCount > 0) {
        items.push({ name: "Gates", quantity: gateCount, unit: "gates", notes: `${gateWidthFt} ft wide` });
      }
      if (fenceType === "woven-wire-high-tensile") {
        items.push({ name: "Tensioners", quantity: Math.ceil(lengthFt / 660), unit: "pcs", notes: "~1 per 660 ft" });
      }
      break;

    case "board":
      items.push(
        { name: "Corner posts", quantity: cornerPosts, unit: "posts" },
        { name: "Line posts", quantity: linePosts, unit: "posts" },
        { name: "Boards (2x6)", quantity: Math.ceil(lengthFt * 3 / 8), unit: "8 ft boards", notes: "3 rails" },
        { name: "Brackets", quantity: totalPosts * 3, unit: "pcs" }
      );
      if (gateCount > 0) {
        items.push({ name: "Gates", quantity: gateCount, unit: "gates", notes: `${gateWidthFt} ft wide` });
      }
      break;

    case "temporary":
      items.push(
        { name: "Step-in posts", quantity: linePosts, unit: "posts" },
        { name: "Polywire", quantity: Math.ceil(lengthFt * wireStrands / 1640), unit: "rolls (1/2 mi)", notes: `${(lengthFt * wireStrands).toLocaleString()} ft` },
        { name: "Hand reels", quantity: wireStrands, unit: "pcs" }
      );
      break;
  }

  return {
    lengthFt,
    cornerPosts,
    linePosts,
    totalPosts,
    wireLengthFt,
    gates: gateCount,
    gateWidthFt,
    items,
  };
}
