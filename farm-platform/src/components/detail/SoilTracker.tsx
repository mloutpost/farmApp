"use client";

import { useState, useMemo } from "react";
import { useFarmStore } from "@/store/farm-store";
import type { SoilTest, SoilAmendment, FieldData, GardenData } from "@/types";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const AMENDMENT_TYPES = [
  "lime", "compost", "manure", "fish emulsion", "bone meal",
  "blood meal", "kelp", "gypsum", "sulfur", "custom",
];
const UNITS = ["lbs", "oz", "tons", "gallons", "cubic-yards"];

function phColor(ph: number): string {
  if (ph < 5.5 || ph > 7.5) return "text-red-400";
  if (ph < 6.0 || ph > 7.0) return "text-amber-400";
  return "text-emerald-400";
}

function phBg(ph: number): string {
  if (ph < 5.5 || ph > 7.5) return "bg-red-400";
  if (ph < 6.0 || ph > 7.0) return "bg-amber-400";
  return "bg-emerald-400";
}

function phPercent(ph: number): number {
  return Math.max(0, Math.min(100, ((ph - 4) / 6) * 100));
}

function trend(curr: number | undefined, prev: number | undefined): "up" | "down" | "stable" | null {
  if (curr == null || prev == null) return null;
  const diff = curr - prev;
  if (Math.abs(diff) < 0.05 * Math.max(Math.abs(prev), 1)) return "stable";
  return diff > 0 ? "up" : "down";
}

function TrendArrow({ dir }: { dir: "up" | "down" | "stable" | null }) {
  if (!dir) return null;
  if (dir === "up") return <span className="text-emerald-400 text-[10px] ml-0.5">▲</span>;
  if (dir === "down") return <span className="text-red-400 text-[10px] ml-0.5">▼</span>;
  return <span className="text-text-muted text-[10px] ml-0.5">―</span>;
}

function PhBar({ ph }: { ph: number }) {
  const pct = phPercent(ph);
  return (
    <div className="relative h-1.5 w-full rounded-full overflow-hidden mt-1">
      <div className="absolute inset-0 flex">
        <div className="h-full flex-1 bg-red-400/40" />
        <div className="h-full flex-1 bg-amber-400/40" />
        <div className="h-full flex-[2] bg-emerald-400/40" />
        <div className="h-full flex-1 bg-amber-400/40" />
        <div className="h-full flex-1 bg-red-400/40" />
      </div>
      <div
        className={`absolute top-0 h-full w-2 rounded-full ${phBg(ph)} shadow-sm shadow-black/30`}
        style={{ left: `calc(${pct}% - 4px)` }}
      />
    </div>
  );
}

export default function SoilTracker({ nodeId }: { nodeId: string }) {
  const node = useFarmStore((s) => s.nodes.find((n) => n.id === nodeId));
  const updateNodeData = useFarmStore((s) => s.updateNodeData);

  const [tab, setTab] = useState<"tests" | "amendments">("tests");
  const [showTestForm, setShowTestForm] = useState(false);
  const [showAmendForm, setShowAmendForm] = useState(false);

  const [tf, setTf] = useState({ date: "", ph: "", n: "", p: "", k: "", om: "", cec: "", notes: "" });
  const [af, setAf] = useState({ date: "", type: "compost", amount: "", unit: "lbs", notes: "", customType: "" });

  const soilTests = useMemo<SoilTest[]>(() => {
    if (!node) return [];
    const d = node.data as unknown as Record<string, unknown>;
    if (Array.isArray(d.soilTests)) return d.soilTests as SoilTest[];
    return [];
  }, [node]);

  const amendments = useMemo<SoilAmendment[]>(() => {
    if (!node) return [];
    const d = node.data as unknown as Record<string, unknown>;
    if (Array.isArray(d.amendments)) return d.amendments as SoilAmendment[];
    return [];
  }, [node]);

  const sortedTests = useMemo(
    () => [...soilTests].sort((a, b) => b.date.localeCompare(a.date)),
    [soilTests],
  );

  const sortedAmendments = useMemo(
    () => [...amendments].sort((a, b) => b.date.localeCompare(a.date)),
    [amendments],
  );

  if (!node) return null;

  const today = new Date().toISOString().split("T")[0];

  const submitTest = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: SoilTest = {
      id: uid(),
      date: tf.date || today,
      ...(tf.ph && { ph: Number(tf.ph) }),
      ...(tf.n && { nitrogen: Number(tf.n) }),
      ...(tf.p && { phosphorus: Number(tf.p) }),
      ...(tf.k && { potassium: Number(tf.k) }),
      ...(tf.om && { organicMatter: Number(tf.om) }),
      ...(tf.cec && { cec: Number(tf.cec) }),
      ...(tf.notes && { notes: tf.notes }),
    };
    updateNodeData(nodeId, { soilTests: [...soilTests, entry] } as Partial<FieldData>);
    setTf({ date: "", ph: "", n: "", p: "", k: "", om: "", cec: "", notes: "" });
    setShowTestForm(false);
  };

  const submitAmendment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!af.amount) return;
    const entry: SoilAmendment = {
      id: uid(),
      date: af.date || today,
      type: af.type === "custom" ? af.customType || "custom" : af.type,
      amount: Number(af.amount),
      unit: af.unit,
      ...(af.notes && { notes: af.notes }),
    };
    updateNodeData(nodeId, { amendments: [...amendments, entry] } as Partial<GardenData>);
    setAf({ date: "", type: "compost", amount: "", unit: "lbs", notes: "", customType: "" });
    setShowAmendForm(false);
  };

  const removeTest = (id: string) => {
    updateNodeData(nodeId, { soilTests: soilTests.filter((t) => t.id !== id) } as Partial<FieldData>);
  };

  const removeAmendment = (id: string) => {
    updateNodeData(nodeId, { amendments: amendments.filter((a) => a.id !== id) } as Partial<GardenData>);
  };

  const inputCls = "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50";
  const selectCls = "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50";

  return (
    <section className="space-y-3">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-bg-surface p-1">
        {(["tests", "amendments"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t
                ? "bg-bg-elevated text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {t === "tests" ? "Soil Tests" : "Amendments"}
            {t === "tests" && soilTests.length > 0 && (
              <span className="ml-1.5 text-text-muted">{soilTests.length}</span>
            )}
            {t === "amendments" && amendments.length > 0 && (
              <span className="ml-1.5 text-text-muted">{amendments.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Soil Tests Tab ── */}
      {tab === "tests" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Results</h4>
            <button
              onClick={() => setShowTestForm(!showTestForm)}
              className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
            >
              {showTestForm ? "Cancel" : "+ Add Test"}
            </button>
          </div>

          {showTestForm && (
            <form onSubmit={submitTest} className="rounded-lg border border-border bg-bg-surface p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Date</label>
                  <input type="date" value={tf.date} onChange={(e) => setTf({ ...tf, date: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">pH</label>
                  <input type="number" step="0.1" min="0" max="14" value={tf.ph} onChange={(e) => setTf({ ...tf, ph: e.target.value })} placeholder="6.5" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Nitrogen (ppm)</label>
                  <input type="number" value={tf.n} onChange={(e) => setTf({ ...tf, n: e.target.value })} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Phosphorus (ppm)</label>
                  <input type="number" value={tf.p} onChange={(e) => setTf({ ...tf, p: e.target.value })} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Potassium (ppm)</label>
                  <input type="number" value={tf.k} onChange={(e) => setTf({ ...tf, k: e.target.value })} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Organic Matter %</label>
                  <input type="number" step="0.1" value={tf.om} onChange={(e) => setTf({ ...tf, om: e.target.value })} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">CEC (meq/100g)</label>
                  <input type="number" step="0.1" value={tf.cec} onChange={(e) => setTf({ ...tf, cec: e.target.value })} placeholder="0" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-text-muted mb-1">Notes</label>
                <input type="text" value={tf.notes} onChange={(e) => setTf({ ...tf, notes: e.target.value })} placeholder="Lab, conditions, etc." className={inputCls} />
              </div>
              <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-hover transition-colors">
                Save Test
              </button>
            </form>
          )}

          {sortedTests.length === 0 ? (
            <p className="text-xs text-text-muted py-4 text-center">No soil tests recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {sortedTests.map((t, idx) => {
                const prev = sortedTests[idx + 1];
                return (
                  <div key={t.id} className="rounded-lg border border-border bg-bg-surface p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-primary">{t.date}</span>
                      <button onClick={() => removeTest(t.id)} className="text-[10px] text-text-muted hover:text-danger transition-colors">
                        Remove
                      </button>
                    </div>

                    {t.ph != null && (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] text-text-muted">pH</span>
                          <span className={`text-lg font-semibold tabular-nums ${phColor(t.ph)}`}>
                            {t.ph.toFixed(1)}
                          </span>
                          <TrendArrow dir={trend(t.ph, prev?.ph)} />
                        </div>
                        <PhBar ph={t.ph} />
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[9px] text-text-muted">4.0</span>
                          <span className="text-[9px] text-text-muted">10.0</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: "N", val: t.nitrogen, prevVal: prev?.nitrogen, unit: "ppm" },
                        { label: "P", val: t.phosphorus, prevVal: prev?.phosphorus, unit: "ppm" },
                        { label: "K", val: t.potassium, prevVal: prev?.potassium, unit: "ppm" },
                        { label: "OM", val: t.organicMatter, prevVal: prev?.organicMatter, unit: "%" },
                        { label: "CEC", val: t.cec, prevVal: prev?.cec, unit: "" },
                      ].map(({ label, val, prevVal, unit }) =>
                        val != null ? (
                          <div key={label} className="rounded-md bg-bg-elevated px-2 py-1.5 text-center">
                            <div className="text-[10px] text-text-muted">{label}</div>
                            <div className="text-xs font-semibold text-text-primary tabular-nums">
                              {val}{unit && <span className="text-[9px] text-text-muted ml-0.5">{unit}</span>}
                              <TrendArrow dir={trend(val, prevVal)} />
                            </div>
                          </div>
                        ) : null,
                      )}
                    </div>

                    {t.notes && <p className="text-[11px] text-text-muted leading-relaxed">{t.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Amendments Tab ── */}
      {tab === "amendments" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Applied</h4>
            <button
              onClick={() => setShowAmendForm(!showAmendForm)}
              className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
            >
              {showAmendForm ? "Cancel" : "+ Add Amendment"}
            </button>
          </div>

          {showAmendForm && (
            <form onSubmit={submitAmendment} className="rounded-lg border border-border bg-bg-surface p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Date</label>
                  <input type="date" value={af.date} onChange={(e) => setAf({ ...af, date: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Type</label>
                  <select value={af.type} onChange={(e) => setAf({ ...af, type: e.target.value })} className={selectCls}>
                    {AMENDMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                {af.type === "custom" && (
                  <div className="col-span-2">
                    <label className="block text-[10px] text-text-muted mb-1">Custom Type</label>
                    <input type="text" value={af.customType} onChange={(e) => setAf({ ...af, customType: e.target.value })} placeholder="Describe amendment" className={inputCls} />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Amount</label>
                  <input type="number" step="any" value={af.amount} onChange={(e) => setAf({ ...af, amount: e.target.value })} placeholder="0" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Unit</label>
                  <select value={af.unit} onChange={(e) => setAf({ ...af, unit: e.target.value })} className={selectCls}>
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-text-muted mb-1">Notes</label>
                <input type="text" value={af.notes} onChange={(e) => setAf({ ...af, notes: e.target.value })} placeholder="Application method, area, etc." className={inputCls} />
              </div>
              <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-hover transition-colors">
                Save Amendment
              </button>
            </form>
          )}

          {sortedAmendments.length === 0 ? (
            <p className="text-xs text-text-muted py-4 text-center">No amendments recorded yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
              {sortedAmendments.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border bg-bg-surface px-3 py-2.5">
                  <span className="text-xs text-text-muted shrink-0 w-20 tabular-nums">{a.date}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-accent capitalize">{a.type}</span>
                      <span className="text-xs text-text-primary tabular-nums">
                        {a.amount} <span className="text-text-secondary">{a.unit}</span>
                      </span>
                    </div>
                    {a.notes && <p className="text-[11px] text-text-muted mt-0.5 truncate">{a.notes}</p>}
                  </div>
                  <button onClick={() => removeAmendment(a.id)} className="text-[10px] text-text-muted hover:text-danger transition-colors shrink-0">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
