/**
 * IRAS annual-filings engine — Singapore.
 *
 * Generates the structured payload + CSV/XML export for:
 *   - IR8A: Return of Employee's Remuneration (annual, by 1 March)
 *   - Appendix 8A: Value of benefits-in-kind
 *   - Appendix 8B: Gains/profits from employee share schemes
 *   - IR21: Tax clearance for foreign employees ceasing employment
 *           (must be filed ≥1 month before last working day)
 *   - AIS (Auto-Inclusion Scheme): payroll vendors submit IR8A data on
 *           employees' behalf in CSV/XML (mandatory for employers ≥5 staff)
 *
 * This is the in-memory generation layer. The downstream PDF/CSV writer
 * is wired via server/services/pdf.ts in a follow-up.
 */

export interface Ir8aRecord {
  employeeId: string;
  employeeName: string;
  nric: string;
  dateOfBirth: string;
  sex: 'M' | 'F';
  nationality: string;
  designation: string;
  yearOfAssessment: number;       // e.g. 2026 → reports 2025 income
  // Income
  grossSalary: number;
  bonus: number;
  directorsFees: number;
  allowances: number;
  // Deductions
  cpfContribution: number;        // employee CPF
  donations: number;
  // Optional appendices
  benefitsInKind?: Appendix8A;
  shareScheme?: Appendix8B;
}

export interface Appendix8A {
  accommodation: number;
  carBenefit: number;
  utilities: number;
  servants: number;
  other: number;
  total: number;
}

export interface Appendix8B {
  schemeName: string;
  exerciseDate: string;
  numberOfShares: number;
  marketValuePerShare: number;
  exercisePricePerShare: number;
  gain: number;
}

export interface Ir21Record {
  employeeId: string;
  employeeName: string;
  nric: string;
  cessationDate: string;          // last working day
  reasonForCessation: 'resignation' | 'termination' | 'transfer_overseas' | 'other';
  // YTD income from 1 Jan to cessation date
  ytdIncome: Ir8aRecord;
  expectedDeparture: boolean;     // does the foreign employee plan to leave SG?
  monetaryHeldback: number;       // amount the employer is withholding pending clearance
}

// ---------------------------------------------------------------------------
// IR8A generation
// ---------------------------------------------------------------------------
export function generateIr8a(input: Omit<Ir8aRecord, 'yearOfAssessment'> & { yearOfAssessment?: number }): Ir8aRecord {
  const ya = input.yearOfAssessment ?? new Date().getFullYear() + 1;
  return { ...input, yearOfAssessment: ya };
}

export function ir8aTotalIncome(rec: Ir8aRecord): number {
  return (
    rec.grossSalary +
    rec.bonus +
    rec.directorsFees +
    rec.allowances +
    (rec.benefitsInKind?.total ?? 0) +
    (rec.shareScheme?.gain ?? 0)
  );
}

// ---------------------------------------------------------------------------
// Appendix 8A — Benefits-in-Kind valuation
// ---------------------------------------------------------------------------
export function calculateAppendix8A(items: Partial<Appendix8A>): Appendix8A {
  const total =
    (items.accommodation ?? 0) +
    (items.carBenefit ?? 0) +
    (items.utilities ?? 0) +
    (items.servants ?? 0) +
    (items.other ?? 0);
  return {
    accommodation: items.accommodation ?? 0,
    carBenefit: items.carBenefit ?? 0,
    utilities: items.utilities ?? 0,
    servants: items.servants ?? 0,
    other: items.other ?? 0,
    total: round(total),
  };
}

// ---------------------------------------------------------------------------
// IR21 generation — tax clearance for foreign employees
// ---------------------------------------------------------------------------
// Validates the ≥1-month-before rule: cessationDate must be ≥30 days after
// today. Returns null + reason if not.
// ---------------------------------------------------------------------------
export function generateIr21(input: Omit<Ir21Record, 'monetaryHeldback'> & { monetaryHeldback?: number }):
  { record: Ir21Record; warnings: string[] } {
  const warnings: string[] = [];
  const cessation = new Date(input.cessationDate);
  const today = new Date();
  const daysUntilCessation = Math.floor((cessation.getTime() - today.getTime()) / 86400000);
  if (daysUntilCessation < 30) {
    warnings.push(
      `IR21 should be filed ≥1 month before last working day. Cessation in ${daysUntilCessation} days.`,
    );
  }
  return {
    record: {
      ...input,
      monetaryHeldback: input.monetaryHeldback ?? Math.max(0, ir8aTotalIncome(input.ytdIncome)),
    },
    warnings,
  };
}

// ---------------------------------------------------------------------------
// AIS export — Auto-Inclusion Scheme CSV
// IRAS publishes the format in the AIS Salary Specifications. We emit the
// minimum required column set; the production format adds many optional cols.
// ---------------------------------------------------------------------------
const AIS_COLUMNS = [
  'NRIC/FIN',
  'Name',
  'Date of Birth',
  'Sex',
  'Nationality',
  'Designation',
  'YA',
  'Gross Salary',
  'Bonus',
  "Director's Fees",
  'Allowances',
  'Benefits in Kind',
  'Share Scheme Gain',
  'CPF (Employee)',
  'Donations',
  'Total Income',
] as const;

export function exportAisCsv(records: Ir8aRecord[]): string {
  const header = AIS_COLUMNS.join(',');
  const rows = records.map((r) => [
    r.nric,
    csvEscape(r.employeeName),
    r.dateOfBirth,
    r.sex,
    csvEscape(r.nationality),
    csvEscape(r.designation),
    r.yearOfAssessment,
    r.grossSalary,
    r.bonus,
    r.directorsFees,
    r.allowances,
    r.benefitsInKind?.total ?? 0,
    r.shareScheme?.gain ?? 0,
    r.cpfContribution,
    r.donations,
    ir8aTotalIncome(r),
  ].join(','));
  return [header, ...rows].join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// AIS export — XML
// IRAS legacy XML format (still supported alongside CSV). Minimal envelope.
// ---------------------------------------------------------------------------
export function exportAisXml(records: Ir8aRecord[], employerUEN: string): string {
  const items = records.map((r) => `
    <Employee>
      <NRIC>${xmlEscape(r.nric)}</NRIC>
      <Name>${xmlEscape(r.employeeName)}</Name>
      <DateOfBirth>${r.dateOfBirth}</DateOfBirth>
      <Sex>${r.sex}</Sex>
      <Nationality>${xmlEscape(r.nationality)}</Nationality>
      <Designation>${xmlEscape(r.designation)}</Designation>
      <YA>${r.yearOfAssessment}</YA>
      <GrossSalary>${r.grossSalary}</GrossSalary>
      <Bonus>${r.bonus}</Bonus>
      <DirectorsFees>${r.directorsFees}</DirectorsFees>
      <Allowances>${r.allowances}</Allowances>
      <BIK>${r.benefitsInKind?.total ?? 0}</BIK>
      <ShareGain>${r.shareScheme?.gain ?? 0}</ShareGain>
      <CPFEmployee>${r.cpfContribution}</CPFEmployee>
      <Donations>${r.donations}</Donations>
      <TotalIncome>${ir8aTotalIncome(r)}</TotalIncome>
    </Employee>`.trim()).join('\n  ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<AISSubmission>
  <Employer>
    <UEN>${xmlEscape(employerUEN)}</UEN>
  </Employer>
  ${items}
</AISSubmission>`;
}

// ---------------------------------------------------------------------------
// MOM 2024 work-pass eligibility gate
// ---------------------------------------------------------------------------
// Per MOM's Sep 2024 advisory, an EOR cannot sponsor work passes (EP / S Pass /
// Work Permit) for foreign nationals — the legal-employer must be the actual
// hiring company. EOR engagement is allowed for:
//   - Singapore Citizens
//   - Permanent Residents
//   - Foreign nationals who already hold a valid pass tied to another employer
//     (a Letter of Consent type arrangement, narrow)
// ---------------------------------------------------------------------------
export type SgEorEligibilityStatus =
  | 'eligible_citizen'
  | 'eligible_pr'
  | 'eligible_existing_pass'
  | 'blocked_requires_sponsorship'
  | 'blocked_unknown';

export interface SgEorEligibilityInput {
  nationality: 'singapore_citizen' | 'pr' | 'foreign';
  hasValidExistingPass?: boolean;
}

export function checkSgEorEligibility(input: SgEorEligibilityInput): {
  status: SgEorEligibilityStatus;
  reason: string;
  blocked: boolean;
} {
  if (input.nationality === 'singapore_citizen') {
    return {
      status: 'eligible_citizen',
      reason: 'Singapore Citizens may be employed via EOR without work-pass concerns.',
      blocked: false,
    };
  }
  if (input.nationality === 'pr') {
    return {
      status: 'eligible_pr',
      reason: 'Permanent Residents may be employed via EOR without work-pass concerns.',
      blocked: false,
    };
  }
  if (input.nationality === 'foreign' && input.hasValidExistingPass) {
    return {
      status: 'eligible_existing_pass',
      reason: 'Foreign national with valid existing pass — case-by-case, requires MOM Letter of Consent. Refer to compliance.',
      blocked: false,
    };
  }
  if (input.nationality === 'foreign') {
    return {
      status: 'blocked_requires_sponsorship',
      reason:
        'EOR cannot sponsor Singapore work passes per MOM Sep 2024 advisory. ' +
        'The hiring entity must engage this employee directly.',
      blocked: true,
    };
  }
  return { status: 'blocked_unknown', reason: 'Insufficient information.', blocked: true };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function csvEscape(v: string): string {
  if (v == null) return '';
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function xmlEscape(v: string): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
