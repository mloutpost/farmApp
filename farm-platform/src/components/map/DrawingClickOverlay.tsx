"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@/contexts/MapContext";
import { useMapStore } from "@/store/map-store";

/**
 * When in draw mode, overlays (Data layer, GroundOverlay) can capture clicks
 * before they reach the map - especially in production/minified builds.
 * This overlay sits on top and captures all clicks, converting to LatLng.
 */
export default function DrawingClickOverlay() {
  const map = useMap();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const {
    drawMode,
    addPendingPoint,
    finishPendingGeometry,
    setDrawMode,
  } = useMapStore();

  useEffect(() => {
    if (!map || drawMode === "none") {
      overlayRef.current?.setMap(null);
      overlayRef.current = null;
      containerRef.current = null;
      return;
    }

    class DrawingOverlayView extends google.maps.OverlayView {
      container: HTMLDivElement;
      constructor() {
        super();
        this.container = document.createElement("div");
        this.container.style.cssText =
          "position:absolute;inset:0;width:100%;height:100%;cursor:crosshair;z-index:1000;pointer-events:auto;";
      }
      onAdd() {
        const panes = this.getPanes?.();
        if (panes?.overlayMouseTarget) panes.overlayMouseTarget.appendChild(this.container);
      }
      draw() {}
      onRemove() {
        this.container.parentNode?.removeChild(this.container);
      }
    }

    const overlayView = new DrawingOverlayView();
    overlayView.setMap(map);
    overlayRef.current = overlayView;
    containerRef.current = overlayView.container;

    const handleClick = (e: MouseEvent) => {
      const projection = overlayView.getProjection?.();
      if (!projection) return;
      const mapDiv = map.getDiv?.();
      if (!mapDiv) return;
      const rect = mapDiv.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const point = new google.maps.Point(x, y);
      const latLng = projection.fromDivPixelToLatLng(point);
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

    const handleDblClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (drawMode !== "polygon" && drawMode !== "line") return;
      finishPendingGeometry();
      setDrawMode("none");
    };

    overlayView.container.addEventListener("click", handleClick);
    overlayView.container.addEventListener("dblclick", handleDblClick);

    return () => {
      overlayView.container.removeEventListener("click", handleClick);
      overlayView.container.removeEventListener("dblclick", handleDblClick);
      overlayView.setMap(null);
      overlayRef.current = null;
      containerRef.current = null;
    };
  }, [map, drawMode, addPendingPoint, finishPendingGeometry, setDrawMode]);

  return null;
}
