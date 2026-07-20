import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** Inline image attached to a journal entry (persisted as data URL in local storage). */
export interface BethJournalPhoto {
  id: string;
  dataUrl: string;
  caption?: string;
}

export interface BethJournalEntry {
  id: string;
  /** Calendar day (YYYY-MM-DD). */
  date: string;
  /** Local time of day (HH:mm), optional for older saved entries. */
  time?: string;
  title?: string;
  body: string;
  relatedNodeId?: string;
  photos?: BethJournalPhoto[];
}

export interface BethPantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location?: string;
  notes?: string;
  updatedAt: string;
}

interface BethStoreState {
  journalEntries: BethJournalEntry[];
  pantry: BethPantryItem[];
  addJournalEntry: (e: Omit<BethJournalEntry, "id">) => string;
  updateJournalEntry: (id: string, updates: Partial<BethJournalEntry>) => void;
  removeJournalEntry: (id: string) => void;
  addPantryItem: (e: Omit<BethPantryItem, "id" | "updatedAt">) => string;
  updatePantryItem: (id: string, updates: Partial<BethPantryItem>) => void;
  removePantryItem: (id: string) => void;
  reset: () => void;
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

const empty: Pick<BethStoreState, "journalEntries" | "pantry"> = {
  journalEntries: [],
  pantry: [],
};

export const useBethStore = create<BethStoreState>()(
  persist(
    (set) => ({
      ...empty,
      addJournalEntry: (e) => {
        const id = uid();
        set((s) => ({
          journalEntries: [{ ...e, id }, ...s.journalEntries],
        }));
        return id;
      },
      updateJournalEntry: (id, updates) => {
        set((s) => ({
          journalEntries: s.journalEntries.map((j) => (j.id === id ? { ...j, ...updates } : j)),
        }));
      },
      removeJournalEntry: (id) => {
        set((s) => ({
          journalEntries: s.journalEntries.filter((j) => j.id !== id),
        }));
      },
      addPantryItem: (e) => {
        const id = uid();
        const ts = nowIso();
        set((s) => ({
          pantry: [{ ...e, id, updatedAt: ts }, ...s.pantry],
        }));
        return id;
      },
      updatePantryItem: (id, updates) => {
        set((s) => ({
          pantry: s.pantry.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: nowIso() } : p
          ),
        }));
      },
      removePantryItem: (id) => {
        set((s) => ({
          pantry: s.pantry.filter((p) => p.id !== id),
        }));
      },
      reset: () => set({ ...empty }),
    }),
    {
      name: "farm-app-beth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        journalEntries: s.journalEntries,
        pantry: s.pantry,
      }),
    }
  )
);
