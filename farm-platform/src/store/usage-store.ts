import { create } from "zustand";
import {
  getUsageState,
  recordMapLoad as recordMapLoadLib,
  type UsageState,
} from "@/lib/mapbox-usage";

interface UsageStore extends UsageState {
  refresh: () => void;
  recordMapLoad: () => void;
}

function loadState(): UsageState {
  return getUsageState();
}

export const useUsageStore = create<UsageStore>((set) => ({
  ...loadState(),
  refresh: () => set(loadState()),
  recordMapLoad: () => {
    recordMapLoadLib();
    set(loadState());
  },
}));
