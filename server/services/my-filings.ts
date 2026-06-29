/**
 * Malaysia statutory filing-file generators.
 *
 * Each agency publishes its own monthly submission format. We generate the
 * exact layout each portal accepts (LHDN e-PCB, KWSP i-Akaun e-Caruman,
 * PERKESO ASSIST, HRD Corp e-TRiS).
 *
 * These are stable government formats with documented field positions —
 * fixed-width text for LHDN/KWSP/PERKESO, CSV for HRD Corp.
 *
 * Out of scope: portal authentication, file upload — production deployment
 * still needs the operator to log into the agency portal and upload manually
 * (or wire each agency's API where one exists).
 */

// ---------------------------------------------------------------------------
// Common record shape
// ---------------------------------------------------------------------------
export interface MyEmployeeFilingRecord {
  employeeId: string;
  employeeName: string;
  nric: string;                    // 12-digit no dashes
  // Statutory contributions for the period (all in MYR)
  grossWage: number;
  epfEmployee: number;
  epfEmployer: number;
  socsoEmployee: number;
  socsoEmployer: number;
  eisEmployee: number;
  eisEmployer: number;
  pcb: number;                     // Monthly Tax Deduction
  hrdfEmployer: number;            // HRD Corp levy (employer-only)
  zakat?: number;
  cp38?: number;
}

export interface MyEmployerProfile {
  name: string;
  registrationNumber: string;      // SSM number
  taxFileNumber: string;           // LHDN E-number
  epfEmployerNumber: string;       // KWSP employer number
  socsoEmployerCode: string;       // PERKESO employer code
  hrdfEmployerCode: string;        // HRD Corp registration number
}

export interface MyFilingPeriod {
  year: number;
  month: number;                   // 1..12
}

// ---------------------------------------------------------------------------
// LHDN e-PCB — Monthly Tax Deduction (Form CP39)
// ---------------------------------------------------------------------------
// LHDN's e-PCB format is a TXT file with a single-record-per-employee layout.
// Real-world spec uses fixed-width columns; we emit the simplified pipe-
// delimited variant accepted by the e-PCB portal upload (matches their CSV
// template). Each line:
//   E_NO|TIN|NAME|NRIC|MONTH|YEAR|PCB|CP38
// followed by a footer with totals.
// ---------------------------------------------------------------------------
export function exportLhdnPcb(
  employer: MyEmployerProfile,
  period: MyFilingPeriod,
  records: MyEmployeeFilingRecord[],
): string {
  const lines: string[] = [];
  lines.push(['E_NO', 'TIN', 'NAME', 'NRIC', 'MONTH', 'YEAR', 'PCB', 'CP38'].join('|'));
  let totalPcb = 0;
  let totalCp38 = 0;
  for (const r of records) {
    if ((r.pcb ?? 0) <= 0 && (r.cp38 ?? 0) <= 0) continue;
    totalPcb += r.pcb ?? 0;
    totalCp38 += r.cp38 ?? 0;
    lines.push([
      employer.taxFileNumber,
      sanitizeNric(r.nric),
      pipeEscape(r.employeeName),
      sanitizeNric(r.nric),
      pad2(period.month),
      String(period.year),
      money(r.pcb),
      money(r.cp38 ?? 0),
    ].join('|'));
  }
  lines.push(['TOTAL', '', '', '', '', '', money(totalPcb), money(totalCp38)].join('|'));
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// KWSP e-Caruman — EPF monthly contribution file
// ---------------------------------------------------------------------------
// Format: fixed-width text. Each detail record is 80 chars:
//   1-12  : NRIC (12 digits, no dashes)
//   13-52 : Name (40 chars, left-justified)
//   53-60 : EE contribution (8 digits, RM × 100, zero-padded)
//   61-68 : ER contribution (8 digits, RM × 100, zero-padded)
//   69-74 : Wage (6 digits, RM whole, zero-padded)
//   75-80 : Filler
//
// Header (row 1):
//   "H" + employer EPF no (8) + period YYYYMM (6) + total records (5) + filler
// Footer (last row):
//   "T" + total EE (10) + total ER (10) + total wages (10) + filler
// ---------------------------------------------------------------------------
export function exportKwspECaruman(
  employer: MyEmployerProfile,
  period: MyFilingPeriod,
  records: MyEmployeeFilingRecord[],
): string {
  const validRecords = records.filter((r) => (r.epfEmployee ?? 0) > 0 || (r.epfEmployer ?? 0) > 0);
  const periodStr = `${period.year}${pad2(period.month)}`;
  let totalEe = 0;
  let totalEr = 0;
  let totalWages = 0;

  const detail = validRecords.map((r) => {
    totalEe += r.epfEmployee;
    totalEr += r.epfEmployer;
    totalWages += r.grossWage;
    const nric = padRight(sanitizeNric(r.nric), 12);
    const name = padRight(asciiOnly(r.employeeName).toUpperCase(), 40);
    const ee = padLeft(centsString(r.epfEmployee), 8, '0');
    const er = padLeft(centsString(r.epfEmployer), 8, '0');
    const wage = padLeft(String(Math.floor(r.grossWage)), 6, '0');
    const filler = padRight('', 6);
    return nric + name + ee + er + wage + filler;
  });

  const header =
    'H' +
    padRight(employer.epfEmployerNumber, 8) +
    periodStr +
    padLeft(String(validRecords.length), 5, '0') +
    padRight('', 60);
  const footer =
    'T' +
    padLeft(centsString(totalEe), 10, '0') +
    padLeft(centsString(totalEr), 10, '0') +
    padLeft(String(Math.floor(totalWages)), 10, '0') +
    padRight('', 49);

  return [header, ...detail, footer].join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// PERKESO ASSIST — SOCSO + EIS combined contribution file
// ---------------------------------------------------------------------------
// ASSIST CSV template (downloadable from the portal):
//   IC_NO,NAME,WAGE,SOCSO_EE,SOCSO_ER,EIS_EE,EIS_ER
// Header row + one detail row per employee + total row.
// ---------------------------------------------------------------------------
export function exportPerkesoAssist(
  _employer: MyEmployerProfile,
  _period: MyFilingPeriod,
  records: MyEmployeeFilingRecord[],
): string {
  const lines: string[] = [];
  lines.push(['IC_NO', 'NAME', 'WAGE', 'SOCSO_EE', 'SOCSO_ER', 'EIS_EE', 'EIS_ER'].join(','));
  let totals = { wage: 0, socsoEe: 0, socsoEr: 0, eisEe: 0, eisEr: 0 };
  for (const r of records) {
    const hasContribution =
      (r.socsoEmployee ?? 0) + (r.socsoEmployer ?? 0) + (r.eisEmployee ?? 0) + (r.eisEmployer ?? 0) > 0;
    if (!hasContribution) continue;
    totals.wage += r.grossWage;
    totals.socsoEe += r.socsoEmployee;
    totals.socsoEr += r.socsoEmployer;
    totals.eisEe += r.eisEmployee;
    totals.eisEr += r.eisEmployer;
    lines.push([
      sanitizeNric(r.nric),
      csvEscape(r.employeeName),
      money(r.grossWage),
      money(r.socsoEmployee),
      money(r.socsoEmployer),
      money(r.eisEmployee),
      money(r.eisEmployer),
    ].join(','));
  }
  lines.push([
    'TOTAL',
    '',
    money(totals.wage),
    money(totals.socsoEe),
    money(totals.socsoEr),
    money(totals.eisEe),
    money(totals.eisEr),
  ].join(','));
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// HRD Corp e-TRiS — HRDC levy submission
// ---------------------------------------------------------------------------
// CSV: REGISTRATION_NO,IC_NO,NAME,WAGE,LEVY,YEAR,MONTH
// Levy is 1% of monthly wage (per `calculateHrdf`). Only includes
// Malaysian/PR workers (foreign workers are not levy-bearing).
// ---------------------------------------------------------------------------
export function exportHrdCorpEtris(
  employer: MyEmployerProfile,
  period: MyFilingPeriod,
  records: MyEmployeeFilingRecord[],
): string {
  const lines: string[] = [];
  lines.push(['REGISTRATION_NO', 'IC_NO', 'NAME', 'WAGE', 'LEVY', 'YEAR', 'MONTH'].join(','));
  let totalLevy = 0;
  let totalWage = 0;
  for (const r of records) {
    if ((r.hrdfEmployer ?? 0) <= 0) continue;
    totalLevy += r.hrdfEmployer;
    totalWage += r.grossWage;
    lines.push([
      employer.hrdfEmployerCode,
      sanitizeNric(r.nric),
      csvEscape(r.employeeName),
      money(r.grossWage),
      money(r.hrdfEmployer),
      String(period.year),
      pad2(period.month),
    ].join(','));
  }
  lines.push([
    'TOTAL', '', '', money(totalWage), money(totalLevy), String(period.year), pad2(period.month),
  ].join(','));
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function sanitizeNric(nric: string): string {
  return String(nric ?? '').replace(/[^0-9A-Za-z]/g, '');
}
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
function padLeft(v: string, width: number, fill = ' '): string {
  v = v.length > width ? v.slice(-width) : v;
  return v.padStart(width, fill);
}
function padRight(v: string, width: number, fill = ' '): string {
  v = v.length > width ? v.slice(0, width) : v;
  return v.padEnd(width, fill);
}
function money(n: number): string {
  return (Math.round((n ?? 0) * 100) / 100).toFixed(2);
}
function centsString(n: number): string {
  return String(Math.round((n ?? 0) * 100));
}
function asciiOnly(s: string): string {
  return String(s ?? '').replace(/[^\x20-\x7E]/g, '');
}
function csvEscape(v: string): string {
  if (v == null) return '';
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
function pipeEscape(v: string): string {
  return String(v ?? '').replace(/\|/g, ' ');
}
