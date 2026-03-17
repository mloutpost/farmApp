"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@/contexts/MapContext";
import { useDemStore } from "@/store/dem-store";
import { generateHillshade } from "@/lib/dem-hillshade";

const MAX_DIM = 4096;

export default function HillshadeOverlay() {
  const map = useMap();
  const overlayRef = useRef<google.maps.GroundOverlay | null>(null);
  const { raster, hillshadeVisible, hillshadeOpacity, hillshadeSmoothness, hillshadeZFactor, hillshadeScale } = useDemStore();

  useEffect(() => {
    if (!map || !raster || !hillshadeVisible) {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      return;
    }

    const { bbox } = raster;
    const { data: hillshade, width: w, height: h } = generateHillshade(raster, MAX_DIM, {
      zFactor: hillshadeZFactor,
      scale: hillshadeScale ?? undefined,
      smoothness: hillshadeSmoothness,
    });

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.createImageData(w, h);
    imageData.data.set(hillshade);
    ctx.putImageData(imageData, 0, 0);

    const dataUrl = canvas.toDataURL("image/png");
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(bbox[1], bbox[0]),
      new google.maps.LatLng(bbox[3], bbox[2])
    );

    const overlay = new google.maps.GroundOverlay(dataUrl, bounds, {
      opacity: hillshadeOpacity,
    });
    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
  }, [map, raster, hillshadeVisible, hillshadeOpacity, hillshadeSmoothness, hillshadeZFactor, hillshadeScale]);

  return null;
}
