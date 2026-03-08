"use client";

import { useFarmStore } from "@/store/farm-store";
import { NODE_KIND_LABELS, NODE_KIND_COLORS } from "@/types";
import type { FarmNode } from "@/types";

function ConnectionChip({
  n,
  direction,
  onRemove,
}: {
  n: FarmNode;
  direction: "out" | "in";
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-bg-surface border border-border px-2.5 py-1.5">
      <span className="text-[10px] text-text-muted">{direction === "out" ? "→" : "←"}</span>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NODE_KIND_COLORS[n.kind] }} />
      <span className="text-xs text-text-primary">{n.name}</span>
      <button
        onClick={onRemove}
        className="ml-1 text-text-muted hover:text-danger transition-colors"
        aria-label={`Remove connection`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function ConnectionsEditor({ node }: { node: FarmNode }) {
  const nodes = useFarmStore((s) => s.nodes);
  const addConnection = useFarmStore((s) => s.addConnection);
  const removeConnection = useFarmStore((s) => s.removeConnection);

  const otherNodes = nodes.filter((n) => n.id !== node.id);
  const outgoing = otherNodes.filter((n) => node.connections.includes(n.id));
  const incoming = otherNodes.filter((n) => n.connections.includes(node.id));
  const allConnectedIds = new Set([...outgoing.map((n) => n.id), ...incoming.map((n) => n.id)]);
  const available = otherNodes.filter((n) => !allConnectedIds.has(n.id));

  return (
    <section>
      <h3 className="text-sm font-semibold text-text-primary mb-3">Connections</h3>
      <p className="text-xs text-text-muted mb-3">
        Direction matters — <strong>→ feeds</strong> means this supplies the target.
        <strong> ← fed by</strong> means the source supplies this.
      </p>

      {(outgoing.length > 0 || incoming.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {outgoing.map((n) => (
            <ConnectionChip
              key={`out-${n.id}`}
              n={n}
              direction="out"
              onRemove={() => removeConnection(node.id, n.id)}
            />
          ))}
          {incoming.map((n) => (
            <ConnectionChip
              key={`in-${n.id}`}
              n={n}
              direction="in"
              onRemove={() => removeConnection(n.id, node.id)}
            />
          ))}
        </div>
      )}

      {available.length > 0 && (
        <div className="flex gap-2">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) addConnection(node.id, e.target.value);
            }}
            className="rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary flex-1"
          >
            <option value="">+ This feeds...</option>
            {available.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} ({NODE_KIND_LABELS[n.kind]})
              </option>
            ))}
          </select>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) addConnection(e.target.value, node.id);
            }}
            className="rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary flex-1"
          >
            <option value="">+ Fed by...</option>
            {available.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} ({NODE_KIND_LABELS[n.kind]})
              </option>
            ))}
          </select>
        </div>
      )}

      {otherNodes.length === 0 && (
        <p className="text-xs text-text-muted">Draw more items on the map to connect them here.</p>
      )}
    </section>
  );
}
