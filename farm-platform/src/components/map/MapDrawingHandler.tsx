"use client";

import { useEffect, useRef } from "react";
import { useMapStore } from "@/store/map-store";
import { useMap } from "@/contexts/MapContext";

/**
 * Attaches click listeners to the map when in draw mode.
 * Single click: add point. For point mode: finish. For polygon/line: double-click to finish.
 */
export function MapDrawingHandler() {
  const map = useMap();
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const {
    drawMode,
    addPendingPoint,
    finishPendingGeometry,
    setDrawMode,
  } = useMapStore();

  useEffect(() => {
    if (!map) return;

    if (drawMode === "none") {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      map.setOptions?.({ disableDoubleClickZoom: false });
      return;
    }

    map.setOptions?.({ disableDoubleClickZoom: drawMode === "polygon" || drawMode === "line" });

    const handleClick = (e: google.maps.MapMouseEvent) => {
      const latLng = e.latLng;
      if (!latLng) return;
      const lat = latLng.lat();
      const lng = latLng.lng();

      if (drawMode === "point") {
        addPendingPoint(lng, lat);
        finishPendingGeometry();
        setDrawMode("none");
        return;
      }

      if (drawMode === "polygon" || drawMode === "line") {
        addPendingPoint(lng, lat);
      }
    };

    const handleDblClick = (e: google.maps.MapMouseEvent) => {
      if (drawMode !== "polygon" && drawMode !== "line") return;
      e.stop();
      finishPendingGeometry();
      setDrawMode("none");
    };

    listenerRef.current = google.maps.event.addListener(map, "click", handleClick);
    const dblListener = google.maps.event.addListener(map, "dblclick", handleDblClick);

    return () => {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      google.maps.event.removeListener(dblListener);
    };
  }, [map, drawMode, addPendingPoint, finishPendingGeometry, setDrawMode]);

  return null;
}
