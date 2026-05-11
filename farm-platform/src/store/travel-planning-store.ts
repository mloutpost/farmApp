import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CostCategoryId =
  | "flights_mileage"
  | "car_rental"
  | "gas"
  | "eating_out"
  | "food"
  | "entertainment";

export const COST_CATEGORY_LABELS: Record<CostCategoryId, string> = {
  flights_mileage: "Flights / mileage",
  car_rental: "Car rental",
  gas: "Gas",
  eating_out: "Eating out",
  food: "Food (groceries)",
  entertainment: "Entertainment",
};

export interface VacationCostLine {
  id: string;
  category: CostCategoryId;
  note: string;
  /** Amount in USD (e.g. 120.5). */
  amount: number;
}

export interface Vacation {
  id: string;
  title: string;
  /** ISO date YYYY-MM-DD */
  startDate: string;
  /** ISO date YYYY-MM-DD */
  endDate: string;
  journal: string;
  costLines: VacationCostLine[];
}

function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sortVacations(list: Vacation[]): Vacation[] {
  return [...list].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));
}

export function vacationTotalUsd(v: Vacation): number {
  return v.costLines.reduce((sum, l) => {
    const n = Number(l.amount);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

interface TravelPlanningState {
  vacations: Vacation[];
  addVacation: (input: { title: string; startDate: string; endDate: string }) => void;
  updateVacation: (id: string, patch: Partial<Pick<Vacation, "title" | "startDate" | "endDate" | "journal">>) => void;
  removeVacation: (id: string) => void;
  addCostLine: (vacationId: string, category: CostCategoryId) => void;
  updateCostLine: (
    vacationId: string,
    lineId: string,
    patch: Partial<Pick<VacationCostLine, "category" | "note" | "amount">>
  ) => void;
  removeCostLine: (vacationId: string, lineId: string) => void;
}

export const useTravelPlanningStore = create<TravelPlanningState>()(
  persist(
    (set) => ({
      vacations: [],
      addVacation: ({ title, startDate, endDate }) =>
        set((s) => ({
          vacations: sortVacations([
            ...s.vacations,
            {
              id: uid(),
              title: title.trim() || "Untitled trip",
              startDate,
              endDate,
              journal: "",
              costLines: [],
            },
          ]),
        })),
      updateVacation: (id, patch) =>
        set((s) => ({
          vacations: sortVacations(
            s.vacations.map((v) => (v.id === id ? { ...v, ...patch } : v))
          ),
        })),
      removeVacation: (id) =>
        set((s) => ({
          vacations: s.vacations.filter((v) => v.id !== id),
        })),
      addCostLine: (vacationId, category) =>
        set((s) => ({
          vacations: s.vacations.map((v) =>
            v.id === vacationId
              ? {
                  ...v,
                  costLines: [
                    ...v.costLines,
                    { id: uid(), category, note: "", amount: 0 },
                  ],
                }
              : v
          ),
        })),
      updateCostLine: (vacationId, lineId, patch) =>
        set((s) => ({
          vacations: s.vacations.map((v) =>
            v.id === vacationId
              ? {
                  ...v,
                  costLines: v.costLines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
                }
              : v
          ),
        })),
      removeCostLine: (vacationId, lineId) =>
        set((s) => ({
          vacations: s.vacations.map((v) =>
            v.id === vacationId
              ? { ...v, costLines: v.costLines.filter((l) => l.id !== lineId) }
              : v
          ),
        })),
    }),
    {
      name: "farm-app-travel-planning",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
