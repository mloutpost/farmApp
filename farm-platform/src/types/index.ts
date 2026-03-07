import type { GeoJSON } from "geojson";

/** Node types for the farm operation hierarchy (Sequence-style) */
export type FarmNodeType = "farm" | "zone" | "sub";

/** Infrastructure flow node variants (Infrastructure & Logic Flow diagram) */
export type FlowNodeVariant =
  | "water_source"
  | "water_distribution"
  | "garden"
  | "raised_bed"
  | "field"
  | "livestock_system"
  | "compost_facility"
  | "pasture";

/** Data displayed on infrastructure flow nodes */
export interface FlowNodeData {
  level?: number;
  flow?: string;
  soilPh?: number;
  crop?: string;
  yieldEst?: string;
  plantDate?: string;
  harvestEst?: string;
  automation?: "ON" | "OFF";
  cattleCount?: number;
  data?: number;
}

export interface FarmNode {
  id: string;
  type: FarmNodeType;
  parentId: string | null;
  name: string;
  /** Map geometry - polygon for zones/fields, point for markers */
  geometry?: GeoJSON;
  /** Zone type: garden, field, pasture, etc. */
  zoneType?: "garden" | "field" | "pasture" | "orchard" | "infrastructure" | "other";
  /** Sub type: raised_bed, plot, row, etc. */
  subType?: "raised_bed" | "plot" | "row" | "greenhouse" | "other";
  /** For infrastructure flow: water_source, garden, field, etc. */
  flowVariant?: FlowNodeVariant;
  /** Data displayed on flow nodes (level, flow, soilPh, crop, etc.) */
  flowData?: FlowNodeData;
  /** Inputs/outputs, notes, crop plans - managed in node panel */
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Farm {
  id: string;
  tenantId: string;
  name: string;
  boundary?: GeoJSON;
  center?: [number, number];
  zoom?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: string;
  farmId: string;
  name: string;
  geometry: GeoJSON;
  soilType?: string;
  area?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CropPlan {
  id: string;
  locationId: string;
  farmId: string;
  crop: string;
  variety?: string;
  season: string;
  year: number;
  plantDate?: Date;
  harvestDate?: Date;
  area?: number;
  expectedYield?: number;
  actualYield?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FieldPhoto {
  id: string;
  locationId: string;
  farmId: string;
  storagePath: string;
  thumbnailPath?: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  takenAt: Date;
  createdAt: Date;
}

export interface MapLayer {
  id: string;
  farmId: string;
  name: string;
  type: "soil" | "infrastructure" | "crop" | "boundary" | "custom";
  geojson: GeoJSON;
  visible: boolean;
  opacity: number;
  style?: Record<string, unknown>;
  createdAt: Date;
}
