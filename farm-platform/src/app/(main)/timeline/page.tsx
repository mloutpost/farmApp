"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFarmStore } from "@/store/farm-store";
import type { GardenData, BedNodeData, GreenhouseData, FieldData, Planting, FarmNode } from "@/types";

interface TimelineEntry {
  nodeId: string;
  nodeName: string;
  bedName?: string;
  planting: Planting;
}

const STATUS_COLORS: Record<string, string> = {
  planned: "#3b82f6",
  planted: "#eab308",
  growing: "#22c55e",
  harvested: "#a78bfa",
  failed: "#ef4444",
};

function dayOfYear(dateStr: string): number {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

function monthLabels(): string[] {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
}

export default function TimelinePage() {
  const router = useRouter();
  const nodes = useFarmStore((s) => s.nodes);
  const profile = useFarmStore((s) => s.profile);
  const copyLastSeason = useFarmStore((s) => s.copyLastSeason);
  const currentYear = profile.currentSeason ?? new Date().getFullYear();
  const [showYear, setShowYear] = useState(currentYear);

  const entries = useMemo<TimelineEntry[]>(() => {
    const result: TimelineEntry[] = [];
    nodes.forEach((node) => {
      if (node.data.kind === "garden") {
        const gd = node.data as GardenData;
        gd.beds.forEach((bed) => {
          bed.plantings
            .filter((p) => !p.season || p.season === showYear)
            .forEach((p) => result.push({ nodeId: node.id, nodeName: node.name, bedName: bed.name, planting: p }));
        });
      } else if (node.data.kind === "bed") {
        const bd = node.data as BedNodeData;
        (bd.plantings ?? [])
          .filter((p) => !p.season || p.season === showYear)
          .forEach((p) => result.push({ nodeId: node.id, nodeName: node.name, planting: p }));
      } else if (node.data.kind === "greenhouse") {
        const ghd = node.data as GreenhouseData;
        ghd.beds.forEach((bed) => {
          bed.plantings
            .filter((p) => !p.season || p.season === showYear)
            .forEach((p) => result.push({ nodeId: node.id, nodeName: node.name, bedName: bed.name, planting: p }));
        });
      } else if (node.data.kind === "field") {
        const fd = node.data as FieldData;
        if (fd.currentCrop) {
          result.push({
            nodeId: node.id,
            nodeName: node.name,
            planting: {
              id: `field-${node.id}`,
              crop: fd.currentCrop,
              variety: fd.currentVariety,
              datePlanted: fd.datePlanted,
              dateExpectedHarvest: fd.expectedHarvest,
              status: fd.datePlanted ? "growing" : "planned",
              season: showYear,
            },
          });
        }
      }
    });
    return result;
  }, [nodes, showYear]);

  const handleCopy = () => {
    copyLastSeason(showYear - 1, showYear);
  };

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Season Timeline</h1>
            <p className="text-sm text-text-muted mt-1">Planting schedule across your growing areas</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowYear(showYear - 1)} className="px-2 py-1 text-sm text-text-secondary hover:text-text-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <span className="text-sm font-semibold text-text-primary">{showYear}</span>
            <button onClick={() => setShowYear(showYear + 1)} className="px-2 py-1 text-sm text-text-secondary hover:text-text-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
            <button onClick={handleCopy} className="rounded-md bg-bg-surface border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
              Copy {showYear - 1} Season
            </button>
            <button onClick={handleExportPdf} className="rounded-md bg-bg-surface border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
              Print / PDF
            </button>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-sm">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 text-accent">
                <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" />
              </svg>
              <h2 className="text-lg font-semibold text-text-primary mb-2">No plantings for {showYear}</h2>
              <p className="text-sm text-text-secondary">Add plantings to your gardens and fields, or copy from a previous season.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-bg-elevated overflow-hidden">
            <div className="grid grid-cols-[200px_1fr] border-b border-border">
              <div className="px-3 py-2 text-xs font-medium text-text-muted">Planting</div>
              <div className="grid grid-cols-12 px-1">
                {monthLabels().map((m) => (
                  <div key={m} className="px-1 py-2 text-[10px] text-text-muted text-center">{m}</div>
                ))}
              </div>
            </div>
            {entries.map((entry) => {
              const startDay = entry.planting.datePlanted ? dayOfYear(entry.planting.datePlanted) : 0;
              const endDay = entry.planting.dateExpectedHarvest
                ? dayOfYear(entry.planting.dateExpectedHarvest)
                : entry.planting.daysToMaturity && entry.planting.datePlanted
                  ? startDay + entry.planting.daysToMaturity
                  : startDay + 90;
              const startPct = Math.max(0, (startDay / 365) * 100);
              const widthPct = Math.max(2, ((endDay - startDay) / 365) * 100);

              return (
                <div
                  key={entry.planting.id}
                  className="grid grid-cols-[200px_1fr] border-b border-border/50 hover:bg-bg-surface/50 cursor-pointer"
                  onClick={() => router.push(`/node?id=${entry.nodeId}`)}
                >
                  <div className="px-3 py-2.5 min-w-0">
                    <div className="text-xs font-medium text-text-primary truncate">{entry.planting.crop || "Unnamed"}</div>
                    <div className="text-[10px] text-text-muted truncate">{entry.nodeName}{entry.bedName ? ` / ${entry.bedName}` : ""}</div>
                  </div>
                  <div className="relative px-1 py-2.5">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-5 rounded-full"
                      style={{
                        left: `${startPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: STATUS_COLORS[entry.planting.status] ?? "#94a3b8",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
