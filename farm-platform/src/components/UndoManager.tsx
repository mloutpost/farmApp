"use client";

import { useEffect, useState, useCallback } from "react";
import { useFarmStore } from "@/store/farm-store";

export default function UndoManager() {
  const [toast, setToast] = useState<string | null>(null);

  const handleUndo = useCallback(() => {
    const label = useFarmStore.getState().undo();
    if (label) {
      setToast(`Undid: ${label}`);
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if ((e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]"
      style={{ animation: "undo-toast-in 0.2s ease-out" }}
    >
      <style>{`@keyframes undo-toast-in { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-4 py-2.5 shadow-xl">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent shrink-0">
          <path d="M3 7v6h6" />
          <path d="M3 13a9 9 0 1 0 2.64-6.36L3 7" />
        </svg>
        <span className="text-sm font-medium text-text-primary">{toast}</span>
        <kbd className="ml-2 rounded bg-bg-surface px-1.5 py-0.5 text-[10px] font-mono text-text-muted border border-border">
          {typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent) ? "⌘Z" : "Ctrl+Z"}
        </kbd>
      </div>
    </div>
  );
}
