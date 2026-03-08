"use client";

import { useState, useMemo, useCallback, Fragment } from "react";
import { useFarmStore } from "@/store/farm-store";
import type { FarmNode, HarvestEntry, FinancialEntry } from "@/types";
import { NODE_KIND_LABELS, NODE_KIND_COLORS } from "@/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CROP_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
  "#a855f7", "#eab308", "#6366f1", "#10b981", "#e11d48",
];

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtWhole(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

type SortKey = "crop" | "total" | "unit" | "revenue" | "avgPrice" | "count";
type SortDir = "asc" | "desc";

interface CropRow {
  crop: string;
  total: number;
  unit: string;
  revenue: number;
  avgPrice: number;
  count: number;
  byNode: { nodeId: string; nodeName: string; kind: string; total: number; revenue: number; count: number }[];
}

export default function ReportsView() {
  const nodes = useFarmStore((s) => s.nodes);
  const finances = useFarmStore((s) => s.finances);
  const profile = useFarmStore((s) => s.profile);

  const currentYear = profile.currentSeason ?? new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedCrop, setExpandedCrop] = useState<string | null>(null);

  const allHarvests = useMemo(() => {
    const entries: (HarvestEntry & { nodeId: string; nodeName: string; nodeKind: string })[] = [];
    nodes.forEach((n) => {
      n.harvestLog.forEach((h) => {
        entries.push({ ...h, nodeId: n.id, nodeName: n.name, nodeKind: n.kind });
      });
    });
    return entries;
  }, [nodes]);

  const seasonHarvests = useMemo(
    () => allHarvests.filter((h) => {
      if (h.season) return h.season === selectedYear;
      return new Date(h.date).getFullYear() === selectedYear;
    }),
    [allHarvests, selectedYear],
  );

  const prevSeasonHarvests = useMemo(
    () => allHarvests.filter((h) => {
      if (h.season) return h.season === selectedYear - 1;
      return new Date(h.date).getFullYear() === selectedYear - 1;
    }),
    [allHarvests, selectedYear],
  );

  const seasonFinances = useMemo(
    () => finances.filter((f) => !f.season || f.season === selectedYear),
    [finances, selectedYear],
  );

  const prevSeasonFinances = useMemo(
    () => finances.filter((f) => !f.season || f.season === selectedYear - 1),
    [finances, selectedYear],
  );

  const totalWeight = useMemo(
    () => seasonHarvests.reduce((s, h) => s + h.amount, 0),
    [seasonHarvests],
  );

  const uniqueCrops = useMemo(
    () => new Set(seasonHarvests.map((h) => h.crop.toLowerCase().trim())).size,
    [seasonHarvests],
  );

  const topCrop = useMemo(() => {
    const map: Record<string, number> = {};
    seasonHarvests.forEach((h) => {
      const key = h.crop.toLowerCase().trim();
      map[key] = (map[key] ?? 0) + h.amount;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? sorted[0][0] : "—";
  }, [seasonHarvests]);

  const harvestRevenue = useMemo(
    () => seasonHarvests.reduce((s, h) => s + (h.revenue ?? 0), 0),
    [seasonHarvests],
  );

  const financialRevenue = useMemo(
    () => seasonFinances.filter((f) => f.type === "revenue").reduce((s, f) => s + f.amount, 0),
    [seasonFinances],
  );

  const totalRevenue = harvestRevenue + financialRevenue;

  const totalExpenses = useMemo(
    () => seasonFinances.filter((f) => f.type === "expense").reduce((s, f) => s + f.amount, 0),
    [seasonFinances],
  );

  const netProfit = totalRevenue - totalExpenses;

  const monthlyHarvest = useMemo(() => {
    const data = Array.from({ length: 12 }, () => ({ total: 0, byCrop: {} as Record<string, number> }));
    seasonHarvests.forEach((h) => {
      const m = new Date(h.date + "T00:00:00").getMonth();
      data[m].total += h.amount;
      const crop = h.crop.toLowerCase().trim();
      data[m].byCrop[crop] = (data[m].byCrop[crop] ?? 0) + h.amount;
    });
    return data;
  }, [seasonHarvests]);

  const allCropsOrdered = useMemo(() => {
    const map: Record<string, number> = {};
    seasonHarvests.forEach((h) => {
      const crop = h.crop.toLowerCase().trim();
      map[crop] = (map[crop] ?? 0) + h.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [seasonHarvests]);

  const cropColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    allCropsOrdered.forEach((c, i) => { map[c] = CROP_COLORS[i % CROP_COLORS.length]; });
    return map;
  }, [allCropsOrdered]);

  const monthlyMax = useMemo(
    () => Math.max(1, ...monthlyHarvest.map((d) => d.total)),
    [monthlyHarvest],
  );

  const cropRows = useMemo(() => {
    const map: Record<string, CropRow> = {};
    seasonHarvests.forEach((h) => {
      const crop = h.crop.toLowerCase().trim();
      if (!map[crop]) {
        map[crop] = { crop, total: 0, unit: h.unit, revenue: 0, avgPrice: 0, count: 0, byNode: [] };
      }
      map[crop].total += h.amount;
      map[crop].revenue += h.revenue ?? 0;
      map[crop].count += 1;
    });

    Object.values(map).forEach((row) => {
      row.avgPrice = row.total > 0 ? row.revenue / row.total : 0;

      const nodeMap: Record<string, CropRow["byNode"][number]> = {};
      seasonHarvests.filter((h) => h.crop.toLowerCase().trim() === row.crop).forEach((h) => {
        if (!nodeMap[h.nodeId]) {
          nodeMap[h.nodeId] = { nodeId: h.nodeId, nodeName: h.nodeName, kind: h.nodeKind, total: 0, revenue: 0, count: 0 };
        }
        nodeMap[h.nodeId].total += h.amount;
        nodeMap[h.nodeId].revenue += h.revenue ?? 0;
        nodeMap[h.nodeId].count += 1;
      });
      row.byNode = Object.values(nodeMap).sort((a, b) => b.total - a.total);
    });

    return Object.values(map);
  }, [seasonHarvests]);

  const sortedCropRows = useMemo(() => {
    const rows = [...cropRows];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "crop": cmp = a.crop.localeCompare(b.crop); break;
        case "total": cmp = a.total - b.total; break;
        case "unit": cmp = a.unit.localeCompare(b.unit); break;
        case "revenue": cmp = a.revenue - b.revenue; break;
        case "avgPrice": cmp = a.avgPrice - b.avgPrice; break;
        case "count": cmp = a.count - b.count; break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return rows;
  }, [cropRows, sortKey, sortDir]);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        return key;
      }
      setSortDir("desc");
      return key;
    });
  }, []);

  const topNodes = useMemo(() => {
    const map: Record<string, { node: FarmNode; total: number; revenue: number }> = {};
    seasonHarvests.forEach((h) => {
      if (!map[h.nodeId]) {
        const node = nodes.find((n) => n.id === h.nodeId);
        if (!node) return;
        map[h.nodeId] = { node, total: 0, revenue: 0 };
      }
      map[h.nodeId].total += h.amount;
      map[h.nodeId].revenue += h.revenue ?? 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [seasonHarvests, nodes]);

  const prevWeight = useMemo(
    () => prevSeasonHarvests.reduce((s, h) => s + h.amount, 0),
    [prevSeasonHarvests],
  );

  const prevRevenue = useMemo(() => {
    const harvestRev = prevSeasonHarvests.reduce((s, h) => s + (h.revenue ?? 0), 0);
    const finRev = prevSeasonFinances.filter((f) => f.type === "revenue").reduce((s, f) => s + f.amount, 0);
    return harvestRev + finRev;
  }, [prevSeasonHarvests, prevSeasonFinances]);

  const prevHarvestCount = prevSeasonHarvests.length;
  const curHarvestCount = seasonHarvests.length;

  const comparisonMax = useMemo(
    () => Math.max(1, totalWeight, prevWeight, totalRevenue, prevRevenue, curHarvestCount, prevHarvestCount),
    [totalWeight, prevWeight, totalRevenue, prevRevenue, curHarvestCount, prevHarvestCount],
  );

  const activityCounts = useMemo(() => {
    const map: Record<string, number> = {};
    nodes.forEach((n) => {
      n.activityLog.forEach((a) => {
        const yr = new Date(a.date).getFullYear();
        if (yr === selectedYear) {
          const action = a.action || "Other";
          map[action] = (map[action] ?? 0) + 1;
        }
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [nodes, selectedYear]);

  const activityMax = useMemo(
    () => Math.max(1, ...activityCounts.map(([, c]) => c)),
    [activityCounts],
  );

  const handleExport = useCallback(() => {
    const header = "Date,Crop,Amount,Unit,Grade,Revenue,Price/Unit,Node,Season,Notes\n";
    const rows = seasonHarvests
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((h) => [
        h.date,
        `"${h.crop.replace(/"/g, '""')}"`,
        h.amount.toFixed(2),
        h.unit,
        h.grade ?? "",
        (h.revenue ?? 0).toFixed(2),
        (h.pricePerUnit ?? 0).toFixed(2),
        `"${(h.nodeName || "").replace(/"/g, '""')}"`,
        h.season ?? selectedYear,
        `"${(h.notes || "").replace(/"/g, '""')}"`,
      ].join(","));
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `harvest_report_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [seasonHarvests, selectedYear]);

  const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => (
    <svg width="12" height="12" viewBox="0 0 12 12" className={`inline-block ml-1 transition-colors ${active ? "text-accent" : "text-text-muted"}`}>
      <path d="M6 2L9 5H3L6 2Z" fill={active && dir === "asc" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1" />
      <path d="M6 10L3 7H9L6 10Z" fill={active && dir === "desc" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1" />
    </svg>
  );

  const comparisonItems = [
    { label: "Total Harvest", cur: totalWeight, prev: prevWeight, suffix: "" },
    { label: "Revenue", cur: totalRevenue, prev: prevRevenue, suffix: "", prefix: "$" },
    { label: "# Harvests", cur: curHarvestCount, prev: prevHarvestCount, suffix: "" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedYear((y) => y - 1)} className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="text-lg font-semibold text-text-primary min-w-[4ch] text-center tabular-nums">{selectedYear}</span>
          <button onClick={() => setSelectedYear((y) => y + 1)} className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <span className="text-xs text-text-muted">Season / Year</span>
        </div>
        <button
          onClick={handleExport}
          className="rounded-md border border-border bg-bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <div className="rounded-xl border border-border bg-bg-elevated p-4">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Total Harvest</p>
          <p className="text-xl font-bold text-text-primary tabular-nums">{fmtWhole(totalWeight)}</p>
          <p className="text-[10px] text-text-muted mt-0.5">combined weight/units</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-elevated p-4">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Unique Crops</p>
          <p className="text-xl font-bold text-text-primary tabular-nums">{uniqueCrops}</p>
          <p className="text-[10px] text-text-muted mt-0.5">crops harvested</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-elevated p-4">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Top Crop</p>
          <p className="text-xl font-bold text-text-primary capitalize truncate" title={topCrop}>{topCrop}</p>
          <p className="text-[10px] text-text-muted mt-0.5">by volume</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-elevated p-4">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-emerald-400 tabular-nums">${fmt(totalRevenue)}</p>
          <p className="text-[10px] text-text-muted mt-0.5">harvest + financial</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-elevated p-4">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Expenses</p>
          <p className="text-xl font-bold text-red-400 tabular-nums">${fmt(totalExpenses)}</p>
          <p className="text-[10px] text-text-muted mt-0.5">all categories</p>
        </div>
        <div className="rounded-xl border border-border bg-bg-elevated p-4">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Net Profit/Loss</p>
          <p className={`text-xl font-bold tabular-nums ${netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {netProfit < 0 ? "-" : ""}${fmt(Math.abs(netProfit))}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">revenue − expenses</p>
        </div>
      </div>

      {/* Monthly Harvest Chart */}
      <div className="rounded-xl border border-border bg-bg-elevated p-6 mb-8">
        <h2 className="text-base font-medium text-text-primary mb-1">Monthly Harvest</h2>
        <p className="text-xs text-text-muted mb-5">Total harvested amounts by month, color-coded by crop</p>
        {seasonHarvests.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-text-muted">No harvest data for {selectedYear}</p>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-1.5 h-52">
              {monthlyHarvest.map((d, i) => {
                const crops = Object.entries(d.byCrop).sort((a, b) => b[1] - a[1]);
                const heightPct = (d.total / monthlyMax) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div
                      className="w-full relative rounded-t overflow-hidden transition-all duration-300"
                      style={{ height: `${heightPct}%`, minHeight: d.total > 0 ? "3px" : "0" }}
                      title={`${MONTHS[i]}: ${fmtWhole(d.total)}`}
                    >
                      <div className="absolute inset-0 flex flex-col-reverse">
                        {crops.map(([crop, amt]) => (
                          <div
                            key={crop}
                            style={{
                              height: `${d.total > 0 ? (amt / d.total) * 100 : 0}%`,
                              backgroundColor: cropColorMap[crop] ?? "#6b7280",
                              opacity: 0.85,
                            }}
                            className="w-full transition-all duration-300 hover:opacity-100"
                            title={`${crop}: ${fmtWhole(amt)}`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-text-muted mt-1.5 group-hover:text-text-secondary transition-colors">{MONTHS[i]}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-5">
              {allCropsOrdered.slice(0, 12).map((crop) => (
                <div key={crop} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cropColorMap[crop] }} />
                  <span className="text-[11px] text-text-muted capitalize">{crop}</span>
                </div>
              ))}
              {allCropsOrdered.length > 12 && (
                <span className="text-[11px] text-text-muted">+{allCropsOrdered.length - 12} more</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Crop Performance Table */}
      <div className="rounded-xl border border-border bg-bg-elevated mb-8 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-medium text-text-primary">Crop Performance</h2>
          <p className="text-xs text-text-muted mt-0.5">Click a row to see per-node breakdown</p>
        </div>
        {sortedCropRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted mb-3">
              <path d="M12 20V10M18 20V4M6 20v-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm text-text-muted">No crop performance data</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-surface/50">
                  {([
                    ["crop", "Crop Name"],
                    ["total", "Total Harvested"],
                    ["unit", "Unit"],
                    ["revenue", "Total Revenue"],
                    ["avgPrice", "Avg Price/Unit"],
                    ["count", "# Harvests"],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary cursor-pointer hover:text-text-primary transition-colors select-none whitespace-nowrap"
                    >
                      {label}
                      <SortIcon active={sortKey === key} dir={sortDir} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedCropRows.map((row) => {
                  const isExpanded = expandedCrop === row.crop;
                  return (
                    <Fragment key={row.crop}>
                      <tr
                        onClick={() => setExpandedCrop(isExpanded ? null : row.crop)}
                        className="border-b border-border/40 hover:bg-bg-surface/40 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-text-primary capitalize">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cropColorMap[row.crop] ?? "#6b7280" }} />
                            {row.crop}
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-text-secondary">{fmtWhole(row.total)}</td>
                        <td className="px-4 py-3 text-text-muted">{row.unit}</td>
                        <td className="px-4 py-3 tabular-nums text-emerald-400">${fmt(row.revenue)}</td>
                        <td className="px-4 py-3 tabular-nums text-text-secondary">${fmt(row.avgPrice)}</td>
                        <td className="px-4 py-3 tabular-nums text-text-secondary">{row.count}</td>
                      </tr>
                      {isExpanded && row.byNode.length > 0 && (
                        <tr className="bg-bg-surface/30">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="ml-4 space-y-1.5">
                              <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2">Per-Node Breakdown</p>
                              {row.byNode.map((bn) => (
                                <div key={bn.nodeId} className="flex items-center gap-3 text-xs">
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
                                    style={{
                                      backgroundColor: `${NODE_KIND_COLORS[bn.kind as keyof typeof NODE_KIND_COLORS] ?? "#6b7280"}20`,
                                      color: NODE_KIND_COLORS[bn.kind as keyof typeof NODE_KIND_COLORS] ?? "#6b7280",
                                    }}
                                  >
                                    {NODE_KIND_LABELS[bn.kind as keyof typeof NODE_KIND_LABELS] ?? bn.kind}
                                  </span>
                                  <span className="text-text-primary font-medium min-w-[100px]">{bn.nodeName}</span>
                                  <span className="text-text-secondary tabular-nums">{fmtWhole(bn.total)} {row.unit}</span>
                                  <span className="text-emerald-400 tabular-nums">${fmt(bn.revenue)}</span>
                                  <span className="text-text-muted">{bn.count} harvests</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-border bg-bg-elevated p-6">
          <h2 className="text-base font-medium text-text-primary mb-1">Top Producing Nodes</h2>
          <p className="text-xs text-text-muted mb-4">Ranked by total harvest amount</p>
          {topNodes.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No harvest data</p>
          ) : (
            <div className="space-y-2">
              {topNodes.map((item, rank) => {
                const kindColor = NODE_KIND_COLORS[item.node.kind] ?? "#6b7280";
                const barPct = topNodes[0].total > 0 ? (item.total / topNodes[0].total) * 100 : 0;
                return (
                  <div key={item.node.id} className="group">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-bold text-text-muted w-5 text-right tabular-nums">{rank + 1}</span>
                      <span className="text-sm font-medium text-text-primary flex-1 truncate">{item.node.name}</span>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: `${kindColor}20`, color: kindColor }}
                      >
                        {NODE_KIND_LABELS[item.node.kind]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 ml-8">
                      <div className="flex-1 h-2 rounded-full bg-bg-surface overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${barPct}%`, backgroundColor: kindColor, opacity: 0.7 }}
                        />
                      </div>
                      <span className="text-xs text-text-secondary tabular-nums shrink-0 min-w-[60px] text-right">{fmtWhole(item.total)}</span>
                      {item.revenue > 0 && (
                        <span className="text-xs text-emerald-400 tabular-nums shrink-0">${fmt(item.revenue)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-bg-elevated p-6">
          <h2 className="text-base font-medium text-text-primary mb-1">Seasonal Comparison</h2>
          <p className="text-xs text-text-muted mb-4">{selectedYear} vs {selectedYear - 1}</p>
          <div className="space-y-6">
            {comparisonItems.map((item) => {
              const curPct = comparisonMax > 0 ? (item.cur / comparisonMax) * 100 : 0;
              const prevPct = comparisonMax > 0 ? (item.prev / comparisonMax) * 100 : 0;
              const delta = item.prev > 0 ? ((item.cur - item.prev) / item.prev) * 100 : item.cur > 0 ? 100 : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-text-secondary">{item.label}</span>
                    {(item.cur > 0 || item.prev > 0) && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        delta > 0 ? "bg-emerald-500/10 text-emerald-400" : delta < 0 ? "bg-red-500/10 text-red-400" : "bg-bg-surface text-text-muted"
                      }`}>
                        {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted w-10 text-right tabular-nums">{selectedYear}</span>
                      <div className="flex-1 h-3.5 rounded bg-bg-surface overflow-hidden">
                        <div
                          className="h-full rounded transition-all duration-500"
                          style={{ width: `${curPct}%`, backgroundColor: "rgb(52, 211, 153)", opacity: 0.8 }}
                        />
                      </div>
                      <span className="text-xs text-text-primary font-medium tabular-nums min-w-[70px] text-right">
                        {item.prefix ?? ""}{typeof item.cur === "number" && item.prefix === "$" ? fmt(item.cur) : fmtWhole(item.cur)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted w-10 text-right tabular-nums">{selectedYear - 1}</span>
                      <div className="flex-1 h-3.5 rounded bg-bg-surface overflow-hidden">
                        <div
                          className="h-full rounded transition-all duration-500"
                          style={{ width: `${prevPct}%`, backgroundColor: "rgb(148, 163, 184)", opacity: 0.5 }}
                        />
                      </div>
                      <span className="text-xs text-text-muted tabular-nums min-w-[70px] text-right">
                        {item.prefix ?? ""}{typeof item.prev === "number" && item.prefix === "$" ? fmt(item.prev) : fmtWhole(item.prev)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="rounded-xl border border-border bg-bg-elevated p-6 mb-8">
        <h2 className="text-base font-medium text-text-primary mb-1">Activity Summary</h2>
        <p className="text-xs text-text-muted mb-4">Activity types logged this season</p>
        {activityCounts.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-text-muted">No activities logged for {selectedYear}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activityCounts.map(([action, count], i) => (
              <div key={action} className="flex items-center gap-3">
                <span className="text-xs text-text-secondary font-medium min-w-[120px] truncate capitalize" title={action}>{action}</span>
                <div className="flex-1 h-3 rounded-full bg-bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(count / activityMax) * 100}%`,
                      backgroundColor: CROP_COLORS[i % CROP_COLORS.length],
                      opacity: 0.7,
                    }}
                  />
                </div>
                <span className="text-xs text-text-primary font-semibold tabular-nums min-w-[2ch] text-right">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
