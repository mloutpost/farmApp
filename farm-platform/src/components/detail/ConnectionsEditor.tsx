"use client";

import { useFarmStore } from "@/store/farm-store";
import { NODE_KIND_LABELS, NODE_KIND_COLORS } from "@/types";
import type { FarmNode } from "@/types";

export default function ConnectionsEditor({ node }: { node: FarmNode }) {
  const nodes = useFarmStore((s) => s.nodes);
  const addConnection = useFarmStore((s) => s.addConnection);
  const removeConnection = useFarmStore((s) => s.removeConnection);

  const otherNodes = nodes.filter((n) => n.id !== node.id);
  const connected = otherNodes.filter((n) => node.connections.includes(n.id));
  const available = otherNodes.filter((n) => !node.connections.includes(n.id));

  return (
    <section>
      <h3 className="text-sm font-semibold text-text-primary mb-3">Connections</h3>
      <p className="text-xs text-text-muted mb-3">
        Connect this to other parts of your farm. Connections show up in the Flow view.
      </p>

      {connected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {connected.map((n) => (
            <div
              key={n.id}
              className="flex items-center gap-1.5 rounded-md bg-bg-surface border border-border px-2.5 py-1.5"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: NODE_KIND_COLORS[n.kind] }}
              />
              <span className="text-xs text-text-primary">{n.name}</span>
              <button
                onClick={() => removeConnection(node.id, n.id)}
                className="ml-1 text-text-muted hover:text-danger transition-colors"
                aria-label={`Remove connection to ${n.name}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) addConnection(node.id, e.target.value);
          }}
          className="rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary w-full"
        >
          <option value="">+ Connect to...</option>
          {available.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name} ({NODE_KIND_LABELS[n.kind]})
            </option>
          ))}
        </select>
      )}

      {otherNodes.length === 0 && (
        <p className="text-xs text-text-muted">Draw more items on the map to connect them here.</p>
      )}
    </section>
  );
}
