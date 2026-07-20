"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFarmStore } from "@/store/farm-store";
import { useBethStore, type BethPantryItem } from "@/store/beth-store";
import {
  aggregateHarvestByCropUnit,
  collectHarvestLines,
} from "@/lib/beth-harvest-pantry";

export default function BethPantryPanel() {
  const nodes = useFarmStore((s) => s.nodes);
  const pantry = useBethStore((s) => s.pantry);
  const addPantryItem = useBethStore((s) => s.addPantryItem);
  const removePantryItem = useBethStore((s) => s.removePantryItem);

  const harvestLines = useMemo(() => collectHarvestLines(nodes), [nodes]);
  const totals = useMemo(() => aggregateHarvestByCropUnit(harvestLines), [harvestLines]);
  const recent = useMemo(() => harvestLines.slice(0, 12), [harvestLines]);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("lb");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const q = parseFloat(quantity);
    addPantryItem({
      name: name.trim(),
      quantity: Number.isFinite(q) ? q : 0,
      unit: unit.trim() || "ea",
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setName("");
    setQuantity("1");
    setUnit("lb");
    setLocation("");
    setNotes("");
  };

  const addFromTotal = (crop: string, total: number, unitLabel: string) => {
    addPantryItem({
      name: crop,
      quantity: total,
      unit: unitLabel,
      location: "From garden harvest",
      notes: "Synced from logged harvest totals on Beth's Page",
    });
  };

  const prefillFromHarvest = (crop: string, amount: number, unitLabel: string) => {
    setName(crop);
    setQuantity(String(amount));
    setUnit(unitLabel);
    setNotes("From harvest log");
  };

  return (
    <div className="space-y-8">
      <section aria-labelledby="beth-proceeds-heading">
        <h3
          id="beth-proceeds-heading"
          className="mb-3 font-[family-name:var(--font-beth-script)] text-2xl text-stone-800"
        >
          Garden proceeds
        </h3>
        <p className="mb-4 text-sm text-stone-600 font-[family-name:var(--font-beth-serif)]">
          Totals come from harvest entries logged on your garden and bed nodes. Log harvests on each node&apos;s
          detail page so this pantry view stays in sync with what you actually brought in.
        </p>

        {totals.length === 0 && harvestLines.length === 0 && (
          <div className="rounded-lg border border-dashed border-amber-900/30 bg-[#faf6ef]/80 px-4 py-6 text-center text-sm text-stone-600">
            No harvests logged yet. Record a harvest on a garden or bed node to see totals here.
          </div>
        )}

        {totals.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-amber-900/15 bg-[#fffdf8]">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b border-amber-900/15 text-stone-600">
                  <th className="px-4 py-3 font-medium">Crop</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium w-[1%] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {totals.map((t) => (
                  <tr key={`${t.crop}-${t.unit}`} className="border-b border-amber-900/10 last:border-0">
                    <td className="px-4 py-3 font-medium text-stone-900">{t.crop}</td>
                    <td className="px-4 py-3 text-stone-700">
                      {t.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {t.unit}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => addFromTotal(t.crop, t.total, t.unit)}
                          className="text-sm text-amber-900 underline decoration-amber-800/40 hover:decoration-amber-900 min-h-[44px]"
                        >
                          Add to on-hand
                        </button>
                        <button
                          type="button"
                          onClick={() => prefillFromHarvest(t.crop, t.total, t.unit)}
                          className="text-sm text-stone-600 hover:text-stone-900 min-h-[44px]"
                        >
                          Prefill form
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {recent.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
              Recent harvests
            </h4>
            <ul className="space-y-2">
              {recent.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-amber-900/10 bg-[#faf6ef] px-3 py-2 text-sm"
                >
                  <span className="text-stone-800">
                    <span className="font-medium">{h.crop}</span>{" "}
                    <span className="text-stone-600">
                      {h.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {h.unit}
                    </span>
                  </span>
                  <span className="text-stone-500">{h.date}</span>
                  <Link
                    href={`/node?id=${h.nodeId}`}
                    className="text-amber-900 underline decoration-amber-800/40 hover:decoration-amber-900"
                  >
                    {h.nodeName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="beth-extras-heading">
        <h3
          id="beth-extras-heading"
          className="mb-3 font-[family-name:var(--font-beth-script)] text-2xl text-stone-800"
        >
          On hand (cellar & extras)
        </h3>
        <p className="mb-4 text-sm text-stone-600">
          Track what you have stored—gifts, bulk buys, or portions not captured in harvest logs.
        </p>

        <form
          onSubmit={handleAdd}
          className="rounded-lg border border-amber-900/20 bg-[#faf6ef] p-4 shadow-sm"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm text-stone-700">Item</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 w-full rounded border border-amber-900/25 bg-white/80 px-3 py-2"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm text-stone-700">Qty</label>
                <input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 w-full rounded border border-amber-900/25 bg-white/80 px-3 py-2"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-stone-700">Unit</label>
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="mt-1 w-full rounded border border-amber-900/25 bg-white/80 px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-stone-700">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full rounded border border-amber-900/25 bg-white/80 px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm text-stone-700">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded border border-amber-900/25 bg-white/80 px-3 py-2"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-md bg-amber-900 px-4 py-2 text-sm font-medium text-amber-50 hover:bg-amber-800 min-h-[44px]"
          >
            Add to on-hand list
          </button>
        </form>

        <ul className="mt-4 divide-y divide-amber-900/10 rounded-lg border border-amber-900/15 bg-[#fffdf8]">
          {pantry.length === 0 && (
            <li className="p-6 text-center text-stone-600 font-serif">Nothing in the on-hand list yet.</li>
          )}
          {pantry.map((p: BethPantryItem) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-stone-900">{p.name}</p>
                <p className="text-sm text-stone-600">
                  {p.quantity} {p.unit}
                  {p.location ? ` · ${p.location}` : ""}
                </p>
                {p.notes && <p className="text-sm text-stone-500">{p.notes}</p>}
                <p className="text-xs text-stone-400">Updated {p.updatedAt.slice(0, 10)}</p>
              </div>
              <button
                type="button"
                onClick={() => removePantryItem(p.id)}
                className="text-sm text-stone-500 hover:text-red-800 min-h-[44px] px-3"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
