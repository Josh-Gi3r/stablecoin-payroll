import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import db from '../db/index.js';
import * as s from '../db/schema.js';

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${nanoid(8)}`;

/**
 * Generate a client invoice from an approved payroll run.
 * Line items: (1) gross payroll pass-through, (2) employer statutory pass-through,
 * (3) service fee (% of gross payroll).
 * Idempotent: if an invoice already links to this payroll run, returns it.
 */
export async function generateClientInvoiceForPayrollRun(payrollRunId: string) {
  const existing = await db.select().from(s.invoices).where(eq(s.invoices.payrollRunId, payrollRunId));
  if (existing.length > 0) return existing[0];

  const [run] = await db.select().from(s.payrollRuns).where(eq(s.payrollRuns.id, payrollRunId));
  if (!run) throw new Error(`Payroll run ${payrollRunId} not found`);
  if (!run.clientId) throw new Error(`Payroll run ${payrollRunId} has no client attached`);

  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, run.clientId));
  if (!client) throw new Error(`Client ${run.clientId} not found`);

  const slips = await db.select().from(s.payslips).where(eq(s.payslips.payrollRunId, payrollRunId));

  const grossPayroll = slips.reduce((sum, p) => sum + (p.grossPay ?? 0), 0);
  const employerStatutory = slips.reduce((sum, p) => {
    return sum + (p.epfEmployer ?? 0) + (p.socsoEmployer ?? 0) + (p.eisEmployer ?? 0) + (p.hrdf ?? 0);
  }, 0);
  const serviceFeePct = client.serviceFeePct ?? 0.05;
  const serviceFeeAmount = Math.round(grossPayroll * serviceFeePct * 100) / 100;
  const subtotal = Math.round((grossPayroll + employerStatutory + serviceFeeAmount) * 100) / 100;
  const total = subtotal;

  const invoiceId = id('inv');
  const invoiceNumber = `INV-EOR-${new Date().getFullYear()}-${invoiceId.slice(-6).toUpperCase()}`;
  const issueDate = now().slice(0, 10);
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const invoiceRow = {
    id: invoiceId,
    tenantId: run.tenantId,
    clientId: run.clientId,
    payrollRunId,
    invoiceNumber,
    customerId: null,
    issueDate,
    dueDate,
    currency: client.country === 'SG' ? 'SGD' : 'MYR',
    status: 'draft' as const,
    subtotal,
    taxRate: 0,
    taxAmount: 0,
    total,
    amountPaid: 0,
    amountDue: total,
    serviceFeePct,
    serviceFeeAmount,
    platformFee: serviceFeePct, // keep legacy column in sync
    notes: `Auto-generated from payroll run ${payrollRunId}.`,
    createdAt: now(),
    sentAt: null,
    paidAt: null,
  };
  await db.insert(s.invoices).values(invoiceRow);

  const lineItems = [
    {
      id: id('li'),
      invoiceId,
      description: 'Payroll pass-through (gross salaries + allowances)',
      quantity: 1,
      unitPrice: grossPayroll,
      amount: grossPayroll,
      taxable: false,
    },
    {
      id: id('li'),
      invoiceId,
      description: 'Employer statutory contributions (EPF + SOCSO + EIS + HRDF)',
      quantity: 1,
      unitPrice: employerStatutory,
      amount: employerStatutory,
      taxable: false,
    },
    {
      id: id('li'),
      invoiceId,
      description: `EOR service fee (${(serviceFeePct * 100).toFixed(2)}% of gross payroll)`,
      quantity: 1,
      unitPrice: serviceFeeAmount,
      amount: serviceFeeAmount,
      taxable: false,
    },
  ];
  for (const li of lineItems) {
    await db.insert(s.invoiceLineItems).values(li);
  }

  return invoiceRow;
}
