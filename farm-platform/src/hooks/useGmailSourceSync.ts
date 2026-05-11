"use client";

import { useCallback, useEffect } from "react";
import { doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import {
  useGmailSourceStore,
  type GmailSourceConfig,
} from "@/store/gmail-source-store";

/**
 * Mirror of `useTodayEvents` / `useLiturgicalYearSync` for the Gmail
 * source config. Subscribes to:
 *   users/{uid}/familyDashboard/gmailSource
 * and exposes `saveSource` / `clearSource` helpers that write through
 * to Firestore (and update the local Zustand store optimistically).
 *
 * Safe to call when signed out — Firestore writes are skipped, the
 * local store still updates so the wizard works in a single-device
 * session.
 */

const FAMILY_SUBCOLLECTION = "familyDashboard";
const GMAIL_SOURCE_DOC_ID = "gmailSource";

function gmailSourceDocRef(uid: string) {
  return doc(db, "users", uid, FAMILY_SUBCOLLECTION, GMAIL_SOURCE_DOC_ID);
}

function isValidConfig(data: unknown): data is GmailSourceConfig {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return typeof d.emailAddress === "string" && typeof d.fromQuery === "string";
}

interface UseGmailSourceSyncResult {
  signedIn: boolean;
  saveSource: (config: Omit<GmailSourceConfig, "updatedAt">) => Promise<void>;
  clearSource: () => Promise<void>;
}

export function useGmailSourceSync(): UseGmailSourceSyncResult {
  const { user } = useAuth();
  const setSource = useGmailSourceStore((s) => s.setSource);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      gmailSourceDocRef(user.uid),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (isValidConfig(data)) {
          setSource(data);
        }
      },
      () => {
        /* offline / rules — local store still works */
      }
    );
    return () => unsub();
  }, [user, setSource]);

  const saveSource = useCallback(
    async (config: Omit<GmailSourceConfig, "updatedAt">) => {
      const final: GmailSourceConfig = {
        ...config,
        updatedAt: new Date().toISOString(),
      };
      setSource(final);
      if (user) {
        try {
          const payload: Record<string, string> = {
            emailAddress: final.emailAddress,
            fromQuery: final.fromQuery,
            updatedAt: final.updatedAt,
          };
          if (final.fromName) payload.fromName = final.fromName;
          if (final.labelId) payload.labelId = final.labelId;
          if (final.labelName) payload.labelName = final.labelName;
          await setDoc(gmailSourceDocRef(user.uid), payload, { merge: true });
        } catch {
          /* Firestore unavailable — local store has the value */
        }
      }
    },
    [user, setSource]
  );

  const clearSource = useCallback(async () => {
    setSource(null);
    if (user) {
      try {
        await deleteDoc(gmailSourceDocRef(user.uid));
      } catch {
        /* ignore */
      }
    }
  }, [user, setSource]);

  return { signedIn: !!user, saveSource, clearSource };
}
