"use client";

import { useState } from "react";
import { useNodeStore } from "@/store/node-store";
import type { FarmNode } from "@/types";

export default function NodeDetailsPanel() {
  const [tab, setTab] = useState<"overview" | "water_logic" | "automation">("water_logic");
  const { nodes, selectedNodeId } = useNodeStore();
  const selected = nodes.find((n) => n.id === selectedNodeId);

  if (!selected) {
    return (
      <aside className="w-80 shrink-0 border-l border-border bg-bg-elevated flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-text-muted">Select a node to view details</p>
      </aside>
    );
  }

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-bg-elevated flex flex-col overflow-hidden">
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <PinIcon />
          NODE: {selected.name.toUpperCase()} (Logic View)
        </h3>
        <button className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors">
          <PlusIcon />
        </button>
      </header>

      <div className="flex border-b border-border">
        {(["overview", "water_logic", "automation"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${
              tab === t
                ? "text-accent border-b-2 border-accent -mb-px"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {t === "water_logic" ? "Water Logic" : t === "automation" ? "Automation Schedule" : "Overview"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === "water_logic" && <WaterLogicTab node={selected} />}
        {tab === "automation" && <AutomationScheduleTab />}
        {tab === "overview" && <OverviewTab node={selected} />}
      </div>

      <footer className="shrink-0 p-4 border-t border-border">
        <button className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black hover:bg-accent-hover transition-colors">
          Save Changes
        </button>
      </footer>
    </aside>
  );
}

function WaterLogicTab({ node }: { node: FarmNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-text-primary mb-2">Logic Data</h4>
        <div className="rounded-lg border border-border bg-bg-surface p-4">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="rounded bg-accent/20 px-2 py-1">Water Input</span>
            <span>→</span>
            <span className="rounded bg-accent/20 px-2 py-1">Distribution</span>
            <span>→</span>
            <span className="rounded bg-accent/20 px-2 py-1">Outputs</span>
          </div>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-text-primary mb-2">Automation Schedule</h4>
        <div className="h-20 rounded-lg border border-border bg-bg-surface flex items-end gap-1 p-2">
          {[40, 65, 90, 70, 85, 95, 80].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-accent/60 min-w-0"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-bg-surface p-3">
          <p className="text-[10px] text-text-muted mb-0.5">Soil Temp</p>
          <p className="text-lg font-semibold text-text-primary">22°C</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface p-3">
          <p className="text-[10px] text-text-muted mb-0.5">Sun Hours</p>
          <p className="text-lg font-semibold text-text-primary">9 hrs/day</p>
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-text-primary mb-2">Performance Metrics</h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-text-muted">Recent Inputs (Last 7 Days)</span>
            <span className="text-text-primary">7 days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Expected Output (Est. lbs)</span>
            <span className="text-text-primary">39 lbs</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AutomationScheduleTab() {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-text-primary mb-2">Schedule</h4>
        <div className="h-24 rounded-lg border border-border bg-bg-surface flex items-end gap-1 p-2">
          {[30, 50, 90, 85, 70, 95, 80, 60, 75, 90, 85, 70].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-accent/60 min-w-0"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ node }: { node: FarmNode }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] text-text-muted mb-1">Name</p>
        <p className="text-sm font-medium text-text-primary">{node.name}</p>
      </div>
      {node.flowData && (
        <div className="space-y-2">
          <p className="text-[10px] text-text-muted">Data</p>
          <pre className="text-xs text-text-secondary bg-bg-surface rounded p-2 overflow-auto">
            {JSON.stringify(node.flowData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v8M12 22v-2M12 12c-2.5 0-4.5 2-4.5 4.5S9.5 21 12 21s4.5-2 4.5-4.5S14.5 12 12 12z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
