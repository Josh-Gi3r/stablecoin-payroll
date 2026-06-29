/**
 * Settlement service — EOR-specific orchestration.
 *
 *   - autoDrawDepositForPayrollRun: on payroll approval, draw the gross
 *     payroll amount from the client's trust deposit (per employee, summed).
 *   - finalSettlement: on employee termination, compute the final pay
 *     (calculateTermination from leave.ts) AND refund the remaining deposit
 *     balance to the client.
 */

import { eq, and } from 'drizzle-orm';
import db from '../db/index.js';
import * as s from '../db/schema.js';
import { drawFromDeposit, refundDeposit, getDepositLedger } from './deposit.js';
import {
  calculateTermination,
  type TerminationContext,
  type TerminationBreakdown,
} from './leave.js';

// ---------------------------------------------------------------------------
// Auto-draw from trust deposit when an EOR payroll run is approved.
// Only applies to clients on the 'eor' mode tier — others have no deposit.
// ---------------------------------------------------------------------------
export async function autoDrawDepositForPayrollRun(payrollRunId: string): Promise<void> {
  const [run] = await db.select().from(s.payrollRuns).where(eq(s.payrollRuns.id, payrollRunId));
  if (!run || !run.clientId) return;

  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, run.clientId));
  if (!client || client.mode !== 'eor') return;

  const slips = await db
    .select()
    .from(s.payslips)
    .where(eq(s.payslips.payrollRunId, payrollRunId));

  // For each employee on the run, draw their gross + employer statutory from
  // their deposit. We use the most recent received deposit row.
  for (const slip of slips) {
    const employerStatutory =
      (slip.epfEmployer ?? 0) +
      (slip.socsoEmployer ?? 0) +
      (slip.eisEmployer ?? 0) +
      (slip.hrdf ?? 0);
    const drawAmount = (slip.grossPay ?? 0) + employerStatutory;
    if (drawAmount <= 0) continue;

    const deposits = await db
      .select()
      .from(s.deposits)
      .where(and(eq(s.deposits.employeeId, slip.employeeId), eq(s.deposits.status, 'received')));
    const dep = deposits[0];
    if (!dep) continue;

    await drawFromDeposit(
      dep.id,
      drawAmount,
      `PAYRUN-${payrollRunId}`,
      `Auto-draw on payroll approval for slip ${slip.id}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Final settlement on termination.
// ---------------------------------------------------------------------------
export interface FinalSettlementInput {
  employeeId: string;
  cessationDate: string;          // YYYY-MM-DD
  initiatedBy: 'employer' | 'employee' | 'misconduct';
  unusedAnnualLeaveDays: number;
  noticeInLieuDays: number;
  contractualSeverance?: number;
  terminationBenefits?: number;
}

export interface FinalSettlementResult {
  breakdown: TerminationBreakdown;
  depositRefunded: number;
  depositRefundLedgerEntry?: { ledgerId: string; depositId: string };
}

export async function finalSettlement(input: FinalSettlementInput): Promise<FinalSettlementResult> {
  const [emp] = await db.select().from(s.employees).where(eq(s.employees.id, input.employeeId));
  if (!emp) throw new Error(`Employee ${input.employeeId} not found`);
  if (!emp.clientId) throw new Error(`Employee ${input.employeeId} has no client`);

  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, emp.clientId));
  if (!client) throw new Error(`Client ${emp.clientId} not found`);

  const country = (client.country ?? 'MY') as 'MY' | 'SG';

  // Compute tenure.
  const hire = new Date(emp.hireDate);
  const cessation = new Date(input.cessationDate);
  const tenureMonths =
    (cessation.getFullYear() - hire.getFullYear()) * 12 + (cessation.getMonth() - hire.getMonth());

  // Days worked in the cessation month.
  const daysInMonth = new Date(cessation.getFullYear(), cessation.getMonth() + 1, 0).getDate();
  const daysWorked = cessation.getDate();

  // Compute deposit refund: balance = sum(receive) + sum(top_up) - sum(draw) - sum(refund)
  let depositRefunded = 0;
  let depositRefundLedgerEntry: { ledgerId: string; depositId: string } | undefined;
  if (client.mode === 'eor') {
    const deposits = await db
      .select()
      .from(s.deposits)
      .where(and(eq(s.deposits.employeeId, emp.id), eq(s.deposits.status, 'received')));
    const dep = deposits[0];
    if (dep) {
      const ledger = await getDepositLedger(dep.id);
      const balance = ledger.reduce((sum, l) => {
        if (l.txType === 'receive' || l.txType === 'top_up') return sum + l.amount;
        return sum - l.amount;
      }, 0);
      if (balance > 0) {
        await refundDeposit(dep.id, balance, `Termination refund — ${input.cessationDate}`);
        depositRefunded = balance;
        const newLedger = await getDepositLedger(dep.id);
        const refundEntry = newLedger[newLedger.length - 1];
        depositRefundLedgerEntry = { ledgerId: refundEntry.id, depositId: dep.id };
      }
    }
  }

  const ctx: TerminationContext = {
    country,
    monthlyWage: emp.salary,
    tenureMonths,
    daysWorkedInLastMonth: daysWorked,
    daysInLastMonth: daysInMonth,
    unusedAnnualLeaveDays: input.unusedAnnualLeaveDays,
    noticeInLieuDays: input.noticeInLieuDays,
    initiatedBy: input.initiatedBy,
    contractualSeverance: input.contractualSeverance,
    terminationBenefits: input.terminationBenefits,
    depositRefund: depositRefunded,
  };

  const breakdown = calculateTermination(ctx);
  return { breakdown, depositRefunded, depositRefundLedgerEntry };
}
