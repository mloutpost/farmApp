import { create } from "zustand";

interface FamilyDashboardUiState {
  rosaryOpen: boolean;
  setRosaryOpen: (open: boolean) => void;
}

export const useFamilyDashboardUiStore = create<FamilyDashboardUiState>((set) => ({
  rosaryOpen: false,
  setRosaryOpen: (open) => set({ rosaryOpen: open }),
}));
