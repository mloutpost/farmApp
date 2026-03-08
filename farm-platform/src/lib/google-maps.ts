export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
export const DEFAULT_ZOOM = 4;

export type GoogleMapType = "satellite" | "hybrid" | "roadmap" | "terrain";

export const MAP_TYPE_OPTIONS: { key: GoogleMapType; label: string }[] = [
  { key: "satellite", label: "Satellite" },
  { key: "hybrid", label: "Hybrid" },
  { key: "roadmap", label: "Road" },
  { key: "terrain", label: "Terrain" },
];
