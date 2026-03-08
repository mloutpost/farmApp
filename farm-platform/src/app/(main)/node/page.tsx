"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFarmStore } from "@/store/farm-store";
import { NODE_KIND_LABELS, NODE_KIND_COLORS, AREA_KINDS, POINT_KINDS, LINE_KINDS } from "@/types";
import type { NodeKind } from "@/types";
import ActivityLog from "@/components/detail/ActivityLog";
import HarvestLog from "@/components/detail/HarvestLog";
import PhotoGallery from "@/components/detail/PhotoGallery";
import ConnectionsEditor from "@/components/detail/ConnectionsEditor";
import GardenDetail from "@/components/detail/GardenDetail";
import BedDetail from "@/components/detail/BedDetail";
import FieldDetail from "@/components/detail/FieldDetail";
import PastureDetail from "@/components/detail/PastureDetail";
import OrchardDetail from "@/components/detail/OrchardDetail";
import PondDetail from "@/components/detail/PondDetail";
import GreenhouseDetail from "@/components/detail/GreenhouseDetail";
import WellDetail from "@/components/detail/WellDetail";
import PumpDetail from "@/components/detail/PumpDetail";
import BarnDetail from "@/components/detail/BarnDetail";
import CompostDetail from "@/components/detail/CompostDetail";
import SpringDetail from "@/components/detail/SpringDetail";
import ShopDetail from "@/components/detail/ShopDetail";
import SiloDetail from "@/components/detail/SiloDetail";
import BeehiveDetail from "@/components/detail/BeehiveDetail";
import GateDetail from "@/components/detail/GateDetail";
import IrrigationDetail from "@/components/detail/IrrigationDetail";
import FenceDetail from "@/components/detail/FenceDetail";
import StreamDetail from "@/components/detail/StreamDetail";
import RoadDetail from "@/components/detail/RoadDetail";
import PipelineDetail from "@/components/detail/PipelineDetail";
import DitchDetail from "@/components/detail/DitchDetail";
import PowerlineDetail from "@/components/detail/PowerlineDetail";
import VineyardDetail from "@/components/detail/VineyardDetail";
import WoodlotDetail from "@/components/detail/WoodlotDetail";
import CorralDetail from "@/components/detail/CorralDetail";
import CoopDetail from "@/components/detail/CoopDetail";
import CellarDetail from "@/components/detail/CellarDetail";
import SmokehouseDetail from "@/components/detail/SmokehouseDetail";
import RainwaterDetail from "@/components/detail/RainwaterDetail";
import BuildingDetail from "@/components/detail/BuildingDetail";
import { useState } from "react";

const DETAIL_COMPONENTS: Record<NodeKind, React.ComponentType<{ node: any }>> = {
  garden: GardenDetail,
  bed: BedDetail,
  field: FieldDetail,
  pasture: PastureDetail,
  orchard: OrchardDetail,
  pond: PondDetail,
  greenhouse: GreenhouseDetail,
  vineyard: VineyardDetail,
  woodlot: WoodlotDetail,
  corral: CorralDetail,
  building: BuildingDetail,
  well: WellDetail,
  pump: PumpDetail,
  barn: BarnDetail,
  compost: CompostDetail,
  spring: SpringDetail,
  shop: ShopDetail,
  silo: SiloDetail,
  beehive: BeehiveDetail,
  gate: GateDetail,
  coop: CoopDetail,
  cellar: CellarDetail,
  smokehouse: SmokehouseDetail,
  rainwater: RainwaterDetail,
  irrigation: IrrigationDetail,
  fence: FenceDetail,
  stream: StreamDetail,
  road: RoadDetail,
  pipeline: PipelineDetail,
  ditch: DitchDetail,
  powerline: PowerlineDetail,
};

function ExportCSV({ node }: { node: any }) {
  const handleExport = () => {
    const rows: string[][] = [];
    rows.push(["Type", "Date", "Detail", "Notes"]);
    (node.activityLog ?? []).forEach((a: any) => rows.push(["activity", a.date, a.action, a.notes ?? ""]));
    (node.harvestLog ?? []).forEach((h: any) => rows.push(["harvest", h.date, `${h.crop} ${h.amount} ${h.unit}`, h.notes ?? ""]));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${node.name.replace(/\s+/g, "_")}_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="text-xs text-text-muted hover:text-text-secondary transition-colors"
    >
      Export CSV
    </button>
  );
}

function NodeDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const nodeId = searchParams.get("id") ?? "";
  const node = useFarmStore((s) => s.nodes.find((n) => n.id === nodeId));
  const updateNode = useFarmStore((s) => s.updateNode);
  const changeNodeKind = useFarmStore((s) => s.changeNodeKind);
  const removeNode = useFarmStore((s) => s.removeNode);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showKindPicker, setShowKindPicker] = useState(false);

  if (!nodeId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Select a node</h2>
          <button onClick={() => router.push("/")} className="text-sm text-accent hover:text-accent-hover">
            Back to map
          </button>
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Node not found</h2>
          <button onClick={() => router.push("/")} className="text-sm text-accent hover:text-accent-hover">
            Back to map
          </button>
        </div>
      </div>
    );
  }

  const DetailComponent = DETAIL_COMPONENTS[node.kind];
  const HARVESTABLE: string[] = ["garden", "bed", "field", "pasture", "orchard", "pond", "greenhouse", "vineyard", "woodlot", "beehive", "coop"];
  const showHarvest = HARVESTABLE.includes(node.kind);

  const geoType = node.geometry && "type" in node.geometry ? (node.geometry as { type: string }).type : null;
  const compatibleKinds: NodeKind[] =
    geoType === "Polygon" ? [...AREA_KINDS] :
    geoType === "Point" ? [...POINT_KINDS] :
    geoType === "LineString" ? [...LINE_KINDS] :
    [...AREA_KINDS, ...POINT_KINDS, ...LINE_KINDS];

  const handleDelete = () => {
    removeNode(node.id);
    router.push("/");
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/")}
            className="rounded-md p-2 text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors"
            aria-label="Back to map"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <input
              value={node.name}
              onChange={(e) => updateNode(node.id, { name: e.target.value })}
              className="text-xl font-bold bg-transparent text-text-primary outline-none w-full"
            />
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowKindPicker(!showKindPicker)}
              className="text-xs font-medium px-2.5 py-1 rounded-full transition-colors hover:ring-1 hover:ring-current cursor-pointer"
              style={{ backgroundColor: `${NODE_KIND_COLORS[node.kind]}20`, color: NODE_KIND_COLORS[node.kind] }}
            >
              {NODE_KIND_LABELS[node.kind]}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="inline-block ml-1 -mt-0.5">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {showKindPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowKindPicker(false)} aria-hidden />
                <div className="absolute right-0 top-full mt-1 z-50 w-56 max-h-72 overflow-y-auto rounded-lg border border-border bg-bg-elevated shadow-xl">
                  {compatibleKinds.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        if (k !== node.kind) changeNodeKind(node.id, k);
                        setShowKindPicker(false);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                        k === node.kind
                          ? "bg-bg-surface font-medium text-text-primary"
                          : "text-text-secondary hover:bg-bg-surface hover:text-text-primary"
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: NODE_KIND_COLORS[k] }} />
                      {NODE_KIND_LABELS[k]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="text-xs text-text-muted mb-8">
          Last updated: {new Date(node.updatedAt).toLocaleDateString()}
        </div>

        <div className="space-y-8">
          <div className="rounded-xl border border-border bg-bg-elevated p-5">
            <DetailComponent node={node} />
          </div>

          {showHarvest && (
            <div className="rounded-xl border border-border bg-bg-elevated p-5">
              <HarvestLog node={node} />
            </div>
          )}

          <div className="rounded-xl border border-border bg-bg-elevated p-5">
            <PhotoGallery node={node} />
          </div>

          <div className="rounded-xl border border-border bg-bg-elevated p-5">
            <ConnectionsEditor node={node} />
          </div>

          <div className="rounded-xl border border-border bg-bg-elevated p-5">
            <ActivityLog node={node} />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <ExportCSV node={node} />
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-danger hover:text-danger/80 transition-colors"
              >
                Delete this node
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-danger">Are you sure?</span>
                <button onClick={handleDelete} className="text-xs font-medium text-danger hover:text-danger/80">
                  Yes, delete
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-text-muted hover:text-text-secondary">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NodeDetailPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-text-muted">Loading...</div>}>
      <NodeDetailContent />
    </Suspense>
  );
}
