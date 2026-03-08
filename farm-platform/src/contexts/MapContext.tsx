"use client";

import { createContext, useContext, useState } from "react";

const MapContext = createContext<{
  map: google.maps.Map | null;
  setMap: (map: google.maps.Map | null) => void;
}>({ map: null, setMap: () => {} });

export function MapProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  return (
    <MapContext.Provider value={{ map, setMap }}>
      {children}
    </MapContext.Provider>
  );
}

export function useMap() {
  return useContext(MapContext).map;
}

export function useSetMap() {
  return useContext(MapContext).setMap;
}
