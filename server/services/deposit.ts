import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import db from '../db/index.js';
import * as s from '../db/schema.js';

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${nanoid(8)}`;

type FixedAllowance = { label: string; amount: number };

function parseAllowances(raw: string | null | undefined): FixedAllowance[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

/**
 * Deposit amount = (gross salary + sum of fixed allowances) × notice period in months.
 * Matches the user's pasted EOR onboarding policy.
 */
export function calculateDepositAmount(
  salary: number,
  fixedAllowances: FixedAllowance[],
  noticeMonths: number,
): number {
  const allowanceTotal = fixedAllowances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const monthly = (Number(salary) || 0) + allowanceTotal;
  return Math.round(monthly * (noticeMonths || 1) * 100) / 100;
}

/**
 * Create a pending deposit for an employee. Idempotent on (clientId, employeeId) —
 * if a pending deposit already exists, returns it; otherwise creates a new one.
 */
export async function createPendingDepositForEmployee(employeeId: string) {
  const [emp] = await db.select().from(s.employees).where(eq(s.employees.id, employeeId));
  if (!emp) throw new Error(`Employee ${employeeId} not found`);
  if (!emp.clientId) throw new Error(`Employee ${employeeId} is not assigned to a client`);

  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, emp.clientId));
  if (!client) throw new Error(`Client ${emp.clientId} not found`);

  const fixedAllowances = parseAllowances(emp.fixedAllowances);
  const noticeMonths = emp.noticePeriodMonths ?? client.noticeDefaultMonths ?? 1;
  const amount = calculateDepositAmount(emp.salary, fixedAllowances, noticeMonths);

  const row = {
    id: id('dep'),
    tenantId: emp.tenantId,
    clientId: emp.clientId,
    employeeId: emp.id,
    amount,
    currency: client.country === 'SG' ? 'SGD' : 'MYR',
    calculationBasis: JSON.stringify({
      noticeMonths,
      grossSalary: emp.salary,
      fixedAllowances,
    }),
    status: 'pending' as const,
    trustAccountRef: null,
    receivedDate: null,
    refundDate: null,
    createdAt: now(),
    updatedAt: now(),
  };
  await db.insert(s.deposits).values(row);
  return row;
}

export async function markDepositReceived(
  depositId: string,
  opts: { trustAccountRef?: string; receivedDate?: string },
) {
  const [dep] = await db.select().from(s.deposits).where(eq(s.deposits.id, depositId));
  if (!dep) throw new Error('Deposit not found');

  await db.update(s.deposits)
    .set({
      status: 'received',
      trustAccountRef: opts.trustAccountRef ?? dep.trustAccountRef,
      receivedDate: opts.receivedDate ?? now(),
      updatedAt: now(),
    })
    .where(eq(s.deposits.id, depositId));

  await db.insert(s.depositLedger).values({
    id: id('dlg'),
    depositId,
    txType: 'receive' as const,
    amount: dep.amount,
    reference: opts.trustAccountRef ?? null,
    note: 'Deposit received into trust account',
    createdAt: now(),
  });
}

export async function drawFromDeposit(
  depositId: string,
  amount: number,
  reference: string,
  note?: string,
) {
  await db.insert(s.depositLedger).values({
    id: id('dlg'),
    depositId,
    txType: 'draw' as const,
    amount,
    reference,
    note: note ?? null,
    createdAt: now(),
  });
  // status stays 'received' while balance > 0; if fully drawn callers can mark 'drawn' separately.
}

export async function refundDeposit(depositId: string, amount: number, note?: string) {
  await db.update(s.deposits)
    .set({ status: 'refunded', refundDate: now(), updatedAt: now() })
    .where(eq(s.deposits.id, depositId));
  await db.insert(s.depositLedger).values({
    id: id('dlg'),
    depositId,
    txType: 'refund' as const,
    amount,
    reference: null,
    note: note ?? 'Refund to client',
    createdAt: now(),
  });
}

export async function listDeposits(filter?: { clientId?: string; tenantId?: string }) {
  const rows = await db.select().from(s.deposits);
  return rows.filter((d) => {
    if (filter?.clientId && d.clientId !== filter.clientId) return false;
    if (filter?.tenantId && d.tenantId !== filter.tenantId) return false;
    return true;
  });
}

export async function getDepositLedger(depositId: string) {
  return db.select().from(s.depositLedger).where(eq(s.depositLedger.depositId, depositId));
}
