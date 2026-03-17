import { create } from "zustand";
import type { GeoJSON } from "geojson";
import { computeFenceBom, type FenceBomConfig, type FenceBomResult, type FenceBomFenceType } from "@/lib/fence-bom";

interface FencePlannerState {
  isOpen: boolean;
  geometry: GeoJSON | null;
  config: Partial<FenceBomConfig>;
  bomResult: FenceBomResult | null;

  open: () => void;
  close: () => void;
  setGeometry: (g: GeoJSON | null) => void;
  setConfig: (c: Partial<FenceBomConfig>) => void;
  computeBom: () => void;
  clear: () => void;
}

const defaultConfig: Partial<FenceBomConfig> = {
  fenceType: "electric",
  postSpacingFt: 12,
  gateCount: 0,
  gateWidthFt: 12,
  wireStrands: 3,
  insulatorsPerPost: 1,
};

export const useFencePlannerStore = create<FencePlannerState>((set, get) => ({
  isOpen: false,
  geometry: null,
  config: defaultConfig,
  bomResult: null,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, geometry: null, bomResult: null }),
  setGeometry: (geometry) => {
    set({ geometry });
    const { config } = get();
    if (geometry) {
      const bomResult = computeFenceBom(geometry, config);
      set({ bomResult });
    } else {
      set({ bomResult: null });
    }
  },
  setConfig: (config) => {
    set((s) => ({ config: { ...s.config, ...config } }));
    const { geometry } = get();
    if (geometry) {
      const bomResult = computeFenceBom(geometry, { ...get().config, ...config });
      set({ bomResult });
    }
  },
  computeBom: () => {
    const { geometry, config } = get();
    if (geometry) {
      const bomResult = computeFenceBom(geometry, config);
      set({ bomResult });
    }
  },
  clear: () => set({ geometry: null, bomResult: null, config: defaultConfig }),
}));
