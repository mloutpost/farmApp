"use client";

import { useRef } from "react";
import type { FenceBomResult } from "@/lib/fence-bom";

export default function BOMTable({ bom }: { bom: FenceBomResult }) {
  const tableRef = useRef<HTMLTableElement>(null);

  const handleExportCSV = () => {
    const rows = [
      ["Item", "Quantity", "Unit", "Notes"],
      ...bom.items.map((i) => [i.name, String(i.quantity), i.unit, i.notes ?? ""]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fence-bom-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>Fence BOM</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 24px; }
          h1 { font-size: 18px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
          th { background: #f5f5f5; }
          .meta { margin-bottom: 16px; color: #666; font-size: 14px; }
        </style>
        </head>
        <body>
          <h1>Fence Bill of Materials</h1>
          <div class="meta">
            Length: ${bom.lengthFt.toLocaleString()} ft | 
            Corner posts: ${bom.cornerPosts} | 
            Line posts: ${bom.linePosts} | 
            Gates: ${bom.gates}${bom.gates ? ` (${bom.gateWidthFt} ft)` : ""}
          </div>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Notes</th></tr></thead>
            <tbody>
              ${bom.items.map((i) => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${i.unit}</td><td>${i.notes ?? ""}</td></tr>`).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Bill of Materials</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-surface transition-colors"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-surface transition-colors"
          >
            Print
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table ref={tableRef} className="w-full text-sm">
          <thead>
            <tr className="bg-bg-surface">
              <th className="text-left px-3 py-2 font-medium text-text-secondary">Item</th>
              <th className="text-right px-3 py-2 font-medium text-text-secondary">Qty</th>
              <th className="text-left px-3 py-2 font-medium text-text-secondary">Unit</th>
              <th className="text-left px-3 py-2 font-medium text-text-secondary">Notes</th>
            </tr>
          </thead>
          <tbody>
            {bom.items.map((item, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-2 text-text-primary">{item.name}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text-primary">{item.quantity}</td>
                <td className="px-3 py-2 text-text-secondary">{item.unit}</td>
                <td className="px-3 py-2 text-xs text-text-muted">{item.notes ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
