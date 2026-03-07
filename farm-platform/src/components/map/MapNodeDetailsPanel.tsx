"use client";

import { useMapStore } from "@/store/map-store";

const BED_CROPS: Record<string, { icon: string; name: string; plantDate: string }> = {
  "bed-1": { icon: "🍅", name: "Bed 1: Tomatoes", plantDate: "Tomatoes, Sep 26, 2024" },
  "bed-2": { icon: "🥕", name: "Bed 2: Carrots", plantDate: "Carrots, Sep 26, 2024" },
  "bed-3": { icon: "🥬", name: "Bed 3: Kale", plantDate: "Kale, Sep 26, 2024" },
};

export default function MapNodeDetailsPanel() {
  const { selectedMapNodeId, mapMarkers } = useMapStore();
  const node = mapMarkers.find((m) => m.id === selectedMapNodeId);

  if (!node) {
    return (
      <aside className="w-80 shrink-0 border-l border-border bg-bg-elevated flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-text-muted">Select a node on the map to view details</p>
      </aside>
    );
  }

  const isGarden = node.id === "garden-a";
  const beds = isGarden ? ["bed-1", "bed-2", "bed-3"] : [];

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-bg-elevated flex flex-col overflow-hidden">
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <PinIcon />
          NODE: {node.name.toUpperCase()}
        </h3>
        <span className="text-[10px] text-text-muted">62.38734°N, 71.38798°W</span>
        <button className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface">
          +
        </button>
      </header>

      <div className="flex border-b border-border">
        {["Overview", "Inputs", "Outputs", "Sub-Nodes (Act)"].map((tab, i) => (
          <button
            key={tab}
            className={`flex-1 px-2 py-2 text-[10px] font-medium transition-colors ${
              i === 3
                ? "text-accent border-b-2 border-accent -mb-px"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isGarden && beds.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-text-primary mb-2">Associated Garden Beds</h4>
            <div className="space-y-2">
              {beds.map((bedId) => {
                const bed = BED_CROPS[bedId];
                if (!bed) return null;
                return (
                  <div
                    key={bedId}
                    className="rounded-lg border border-border bg-bg-surface p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{bed.icon}</span>
                      <span className="text-sm font-medium text-text-primary">{bed.name}</span>
                    </div>
                    <p className="text-xs text-text-muted mb-2">{bed.plantDate}</p>
                    <button className="rounded-md bg-accent/20 px-2 py-1 text-xs font-medium text-accent hover:bg-accent/30">
                      Manage Bed
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-text-muted mt-2">Total Sub-Nodes: 3</p>
            <p className="text-xs text-text-muted">Current Crop Cover: 75%</p>
          </div>
        )}

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
          <h4 className="text-xs font-semibold text-text-primary mb-2">Farm Performance</h4>
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

      <footer className="shrink-0 p-4 border-t border-border">
        <button className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black hover:bg-accent-hover transition-colors">
          Save Changes
        </button>
      </footer>
    </aside>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v8M12 22v-2M12 12c-2.5 0-4.5 2-4.5 4.5S9.5 21 12 21s4.5-2 4.5-4.5S14.5 12 12 12z" />
    </svg>
  );
}
