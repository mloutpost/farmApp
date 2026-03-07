"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import FarmNode from "./FarmNode";
import ZoneNode from "./ZoneNode";
import SubNode from "./SubNode";
import FlowNode from "./FlowNode";
import NodeDetailsPanel from "./NodeDetailsPanel";
import LayerControl from "./LayerControl";
import { useNodeStore } from "@/store/node-store";
import { useMapStore } from "@/store/map-store";
import { getLayoutedElements } from "@/lib/flow-layout";
import type { FlowNodeVariant } from "@/types";

const nodeTypes = { farm: FarmNode, zone: ZoneNode, sub: SubNode, flow: FlowNode };

const PALETTE_ITEMS: { id: string; label: string; icon: string; flowVariant: FlowNodeVariant }[] = [
  { id: "well", label: "Well", icon: "💧", flowVariant: "water_source" },
  { id: "filter", label: "Filter", icon: "🔍", flowVariant: "water_distribution" },
  { id: "pump", label: "Pump", icon: "⚙", flowVariant: "water_distribution" },
  { id: "garden", label: "Garden", icon: "🌱", flowVariant: "garden" },
  { id: "bed", label: "Bed", icon: "🛏", flowVariant: "raised_bed" },
  { id: "field", label: "Field", icon: "🌾", flowVariant: "field" },
  { id: "animal_pen", label: "Animal Pen", icon: "🐄", flowVariant: "pasture" },
  { id: "equipment", label: "+ Equipment", icon: "🔧", flowVariant: "compost_facility" },
];

function NodeFlowInner() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<{ fitView: (opts?: { duration?: number }) => void } | null>(null);
  const {
    nodes: farmNodes,
    getFlowState,
    setFlowNodePosition,
    addNode,
    setSelectedNode,
    useInfrastructureFlow,
  } = useNodeStore();

  const { nodes: stateNodes, edges: stateEdges } = getFlowState();
  const layoutedNodes = useInfrastructureFlow ? stateNodes : getLayoutedElements(stateNodes, stateEdges);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(stateEdges);

  useEffect(() => {
    const { nodes: n, edges: e } = getFlowState();
    const layouted = useInfrastructureFlow ? n : getLayoutedElements(n, e);
    setNodes(layouted);
    setEdges(e);
  }, [farmNodes, getFlowState, setNodes, setEdges, useInfrastructureFlow]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      changes.forEach((c) => {
        if (c.type === "position" && "position" in c && c.position && !c.dragging) {
          setFlowNodePosition(c.id, c.position);
        }
        if (c.type === "select" && "selected" in c && c.selected) {
          setSelectedNode(c.id);
        }
      });
    },
    [onNodesChange, setFlowNodePosition, setSelectedNode]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const payload = e.dataTransfer.getData("application/reactflow");
      if (!payload) return;

      const { flowVariant, label } = JSON.parse(payload) as { flowVariant: FlowNodeVariant; label: string };
      const { flowNodePositions } = useNodeStore.getState();
      const positions = Object.values(flowNodePositions);
      const maxX = positions.length ? Math.max(...positions.map((p) => p.x)) : 100;
      const dropPos = { x: maxX + 200, y: 100 };

      const id = addNode({
        type: "zone",
        parentId: null,
        name: label,
        zoneType: "infrastructure",
        flowVariant,
      });
      setFlowNodePosition(id, dropPos);
    },
    [addNode, setFlowNodePosition]
  );

  const onLayout = useCallback(() => {
    const { nodes: n, edges: e } = getFlowState();
    const layouted = useInfrastructureFlow ? n : getLayoutedElements(n, e);
    setNodes(layouted);
    requestAnimationFrame(() => reactFlowInstance.current?.fitView?.({ duration: 300 }));
  }, [getFlowState, setNodes, useInfrastructureFlow]);

  return (
    <div ref={wrapperRef} className="h-full w-full flex">
      <aside className="w-36 shrink-0 border-r border-border bg-bg-elevated/50 p-2 flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-muted px-2 py-1">
          Add
        </span>
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(
                "application/reactflow",
                JSON.stringify({ flowVariant: item.flowVariant, label: item.label })
              );
              e.dataTransfer.effectAllowed = "move";
            }}
            className="flex items-center gap-2 rounded-lg border border-border bg-bg-surface px-2 py-2 cursor-grab active:cursor-grabbing hover:border-accent/50 transition-colors"
          >
            <span className="text-sm">{item.icon}</span>
            <span className="text-xs font-medium text-text-primary">{item.label}</span>
          </div>
        ))}
        <div className="flex-1" />
        <button
          onClick={onLayout}
          className="rounded-lg border border-border bg-bg-surface px-2 py-1.5 text-[10px] font-medium text-text-secondary hover:text-text-primary hover:border-accent/50 transition-colors"
        >
          Auto layout
        </button>
      </aside>
      <div className="flex-1 min-w-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onInit={(i) => { reactFlowInstance.current = i; }}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{ type: "smoothstep", animated: false, style: { stroke: "var(--border-color)" } }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          className="bg-bg"
        >
          <Background color="var(--border-color)" gap={20} size={1} />
          <Controls
            showInteractive={false}
            className="!bg-bg-surface !border-border !rounded-lg [&>button]:!bg-bg-surface [&>button]:!text-text-primary [&>button]:!border-border [&>button:hover]:!bg-bg-elevated"
          />
          <MiniMap
            nodeColor={(n) =>
              n.type === "flow" ? "#22c55e" : n.type === "zone" ? "#22c55e99" : "#22c55e66"
            }
            maskColor="rgba(11,15,20,0.8)"
            className="!bg-bg-surface !border-border !rounded-lg"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function NodePanel() {
  const lastImport = useMapStore((s) => s.lastImport);

  return (
    <div className="h-full w-full flex flex-col bg-bg-elevated rounded-lg border border-border overflow-hidden">
      <header className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <h2 className="text-sm font-semibold text-text-primary shrink-0">
            Infrastructure & Logic Flow
          </h2>
          {lastImport && (
            <span className="text-xs text-text-muted truncate">
              Last Import: {lastImport.filename} — {lastImport.success ? "Success" : "Failed"}
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          <NodeFlowInner />
        </div>
        <NodeDetailsPanel />
      </div>

      <footer className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-t border-border bg-bg-elevated">
        <div className="flex items-center gap-3">
          <LayerControl />
          <Link
            href="/settings"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-hover transition-colors"
          >
            Survey Import Tool
          </Link>
        </div>
        <button className="rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:border-accent/50 transition-colors">
          Save Changes
        </button>
      </footer>
    </div>
  );
}
