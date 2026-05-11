"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GoogleCalendarEvent } from "@/lib/family-dashboard/google-calendar";

export type GoogleConnectionState = "idle" | "connecting" | "connected" | "error";

interface State {
  /** Today's events (or empty when disconnected). Cached so the TV
   *  shows yesterday-evening's last fetch instantly on a hard refresh. */
  events: GoogleCalendarEvent[];
  /** ISO 8601 of the last successful fetch. */
  lastFetchedAt: string | null;
  /** Epoch ms when the cached access token expires. Not persisted. */
  tokenExpiresAt: number | null;
  status: GoogleConnectionState;
  error: string | null;
  /** Whether the user has previously connected on this browser. Used to
   *  decide whether to attempt silent token refresh on the morning load. */
  hasConsented: boolean;
  setEvents: (events: GoogleCalendarEvent[]) => void;
  setStatus: (status: GoogleConnectionState, error?: string | null) => void;
  setHasConsented: (consented: boolean) => void;
  setTokenExpiresAt: (expiresAt: number | null) => void;
  reset: () => void;
}

export const useGoogleCalendarStore = create<State>()(
  persist(
    (set) => ({
      events: [],
      lastFetchedAt: null,
      tokenExpiresAt: null,
      status: "idle",
      error: null,
      hasConsented: false,
      setEvents: (events) =>
        set({ events, lastFetchedAt: new Date().toISOString(), status: "connected", error: null }),
      setStatus: (status, error = null) => set({ status, error }),
      setHasConsented: (hasConsented) => set({ hasConsented }),
      setTokenExpiresAt: (tokenExpiresAt) => set({ tokenExpiresAt }),
      reset: () =>
        set({
          events: [],
          lastFetchedAt: null,
          tokenExpiresAt: null,
          status: "idle",
          error: null,
          hasConsented: false,
        }),
    }),
    {
      name: "farm-app-google-calendar",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        events: s.events,
        lastFetchedAt: s.lastFetchedAt,
        hasConsented: s.hasConsented,
      }),
    }
  )
);
