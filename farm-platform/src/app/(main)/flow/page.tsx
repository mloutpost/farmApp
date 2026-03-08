"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useFarmStore } from "@/store/farm-store";
import { NODE_KIND_LABELS } from "@/types";

function FarmFlowNode({ data }: { data: { label: string; kind: string; color: string } }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-4 py-3 shadow-md cursor-pointer hover:border-accent/50 transition-colors"
      style={{ borderLeftColor: data.color, borderLeftWidth: 3 }}
    >
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

export default function FlowPage() {
  const router = useRouter();
  const getFlowState = useFarmStore((s) => s.getFlowState);
  const nodes = useFarmStore((s) => s.nodes);
  const [laid, setLaid] = useState(false);

  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => getFlowState(), [nodes, getFlowState]);

  const [layoutNodes, setLayoutNodes] = useState<Node[]>(flowNodes);
  const [layoutEdges, setLayoutEdges] = useState<Edge[]>(flowEdges);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dagre = await import("dagre");
        const g = new dagre.graphlib.Graph();
        g.setDefaultEdgeLabel(() => ({}));
        g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });
        flowNodes.forEach((n) => g.setNode(n.id, { width: 200, height: 70 }));
        flowEdges.forEach((e) => g.setEdge(e.source, e.target));
        dagre.layout(g);
        if (cancelled) return;
        const positioned = flowNodes.map((n) => {
          const nodeWithPos = g.node(n.id);
          return { ...n, position: { x: nodeWithPos.x - 100, y: nodeWithPos.y - 35 } };
        });
        setLayoutNodes(positioned);
        setLayoutEdges(flowEdges);
        setLaid(true);
      } catch {
        setLayoutNodes(flowNodes);
        setLayoutEdges(flowEdges);
        setLaid(true);
      }
    })();
    return () => { cancelled = true; };
  }, [flowNodes, flowEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => router.push(`/node/${node.id}`),
    [router]
  );

  if (nodes.length === 0) {
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
    <div className="h-full w-full">
      <ReactFlow
        nodes={layoutNodes}
        edges={layoutEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border-color)" gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
