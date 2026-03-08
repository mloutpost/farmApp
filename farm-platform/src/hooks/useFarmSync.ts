"use client";

import { useEffect, useRef, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFarmStore } from "@/store/farm-store";
import { useAuth } from "@/hooks/useAuth";
import { toFirestoreDocument, fromFirestoreDocument } from "@/lib/farm-serialize";

const FIRESTORE_PATH = "data";
const LOCAL_STORAGE_KEY = "farm-data";

interface FarmData { nodes: unknown[]; groups: unknown[]; profile: unknown; tasks?: unknown[]; finances?: unknown[]; flowPositions?: Record<string, { x: number; y: number }> }

function saveToLocalStorage(data: FarmData) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota exceeded */
  }
}

function loadFromLocalStorage(): FarmData | null {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return {
      nodes: parsed.nodes ?? [],
      groups: parsed.groups ?? [],
      profile: parsed.profile ?? {},
      tasks: parsed.tasks ?? [],
      finances: parsed.finances ?? [],
      flowPositions: parsed.flowPositions ?? {},
    };
  } catch {
    return null;
  }
}

function applyData(data: FarmData, mergeProfile = false) {
  if (data.nodes?.length) useFarmStore.setState({ nodes: data.nodes as never[] });
  if (data.groups?.length) useFarmStore.setState({ groups: data.groups as never[] });
  if (data.tasks?.length) useFarmStore.setState({ tasks: data.tasks as never[] });
  if (data.finances?.length) useFarmStore.setState({ finances: data.finances as never[] });
  if (data.flowPositions && Object.keys(data.flowPositions).length > 0) {
    useFarmStore.setState({ flowPositions: data.flowPositions });
  }
  if (data.profile && Object.keys(data.profile as object).length > 0) {
    useFarmStore.setState({
      profile: mergeProfile ? { ...useFarmStore.getState().profile, ...(data.profile as object) } : data.profile as never,
    });
  }
}

export function useFarmSync() {
  const { user, loading: authLoading } = useAuth();
  const nodes = useFarmStore((s) => s.nodes);
  const groups = useFarmStore((s) => s.groups);
  const profile = useFarmStore((s) => s.profile);
  const tasks = useFarmStore((s) => s.tasks);
  const finances = useFarmStore((s) => s.finances);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const lastSavedRef = useRef<string>("");

  const flowPositions = useFarmStore((s) => s.flowPositions);

  const getPayload = useCallback((): FarmData => {
    const s = useFarmStore.getState();
    return { nodes: s.nodes, groups: s.groups, profile: s.profile, tasks: s.tasks, finances: s.finances, flowPositions: s.flowPositions };
  }, []);

  const persistNow = useCallback(() => {
    const payload = getPayload();
    saveToLocalStorage(payload);
    if (user) {
      const docData = toFirestoreDocument(payload);
      setDoc(doc(db, "users", user.uid, "farm", FIRESTORE_PATH), docData).catch(() => {});
    }
  }, [user, getPayload]);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    persistNow();
  }, [persistNow]);

  useEffect(() => {
    if (initializedRef.current) return;
    const local = loadFromLocalStorage();
    if (local) applyData(local, true);
    initializedRef.current = true;
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    const loadAndSync = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid, "farm", FIRESTORE_PATH));
        if (snap.exists()) {
          const data = fromFirestoreDocument(snap.data() as Record<string, unknown>);
          applyData(data as FarmData, true);
        } else {
          const payload = getPayload();
          const hasData = (payload.nodes?.length ?? 0) > 0 || (payload.groups?.length ?? 0) > 0;
          if (hasData) {
            const docData = toFirestoreDocument(payload);
            await setDoc(doc(db, "users", user.uid, "farm", FIRESTORE_PATH), docData);
          }
        }
      } catch {
        /* offline or permission – keep local state */
      }
    };

    loadAndSync();
  }, [authLoading, user?.uid, getPayload]);

  useEffect(() => {
    const handleBeforeUnload = () => flush();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flush]);

  useEffect(() => {
    if (!initializedRef.current) return;

    const payload = { nodes, groups, profile, tasks, finances, flowPositions };
    const fingerprint = JSON.stringify(payload);
    if (fingerprint === lastSavedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      lastSavedRef.current = fingerprint;

      saveToLocalStorage(payload);

      if (user) {
        try {
          const docData = toFirestoreDocument(payload);
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
  }, [nodes, groups, profile, tasks, finances, flowPositions, user?.uid]);
}
