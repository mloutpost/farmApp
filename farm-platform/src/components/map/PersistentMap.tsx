"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSyncFarmToMap } from "@/hooks/useSyncFarmToMap";
import MapActionsPanel from "./MapActionsPanel";
import MapStyleSwitcher from "./MapStyleSwitcher";
import TypePickerModal from "./TypePickerModal";
import MyFarmButton from "./MyFarmButton";
import FarmNodesPanel from "./FarmNodesPanel";
import WeatherWidget from "@/components/WeatherWidget";
import SearchPalette from "@/components/SearchPalette";

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

export default function PersistentMap({ visible }: { visible: boolean }) {
  useSyncFarmToMap();
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div
      className="absolute inset-0"
      style={{ visibility: visible ? "visible" : "hidden", zIndex: visible ? 1 : -1 }}
    >
      <div className="relative h-full w-full">
        <div className="absolute top-4 right-4 z-20">
          <WeatherWidget compact />
        </div>

        <div className="absolute left-4 top-4 z-10">
          <MapActionsPanel />
        </div>

        <div className="absolute inset-0">
          <FarmMap />
        </div>

        <div className="absolute bottom-4 left-4 z-10 flex items-end gap-2">
          <div className="flex items-center gap-0 rounded-lg bg-bg-elevated/95 backdrop-blur border border-border shadow-lg overflow-hidden">
            <MyFarmButton onClick={() => setPanelOpen(true)} />
            <div className="w-px h-6 bg-border" />
            <MapStyleSwitcher />
          </div>
        </div>

        <TypePickerModal />
        <FarmNodesPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
        <SearchPalette />
      </div>
    </div>
  );
}
