"use client";

import { useEffect, useRef, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFarmStore } from "@/store/farm-store";
import { useAuth } from "@/hooks/useAuth";
import { toFirestoreDocument, fromFirestoreDocument } from "@/lib/farm-serialize";

const FIRESTORE_PATH = "data";
const LOCAL_STORAGE_KEY = "farm-data";

function saveToLocalStorage(nodes: unknown[], groups: unknown[], profile: unknown) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ nodes, groups, profile }));
  } catch {
    /* quota exceeded */
  }
}

function loadFromLocalStorage(): { nodes: unknown[]; groups: unknown[]; profile: unknown } | null {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return {
      nodes: parsed.nodes ?? [],
      groups: parsed.groups ?? [],
      profile: parsed.profile ?? {},
    };
  } catch {
    return null;
  }
}

export function useFarmSync() {
  const { user, loading: authLoading } = useAuth();
  const nodes = useFarmStore((s) => s.nodes);
  const groups = useFarmStore((s) => s.groups);
  const profile = useFarmStore((s) => s.profile);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const lastSavedRef = useRef<string>("");

  const persistNow = useCallback(() => {
    const { nodes: n, groups: g, profile: p } = useFarmStore.getState();
    saveToLocalStorage(n, g, p);
    if (user) {
      const docData = toFirestoreDocument({ nodes: n, groups: g, profile: p });
      setDoc(doc(db, "users", user.uid, "farm", FIRESTORE_PATH), docData).catch(() => {});
    }
  }, [user]);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    persistNow();
  }, [persistNow]);

  // Initial load: from localStorage first (instant), then from Firestore when auth ready
  useEffect(() => {
    if (initializedRef.current) return;

    const local = loadFromLocalStorage();
    if (local?.nodes?.length) {
      useFarmStore.setState({ nodes: local.nodes as never[] });
    }
    if (local?.groups?.length) {
      useFarmStore.setState({ groups: local.groups as never[] });
    }
    if (local?.profile && Object.keys(local.profile as object).length > 0) {
      useFarmStore.setState({
        profile: { ...useFarmStore.getState().profile, ...(local.profile as object) },
      });
    }
    initializedRef.current = true;
  }, []);

  // When auth is ready: load from Firestore, then push any local data to Firestore
  useEffect(() => {
    if (authLoading || !user) return;

    const loadAndSync = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid, "farm", FIRESTORE_PATH));
        if (snap.exists()) {
          const data = fromFirestoreDocument(snap.data() as Record<string, unknown>);
          if (data.nodes?.length) {
            useFarmStore.setState({ nodes: data.nodes as never[] });
          }
          if (data.groups?.length) {
            useFarmStore.setState({ groups: data.groups as never[] });
          }
          if (data.profile && Object.keys(data.profile as object).length > 0) {
            useFarmStore.setState({
              profile: { ...useFarmStore.getState().profile, ...(data.profile as object) },
            });
          }
        } else {
          // Firestore empty – push current store (from localStorage) so we don't lose data
          const { nodes: n, groups: g, profile: p } = useFarmStore.getState();
          if (n.length > 0 || (g?.length ?? 0) > 0 || (p && Object.keys(p as object).length > 0)) {
            const docData = toFirestoreDocument({ nodes: n, groups: g ?? [], profile: p ?? {} });
            await setDoc(doc(db, "users", user.uid, "farm", FIRESTORE_PATH), docData);
          }
        }
      } catch {
        /* offline or permission – keep local state */
      }
    };

    loadAndSync();
  }, [authLoading, user?.uid]);

  // Before unload: flush pending save
  useEffect(() => {
    const handleBeforeUnload = () => flush();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flush]);

  // Autosave: debounced write to Firestore + localStorage when nodes, groups, or profile change
  useEffect(() => {
    if (!initializedRef.current) return;

    const payload = { nodes, groups, profile };
    const fingerprint = JSON.stringify(payload);
    if (fingerprint === lastSavedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      lastSavedRef.current = fingerprint;

      saveToLocalStorage(nodes, groups, profile);

      if (user) {
        try {
          const docData = toFirestoreDocument({ nodes, groups, profile });
          await setDoc(doc(db, "users", user.uid, "farm", FIRESTORE_PATH), docData);
        } catch {
          /* offline or permission – localStorage already updated */
        }
      }
    }, 500);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [nodes, groups, profile, user?.uid]);
}
