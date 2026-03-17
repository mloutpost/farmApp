"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@/contexts/MapContext";
import { useDemStore } from "@/store/dem-store";
import { generateContours } from "@/lib/dem-analysis";

const CONTOUR_INTERVAL = 5;

function elevationToColor(elev: number, minE: number, maxE: number): string {
  const t = maxE > minE ? (elev - minE) / (maxE - minE) : 0;
  const r = Math.round(59 + t * 196);
  const g = Math.round(130 + t * 125);
  const b = Math.round(246 - t * 119);
  return `rgb(${r},${g},${b})`;
}

export default function ContoursOverlay() {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const { raster, contoursVisible } = useDemStore();

  useEffect(() => {
    if (!map || !raster || !contoursVisible) {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      return;
    }

    const contours = generateContours(raster, CONTOUR_INTERVAL);
    const minE = contours.length > 0 ? Math.min(...contours.map((c) => c.elevation)) : 0;
    const maxE = contours.length > 0 ? Math.max(...contours.map((c) => c.elevation)) : 0;

    const lines: google.maps.Polyline[] = [];
    for (const { elevation, segments } of contours) {
      const color = elevationToColor(elevation, minE, maxE);
      for (const seg of segments) {
        const path = seg.map(([lng, lat]) => ({ lat, lng }));
        const polyline = new google.maps.Polyline({
          path,
          strokeColor: color,
          strokeOpacity: 0.9,
          strokeWeight: 1,
          map,
        });
        lines.push(polyline);
      }
    }
    polylinesRef.current = lines;

    return () => {
      lines.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, raster, contoursVisible]);

  return null;
}
