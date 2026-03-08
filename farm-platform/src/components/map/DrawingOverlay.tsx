"use client";

import { useEffect, useRef } from "react";
import { useMapStore } from "@/store/map-store";
import { useMap } from "@/contexts/MapContext";
import { NODE_KIND_COLORS } from "@/types";

export default function DrawingOverlay() {
  const map = useMap();
  const { drawMode, pendingGeometry, pendingParentId } = useMapStore();
  const drawColor = pendingParentId ? NODE_KIND_COLORS.bed : "#22c55e";
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    polylineRef.current?.setMap(null);
    polygonRef.current?.setMap(null);
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylineRef.current = null;
    polygonRef.current = null;

    if (drawMode === "none" || !pendingGeometry) return;

    const coords = pendingGeometry.coordinates;

    if (pendingGeometry.type === "Polygon" || pendingGeometry.type === "LineString") {
      const points = coords as number[][];
      if (points.length === 0) return;

      const path = points.map((c) => ({ lat: c[1], lng: c[0] }));

      if (pendingGeometry.type === "Polygon" && points.length >= 3) {
        polygonRef.current = new google.maps.Polygon({
          paths: path,
          map,
          fillColor: drawColor,
          fillOpacity: 0.15,
          strokeColor: drawColor,
          strokeOpacity: 0.9,
          strokeWeight: 2,
          clickable: false,
          zIndex: 1000,
        });
      } else {
        polylineRef.current = new google.maps.Polyline({
          path,
          map,
          strokeColor: pendingGeometry.type === "Polygon" ? drawColor : "#22d3ee",
          strokeOpacity: 0.9,
          strokeWeight: 2.5,
          clickable: false,
          zIndex: 1000,
        });
      }

      points.forEach((c, i) => {
        const isFirst = i === 0;
        const marker = new google.maps.Marker({
          position: { lat: c[1], lng: c[0] },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isFirst ? 7 : 5,
          fillColor: isFirst ? "#ffffff" : drawColor,
          fillOpacity: 1,
          strokeColor: drawColor,
            strokeWeight: 2,
          },
          clickable: false,
          zIndex: 1001,
        });
        markersRef.current.push(marker);
      });
    }

    if (pendingGeometry.type === "Point") {
      const c = coords as number[];
      if (c.length >= 2) {
        const marker = new google.maps.Marker({
          position: { lat: c[1], lng: c[0] },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#60a5fa",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          clickable: false,
          zIndex: 1001,
        });
        markersRef.current.push(marker);
      }
    }

    return () => {
      polylineRef.current?.setMap(null);
      polygonRef.current?.setMap(null);
      markersRef.current.forEach((m) => m.setMap(null));
    };
  }, [map, drawMode, pendingGeometry, pendingParentId]);

  return null;
}
