import { create } from "zustand";
import type { MapLayer } from "@/types";
import type { GoogleMapType } from "@/lib/google-maps";
import type { GeoJSON } from "geojson";

/** Pending geometry being drawn - coordinates in [lng, lat] */
export interface PendingGeometry {
  type: "Point" | "LineString" | "Polygon";
  coordinates: number[][] | number[];
}

interface MapState {
  /** Map type: satellite, hybrid, roadmap, terrain */
  mapType: GoogleMapType;
  center: [number, number];
  zoom: number;
  layers: MapLayer[];
  activeLayerId: string | null;
  drawMode: "none" | "polygon" | "line" | "point";
  /** Geometry being drawn - for polygon/line: array of [lng,lat]; for point: single [lng,lat] */
  pendingGeometry: PendingGeometry | null;
  /** Completed geometry awaiting node type assignment (opens CreateNodeModal) */
  completedGeometry: GeoJSON | null;
  /** Node ID currently being edited on the map */
  editingNodeId: string | null;
  /** When set, map will fit to this layer's bounds after adding */
  fitToLayerId: string | null;
  /** Last survey import: { filename, success } for display on nodes page */
  lastImport: { filename: string; success: boolean } | null;
  /** Selected map node for right panel */
  selectedMapNodeId: string | null;
  /** Map markers (nodes on map) */
  mapMarkers: Array<{ id: string; name: string; lat: number; lng: number; type: string; color: string }>;
  /** Hidden marker IDs (point nodes toggled off in layers panel) */
  hiddenMarkerIds: Set<string>;

  setMapType: (mapType: GoogleMapType) => void;
  setSelectedMapNode: (id: string | null) => void;
  setMapMarkers: (markers: MapState["mapMarkers"]) => void;
  toggleMarkerVisibility: (nodeId: string) => void;
  setMarkerVisibility: (nodeId: string, visible: boolean) => void;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setLayers: (layers: MapLayer[]) => void;
  setFitToLayerId: (id: string | null) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setActiveLayer: (layerId: string | null) => void;
  setDrawMode: (mode: MapState["drawMode"]) => void;
  setLastImport: (info: { filename: string; success: boolean } | null) => void;
  setPendingGeometry: (g: PendingGeometry | null) => void;
  setCompletedGeometry: (g: GeoJSON | null) => void;
  setEditingNodeId: (id: string | null) => void;
  addPendingPoint: (lng: number, lat: number) => void;
  finishPendingGeometry: () => GeoJSON | null;
  undoLastPoint: () => void;
}

function buildGeoJSON(pending: PendingGeometry): GeoJSON | null {
  if (pending.type === "Point") {
    const coords = pending.coordinates as number[];
    if (coords.length >= 2) {
      return { type: "Point", coordinates: [coords[0], coords[1]] };
    }
    return null;
  }
  if (pending.type === "LineString") {
    const coords = pending.coordinates as number[][];
    if (coords.length >= 2) {
      return { type: "LineString", coordinates: coords };
    }
    return null;
  }
  if (pending.type === "Polygon") {
    const coords = pending.coordinates as number[][];
    if (coords.length >= 3) {
      const ring = [...coords];
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
      }
      return { type: "Polygon", coordinates: [ring] };
    }
    return null;
  }
  return null;
}

export const useMapStore = create<MapState>((set, get) => ({
  mapType: "satellite",
  center: [-98.5795, 39.8283],
  zoom: 4,
  layers: [],
  activeLayerId: null,
  drawMode: "none",
  pendingGeometry: null,
  completedGeometry: null,
  editingNodeId: null,
  fitToLayerId: null,
  lastImport: null,
  selectedMapNodeId: null,
  mapMarkers: [],
  hiddenMarkerIds: new Set<string>(),

  setMapType: (mapType) => set({ mapType }),
  setSelectedMapNode: (selectedMapNodeId) => set({ selectedMapNodeId }),
  setMapMarkers: (mapMarkers) => set({ mapMarkers }),
  toggleMarkerVisibility: (nodeId) =>
    set((state) => {
      const next = new Set(state.hiddenMarkerIds);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return { hiddenMarkerIds: next };
    }),
  setMarkerVisibility: (nodeId, visible) =>
    set((state) => {
      const next = new Set(state.hiddenMarkerIds);
      if (visible) next.delete(nodeId);
      else next.add(nodeId);
      return { hiddenMarkerIds: next };
    }),
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
  setDrawMode: (drawMode) =>
    set({
      drawMode,
      pendingGeometry: null,
      editingNodeId: drawMode !== "none" ? null : get().editingNodeId,
    }),
  setLastImport: (lastImport) => set({ lastImport }),
  setPendingGeometry: (pendingGeometry) => set({ pendingGeometry }),
  setCompletedGeometry: (completedGeometry) => set({ completedGeometry }),
  setEditingNodeId: (editingNodeId) =>
    set({
      editingNodeId,
      drawMode: editingNodeId ? "none" : get().drawMode,
      pendingGeometry: editingNodeId ? null : get().pendingGeometry,
    }),

  addPendingPoint: (lng, lat) => {
    const { drawMode, pendingGeometry } = get();
    if (drawMode === "none") return;

    if (drawMode === "point") {
      set({
        pendingGeometry: { type: "Point", coordinates: [lng, lat] },
      });
      return;
    }

    if (drawMode === "line" || drawMode === "polygon") {
      const type = drawMode === "line" ? "LineString" : "Polygon";
      const prev =
        pendingGeometry?.type === type
          ? (pendingGeometry.coordinates as number[][])
          : [];
      const last = prev[prev.length - 1];
      if (last && Math.abs(last[0] - lng) < 1e-7 && Math.abs(last[1] - lat) < 1e-7) {
        return;
      }
      set({
        pendingGeometry: {
          type,
          coordinates: [...prev, [lng, lat]],
        },
      });
    }
  },

  finishPendingGeometry: () => {
    const { pendingGeometry } = get();
    if (!pendingGeometry) return null;
    const geojson = buildGeoJSON(pendingGeometry);
    set({ pendingGeometry: null, completedGeometry: geojson });
    return geojson;
  },

  undoLastPoint: () => {
    const { pendingGeometry } = get();
    if (!pendingGeometry || pendingGeometry.type === "Point") {
      set({ pendingGeometry: null });
      return;
    }
    const coords = pendingGeometry.coordinates as number[][];
    if (coords.length <= 1) {
      set({ pendingGeometry: null });
      return;
    }
    set({
      pendingGeometry: {
        ...pendingGeometry,
        coordinates: coords.slice(0, -1),
      },
    });
  },
}));
