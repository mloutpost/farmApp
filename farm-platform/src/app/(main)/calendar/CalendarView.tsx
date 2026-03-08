"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFarmStore } from "@/store/farm-store";
import { buildCalendarEvents } from "@/lib/calendar-engine";
import type { CalendarEvent, CalendarEventType } from "@/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const EVENT_COLORS: Record<CalendarEventType, { dot: string; bg: string; text: string; label: string }> = {
  "sow-indoor":    { dot: "bg-purple-400", bg: "bg-purple-400/15", text: "text-purple-300", label: "Sow Indoor" },
  "transplant":    { dot: "bg-emerald-400", bg: "bg-emerald-400/15", text: "text-emerald-300", label: "Transplant" },
  "direct-sow":    { dot: "bg-green-400", bg: "bg-green-400/15", text: "text-green-300", label: "Direct Sow" },
  "harvest":       { dot: "bg-amber-400", bg: "bg-amber-400/15", text: "text-amber-300", label: "Harvest" },
  "frost-warning": { dot: "bg-cyan-400", bg: "bg-cyan-400/15", text: "text-cyan-300", label: "Frost" },
  "task":          { dot: "bg-blue-400", bg: "bg-blue-400/15", text: "text-blue-300", label: "Task" },
  "custom":        { dot: "bg-gray-400", bg: "bg-gray-400/15", text: "text-gray-300", label: "Custom" },
};

type FilterKey = "planting" | "harvest" | "frost" | "tasks";
const FILTER_TYPES: Record<FilterKey, CalendarEventType[]> = {
  planting: ["sow-indoor", "transplant", "direct-sow"],
  harvest:  ["harvest"],
  frost:    ["frost-warning"],
  tasks:    ["task", "custom"],
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarView() {
  const router = useRouter();
  const nodes = useFarmStore((s) => s.nodes);
  const tasks = useFarmStore((s) => s.tasks);
  const profile = useFarmStore((s) => s.profile);

  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const currentSeason = profile.currentSeason ?? today.getFullYear();

  const [season, setSeason] = useState(currentSeason);
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    planting: true,
    harvest: true,
    frost: true,
    tasks: true,
  });

  const allEvents = useMemo(
    () => buildCalendarEvents(nodes, tasks, profile, season),
    [nodes, tasks, profile, season],
  );

  const activeTypes = useMemo(() => {
    const types = new Set<CalendarEventType>();
    for (const [key, enabled] of Object.entries(filters) as [FilterKey, boolean][]) {
      if (enabled) FILTER_TYPES[key].forEach((t) => types.add(t));
    }
    return types;
  }, [filters]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of allEvents) {
      if (!activeTypes.has(ev.type)) continue;
      const existing = map.get(ev.date);
      if (existing) existing.push(ev);
      else map.set(ev.date, [ev]);
    }
    return map;
  }, [allEvents, activeTypes]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const monthLabel = new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });

  const hasFrostDates = !!(profile.lastFrostSpring || profile.firstFrostFall);

  const prevMonth = useCallback(() => {
    setSelectedDay(null);
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }, [month]);

  const nextMonth = useCallback(() => {
    setSelectedDay(null);
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }, [month]);

  const goToday = useCallback(() => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(null);
  }, [today]);

  const toggleFilter = useCallback((key: FilterKey) => {
    setFilters((f) => ({ ...f, [key]: !f[key] }));
  }, []);

  const selectedEvents = selectedDay ? (eventsByDate.get(selectedDay) ?? []) : [];

  const gridCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) gridCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) gridCells.push(d);
  while (gridCells.length % 7 !== 0) gridCells.push(null);

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Controls row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <p className="text-sm text-text-muted">Plan and track your growing season</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-bg-surface px-2 py-1">
            <span className="text-xs text-text-muted">Season</span>
            <button
              onClick={() => setSeason((s) => s - 1)}
              className="px-1 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Previous season"
            >
              ‹
            </button>
            <span className="text-sm font-medium text-text-primary tabular-nums min-w-[3ch] text-center">
              {season}
            </span>
            <button
              onClick={() => setSeason((s) => s + 1)}
              className="px-1 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Next season"
            >
              ›
            </button>
          </div>
          <button
            onClick={goToday}
            className="rounded-md border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Frost dates warning */}
      {!hasFrostDates && (
        <div className="mb-4 rounded-lg border border-border bg-bg-elevated px-4 py-3 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-text-primary">No frost dates configured</p>
            <p className="text-xs text-text-muted mt-0.5">
              Set your frost dates in{" "}
              <button
                onClick={() => router.push("/settings")}
                className="text-accent hover:underline"
              >
                Settings
              </button>{" "}
              to see frost warnings and accurate planting windows.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-xs text-text-muted mr-1">Show:</span>
        {(Object.keys(FILTER_TYPES) as FilterKey[]).map((key) => {
          const active = filters[key];
          const sampleType = FILTER_TYPES[key][0];
          const color = EVENT_COLORS[sampleType];
          return (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className={`
                flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all
                ${active
                  ? `${color.bg} ${color.text} ring-1 ring-inset ring-current/20`
                  : "bg-bg-surface text-text-muted hover:text-text-secondary"
                }
              `}
            >
              <span className={`w-2 h-2 rounded-full ${active ? color.dot : "bg-text-muted"}`} />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar grid */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-border bg-bg-elevated overflow-hidden">
            {/* Month navigation */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <button
                onClick={prevMonth}
                className="rounded-md p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors"
                aria-label="Previous month"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-base font-semibold text-text-primary tracking-tight">
                {monthLabel}
              </h2>
              <button
                onClick={nextMonth}
                className="rounded-md p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors"
                aria-label="Next month"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-text-muted">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {gridCells.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="aspect-square border-b border-r border-border/50 bg-bg/40" />;
                }

                const key = dateKey(year, month, day);
                const isToday = key === todayKey;
                const isSelected = key === selectedDay;
                const dayEvents = eventsByDate.get(key);
                const count = dayEvents?.length ?? 0;

                const uniqueTypes = dayEvents
                  ? [...new Set(dayEvents.map((e) => e.type))].slice(0, 4)
                  : [];

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(isSelected ? null : key)}
                    className={`
                      relative aspect-square border-b border-r border-border/50 p-1.5
                      flex flex-col items-center transition-colors
                      ${isSelected
                        ? "bg-accent/10 ring-1 ring-inset ring-accent/30"
                        : "hover:bg-bg-surface/60"
                      }
                    `}
                  >
                    <span
                      className={`
                        text-sm tabular-nums leading-none
                        ${isToday
                          ? "bg-accent text-bg font-bold w-6 h-6 rounded-full flex items-center justify-center"
                          : isSelected
                            ? "text-accent font-medium"
                            : "text-text-secondary"
                        }
                      `}
                    >
                      {day}
                    </span>

                    {uniqueTypes.length > 0 && (
                      <div className="flex items-center gap-0.5 mt-auto mb-0.5">
                        {uniqueTypes.map((type) => (
                          <span
                            key={type}
                            className={`w-1.5 h-1.5 rounded-full ${EVENT_COLORS[type]?.dot ?? "bg-gray-500"}`}
                          />
                        ))}
                      </div>
                    )}

                    {count > 0 && (
                      <span className="absolute top-1 right-1 min-w-[1rem] h-4 flex items-center justify-center rounded-full bg-bg-surface text-[10px] font-medium text-text-secondary tabular-nums px-1">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 px-1">
            {Object.entries(EVENT_COLORS).map(([type, c]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                <span className="text-[11px] text-text-muted">{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side panel - selected day events */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="rounded-xl border border-border bg-bg-elevated overflow-hidden sticky top-8">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary">
                {selectedDay
                  ? new Date(selectedDay + "T12:00:00").toLocaleDateString("default", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  : "Select a day"}
              </h3>
              {selectedDay && (
                <p className="text-xs text-text-muted mt-0.5">
                  {selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="max-h-[28rem] overflow-y-auto">
              {!selectedDay ? (
                <div className="px-4 py-8 text-center">
                  <svg className="w-8 h-8 mx-auto text-text-muted/40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <p className="text-xs text-text-muted">
                    Click a day to view events
                  </p>
                </div>
              ) : selectedEvents.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-text-muted">No events this day</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {selectedEvents.map((ev) => {
                    const color = EVENT_COLORS[ev.type] ?? EVENT_COLORS.custom;
                    return (
                      <div
                        key={ev.id}
                        className={`rounded-lg ${color.bg} px-3 py-2.5 transition-colors`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`w-2 h-2 rounded-full ${color.dot} mt-1.5 shrink-0`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium ${color.text} truncate`}>
                              {ev.title}
                            </p>
                            <p className="text-xs text-text-muted mt-0.5">
                              {color.label}
                            </p>
                            {ev.nodeId && (
                              <button
                                onClick={() => router.push(`/node?id=${ev.nodeId}`)}
                                className="text-xs text-accent hover:underline mt-1 inline-block"
                              >
                                View node →
                              </button>
                            )}
                            {ev.taskId && (
                              <span className="text-xs text-text-muted mt-1 inline-block">
                                Linked task
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Monthly summary */}
          {allEvents.length > 0 && (
            <div className="rounded-xl border border-border bg-bg-elevated mt-4 px-4 py-3">
              <h4 className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
                This month
              </h4>
              <div className="space-y-1.5">
                {(Object.entries(FILTER_TYPES) as [FilterKey, CalendarEventType[]][]).map(
                  ([key, types]) => {
                    const monthEvents = allEvents.filter(
                      (ev) =>
                        types.includes(ev.type) &&
                        ev.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`),
                    );
                    if (monthEvents.length === 0) return null;
                    const sample = EVENT_COLORS[types[0]];
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${sample.dot}`} />
                          <span className="text-xs text-text-secondary">
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-text-primary tabular-nums">
                          {monthEvents.length}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {allEvents.length === 0 && (
        <div className="text-center py-16">
          <svg className="w-12 h-12 mx-auto text-text-muted/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
          </svg>
          <p className="text-sm text-text-secondary mb-1">
            No events this season.
          </p>
          <p className="text-xs text-text-muted">
            Add plantings to your garden beds or create tasks.
          </p>
        </div>
      )}
    </div>
  );
}
