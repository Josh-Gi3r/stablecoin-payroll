import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import db from '../db/index.js';
import * as s from '../db/schema.js';

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${nanoid(8)}`;

type RenderContext = Record<string, string | number | null | undefined>;

/**
 * Substitute {{variable}} tokens in a template body. Missing variables are
 * rendered as an underscored placeholder so the gap is visible in the PDF.
 */
export function renderTemplate(body: string, ctx: RenderContext): string {
  return body.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_m, key) => {
    const v = ctx[key];
    if (v === undefined || v === null || v === '') return `________________`;
    return String(v);
  });
}

export async function buildContextForEmployee(employeeId: string) {
  const [emp] = await db.select().from(s.employees).where(eq(s.employees.id, employeeId));
  if (!emp) throw new Error(`Employee ${employeeId} not found`);
  const [client] = emp.clientId
    ? await db.select().from(s.clients).where(eq(s.clients.id, emp.clientId))
    : [null];

  return {
    effective_date: now().slice(0, 10),
    employee_full_name: `${emp.firstName} ${emp.lastName}`,
    employee_email: emp.email,
    employee_phone: emp.phone ?? '',
    employee_position: emp.position,
    employee_department: emp.department,
    employee_salary: emp.salary,
    employee_currency: emp.currency,
    employee_hire_date: emp.hireDate,
    notice_period_months: emp.noticePeriodMonths,
    client_name: client?.name ?? '',
    client_registration_number: client?.registrationNumber ?? '',
    client_tax_id: client?.taxId ?? '',
    operator_entity_name: process.env.OPERATOR_NAME ?? 'EOR Operations',
    country: emp.country ?? 'MY',
  } satisfies RenderContext;
}

export async function generateContract(opts: {
  templateId: string;
  employeeId: string;
  extraVariables?: RenderContext;
}) {
  const [template] = await db
    .select()
    .from(s.contractTemplates)
    .where(eq(s.contractTemplates.id, opts.templateId));
  if (!template) throw new Error('Template not found');

  const [emp] = await db.select().from(s.employees).where(eq(s.employees.id, opts.employeeId));
  if (!emp) throw new Error('Employee not found');

  const ctx = {
    ...(await buildContextForEmployee(opts.employeeId)),
    ...(opts.extraVariables ?? {}),
  };
  const renderedBody = renderTemplate(template.body, ctx);

  const contractId = id('ctr');
  const row = {
    id: contractId,
    tenantId: emp.tenantId,
    clientId: emp.clientId,
    employeeId: emp.id,
    templateId: template.id,
    templateVersion: template.version,
    renderedPdfS3Key: null,
    renderedPdfUrl: null,
    status: 'draft' as const,
    signatures: JSON.stringify([]),
    createdAt: now(),
    completedAt: null,
  };
  await db.insert(s.contracts).values(row);
  return { contract: row, renderedBody, template };
}

type Signature = {
  party: 'operator' | 'client' | 'employee';
  signerName: string;
  signerEmail: string;
  signedAt: string;
  ip?: string;
  method: 'in_app_typed' | 'docusign' | 'adobe';
};

export async function addSignature(
  contractId: string,
  sig: Omit<Signature, 'signedAt' | 'method'> & { ip?: string },
) {
  const [row] = await db.select().from(s.contracts).where(eq(s.contracts.id, contractId));
  if (!row) throw new Error('Contract not found');
  const existing: Signature[] = row.signatures ? JSON.parse(row.signatures) : [];
  if (existing.some((s) => s.party === sig.party)) {
    throw new Error(`Party '${sig.party}' has already signed`);
  }
  const signedAt = now();
  const next: Signature[] = [
    ...existing,
    {
      party: sig.party,
      signerName: sig.signerName,
      signerEmail: sig.signerEmail,
      signedAt,
      ip: sig.ip,
      method: 'in_app_typed',
    },
  ];
  const allParties: Signature['party'][] = ['operator', 'client', 'employee'];
  const signedParties = next.map((s) => s.party);
  const allSigned = allParties.every((p) => signedParties.includes(p));
  const status: (typeof row)['status'] = allSigned
    ? 'signed'
    : next.length > 0
      ? 'partially_signed'
      : 'draft';

  await db.update(s.contracts)
    .set({
      signatures: JSON.stringify(next),
      status,
      completedAt: allSigned ? signedAt : null,
    })
    .where(eq(s.contracts.id, contractId));

  return { status, signatures: next };
}
