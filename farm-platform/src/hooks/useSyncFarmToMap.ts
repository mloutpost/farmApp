"use client";

import { useEffect, useRef } from "react";
import { useFarmStore } from "@/store/farm-store";
import { useMapStore } from "@/store/map-store";
import { nodeColor } from "@/types";
import type { MapLayer } from "@/types";

function fingerprint(): string {
  const { nodes, groups } = useFarmStore.getState();
  const gfp = groups.map((g) => `${g.id}:${g.color ?? ""}`).join(";");
  return nodes.map((n) => `${n.id}:${n.name}:${n.color ?? ""}:${n.groupId ?? ""}:${n.parentId ?? ""}:${n.kind}`).join("|") + "||" + gfp;
}

function rebuildMapLayers() {
  const { nodes, groups } = useFarmStore.getState();
  const { layers } = useMapStore.getState();

  const markers: Array<{ id: string; name: string; lat: number; lng: number; type: string; color: string }> = [];
  const nodeLayers: MapLayer[] = [];

  nodes.forEach((node) => {
    if (!node.geometry) return;
    const geo = node.geometry;
    const color = nodeColor(node, groups);

    if (geo.type === "Point") {
      const coords = geo.coordinates as number[];
      if (coords.length >= 2) {
        markers.push({
          id: node.id,
          name: node.name,
          lat: coords[1],
          lng: coords[0],
          type: node.kind,
          color,
        });
      }
    } else if (geo.type === "Polygon" || geo.type === "LineString") {
      const existing = layers.find((l) => l.id === `node-${node.id}`);
      nodeLayers.push({
        id: `node-${node.id}`,
        farmId: "farm-1",
        name: node.name,
        type: "boundary",
        geojson: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: geo,
              properties: { nodeId: node.id, kind: node.kind, color },
            },
          ],
        } as any,
        visible: existing?.visible ?? true,
        opacity: existing?.opacity ?? 0.8,
        nodeId: node.id,
        createdAt: new Date(),
      });
    }
  });

  const surveyLayers = layers.filter((l) => !l.id.startsWith("node-"));
  useMapStore.getState().setMapMarkers(markers);
  useMapStore.getState().setLayers([...surveyLayers, ...nodeLayers]);
}

export function useSyncFarmToMap() {
  const prevCountRef = useRef(-1);
  const prevFpRef = useRef("");
  const prevEditingRef = useRef<string | null>(null);

  useEffect(() => {
    rebuildMapLayers();
    const nodes = useFarmStore.getState().nodes;
    prevCountRef.current = nodes.length;
    if (nodes.length > 0) {
      useMapStore.getState().setFitToFarmBounds(true);
    }
    prevFpRef.current = fingerprint();
    prevEditingRef.current = useMapStore.getState().editingNodeId;

    const unsubFarm = useFarmStore.subscribe((state) => {
      const countChanged = state.nodes.length !== prevCountRef.current;
      const hadNoNodes = prevCountRef.current <= 0;
      const nowHasNodes = state.nodes.length > 0;
      prevCountRef.current = state.nodes.length;

      if (countChanged) {
        prevFpRef.current = fingerprint();
        rebuildMapLayers();
        if (hadNoNodes && nowHasNodes) {
          useMapStore.getState().setFitToFarmBounds(true);
        }
        return;
      }

      const fp = fingerprint();
      if (fp !== prevFpRef.current) {
        prevFpRef.current = fp;
        rebuildMapLayers();
      }
    });

    const unsubMap = useMapStore.subscribe((state) => {
      const wasEditing = prevEditingRef.current;
      prevEditingRef.current = state.editingNodeId;
      if (wasEditing && !state.editingNodeId) {
        prevFpRef.current = fingerprint();
        rebuildMapLayers();
      }
    });

    return () => {
      unsubFarm();
      unsubMap();
    };
  }, []);
}
