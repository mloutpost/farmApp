/**
 * Rough U.S. federal income tax estimates for personal planning — not tax advice.
 * Uses approximate 2024 bracket widths and standard deductions; actual law, AMT,
 * credits, and state taxes are not modeled.
 */

export type FilingStatus = "single" | "mfj";

const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 14600,
  mfj: 29200,
};

/** Ordinary income brackets (2024, taxable income) */
const ORDINARY_BRACKETS: Record<FilingStatus, Array<{ upTo: number; rate: number }>> = {
  single: [
    { upTo: 11600, rate: 0.1 },
    { upTo: 47150, rate: 0.12 },
    { upTo: 100525, rate: 0.22 },
    { upTo: 191950, rate: 0.24 },
    { upTo: 243725, rate: 0.32 },
    { upTo: 609350, rate: 0.35 },
    { upTo: Number.POSITIVE_INFINITY, rate: 0.37 },
  ],
  mfj: [
    { upTo: 23200, rate: 0.1 },
    { upTo: 94300, rate: 0.12 },
    { upTo: 201050, rate: 0.22 },
    { upTo: 383900, rate: 0.24 },
    { upTo: 487450, rate: 0.32 },
    { upTo: 731200, rate: 0.35 },
    { upTo: Number.POSITIVE_INFINITY, rate: 0.37 },
  ],
};

/** Top of 0% LTCG / qualified dividend bracket (taxable income incl. gains) */
const LTCG_0_PCT_TOP: Record<FilingStatus, number> = {
  single: 47025,
  mfj: 94150,
};

const LTCG_15_PCT_TOP: Record<FilingStatus, number> = {
  single: 518900,
  mfj: 583750,
};

/** NIIT thresholds (MAGI) */
const NIIT_THRESHOLD: Record<FilingStatus, number> = {
  single: 200000,
  mfj: 250000,
};

export function progressiveOrdinaryTax(taxableOrdinary: number, status: FilingStatus): number {
  if (taxableOrdinary <= 0) return 0;
  const brackets = ORDINARY_BRACKETS[status];
  let remaining = taxableOrdinary;
  let tax = 0;
  let prevTop = 0;
  for (const b of brackets) {
    const width = b.upTo - prevTop;
    const slice = Math.min(remaining, width);
    if (slice > 0) tax += slice * b.rate;
    remaining -= slice;
    prevTop = b.upTo;
    if (remaining <= 0) break;
  }
  return Math.round(tax * 100) / 100;
}

/**
 * Simplified LTCG + qualified dividend tax: stacks gains after ordinary taxable income
 * for 0% / 15% / 20% bands (approximation).
 */
export function preferentialInvestmentTax(
  taxableOrdinaryBeforeGains: number,
  longTermAndQualified: number,
  status: FilingStatus
): number {
  if (longTermAndQualified <= 0) return 0;
  const top0 = LTCG_0_PCT_TOP[status];
  const top15 = LTCG_15_PCT_TOP[status];

  let gainRemaining = longTermAndQualified;
  let tax = 0;

  const start = Math.max(0, taxableOrdinaryBeforeGains);
  const room0 = Math.max(0, top0 - start);
  const at0 = Math.min(gainRemaining, room0);
  tax += at0 * 0;
  gainRemaining -= at0;

  const start15 = start + at0;
  const room15 = Math.max(0, top15 - start15);
  const at15 = Math.min(gainRemaining, room15);
  tax += at15 * 0.15;
  gainRemaining -= at15;

  tax += gainRemaining * 0.2;
  return Math.round(tax * 100) / 100;
}

export interface TaxEstimateInput {
  filingStatus: FilingStatus;
  w2Wages: number;
  /** Box 1 ordinary from construction S-corp K-1 (after corp-level deductions) */
  k1ConstructionOrdinary: number;
  /** Optional second pass-through (e.g. farm LLC/S-corp) */
  k1FarmOrdinary: number;
  /** Farm gross before Section 179 (planning); net to K-1 is reduced by deduction */
  farmGrossBefore179: number;
  section179: number;
  shortTermCapitalGains: number;
  longTermCapitalGains: number;
  qualifiedDividends: number;
  ordinaryDividends: number;
  otherOrdinaryIncome: number;
  /** If set, replaces standard deduction */
  itemizedDeductions: number | null;
}

export interface TaxEstimateResult {
  netFarmK1Ordinary: number;
  totalOrdinaryIncome: number;
  preferentialIncome: number;
  standardDeduction: number;
  deductionUsed: number;
  /** Ordinary slice of taxable income after deduction */
  taxableOrdinary: number;
  /** Preferential slice of taxable income after deduction */
  taxablePreferential: number;
  taxableIncomeTotal: number;
  ordinaryFederalTax: number;
  preferentialFederalTax: number;
  /** 3.8% on net investment income above threshold (simplified) */
  niit: number;
  totalFederalIncomeTax: number;
  effectiveRateOnTotalIncome: number;
}

export function estimateFederalIncomeTax(input: TaxEstimateInput): TaxEstimateResult {
  const sd = STANDARD_DEDUCTION[input.filingStatus];
  const deductionUsed =
    input.itemizedDeductions != null && input.itemizedDeductions > sd
      ? input.itemizedDeductions
      : sd;

  const netFarm = Math.max(0, input.farmGrossBefore179 - Math.max(0, input.section179));

  const totalOrdinary =
    input.w2Wages +
    input.k1ConstructionOrdinary +
    netFarm +
    input.k1FarmOrdinary +
    input.shortTermCapitalGains +
    input.ordinaryDividends +
    input.otherOrdinaryIncome;

  const preferentialIncome = Math.max(0, input.longTermCapitalGains + input.qualifiedDividends);

  const combinedIncome = totalOrdinary + preferentialIncome;
  const taxableIncome = Math.max(0, combinedIncome - deductionUsed);
  const ordinaryPortion = Math.min(totalOrdinary, taxableIncome);
  const preferentialPortion = taxableIncome - ordinaryPortion;

  const ordinaryFederalTax = progressiveOrdinaryTax(ordinaryPortion, input.filingStatus);
  const preferentialFederalTax = preferentialInvestmentTax(
    ordinaryPortion,
    preferentialPortion,
    input.filingStatus
  );

  const magiApprox = totalOrdinary + preferentialIncome;
  const niiApprox = preferentialIncome + input.ordinaryDividends + input.shortTermCapitalGains;
  const niitThreshold = NIIT_THRESHOLD[input.filingStatus];
  const niitBase = Math.max(0, Math.min(niiApprox, magiApprox - niitThreshold));
  const niit = niitBase > 0 ? Math.round(niitBase * 0.038 * 100) / 100 : 0;

  const totalFederalIncomeTax = ordinaryFederalTax + preferentialFederalTax + niit;

  const totalIncome = totalOrdinary + preferentialIncome;
  const effectiveRateOnTotalIncome =
    totalIncome > 0 ? Math.round((totalFederalIncomeTax / totalIncome) * 10000) / 100 : 0;

  return {
    netFarmK1Ordinary: Math.round(netFarm * 100) / 100,
    totalOrdinaryIncome: Math.round(totalOrdinary * 100) / 100,
    preferentialIncome: Math.round(preferentialIncome * 100) / 100,
    standardDeduction: sd,
    deductionUsed: Math.round(deductionUsed * 100) / 100,
    taxableOrdinary: Math.round(ordinaryPortion * 100) / 100,
    taxablePreferential: Math.round(preferentialPortion * 100) / 100,
    taxableIncomeTotal: Math.round(taxableIncome * 100) / 100,
    ordinaryFederalTax,
    preferentialFederalTax,
    niit,
    totalFederalIncomeTax,
    effectiveRateOnTotalIncome,
  };
}
