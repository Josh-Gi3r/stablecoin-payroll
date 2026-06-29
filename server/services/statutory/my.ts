/**
 * Malaysia statutory contribution engine.
 *
 * Schemes:
 *   - EPF (KWSP) — Employees Provident Fund
 *   - SOCSO (PERKESO) — Employment Injury + Invalidity (Cat 1) / Employment Injury only (Cat 2)
 *   - EIS (PERKESO) — Employment Insurance System
 *   - HRD Corp Levy — Human Resources Development Fund
 *   - PCB (LHDN) — Monthly Tax Deduction
 *
 * References:
 *   - EPF Act 1991, Third Schedule (post-Oct 2025 foreign-worker amendment)
 *   - PERKESO Act 4, contribution table effective 1 Sep 2022 (RM5,000 cap)
 *     extended to RM6,000 effective 1 Oct 2024
 *   - HRD Corp Act 2001, Pembangunan Sumber Manusia Berhad Act
 *   - Income Tax Act 1967, Schedular Tax Deduction (PCB) rules
 */

export type Nationality = 'malaysian' | 'pr' | 'foreign';
export type AgeGroup = 'below_60' | 'above_60';
export type PcbCategory = 'KA1' | 'KA2' | 'KA3'; // 1=single, 2=married+spouse-not-working, 3=married+both-working

export interface MyEmployeeContext {
  nationality: Nationality;
  ageGroup: AgeGroup;
  pcbCategory: PcbCategory;
  numChildren?: number;       // for additional KA1/2/3 reliefs
  zakatMonthly?: number;
  cp38Amount?: number;
  hrdfEligible?: boolean;     // employer is HRD-Corp-registered (10+ employees in eligible sector)
}

export interface MyContribution {
  epfEmployee: number;
  epfEmployer: number;
  socsoEmployee: number;
  socsoEmployer: number;
  eisEmployee: number;
  eisEmployer: number;
  hrdfEmployer: number;       // HRD Corp levy (employer-only)
  pcb: number;                // employee-only
  zakat: number;              // employee-only, optional
  cp38: number;               // employee-only, court-order tax deduction
  totalEmployeeDeductions: number;
  totalEmployerCost: number;
}

// ---------------------------------------------------------------------------
// EPF — Third Schedule, post-Oct 2025
// ---------------------------------------------------------------------------
// From 1 Oct 2025, foreign workers (non-Malaysian, non-PR) become subject to
// EPF at 2% EE / 2% ER (was a flat RM 5 ER under the old voluntary regime).
// Malaysians + PRs:
//   - aged < 60: EE 11%, ER 13% on wages ≤ RM5,000; ER 12% above
//   - aged ≥ 60: EE 0%,  ER 4%
// Reference: KWSP Third Schedule + Section 43(1).
// ---------------------------------------------------------------------------
export function calculateEpf(wage: number, ctx: MyEmployeeContext): { ee: number; er: number } {
  if (wage <= 0) return { ee: 0, er: 0 };

  if (ctx.nationality === 'foreign') {
    // Post-Oct 2025: 2%/2%, applied to actual wage (no statutory ceiling for EPF).
    return { ee: round(wage * 0.02), er: round(wage * 0.02) };
  }

  // Malaysian or PR
  if (ctx.ageGroup === 'above_60') {
    return { ee: 0, er: round(wage * 0.04) };
  }
  const ee = round(wage * 0.11);
  const erRate = wage <= 5000 ? 0.13 : 0.12;
  const er = round(wage * erRate);
  return { ee, er };
}

// ---------------------------------------------------------------------------
// SOCSO — PERKESO contribution table, Cat 1 (Employment Injury + Invalidity)
// ---------------------------------------------------------------------------
// Wage cap raised to RM6,000 effective 1 Oct 2024. Above cap, contribution is
// computed against RM6,000.
//
// We use the percentage method (functionally equivalent to the rounded band
// table for an EOR demo): EE 0.5%, ER 1.75% of capped wage. Foreign workers
// are Category 2 (Employment Injury only): ER 1.25%, EE 0%.
// ---------------------------------------------------------------------------
const SOCSO_WAGE_CAP = 6000;

export function calculateSocso(wage: number, ctx: MyEmployeeContext): { ee: number; er: number } {
  if (wage <= 0) return { ee: 0, er: 0 };
  const cappedWage = Math.min(wage, SOCSO_WAGE_CAP);

  if (ctx.nationality === 'foreign') {
    // Category 2 — Employment Injury only.
    return { ee: 0, er: round(cappedWage * 0.0125) };
  }

  if (ctx.ageGroup === 'above_60') {
    // Above 60: Category 2 — Employment Injury only.
    return { ee: 0, er: round(cappedWage * 0.0125) };
  }

  // Category 1 — full Employment Injury + Invalidity Scheme.
  return {
    ee: round(cappedWage * 0.005),
    er: round(cappedWage * 0.0175),
  };
}

// ---------------------------------------------------------------------------
// EIS — PERKESO Employment Insurance System (Act 800)
// ---------------------------------------------------------------------------
// EE 0.2%, ER 0.2% of capped wage (RM 6,000 cap from Oct 2024).
// Coverage: Malaysian citizens + PRs only, age 18–60. Foreign workers + age
// 60+ excluded.
// ---------------------------------------------------------------------------
const EIS_WAGE_CAP = 6000;

export function calculateEis(wage: number, ctx: MyEmployeeContext): { ee: number; er: number } {
  if (wage <= 0) return { ee: 0, er: 0 };
  if (ctx.nationality === 'foreign') return { ee: 0, er: 0 };
  if (ctx.ageGroup === 'above_60') return { ee: 0, er: 0 };
  const cappedWage = Math.min(wage, EIS_WAGE_CAP);
  return { ee: round(cappedWage * 0.002), er: round(cappedWage * 0.002) };
}

// ---------------------------------------------------------------------------
// HRD Corp Levy — Pembangunan Sumber Manusia Berhad Act 2001
// ---------------------------------------------------------------------------
// 1% of monthly basic salary + fixed allowances, employer-only. Mandatory for
// employers with ≥10 Malaysian employees in HRD-eligible sectors. 0.5% optional
// for 5–9 employees.
// We pass through `hrdfEligible` from the employer profile; if false, levy = 0.
// ---------------------------------------------------------------------------
export function calculateHrdf(wage: number, ctx: MyEmployeeContext): number {
  if (!ctx.hrdfEligible) return 0;
  if (ctx.nationality === 'foreign') return 0; // foreign workers not levy-bearing
  return round(wage * 0.01);
}

// ---------------------------------------------------------------------------
// PCB MTD — Monthly Tax Deduction
// ---------------------------------------------------------------------------
// LHDN Schedular Tax Deduction. Real PCB uses LHDN's PCB e-Calculator with:
//   - Annual taxable income = (monthly chargeable × 12) - reliefs
//   - Lookup against LHDN tax brackets
//   - Adjusted for marriage status (Cat 1/2/3) + child relief
//   - Less zakat + CP38
//
// We implement an approximation good enough for payslip estimation:
//   - Annualize gross net of EPF (EPF deduction is a tax relief)
//   - Apply standard reliefs by category
//   - Apply 2025 progressive brackets
//   - Divide by 12 → monthly PCB
//   - Less zakat + cp38
//
// Categories:
//   KA1 — single. Personal relief RM 9,000. EPF relief up to RM 4,000.
//   KA2 — married, spouse not working. Personal RM 9,000 + spouse RM 4,000 + EPF.
//   KA3 — married, both working. Each files KA1 effectively + child relief if claimed.
//
// Reference: Income Tax Act 1967 + Budget 2025 amendments.
// ---------------------------------------------------------------------------
const MY_TAX_BRACKETS_2025 = [
  { upTo: 5000,    rate: 0,    cumulative: 0      },
  { upTo: 20000,   rate: 0.01, cumulative: 0      },
  { upTo: 35000,   rate: 0.03, cumulative: 150    },
  { upTo: 50000,   rate: 0.06, cumulative: 600    },
  { upTo: 70000,   rate: 0.11, cumulative: 1500   },
  { upTo: 100000,  rate: 0.19, cumulative: 3700   },
  { upTo: 400000,  rate: 0.25, cumulative: 9400   },
  { upTo: 600000,  rate: 0.26, cumulative: 84400  },
  { upTo: 2000000, rate: 0.28, cumulative: 136400 },
  { upTo: Infinity,rate: 0.30, cumulative: 528400 },
];

export function calculatePcb(
  monthlyWage: number,
  ctx: MyEmployeeContext,
  monthlyEpfRelief: number,
): number {
  if (monthlyWage <= 0) return 0;
  // Foreign non-residents: flat 30% withholding.
  if (ctx.nationality === 'foreign') {
    return round(monthlyWage * 0.30);
  }

  const annualGross = monthlyWage * 12;

  // EPF relief — capped at RM 4,000/year.
  const epfRelief = Math.min(monthlyEpfRelief * 12, 4000);

  // Personal relief by category.
  const personalRelief = ctx.pcbCategory === 'KA2' ? 13000 : 9000;
  // KA2 includes RM 4,000 spouse relief on top of RM 9,000 personal.

  // Child relief — RM 2,000 per child for KA1/KA3 (if claimed); for KA2 the
  // spouse usually claims, but we let it pass through.
  const childRelief = (ctx.numChildren ?? 0) * 2000;

  const annualChargeable = Math.max(0, annualGross - epfRelief - personalRelief - childRelief);
  const annualTax = applyMyBrackets(annualChargeable);

  // Less zakat + CP38 already deducted monthly; convert annual back to monthly.
  const monthlyTax = annualTax / 12;
  const zakatMonthly = ctx.zakatMonthly ?? 0;
  const cp38Monthly = ctx.cp38Amount ?? 0;

  return Math.max(0, round(monthlyTax - zakatMonthly - cp38Monthly));
}

function applyMyBrackets(annualChargeable: number): number {
  for (let i = 0; i < MY_TAX_BRACKETS_2025.length; i++) {
    const b = MY_TAX_BRACKETS_2025[i];
    if (annualChargeable <= b.upTo) {
      const prevUpTo = i === 0 ? 0 : MY_TAX_BRACKETS_2025[i - 1].upTo;
      const slice = annualChargeable - prevUpTo;
      return b.cumulative + slice * b.rate;
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Top-level orchestrator
// ---------------------------------------------------------------------------
export function calculateMalaysia(
  wage: number,
  ctx: MyEmployeeContext,
): MyContribution {
  const epf = calculateEpf(wage, ctx);
  const socso = calculateSocso(wage, ctx);
  const eis = calculateEis(wage, ctx);
  const hrdf = calculateHrdf(wage, ctx);
  const pcb = calculatePcb(wage, ctx, epf.ee);
  const zakat = ctx.zakatMonthly ?? 0;
  const cp38 = ctx.cp38Amount ?? 0;

  const totalEmployeeDeductions = epf.ee + socso.ee + eis.ee + pcb + zakat + cp38;
  const totalEmployerCost = wage + epf.er + socso.er + eis.er + hrdf;

  return {
    epfEmployee: epf.ee,
    epfEmployer: epf.er,
    socsoEmployee: socso.ee,
    socsoEmployer: socso.er,
    eisEmployee: eis.ee,
    eisEmployer: eis.er,
    hrdfEmployer: hrdf,
    pcb,
    zakat,
    cp38,
    totalEmployeeDeductions: round(totalEmployeeDeductions),
    totalEmployerCost: round(totalEmployerCost),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
