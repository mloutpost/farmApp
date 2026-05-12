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
  /** Airline / carrier code or name for departing flight (e.g. UA, Delta). */
  departFlightCarrier: string;
  /** Flight number for departing leg (e.g. 1842). */
  departFlightNumber: string;
  /** ISO date YYYY-MM-DD for departing flight. */
  departFlightDate: string;
  /** Local HH:mm for departing flight; empty creates an all-day event on departFlightDate. */
  departFlightTime: string;
  returnFlightCarrier: string;
  returnFlightNumber: string;
  returnFlightDate: string;
  returnFlightTime: string;
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
  updateVacation: (
    id: string,
    patch: Partial<
      Pick<
        Vacation,
        | "title"
        | "startDate"
        | "endDate"
        | "journal"
        | "departFlightCarrier"
        | "departFlightNumber"
        | "departFlightDate"
        | "departFlightTime"
        | "returnFlightCarrier"
        | "returnFlightNumber"
        | "returnFlightDate"
        | "returnFlightTime"
      >
    >
  ) => void;
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
              departFlightCarrier: "",
              departFlightNumber: "",
              departFlightDate: startDate,
              departFlightTime: "",
              returnFlightCarrier: "",
              returnFlightNumber: "",
              returnFlightDate: endDate,
              returnFlightTime: "",
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
      merge: (persistedState, currentState) => {
        const p = persistedState as Partial<Pick<TravelPlanningState, "vacations">> | undefined;
        const c = currentState as TravelPlanningState;
        if (!p?.vacations) return c;
        return {
          ...c,
          ...p,
          vacations: p.vacations.map((row) => {
            const v = row as Vacation;
            return {
              ...v,
              costLines: v.costLines ?? [],
              departFlightCarrier: v.departFlightCarrier ?? "",
              departFlightNumber: v.departFlightNumber ?? "",
              departFlightDate: v.departFlightDate ?? v.startDate,
              departFlightTime: v.departFlightTime ?? "",
              returnFlightCarrier: v.returnFlightCarrier ?? "",
              returnFlightNumber: v.returnFlightNumber ?? "",
              returnFlightDate: v.returnFlightDate ?? v.endDate,
              returnFlightTime: v.returnFlightTime ?? "",
            };
          }),
        };
      },
    }
  )
);
