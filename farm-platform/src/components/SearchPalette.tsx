"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFarmStore } from "@/store/farm-store";
import { NODE_KIND_LABELS, NODE_KIND_COLORS } from "@/types";
import type { NodeKind, GardenData, FieldData } from "@/types";

interface SearchResult {
  id: string;
  name: string;
  kind: NodeKind;
  extra?: string;
}

export default function SearchPalette() {
  const router = useRouter();
  const nodes = useFarmStore((s) => s.nodes);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) {
      return nodes.slice(0, 20).map((n) => ({ id: n.id, name: n.name, kind: n.kind }));
    }
    const q = query.toLowerCase();
    const matches: SearchResult[] = [];

    nodes.forEach((n) => {
      if (n.name.toLowerCase().includes(q) || n.kind.includes(q)) {
        matches.push({ id: n.id, name: n.name, kind: n.kind });
      }
      if (n.data.kind === "garden") {
        const gd = n.data as GardenData;
        gd.beds.forEach((bed) => {
          bed.plantings.forEach((p) => {
            if (p.crop.toLowerCase().includes(q) || p.variety?.toLowerCase().includes(q)) {
              matches.push({ id: n.id, name: n.name, kind: n.kind, extra: `${p.crop}${p.variety ? ` (${p.variety})` : ""}` });
            }
          });
        });
      }
      if (n.data.kind === "field") {
        const fd = n.data as FieldData;
        if (fd.currentCrop?.toLowerCase().includes(q)) {
          matches.push({ id: n.id, name: n.name, kind: n.kind, extra: fd.currentCrop });
        }
      }
      n.activityLog.forEach((a) => {
        if (a.notes?.toLowerCase().includes(q) || a.action.toLowerCase().includes(q)) {
          matches.push({ id: n.id, name: n.name, kind: n.kind, extra: `${a.action}: ${a.notes ?? ""}` });
        }
      });
    });

    const unique = new Map<string, SearchResult>();
    matches.forEach((m) => { if (!unique.has(m.id + (m.extra ?? ""))) unique.set(m.id + (m.extra ?? ""), m); });
    return Array.from(unique.values()).slice(0, 20);
  }, [query, nodes]);

  const handleSelect = useCallback((id: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/node/${id}`);
  }, [router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-bg-elevated shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes, crops, activities..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            autoFocus
          />
          <kbd className="text-[10px] text-text-muted bg-bg-surface border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-6 text-center text-sm text-text-muted">No results found.</div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.id}-${i}`}
                onClick={() => handleSelect(r.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-surface transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: NODE_KIND_COLORS[r.kind] }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-text-primary truncate">{r.name}</div>
                  {r.extra && <div className="text-xs text-text-muted truncate">{r.extra}</div>}
                </div>
                <span className="text-[10px] text-text-muted shrink-0">{NODE_KIND_LABELS[r.kind]}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
