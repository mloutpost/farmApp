"use client";

import { useRouter, useParams } from "next/navigation";
import { useFarmStore } from "@/store/farm-store";
import { NODE_KIND_LABELS, NODE_KIND_COLORS, AREA_KINDS } from "@/types";
import type { NodeKind } from "@/types";
import ActivityLog from "@/components/detail/ActivityLog";
import HarvestLog from "@/components/detail/HarvestLog";
import PhotoGallery from "@/components/detail/PhotoGallery";
import ConnectionsEditor from "@/components/detail/ConnectionsEditor";
import GardenDetail from "@/components/detail/GardenDetail";
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
import { useState } from "react";

const DETAIL_COMPONENTS: Record<NodeKind, React.ComponentType<{ node: any }>> = {
  garden: GardenDetail,
  field: FieldDetail,
  pasture: PastureDetail,
  orchard: OrchardDetail,
  pond: PondDetail,
  greenhouse: GreenhouseDetail,
  well: WellDetail,
  pump: PumpDetail,
  barn: BarnDetail,
  compost: CompostDetail,
  spring: SpringDetail,
  shop: ShopDetail,
  silo: SiloDetail,
  beehive: BeehiveDetail,
  gate: GateDetail,
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
    node.activityLog.forEach((a: any) => rows.push(["activity", a.date, a.action, a.notes ?? ""]));
    node.harvestLog.forEach((h: any) => rows.push(["harvest", h.date, `${h.crop} ${h.amount} ${h.unit}`, h.notes ?? ""]));
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

export default function NodeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const nodeId = params.id as string;
  const node = useFarmStore((s) => s.nodes.find((n) => n.id === nodeId));
  const updateNode = useFarmStore((s) => s.updateNode);
  const removeNode = useFarmStore((s) => s.removeNode);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
  const HARVESTABLE: string[] = ["garden", "field", "pasture", "orchard", "pond", "greenhouse", "beehive"];
  const showHarvest = HARVESTABLE.includes(node.kind);

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
          <span
            className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ backgroundColor: `${NODE_KIND_COLORS[node.kind]}20`, color: NODE_KIND_COLORS[node.kind] }}
          >
            {NODE_KIND_LABELS[node.kind]}
          </span>
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
