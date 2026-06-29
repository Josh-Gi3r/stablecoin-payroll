import { describe, it, expect } from 'vitest';
import { calculateTermination } from '../services/leave.js';

// settlement.ts itself touches the database. We test the pure calculator
// through it (calculateTermination) which is what settlement.ts delegates to.
// Database-touching paths are covered indirectly by the routes layer.

describe('Settlement → final pay calculation', () => {
  it('MY 6yr employer-initiated, RM 6K, 5 leave days, no notice-in-lieu, no deposit', () => {
    const r = calculateTermination({
      country: 'MY',
      monthlyWage: 6000,
      tenureMonths: 72,
      daysWorkedInLastMonth: 15,
      daysInLastMonth: 30,
      unusedAnnualLeaveDays: 5,
      noticeInLieuDays: 0,
      initiatedBy: 'employer',
    });
    expect(r.proRataSalary).toBe(3000);
    expect(r.leaveEncashment).toBe(1000);
    expect(r.statutorySeverance).toBe(24000); // 200/day × 20 days × 6 yrs
    expect(r.depositRefund).toBe(0);
    expect(r.total).toBe(28000);
  });

  it('MY 1yr employer-initiated: 10-days-per-year severance band', () => {
    const r = calculateTermination({
      country: 'MY',
      monthlyWage: 3000,
      tenureMonths: 18,
      daysWorkedInLastMonth: 30,
      daysInLastMonth: 30,
      unusedAnnualLeaveDays: 0,
      noticeInLieuDays: 0,
      initiatedBy: 'employer',
    });
    // 100/day × 10 × floor(1.5) = 100 × 10 × 1 = 1000
    expect(r.statutorySeverance).toBe(1000);
  });

  it('MY 3yr employer-initiated: 15-days-per-year band', () => {
    const r = calculateTermination({
      country: 'MY',
      monthlyWage: 3000,
      tenureMonths: 36,
      daysWorkedInLastMonth: 30,
      daysInLastMonth: 30,
      unusedAnnualLeaveDays: 0,
      noticeInLieuDays: 0,
      initiatedBy: 'employer',
    });
    // 100/day × 15 × 3 = 4500
    expect(r.statutorySeverance).toBe(4500);
  });

  it('Misconduct dismissal: no statutory severance', () => {
    const r = calculateTermination({
      country: 'MY',
      monthlyWage: 6000,
      tenureMonths: 72,
      daysWorkedInLastMonth: 30,
      daysInLastMonth: 30,
      unusedAnnualLeaveDays: 0,
      noticeInLieuDays: 0,
      initiatedBy: 'misconduct',
    });
    expect(r.statutorySeverance).toBe(0);
  });

  it('SG: contractualSeverance flows through, no statutory MY math', () => {
    const r = calculateTermination({
      country: 'SG',
      monthlyWage: 8000,
      tenureMonths: 60,
      daysWorkedInLastMonth: 30,
      daysInLastMonth: 30,
      unusedAnnualLeaveDays: 0,
      noticeInLieuDays: 0,
      initiatedBy: 'employer',
      contractualSeverance: 16000,
    });
    expect(r.statutorySeverance).toBe(16000);
  });

  it('Notice-in-lieu adds days × dailyWage to total', () => {
    const r = calculateTermination({
      country: 'MY',
      monthlyWage: 3000,
      tenureMonths: 12,
      daysWorkedInLastMonth: 0,
      daysInLastMonth: 30,
      unusedAnnualLeaveDays: 0,
      noticeInLieuDays: 30,
      initiatedBy: 'employee',
    });
    expect(r.noticeInLieuPay).toBe(3000);
  });

  it('EOR deposit refund flows through total', () => {
    const r = calculateTermination({
      country: 'MY',
      monthlyWage: 5000,
      tenureMonths: 12,
      daysWorkedInLastMonth: 30,
      daysInLastMonth: 30,
      unusedAnnualLeaveDays: 0,
      noticeInLieuDays: 0,
      initiatedBy: 'employee',
      depositRefund: 5000,
    });
    expect(r.depositRefund).toBe(5000);
    expect(r.total).toBe(10000); // pro-rata 5000 + deposit 5000
  });

  it('Termination benefits + multiple components compose correctly', () => {
    const r = calculateTermination({
      country: 'MY',
      monthlyWage: 4500,
      tenureMonths: 60,
      daysWorkedInLastMonth: 20,
      daysInLastMonth: 30,
      unusedAnnualLeaveDays: 8,
      noticeInLieuDays: 30,
      initiatedBy: 'employer',
      terminationBenefits: 2000,
      depositRefund: 1500,
    });
    // dailyWage = 150
    // proRata = 150 × 20 = 3000
    // leave = 150 × 8 = 1200
    // notice = 150 × 30 = 4500
    // severance = 150 × 20 × 5 = 15000 (60mo = 5yrs, in 5+ band → 20 days)
    // benefits = 2000
    // deposit = 1500
    // total = 27200
    expect(r.proRataSalary).toBe(3000);
    expect(r.leaveEncashment).toBe(1200);
    expect(r.noticeInLieuPay).toBe(4500);
    expect(r.statutorySeverance).toBe(15000);
    expect(r.terminationBenefits).toBe(2000);
    expect(r.depositRefund).toBe(1500);
    expect(r.total).toBe(27200);
  });
});
