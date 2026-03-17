import { create } from "zustand";
import type { DemRaster } from "@/lib/dem-elevation";

interface DemState {
  raster: DemRaster | null;
  loading: boolean;
  error: string | null;
  hillshadeVisible: boolean;
  hillshadeOpacity: number;
  /** Hillshade smoothness: higher = smoother (0 = no blur). */
  hillshadeSmoothness: number;
  /** Z factor: vertical exaggeration for gradient (QGIS). Elevation units vs horizontal. Default 1. */
  hillshadeZFactor: number;
  /** Scale: ratio of vertical to horizontal units (m/deg for geographic). Default auto from lat. */
  hillshadeScale: number | null;
  slopeVisible: boolean;
  aspectVisible: boolean;
  drainageVisible: boolean;
  frostPocketsVisible: boolean;
  contoursVisible: boolean;
  /** Line for elevation profile: [[lng,lat], ...] */
  elevationProfileLine: number[][] | null;

  setRaster: (r: DemRaster | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  setHillshadeVisible: (v: boolean) => void;
  setHillshadeOpacity: (v: number) => void;
  setHillshadeSmoothness: (v: number) => void;
  setHillshadeZFactor: (v: number) => void;
  setHillshadeScale: (v: number | null) => void;
  setSlopeVisible: (v: boolean) => void;
  setAspectVisible: (v: boolean) => void;
  setDrainageVisible: (v: boolean) => void;
  setFrostPocketsVisible: (v: boolean) => void;
  setContoursVisible: (v: boolean) => void;
  setElevationProfileLine: (line: number[][] | null) => void;
  clear: () => void;
}

export const useDemStore = create<DemState>((set) => ({
  raster: null,
  loading: false,
  error: null,
  hillshadeVisible: false,
  hillshadeOpacity: 0.45,
  hillshadeSmoothness: 0,
  hillshadeZFactor: 1,
  hillshadeScale: null,
  slopeVisible: false,
  aspectVisible: false,
  drainageVisible: false,
  frostPocketsVisible: false,
  contoursVisible: false,
  elevationProfileLine: null,

  setRaster: (raster) => set({ raster, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  setHillshadeVisible: (hillshadeVisible) => set({ hillshadeVisible }),
  setHillshadeOpacity: (hillshadeOpacity) => set({ hillshadeOpacity }),
  setHillshadeSmoothness: (hillshadeSmoothness) => set({ hillshadeSmoothness }),
  setHillshadeZFactor: (hillshadeZFactor) => set({ hillshadeZFactor }),
  setHillshadeScale: (hillshadeScale) => set({ hillshadeScale }),
  setSlopeVisible: (slopeVisible) => set({ slopeVisible }),
  setAspectVisible: (aspectVisible) => set({ aspectVisible }),
  setDrainageVisible: (drainageVisible) => set({ drainageVisible }),
  setFrostPocketsVisible: (frostPocketsVisible) => set({ frostPocketsVisible }),
  setContoursVisible: (contoursVisible) => set({ contoursVisible }),
  setElevationProfileLine: (elevationProfileLine) => set({ elevationProfileLine }),
  clear: () => set({
    raster: null,
    error: null,
    hillshadeVisible: false,
    hillshadeOpacity: 0.45,
    hillshadeSmoothness: 0,
    hillshadeZFactor: 1,
    hillshadeScale: null,
    slopeVisible: false,
    aspectVisible: false,
    drainageVisible: false,
    frostPocketsVisible: false,
    contoursVisible: false,
    elevationProfileLine: null,
  }),
}));
