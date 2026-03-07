export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283]; // center of US
export const DEFAULT_ZOOM = 4;

export const MAP_STYLES = {
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  dark: "mapbox://styles/mapbox/dark-v11",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  light: "mapbox://styles/mapbox/light-v11",
} as const;
