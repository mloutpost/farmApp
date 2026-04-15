import type {
  FarmNode,
  FarmProfile,
  FinancialEntry,
  FarmTask,
} from "@/types";
import { NODE_KIND_LABELS } from "@/types";
import type { CropEntry } from "@/lib/crop-catalog";
import { buildSpringQuickStartHtml } from "@/lib/spring-quick-start";

export function formatCurrency(amount: number): string {
  return `$${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateTable(headers: string[], rows: string[][]): string {
  const ths = headers.map((h) => `<th>${h}</th>`).join("");
  const trs = rows
    .map(
      (r, i) =>
        `<tr class="${i % 2 ? "alt" : ""}">${r.map((c) => `<td>${c}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

const baseStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px 24px; line-height: 1.5; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 16px; margin: 28px 0 10px; border-bottom: 2px solid #222; padding-bottom: 4px; }
  h3 { font-size: 14px; margin: 18px 0 6px; }
  .subtitle { color: #555; font-size: 13px; margin-bottom: 20px; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 12px 0 20px; }
  .stat { border: 1px solid #ddd; border-radius: 6px; padding: 10px 12px; }
  .stat-label { font-size: 11px; text-transform: uppercase; color: #666; }
  .stat-value { font-size: 18px; font-weight: 600; }
  .profit { color: #16a34a; }
  .loss { color: #dc2626; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 13px; }
  th { background: #f3f4f6; text-align: left; padding: 6px 8px; border: 1px solid #ddd; font-weight: 600; }
  td { padding: 6px 8px; border: 1px solid #ddd; }
  tr.alt td { background: #fafafa; }
  .thumb { width: 80px; height: 60px; object-fit: cover; border-radius: 4px; margin: 2px; }
  @media print {
    body { padding: 0; max-width: none; }
    @page { size: auto; margin: 18mm 15mm; }
    h2 { break-after: avoid; }
    table { break-inside: auto; }
    tr { break-inside: avoid; }
  }
`;

const springReportExtraStyles = `
  .frost-line { font-size: 13px; color: #333; margin: -8px 0 16px; font-weight: 500; }
  .disclaimer { font-size: 11px; color: #666; margin-bottom: 20px; padding: 8px 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e5e7eb; }
  .crop-card { page-break-inside: avoid; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }
  .crop-card:last-child { border-bottom: none; }
  .crop-card h2 { font-size: 16px; margin: 0 0 4px; border: none; }
  .crop-card .cat { font-size: 11px; color: #64748b; font-weight: 500; margin-left: 6px; }
  .botanical { font-style: italic; color: #64748b; font-size: 12px; margin: 0 0 12px; }
  .crop-card h3 { font-size: 13px; margin: 14px 0 6px; border: none; }
  .crop-card .specs { margin: 0 0 8px; padding-left: 18px; font-size: 12px; }
  .crop-card .notes { font-size: 12px; }
  .crop-card ul { font-size: 12px; margin: 6px 0; padding-left: 18px; }
`;

function openReport(title: string, body: string, farmName: string, extraStyles = "") {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>${baseStyles}${extraStyles}</style></head><body>
<header><h1>${farmName}</h1></header>${body}
<script>window.onload=()=>setTimeout(()=>window.print(),400);<\/script>
</body></html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

function stat(label: string, value: string, cls = "") {
  return `<div class="stat"><div class="stat-label">${label}</div><div class="stat-value ${cls}">${value}</div></div>`;
}

function plColor(amount: number) {
  return amount >= 0 ? "profit" : "loss";
}

export function exportSeasonReport(
  nodes: FarmNode[],
  profile: FarmProfile,
  finances: FinancialEntry[],
  tasks: FarmTask[],
  season: number,
): void {
  const seasonFinances = finances.filter((f) => f.season === season);
  const allHarvests = nodes.flatMap((n) =>
    n.harvestLog.filter((h) => h.season === season),
  );
  const totalHarvested = allHarvests.reduce((s, h) => s + h.amount, 0);
  const totalRevenue = seasonFinances
    .filter((f) => f.type === "revenue")
    .reduce((s, f) => s + f.amount, 0);
  const totalExpenses = seasonFinances
    .filter((f) => f.type === "expense")
    .reduce((s, f) => s + f.amount, 0);
  const net = totalRevenue - totalExpenses;

  // Crop performance
  const cropMap = new Map<string, { amount: number; unit: string; revenue: number }>();
  for (const h of allHarvests) {
    const c = cropMap.get(h.crop) ?? { amount: 0, unit: h.unit, revenue: 0 };
    c.amount += h.amount;
    c.revenue += h.revenue ?? 0;
    cropMap.set(h.crop, c);
  }
  const cropRows = [...cropMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([crop, d]) => [crop, d.amount.toFixed(1), d.unit, formatCurrency(d.revenue)]);

  // Top 5 nodes
  const nodeHarvests = nodes
    .map((n) => ({
      name: n.name,
      kind: NODE_KIND_LABELS[n.kind],
      total: n.harvestLog
        .filter((h) => h.season === season)
        .reduce((s, h) => s + h.amount, 0),
    }))
    .filter((n) => n.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const topRows = nodeHarvests.map((n) => [n.name, n.kind, n.total.toFixed(1)]);

  // Revenue/expense by category
  const revByCat = new Map<string, number>();
  const expByCat = new Map<string, number>();
  for (const f of seasonFinances) {
    const m = f.type === "revenue" ? revByCat : expByCat;
    m.set(f.category, (m.get(f.category) ?? 0) + f.amount);
  }
  const revRows = [...revByCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, a]) => [c, formatCurrency(a)]);
  const expRows = [...expByCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, a]) => [c, formatCurrency(a)]);

  // Task completion
  const seasonTasks = tasks.filter((t) => {
    const yr = t.dueDate ? new Date(t.dueDate).getFullYear() : null;
    return yr === season;
  });
  const completed = seasonTasks.filter((t) => t.status === "done").length;
  const rate = seasonTasks.length ? ((completed / seasonTasks.length) * 100).toFixed(0) : "N/A";

  // Plantings
  const plantings: { node: string; crop: string; variety: string; date: string; status: string }[] = [];
  for (const n of nodes) {
    const d = n.data;
    const beds = "beds" in d ? (d as { beds: { plantings: { crop: string; variety?: string; datePlanted?: string; status: string; season?: number }[] }[] }).beds : [];
    for (const b of beds) {
      for (const p of b.plantings) {
        if (p.season === season || (!p.season && p.datePlanted?.startsWith(String(season)))) {
          plantings.push({ node: n.name, crop: p.crop, variety: p.variety ?? "—", date: p.datePlanted ?? "Planned", status: p.status });
        }
      }
    }
    if ("kind" in d && d.kind === "field" && (d as { datePlanted?: string }).datePlanted?.startsWith(String(season))) {
      const fd = d as { currentCrop?: string; currentVariety?: string; datePlanted?: string };
      plantings.push({ node: n.name, crop: fd.currentCrop ?? "—", variety: fd.currentVariety ?? "—", date: fd.datePlanted ?? "—", status: "planted" });
    }
  }
  const plantRows = plantings.map((p) => [p.node, p.crop, p.variety, p.date, p.status]);

  const body = `
<div class="subtitle">${season} Season Report &middot; Generated ${new Date().toLocaleDateString()}</div>
<h2>Executive Summary</h2>
<div class="summary-grid">
  ${stat("Total Nodes", String(nodes.length))}
  ${stat("Total Harvested", totalHarvested.toFixed(1))}
  ${stat("Revenue", formatCurrency(totalRevenue), "profit")}
  ${stat("Expenses", formatCurrency(totalExpenses), "loss")}
  ${stat("Net Profit", (net < 0 ? "-" : "") + formatCurrency(net), plColor(net))}
  ${stat("Task Completion", rate === "N/A" ? rate : rate + "%")}
</div>
<h2>Crop Performance</h2>
${cropRows.length ? generateTable(["Crop", "Harvested", "Unit", "Revenue"], cropRows) : "<p>No harvest data.</p>"}
<h2>Top Producing Nodes</h2>
${topRows.length ? generateTable(["Node", "Kind", "Total Harvested"], topRows) : "<p>No data.</p>"}
<h2>Financial Summary</h2>
<h3>Revenue by Category</h3>
${revRows.length ? generateTable(["Category", "Amount"], revRows) : "<p>No revenue.</p>"}
<h3>Expenses by Category</h3>
${expRows.length ? generateTable(["Category", "Amount"], expRows) : "<p>No expenses.</p>"}
<h2>Task Completion</h2>
<p>${completed} of ${seasonTasks.length} tasks completed (${rate}${rate !== "N/A" ? "%" : ""})</p>
<h2>Planting Schedule</h2>
${plantRows.length ? generateTable(["Node", "Crop", "Variety", "Date", "Status"], plantRows) : "<p>No plantings recorded.</p>"}`;

  openReport(`${profile.name} – ${season} Season Report`, body, profile.name);
}

export function exportNodeReport(node: FarmNode, profile: FarmProfile): void {
  const soilTests: { date: string; ph?: number; n?: number; p?: number; k?: number }[] = [];
  if ("soilTests" in node.data) {
    for (const t of (node.data as { soilTests: { date: string; ph?: number; nitrogen?: number; phosphorus?: number; potassium?: number }[] }).soilTests) {
      soilTests.push({ date: t.date, ph: t.ph, n: t.nitrogen, p: t.phosphorus, k: t.potassium });
    }
  }

  const plantings: { crop: string; variety: string; date: string; status: string }[] = [];
  if ("beds" in node.data) {
    for (const b of (node.data as { beds: { plantings: { crop: string; variety?: string; datePlanted?: string; status: string }[] }[] }).beds) {
      for (const p of b.plantings) plantings.push({ crop: p.crop, variety: p.variety ?? "—", date: p.datePlanted ?? "—", status: p.status });
    }
  }
  if ("plantings" in node.data) {
    for (const p of (node.data as { plantings: { crop: string; variety?: string; datePlanted?: string; status: string }[] }).plantings) {
      plantings.push({ crop: p.crop, variety: p.variety ?? "—", date: p.datePlanted ?? "—", status: p.status });
    }
  }

  const harvestRows = node.harvestLog.map((h) => [h.date, h.crop, String(h.amount), h.unit, h.revenue ? formatCurrency(h.revenue) : "—"]);
  const activityRows = node.activityLog.map((a) => [a.date, a.action, a.notes ?? "—"]);
  const soilRows = soilTests.map((s) => [s.date, s.ph?.toFixed(1) ?? "—", String(s.n ?? "—"), String(s.p ?? "—"), String(s.k ?? "—")]);
  const plantRows = plantings.map((p) => [p.crop, p.variety, p.date, p.status]);
  const photos = node.photos.slice(0, 12);

  const body = `
<div class="subtitle">${NODE_KIND_LABELS[node.kind]} &middot; Created ${new Date(node.createdAt).toLocaleDateString()} &middot; Generated ${new Date().toLocaleDateString()}</div>
<h2>${node.name}</h2>
<h3>Harvest Log</h3>
${harvestRows.length ? generateTable(["Date", "Crop", "Amount", "Unit", "Revenue"], harvestRows) : "<p>No harvests.</p>"}
<h3>Activity Log</h3>
${activityRows.length ? generateTable(["Date", "Action", "Notes"], activityRows) : "<p>No activities.</p>"}
${soilRows.length ? `<h3>Soil Tests</h3>${generateTable(["Date", "pH", "N", "P", "K"], soilRows)}` : ""}
${plantRows.length ? `<h3>Current Plantings</h3>${generateTable(["Crop", "Variety", "Date Planted", "Status"], plantRows)}` : ""}
${photos.length ? `<h3>Photos</h3><div>${photos.map((p) => `<img class="thumb" src="${p.dataUrl}" alt="${p.caption ?? ""}">`).join("")}</div>` : ""}`;

  openReport(`${node.name} – Node Report`, body, profile.name);
}

export function exportFinancialReport(
  finances: FinancialEntry[],
  profile: FarmProfile,
  season: number,
): void {
  const sf = finances.filter((f) => f.season === season);
  const revenue = sf.filter((f) => f.type === "revenue");
  const expenses = sf.filter((f) => f.type === "expense");
  const totalRev = revenue.reduce((s, f) => s + f.amount, 0);
  const totalExp = expenses.reduce((s, f) => s + f.amount, 0);
  const net = totalRev - totalExp;

  const revByCat = new Map<string, number>();
  for (const r of revenue) revByCat.set(r.category, (revByCat.get(r.category) ?? 0) + r.amount);
  const expByCat = new Map<string, number>();
  for (const e of expenses) expByCat.set(e.category, (expByCat.get(e.category) ?? 0) + e.amount);

  const revRows = [...revByCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, a]) => [c, formatCurrency(a)]);
  const expRows = [...expByCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, a]) => [c, formatCurrency(a)]);

  // Monthly cash flow
  const monthly = new Map<string, { rev: number; exp: number }>();
  for (const f of sf) {
    const m = f.date.slice(0, 7);
    const entry = monthly.get(m) ?? { rev: 0, exp: 0 };
    if (f.type === "revenue") entry.rev += f.amount;
    else entry.exp += f.amount;
    monthly.set(m, entry);
  }
  const cashRows = [...monthly.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, d]) => {
      const n = d.rev - d.exp;
      return [m, formatCurrency(d.rev), formatCurrency(d.exp), `<span class="${plColor(n)}">${n < 0 ? "-" : ""}${formatCurrency(n)}</span>`];
    });

  const body = `
<div class="subtitle">${season} Financial Report &middot; Generated ${new Date().toLocaleDateString()}</div>
<h2>Profit &amp; Loss Summary</h2>
<div class="summary-grid">
  ${stat("Total Revenue", formatCurrency(totalRev), "profit")}
  ${stat("Total Expenses", formatCurrency(totalExp), "loss")}
  ${stat("Net " + (net >= 0 ? "Profit" : "Loss"), (net < 0 ? "-" : "") + formatCurrency(net), plColor(net))}
</div>
<h2>Revenue by Category</h2>
${revRows.length ? generateTable(["Category", "Amount"], revRows) : "<p>No revenue.</p>"}
<h2>Expenses by Category</h2>
${expRows.length ? generateTable(["Category", "Amount"], expRows) : "<p>No expenses.</p>"}
<h2>Monthly Cash Flow</h2>
${cashRows.length ? generateTable(["Month", "Revenue", "Expenses", "Net"], cashRows) : "<p>No transactions.</p>"}`;

  openReport(`${profile.name} – ${season} Financial Report`, body, profile.name);
}

/** Printable spring planting guide from selected catalog crops (use browser Print → Save as PDF). */
export function exportSpringQuickStartPrint(entries: CropEntry[], profile: FarmProfile, year: number): void {
  if (entries.length === 0) return;
  const inner = buildSpringQuickStartHtml(entries, profile.name, year, {
    lastFrostSpring: profile.lastFrostSpring,
    hardinessZone: profile.hardinessZone,
  });
  openReport(`${profile.name} – Spring Quick Start ${year}`, inner, profile.name, springReportExtraStyles);
}
