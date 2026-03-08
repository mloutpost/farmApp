"use client";

import { useEffect, useRef, useCallback } from "react";
import { useFarmStore } from "@/store/farm-store";

function persistNow() {
  try {
    const { nodes, groups, profile } = useFarmStore.getState();

    if (nodes.length === 0) {
      const existing = localStorage.getItem("farm-data");
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (parsed.nodes?.length > 0) {
            return;
          }
        } catch { /* proceed with save */ }
      }
    }

    localStorage.setItem("farm-data", JSON.stringify({ nodes, groups, profile }));
  } catch {
    /* quota exceeded */
  }
}

export function useFarmSync() {
  const nodes = useFarmStore((s) => s.nodes);
  const groups = useFarmStore((s) => s.groups);
  const profile = useFarmStore((s) => s.profile);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      persistNow();
    }
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      try {
        const stored = localStorage.getItem("farm-data");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.nodes?.length) {
            useFarmStore.setState({ nodes: parsed.nodes });
          }
          if (parsed.groups?.length) {
            useFarmStore.setState({ groups: parsed.groups });
          }
          if (parsed.profile) {
            useFarmStore.setState({
              profile: { ...useFarmStore.getState().profile, ...parsed.profile },
            });
          }
        }
      } catch {
        /* ignore parse errors */
      }
      initializedRef.current = true;
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => flush();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flush]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      persistNow();
    }, 500);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        persistNow();
      }
    };
  }, [nodes, groups, profile]);
}
