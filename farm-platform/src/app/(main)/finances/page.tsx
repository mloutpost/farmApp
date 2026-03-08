"use client";

import { useState, useMemo, useCallback } from "react";
import { useFarmStore } from "@/store/farm-store";
import type { FinancialEntry } from "@/types";
import { NODE_KIND_LABELS } from "@/types";

const EXPENSE_CATEGORIES = [
  "seed", "soil", "amendment", "fertilizer", "pesticide", "equipment",
  "fuel", "labor", "infrastructure", "feed", "veterinary", "processing",
  "marketing", "other",
] as const;

const REVENUE_CATEGORIES = [
  "produce", "livestock", "eggs", "dairy", "honey", "value-added",
  "agritourism", "grant", "other",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  seed: "Seed", soil: "Soil", amendment: "Amendment", fertilizer: "Fertilizer",
  pesticide: "Pesticide", equipment: "Equipment", fuel: "Fuel", labor: "Labor",
  infrastructure: "Infrastructure", feed: "Feed", veterinary: "Veterinary",
  processing: "Processing", marketing: "Marketing", other: "Other",
  produce: "Produce", livestock: "Livestock", eggs: "Eggs", dairy: "Dairy",
  honey: "Honey", "value-added": "Value-Added", agritourism: "Agritourism",
  grant: "Grant",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type FormState = Omit<FinancialEntry, "id" | "createdAt">;

function emptyForm(season: number): FormState {
  return {
    type: "expense",
    date: new Date().toISOString().slice(0, 10),
    amount: 0,
    category: "seed",
    description: "",
    nodeId: undefined,
    vendor: undefined,
    notes: undefined,
    season,
  };
}

export default function FinancesPage() {
  const nodes = useFarmStore((s) => s.nodes);
  const finances = useFarmStore((s) => s.finances);
  const profile = useFarmStore((s) => s.profile);
  const addFinancialEntry = useFarmStore((s) => s.addFinancialEntry);
  const updateFinancialEntry = useFarmStore((s) => s.updateFinancialEntry);
  const removeFinancialEntry = useFarmStore((s) => s.removeFinancialEntry);

  const currentYear = profile.currentSeason ?? new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(selectedYear));

  const [filterType, setFilterType] = useState<"all" | "expense" | "revenue">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterNode, setFilterNode] = useState<string>("all");

  const seasonEntries = useMemo(
    () => finances.filter((f) => !f.season || f.season === selectedYear),
    [finances, selectedYear],
  );

  const filtered = useMemo(() => {
    let list = seasonEntries;
    if (filterType !== "all") list = list.filter((f) => f.type === filterType);
    if (filterCategory !== "all") list = list.filter((f) => f.category === filterCategory);
    if (filterNode !== "all") list = list.filter((f) => f.nodeId === filterNode);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [seasonEntries, filterType, filterCategory, filterNode]);

  const totalRevenue = useMemo(
    () => seasonEntries.filter((f) => f.type === "revenue").reduce((s, f) => s + f.amount, 0),
    [seasonEntries],
  );
  const totalExpenses = useMemo(
    () => seasonEntries.filter((f) => f.type === "expense").reduce((s, f) => s + f.amount, 0),
    [seasonEntries],
  );
  const net = totalRevenue - totalExpenses;

  const monthlyData = useMemo(() => {
    const data = Array.from({ length: 12 }, () => ({ revenue: 0, expense: 0 }));
    seasonEntries.forEach((f) => {
      const m = new Date(f.date + "T00:00:00").getMonth();
      if (f.type === "revenue") data[m].revenue += f.amount;
      else data[m].expense += f.amount;
    });
    return data;
  }, [seasonEntries]);

  const chartMax = useMemo(
    () => Math.max(1, ...monthlyData.map((d) => Math.max(d.revenue, d.expense))),
    [monthlyData],
  );

  const expenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    seasonEntries.filter((f) => f.type === "expense").forEach((f) => {
      map[f.category] = (map[f.category] ?? 0) + f.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [seasonEntries]);

  const revenueBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    seasonEntries.filter((f) => f.type === "revenue").forEach((f) => {
      map[f.category] = (map[f.category] ?? 0) + f.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [seasonEntries]);

  const nodeMap = useMemo(() => {
    const m: Record<string, string> = {};
    nodes.forEach((n) => { m[n.id] = n.name; });
    return m;
  }, [nodes]);

  const handleFormChange = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "type") {
          next.category = value === "revenue" ? "produce" : "seed";
          if (value === "revenue") next.vendor = undefined;
        }
        return next;
      });
    },
    [],
  );

  const handleSave = () => {
    if (!form.description.trim() || form.amount <= 0) return;
    if (editingId) {
      updateFinancialEntry(editingId, { ...form });
      setEditingId(null);
    } else {
      addFinancialEntry({ ...form, season: selectedYear });
    }
    setForm(emptyForm(selectedYear));
    setShowForm(false);
  };

  const handleCancel = () => {
    setForm(emptyForm(selectedYear));
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (entry: FinancialEntry) => {
    setForm({
      type: entry.type,
      date: entry.date,
      amount: entry.amount,
      category: entry.category,
      description: entry.description,
      nodeId: entry.nodeId,
      vendor: entry.vendor,
      notes: entry.notes,
      season: entry.season,
    });
    setEditingId(entry.id);
    setShowForm(true);
    setExpandedId(null);
  };

  const handleDelete = (id: string) => {
    removeFinancialEntry(id);
    if (expandedId === id) setExpandedId(null);
  };

  const handleExportCsv = () => {
    const header = "Date,Type,Category,Description,Amount,Node,Vendor,Notes\n";
    const rows = filtered.map((f) => {
      const row = [
        f.date,
        f.type,
        f.category,
        `"${(f.description || "").replace(/"/g, '""')}"`,
        f.amount.toFixed(2),
        `"${(f.nodeId ? nodeMap[f.nodeId] ?? "" : "").replace(/"/g, '""')}"`,
        `"${(f.vendor || "").replace(/"/g, '""')}"`,
        `"${(f.notes || "").replace(/"/g, '""')}"`,
      ];
      return row.join(",");
    });
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finances_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categories = filterType === "revenue"
    ? REVENUE_CATEGORIES
    : filterType === "expense"
      ? EXPENSE_CATEGORIES
      : [...EXPENSE_CATEGORIES, ...REVENUE_CATEGORIES.filter((c) => !EXPENSE_CATEGORIES.includes(c as typeof EXPENSE_CATEGORIES[number]))];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Finances</h1>
            <p className="mt-1 text-sm text-text-secondary">Track income and expenses across your farm</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExportCsv} className="rounded-md border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
              Export CSV
            </button>
            <button
              onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm(selectedYear)); }}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-hover transition-colors"
            >
              + Add Entry
            </button>
          </div>
        </div>

        {/* Season selector */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedYear((y) => y - 1)} className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="text-sm font-semibold text-text-primary min-w-[4ch] text-center">{selectedYear}</span>
          <button onClick={() => setSelectedYear((y) => y + 1)} className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <span className="text-xs text-text-muted">Season / Year</span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-bg-elevated p-5">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Revenue</p>
            <p className="text-2xl font-bold text-emerald-400">${fmt(totalRevenue)}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-elevated p-5">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Expenses</p>
            <p className="text-2xl font-bold text-red-400">${fmt(totalExpenses)}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-elevated p-5">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Net Profit / Loss</p>
            <p className={`text-2xl font-bold ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {net < 0 ? "-" : ""}${fmt(Math.abs(net))}
            </p>
          </div>
        </div>

        {/* Add / Edit form */}
        {showForm && (
          <div className="rounded-xl border border-border bg-bg-elevated p-6 mb-8">
            <h2 className="text-base font-medium text-text-primary mb-4">
              {editingId ? "Edit Entry" : "New Entry"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Type toggle */}
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="inline-flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => handleFormChange("type", "expense")}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                      form.type === "expense"
                        ? "bg-red-500/15 text-red-400"
                        : "bg-bg-surface text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    onClick={() => handleFormChange("type", "revenue")}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                      form.type === "revenue"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-bg-surface text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    Revenue
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => handleFormChange("date", e.target.value)}
                  className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount || ""}
                    onChange={(e) => handleFormChange("amount", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full rounded-md border border-border bg-bg-surface pl-7 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => handleFormChange("category", e.target.value as FormState["category"])}
                  className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
                >
                  {(form.type === "expense" ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES).map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  placeholder="What was this for?"
                  className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                />
              </div>

              {/* Node link */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Link to Node</label>
                <select
                  value={form.nodeId || ""}
                  onChange={(e) => handleFormChange("nodeId", e.target.value || undefined)}
                  className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
                >
                  <option value="">None</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({NODE_KIND_LABELS[n.kind]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Vendor (expense only) */}
              {form.type === "expense" && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Vendor</label>
                  <input
                    type="text"
                    value={form.vendor || ""}
                    onChange={(e) => handleFormChange("vendor", e.target.value || undefined)}
                    placeholder="Supplier name"
                    className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-text-secondary mb-1">Notes</label>
                <textarea
                  value={form.notes || ""}
                  onChange={(e) => handleFormChange("notes", e.target.value || undefined)}
                  rows={2}
                  placeholder="Additional details…"
                  className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={!form.description.trim() || form.amount <= 0}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-hover transition-colors disabled:opacity-40"
              >
                {editingId ? "Update" : "Save Entry"}
              </button>
              <button
                onClick={handleCancel}
                className="rounded-md border border-border bg-bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Monthly chart */}
        <div className="rounded-xl border border-border bg-bg-elevated p-6 mb-8">
          <h2 className="text-base font-medium text-text-primary mb-4">Monthly Overview</h2>
          <div className="flex items-end gap-1 h-48">
            {monthlyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                <div className="flex gap-px w-full justify-center items-end flex-1">
                  {/* Revenue bar */}
                  <div
                    className="w-[40%] rounded-t transition-all duration-300"
                    style={{
                      height: `${(d.revenue / chartMax) * 100}%`,
                      minHeight: d.revenue > 0 ? "2px" : "0",
                      backgroundColor: "rgb(52, 211, 153)",
                      opacity: 0.8,
                    }}
                    title={`Revenue: $${fmt(d.revenue)}`}
                  />
                  {/* Expense bar */}
                  <div
                    className="w-[40%] rounded-t transition-all duration-300"
                    style={{
                      height: `${(d.expense / chartMax) * 100}%`,
                      minHeight: d.expense > 0 ? "2px" : "0",
                      backgroundColor: "rgb(248, 113, 113)",
                      opacity: 0.8,
                    }}
                    title={`Expenses: $${fmt(d.expense)}`}
                  />
                </div>
                <span className="text-[10px] text-text-muted mt-1">{MONTHS[i]}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgb(52, 211, 153)" }} />
              <span className="text-xs text-text-muted">Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgb(248, 113, 113)" }} />
              <span className="text-xs text-text-muted">Expenses</span>
            </div>
          </div>
        </div>

        {/* Category breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-bg-elevated p-5">
            <h3 className="text-sm font-medium text-text-primary mb-3">Expense Breakdown</h3>
            {expenseBreakdown.length === 0 ? (
              <p className="text-xs text-text-muted">No expenses recorded</p>
            ) : (
              <div className="space-y-2">
                {expenseBreakdown.map(([cat, amount]) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-text-secondary">{CATEGORY_LABELS[cat] ?? cat}</span>
                      <span className="text-text-primary font-medium">${fmt(amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0}%`,
                          backgroundColor: "rgb(248, 113, 113)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border bg-bg-elevated p-5">
            <h3 className="text-sm font-medium text-text-primary mb-3">Revenue Breakdown</h3>
            {revenueBreakdown.length === 0 ? (
              <p className="text-xs text-text-muted">No revenue recorded</p>
            ) : (
              <div className="space-y-2">
                {revenueBreakdown.map(([cat, amount]) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-text-secondary">{CATEGORY_LABELS[cat] ?? cat}</span>
                      <span className="text-text-primary font-medium">${fmt(amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0}%`,
                          backgroundColor: "rgb(52, 211, 153)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value as typeof filterType); setFilterCategory("all"); }}
            className="rounded-md border border-border bg-bg-surface px-3 py-1.5 text-xs text-text-primary"
          >
            <option value="all">All Types</option>
            <option value="expense">Expenses</option>
            <option value="revenue">Revenue</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-md border border-border bg-bg-surface px-3 py-1.5 text-xs text-text-primary"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
            ))}
          </select>
          <select
            value={filterNode}
            onChange={(e) => setFilterNode(e.target.value)}
            className="rounded-md border border-border bg-bg-surface px-3 py-1.5 text-xs text-text-primary"
          >
            <option value="all">All Nodes</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>
          {(filterType !== "all" || filterCategory !== "all" || filterNode !== "all") && (
            <button
              onClick={() => { setFilterType("all"); setFilterCategory("all"); setFilterNode("all"); }}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs text-text-muted">{filtered.length} entries</span>
        </div>

        {/* Transactions list */}
        <div className="rounded-xl border border-border bg-bg-elevated overflow-hidden mb-8">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted mb-3">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
              <p className="text-sm text-text-muted">No financial entries yet</p>
              <p className="text-xs text-text-muted mt-1">Click &ldquo;Add Entry&rdquo; to start tracking</p>
            </div>
          ) : (
            <div>
              {filtered.map((entry) => {
                const isExpanded = expandedId === entry.id;
                return (
                  <div key={entry.id} className="border-b border-border/50 last:border-b-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="w-full grid grid-cols-[1fr_auto_auto] sm:grid-cols-[90px_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 text-left hover:bg-bg-surface/50 transition-colors"
                    >
                      <span className="hidden sm:block text-xs text-text-muted font-mono">{entry.date}</span>
                      <span className="text-sm text-text-primary truncate">{entry.description}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                        entry.type === "expense"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {CATEGORY_LABELS[entry.category] ?? entry.category}
                      </span>
                      {entry.nodeId && nodeMap[entry.nodeId] && (
                        <span className="hidden sm:block text-[10px] text-text-muted bg-bg-surface px-2 py-0.5 rounded-full truncate max-w-[120px]">
                          {nodeMap[entry.nodeId]}
                        </span>
                      )}
                      <span className={`text-sm font-semibold tabular-nums text-right min-w-[80px] ${
                        entry.type === "revenue" ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {entry.type === "expense" ? "-" : "+"}${fmt(entry.amount)}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 bg-bg-surface/30">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                          <div>
                            <span className="text-text-muted">Date</span>
                            <p className="text-text-primary">{entry.date}</p>
                          </div>
                          <div>
                            <span className="text-text-muted">Type</span>
                            <p className="text-text-primary capitalize">{entry.type}</p>
                          </div>
                          {entry.vendor && (
                            <div>
                              <span className="text-text-muted">Vendor</span>
                              <p className="text-text-primary">{entry.vendor}</p>
                            </div>
                          )}
                          {entry.nodeId && nodeMap[entry.nodeId] && (
                            <div>
                              <span className="text-text-muted">Linked Node</span>
                              <p className="text-text-primary">{nodeMap[entry.nodeId]}</p>
                            </div>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-text-secondary mb-3">{entry.notes}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="rounded-md border border-border bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="rounded-md border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
