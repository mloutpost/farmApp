"use client";

import { useState } from "react";
import CalendarView from "./CalendarView";
import TasksView from "./TasksView";
import SpringQuickStartPanel from "@/components/planner/SpringQuickStartPanel";

const TABS = [
  { id: "calendar" as const, label: "Calendar" },
  { id: "tasks" as const, label: "Tasks" },
  { id: "spring" as const, label: "Spring quick start" },
];

export default function PlannerPage() {
  const [tab, setTab] = useState<"calendar" | "tasks" | "spring">("calendar");

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border bg-bg-elevated/60 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 pt-5 pb-0 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight mb-3">Planner</h1>
            <div className="flex items-center gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative ${
                    tab === t.id
                      ? "text-accent bg-bg"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-surface/50"
                  }`}
                >
                  {t.label}
                  {tab === t.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "calendar" ? <CalendarView /> : tab === "tasks" ? <TasksView /> : <SpringQuickStartPanel />}
      </div>
    </div>
  );
}
