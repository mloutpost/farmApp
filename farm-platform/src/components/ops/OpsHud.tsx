"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFarmStore } from "@/store/farm-store";
import WeatherWidget from "@/components/WeatherWidget";
import {
  NODE_KIND_LABELS,
  type FarmNode,
  type FarmTask,
  type FieldData,
  type FinancialEntry,
  type OrchardData,
  type PastureData,
} from "@/types";

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function priorityClass(p: FarmTask["priority"]): string {
  switch (p) {
    case "urgent":
      return "text-red-400";
    case "high":
      return "text-orange-400";
    case "medium":
      return "text-amber-200/90";
    default:
      return "text-text-muted";
  }
}

export default function OpsHud() {
  const profile = useFarmStore((s) => s.profile);
  const nodes = useFarmStore((s) => s.nodes);
  const tasks = useFarmStore((s) => s.tasks);
  const finances = useFarmStore((s) => s.finances);

  const [now, setNow] = useState(() => new Date());
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const exitFullscreen = useCallback(() => {
    document.exitFullscreen?.().catch(() => {});
  }, []);

  const seasonYear = profile.currentSeason ?? new Date().getFullYear();

  const seasonFinances = useMemo(() => {
    return finances.filter((f: FinancialEntry) => !f.season || f.season === seasonYear);
  }, [finances, seasonYear]);

  const { totalRevenue, totalExpenses, net } = useMemo(() => {
    const rev = seasonFinances.filter((f) => f.type === "revenue").reduce((s, f) => s + f.amount, 0);
    const exp = seasonFinances.filter((f) => f.type === "expense").reduce((s, f) => s + f.amount, 0);
    return { totalRevenue: rev, totalExpenses: exp, net: rev - exp };
  }, [seasonFinances]);

  const activeTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === "todo" || t.status === "in-progress")
      .sort((a, b) => {
        const ad = a.dueDate ?? "";
        const bd = b.dueDate ?? "";
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return ad.localeCompare(bd);
      })
      .slice(0, 12);
  }, [tasks]);

  const nodeNameById = useMemo(() => {
    const m: Record<string, string> = {};
    nodes.forEach((n) => {
      m[n.id] = n.name;
    });
    return m;
  }, [nodes]);

  const kindCounts = useMemo(() => {
    const m: Record<string, number> = {};
    nodes.forEach((n) => {
      m[n.kind] = (m[n.kind] ?? 0) + 1;
    });
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [nodes]);

  const fieldPastureOrchardLines = useMemo(() => {
    const lines: string[] = [];
    nodes.forEach((n) => {
      if (n.kind === "field") {
        const d = n.data as FieldData;
        if (d.currentCrop?.trim()) {
          lines.push(`${n.name}: ${d.currentCrop.trim()}`);
        }
      }
      if (n.kind === "pasture") {
        const d = n.data as PastureData;
        if (d.forageType?.trim()) {
          lines.push(`${n.name}: ${d.forageType.trim()}`);
        }
      }
      if (n.kind === "orchard") {
        const d = n.data as OrchardData;
        const v = (d.varieties ?? []).filter((s) => s.trim()).join(", ");
        if (v) lines.push(`${n.name}: ${v}`);
      }
    });
    return lines.slice(0, 12);
  }, [nodes]);

  const recentActivity = useMemo(() => {
    type Row = { date: string; action: string; nodeName: string; notes?: string };
    const rows: Row[] = [];
    nodes.forEach((n: FarmNode) => {
      n.activityLog.forEach((a) => {
        rows.push({
          date: a.date,
          action: a.action,
          nodeName: n.name,
          notes: a.notes,
        });
      });
    });
    return rows
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14);
  }, [nodes]);

  const timeStr = now.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-bg">
      {/* Top chrome */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-bg-elevated/90 z-10">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 min-w-0">
          <h1 className="text-[clamp(1.25rem,2.5vw,2rem)] font-bold text-text-primary truncate tracking-tight">
            {profile.name}
          </h1>
          <span className="text-[clamp(1.5rem,3vw,2.75rem)] font-mono font-semibold text-accent tabular-nums">
            {timeStr}
          </span>
          <span className="text-xs sm:text-sm md:text-base text-text-secondary">{dateStr}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-text-muted uppercase tracking-wide hidden md:inline">
            Season {seasonYear}
            {profile.hardinessZone ? ` · Zone ${profile.hardinessZone}` : ""}
            {profile.lastFrostSpring ? ` · Last frost ${profile.lastFrostSpring}` : ""}
          </span>
          <button
            type="button"
            onClick={fullscreen ? exitFullscreen : enterFullscreen}
            className="rounded-md border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            {fullscreen ? "Exit fullscreen" : "Fullscreen"}
          </button>
          <Link
            href="/"
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-black hover:bg-accent-hover transition-colors"
          >
            Map
          </Link>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 overflow-auto p-4 md:p-6">
        <div className="max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 h-auto lg:h-full lg:min-h-[calc(100vh-8rem)]">
          {/* Weather — spans 5 on large */}
          <section className="lg:col-span-5 flex flex-col min-h-[280px] lg:min-h-0">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">Weather</h2>
            <div className="flex-1 min-h-0">
              <WeatherWidget variant="hud" />
            </div>
          </section>

          {/* Tasks */}
          <section className="lg:col-span-4 flex flex-col min-h-[240px] rounded-2xl border border-border bg-bg-elevated p-4 md:p-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
              Active tasks
            </h2>
            {activeTasks.length === 0 ? (
              <p className="text-sm text-text-muted">No open tasks.</p>
            ) : (
              <ul className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1">
                {activeTasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-col gap-0.5 border-b border-border/50 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[clamp(0.875rem,1.2vw,1.125rem)] font-medium text-text-primary leading-snug">
                        {t.title}
                      </span>
                      <span className={`text-xs font-medium uppercase shrink-0 ${priorityClass(t.priority)}`}>
                        {t.priority}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-xs text-text-muted">
                      {t.dueDate && <span>Due {t.dueDate}</span>}
                      {t.nodeId && nodeNameById[t.nodeId] && <span>{nodeNameById[t.nodeId]}</span>}
                      {t.status === "in-progress" && <span className="text-accent">In progress</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Farm snapshot */}
          <section className="lg:col-span-3 flex flex-col min-h-[220px] rounded-2xl border border-border bg-bg-elevated p-4 md:p-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
              Farm snapshot
            </h2>
            <div className="text-3xl md:text-4xl font-bold text-text-primary tabular-nums mb-2">{nodes.length}</div>
            <p className="text-xs text-text-muted mb-4">nodes on map</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {kindCounts.map(([kind, count]) => (
                <span
                  key={kind}
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-bg-surface px-2.5 py-1 text-xs"
                >
                  <span className="text-text-secondary">{NODE_KIND_LABELS[kind as keyof typeof NODE_KIND_LABELS] ?? kind}</span>
                  <span className="font-mono font-semibold text-text-primary">{count}</span>
                </span>
              ))}
            </div>
            {fieldPastureOrchardLines.length > 0 && (
              <>
                <h3 className="text-[10px] font-medium uppercase tracking-wide text-text-muted mb-2">Crops & forage</h3>
                <ul className="text-sm text-text-secondary space-y-1 overflow-y-auto max-h-40">
                  {fieldPastureOrchardLines.map((line, i) => (
                    <li key={i} className="leading-snug border-l-2 border-accent/40 pl-2">
                      {line}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* Activity + Finance row */}
          <section className="lg:col-span-7 flex flex-col min-h-[200px] rounded-2xl border border-border bg-bg-elevated p-4 md:p-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
              Recent activity
            </h2>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-text-muted">No activity logged yet.</p>
            ) : (
              <ul className="space-y-2.5 overflow-y-auto max-h-[min(40vh,320px)] pr-1">
                {recentActivity.map((a, i) => (
                  <li key={`${a.date}-${a.nodeName}-${i}`} className="text-sm">
                    <span className="font-mono text-xs text-text-muted mr-2">{a.date}</span>
                    <span className="text-text-primary font-medium">{a.nodeName}</span>
                    <span className="text-text-secondary"> — {a.action}</span>
                    {a.notes && <span className="text-text-muted block text-xs mt-0.5 truncate">{a.notes}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="lg:col-span-5 flex flex-col justify-center min-h-[160px] rounded-2xl border border-border bg-bg-elevated p-4 md:p-6">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-4">
              Season {seasonYear} · finances
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Revenue</div>
                <div className="text-[clamp(1.25rem,2.5vw,2rem)] font-bold text-emerald-400 tabular-nums">
                  ${fmtMoney(totalRevenue)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Expenses</div>
                <div className="text-[clamp(1.25rem,2.5vw,2rem)] font-bold text-red-400 tabular-nums">
                  ${fmtMoney(totalExpenses)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Net</div>
                <div
                  className={`text-[clamp(1.25rem,2.5vw,2rem)] font-bold tabular-nums ${
                    net >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {net < 0 ? "-" : ""}${fmtMoney(Math.abs(net))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
