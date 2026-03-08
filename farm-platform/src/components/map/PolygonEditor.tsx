"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMapStore } from "@/store/map-store";
import { useFarmStore } from "@/store/farm-store";
import { useMap } from "@/contexts/MapContext";
import { nodeColor } from "@/types";

export default function PolygonEditor() {
  const map = useMap();
  const editingNodeId = useMapStore((s) => s.editingNodeId);

  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushAndCleanup = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const id = useMapStore.getState().editingNodeId;
    if (id && polygonRef.current) {
      const path = polygonRef.current.getPath();
      const coords: number[][] = [];
      for (let i = 0; i < path.getLength(); i++) {
        const p = path.getAt(i);
        coords.push([p.lng(), p.lat()]);
      }
      if (coords.length >= 3) {
        coords.push([coords[0][0], coords[0][1]]);
        useFarmStore.getState().updateNode(id, { geometry: { type: "Polygon", coordinates: [coords] } as any });
      }
    } else if (id && polylineRef.current) {
      const path = polylineRef.current.getPath();
      const coords: number[][] = [];
      for (let i = 0; i < path.getLength(); i++) {
        const p = path.getAt(i);
        coords.push([p.lng(), p.lat()]);
      }
      if (coords.length >= 2) {
        useFarmStore.getState().updateNode(id, { geometry: { type: "LineString", coordinates: coords } as any });
      }
    } else if (id && markerRef.current) {
      const pos = markerRef.current.getPosition();
      if (pos) {
        useFarmStore.getState().updateNode(id, { geometry: { type: "Point", coordinates: [pos.lng(), pos.lat()] } as any });
      }
    }

    polygonRef.current?.setMap(null);
    polygonRef.current = null;
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
    markerRef.current?.setMap(null);
    markerRef.current = null;
    listenersRef.current.forEach((l) => google.maps.event.removeListener(l));
    listenersRef.current = [];
  }, []);

  useEffect(() => {
    if (!map || !editingNodeId) {
      flushAndCleanup();
      return;
    }

    const node = useFarmStore.getState().nodes.find((n) => n.id === editingNodeId);
    if (!node) {
      flushAndCleanup();
      return;
    }

    flushAndCleanup();

    const geo = node.geometry as any;
    const color = nodeColor(node, useFarmStore.getState().groups);

    const commitToStore = () => {
      const id = useMapStore.getState().editingNodeId;
      if (!id) return;

      if (polygonRef.current) {
        const path = polygonRef.current.getPath();
        const coords: number[][] = [];
        for (let i = 0; i < path.getLength(); i++) {
          const p = path.getAt(i);
          coords.push([p.lng(), p.lat()]);
        }
        if (coords.length >= 3) {
          coords.push([coords[0][0], coords[0][1]]);
        }
        useFarmStore.getState().updateNode(id, { geometry: { type: "Polygon", coordinates: [coords] } as any });
      }

      if (polylineRef.current) {
        const path = polylineRef.current.getPath();
        const coords: number[][] = [];
        for (let i = 0; i < path.getLength(); i++) {
          const p = path.getAt(i);
          coords.push([p.lng(), p.lat()]);
        }
        useFarmStore.getState().updateNode(id, { geometry: { type: "LineString", coordinates: coords } as any });
      }

      if (markerRef.current) {
        const pos = markerRef.current.getPosition();
        if (pos) {
          useFarmStore.getState().updateNode(id, { geometry: { type: "Point", coordinates: [pos.lng(), pos.lat()] } as any });
        }
      }
    };

    const debouncedSave = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        commitToStore();
      }, 150);
    };

    const immediateSave = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      commitToStore();
    };

    if (geo.type === "Polygon" && geo.coordinates?.[0]) {
      const ring = geo.coordinates[0] as number[][];
      const path = ring.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
      if (path.length > 1 && path[0].lat === path[path.length - 1].lat && path[0].lng === path[path.length - 1].lng) {
        path.pop();
      }

      const polygon = new google.maps.Polygon({
        paths: path,
        map,
        editable: true,
        draggable: true,
        fillColor: color,
        fillOpacity: 0.25,
        strokeColor: color,
        strokeOpacity: 1,
        strokeWeight: 2.5,
        zIndex: 2000,
      });
      polygonRef.current = polygon;

      listenersRef.current.push(
        google.maps.event.addListener(polygon.getPath(), "set_at", debouncedSave),
        google.maps.event.addListener(polygon.getPath(), "insert_at", debouncedSave),
        google.maps.event.addListener(polygon.getPath(), "remove_at", debouncedSave),
        google.maps.event.addListener(polygon, "dragend", immediateSave),
      );
    }

    if (geo.type === "LineString" && geo.coordinates) {
      const coords = geo.coordinates as number[][];
      const path = coords.map((c: number[]) => ({ lat: c[1], lng: c[0] }));

      const polyline = new google.maps.Polyline({
        path,
        map,
        editable: true,
        draggable: true,
        strokeColor: color,
        strokeOpacity: 1,
        strokeWeight: 3,
        zIndex: 2000,
      });
      polylineRef.current = polyline;

      listenersRef.current.push(
        google.maps.event.addListener(polyline.getPath(), "set_at", debouncedSave),
        google.maps.event.addListener(polyline.getPath(), "insert_at", debouncedSave),
        google.maps.event.addListener(polyline.getPath(), "remove_at", debouncedSave),
        google.maps.event.addListener(polyline, "dragend", immediateSave),
      );
    }

    if (geo.type === "Point" && geo.coordinates) {
      const coords = geo.coordinates as number[];
      const marker = new google.maps.Marker({
        position: { lat: coords[1], lng: coords[0] },
        map,
        draggable: true,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        zIndex: 2000,
      });
      markerRef.current = marker;

      listenersRef.current.push(
        google.maps.event.addListener(marker, "dragend", immediateSave),
      );
    }

    return flushAndCleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, editingNodeId, flushAndCleanup]);

  return null;
}
