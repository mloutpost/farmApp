import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { FilingStatus } from "@/lib/tax-estimate";

export interface TaxPlanningState {
  taxYear: number;
  filingStatus: FilingStatus;
  w2Wages: number;
  k1ConstructionOrdinary: number;
  k1FarmOrdinary: number;
  farmGrossBefore179: number;
  section179: number;
  shortTermCapitalGains: number;
  longTermCapitalGains: number;
  qualifiedDividends: number;
  ordinaryDividends: number;
  otherOrdinaryIncome: number;
  itemizedDeductions: number | null;
  notes: string;
}

const defaultState: TaxPlanningState = {
  taxYear: new Date().getFullYear(),
  filingStatus: "single",
  w2Wages: 0,
  k1ConstructionOrdinary: 0,
  k1FarmOrdinary: 0,
  farmGrossBefore179: 0,
  section179: 0,
  shortTermCapitalGains: 0,
  longTermCapitalGains: 0,
  qualifiedDividends: 0,
  ordinaryDividends: 0,
  otherOrdinaryIncome: 0,
  itemizedDeductions: null,
  notes: "",
};

interface TaxPlanningStore extends TaxPlanningState {
  setField: <K extends keyof TaxPlanningState>(key: K, value: TaxPlanningState[K]) => void;
  reset: () => void;
}

export const useTaxPlanningStore = create<TaxPlanningStore>()(
  persist(
    (set) => ({
      ...defaultState,
      setField: (key, value) => set({ [key]: value } as Partial<TaxPlanningState>),
      reset: () => set(defaultState),
    }),
    {
      name: "farm-app-tax-planning",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        taxYear: s.taxYear,
        filingStatus: s.filingStatus,
        w2Wages: s.w2Wages,
        k1ConstructionOrdinary: s.k1ConstructionOrdinary,
        k1FarmOrdinary: s.k1FarmOrdinary,
        farmGrossBefore179: s.farmGrossBefore179,
        section179: s.section179,
        shortTermCapitalGains: s.shortTermCapitalGains,
        longTermCapitalGains: s.longTermCapitalGains,
        qualifiedDividends: s.qualifiedDividends,
        ordinaryDividends: s.ordinaryDividends,
        otherOrdinaryIncome: s.otherOrdinaryIncome,
        itemizedDeductions: s.itemizedDeductions,
        notes: s.notes,
      }),
    }
  )
);
