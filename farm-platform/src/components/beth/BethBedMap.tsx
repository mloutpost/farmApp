"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { FarmNode } from "@/types";
import type { GardenData, Bed, Planting, BedNodeData } from "@/types";
import {
  geojsonToOuterRing,
  ringBBox,
  mergeBBoxes,
  lngLatToMetric,
  metricBBoxFromRingMeters,
  mergeMetricBBoxes,
  projectRingToSvgMetric,
  svgPathFromRing,
  type LngLatBBox,
} from "@/lib/beth-bed-geometry";
import { getCropById } from "@/lib/crop-catalog";
import type { CropCategory } from "@/lib/crop-catalog";

const SVG_W = 440;
const SVG_H = 300;
const PAD = 10;

function categoryStroke(cat: CropCategory | undefined): string {
  switch (cat) {
    case "nightshade":
      return "#b45309";
    case "cucurbit":
      return "#15803d";
    case "legume":
      return "#166534";
    case "brassica":
      return "#6d28d9";
    case "leafy-green":
      return "#047857";
    case "root":
      return "#92400e";
    case "allium":
      return "#a16207";
    case "herb":
      return "#0d9488";
    case "fruit":
      return "#be123c";
    case "grain":
      return "#78716c";
    case "tree":
      return "#4d7c0f";
    case "row-crop":
      return "#57534e";
    case "forage":
      return "#3f6212";
    default:
      return "#57534e";
  }
}

function abbrevCrop(name: string): string {
  const t = name.trim();
  if (t.length <= 1) return t.toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

function activePlantings(list: Planting[]): Planting[] {
  return list.filter((p) => p.status !== "failed");
}

function gridRectRing(gardenBbox: LngLatBBox, index: number, total: number, cols: number): number[][] {
  const pad = 0.08;
  const { minLng, minLat, maxLng, maxLat } = gardenBbox;
  const bw = maxLng - minLng;
  const bh = maxLat - minLat;
  const rows = Math.ceil(total / cols) || 1;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const innerW = bw * (1 - 2 * pad);
  const innerH = bh * (1 - 2 * pad);
  const cw = innerW / cols;
  const ch = innerH / rows;
  const x0 = minLng + bw * pad + col * cw;
  const y0 = minLat + bh * pad + row * ch;
  const x1 = x0 + cw;
  const y1 = y0 + ch;
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
  ];
}

function markerPositions(cx: number, cy: number, count: number, r: number): [number, number][] {
  if (count <= 0) return [];
  if (count === 1) return [[cx, cy]];
  const out: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * 2 * Math.PI - Math.PI / 2;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

function PlantGlyphs({
  plantings,
  cx,
  cy,
  r,
}: {
  plantings: Planting[];
  cx: number;
  cy: number;
  r: number;
}) {
  const pts = markerPositions(cx, cy, plantings.length, Math.min(r, 28));
  return (
    <>
      {plantings.map((p, i) => {
        const entry = p.catalogId ? getCropById(p.catalogId) : undefined;
        const stroke = categoryStroke(entry?.category);
        const label = abbrevCrop(p.crop || entry?.name || "?");
        const [px, py] = pts[i] ?? [cx, cy];
        return (
          <g key={p.id}>
            <circle
              cx={px}
              cy={py}
              r={9}
              fill="var(--beth-paper, #faf6ef)"
              stroke={stroke}
              strokeWidth={1.5}
              aria-hidden
            />
            <text
              x={px}
              y={py + 3}
              textAnchor="middle"
              fontSize={8}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fill={stroke}
              aria-hidden
            >
              {label}
            </text>
            <title>{`${p.crop}${p.variety ? ` (${p.variety})` : ""} — ${p.status}`}</title>
          </g>
        );
      })}
    </>
  );
}

function GardenSvg({ node }: { node: FarmNode }) {
  const data = node.data as GardenData;
  const beds = data.beds ?? [];
  const gardenRing = geojsonToOuterRing(node.geometry);
  const hatchId = `hatch-${node.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const clipId = `garden-clip-${node.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  if (!gardenRing) {
    return (
      <p className="text-sm text-stone-600 font-serif">No outline geometry for this garden.</p>
    );
  }

  const gardenOnlyBbox = ringBBox(gardenRing);
  let mergeLL = ringBBox(gardenRing);
  for (const bed of beds) {
    const br = bed.geometry ? geojsonToOuterRing(bed.geometry) : null;
    if (br) mergeLL = mergeBBoxes(mergeLL, ringBBox(br));
  }
  const refLng = (mergeLL.minLng + mergeLL.maxLng) / 2;
  const refLat = (mergeLL.minLat + mergeLL.maxLat) / 2;

  const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(beds.length, 1))));

  let fitMetric = metricBBoxFromRingMeters(
    gardenRing.map(([lng, lat]) => lngLatToMetric(lng, lat, refLng, refLat)) as [number, number][]
  );
  for (const bed of beds) {
    const br = bed.geometry ? geojsonToOuterRing(bed.geometry) : null;
    if (br) {
      const m = br.map(([lng, lat]) => lngLatToMetric(lng, lat, refLng, refLat)) as [number, number][];
      fitMetric = mergeMetricBBoxes(fitMetric, metricBBoxFromRingMeters(m));
    }
  }
  for (let bedIndex = 0; bedIndex < beds.length; bedIndex++) {
    const bed = beds[bedIndex];
    if (!bed.geometry) {
      const gr = gridRectRing(gardenOnlyBbox, bedIndex, beds.length, cols);
      const m = gr.map(([lng, lat]) => lngLatToMetric(lng, lat, refLng, refLat)) as [number, number][];
      fitMetric = mergeMetricBBoxes(fitMetric, metricBBoxFromRingMeters(m));
    }
  }

  const gardenPath = svgPathFromRing(
    projectRingToSvgMetric(gardenRing, refLng, refLat, fitMetric, SVG_W, SVG_H, PAD)
  );

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full h-auto max-h-[320px] rounded border border-amber-900/25 bg-[#faf6ef]"
      role="img"
      aria-label={`Bed map for garden ${node.name}`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={gardenPath} />
        </clipPath>
        <pattern id={hatchId} patternUnits="userSpaceOnUse" width="8" height="8">
          <path d="M0,8 L8,0" stroke="#c4b8a8" strokeWidth="0.5" />
        </pattern>
      </defs>
      <path
        d={gardenPath}
        fill={`url(#${hatchId})`}
        stroke="#78350f"
        strokeWidth={1.75}
        opacity={0.88}
      />
      <title>{node.name}</title>
      <g clipPath={`url(#${clipId})`}>
        {beds.map((bed: Bed, bedIndex: number) => {
          const plantings = activePlantings(bed.plantings ?? []);
          let ring: number[][] | null = bed.geometry ? geojsonToOuterRing(bed.geometry) : null;
          if (!ring) {
            ring = gridRectRing(gardenOnlyBbox, bedIndex, beds.length, cols);
          }
          const bedPath = svgPathFromRing(
            projectRingToSvgMetric(ring, refLng, refLat, fitMetric, SVG_W, SVG_H, PAD)
          );
          const brProjected = projectRingToSvgMetric(ring, refLng, refLat, fitMetric, SVG_W, SVG_H, PAD);
          let sx = 0;
          let sy = 0;
          for (const [x, y] of brProjected) {
            sx += x;
            sy += y;
          }
          const n = brProjected.length || 1;
          const cx = sx / n;
          const cy = sy / n;
          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
          for (const [x, y] of brProjected) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
          const rad = Math.min(maxX - minX, maxY - minY) / 2.8;

          return (
            <g key={bed.id}>
              <a href={`/node?id=${node.id}`} className="outline-none">
                <path
                  d={bedPath}
                  fill="#86efac"
                  fillOpacity={0.55}
                  stroke="#14532d"
                  strokeWidth={1.35}
                  className="hover:fill-opacity-80 transition-colors"
                />
                <title>{`${bed.name} — ${node.name}`}</title>
              </a>
              <PlantGlyphs plantings={plantings} cx={cx} cy={cy} r={rad} />
            </g>
          );
        })}
      </g>
      <path d={gardenPath} fill="none" stroke="#5c3d1e" strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
    </svg>
  );
}

function BedNodeSvg({ node }: { node: FarmNode }) {
  const data = node.data as BedNodeData;
  const ring = geojsonToOuterRing(node.geometry);
  if (!ring) {
    return <p className="text-sm text-stone-600 font-serif">No geometry for this bed.</p>;
  }
  const llBbox = ringBBox(ring);
  const refLng = (llBbox.minLng + llBbox.maxLng) / 2;
  const refLat = (llBbox.minLat + llBbox.maxLat) / 2;
  const mRing = ring.map(([lng, lat]) => lngLatToMetric(lng, lat, refLng, refLat)) as [number, number][];
  const fitMetric = metricBBoxFromRingMeters(mRing);

  const path = svgPathFromRing(projectRingToSvgMetric(ring, refLng, refLat, fitMetric, SVG_W, SVG_H, PAD));
  const plantings = activePlantings(data.plantings ?? []);
  const proj = projectRingToSvgMetric(ring, refLng, refLat, fitMetric, SVG_W, SVG_H, PAD);
  let sx = 0;
  let sy = 0;
  for (const [x, y] of proj) {
    sx += x;
    sy += y;
  }
  const n = proj.length || 1;
  const cx = sx / n;
  const cy = sy / n;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of proj) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const rad = Math.min(maxX - minX, maxY - minY) / 2.8;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full h-auto max-h-[320px] rounded border border-amber-900/25 bg-[#faf6ef]"
      role="img"
      aria-label={`Bed map for ${node.name}`}
    >
      <a href={`/node?id=${node.id}`} className="outline-none">
        <path
          d={path}
          fill="#86efac"
          fillOpacity={0.55}
          stroke="#14532d"
          strokeWidth={1.5}
          strokeLinejoin="round"
          className="hover:fill-opacity-80 transition-colors"
        />
        <title>{node.name}</title>
      </a>
      <PlantGlyphs plantings={plantings} cx={cx} cy={cy} r={rad} />
    </svg>
  );
}

export default function BethBedMap({ nodes }: { nodes: FarmNode[] }) {
  const { gardens, standaloneBeds } = useMemo(() => {
    const gardens = nodes.filter((n) => n.kind === "garden");
    const embedded = new Set<string>();
    for (const g of gardens) {
      for (const b of (g.data as GardenData).beds ?? []) {
        embedded.add(b.id);
      }
    }
    const standaloneBeds = nodes.filter(
      (n) => n.kind === "bed" && !embedded.has(n.id)
    );
    return { gardens, standaloneBeds };
  }, [nodes]);

  const empty = gardens.length === 0 && standaloneBeds.length === 0;

  if (empty) {
    return (
      <div className="rounded-lg border border-dashed border-amber-900/35 bg-[#faf6ef]/80 px-4 py-8 text-center font-serif text-stone-700">
        Draw a garden or bed on the map to see it here.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {gardens.map((g) => (
        <div key={g.id} className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-[family-name:var(--font-beth-serif)] text-lg text-stone-800">{g.name}</h3>
            <Link
              href={`/node?id=${g.id}`}
              className="text-sm text-amber-900/90 underline decoration-amber-800/40 hover:decoration-amber-900"
            >
              Open garden details
            </Link>
          </div>
          <GardenSvg node={g} />
        </div>
      ))}
      {standaloneBeds.map((b) => (
        <div key={b.id} className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-[family-name:var(--font-beth-serif)] text-lg text-stone-800">{b.name}</h3>
            <span className="text-xs uppercase tracking-wide text-stone-500">Bed</span>
            <Link
              href={`/node?id=${b.id}`}
              className="text-sm text-amber-900/90 underline decoration-amber-800/40 hover:decoration-amber-900"
            >
              Open bed details
            </Link>
          </div>
          <BedNodeSvg node={b} />
        </div>
      ))}
    </div>
  );
}
