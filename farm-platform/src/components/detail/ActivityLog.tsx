"use client";

import { useState } from "react";
import { useFarmStore } from "@/store/farm-store";
import type { FarmNode } from "@/types";

const ACTIONS = [
  "planted", "watered", "fertilized", "weeded", "harvested", "sprayed",
  "mowed", "pruned", "scouted", "repaired", "mulched", "amended", "observed", "other",
];

export default function ActivityLog({ node }: { node: FarmNode }) {
  const logActivity = useFarmStore((s) => s.logActivity);
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("watered");
  const [notes, setNotes] = useState("");
  const [product, setProduct] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logActivity(node.id, {
      date: new Date().toISOString().split("T")[0],
      action,
      notes: notes || undefined,
      product: product || undefined,
    });
    setNotes("");
    setProduct("");
    setOpen(false);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">Activity Log</h3>
        <button
          onClick={() => setOpen(!open)}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          {open ? "Cancel" : "+ Log Activity"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-bg-surface p-4 mb-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {ACTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAction(a)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                  action === a ? "bg-accent/20 text-accent" : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="Product / material (optional)"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-hover transition-colors"
          >
            Log
          </button>
        </form>
      )}

      {node.activityLog.length === 0 ? (
        <p className="text-xs text-text-muted">No activity logged yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {node.activityLog.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 rounded-md bg-bg-surface px-3 py-2">
              <span className="text-xs text-text-muted shrink-0 w-20">{entry.date}</span>
              <span className="text-xs font-medium text-accent capitalize">{entry.action}</span>
              {entry.product && <span className="text-xs text-text-secondary">{entry.product}</span>}
              {entry.notes && <span className="text-xs text-text-muted flex-1 truncate">{entry.notes}</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
