"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionLineType,
  BezierEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useFarmStore } from "@/store/farm-store";
import {
  NODE_KIND_LABELS,
  NODE_KIND_COLORS,
  AREA_KINDS,
  POINT_KINDS,
  LINE_KINDS,
  type NodeKind,
} from "@/types";

function FarmFlowNode({ data }: { data: { label: string; kind: string; color: string } }) {
  return (
    <div
      className="relative flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-4 py-3 shadow-md cursor-grab active:cursor-grabbing hover:border-accent/50 transition-colors"
      style={{ borderLeftColor: data.color, borderLeftWidth: 3 }}
    >
      <Handle type="target" position={Position.Left} className="!w-1.5 !h-1.5 !bg-border !border-0 !-left-1" />
      <Handle type="source" position={Position.Right} className="!w-1.5 !h-1.5 !bg-border !border-0 !-right-1" />
      <span
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: data.color }}
      />
      <div className="min-w-0">
        <div className="text-sm font-medium text-text-primary truncate">{data.label}</div>
        <div className="text-[10px] text-text-muted">{NODE_KIND_LABELS[data.kind as keyof typeof NODE_KIND_LABELS] ?? data.kind}</div>
      </div>
    </div>
  );
}

const nodeTypes = { farmNode: FarmFlowNode };

const edgeTypes = { default: BezierEdge };

const KIND_GROUPS: { label: string; kinds: readonly NodeKind[] }[] = [
  { label: "Areas", kinds: AREA_KINDS },
  { label: "Points", kinds: POINT_KINDS },
  { label: "Lines", kinds: LINE_KINDS },
];

async function autoGroupLayout(
  flowNodes: Node[],
  flowEdges: Edge[],
): Promise<Record<string, { x: number; y: number }>> {
  try {
    const dagre = await import("dagre");
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 120, marginx: 40, marginy: 40 });

    for (const n of flowNodes) {
      g.setNode(n.id, { width: 200, height: 70 });
    }
    for (const e of flowEdges) {
      g.setEdge(e.source, e.target);
    }

    dagre.layout(g);

    const positions: Record<string, { x: number; y: number }> = {};
    for (const n of flowNodes) {
      const laid = g.node(n.id);
      if (laid) positions[n.id] = { x: laid.x - 100, y: laid.y - 35 };
    }
    return positions;
  } catch {
    const positions: Record<string, { x: number; y: number }> = {};
    const nodeWidth = 220;
    const nodeHeight = 80;
    const groupGap = 60;
    const itemGap = 20;
    let groupX = 40;

    for (const group of KIND_GROUPS) {
      const groupNodes = flowNodes.filter((n) => group.kinds.includes(n.data.kind as NodeKind));
      if (groupNodes.length === 0) continue;
      const cols = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(groupNodes.length))));
      groupNodes.forEach((n, i) => {
        positions[n.id] = {
          x: groupX + (i % cols) * (nodeWidth + itemGap),
          y: 40 + Math.floor(i / cols) * (nodeHeight + itemGap),
        };
      });
      groupX += Math.min(cols, groupNodes.length) * (nodeWidth + itemGap) + groupGap;
    }
    return positions;
  }
}

export default function FlowPage() {
  const router = useRouter();
  const getFlowState = useFarmStore((s) => s.getFlowState);
  const farmNodes = useFarmStore((s) => s.nodes);
  const setFlowPosition = useFarmStore((s) => s.setFlowPosition);
  const setFlowPositions = useFarmStore((s) => s.setFlowPositions);
  const savedPositions = useFarmStore((s) => s.flowPositions);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => getFlowState(),
    [farmNodes, getFlowState],
  );

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const hasSavedPositions = Object.keys(savedPositions).length > 0;

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  const pendingSaves = useRef<Record<string, { x: number; y: number }>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));

      for (const change of changes) {
        if (change.type === "position" && change.position && !change.dragging) {
          pendingSaves.current[change.id] = change.position;
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            const batch = { ...pendingSaves.current };
            pendingSaves.current = {};
            saveTimer.current = null;
            for (const [id, pos] of Object.entries(batch)) {
              setFlowPosition(id, pos);
            }
          }, 100);
        }
      }
    },
    [setFlowPosition],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => router.push(`/node?id=${node.id}`),
    [router],
  );

  const handleAutoGroup = useCallback(async () => {
    const positions = await autoGroupLayout(nodes, edges);
    setFlowPositions(positions);
    setNodes((nds) =>
      nds.map((n) => (positions[n.id] ? { ...n, position: positions[n.id] } : n)),
    );
  }, [nodes, edges, setFlowPositions]);

  if (farmNodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 text-accent">
            <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="12" cy="18" r="3" />
            <path d="M9 6h6M6 9l6 6M18 9l-6 6" />
          </svg>
          <h2 className="text-lg font-semibold text-text-primary mb-2">No nodes yet</h2>
          <p className="text-sm text-text-secondary">Draw areas, points, and lines on the map to see how your farm is connected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          onClick={handleAutoGroup}
          className="flex items-center gap-1.5 rounded-lg bg-bg-elevated/95 backdrop-blur border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-surface shadow-lg transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Auto-Group
        </button>

        <div className="flex items-center gap-2 rounded-lg bg-bg-elevated/95 backdrop-blur border border-border px-3 py-2 shadow-lg">
          {KIND_GROUPS.map((g) => (
            <div key={g.label} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: NODE_KIND_COLORS[g.kinds[0]] }}
              />
              <span className="text-[10px] text-text-muted">{g.label}</span>
            </div>
          ))}
          {edges.length > 0 && (
            <div className="flex items-center gap-1 ml-1 pl-1 border-l border-border">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                <path d="M5 12h14" />
              </svg>
              <span className="text-[10px] text-text-muted">{edges.length} link{edges.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodesDraggable
        nodesConnectable={false}
        connectionLineType={ConnectionLineType.Bezier}
        defaultEdgeOptions={{
          type: "default",
          animated: false,
          style: { stroke: "var(--border-color)", strokeWidth: 1.5 },
        }}
        fitView={!hasSavedPositions}
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border-color)" gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
