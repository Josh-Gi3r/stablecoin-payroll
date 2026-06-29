import { describe, it, expect } from 'vitest';
import {
  exportLhdnPcb,
  exportKwspECaruman,
  exportPerkesoAssist,
  exportHrdCorpEtris,
  type MyEmployerProfile,
  type MyEmployeeFilingRecord,
  type MyFilingPeriod,
} from '../services/my-filings.js';

const employer: MyEmployerProfile = {
  name: 'Acme Payroll Sdn Bhd',
  registrationNumber: '202012345A',
  taxFileNumber: 'C12345678',
  epfEmployerNumber: '12345678',
  socsoEmployerCode: 'A1234567',
  hrdfEmployerCode: 'HRD-12345',
};

const period: MyFilingPeriod = { year: 2026, month: 4 };

const baseRecord = (overrides: Partial<MyEmployeeFilingRecord> = {}): MyEmployeeFilingRecord => ({
  employeeId: 'emp-001',
  employeeName: 'Ahmad Razif',
  nric: '880101101234',
  grossWage: 5000,
  epfEmployee: 550,
  epfEmployer: 650,
  socsoEmployee: 25,
  socsoEmployer: 87.5,
  eisEmployee: 10,
  eisEmployer: 10,
  pcb: 120,
  hrdfEmployer: 50,
  ...overrides,
});

// ---------------------------------------------------------------------------
// LHDN e-PCB
// ---------------------------------------------------------------------------

describe('LHDN e-PCB export', () => {
  it('Emits header + record + totals row', () => {
    const out = exportLhdnPcb(employer, period, [baseRecord()]);
    const lines = out.trim().split('\n');
    expect(lines[0]).toBe('E_NO|TIN|NAME|NRIC|MONTH|YEAR|PCB|CP38');
    expect(lines[1]).toContain('C12345678|880101101234|Ahmad Razif|880101101234|04|2026|120.00|0.00');
    expect(lines[2]).toBe('TOTAL||||||120.00|0.00');
  });

  it('Skips records with zero PCB and zero CP38', () => {
    const out = exportLhdnPcb(employer, period, [baseRecord({ pcb: 0, cp38: 0 })]);
    const lines = out.trim().split('\n');
    expect(lines).toHaveLength(2); // header + total only
    expect(lines[1]).toBe('TOTAL||||||0.00|0.00');
  });

  it('Sums PCB across multiple employees', () => {
    const out = exportLhdnPcb(employer, period, [
      baseRecord({ employeeName: 'A', pcb: 100 }),
      baseRecord({ employeeName: 'B', pcb: 250.5, cp38: 30 }),
    ]);
    expect(out).toContain('TOTAL||||||350.50|30.00');
  });

  it('Strips pipes from name (delimiter safety)', () => {
    const out = exportLhdnPcb(employer, period, [baseRecord({ employeeName: 'A | B' })]);
    expect(out).toContain('A   B'); // pipes replaced with spaces
  });
});

// ---------------------------------------------------------------------------
// KWSP e-Caruman
// ---------------------------------------------------------------------------

describe('KWSP e-Caruman export', () => {
  it('Header line is 80 chars and starts with H + employer no + period', () => {
    const out = exportKwspECaruman(employer, period, [baseRecord()]);
    const lines = out.split('\n').filter(Boolean);
    expect(lines[0].length).toBe(80);
    expect(lines[0].startsWith('H12345678' + '202604')).toBe(true);
    expect(lines[0].slice(15, 20)).toBe('00001'); // 1 record
  });

  it('Detail line is 80 chars with NRIC + name + EE + ER + wage', () => {
    const out = exportKwspECaruman(employer, period, [baseRecord()]);
    const lines = out.split('\n').filter(Boolean);
    const detail = lines[1];
    expect(detail.length).toBe(80);
    expect(detail.slice(0, 12)).toBe('880101101234');
    expect(detail.slice(12, 52).trim()).toBe('AHMAD RAZIF');
    expect(detail.slice(52, 60)).toBe('00055000'); // 550 × 100, 8-digit
    expect(detail.slice(60, 68)).toBe('00065000'); // 650 × 100
    expect(detail.slice(68, 74)).toBe('005000');   // wage 5000, 6-digit
  });

  it('Footer line is 80 chars and starts with T + totals', () => {
    const out = exportKwspECaruman(employer, period, [
      baseRecord(),
      baseRecord({ employeeName: 'B', epfEmployee: 1000, epfEmployer: 1100, grossWage: 9000 }),
    ]);
    const lines = out.split('\n').filter(Boolean);
    const footer = lines[lines.length - 1];
    expect(footer.length).toBe(80);
    expect(footer.startsWith('T')).toBe(true);
    expect(footer.slice(1, 11)).toBe('0000155000');  // (550+1000)×100
    expect(footer.slice(11, 21)).toBe('0000175000');  // (650+1100)×100
    expect(footer.slice(21, 31)).toBe('0000014000');  // 5000+9000
  });

  it('Skips zero-EPF records (foreign workers w/ 0% if any)', () => {
    const out = exportKwspECaruman(employer, period, [
      baseRecord({ epfEmployee: 0, epfEmployer: 0 }),
    ]);
    const lines = out.split('\n').filter(Boolean);
    expect(lines).toHaveLength(2); // header + footer only
  });

  it('Strips non-ASCII from names', () => {
    const out = exportKwspECaruman(employer, period, [
      baseRecord({ employeeName: 'José Núñez' }),
    ]);
    const lines = out.split('\n').filter(Boolean);
    expect(lines[1].slice(12, 52).trim()).toBe('JOS NEZ'); // accents stripped
  });
});

// ---------------------------------------------------------------------------
// PERKESO ASSIST
// ---------------------------------------------------------------------------

describe('PERKESO ASSIST export', () => {
  it('Emits header + detail + total', () => {
    const out = exportPerkesoAssist(employer, period, [baseRecord()]);
    const lines = out.trim().split('\n');
    expect(lines[0]).toBe('IC_NO,NAME,WAGE,SOCSO_EE,SOCSO_ER,EIS_EE,EIS_ER');
    expect(lines[1]).toContain('880101101234,Ahmad Razif,5000.00,25.00,87.50,10.00,10.00');
    expect(lines[2]).toBe('TOTAL,,5000.00,25.00,87.50,10.00,10.00');
  });

  it('Skips records with zero SOCSO+EIS contributions', () => {
    const out = exportPerkesoAssist(employer, period, [
      baseRecord({ socsoEmployee: 0, socsoEmployer: 0, eisEmployee: 0, eisEmployer: 0 }),
    ]);
    const lines = out.trim().split('\n');
    expect(lines).toHaveLength(2);
  });

  it('CSV-escapes commas in name', () => {
    const out = exportPerkesoAssist(employer, period, [baseRecord({ employeeName: 'Doe, John' })]);
    expect(out).toContain('"Doe, John"');
  });

  it('Sums totals across multiple employees', () => {
    const out = exportPerkesoAssist(employer, period, [
      baseRecord({ employeeName: 'A' }),
      baseRecord({ employeeName: 'B', grossWage: 8000, socsoEmployee: 30, socsoEmployer: 105, eisEmployee: 12, eisEmployer: 12 }),
    ]);
    expect(out).toContain('TOTAL,,13000.00,55.00,192.50,22.00,22.00');
  });
});

// ---------------------------------------------------------------------------
// HRD Corp e-TRiS
// ---------------------------------------------------------------------------

describe('HRD Corp e-TRiS export', () => {
  it('Emits header + record + total with year/month', () => {
    const out = exportHrdCorpEtris(employer, period, [baseRecord()]);
    const lines = out.trim().split('\n');
    expect(lines[0]).toBe('REGISTRATION_NO,IC_NO,NAME,WAGE,LEVY,YEAR,MONTH');
    expect(lines[1]).toBe('HRD-12345,880101101234,Ahmad Razif,5000.00,50.00,2026,04');
    expect(lines[2]).toBe('TOTAL,,,5000.00,50.00,2026,04');
  });

  it('Skips records with zero levy (foreign workers)', () => {
    const out = exportHrdCorpEtris(employer, period, [baseRecord({ hrdfEmployer: 0 })]);
    const lines = out.trim().split('\n');
    expect(lines).toHaveLength(2); // header + total only
  });

  it('Sums levy across multiple employees', () => {
    const out = exportHrdCorpEtris(employer, period, [
      baseRecord(),
      baseRecord({ employeeName: 'B', grossWage: 8000, hrdfEmployer: 80 }),
    ]);
    expect(out).toContain('TOTAL,,,13000.00,130.00,2026,04');
  });
});
