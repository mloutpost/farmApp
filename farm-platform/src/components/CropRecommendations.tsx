"use client";

import { useMemo, useState, useCallback } from "react";
import { useFarmStore } from "@/store/farm-store";
import { getRecommendations, type CropRecommendation } from "@/lib/crop-recommendations";
import type { BedNodeData, GardenData, GreenhouseData } from "@/types";

const TAG_COLORS: Record<string, string> = {
  "high-demand": "bg-amber-500/20 text-amber-300",
  "frost-hardy": "bg-sky-500/20 text-sky-300",
  companion: "bg-emerald-500/20 text-emerald-300",
  rotation: "bg-violet-500/20 text-violet-300",
  nightshade: "bg-red-500/15 text-red-300",
  cucurbit: "bg-lime-500/15 text-lime-300",
  legume: "bg-green-500/15 text-green-300",
  brassica: "bg-teal-500/15 text-teal-300",
  "leafy-green": "bg-emerald-500/15 text-emerald-300",
  root: "bg-orange-500/15 text-orange-300",
  allium: "bg-purple-500/15 text-purple-300",
  herb: "bg-cyan-500/15 text-cyan-300",
  fruit: "bg-pink-500/15 text-pink-300",
  grain: "bg-yellow-500/15 text-yellow-300",
  tree: "bg-green-600/15 text-green-300",
  "row-crop": "bg-amber-600/15 text-amber-300",
  forage: "bg-lime-600/15 text-lime-300",
};

function tagClass(tag: string): string {
  return TAG_COLORS[tag] ?? "bg-bg-elevated text-text-muted";
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-emerald-400" : score >= 45 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-bg-elevated overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-[11px] font-medium text-text-muted tabular-nums w-7 text-right">
        {score}
      </span>
    </div>
  );
}

export default function CropRecommendations({ nodeId }: { nodeId: string }) {
  const node = useFarmStore((s) => s.nodes.find((n) => n.id === nodeId));
  const allNodes = useFarmStore((s) => s.nodes);
  const profile = useFarmStore((s) => s.profile);
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const recs = useMemo<CropRecommendation[]>(() => {
    if (!node) return [];
    return getRecommendations(node, allNodes, profile, 8);
  }, [node, allNodes, profile]);

  const addToBed = useCallback(
    (rec: CropRecommendation) => {
      if (!node) return;
      const planting = {
        id: uid(),
        crop: rec.cropName,
        catalogId: rec.cropId,
        status: "planned" as const,
        season: profile.currentSeason ?? new Date().getFullYear(),
      };

      const d = node.data;
      if (d.kind === "bed") {
        const bd = d as BedNodeData;
        updateNodeData(node.id, { plantings: [...bd.plantings, planting] });
      } else if (d.kind === "garden" || d.kind === "greenhouse") {
        const gd = d as GardenData | GreenhouseData;
        const beds = [...(gd.beds ?? [])];
        if (beds.length > 0) {
          beds[0] = { ...beds[0], plantings: [...beds[0].plantings, planting] };
        } else {
          beds.push({ id: uid(), name: "Bed 1", plantings: [planting] });
        }
        updateNodeData(node.id, { beds });
      }

      setAdded((prev) => new Set(prev).add(rec.cropId));
    },
    [node, profile.currentSeason, updateNodeData],
  );

  if (!node) {
    return (
      <div className="rounded-lg bg-bg-surface border border-border p-4">
        <p className="text-text-muted text-sm">Node not found.</p>
      </div>
    );
  }

  if (!["bed", "garden", "field", "greenhouse"].includes(node.kind)) {
    return null;
  }

  return (
    <div className="rounded-lg bg-bg-surface border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-accent shrink-0">
          <path
            d="M8 1l1.796 3.64L14 5.42l-3 2.924.708 4.13L8 10.58l-3.708 1.894L5 8.344 2 5.42l4.204-.78L8 1z"
            fill="currentColor"
            opacity=".85"
          />
        </svg>
        <h3 className="text-sm font-semibold text-text-primary tracking-tight">
          AI Recommendations
        </h3>
      </div>

      {recs.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <div className="text-2xl mb-2 opacity-40">🌱</div>
          <p className="text-text-muted text-xs">
            No recommendations available. Add profile data (zone, frost dates) for better results.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {recs.map((rec) => (
            <li
              key={rec.cropId}
              className="px-4 py-3 hover:bg-bg-elevated/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-sm font-medium text-text-primary leading-tight">
                  {rec.cropName}
                </span>
                <button
                  disabled={added.has(rec.cropId)}
                  onClick={() => addToBed(rec)}
                  className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded transition-colors ${
                    added.has(rec.cropId)
                      ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                      : "bg-accent/15 text-accent hover:bg-accent/25"
                  }`}
                >
                  {added.has(rec.cropId) ? "Added ✓" : "Add to bed"}
                </button>
              </div>

              <ScoreBar score={rec.score} />

              <p className="text-[11px] text-text-secondary mt-1.5 leading-relaxed">
                {rec.reason}
              </p>

              <div className="flex flex-wrap gap-1 mt-2">
                {rec.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tagClass(tag)}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
