"use client";

import { useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  useLiturgicalYearStore,
  type LiturgicalYearEntry,
} from "@/store/liturgical-year-store";
import {
  deleteLiturgicalEntryFromFirestore,
  saveLiturgicalEntryToFirestore,
  subscribeLiturgicalEntries,
} from "@/lib/family-dashboard/liturgical-sync";

/**
 * Keeps the Zustand `useLiturgicalYearStore` in sync with the user's
 * `users/{uid}/liturgicalYear/*` subcollection in Firestore.
 *
 * - Subscribes to live updates from Firestore (so the TV dashboard
 *   picks up the morning email automatically).
 * - Exposes write/delete helpers that update both the local store and
 *   Firestore.
 *
 * Safe to use without authentication — the helpers simply skip the
 * Firestore call and only update the local store.
 */
export function useLiturgicalYearSync() {
  const { user } = useAuth();
  const importMany = useLiturgicalYearStore((s) => s.importMany);
  const setEntry = useLiturgicalYearStore((s) => s.setEntry);
  const removeEntry = useLiturgicalYearStore((s) => s.removeEntry);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeLiturgicalEntries(user.uid, (entries) => {
      if (entries.length > 0) importMany(entries);
    });
    return () => unsub();
  }, [user, importMany]);

  const saveEntry = useCallback(
    async (entry: Omit<LiturgicalYearEntry, "updatedAt"> & { updatedAt?: string }) => {
      const final: LiturgicalYearEntry = {
        ...entry,
        updatedAt: entry.updatedAt ?? new Date().toISOString(),
      };
      setEntry(final);
      if (user) {
        try {
          await saveLiturgicalEntryToFirestore(user.uid, final);
        } catch {
          /* offline or rules — local store is still updated */
        }
      }
    },
    [user, setEntry]
  );

  const deleteEntry = useCallback(
    async (date: string) => {
      removeEntry(date);
      if (user) {
        try {
          await deleteLiturgicalEntryFromFirestore(user.uid, date);
        } catch {
          /* ignore */
        }
      }
    },
    [user, removeEntry]
  );

  return { saveEntry, deleteEntry, signedIn: !!user };
}
