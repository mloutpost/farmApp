"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@/contexts/MapContext";
import { useFarmStore } from "@/store/farm-store";
import { nodeHasCropArea } from "@/lib/node-crop";
import { nodeColor } from "@/types";

function ringToPathD(
  ring: number[][],
  projection: google.maps.MapCanvasProjection
): string {
  const parts: string[] = [];
  for (let i = 0; i < ring.length; i++) {
    const [lng, lat] = ring[i];
    const p = projection.fromLatLngToDivPixel(new google.maps.LatLng(lat, lng));
    if (!p) continue;
    if (i === 0) parts.push(`M ${p.x} ${p.y}`);
    else parts.push(`L ${p.x} ${p.y}`);
  }
  if (parts.length < 2) return "";
  parts.push("Z");
  return parts.join(" ");
}

/**
 * Diagonal hatch fill over polygons that have a crop/forage assigned.
 * Renders above the base Data layer; pointer-events none.
 */
export default function CropHatchOverlay() {
  const map = useMap();
  const nodes = useFarmStore((s) => s.nodes);
  const groups = useFarmStore((s) => s.groups);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const cropNodes = nodes.filter(
      (n) => nodeHasCropArea(n) && n.geometry && (n.geometry as { type?: string }).type === "Polygon"
    );
    if (!map || cropNodes.length === 0) {
      overlayRef.current?.setMap(null);
      overlayRef.current = null;
      svgRef.current = null;
      return;
    }

    class HatchOverlay extends google.maps.OverlayView {
      svg: SVGSVGElement;
      constructor() {
        super();
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttribute("style", "position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:2;");
      }
      onAdd() {
        const panes = this.getPanes?.();
        if (panes?.overlayLayer) panes.overlayLayer.appendChild(this.svg);
      }
      draw() {
        const projection = this.getProjection?.() as google.maps.MapCanvasProjection | null;
        const mapDiv = map?.getDiv?.();
        if (!projection || !mapDiv) return;

        const w = mapDiv.clientWidth || 1;
        const h = mapDiv.clientHeight || 1;
        this.svg.setAttribute("width", String(w));
        this.svg.setAttribute("height", String(h));
        this.svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

        while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        this.svg.appendChild(defs);

        cropNodes.forEach((node, idx) => {
          const g = node.geometry as { type: string; coordinates: number[][][] };
          if (g.type !== "Polygon" || !g.coordinates?.[0]) return;
          const ring = g.coordinates[0].map((c) => [c[0], c[1]] as number[]);
          const pathD = ringToPathD(ring, projection);
          if (!pathD) return;

          const color = nodeColor(node, groups);
          const pid = `hatch-${node.id}-${idx}`;
          const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
          pattern.setAttribute("id", pid);
          pattern.setAttribute("patternUnits", "userSpaceOnUse");
          pattern.setAttribute("width", "10");
          pattern.setAttribute("height", "10");
          pattern.setAttribute("patternTransform", "rotate(45 5 5)");

          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", "0");
          line.setAttribute("y1", "0");
          line.setAttribute("x2", "0");
          line.setAttribute("y2", "10");
          line.setAttribute("stroke", color);
          line.setAttribute("stroke-width", "2");
          line.setAttribute("opacity", "0.45");
          pattern.appendChild(line);
          defs.appendChild(pattern);

          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", pathD);
          path.setAttribute("fill", `url(#${pid})`);
          path.setAttribute("fill-opacity", "0.55");
          path.setAttribute("stroke", "none");
          this.svg.appendChild(path);
        });
      }
      onRemove() {
        this.svg.parentNode?.removeChild(this.svg);
      }
    }

    const overlay = new HatchOverlay();
    overlay.setMap(map);
    overlayRef.current = overlay;
    svgRef.current = overlay.svg;

    const idle = map.addListener("idle", () => overlay.draw?.());
    const b = map.addListener("bounds_changed", () => overlay.draw?.());

    return () => {
      google.maps.event.removeListener(idle);
      google.maps.event.removeListener(b);
      overlay.setMap(null);
      overlayRef.current = null;
      svgRef.current = null;
    };
  }, [map, nodes, groups]);

  return null;
}
