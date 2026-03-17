"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMapStore } from "@/store/map-store";
import { useFarmStore } from "@/store/farm-store";
import { useFencePlannerStore } from "@/store/fence-planner-store";
import FenceConfigForm from "./FenceConfigForm";
import BOMTable from "./BOMTable";
import { formatFt } from "@/lib/geo-calc";

export default function FencePlannerPanel() {
  const {
    completedGeometry,
    setCompletedGeometry,
    setCompletedGeometryFor,
    drawMode,
    setDrawMode,
    completedGeometryFor,
  } = useMapStore();
  const {
    isOpen,
    open,
    close,
    geometry,
    setGeometry,
    bomResult,
    config,
    clear,
  } = useFencePlannerStore();
  const addNode = useFarmStore((s) => s.addNode);
  const updateNodeData = useFarmStore((s) => s.updateNodeData);
  const router = useRouter();

  useEffect(() => {
    if (
      completedGeometry &&
      completedGeometryFor === "fence-planner" &&
      ("type" in completedGeometry && (completedGeometry.type === "Polygon" || completedGeometry.type === "LineString"))
    ) {
      setGeometry(completedGeometry);
      setCompletedGeometry(null);
      setCompletedGeometryFor(null);
      setDrawMode("none");
      open();
    }
  }, [completedGeometry, completedGeometryFor, setGeometry, setCompletedGeometry, setCompletedGeometryFor, setDrawMode, open]);

  const handleDrawFence = () => {
    setCompletedGeometryFor("fence-planner");
    setDrawMode("polygon");
  };

  const handleClose = () => {
    setCompletedGeometryFor(null);
    close();
    clear();
  };

  const handleNewFence = () => {
    clear();
    setCompletedGeometryFor("fence-planner");
    setDrawMode("polygon");
  };

  const handleSaveAsFence = () => {
    if (!geometry || !bomResult) return;
    const name = `Fence ${bomResult.lengthFt.toFixed(0)} ft`;
    const id = addNode("fence", name, geometry);
    const fenceType = config.fenceType === "woven-wire-high-tensile" ? "woven-wire" : config.fenceType;
    updateNodeData(id, {
      fenceType: fenceType ?? "electric",
      lengthFt: Math.round(bomResult.lengthFt),
      postSpacing: `${config.postSpacingFt ?? 12} ft`,
    } as any);
    handleClose();
    router.push(`/node?id=${id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-bg-elevated border-l border-border shadow-xl flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold text-text-primary">Fence Planner</h2>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-md p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!geometry ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Draw a polygon on the map to define the fenced area. Click corners, then double-click to finish.
            </p>
            <button
              type="button"
              onClick={handleDrawFence}
              disabled={drawMode !== "none"}
              className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-black hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {drawMode === "polygon" ? "Drawing... (double-click to finish)" : "Draw Fence on Map"}
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-lg bg-bg-surface border border-border p-3">
              <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Fence length</div>
              <div className="text-lg font-semibold text-accent">{bomResult ? formatFt(bomResult.lengthFt) : "—"}</div>
            </div>

            <FenceConfigForm />
            {bomResult && <BOMTable bom={bomResult} />}

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={handleNewFence}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-surface transition-colors"
              >
                New Fence
              </button>
              <button
                type="button"
                onClick={handleSaveAsFence}
                className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black hover:bg-accent-hover transition-colors"
              >
                Save as Fence
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
