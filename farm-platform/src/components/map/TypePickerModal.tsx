"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMapStore } from "@/store/map-store";
import { useFarmStore } from "@/store/farm-store";
import {
  AREA_KINDS,
  POINT_KINDS,
  LINE_KINDS,
  NODE_KIND_LABELS,
  NODE_KIND_COLORS,
  type NodeKind,
  type GardenData,
  type FieldData,
  type GreenhouseData,
  type PondData,
  type IrrigationData,
  type FenceData,
  type RoadData,
  type PipelineData,
  type DitchData,
  type PowerlineData,
} from "@/types";
import {
  polygonAreaSqFt,
  polygonAcres,
  polygonSideLengths,
  lineStringLengthFt,
  estimateSunExposure,
  formatFt,
  formatArea,
} from "@/lib/geo-calc";

interface GeoStats {
  areaSqFt?: number;
  acres?: number;
  sides?: number[];
  lengthFt?: number;
  estimatedSun?: "full" | "partial" | "shade";
}

export default function TypePickerModal() {
  const router = useRouter();
  const { completedGeometry, setCompletedGeometry, pendingParentId, setPendingParentId } = useMapStore();
  const addNode = useFarmStore((s) => s.addNode);
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const profile = useFarmStore((s) => s.profile);
  const allNodes = useFarmStore((s) => s.nodes);
  const gardens = useMemo(() => allNodes.filter((n) => n.kind === "garden"), [allNodes]);
  const waterlines = useMemo(() => allNodes.filter((n) => n.kind === "pipeline" || n.kind === "irrigation"), [allNodes]);
  const [kind, setKind] = useState<NodeKind | "">(pendingParentId ? "bed" : "");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>(pendingParentId ?? "");

  const geometryType = useMemo(() => {
    if (!completedGeometry || !("type" in completedGeometry)) return null;
    return completedGeometry.type as "Point" | "LineString" | "Polygon";
  }, [completedGeometry]);

  const availableKinds = useMemo<NodeKind[]>(() => {
    if (geometryType === "Polygon") return [...AREA_KINDS];
    if (geometryType === "Point") return [...POINT_KINDS];
    if (geometryType === "LineString") return [...LINE_KINDS];
    return [];
  }, [geometryType]);

  const stats = useMemo<GeoStats>(() => {
    if (!completedGeometry || !("type" in completedGeometry)) return {};
    const geo = completedGeometry as any;

    if (geo.type === "Polygon" && geo.coordinates?.[0]) {
      const ring = geo.coordinates[0] as number[][];
      const areaSqFt = polygonAreaSqFt(ring);
      const acres = polygonAcres(ring);
      const sides = polygonSideLengths(ring.slice(0, -1));
      const profileSun = profile.sunExposure;
      const centerLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
      return { areaSqFt, acres, sides, estimatedSun: profileSun ?? estimateSunExposure(centerLat) };
    }

    if (geo.type === "LineString" && geo.coordinates) {
      const coords = geo.coordinates as number[][];
      return { lengthFt: lineStringLengthFt(coords) };
    }

    return {};
  }, [completedGeometry]);

  if (!completedGeometry || !geometryType) return null;

  const handleCreate = () => {
    if (!kind || !completedGeometry) return;
    const displayName = name.trim() || `${NODE_KIND_LABELS[kind]} ${Date.now().toString().slice(-4)}`;
    const resolvedParentId = (kind === "bed" || kind === "hydrant") && parentId ? parentId : undefined;
    const id = addNode(kind, displayName, completedGeometry, undefined, resolvedParentId);

    if (kind === "garden" && stats.areaSqFt) {
      updateNodeData(id, {
        sqft: Math.round(stats.areaSqFt),
        sunExposure: stats.estimatedSun,
      } as Partial<GardenData>);
    }
    if (kind === "greenhouse" && stats.areaSqFt) {
      updateNodeData(id, { sqft: Math.round(stats.areaSqFt) } as Partial<GreenhouseData>);
    }
    if (kind === "field" && stats.acres) {
      updateNodeData(id, { acreage: Math.round(stats.acres * 100) / 100 } as Partial<FieldData>);
    }
    if (kind === "pasture" && stats.acres) {
      updateNodeData(id, { acreage: Math.round(stats.acres * 100) / 100 } as any);
    }
    if (kind === "orchard" && stats.acres) {
      updateNodeData(id, { acreage: Math.round(stats.acres * 100) / 100 } as any);
    }
    if (kind === "pond" && stats.acres) {
      updateNodeData(id, { acreage: Math.round(stats.acres * 100) / 100 } as Partial<PondData>);
    }
    if (kind === "vineyard" && stats.acres) {
      updateNodeData(id, { acreage: Math.round(stats.acres * 100) / 100 } as any);
    }
    if (kind === "woodlot" && stats.acres) {
      updateNodeData(id, { acreage: Math.round(stats.acres * 100) / 100 } as any);
    }
    if (kind === "corral" && stats.areaSqFt) {
      updateNodeData(id, { sqft: Math.round(stats.areaSqFt) } as any);
    }
    if (kind === "building" && stats.areaSqFt) {
      updateNodeData(id, { sqft: Math.round(stats.areaSqFt) } as any);
    }
    if (kind === "bed" && stats.areaSqFt) {
      updateNodeData(id, { sqft: Math.round(stats.areaSqFt), sunExposure: stats.estimatedSun } as any);
    }
    if (kind === "irrigation" && stats.lengthFt) {
      updateNodeData(id, { lengthFt: Math.round(stats.lengthFt) } as Partial<IrrigationData>);
    }
    if (kind === "fence" && stats.lengthFt) {
      updateNodeData(id, { lengthFt: Math.round(stats.lengthFt) } as Partial<FenceData>);
    }
    if (kind === "road" && stats.lengthFt) {
      updateNodeData(id, { lengthFt: Math.round(stats.lengthFt) } as Partial<RoadData>);
    }
    if (kind === "pipeline" && stats.lengthFt) {
      updateNodeData(id, { lengthFt: Math.round(stats.lengthFt) } as Partial<PipelineData>);
    }
    if (kind === "ditch" && stats.lengthFt) {
      updateNodeData(id, { lengthFt: Math.round(stats.lengthFt) } as Partial<DitchData>);
    }
    if (kind === "powerline" && stats.lengthFt) {
      updateNodeData(id, { lengthFt: Math.round(stats.lengthFt) } as Partial<PowerlineData>);
    }

    setCompletedGeometry(null);
    setPendingParentId(null);
    setKind("");
    setName("");
    setParentId("");
    router.push(`/node?id=${id}`);
  };

  const handleCancel = () => {
    setCompletedGeometry(null);
    setPendingParentId(null);
    setKind("");
    setName("");
    setParentId("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 shadow-xl mx-4">
        <h2 className="text-lg font-semibold text-text-primary mb-1">
          What did you draw?
        </h2>
        <p className="text-sm text-text-muted mb-4">
          {geometryType === "Polygon" && "Select what kind of area this is."}
          {geometryType === "Point" && "Select what this point represents."}
          {geometryType === "LineString" && "Select what this line represents."}
        </p>

        {(stats.areaSqFt || stats.lengthFt) && (
          <div className="rounded-lg bg-bg-surface border border-border p-3 mb-4 space-y-1.5">
            <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Measured from drawing</div>
            {stats.areaSqFt != null && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-accent">{formatArea(stats.areaSqFt)}</span>
                {stats.acres != null && stats.acres >= 0.1 && (
                  <span className="text-xs text-text-secondary">({stats.acres.toFixed(2)} acres)</span>
                )}
              </div>
            )}
            {stats.sides && stats.sides.length > 0 && (
              <div className="text-xs text-text-secondary">
                Sides: {stats.sides.map((s) => formatFt(s)).join(" x ")}
              </div>
            )}
            {stats.lengthFt != null && (
              <div className="text-sm font-semibold text-accent">{formatFt(stats.lengthFt)} long</div>
            )}
            {stats.estimatedSun && (
              <div className="text-xs text-text-secondary">
                Sun: <span className="text-text-primary capitalize">{stats.estimatedSun}</span>
                {profile.sunshineHoursPerYear != null && (
                  <span className="ml-1">({profile.sunshineHoursPerYear} hrs/yr via {profile.sunDataSource ?? "estimate"})</span>
                )}
                {profile.sunshineHoursPerYear == null && " (latitude estimate)"}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-5">
          {availableKinds.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                kind === k
                  ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                  : "bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-surface/80"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: NODE_KIND_COLORS[k] }}
              />
              {NODE_KIND_LABELS[k]}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind ? `${NODE_KIND_LABELS[kind]} 1` : "Name this..."}
            className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent/50 focus:outline-none transition-colors"
            autoFocus
          />
        </div>

        {kind === "bed" && gardens.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Parent Garden
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-accent/50 focus:outline-none transition-colors"
            >
              <option value="">None (standalone bed)</option>
              {gardens.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-1">Link this bed to a garden to see it on that garden's detail page.</p>
          </div>
        )}

        {kind === "hydrant" && waterlines.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Parent Water Line
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2.5 text-sm text-text-primary focus:border-accent/50 focus:outline-none transition-colors"
            >
              <option value="">None (standalone hydrant)</option>
              {waterlines.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-1">Link this hydrant to a water line so it appears as a sub-node.</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!kind}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-black hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
