"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFarmStore } from "@/store/farm-store";
import { useMapStore } from "@/store/map-store";
import type { FarmNode } from "@/types";
import type { GardenData, BedNodeData } from "@/types";
import { focusFarmNodeOnMap } from "@/lib/beth-map-focus";

function formatArea(node: FarmNode): string | null {
  if (node.kind === "garden") {
    const sq = (node.data as GardenData).sqft;
    if (sq != null) return `${Math.round(sq)} sq ft`;
  }
  if (node.kind === "bed") {
    const sq = (node.data as BedNodeData).sqft;
    if (sq != null) return `${Math.round(sq)} sq ft`;
  }
  return null;
}

export default function BethFarmPanel() {
  const nodes = useFarmStore((s) => s.nodes);
  const router = useRouter();
  const setCenter = useMapStore((s) => s.setCenter);
  const setZoom = useMapStore((s) => s.setZoom);

  const list = nodes.filter((n) => n.kind === "garden" || n.kind === "bed");

  const viewOnMap = (node: FarmNode) => {
    focusFarmNodeOnMap(node, setCenter, setZoom);
    router.push("/");
  };

  return (
    <div className="space-y-4">
      {list.length === 0 && (
        <p className="rounded-lg border border-dashed border-amber-900/30 bg-[#faf6ef]/80 px-4 py-6 text-center font-serif text-stone-700">
          No garden or bed nodes yet. Create them from the map.
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {list.map((n) => (
          <li
            key={n.id}
            className="flex flex-col rounded-lg border border-amber-900/20 bg-[#fffdf8] p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">
                  {n.kind === "garden" ? "Garden" : "Bed"}
                </p>
                <h3 className="font-[family-name:var(--font-beth-serif)] text-lg text-stone-900">
                  {n.name}
                </h3>
                {formatArea(n) && <p className="text-sm text-stone-600">{formatArea(n)}</p>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/node?id=${n.id}`}
                className="inline-flex min-h-[44px] items-center rounded-md border border-amber-900/40 px-3 py-2 text-sm text-amber-950 hover:bg-amber-900/10"
              >
                Details
              </Link>
              <button
                type="button"
                onClick={() => viewOnMap(n)}
                className="inline-flex min-h-[44px] items-center rounded-md bg-amber-900/90 px-3 py-2 text-sm text-amber-50 hover:bg-amber-900"
              >
                View on map
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
