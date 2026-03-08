"use client";

import MapContainer from "@/components/map/MapContainer";
import WeatherWidget from "@/components/WeatherWidget";
import SearchPalette from "@/components/SearchPalette";

export default function MapPage() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute top-4 right-4 z-20">
        <WeatherWidget />
      </div>
      <MapContainer />
      <SearchPalette />
    </div>
  );
}
