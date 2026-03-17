"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@/contexts/MapContext";
import { useDemStore } from "@/store/dem-store";
import { computeFlowAccumulation, flowAccumToRgba } from "@/lib/dem-analysis";

const MAX_DIM = 256;

export default function DrainageOverlay() {
  const map = useMap();
  const overlayRef = useRef<google.maps.GroundOverlay | null>(null);
  const { raster, drainageVisible } = useDemStore();

  useEffect(() => {
    if (!map || !raster || !drainageVisible) {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      return;
    }

    const { bbox } = raster;
    const acc = computeFlowAccumulation(raster, MAX_DIM);
    const data = flowAccumToRgba(acc);
    const { width: w, height: h } = acc;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.createImageData(w, h);
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);

    const dataUrl = canvas.toDataURL("image/png");
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(bbox[1], bbox[0]),
      new google.maps.LatLng(bbox[3], bbox[2])
    );

    const overlay = new google.maps.GroundOverlay(dataUrl, bounds, { opacity: 0.6 });
    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
  }, [map, raster, drainageVisible]);

  return null;
}
