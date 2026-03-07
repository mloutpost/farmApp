import { create } from "zustand";
import type { MapLayer } from "@/types";
import type { GoogleMapType } from "@/lib/google-maps";

interface MapState {
  /** Map type: satellite, hybrid, roadmap, terrain */
  mapType: GoogleMapType;
  center: [number, number];
  zoom: number;
  layers: MapLayer[];
  activeLayerId: string | null;
  drawMode: "none" | "polygon" | "line" | "point";
  /** When set, map will fit to this layer's bounds after adding */
  fitToLayerId: string | null;
  /** Last survey import: { filename, success } for display on nodes page */
  lastImport: { filename: string; success: boolean } | null;
  /** Selected map node for right panel */
  selectedMapNodeId: string | null;
  /** Map markers (nodes on map) */
  mapMarkers: Array<{ id: string; name: string; lat: number; lng: number; type: string }>;

  setMapType: (mapType: GoogleMapType) => void;
  setSelectedMapNode: (id: string | null) => void;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setLayers: (layers: MapLayer[]) => void;
  setFitToLayerId: (id: string | null) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setActiveLayer: (layerId: string | null) => void;
  setDrawMode: (mode: MapState["drawMode"]) => void;
  setLastImport: (info: { filename: string; success: boolean } | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  mapType: "satellite",
  center: [-98.5795, 39.8283],
  zoom: 4,
  layers: [],
  activeLayerId: null,
  drawMode: "none",
  fitToLayerId: null,
  lastImport: { filename: "TN_Property_Survey.dxf", success: true },
  selectedMapNodeId: null,
  mapMarkers: [
    { id: "garden-a", name: "Garden A", lat: 39.85, lng: -98.58, type: "garden" },
    { id: "well-1", name: "Well", lat: 39.84, lng: -98.59, type: "well" },
    { id: "equipment-1", name: "Equipment", lat: 39.86, lng: -98.57, type: "equipment" },
  ],

  setMapType: (mapType) => set({ mapType }),
  setSelectedMapNode: (selectedMapNodeId) => set({ selectedMapNodeId }),
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setLayers: (layers) => set({ layers }),
  setFitToLayerId: (fitToLayerId) => set({ fitToLayerId }),
  toggleLayerVisibility: (layerId) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      ),
    })),
  setLayerOpacity: (layerId, opacity) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, opacity } : l
      ),
    })),
  setActiveLayer: (layerId) => set({ activeLayerId: layerId }),
  setDrawMode: (drawMode) => set({ drawMode }),
  setLastImport: (lastImport) => set({ lastImport }),
}));
