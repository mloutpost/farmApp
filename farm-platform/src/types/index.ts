import type { GeoJSON } from "geojson";

/* ── Node kinds by geometry ── */

export type AreaKind = "garden" | "field" | "pasture" | "orchard" | "pond" | "greenhouse" | "vineyard" | "woodlot" | "corral" | "building";
export type PointKind = "well" | "pump" | "barn" | "compost" | "spring" | "shop" | "silo" | "beehive" | "gate" | "coop" | "cellar" | "smokehouse" | "rainwater";
export type LineKind = "irrigation" | "fence" | "stream" | "road" | "pipeline" | "ditch" | "powerline";
export type NodeKind = AreaKind | PointKind | LineKind;

export const AREA_KINDS: AreaKind[] = ["garden", "field", "pasture", "orchard", "pond", "greenhouse", "vineyard", "woodlot", "corral", "building"];
export const POINT_KINDS: PointKind[] = ["well", "pump", "barn", "compost", "spring", "shop", "silo", "beehive", "gate", "coop", "cellar", "smokehouse", "rainwater"];
export const LINE_KINDS: LineKind[] = ["irrigation", "fence", "stream", "road", "pipeline", "ditch", "powerline"];

export const NODE_KIND_LABELS: Record<NodeKind, string> = {
  garden: "Garden",
  field: "Field",
  pasture: "Pasture",
  orchard: "Orchard",
  pond: "Pond / Reservoir",
  greenhouse: "Greenhouse",
  well: "Well / Water Source",
  pump: "Pump Station",
  barn: "Barn / Building",
  compost: "Compost",
  spring: "Spring",
  shop: "Shop / Workshop",
  silo: "Silo / Grain Bin",
  beehive: "Beehive / Apiary",
  gate: "Gate / Access",
  vineyard: "Vineyard / Berry Patch",
  woodlot: "Woodlot / Timber",
  corral: "Corral / Pen",
  building: "Building",
  coop: "Chicken Coop / Poultry",
  cellar: "Root Cellar / Cold Storage",
  smokehouse: "Smokehouse / Processing",
  rainwater: "Rainwater Collection",
  irrigation: "Irrigation Line",
  fence: "Fence",
  stream: "Stream / Waterway",
  road: "Road / Driveway",
  pipeline: "Pipeline / Waterline",
  ditch: "Ditch / Drainage",
  powerline: "Power Line",
};

export const NODE_KIND_COLORS: Record<NodeKind, string> = {
  garden: "#22c55e",
  field: "#84cc16",
  pasture: "#a3e635",
  orchard: "#4ade80",
  pond: "#06b6d4",
  greenhouse: "#10b981",
  well: "#38bdf8",
  pump: "#60a5fa",
  barn: "#94a3b8",
  compost: "#a78bfa",
  spring: "#67e8f9",
  shop: "#f59e0b",
  silo: "#d97706",
  beehive: "#fbbf24",
  gate: "#a8a29e",
  vineyard: "#8b5cf6",
  woodlot: "#65a30d",
  corral: "#b45309",
  building: "#6b7280",
  coop: "#f97316",
  cellar: "#78716c",
  smokehouse: "#dc2626",
  rainwater: "#0284c7",
  irrigation: "#22d3ee",
  fence: "#78716c",
  stream: "#0ea5e9",
  road: "#737373",
  pipeline: "#818cf8",
  ditch: "#7dd3fc",
  powerline: "#fb923c",
};

/* ── Shared sub-types ── */

export interface Planting {
  id: string;
  crop: string;
  catalogId?: string;
  variety?: string;
  seedSource?: string;
  spacing?: string;
  rowSpacingIn?: number;
  plantingDepthIn?: number;
  sowMethod?: "direct-sow" | "transplant";
  daysToMaturity?: number;
  datePlanted?: string;
  dateExpectedHarvest?: string;
  status: "planned" | "planted" | "growing" | "harvested" | "failed";
  notes?: string;
  season?: number;
}

export interface Bed {
  id: string;
  name: string;
  geometry?: GeoJSON;
  plantings: Planting[];
}

export interface SoilTest {
  id: string;
  date: string;
  ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  organicMatter?: number;
  cec?: number;
  notes?: string;
}

export interface WaterQuality {
  ph?: number;
  tds?: number;
  hardness?: number;
  iron?: number;
  lastTestDate?: string;
}

export interface ActivityEntry {
  id: string;
  date: string;
  action: string;
  notes?: string;
  product?: string;
  rate?: string;
  amount?: number;
  unit?: string;
}

export interface HarvestEntry {
  id: string;
  date: string;
  crop: string;
  amount: number;
  unit: string;
  grade?: string;
  notes?: string;
  revenue?: number;
  season?: number;
}

export interface PhotoEntry {
  id: string;
  date: string;
  dataUrl: string;
  caption?: string;
}

export interface SoilAmendment {
  id: string;
  date: string;
  type: string;
  amount: number;
  unit: string;
  notes?: string;
}

export interface GrazingEntry {
  id: string;
  dateIn: string;
  dateOut?: string;
  headCount: number;
  conditionIn?: string;
  conditionOut?: string;
  notes?: string;
}

/* ── Type-specific node data ── */

export interface GardenData {
  kind: "garden";
  sqft?: number;
  sunExposure?: "full" | "partial" | "shade";
  soilType?: string;
  inGround?: boolean;
  beds: Bed[];
  amendments: SoilAmendment[];
  irrigationSourceId?: string;
  wateringSchedule?: string;
  seasonNotes?: string;
}

export interface FieldData {
  kind: "field";
  catalogId?: string;
  acreage?: number;
  soilType?: string;
  tillageMethod?: "no-till" | "conventional" | "strip-till";
  currentCrop?: string;
  currentVariety?: string;
  seedingRate?: string;
  datePlanted?: string;
  expectedHarvest?: string;
  expectedYield?: string;
  soilTests: SoilTest[];
  rotationHistory: Array<{ year: number; crop: string; variety?: string; yield?: string }>;
}

export interface PastureData {
  kind: "pasture";
  acreage?: number;
  forageType?: string;
  carryingCapacity?: string;
  livestockSpecies?: string;
  livestockBreed?: string;
  headCount?: number;
  grazingLog: GrazingEntry[];
  improvements: Array<{ date: string; type: string; product?: string; rate?: string; notes?: string }>;
  hayHarvests: Array<{ date: string; cuttingNumber: number; bales?: number; weight?: number; notes?: string }>;
}

export interface OrchardData {
  kind: "orchard";
  catalogId?: string;
  acreage?: number;
  treeCount?: number;
  spacing?: string;
  rootstock?: string;
  varieties: string[];
  treeAge?: number;
  productiveYears?: number;
  pruningLog: Array<{ date: string; notes?: string }>;
  spraySchedule: Array<{ date: string; product: string; rate?: string; notes?: string }>;
}

export interface WellData {
  kind: "well";
  wellType?: "drilled" | "dug" | "spring" | "pond" | "cistern" | "municipal";
  depth?: number;
  staticWaterLevel?: number;
  pumpType?: string;
  pumpHP?: number;
  flowRate?: number;
  pressure?: number;
  waterQuality: WaterQuality;
}

export interface PumpData {
  kind: "pump";
  pumpType?: string;
  hp?: number;
  gpmCapacity?: number;
  pressureSetting?: number;
  powerSource?: "electric" | "solar" | "pto" | "gas";
  sourceNodeId?: string;
  destinationNodeIds: string[];
}

export interface BarnData {
  kind: "barn";
  purpose?: "equipment" | "livestock" | "hay" | "workshop" | "greenhouse" | "other";
  dimensions?: string;
  capacity?: string;
  equipment: string[];
}

export interface CompostData {
  kind: "compost";
  compostType?: "static" | "tumbler" | "windrow" | "vermicompost";
  volumeCuYards?: number;
  stage?: "building" | "active" | "curing" | "finished";
  temperatureLog: Array<{ date: string; tempF: number }>;
  inputs: Array<{ date: string; source: string; notes?: string }>;
  applications: Array<{ date: string; targetNodeId: string; amount: string; notes?: string }>;
}

export interface IrrigationData {
  kind: "irrigation";
  irrigationType?: "drip-tape" | "drip-line" | "sprinkler" | "pivot" | "flood";
  lengthFt?: number;
  diameter?: string;
  flowCapacity?: string;
  sourceNodeId?: string;
  zonesServed: string[];
  schedule?: string;
}

export interface FenceData {
  kind: "fence";
  fenceType?: "electric" | "barbed" | "woven-wire" | "board" | "temporary";
  lengthFt?: number;
  postSpacing?: string;
  condition?: "good" | "fair" | "poor";
  connectedPastures: string[];
}

export interface StreamData {
  kind: "stream";
  flow?: string;
  seasonal?: boolean;
  riparianBufferFt?: number;
  erosionNotes?: string;
  waterRights?: string;
}

export interface PondData {
  kind: "pond";
  acreage?: number;
  depthFt?: number;
  volumeGallons?: number;
  pondType?: "natural" | "excavated" | "dam" | "tank" | "cistern";
  purpose?: "irrigation" | "livestock" | "aquaculture" | "fire-suppression" | "recreation" | "stormwater";
  stockedFish?: string[];
  waterSource?: string;
  spillwayType?: string;
  damCondition?: "good" | "fair" | "poor";
  waterQuality: WaterQuality;
  maintenanceLog: Array<{ date: string; task: string; notes?: string }>;
}

export interface GreenhouseData {
  kind: "greenhouse";
  sqft?: number;
  structureType?: "glass" | "polycarbonate" | "poly-film" | "high-tunnel" | "cold-frame" | "shade-house";
  heatingType?: "propane" | "electric" | "wood" | "passive" | "none";
  coolingType?: "fan" | "shade-cloth" | "evaporative" | "roll-up-sides" | "none";
  beds: Bed[];
  minTempF?: number;
  maxTempF?: number;
  seasonNotes?: string;
}

export interface SpringData {
  kind: "spring";
  flowRateGPM?: number;
  seasonal?: boolean;
  capturedDeveloped?: boolean;
  waterQuality: WaterQuality;
  conveyanceType?: string;
  notes?: string;
}

export interface ShopData {
  kind: "shop";
  purpose?: "mechanic" | "woodworking" | "welding" | "general" | "processing" | "other";
  dimensions?: string;
  power?: "single-phase" | "three-phase" | "none";
  equipment: string[];
  supplies: string[];
}

export interface SiloData {
  kind: "silo";
  siloType?: "upright" | "bunker" | "bag" | "grain-bin" | "flat-storage";
  capacityBushels?: number;
  capacityTons?: number;
  currentContents?: string;
  fillLevel?: number;
  conditioningType?: "aeration" | "drying" | "none";
  condition?: "good" | "fair" | "poor";
}

export interface BeehiveData {
  kind: "beehive";
  hiveType?: "langstroth" | "top-bar" | "warre" | "flow-hive";
  colonyCount?: number;
  queenStatus?: "present" | "queenless" | "supersedure" | "unknown";
  lastInspection?: string;
  honeySupers?: number;
  inspectionLog: Array<{ date: string; broodPattern?: string; queenSeen?: boolean; miteCount?: number; notes?: string }>;
  harvestLog: Array<{ date: string; poundsHoney?: number; poundsWax?: number; notes?: string }>;
  treatments: Array<{ date: string; product: string; reason?: string; notes?: string }>;
}

export interface GateData {
  kind: "gate";
  gateType?: "farm-gate" | "cattle-guard" | "swing" | "slide" | "electric" | "pedestrian";
  width?: string;
  material?: string;
  lockable?: boolean;
  condition?: "good" | "fair" | "poor";
  connectsTo?: string[];
}

export interface RoadData {
  kind: "road";
  roadType?: "gravel" | "paved" | "dirt" | "improved" | "two-track" | "path";
  lengthFt?: number;
  widthFt?: number;
  surface?: string;
  loadRating?: string;
  maintenanceSchedule?: string;
  drainageNotes?: string;
}

export interface PipelineData {
  kind: "pipeline";
  pipeType?: "pvc" | "hdpe" | "galvanized" | "copper" | "poly";
  diameterIn?: number;
  lengthFt?: number;
  buriedDepthIn?: number;
  pressureRating?: string;
  sourceNodeId?: string;
  destinationNodeIds: string[];
  contents?: "water" | "gas" | "other";
}

export interface DitchData {
  kind: "ditch";
  ditchType?: "open" | "tiled" | "french-drain" | "swale" | "grassed-waterway";
  lengthFt?: number;
  depthFt?: number;
  drainageArea?: string;
  outletTo?: string;
  condition?: "good" | "fair" | "poor";
  maintenanceNotes?: string;
}

export interface PowerlineData {
  kind: "powerline";
  lineType?: "overhead" | "underground" | "solar-run" | "generator";
  voltage?: string;
  lengthFt?: number;
  servicePanel?: string;
  amperage?: number;
  servesNodeIds: string[];
}

export interface VineyardData {
  kind: "vineyard";
  acreage?: number;
  vineCrop?: "grape" | "blackberry" | "raspberry" | "blueberry" | "muscadine" | "other";
  trellisType?: "VSP" | "high-wire" | "T-trellis" | "none";
  rowCount?: number;
  rowSpacingFt?: number;
  vinesPerRow?: number;
  varieties: string[];
  plantedYear?: number;
  pruningLog: Array<{ date: string; notes?: string }>;
  spraySchedule: Array<{ date: string; product: string; rate?: string; notes?: string }>;
}

export interface WoodlotData {
  kind: "woodlot";
  acreage?: number;
  primarySpecies: string[];
  purpose?: "firewood" | "timber" | "maple-syrup" | "nut-harvest" | "conservation" | "mixed";
  cordsOnHand?: number;
  boardFeetEstimate?: number;
  lastHarvestDate?: string;
  harvestLog: Array<{ date: string; species?: string; cords?: number; boardFeet?: number; notes?: string }>;
  managementNotes?: string;
}

export interface CorralData {
  kind: "corral";
  sqft?: number;
  surfaceType?: "dirt" | "gravel" | "concrete" | "grass" | "sand";
  purpose?: "holding" | "sorting" | "loading" | "training" | "run" | "exercise";
  capacity?: string;
  shelterType?: string;
  connectedPastures: string[];
  animals?: string;
}

export interface BuildingData {
  kind: "building";
  buildingType?: "house" | "cabin" | "mobile-home" | "office" | "shed" | "garage" | "equipment-shelter" | "storage" | "wash-station" | "milk-house" | "apartment" | "bunkhouse" | "other";
  sqft?: number;
  stories?: number;
  yearBuilt?: number;
  construction?: "wood-frame" | "pole-barn" | "metal" | "block" | "brick" | "log" | "other";
  roofType?: "metal" | "shingle" | "flat" | "other";
  foundation?: "slab" | "crawl-space" | "basement" | "pier" | "none";
  heating?: string;
  cooling?: string;
  power?: "grid" | "solar" | "generator" | "none";
  water?: "well" | "municipal" | "spring" | "rainwater" | "none";
  septic?: "septic" | "sewer" | "composting" | "outhouse" | "none";
  condition?: "excellent" | "good" | "fair" | "poor";
  insured?: boolean;
  currentUse?: string;
  notes?: string;
}

export interface CoopData {
  kind: "coop";
  coopType?: "stationary" | "tractor" | "A-frame" | "shed" | "barn-section";
  sqft?: number;
  flockSize?: number;
  birdType?: "chicken-layer" | "chicken-meat" | "duck" | "turkey" | "quail" | "guinea" | "goose" | "mixed";
  breeds: string[];
  nestBoxes?: number;
  eggColor?: string;
  heatedWater?: boolean;
  supplementalLight?: boolean;
  eggLog: Array<{ date: string; count: number; notes?: string }>;
  flockLog: Array<{ date: string; event: string; count?: number; notes?: string }>;
  feedType?: string;
  feedLbsPerWeek?: number;
}

export interface CellarData {
  kind: "cellar";
  cellarType?: "underground" | "walkout" | "converted" | "spring-house" | "cooler";
  sqft?: number;
  avgTempF?: number;
  avgHumidity?: number;
  shelving?: string;
  inventory: Array<{ item: string; quantity: string; storedDate: string; expiresDate?: string; notes?: string }>;
}

export interface SmokehouseData {
  kind: "smokehouse";
  smokerType?: "offset" | "vertical" | "cold-smoke" | "hot-smoke" | "smokehouse-building";
  fuelType?: "hickory" | "oak" | "mesquite" | "apple" | "cherry" | "pecan" | "mixed";
  capacity?: string;
  smokingLog: Array<{ date: string; product: string; weightLbs?: number; method?: string; tempF?: number; durationHrs?: number; notes?: string }>;
  brineRecipes: Array<{ name: string; ingredients: string; notes?: string }>;
}

export interface RainwaterData {
  kind: "rainwater";
  collectionType?: "barrel" | "cistern" | "tank" | "underground" | "IBC-tote";
  capacityGallons?: number;
  currentGallons?: number;
  roofAreaSqFt?: number;
  filterType?: string;
  connectedTo?: string;
  potable?: boolean;
  maintenanceLog: Array<{ date: string; task: string; notes?: string }>;
}

export type NodeData =
  | GardenData
  | FieldData
  | PastureData
  | OrchardData
  | PondData
  | GreenhouseData
  | VineyardData
  | WoodlotData
  | CorralData
  | BuildingData
  | WellData
  | PumpData
  | BarnData
  | CompostData
  | SpringData
  | ShopData
  | SiloData
  | BeehiveData
  | GateData
  | CoopData
  | CellarData
  | SmokehouseData
  | RainwaterData
  | IrrigationData
  | FenceData
  | StreamData
  | RoadData
  | PipelineData
  | DitchData
  | PowerlineData;

/* ── The core node ── */

export interface FarmGroup {
  id: string;
  name: string;
  color?: string;
  collapsed?: boolean;
}

export interface FarmNode {
  id: string;
  kind: NodeKind;
  name: string;
  color?: string;
  groupId?: string;
  geometry: GeoJSON;
  connections: string[];
  data: NodeData;
  activityLog: ActivityEntry[];
  harvestLog: HarvestEntry[];
  photos: PhotoEntry[];
  createdAt: string;
  updatedAt: string;
}

/** Resolve display color: node override > group override > kind default */
export function nodeColor(node: FarmNode, groups?: FarmGroup[]): string {
  if (node.color) return node.color;
  if (node.groupId && groups) {
    const g = groups.find((gr) => gr.id === node.groupId);
    if (g?.color) return g.color;
  }
  return NODE_KIND_COLORS[node.kind] ?? "#22c55e";
}

/* ── Farm profile ── */

export interface FarmProfile {
  name: string;
  locationLat?: number;
  locationLng?: number;
  defaultZoom?: number;
  hardinessZone?: string;
  sunshineHoursPerYear?: number;
  sunExposure?: "full" | "partial" | "shade";
  sunDataSource?: "google-solar" | "open-meteo" | "estimate";
  lastFrostSpring?: string;
  firstFrostFall?: string;
  currentSeason?: number;
}

/* ── Map layer (kept for survey import) ── */

export interface MapLayer {
  id: string;
  farmId: string;
  name: string;
  type: "soil" | "infrastructure" | "crop" | "boundary" | "custom";
  geojson: GeoJSON;
  visible: boolean;
  opacity: number;
  style?: Record<string, unknown>;
  nodeId?: string;
  createdAt: Date;
}
