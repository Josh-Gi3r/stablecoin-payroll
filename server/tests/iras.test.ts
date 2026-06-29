import { describe, it, expect } from 'vitest';
import {
  generateIr8a,
  ir8aTotalIncome,
  calculateAppendix8A,
  generateIr21,
  exportAisCsv,
  exportAisXml,
  checkSgEorEligibility,
  type Ir8aRecord,
} from '../services/iras.js';

const baseRecord = (overrides: Partial<Ir8aRecord> = {}): Ir8aRecord => ({
  employeeId: 'emp-001',
  employeeName: 'Tan Wei Liang',
  nric: 'S1234567A',
  dateOfBirth: '1990-05-15',
  sex: 'M',
  nationality: 'Singapore Citizen',
  designation: 'Senior Engineer',
  yearOfAssessment: 2026,
  grossSalary: 96000,
  bonus: 16000,
  directorsFees: 0,
  allowances: 4800,
  cpfContribution: 19200,
  donations: 0,
  ...overrides,
});

describe('IR8A', () => {
  it('totalIncome sums all components', () => {
    const r = baseRecord({
      benefitsInKind: { accommodation: 12000, carBenefit: 0, utilities: 0, servants: 0, other: 0, total: 12000 },
      shareScheme: { schemeName: 'ESOP', exerciseDate: '2025-06-01', numberOfShares: 1000, marketValuePerShare: 10, exercisePricePerShare: 5, gain: 5000 },
    });
    expect(ir8aTotalIncome(r)).toBe(96000 + 16000 + 4800 + 12000 + 5000);
  });

  it('generateIr8a defaults YA to next year', () => {
    const r = generateIr8a({
      employeeId: 'emp-002', employeeName: 'X', nric: 'S0000001A',
      dateOfBirth: '1980-01-01', sex: 'M', nationality: 'SG',
      designation: 'Eng', grossSalary: 0, bonus: 0, directorsFees: 0,
      allowances: 0, cpfContribution: 0, donations: 0,
    });
    expect(r.yearOfAssessment).toBe(new Date().getFullYear() + 1);
  });
});

describe('Appendix 8A', () => {
  it('Sums all BIK components', () => {
    const r = calculateAppendix8A({ accommodation: 12000, carBenefit: 6000, utilities: 1200 });
    expect(r.total).toBe(19200);
  });
});

describe('IR21', () => {
  it('Warns when cessation < 30 days away', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const { warnings } = generateIr21({
      employeeId: 'emp-001', employeeName: 'X', nric: 'F1234567B',
      cessationDate: tomorrow, reasonForCessation: 'resignation',
      ytdIncome: baseRecord(), expectedDeparture: true,
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('≥1 month');
  });

  it('No warning when cessation > 30 days away', () => {
    const future = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    const { warnings, record } = generateIr21({
      employeeId: 'emp-001', employeeName: 'X', nric: 'F1234567B',
      cessationDate: future, reasonForCessation: 'resignation',
      ytdIncome: baseRecord(), expectedDeparture: true,
    });
    expect(warnings.length).toBe(0);
    expect(record.monetaryHeldback).toBeGreaterThan(0);
  });
});

describe('AIS CSV export', () => {
  it('Emits header + record row', () => {
    const csv = exportAisCsv([baseRecord()]);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toContain('NRIC/FIN');
    expect(lines[0]).toContain('Total Income');
    expect(lines[1]).toContain('S1234567A');
    expect(lines[1]).toContain('Tan Wei Liang');
  });

  it('Escapes commas in name', () => {
    const csv = exportAisCsv([baseRecord({ employeeName: 'Doe, John' })]);
    expect(csv).toContain('"Doe, John"');
  });
});

describe('AIS XML export', () => {
  it('Emits valid envelope with employer UEN', () => {
    const xml = exportAisXml([baseRecord()], '202012345A');
    expect(xml).toContain('<UEN>202012345A</UEN>');
    expect(xml).toContain('<NRIC>S1234567A</NRIC>');
    expect(xml).toContain('<TotalIncome>116800</TotalIncome>');
  });

  it('XML-escapes ampersands in name', () => {
    const xml = exportAisXml([baseRecord({ employeeName: 'A & B' })], 'X');
    expect(xml).toContain('A &amp; B');
  });
});

describe('MOM 2024 EOR eligibility gate', () => {
  it('Singapore Citizen: eligible', () => {
    const r = checkSgEorEligibility({ nationality: 'singapore_citizen' });
    expect(r.blocked).toBe(false);
    expect(r.status).toBe('eligible_citizen');
  });

  it('PR: eligible', () => {
    const r = checkSgEorEligibility({ nationality: 'pr' });
    expect(r.blocked).toBe(false);
    expect(r.status).toBe('eligible_pr');
  });

  it('Foreign with no existing pass: BLOCKED', () => {
    const r = checkSgEorEligibility({ nationality: 'foreign' });
    expect(r.blocked).toBe(true);
    expect(r.reason).toContain('cannot sponsor');
  });

  it('Foreign with valid existing pass: eligible (case-by-case)', () => {
    const r = checkSgEorEligibility({ nationality: 'foreign', hasValidExistingPass: true });
    expect(r.blocked).toBe(false);
    expect(r.status).toBe('eligible_existing_pass');
  });
});
