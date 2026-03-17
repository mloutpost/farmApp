"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@/contexts/MapContext";
import { useFencePlannerStore } from "@/store/fence-planner-store";

const FENCE_COLOR = "#78716c";

export default function FencePlannerOverlay() {
  const map = useMap();
  const geometry = useFencePlannerStore((s) => s.geometry);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    polygonRef.current?.setMap(null);
    polylineRef.current?.setMap(null);
    polygonRef.current = null;
    polylineRef.current = null;

    if (!geometry || !("type" in geometry)) return;

    const geo = geometry as { type: string; coordinates?: number[][] | number[] | number[][][] };
    if (geo.type === "Polygon" && Array.isArray(geo.coordinates?.[0])) {
      const ring = geo.coordinates[0] as number[][];
      const path = ring.map((c) => ({ lat: c[1], lng: c[0] }));
      if (path.length >= 3) {
        polygonRef.current = new google.maps.Polygon({
          paths: path,
          map,
          fillColor: FENCE_COLOR,
          fillOpacity: 0.2,
          strokeColor: FENCE_COLOR,
          strokeOpacity: 0.9,
          strokeWeight: 2.5,
          clickable: false,
          zIndex: 999,
        });
      }
    } else if (geo.type === "LineString" && Array.isArray(geo.coordinates)) {
      const path = (geo.coordinates as number[][]).map((c) => ({ lat: c[1], lng: c[0] }));
      if (path.length >= 2) {
        polylineRef.current = new google.maps.Polyline({
          path,
          map,
          strokeColor: FENCE_COLOR,
          strokeOpacity: 0.9,
          strokeWeight: 2.5,
          clickable: false,
          zIndex: 999,
        });
      }
    }

    return () => {
      polygonRef.current?.setMap(null);
      polylineRef.current?.setMap(null);
    };
  }, [map, geometry]);

  return null;
}
