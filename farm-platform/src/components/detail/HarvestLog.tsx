"use client";

import { useState } from "react";
import { useFarmStore } from "@/store/farm-store";
import type { FarmNode } from "@/types";

const UNITS = ["lbs", "oz", "kg", "bushels", "each", "bunches", "gallons", "tons"];

export default function HarvestLog({ node }: { node: FarmNode }) {
  const logHarvest = useFarmStore((s) => s.logHarvest);
  const [open, setOpen] = useState(false);
  const [crop, setCrop] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("lbs");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!crop || !amount) return;
    logHarvest(node.id, {
      date: new Date().toISOString().split("T")[0],
      crop,
      amount: parseFloat(amount),
      unit,
      notes: notes || undefined,
      season: new Date().getFullYear(),
    });
    setCrop("");
    setAmount("");
    setNotes("");
    setOpen(false);
  };

  const totals = node.harvestLog.reduce<Record<string, { amount: number; unit: string }>>((acc, h) => {
    const key = `${h.crop}-${h.unit}`;
    if (!acc[key]) acc[key] = { amount: 0, unit: h.unit };
    acc[key].amount += h.amount;
    return acc;
  }, {});

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">Harvest Log</h3>
        <button
          onClick={() => setOpen(!open)}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          {open ? "Cancel" : "+ Log Harvest"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-bg-surface p-4 mb-4 space-y-3">
          <input
            type="text"
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            placeholder="Crop (e.g. Tomatoes)"
            required
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              required
              step="0.1"
              className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-hover transition-colors">
            Log Harvest
          </button>
        </form>
      )}

      {Object.keys(totals).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.entries(totals).map(([key, val]) => (
            <div key={key} className="rounded-md bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
              {key.split("-")[0]}: {val.amount} {val.unit}
            </div>
          ))}
        </div>
      )}

      {node.harvestLog.length === 0 ? (
        <p className="text-xs text-text-muted">No harvests logged yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {node.harvestLog.map((h) => (
            <div key={h.id} className="flex items-center gap-3 rounded-md bg-bg-surface px-3 py-2">
              <span className="text-xs text-text-muted shrink-0 w-20">{h.date}</span>
              <span className="text-xs font-medium text-text-primary">{h.crop}</span>
              <span className="text-xs text-accent">{h.amount} {h.unit}</span>
              {h.notes && <span className="text-xs text-text-muted truncate">{h.notes}</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
