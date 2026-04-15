"use client";

import { useMemo, useState, useEffect } from "react";
import { useTaxPlanningStore } from "@/store/tax-planning-store";
import { estimateFederalIncomeTax } from "@/lib/tax-estimate";
import type { FilingStatus } from "@/lib/tax-estimate";

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function MoneyInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
      {hint && <p className="text-[10px] text-text-muted mb-1">{hint}</p>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
        <input
          type="number"
          min={0}
          step={100}
          value={value || ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className="w-full rounded-lg border border-border bg-bg-surface pl-7 pr-3 py-2 text-sm text-text-primary"
        />
      </div>
    </div>
  );
}

export default function TaxPlanningPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const s = useTaxPlanningStore();
  const setField = useTaxPlanningStore((x) => x.setField);

  const estimate = useMemo(
    () =>
      estimateFederalIncomeTax({
        filingStatus: s.filingStatus,
        w2Wages: s.w2Wages,
        k1ConstructionOrdinary: s.k1ConstructionOrdinary,
        k1FarmOrdinary: s.k1FarmOrdinary,
        farmGrossBefore179: s.farmGrossBefore179,
        section179: s.section179,
        shortTermCapitalGains: s.shortTermCapitalGains,
        longTermCapitalGains: s.longTermCapitalGains,
        qualifiedDividends: s.qualifiedDividends,
        ordinaryDividends: s.ordinaryDividends,
        otherOrdinaryIncome: s.otherOrdinaryIncome,
        itemizedDeductions: s.itemizedDeductions,
      }),
    [s]
  );

  if (!mounted) {
    return (
      <div className="h-full overflow-y-auto flex items-center justify-center text-text-muted text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 pb-16">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Tax planning</h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl">
            Model federal income tax from W-2, pass-through (K-1), investments, and optional farm business
            income. Built for multi-entity planning (e.g. S corp construction + future farm business) — not
            limited to farm-only income.
          </p>
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-text-secondary leading-relaxed">
            <strong className="text-amber-200">Not tax advice.</strong> This is a rough planner using
            approximate brackets and simplified investment / NIIT rules. It does not include AMT, state or
            local tax, payroll taxes, self-employment tax, credits (child, EITC, etc.), or your preparer's
            judgment. Consult a CPA or EA for filing decisions.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="rounded-xl border border-border bg-bg-elevated p-5">
              <h2 className="text-sm font-semibold text-text-primary mb-4">Profile</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Planning year</label>
                  <input
                    type="number"
                    value={s.taxYear}
                    onChange={(e) => setField("taxYear", Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Filing status</label>
                  <select
                    value={s.filingStatus}
                    onChange={(e) => setField("filingStatus", e.target.value as FilingStatus)}
                    className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
                  >
                    <option value="single">Single</option>
                    <option value="mfj">Married filing jointly</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-bg-elevated p-5">
              <h2 className="text-sm font-semibold text-text-primary mb-1">Ordinary income</h2>
              <p className="text-xs text-text-muted mb-4">
                W-2 and K-1 ordinary flow to your personal return. Short-term gains and non-qualified
                dividends are taxed as ordinary income.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MoneyInput
                  label="W-2 wages"
                  hint="Including from your S corp officer wages, if applicable."
                  value={s.w2Wages}
                  onChange={(n) => setField("w2Wages", n)}
                />
                <MoneyInput
                  label="K-1 ordinary — construction (S corp)"
                  hint="Net ordinary business income allocable to you."
                  value={s.k1ConstructionOrdinary}
                  onChange={(n) => setField("k1ConstructionOrdinary", n)}
                />
                <MoneyInput
                  label="Farm gross (before Section 179)"
                  hint="Expected Schedule F / farm K-1 ordinary before 179."
                  value={s.farmGrossBefore179}
                  onChange={(n) => setField("farmGrossBefore179", n)}
                />
                <MoneyInput
                  label="Section 179 (farm equipment)"
                  hint="Deduction capped by rules; planner subtracts from farm gross only."
                  value={s.section179}
                  onChange={(n) => setField("section179", n)}
                />
                <MoneyInput
                  label="K-1 ordinary — other pass-through"
                  hint="Second business (e.g. farm entity) if separate from line above."
                  value={s.k1FarmOrdinary}
                  onChange={(n) => setField("k1FarmOrdinary", n)}
                />
                <MoneyInput
                  label="Other ordinary income"
                  value={s.otherOrdinaryIncome}
                  onChange={(n) => setField("otherOrdinaryIncome", n)}
                />
                <MoneyInput
                  label="Short-term capital gains"
                  value={s.shortTermCapitalGains}
                  onChange={(n) => setField("shortTermCapitalGains", n)}
                />
                <MoneyInput
                  label="Ordinary (non-qualified) dividends"
                  value={s.ordinaryDividends}
                  onChange={(n) => setField("ordinaryDividends", n)}
                />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-bg-elevated p-5">
              <h2 className="text-sm font-semibold text-text-primary mb-1">Preferential investment income</h2>
              <p className="text-xs text-text-muted mb-4">
                Long-term capital gains and qualified dividends use lower federal rates (modeled as 0% / 15% /
                20% bands vs. your taxable income).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MoneyInput
                  label="Long-term capital gains"
                  value={s.longTermCapitalGains}
                  onChange={(n) => setField("longTermCapitalGains", n)}
                />
                <MoneyInput
                  label="Qualified dividends"
                  value={s.qualifiedDividends}
                  onChange={(n) => setField("qualifiedDividends", n)}
                />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-bg-elevated p-5">
              <h2 className="text-sm font-semibold text-text-primary mb-4">Deductions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Itemized deductions</label>
                  <p className="text-[10px] text-text-muted mb-1">
                    Leave empty to use standard deduction ({s.filingStatus === "single" ? "$14,600" : "$29,200"}{" "}
                    est.).
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      value={s.itemizedDeductions ?? ""}
                      placeholder="Standard"
                      onChange={(e) =>
                        setField(
                          "itemizedDeductions",
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                      className="w-full rounded-lg border border-border bg-bg-surface pl-7 pr-3 py-2 text-sm text-text-primary"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-bg-elevated p-5">
              <h2 className="text-sm font-semibold text-text-primary mb-2">Notes</h2>
              <textarea
                value={s.notes}
                onChange={(e) => setField("notes", e.target.value)}
                rows={4}
                placeholder="Assumptions, questions for your CPA, entity structure ideas…"
                className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-y min-h-[96px]"
              />
            </section>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-5 sticky top-4">
              <h2 className="text-sm font-semibold text-text-primary mb-4">Estimated federal income tax</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2 text-text-secondary">
                  <dt>Total ordinary (incl. ST gains &amp; ord. div.)</dt>
                  <dd className="text-text-primary tabular-nums">${fmt(estimate.totalOrdinaryIncome)}</dd>
                </div>
                <div className="flex justify-between gap-2 text-text-secondary">
                  <dt>Net farm ordinary (after 179)</dt>
                  <dd className="text-text-primary tabular-nums">${fmt(estimate.netFarmK1Ordinary)}</dd>
                </div>
                <div className="flex justify-between gap-2 text-text-secondary">
                  <dt>LTCG + qualified dividends</dt>
                  <dd className="text-text-primary tabular-nums">${fmt(estimate.preferentialIncome)}</dd>
                </div>
                <div className="border-t border-border/60 my-2 pt-2 flex justify-between gap-2 text-text-secondary">
                  <dt>Deduction used</dt>
                  <dd className="text-text-primary tabular-nums">${fmt(estimate.deductionUsed)}</dd>
                </div>
                <div className="flex justify-between gap-2 text-text-secondary">
                  <dt>Taxable income (approx.)</dt>
                  <dd className="text-text-primary tabular-nums">${fmt(estimate.taxableIncomeTotal)}</dd>
                </div>
                <div className="border-t border-border/60 my-2 pt-2 flex justify-between gap-2">
                  <dt className="text-text-secondary">Ordinary federal tax</dt>
                  <dd className="font-medium text-text-primary tabular-nums">${fmt(estimate.ordinaryFederalTax)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-text-secondary">LTCG / qualified federal tax</dt>
                  <dd className="font-medium text-text-primary tabular-nums">
                    ${fmt(estimate.preferentialFederalTax)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-text-secondary">NIIT (est.)</dt>
                  <dd className="font-medium text-text-primary tabular-nums">${fmt(estimate.niit)}</dd>
                </div>
                <div className="border-t border-accent/30 pt-3 flex justify-between gap-2 items-baseline">
                  <dt className="text-base font-semibold text-text-primary">Total federal (est.)</dt>
                  <dd className="text-xl font-bold text-accent tabular-nums">
                    ${fmt(estimate.totalFederalIncomeTax)}
                  </dd>
                </div>
                <p className="text-[10px] text-text-muted pt-2">
                  Effective rate on total income: {estimate.effectiveRateOnTotalIncome}%
                </p>
              </dl>
            </div>

            <button
              type="button"
              onClick={() => useTaxPlanningStore.getState().reset()}
              className="w-full rounded-lg border border-border px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors"
            >
              Reset inputs to zero
            </button>
          </div>
        </div>

        <section className="mt-12 rounded-xl border border-border bg-bg-elevated p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Ideas to discuss with your CPA</h2>
          <p className="text-xs text-text-muted mb-6">
            Creative planning depends on facts, basis, at-risk rules, passive activity limits, and
            substance-over-form. The items below are conversation starters, not recommendations.
          </p>

          <ul className="space-y-6 text-sm text-text-secondary">
            <li>
              <h3 className="font-medium text-text-primary mb-1">Section 179 and bonus depreciation</h3>
              <p>
                Qualifying farm machinery and equipment can often be expensed faster than the default
                recovery period, reducing taxable income from the farm business (subject to business income
                limits and other rules). Coordinate with your S corp separately.
              </p>
            </li>
            <li>
              <h3 className="font-medium text-text-primary mb-1">Retirement plans (S corp)</h3>
              <p>
                W-2 wages from your S corp affect how much you can defer to a 401(k) or fund a SEP/Solo 401(k)
                if you also have self-employment income elsewhere. Reduces federal income tax today; tradeoffs
                on cash flow.
              </p>
            </li>
            <li>
              <h3 className="font-medium text-text-primary mb-1">Loans between entities vs. contributions</h3>
              <p>
                A loan from your construction company to a farm entity must be real debt: written terms,
                market interest, repayment, and documentation. It is not a substitute for taxable income if
                the substance is really a distribution or equity shift. Misclassified transactions invite IRS
                scrutiny.
              </p>
            </li>
            <li>
              <h3 className="font-medium text-text-primary mb-1">Timing and buckets</h3>
              <p>
                Deferring invoices, accelerating expenses (where allowed), harvesting gains in lower-income
                years, and bunching charitable contributions can change which bracket you land in.
              </p>
            </li>
            <li>
              <h3 className="font-medium text-text-primary mb-1">Farm-specific</h3>
              <p>
                Conservation programs, soil health incentives, and certain fuel or equipment credits change
                year to year. A farm CPA will map these to Schedule F or your farm pass-through.
              </p>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
