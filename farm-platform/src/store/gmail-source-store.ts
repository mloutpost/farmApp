"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Persisted configuration for which Gmail inbox + sender feeds the
 * Liturgical Year dashboard.
 *
 * Stored in Firestore at:
 *   users/{uid}/familyDashboard/gmailSource
 *
 * The same shape lives in localStorage (via Zustand persist) so the
 * wizard remembers the user's choice on reload before Firestore syncs.
 */
export interface GmailSourceConfig {
  /** The Google account that was authorized — what the user picked in
   *  the GIS chooser. Used to remind the user which inbox they connected. */
  emailAddress: string;
  /** Gmail search clause that identifies the Liturgical Year sender,
   *  e.g. `from:noreply@example.com` or just `noreply@example.com`
   *  (the Gmail lib wraps it in `from:(...)` automatically). */
  fromQuery: string;
  /** Display name of the sender (e.g. "Dom Guéranger"), shown in the UI. */
  fromName?: string;
  /** Optional Gmail label to scope searches to. */
  labelId?: string;
  labelName?: string;
  /** ISO 8601. */
  updatedAt: string;
}

export type GmailSourceStatus = "idle" | "loading" | "ready" | "error";

interface State {
  /** The current saved source config, if the user has finished the wizard. */
  source: GmailSourceConfig | null;
  /** Whether the user has previously consented to the Gmail scope on
   *  this browser. Used by the wizard to decide whether to attempt a
   *  silent token refresh on mount. Persisted across reloads. */
  hasConsented: boolean;
  /** Token expiry epoch ms. Not persisted — refreshed on demand. */
  tokenExpiresAt: number | null;
  status: GmailSourceStatus;
  error: string | null;
  setSource: (source: GmailSourceConfig | null) => void;
  setStatus: (status: GmailSourceStatus, error?: string | null) => void;
  setHasConsented: (consented: boolean) => void;
  setTokenExpiresAt: (expiresAt: number | null) => void;
  reset: () => void;
}

export const useGmailSourceStore = create<State>()(
  persist(
    (set) => ({
      source: null,
      hasConsented: false,
      tokenExpiresAt: null,
      status: "idle",
      error: null,
      setSource: (source) =>
        set({
          source,
          status: source ? "ready" : "idle",
          error: null,
        }),
      setStatus: (status, error = null) => set({ status, error }),
      setHasConsented: (hasConsented) => set({ hasConsented }),
      setTokenExpiresAt: (tokenExpiresAt) => set({ tokenExpiresAt }),
      reset: () =>
        set({
          source: null,
          hasConsented: false,
          tokenExpiresAt: null,
          status: "idle",
          error: null,
        }),
    }),
    {
      name: "farm-app-gmail-source",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        source: s.source,
        hasConsented: s.hasConsented,
      }),
    }
  )
);
