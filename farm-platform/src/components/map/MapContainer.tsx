"use client";

import dynamic from "next/dynamic";
import MapStyleSwitcher from "./MapStyleSwitcher";
import {
  SurveyImportStatus,
  NodePalette,
  MapLayerControl,
} from "./MapFloatingPanels";
import MapNodeDetailsPanel from "./MapNodeDetailsPanel";
import NodeActionMenu from "./NodeActionMenu";

const FarmMap = dynamic(() => import("./FarmMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <span className="text-sm text-text-secondary">Loading map...</span>
      </div>
    </div>
  ),
});

export default function MapContainer() {
  return (
    <main className="relative flex-1 min-h-0 h-full flex">
      {/* Left floating panels */}
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-3">
        <SurveyImportStatus />
        <NodePalette />
      </div>
      <div className="absolute left-4 bottom-24 z-10">
        <MapLayerControl />
      </div>

      {/* Center map */}
      <div className="flex-1 min-w-0 relative">
        <FarmMap />
        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
          <MapStyleSwitcher />
        </div>
      </div>

      {/* Node action menu - shows when a node is selected */}
      <div className="absolute left-1/2 top-20 z-20 -translate-x-1/2">
        <NodeActionMenu />
      </div>

      {/* Right sidebar - node details */}
      <MapNodeDetailsPanel />

      {/* Bottom save button */}
      <div className="absolute bottom-6 right-4 z-10">
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-hover transition-colors">
          Save Changes
        </button>
      </div>
    </main>
  );
}
