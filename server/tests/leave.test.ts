import { describe, it, expect } from 'vitest';
import {
  calculateLeaveEntitlement,
  proRateDays,
  calculateTermination,
} from '../services/leave.js';

describe('MY leave entitlement', () => {
  it('Tenure < 2y: 8 annual / 14 sick', () => {
    const r = calculateLeaveEntitlement({ country: 'MY', tenureMonths: 12 });
    expect(r.annualDays).toBe(8);
    expect(r.sickOutpatientDays).toBe(14);
    expect(r.sickHospitalisationDays).toBe(60);
    expect(r.maternityDays).toBe(98);
    expect(r.paternityDays).toBe(7);
  });

  it('Tenure 2-5y: 12 annual / 18 sick', () => {
    const r = calculateLeaveEntitlement({ country: 'MY', tenureMonths: 36 });
    expect(r.annualDays).toBe(12);
    expect(r.sickOutpatientDays).toBe(18);
  });

  it('Tenure 5y+: 16 annual / 22 sick', () => {
    const r = calculateLeaveEntitlement({ country: 'MY', tenureMonths: 72 });
    expect(r.annualDays).toBe(16);
    expect(r.sickOutpatientDays).toBe(22);
  });

  it('Paternity caps at 5 confinements', () => {
    const r = calculateLeaveEntitlement({
      country: 'MY',
      tenureMonths: 36,
      paternityConfinementsUsed: 5,
    });
    expect(r.paternityDays).toBe(0);
  });
});

describe('SG leave entitlement', () => {
  it('Year 1: 7 annual', () => {
    const r = calculateLeaveEntitlement({ country: 'SG', tenureMonths: 6 });
    expect(r.annualDays).toBe(7);
  });

  it('Year 5: 11 annual (7+4)', () => {
    const r = calculateLeaveEntitlement({ country: 'SG', tenureMonths: 60 });
    expect(r.annualDays).toBe(11);
  });

  it('Year 10+: capped at 14', () => {
    const r = calculateLeaveEntitlement({ country: 'SG', tenureMonths: 200 });
    expect(r.annualDays).toBe(14);
  });

  it('Citizen child: 16-week maternity (112 days)', () => {
    const r = calculateLeaveEntitlement({
      country: 'SG',
      tenureMonths: 24,
      hasCitizenChild: true,
    });
    expect(r.maternityDays).toBe(112);
    expect(r.paternityDays).toBe(14);
    expect(r.childcareDays).toBe(6);
  });

  it('Non-citizen child: 12-week maternity', () => {
    const r = calculateLeaveEntitlement({
      country: 'SG',
      tenureMonths: 24,
      hasCitizenChild: false,
    });
    expect(r.maternityDays).toBe(84);
    expect(r.paternityDays).toBe(0);
  });
});

describe('proRateDays', () => {
  it('Half year of 12-day annual = 6 days', () => {
    expect(proRateDays(12, 6)).toBe(6);
  });

  it('Caps at 12 months', () => {
    expect(proRateDays(14, 18)).toBe(14);
  });

  it('Rounds to 0.5', () => {
    expect(proRateDays(8, 5)).toBe(3.5);
  });
});

describe('Termination calculator', () => {
  it('MY, employer-initiated, 6 years tenure, 5 unused leave days', () => {
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
    // Daily wage = 200. Pro-rata = 3000. Leave = 1000. Severance = 200 × 20 × 6 = 24000.
    expect(r.proRataSalary).toBe(3000);
    expect(r.leaveEncashment).toBe(1000);
    expect(r.statutorySeverance).toBe(24000);
    expect(r.total).toBe(28000);
  });

  it('MY, employee-initiated: no statutory severance', () => {
    const r = calculateTermination({
      country: 'MY',
      monthlyWage: 6000,
      tenureMonths: 72,
      daysWorkedInLastMonth: 30,
      daysInLastMonth: 30,
      unusedAnnualLeaveDays: 0,
      noticeInLieuDays: 0,
      initiatedBy: 'employee',
    });
    expect(r.statutorySeverance).toBe(0);
  });

  it('SG, no statutory severance unless contractual', () => {
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

  it('Notice in lieu adds to total', () => {
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
    expect(r.total).toBe(3000);
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
    expect(r.total).toBe(10000);
  });
});
