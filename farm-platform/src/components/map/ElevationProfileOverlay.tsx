"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@/contexts/MapContext";
import { useDemStore } from "@/store/dem-store";

export default function ElevationProfileOverlay() {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const { elevationProfileLine } = useDemStore();

  useEffect(() => {
    if (!map || !elevationProfileLine || elevationProfileLine.length < 2) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    const path = elevationProfileLine.map(([lng, lat]) => ({ lat, lng }));
    const polyline = new google.maps.Polyline({
      path,
      strokeColor: "#22c55e",
      strokeOpacity: 0.9,
      strokeWeight: 3,
      map,
    });
    polylineRef.current = polyline;

    return () => {
      polyline.setMap(null);
      polylineRef.current = null;
    };
  }, [map, elevationProfileLine]);

  return null;
}
