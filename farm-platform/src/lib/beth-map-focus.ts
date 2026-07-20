import type { FarmNode } from "@/types";
import { bboxCenter, bboxFromGeometry, zoomForBBox } from "@/lib/beth-bed-geometry";

export function focusFarmNodeOnMap(
  node: FarmNode,
  setCenter: (c: [number, number]) => void,
  setZoom: (z: number) => void
): void {
  const bbox = bboxFromGeometry(node.geometry);
  if (!bbox) return;
  setCenter(bboxCenter(bbox));
  setZoom(zoomForBBox(bbox));
}
