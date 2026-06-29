/**
 * Malaysian Statutory Deductions Engine
 * Rates as per 2026 legislation.
 * Uses percentage-based approximation (suitable for all salary levels).
 */

export type Nationality = 'malaysian' | 'pr' | 'foreign';
export type ResidentStatus = 'resident' | 'non_resident';
export type TaxCategory = 'KA1' | 'KA2' | 'KA3';
export type AgeGroup = 'below_60' | 'above_60';

export interface EmployeeStatutoryProfile {
  grossSalary: number;          // Monthly gross in MYR
  nationality: Nationality;
  residentStatus: ResidentStatus;
  taxCategory: TaxCategory;
  ageGroup: AgeGroup;
  zakatMonthly: number;         // Optional fixed monthly zakat (0 if not applicable)
  cp38Amount: number;           // Optional LHDN CP38 directive (0 if none)
  isHrdfEligible: boolean;      // True for Malaysian employees in covered industries
  companyHeadcount: number;     // Total Malaysian employees (affects HRDF rate)
  accumulatedMtd: number;       // MTD paid so far this year (for PCB formula)
  accumulatedEpf: number;       // EPF paid so far this year (for PCB relief cap)
  remainingMonths: number;      // Months remaining in year including current (1–12)
}

export interface StatutoryBreakdown {
  // Employee deductions
  epfEmployee: number;
  socsoEmployee: number;
  eisEmployee: number;
  pcbMtd: number;
  zakat: number;
  cp38: number;
  wht: number;
  totalEmployeeDeductions: number;

  // Employer contributions
  epfEmployer: number;
  socsoEmployer: number;
  eisEmployer: number;
  hrdf: number;
  totalEmployerContributions: number;

  // Summary
  netPay: number;
  totalCostToCompany: number;
}

// ─── EPF ──────────────────────────────────────────────────────────────────────
// No salary ceiling. Percentage-based approximation.
function calcEPF(gross: number, nationality: Nationality, ageGroup: AgeGroup): { employee: number; employer: number } {
  if (nationality === 'foreign') {
    // Foreign workers (Oct 2025 mandate): 2% / 2%
    return {
      employee: Math.ceil(gross * 0.02),
      employer: Math.ceil(gross * 0.02),
    };
  }

  if (ageGroup === 'above_60') {
    // Malaysian/PR 60+: employee 0%, employer 4%
    return {
      employee: 0,
      employer: Math.ceil(gross * 0.04),
    };
  }

  // Malaysian/PR below 60
  const employeeRate = 0.11;
  const employerRate = gross <= 5000 ? 0.13 : 0.12;

  return {
    employee: Math.ceil(gross * employeeRate),
    employer: Math.ceil(gross * employerRate),
  };
}

// ─── SOCSO ────────────────────────────────────────────────────────────────────
// Ceiling RM6,000/month. Percentage-based approximation.
const SOCSO_CEILING = 6000;

function calcSOCSO(gross: number, ageGroup: AgeGroup): { employee: number; employer: number } {
  const capped = Math.min(gross, SOCSO_CEILING);

  if (ageGroup === 'above_60') {
    // Category 2 — Employment Injury only: employer 1.25%, employee 0%
    return {
      employee: 0,
      employer: Math.ceil(capped * 0.0125),
    };
  }

  // Category 1 — both schemes: employer 1.75%, employee 0.5%
  return {
    employee: Math.ceil(capped * 0.005),
    employer: Math.ceil(capped * 0.0175),
  };
}

// ─── EIS ──────────────────────────────────────────────────────────────────────
// Malaysian/PR only, ceiling RM6,000. 0.2% each.
const EIS_CEILING = 6000;

function calcEIS(gross: number, nationality: Nationality, ageGroup: AgeGroup): { employee: number; employer: number } {
  // Foreign workers and over-60 are not covered
  if (nationality === 'foreign' || ageGroup === 'above_60') {
    return { employee: 0, employer: 0 };
  }

  const capped = Math.min(gross, EIS_CEILING);
  const amount = Math.ceil(capped * 0.002);
  return { employee: amount, employer: amount };
}

// ─── PCB / MTD ────────────────────────────────────────────────────────────────
// Simplified progressive calculation.
// Non-residents: flat 30%. Residents: progressive formula.
const TAX_BRACKETS = [
  { min: 0,       max: 5000,    rate: 0,    base: 0 },
  { min: 5001,    max: 20000,   rate: 0.01, base: 0 },
  { min: 20001,   max: 35000,   rate: 0.03, base: 150 },
  { min: 35001,   max: 50000,   rate: 0.06, base: 600 },
  { min: 50001,   max: 70000,   rate: 0.11, base: 1500 },
  { min: 70001,   max: 100000,  rate: 0.19, base: 3700 },
  { min: 100001,  max: 400000,  rate: 0.25, base: 9400 },
  { min: 400001,  max: 600000,  rate: 0.26, base: 84400 },
  { min: 600001,  max: 2000000, rate: 0.28, base: 136400 },
  { min: 2000001, max: Infinity, rate: 0.30, base: 528400 },
];

// Personal deductions by tax category (annual)
const PERSONAL_DEDUCTIONS: Record<TaxCategory, number> = {
  KA1: 9000,    // Single
  KA2: 13000,   // Married, spouse not working (9000 + 4000 spouse)
  KA3: 9000,    // Married, working spouse / divorced / widowed
};

function calcAnnualTax(chargeableIncome: number): number {
  if (chargeableIncome <= 0) return 0;
  const bracket = TAX_BRACKETS.find((b) => chargeableIncome >= b.min && chargeableIncome <= b.max);
  if (!bracket) return 0;
  const taxOnExcess = (chargeableIncome - bracket.min) * bracket.rate;
  return bracket.base + taxOnExcess;
}

function calcPCB(
  gross: number,
  nationality: Nationality,
  residentStatus: ResidentStatus,
  taxCategory: TaxCategory,
  accumulatedEpf: number,
  accumulatedMtd: number,
  zakatMonthly: number,
  remainingMonths: number,
): number {
  if (nationality === 'foreign' && residentStatus === 'non_resident') {
    // WHT applies instead — PCB = 0 here
    return 0;
  }

  if (residentStatus === 'non_resident') {
    // Non-resident flat 30%
    const mtd = Math.floor(gross * 0.30 * 100) / 100;
    return Math.round(mtd / 0.05) * 0.05;
  }

  // Resident: simplified PCB formula
  // Estimate annual gross from current month
  const annualGross = gross * 12;
  const epfRelief = Math.min(accumulatedEpf + Math.ceil(gross * 0.11), 4000);
  const personalDeduction = PERSONAL_DEDUCTIONS[taxCategory];
  const chargeableIncome = Math.max(0, annualGross - personalDeduction - epfRelief);
  const annualTax = calcAnnualTax(chargeableIncome);

  // PCB = (annual tax - accumulated MTD - zakat rebate) / remaining months
  const zakatAnnual = zakatMonthly * 12;
  const netAnnualTax = Math.max(0, annualTax - zakatAnnual);
  const monthlyMtd = (netAnnualTax - accumulatedMtd) / remainingMonths;

  if (monthlyMtd < 10) return 0;

  // Truncate to 2 decimals, round to nearest 5 sen
  const truncated = Math.floor(monthlyMtd * 100) / 100;
  return Math.round(truncated / 0.05) * 0.05;
}

// ─── WHT ──────────────────────────────────────────────────────────────────────
// Withholding tax for non-residents: 30% flat on all remuneration.
function calcWHT(gross: number, nationality: Nationality, residentStatus: ResidentStatus): number {
  if (residentStatus === 'non_resident') {
    return Math.floor(gross * 0.30 * 100) / 100;
  }
  return 0;
}

// ─── HRDF ─────────────────────────────────────────────────────────────────────
// Employer only. Malaysian employees. 1% (10+ staff) or 0.5% (5-9).
function calcHRDF(gross: number, isEligible: boolean, headcount: number): number {
  if (!isEligible) return 0;
  const rate = headcount >= 10 ? 0.01 : 0.005;
  return Math.ceil(gross * rate);
}

// ─── Main Calculator ──────────────────────────────────────────────────────────
export function calculateStatutoryDeductions(profile: EmployeeStatutoryProfile): StatutoryBreakdown {
  const {
    grossSalary,
    nationality,
    residentStatus,
    taxCategory,
    ageGroup,
    zakatMonthly,
    cp38Amount,
    isHrdfEligible,
    companyHeadcount,
    accumulatedMtd,
    accumulatedEpf,
    remainingMonths,
  } = profile;

  const epf = calcEPF(grossSalary, nationality, ageGroup);
  const socso = calcSOCSO(grossSalary, ageGroup);
  const eis = calcEIS(grossSalary, nationality, ageGroup);
  const pcb = calcPCB(grossSalary, nationality, residentStatus, taxCategory, accumulatedEpf, accumulatedMtd, zakatMonthly, remainingMonths);
  const wht = calcWHT(grossSalary, nationality, residentStatus);
  const hrdf = calcHRDF(grossSalary, isHrdfEligible, companyHeadcount);

  const totalEmployeeDeductions =
    epf.employee + socso.employee + eis.employee + pcb + zakatMonthly + cp38Amount + wht;

  const totalEmployerContributions =
    epf.employer + socso.employer + eis.employer + hrdf;

  const netPay = grossSalary - totalEmployeeDeductions;
  const totalCostToCompany = grossSalary + totalEmployerContributions;

  return {
    epfEmployee: epf.employee,
    socsoEmployee: socso.employee,
    eisEmployee: eis.employee,
    pcbMtd: pcb,
    zakat: zakatMonthly,
    cp38: cp38Amount,
    wht,
    totalEmployeeDeductions,

    epfEmployer: epf.employer,
    socsoEmployer: socso.employer,
    eisEmployer: eis.employer,
    hrdf,
    totalEmployerContributions,

    netPay,
    totalCostToCompany,
  };
}

// ─── Compliance Deadline Helpers ──────────────────────────────────────────────
export function getComplianceDeadline(year: number, month: number): Date {
  // All statutory payments due on the 15th of the following month
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return new Date(nextYear, nextMonth - 1, 15);
}

export function getDaysUntilDeadline(year: number, month: number): number {
  const deadline = getComplianceDeadline(year, month);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = deadline.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getComplianceStatus(daysLeft: number): 'safe' | 'warning' | 'overdue' {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 5) return 'warning';
  return 'safe';
}

// ─── Bulk payroll summary ─────────────────────────────────────────────────────
export interface PayrollStatutorySummary {
  totalEpfEmployee: number;
  totalEpfEmployer: number;
  totalSocso: number;
  totalEis: number;
  totalPcb: number;
  totalHrdf: number;
  totalWht: number;
  totalNetPay: number;
  totalCostToCompany: number;
}

export function summariseStatutory(breakdowns: StatutoryBreakdown[]): PayrollStatutorySummary {
  return breakdowns.reduce(
    (acc, b) => ({
      totalEpfEmployee: acc.totalEpfEmployee + b.epfEmployee,
      totalEpfEmployer: acc.totalEpfEmployer + b.epfEmployer,
      totalSocso: acc.totalSocso + b.socsoEmployee + b.socsoEmployer,
      totalEis: acc.totalEis + b.eisEmployee + b.eisEmployer,
      totalPcb: acc.totalPcb + b.pcbMtd,
      totalHrdf: acc.totalHrdf + b.hrdf,
      totalWht: acc.totalWht + b.wht,
      totalNetPay: acc.totalNetPay + b.netPay,
      totalCostToCompany: acc.totalCostToCompany + b.totalCostToCompany,
    }),
    {
      totalEpfEmployee: 0, totalEpfEmployer: 0, totalSocso: 0, totalEis: 0,
      totalPcb: 0, totalHrdf: 0, totalWht: 0, totalNetPay: 0, totalCostToCompany: 0,
    }
  );
}
