import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 56;

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "LR" | "TB" = "LR"
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 60 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });
}
