/**
 * Leave entitlement engine — MY + SG.
 *
 * Returns the *annual* entitlement in days for each leave type given the
 * employee's tenure + jurisdiction. Pro-rata is computed by the consumer.
 *
 * References:
 *   MY: Employment Act 1955 (as amended by EA 2022, in force 1 Jan 2023):
 *     - Annual leave: 8 / 12 / 16 days by tenure bucket (<2 / 2-5 / >5 years)
 *     - Sick leave: 14 / 18 / 22 days by tenure (≤2 / 2-5 / >5 years)
 *     - Hospitalisation: 60 days
 *     - Maternity: 98 days
 *     - Paternity: 7 days, max 5 confinements with same employer
 *   SG: Employment Act + Child Development Co-Savings Act:
 *     - Annual: 7 days year 1, +1 per year up to 14 (cap)
 *     - Sick (paid): 14 days outpatient, 60 days hospitalisation
 *       (eligible after 3-month service waiting period)
 *     - Maternity: 16 weeks (8 employer-paid + 8 govt-reimbursed claim)
 *       for citizen child; 12 weeks otherwise
 *     - Paternity: 2 weeks (citizen child)
 *     - Childcare: 6 days (citizen child, parents working ≥3 months)
 */

export type Country = 'MY' | 'SG';

export interface LeaveEntitlement {
  annualDays: number;
  sickOutpatientDays: number;
  sickHospitalisationDays: number;
  maternityDays: number;
  paternityDays: number;
  childcareDays?: number;       // SG-only
  unpaidInfantcareDays?: number; // SG-only (informational)
}

export interface LeaveContext {
  country: Country;
  tenureMonths: number;
  hasCitizenChild?: boolean;     // SG: gates higher maternity / paternity / childcare
  childCount?: number;
  // MY: number of paternity confinements taken with this employer (max 5).
  paternityConfinementsUsed?: number;
}

// ---------------------------------------------------------------------------
// MY — Employment Act 1955
// ---------------------------------------------------------------------------
function myEntitlement(ctx: LeaveContext): LeaveEntitlement {
  const years = ctx.tenureMonths / 12;
  const annual = years < 2 ? 8 : years < 5 ? 12 : 16;
  const sick = years < 2 ? 14 : years < 5 ? 18 : 22;
  const paternityCap = (ctx.paternityConfinementsUsed ?? 0) >= 5 ? 0 : 7;
  return {
    annualDays: annual,
    sickOutpatientDays: sick,
    sickHospitalisationDays: 60,
    maternityDays: 98,
    paternityDays: paternityCap,
  };
}

// ---------------------------------------------------------------------------
// SG — Employment Act + Child Development Co-Savings Act
// ---------------------------------------------------------------------------
function sgEntitlement(ctx: LeaveContext): LeaveEntitlement {
  // Annual: 7 in year 1, +1 each year, capped at 14.
  const yearsCompleted = Math.floor(ctx.tenureMonths / 12);
  const annual = Math.min(14, 7 + Math.max(0, yearsCompleted - 1));

  // Sick: 14 outpatient, 60 hospitalisation. Pro-rated for first 6 months;
  // we expose the full annual entitlement and let the consumer pro-rate.
  const sickOutpatient = 14;
  const sickHospitalisation = 60;

  // Maternity: 16 weeks if citizen child, else 12.
  const maternityDays = ctx.hasCitizenChild ? 16 * 7 : 12 * 7;

  // Paternity: 2 weeks (citizen child only, post-2024 enhancement).
  const paternityDays = ctx.hasCitizenChild ? 14 : 0;

  // Childcare: 6 days (citizen child + parents working ≥3 months).
  const childcareDays = ctx.hasCitizenChild && ctx.tenureMonths >= 3 ? 6 : 0;

  return {
    annualDays: annual,
    sickOutpatientDays: sickOutpatient,
    sickHospitalisationDays: sickHospitalisation,
    maternityDays,
    paternityDays,
    childcareDays,
    unpaidInfantcareDays: ctx.hasCitizenChild ? 6 : 0,
  };
}

export function calculateLeaveEntitlement(ctx: LeaveContext): LeaveEntitlement {
  return ctx.country === 'MY' ? myEntitlement(ctx) : sgEntitlement(ctx);
}

// ---------------------------------------------------------------------------
// Pro-rata calculator: how many days have accrued as-of a given date in a
// calendar/contract year, given the annual entitlement and accrual reference
// date (default: hire date).
//
// Formula (both MY + SG): days × monthsServed / 12, rounded to 0.5.
// ---------------------------------------------------------------------------
export function proRateDays(annualDays: number, monthsServed: number): number {
  const exact = (annualDays * Math.min(12, monthsServed)) / 12;
  return Math.round(exact * 2) / 2;
}

// ---------------------------------------------------------------------------
// Termination + final settlement calculator.
//
//   Final pay = pro-rata salary up to last working day
//             + accrued unused annual leave (encashment)
//             + notice in lieu (if applicable)
//             + statutory severance (MY only, EA 1955 s60J)
//             + termination benefits (employer-defined)
//             + EOR deposit refund (if applicable)
//
// MY severance (Employment (Termination and Lay-Off Benefits) Regs 1980):
//   - <2y     : 10 days × years × monthly wage / 30
//   - 2y-5y   : 15 days × years × monthly wage / 30
//   - 5y+     : 20 days × years × monthly wage / 30
//   Only payable if termination is initiated by employer (not voluntary
//   resignation, not summary dismissal for misconduct).
//
// SG: no statutory severance; retrenchment benefit is contractual unless
//   reorganization / redundancy by company policy. We expose
//   `contractualSeverance` so caller can pass company-specific amount.
// ---------------------------------------------------------------------------
export interface TerminationContext {
  country: Country;
  monthlyWage: number;
  tenureMonths: number;
  daysWorkedInLastMonth: number;       // 0..31
  daysInLastMonth: number;             // typically 30 or 31
  unusedAnnualLeaveDays: number;
  noticeInLieuDays: number;            // 0 if notice was served
  initiatedBy: 'employer' | 'employee' | 'misconduct';
  contractualSeverance?: number;       // SG or supplemental
  terminationBenefits?: number;        // gratuity / bonus / etc.
  depositRefund?: number;              // EOR clients only
}

export interface TerminationBreakdown {
  proRataSalary: number;
  leaveEncashment: number;
  noticeInLieuPay: number;
  statutorySeverance: number;
  terminationBenefits: number;
  depositRefund: number;
  total: number;
}

export function calculateTermination(ctx: TerminationContext): TerminationBreakdown {
  const dailyWage = ctx.monthlyWage / ctx.daysInLastMonth;
  const proRataSalary = round(dailyWage * ctx.daysWorkedInLastMonth);
  const leaveEncashment = round(dailyWage * ctx.unusedAnnualLeaveDays);
  const noticeInLieuPay = round(dailyWage * ctx.noticeInLieuDays);

  let statutorySeverance = 0;
  if (ctx.country === 'MY' && ctx.initiatedBy === 'employer') {
    const years = ctx.tenureMonths / 12;
    const daysFactor = years < 2 ? 10 : years < 5 ? 15 : 20;
    // EA 1955: x days × completed years × (monthly wage / 30)
    statutorySeverance = round((ctx.monthlyWage / 30) * daysFactor * Math.floor(years));
  }
  if (ctx.country === 'SG' && ctx.contractualSeverance) {
    statutorySeverance = ctx.contractualSeverance;
  }

  const terminationBenefits = ctx.terminationBenefits ?? 0;
  const depositRefund = ctx.depositRefund ?? 0;

  const total = round(
    proRataSalary +
      leaveEncashment +
      noticeInLieuPay +
      statutorySeverance +
      terminationBenefits +
      depositRefund,
  );

  return {
    proRataSalary,
    leaveEncashment,
    noticeInLieuPay,
    statutorySeverance,
    terminationBenefits,
    depositRefund,
    total,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
