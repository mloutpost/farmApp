"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  getBezierPath,
  type Node,
  type Edge,
  type EdgeProps,
  type Connection,
  type NodeMouseHandler,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionLineType,
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

const HANDLE_CLASS = "!w-2.5 !h-2.5 !border-2 !opacity-0 group-hover:!opacity-100 hover:!opacity-100 !bg-accent/60 !border-accent/40 hover:!bg-accent hover:!border-accent transition-all duration-150";

function FarmFlowNode({ data }: { data: { label: string; kind: string; color: string } }) {
  return (
    <div
      className="group relative flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-4 py-3 shadow-md cursor-grab active:cursor-grabbing hover:border-accent/50 transition-colors"
      style={{ borderLeftColor: data.color, borderLeftWidth: 3 }}
    >
      <Handle type="target" position={Position.Left} className={`${HANDLE_CLASS} !-left-[5px]`} />
      <Handle type="source" position={Position.Right} className={`${HANDLE_CLASS} !-right-[5px]`} />
      <Handle type="target" position={Position.Top} id="top" className={`${HANDLE_CLASS} !-top-[5px]`} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={`${HANDLE_CLASS} !-bottom-[5px]`} />
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

function FarmGroupNode({ data }: { data: { label: string; kind: string; color: string; childCount: number } }) {
  return (
    <div className="group w-full h-full relative">
      <Handle type="target" position={Position.Left} className={`${HANDLE_CLASS} !-left-[5px]`} />
      <Handle type="source" position={Position.Right} className={`${HANDLE_CLASS} !-right-[5px]`} />
      <Handle type="target" position={Position.Top} id="top" className={`${HANDLE_CLASS} !-top-[5px]`} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={`${HANDLE_CLASS} !-bottom-[5px]`} />
      <div
        className="w-full h-full rounded-xl border-2 border-dashed"
        style={{ borderColor: data.color + "60", backgroundColor: data.color + "08" }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-t-[10px]"
          style={{ backgroundColor: data.color + "18" }}
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
          <span className="text-xs font-semibold text-text-primary truncate">{data.label}</span>
          <span className="text-[10px] text-text-muted ml-auto whitespace-nowrap">{data.childCount} node{data.childCount !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}

interface EdgeConnection {
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
}

function FarmEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const connections: EdgeConnection[] = (data as { connections?: EdgeConnection[] })?.connections ?? [];
  const count = connections.length;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const strokeColor = hovered ? "var(--accent)" : "var(--border-color)";
  const sw = style?.strokeWidth ?? (count > 1 ? Math.min(2 + count * 0.5, 5) : 1.5);

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Invisible wide path for easier hover/click targeting */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} />
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={sw as number}
        markerEnd={markerEnd as string}
        style={{ transition: "stroke 0.15s, stroke-width 0.15s" }}
      />
      {count > 1 && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x={-10}
            y={-9}
            width={20}
            height={18}
            rx={4}
            fill="var(--bg-elevated)"
            stroke={hovered ? "var(--accent)" : "var(--border-color)"}
            strokeWidth={1}
            style={{ transition: "stroke 0.15s" }}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fontWeight={600}
            fill={hovered ? "var(--accent)" : "var(--text-muted)"}
            style={{ transition: "fill 0.15s" }}
          >
            {count}
          </text>
        </g>
      )}
      {hovered && connections.length > 0 && (
        <foreignObject
          x={labelX - 120}
          y={labelY + (count > 1 ? 14 : 4)}
          width={240}
          height={Math.min(connections.length * 28 + 12, 180)}
          style={{ overflow: "visible" }}
        >
          <div className="rounded-lg border border-border bg-bg-elevated shadow-xl p-2 text-[11px] max-h-[168px] overflow-y-auto">
            {connections.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 py-1 px-1 rounded hover:bg-bg-surface/60">
                <span className="text-text-primary font-medium truncate max-w-[90px]">{c.sourceName}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span className="text-text-primary font-medium truncate max-w-[90px]">{c.targetName}</span>
              </div>
            ))}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

interface EdgePanelProps {
  edge: Edge | null;
  onClose: () => void;
  onDeleteConnection: (sourceId: string, targetId: string) => void;
}

function EdgeDetailPanel({ edge, onClose, onDeleteConnection }: EdgePanelProps) {
  if (!edge) return null;
  const connections: EdgeConnection[] = (edge.data as { connections?: EdgeConnection[] })?.connections ?? [];
  if (connections.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-20 w-72 rounded-xl border border-border bg-bg-elevated/95 backdrop-blur shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            {connections.length} Connection{connections.length !== 1 ? "s" : ""}
          </h3>
          <p className="text-[10px] text-text-muted mt-0.5">Click the X to remove a connection</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto p-2 space-y-1">
        {connections.map((c, i) => (
          <div
            key={`${c.sourceId}-${c.targetId}-${i}`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 bg-bg-surface/50 hover:bg-bg-surface transition-colors"
          >
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <span className="text-xs font-medium text-text-primary truncate">{c.sourceName}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <span className="text-xs font-medium text-text-primary truncate">{c.targetName}</span>
            </div>
            <button
              onClick={() => onDeleteConnection(c.sourceId, c.targetId)}
              className="shrink-0 rounded p-1 text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Remove this connection"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function InternalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const connections: EdgeConnection[] = (data as { connections?: EdgeConnection[] })?.connections ?? [];

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={14} />
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={hovered ? "var(--accent)" : "var(--border-color)"}
        strokeWidth={1}
        strokeDasharray="4 3"
        strokeOpacity={hovered ? 0.9 : 0.4}
        style={{ transition: "stroke 0.15s, stroke-opacity 0.15s" }}
      />
      {hovered && connections.length > 0 && (
        <foreignObject
          x={labelX - 110}
          y={labelY + 6}
          width={220}
          height={connections.length * 28 + 12}
          style={{ overflow: "visible" }}
        >
          <div className="rounded-lg border border-border bg-bg-elevated shadow-xl p-2 text-[11px]">
            {connections.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 py-1 px-1">
                <span className="text-text-primary font-medium truncate max-w-[80px]">{c.sourceName}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted shrink-0">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span className="text-text-primary font-medium truncate max-w-[80px]">{c.targetName}</span>
              </div>
            ))}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

const nodeTypes = { farmNode: FarmFlowNode, farmGroup: FarmGroupNode };

const edgeTypes = { farmEdge: FarmEdge, internalEdge: InternalEdge };

const KIND_GROUPS: { label: string; kinds: readonly NodeKind[] }[] = [
  { label: "Areas", kinds: AREA_KINDS },
  { label: "Points", kinds: POINT_KINDS },
  { label: "Lines", kinds: LINE_KINDS },
];

async function autoGroupLayout(
  flowNodes: Node[],
  flowEdges: Edge[],
): Promise<Record<string, { x: number; y: number }>> {
  const topLevel = flowNodes.filter((n) => !n.parentId);
  const children = flowNodes.filter((n) => !!n.parentId);

  const CHILD_W = 180;
  const CHILD_H = 56;
  const PAD_X = 16;
  const PAD_TOP = 44;
  const GAP = 10;

  const childPositions: Record<string, { x: number; y: number }> = {};
  const parentChildMap = new Map<string, Node[]>();
  for (const c of children) {
    const list = parentChildMap.get(c.parentId!) ?? [];
    list.push(c);
    parentChildMap.set(c.parentId!, list);
  }
  for (const [, kids] of parentChildMap) {
    const cols = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(kids.length))));
    kids.forEach((c, ci) => {
      childPositions[c.id] = {
        x: PAD_X + (ci % cols) * (CHILD_W + GAP),
        y: PAD_TOP + Math.floor(ci / cols) * (CHILD_H + GAP),
      };
    });
  }

  const topNodeSet = new Set(topLevel.map((n) => n.id));
  const childToParent = new Map<string, string>();
  for (const c of children) {
    if (c.parentId) childToParent.set(c.id, c.parentId);
  }

  const topEdges: Edge[] = [];
  const topEdgeSet = new Set<string>();
  for (const e of flowEdges) {
    const src = topNodeSet.has(e.source) ? e.source : childToParent.get(e.source);
    const tgt = topNodeSet.has(e.target) ? e.target : childToParent.get(e.target);
    if (src && tgt && src !== tgt) {
      const key = `${src}--${tgt}`;
      if (!topEdgeSet.has(key)) {
        topEdgeSet.add(key);
        topEdges.push({ ...e, id: `top-${src}-${tgt}`, source: src, target: tgt });
      }
    }
  }

  try {
    const dagre = await import("dagre");
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 140, marginx: 40, marginy: 40 });

    for (const n of topLevel) {
      const w = n.style?.width ? Number(n.style.width) : 200;
      const h = n.style?.height ? Number(n.style.height) : 70;
      g.setNode(n.id, { width: w, height: h });
    }
    for (const e of topEdges) {
      g.setEdge(e.source, e.target);
    }

    dagre.layout(g);

    const positions: Record<string, { x: number; y: number }> = {};
    for (const n of topLevel) {
      const laid = g.node(n.id);
      const w = n.style?.width ? Number(n.style.width) : 200;
      const h = n.style?.height ? Number(n.style.height) : 70;
      if (laid) positions[n.id] = { x: laid.x - w / 2, y: laid.y - h / 2 };
    }
    return { ...positions, ...childPositions };
  } catch {
    const positions: Record<string, { x: number; y: number }> = {};
    const nodeWidth = 220;
    const nodeHeight = 80;
    const groupGap = 60;
    const itemGap = 20;
    let groupX = 40;

    for (const group of KIND_GROUPS) {
      const groupNodes = topLevel.filter((n) => group.kinds.includes(n.data.kind as NodeKind));
      if (groupNodes.length === 0) continue;
      const cols = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(groupNodes.length))));
      groupNodes.forEach((n, i) => {
        const w = n.style?.width ? Number(n.style.width) : nodeWidth;
        const h = n.style?.height ? Number(n.style.height) : nodeHeight;
        positions[n.id] = {
          x: groupX + (i % cols) * (Math.max(w, nodeWidth) + itemGap),
          y: 40 + Math.floor(i / cols) * (Math.max(h, nodeHeight) + itemGap),
        };
      });
      groupX += Math.min(cols, groupNodes.length) * (nodeWidth + itemGap) + groupGap;
    }
    return { ...positions, ...childPositions };
  }
}

export default function FlowPage() {
  const router = useRouter();
  const getFlowState = useFarmStore((s) => s.getFlowState);
  const farmNodes = useFarmStore((s) => s.nodes);
  const addConnection = useFarmStore((s) => s.addConnection);
  const removeConnection = useFarmStore((s) => s.removeConnection);
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

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;
      addConnection(connection.source, connection.target);
    },
    [addConnection],
  );

  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const connections: EdgeConnection[] = (edge.data as { connections?: EdgeConnection[] })?.connections ?? [];
      if (connections.length <= 1) {
        setSelectedEdge((prev) => (prev?.id === edge.id ? null : edge));
      } else {
        setSelectedEdge(edge);
      }
    },
    [],
  );

  const onEdgeDoubleClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const connections: EdgeConnection[] = (edge.data as { connections?: EdgeConnection[] })?.connections ?? [];
      if (connections.length === 1) {
        removeConnection(connections[0].sourceId, connections[0].targetId);
        setSelectedEdge(null);
      } else if (connections.length > 1) {
        setSelectedEdge(edge);
      }
    },
    [removeConnection],
  );

  const handleDeleteConnection = useCallback(
    (sourceId: string, targetId: string) => {
      removeConnection(sourceId, targetId);
      setSelectedEdge((prev) => {
        if (!prev) return null;
        const conns: EdgeConnection[] = (prev.data as { connections?: EdgeConnection[] })?.connections ?? [];
        const remaining = conns.filter((c) => !(c.sourceId === sourceId && c.targetId === targetId));
        if (remaining.length === 0) return null;
        return { ...prev, data: { ...prev.data as Record<string, unknown>, connections: remaining, count: remaining.length } };
      });
    },
    [removeConnection],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => router.push(`/node?id=${node.id}`),
    [router],
  );

  const onPaneClick = useCallback(() => setSelectedEdge(null), []);

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
          <div className="flex items-center gap-1 ml-1 pl-1 border-l border-border">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
              <path d="M5 12h14" />
            </svg>
            <span className="text-[10px] text-text-muted">
              {edges.length} connection{edges.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1 ml-1 pl-1 border-l border-border">
            <span className="text-[10px] text-text-muted">Hover edge for details · Click edge to manage</span>
          </div>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodesDraggable
        nodesConnectable
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineStyle={{ stroke: "var(--accent)", strokeWidth: 2, strokeDasharray: "5 5" }}
        defaultEdgeOptions={{
          type: "farmEdge",
          animated: false,
          style: { stroke: "var(--border-color)", strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "var(--border-color)" },
        }}
        fitView={!hasSavedPositions}
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border-color)" gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>

      <EdgeDetailPanel
        edge={selectedEdge}
        onClose={() => setSelectedEdge(null)}
        onDeleteConnection={handleDeleteConnection}
      />
    </div>
  );
}
