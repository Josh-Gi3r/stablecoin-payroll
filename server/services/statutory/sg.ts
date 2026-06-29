/**
 * Singapore statutory contribution engine.
 *
 * Schemes:
 *   - CPF — Central Provident Fund (citizens + PRs)
 *   - SDL — Skills Development Levy (all employees, employer-only)
 *   - FWL — Foreign Worker Levy (S Pass + Work Permit holders, employer-only)
 *
 * 2026 reference values:
 *   - CPF Ordinary Wage ceiling: S$8,000/month (was S$7,400 in 2025)
 *   - CPF Annual Wage ceiling: S$102,000 (rolling annual)
 *   - 5 age bands: ≤55, 55–60, 60–65, 65–70, >70 — switch on first day
 *     of month FOLLOWING the birthday month
 *   - SDL: 0.25% of gross monthly wages, capped at S$11.25
 *   - FWL: tier by pass type + sector + quota; we model headline rates
 */

export type SgNationality = 'citizen' | 'pr_first2' | 'pr_full' | 'foreign';
export type SgWorkPass = 'none' | 'employment_pass' | 's_pass' | 'work_permit';

export interface SgEmployeeContext {
  nationality: SgNationality;
  ageOnFirstOfMonth: number;        // age at the first of the payroll month
  workPass: SgWorkPass;
  // Annual rolling totals so AW (bonus/13th-month) ceiling can be enforced.
  ytdOrdinaryWages: number;         // OW already paid in current year
  ytdAdditionalWages: number;       // AW already paid in current year
}

export interface SgWageInput {
  ordinaryWage: number;             // monthly base + fixed allowances
  additionalWage: number;           // bonuses, 13th-month, irregular
}

export interface SgContribution {
  cpfEmployee: number;
  cpfEmployer: number;
  sdlEmployer: number;
  fwlEmployer: number;
  totalEmployeeDeductions: number;
  totalEmployerCost: number;
  // Diagnostics
  cpfOwSubjected: number;
  cpfAwSubjected: number;
}

const OW_CEILING_2026 = 8000;
const AW_CEILING_ANNUAL = 102000;

// ---------------------------------------------------------------------------
// CPF age-band rate table (citizens + 3rd-year-onwards PRs)
// ---------------------------------------------------------------------------
// Effective rates after the 2026 increase for the 55-60 and 60-65 bands.
// EE / ER as decimals.
// ---------------------------------------------------------------------------
interface CpfBand {
  ageMin: number;
  ageMax: number;
  ee: number;
  er: number;
}

const CPF_BANDS_FULL: CpfBand[] = [
  { ageMin: 0,  ageMax: 55, ee: 0.20,  er: 0.17  },
  { ageMin: 55, ageMax: 60, ee: 0.17,  er: 0.155 }, // 2026 step-up
  { ageMin: 60, ageMax: 65, ee: 0.115, er: 0.12  }, // 2026 step-up
  { ageMin: 65, ageMax: 70, ee: 0.075, er: 0.09  },
  { ageMin: 70, ageMax: 999, ee: 0.05, er: 0.075 },
];

// First-2-years PRs pay graduated rates (lower than full).
const CPF_BANDS_PR_FIRST2: CpfBand[] = [
  { ageMin: 0,  ageMax: 55, ee: 0.05, er: 0.04 },
  { ageMin: 55, ageMax: 60, ee: 0.05, er: 0.04 },
  { ageMin: 60, ageMax: 65, ee: 0.05, er: 0.035 },
  { ageMin: 65, ageMax: 70, ee: 0.05, er: 0.035 },
  { ageMin: 70, ageMax: 999, ee: 0.05, er: 0.035 },
];

function pickBand(bands: CpfBand[], age: number): CpfBand {
  return bands.find((b) => age >= b.ageMin && age < b.ageMax) ?? bands[bands.length - 1];
}

export function calculateCpf(
  wage: SgWageInput,
  ctx: SgEmployeeContext,
): { ee: number; er: number; owSubjected: number; awSubjected: number } {
  // Foreign workers (work-pass holders, non-PR) do NOT pay CPF.
  if (ctx.nationality === 'foreign') {
    return { ee: 0, er: 0, owSubjected: 0, awSubjected: 0 };
  }

  // Pick the rate band by nationality.
  const bands = ctx.nationality === 'pr_first2' ? CPF_BANDS_PR_FIRST2 : CPF_BANDS_FULL;
  const band = pickBand(bands, ctx.ageOnFirstOfMonth);

  // Step 1: OW subject to CPF (capped at OW ceiling per month).
  const owSubjected = Math.min(wage.ordinaryWage, OW_CEILING_2026);

  // Step 2: AW ceiling = annual CPF ceiling minus OW already paid in year.
  // Sticking to the IRAS formula: AW ceiling = $102,000 - Total OW subject to CPF for the year.
  const totalOwForYearSubjected =
    Math.min(ctx.ytdOrdinaryWages, OW_CEILING_2026 * 12) + owSubjected;
  const awCeilingRemaining = Math.max(0, AW_CEILING_ANNUAL - totalOwForYearSubjected);
  const awSubjected = Math.min(
    wage.additionalWage,
    Math.max(0, awCeilingRemaining - ctx.ytdAdditionalWages),
  );

  const subjectedTotal = owSubjected + awSubjected;
  const ee = round(subjectedTotal * band.ee);
  const er = round(subjectedTotal * band.er);
  return { ee, er, owSubjected, awSubjected };
}

// ---------------------------------------------------------------------------
// SDL — Skills Development Levy
// ---------------------------------------------------------------------------
// 0.25% of monthly gross remuneration, capped at S$11.25 (i.e. on first
// S$4,500). Min S$2. Applies to ALL employees including foreigners.
// ---------------------------------------------------------------------------
export function calculateSdl(grossWage: number): number {
  if (grossWage <= 0) return 0;
  const levy = Math.min(grossWage, 4500) * 0.0025;
  return Math.max(2, round(levy));
}

// ---------------------------------------------------------------------------
// FWL — Foreign Worker Levy (employer-only)
// ---------------------------------------------------------------------------
// Applies to S Pass + Work Permit holders. Tier by sector + dependency ratio.
// Headline 2026 rates (services sector, basic tier):
//   S Pass:        S$330 / month
//   Work Permit:   S$300 / month (Tier 1) — sector-dependent
// We expose the headline; in production, sector/quota lookup would refine.
// ---------------------------------------------------------------------------
export function calculateFwl(workPass: SgWorkPass): number {
  switch (workPass) {
    case 's_pass':       return 330;
    case 'work_permit':  return 300;
    default:             return 0; // EP holders + citizens/PRs are not FWL-bearing
  }
}

// ---------------------------------------------------------------------------
// Top-level orchestrator
// ---------------------------------------------------------------------------
export function calculateSingapore(
  wage: SgWageInput,
  ctx: SgEmployeeContext,
): SgContribution {
  const cpf = calculateCpf(wage, ctx);
  const grossWage = wage.ordinaryWage + wage.additionalWage;
  const sdl = calculateSdl(grossWage);
  const fwl = calculateFwl(ctx.workPass);

  const totalEmployeeDeductions = cpf.ee;
  const totalEmployerCost = grossWage + cpf.er + sdl + fwl;

  return {
    cpfEmployee: cpf.ee,
    cpfEmployer: cpf.er,
    sdlEmployer: sdl,
    fwlEmployer: fwl,
    totalEmployeeDeductions: round(totalEmployeeDeductions),
    totalEmployerCost: round(totalEmployerCost),
    cpfOwSubjected: cpf.owSubjected,
    cpfAwSubjected: cpf.awSubjected,
  };
}

// ---------------------------------------------------------------------------
// Helper: compute age-on-first-of-month given birthday + payroll month.
// CPF rate switches on the first day of the month FOLLOWING the birthday.
// ---------------------------------------------------------------------------
export function ageOnFirstOfMonth(birthDateIso: string, payrollMonthIso: string): number {
  const birth = new Date(birthDateIso);
  const payroll = new Date(payrollMonthIso); // expected: YYYY-MM-01
  let age = payroll.getFullYear() - birth.getFullYear();
  // Birthday already happened this year (in the month before payroll month)?
  const birthdayThisYear = new Date(payroll.getFullYear(), birth.getMonth(), birth.getDate());
  if (birthdayThisYear > payroll) age -= 1;
  return age;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
