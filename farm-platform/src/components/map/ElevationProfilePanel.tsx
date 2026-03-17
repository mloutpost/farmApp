"use client";

import { useEffect, useMemo } from "react";
import { useMapStore } from "@/store/map-store";
import { useDemStore } from "@/store/dem-store";
import { getElevationAt } from "@/lib/dem-elevation";
import { distanceFt } from "@/lib/geo-calc";

const CHART_WIDTH = 280;
const CHART_HEIGHT = 120;
const PAD = { top: 8, right: 8, bottom: 24, left: 36 };

export function ElevationProfileButton() {
  const { setCompletedGeometryFor, setDrawMode } = useMapStore();
  const raster = useDemStore((s) => s.raster);

  if (!raster) return null;

  const handleStartProfile = () => {
    setCompletedGeometryFor("elevation-profile");
    setDrawMode("line");
  };

  return (
    <button
      type="button"
      onClick={handleStartProfile}
      className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-text-secondary hover:bg-bg-surface hover:text-text-primary transition-colors flex items-center gap-2 mt-1"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 4 4-4" />
      </svg>
      Elevation Profile
    </button>
  );
}

export default function ElevationProfilePanel() {
  const {
    completedGeometry,
    completedGeometryFor,
    setCompletedGeometry,
    setCompletedGeometryFor,
    setDrawMode,
  } = useMapStore();
  const { raster, elevationProfileLine, setElevationProfileLine } = useDemStore();

  useEffect(() => {
    if (
      raster &&
      completedGeometry &&
      completedGeometryFor === "elevation-profile" &&
      "type" in completedGeometry &&
      completedGeometry.type === "LineString"
    ) {
      const coords = (completedGeometry as { coordinates: number[][] }).coordinates;
      if (coords && coords.length >= 2) {
        setElevationProfileLine(coords);
      }
      setCompletedGeometry(null);
      setCompletedGeometryFor(null);
      setDrawMode("none");
    }
  }, [raster, completedGeometry, completedGeometryFor, setElevationProfileLine, setCompletedGeometry, setCompletedGeometryFor, setDrawMode]);

  const profileData = useMemo(() => {
    if (!raster || !elevationProfileLine || elevationProfileLine.length < 2) return null;
    const points: { distFt: number; elev: number }[] = [];
    let cumDist = 0;
    for (let i = 0; i < elevationProfileLine.length; i++) {
      const elev = getElevationAt(raster, elevationProfileLine[i][0], elevationProfileLine[i][1]);
      points.push({ distFt: cumDist, elev: elev ?? 0 });
      if (i < elevationProfileLine.length - 1) {
        cumDist += distanceFt(elevationProfileLine[i], elevationProfileLine[i + 1]);
      }
    }
    return points;
  }, [raster, elevationProfileLine]);

  const handleStartProfile = () => {
    setCompletedGeometryFor("elevation-profile");
    setDrawMode("line");
  };

  const handleClose = () => {
    setElevationProfileLine(null);
  };

  if (!raster) return null;

  const showPanel = elevationProfileLine && elevationProfileLine.length >= 2;

  if (!showPanel || !profileData) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 w-[304px] rounded-xl border border-border bg-bg-elevated shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-surface/50">
            <h3 className="text-sm font-semibold text-text-primary">Elevation Profile</h3>
            <button
              type="button"
              onClick={handleClose}
              className="rounded p-1 text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-3">
            <ElevationChart data={profileData} width={CHART_WIDTH} height={CHART_HEIGHT} />
            <p className="text-[10px] text-text-muted mt-2">
              Total: {profileData[profileData.length - 1]?.distFt.toFixed(0) ?? 0} ft
              {" · "}
              Range: {Math.min(...profileData.map((p) => p.elev)).toFixed(0)}–{Math.max(...profileData.map((p) => p.elev)).toFixed(0)} m
            </p>
            <button
              type="button"
              onClick={handleStartProfile}
              className="mt-2 text-xs text-accent hover:text-accent-hover"
            >
              Draw new profile
            </button>
          </div>
        </div>
  );
}

function ElevationChart({
  data,
  width,
  height,
}: {
  data: { distFt: number; elev: number }[];
  width: number;
  height: number;
}) {
  const minE = Math.min(...data.map((d) => d.elev));
  const maxE = Math.max(...data.map((d) => d.elev));
  const rangeE = maxE - minE || 1;
  const maxDist = data[data.length - 1]?.distFt ?? 1;

  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  const pathD = data
    .map((d, i) => {
      const x = PAD.left + (d.distFt / maxDist) * innerW;
      const y = PAD.top + innerH - ((d.elev - minE) / rangeE) * innerH;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-accent"
      />
      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={height - PAD.bottom}
        stroke="currentColor"
        strokeWidth="0.5"
        className="text-border"
      />
      <line
        x1={PAD.left}
        y1={height - PAD.bottom}
        x2={width - PAD.right}
        y2={height - PAD.bottom}
        stroke="currentColor"
        strokeWidth="0.5"
        className="text-border"
      />
      <text x={PAD.left - 4} y={PAD.top + 4} className="fill-text-muted text-[9px]" textAnchor="end">
        {maxE.toFixed(0)}m
      </text>
      <text x={PAD.left - 4} y={height - PAD.bottom + 4} className="fill-text-muted text-[9px]" textAnchor="end">
        {minE.toFixed(0)}m
      </text>
      <text x={width - PAD.right} y={height - PAD.bottom + 14} className="fill-text-muted text-[9px]" textAnchor="end">
        {maxDist.toFixed(0)} ft
      </text>
    </svg>
  );
}
