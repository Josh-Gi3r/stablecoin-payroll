import { Router, Request, Response } from 'express';
import { eq, desc, sql, and, like, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import db from '../db/index.js';
import * as s from '../db/schema.js';
import { authMiddleware, requireRole, buildTenantScope } from '../middleware/auth.js';
import documentsRouter from './documents.js';

const router = Router();
router.use(authMiddleware);

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${nanoid(8)}`;

// ============================================================================
// DASHBOARD
// ============================================================================

router.get('/dashboard/metrics', async (req: Request, res: Response) => {
  try {
    const [empCount] = await db.select({ count: sql<number>`count(*)` }).from(s.employees).where(eq(s.employees.status, 'active'));
    const [invTotals] = await db.select({
      total: sql<number>`count(*)`,
      outstanding: sql<number>`coalesce(sum(case when status in ('sent','viewed','partially-paid') then amount_due else 0 end), 0)`,
      paid: sql<number>`coalesce(sum(case when status = 'paid' then total else 0 end), 0)`,
      overdue: sql<number>`coalesce(sum(case when status = 'overdue' then amount_due else 0 end), 0)`,
      overdueCount: sql<number>`coalesce(sum(case when status = 'overdue' then 1 else 0 end), 0)`,
    }).from(s.invoices);
    const [expTotals] = await db.select({
      total: sql<number>`count(*)`,
      pending: sql<number>`coalesce(sum(case when status = 'submitted' then 1 else 0 end), 0)`,
      approved: sql<number>`coalesce(sum(case when status = 'approved' then amount else 0 end), 0)`,
      reimbursed: sql<number>`coalesce(sum(case when status = 'reimbursed' then amount else 0 end), 0)`,
    }).from(s.expenses);
    const walletRows = await db.select().from(s.wallets).where(eq(s.wallets.userId, 'usr-001'));
    const balByStable: Record<string, number> = {};
    let totalBal = 0;
    for (const w of walletRows) { balByStable[w.stablecoin] = w.balance; totalBal += w.balance; }
    const [yieldTotal] = await db.select({ total: sql<number>`coalesce(sum(yield_earned), 0)` }).from(s.treasuryDeposits).where(eq(s.treasuryDeposits.status, 'active'));
    const [revRow] = await db.select({ total: sql<number>`coalesce(sum(balance), 0)` }).from(s.chartOfAccounts).where(eq(s.chartOfAccounts.accountType, 'revenue'));
    const [expRow] = await db.select({ total: sql<number>`coalesce(sum(balance), 0)` }).from(s.chartOfAccounts).where(eq(s.chartOfAccounts.accountType, 'expense'));

    res.json({
      payroll: { totalEmployees: empCount.count, nextPayrollDate: '2026-02-20', totalPayrollCost: 48500, currency: 'USDC' },
      invoicing: { totalInvoices: invTotals.total, outstandingAmount: invTotals.outstanding, paidAmount: invTotals.paid, overdueAmount: invTotals.overdue, overdueCount: invTotals.overdueCount },
      expenses: { totalExpenses: expTotals.total, pendingApproval: expTotals.pending, approvedAmount: expTotals.approved, reimbursedAmount: expTotals.reimbursed },
      treasury: { totalBalance: totalBal, balanceByStablecoin: balByStable, totalYield: yieldTotal.total, yieldRate: 0.05 },
      financials: { revenue: revRow.total, expenses: expRow.total, netIncome: revRow.total - expRow.total, cashFlow: totalBal * 0.09 },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Per-tenant client-summary KPI strip. Used by ClientDashboard / PayrollOnlyDashboard.
router.get('/dashboard/client-summary', async (req: Request, res: Response) => {
  try {
    const empScope = buildTenantScope(req, { tenantId: s.employees.tenantId, clientId: s.employees.clientId });
    const empWhere = empScope ? and(eq(s.employees.status, 'active'), empScope) : eq(s.employees.status, 'active');
    const [empRow] = await db
      .select({ count: sql<number>`count(*)`, totalSalary: sql<number>`coalesce(sum(salary), 0)` })
      .from(s.employees)
      .where(empWhere);

    const runScope = buildTenantScope(req, { tenantId: s.payrollRuns.tenantId, clientId: s.payrollRuns.clientId });
    const runQ = db.select().from(s.payrollRuns);
    const runs = runScope
      ? await runQ.where(runScope).orderBy(desc(s.payrollRuns.payDate)).limit(1)
      : await runQ.orderBy(desc(s.payrollRuns.payDate)).limit(1);
    const latest = runs[0];

    const nextPayDate = latest?.payDate ?? null;
    const monthlyPayrollMyr = latest?.totalGrossPay ?? 0;
    const employerContrib = latest ? (latest.totalGrossPay * 0.13) : 0; // EPF 13% employer share approx

    res.json({
      headcount: empRow?.count ?? 0,
      totalSalary: empRow?.totalSalary ?? 0,
      monthlyPayroll: monthlyPayrollMyr,
      currency: latest?.currency ?? 'MYR',
      nextPayDate,
      payrollAccuracy: 99.8,
      employerContrib,
      latestRunStatus: latest?.status ?? null,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// 12-month payroll cost trend by month from payrollRuns. Empty when no runs.
router.get('/dashboard/payroll-cost-trend', async (req: Request, res: Response) => {
  try {
    const scope = buildTenantScope(req, { tenantId: s.payrollRuns.tenantId, clientId: s.payrollRuns.clientId });
    const baseQ = db.select({
      month: sql<string>`substr(${s.payrollRuns.payDate}, 1, 7)`,
      cost: sql<number>`coalesce(sum(${s.payrollRuns.totalGrossPay}), 0)`,
    }).from(s.payrollRuns);
    const rows = scope
      ? await baseQ.where(scope).groupBy(sql`substr(${s.payrollRuns.payDate}, 1, 7)`).orderBy(sql`substr(${s.payrollRuns.payDate}, 1, 7)`)
      : await baseQ.groupBy(sql`substr(${s.payrollRuns.payDate}, 1, 7)`).orderBy(sql`substr(${s.payrollRuns.payDate}, 1, 7)`);
    const recent = rows.slice(-12);
    const enriched = recent.map((r, i) => {
      const window = recent.slice(Math.max(0, i - 3), i);
      const avg = window.length ? window.reduce((s, w) => s + w.cost, 0) / window.length : r.cost;
      return { month: r.month.slice(5), cost: r.cost, budget: Math.round(avg * 1.05) };
    });
    res.json(enriched);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Salary totals by department.
router.get('/dashboard/department-totals', async (req: Request, res: Response) => {
  try {
    const scope = buildTenantScope(req, { tenantId: s.employees.tenantId, clientId: s.employees.clientId });
    const where = scope ? and(eq(s.employees.status, 'active'), scope) : eq(s.employees.status, 'active');
    const rows = await db
      .select({
        name: s.employees.department,
        value: sql<number>`coalesce(sum(${s.employees.salary}), 0)`,
      })
      .from(s.employees)
      .where(where)
      .groupBy(s.employees.department);
    res.json(rows.filter((r: any) => r.name).sort((a: any, b: any) => b.value - a.value));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Top earners by salary.
router.get('/dashboard/top-earners', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '5')) || 5, 50);
    const scope = buildTenantScope(req, { tenantId: s.employees.tenantId, clientId: s.employees.clientId });
    const where = scope ? and(eq(s.employees.status, 'active'), scope) : eq(s.employees.status, 'active');
    const rows = await db
      .select({
        id: s.employees.id,
        firstName: s.employees.firstName,
        lastName: s.employees.lastName,
        salary: s.employees.salary,
      })
      .from(s.employees)
      .where(where)
      .orderBy(desc(s.employees.salary))
      .limit(limit);
    res.json(rows.map((r: any) => ({
      id: r.id,
      name: `${r.firstName} ${r.lastName}`.trim(),
      value: r.salary,
      displayValue: r.salary >= 1000 ? `${(r.salary / 1000).toFixed(1)}K` : `${r.salary}`,
    })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Recent activity from auditLogs.
router.get('/dashboard/recent-activity', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '8')) || 8, 50);
    const scope = buildTenantScope(req, { tenantId: s.auditLogs.tenantId });
    const baseQ = db.select().from(s.auditLogs);
    const rows = scope
      ? await baseQ.where(scope).orderBy(desc(s.auditLogs.timestamp)).limit(limit)
      : await baseQ.orderBy(desc(s.auditLogs.timestamp)).limit(limit);
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// EMPLOYEES
// ============================================================================

router.get('/employees', async (req, res) => {
  try {
    const scope = buildTenantScope(req, { tenantId: s.employees.tenantId, clientId: s.employees.clientId });
    const q = db.select().from(s.employees);
    const rows = scope
      ? await q.where(scope).orderBy(s.employees.lastName)
      : await q.orderBy(s.employees.lastName);
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// /me must come before /:id so the literal segment matches first.
router.get('/employees/me', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const [row] = await db.select().from(s.employees).where(eq(s.employees.userId, userId));
    if (!row) return res.status(404).json({ error: 'No employee record matches this user' });
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/employees/:id', async (req, res) => {
  try {
    const scope = buildTenantScope(req, { tenantId: s.employees.tenantId, clientId: s.employees.clientId });
    const where = scope ? and(eq(s.employees.id, req.params.id), scope) : eq(s.employees.id, req.params.id);
    const [row] = await db.select().from(s.employees).where(where);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/employees', requireRole('admin', 'finance_controller', 'super_admin', 'hr', 'client_admin'), async (req: Request, res: Response) => {
  try {
    // Default tenantId/clientId from the authenticated user when the caller didn't provide them.
    // Super admins may create employees for any client by passing clientId explicitly; for
    // client-scoped users the server always pins the scope to their own client.
    const data: any = { id: id('emp'), ...req.body, createdAt: now(), updatedAt: now() };
    if (!data.tenantId) data.tenantId = req.user?.tenantId ?? null;
    if (!data.clientId) data.clientId = req.user?.clientId ?? null;

    // Guardrail: client-scoped users can't create employees for a different client.
    if (req.user?.clientId && data.clientId !== req.user.clientId) {
      return res.status(403).json({ error: 'Cannot create employee outside your own client scope' });
    }

    await db.insert(s.employees).values(data);
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/employees/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const role = req.user.role === 'admin' ? 'super_admin' : req.user.role;
    const [target] = await db.select().from(s.employees).where(eq(s.employees.id, req.params.id));
    if (!target) return res.status(404).json({ error: 'Not found' });

    // Authorization:
    //  - super_admin / hr / client_admin / finance: full edit (within tenant scope below)
    //  - employee: may only edit THEIR OWN record, and only self-service fields
    const isAdminish = ['super_admin', 'hr', 'client_admin', 'finance'].includes(role);
    const isSelf = target.userId === req.user.id;
    if (!isAdminish && !isSelf) {
      return res.status(403).json({ error: 'Cannot edit another employee' });
    }
    // Tenant guardrail for non-super-admin admins.
    if (role !== 'super_admin' && req.user.clientId && target.clientId !== req.user.clientId) {
      return res.status(403).json({ error: 'Cannot edit employees outside your own client' });
    }

    // Self-service whitelist: an employee editing their own profile can only
    // change personal/contact/bank/emergency/EPF beneficiary fields.
    const SELF_FIELDS = new Set([
      'firstName', 'lastName', 'email', 'phone',
      'nric', 'dateOfBirth', 'residentialAddress',
      'bankAccount',
      'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship',
      'epfBeneficiary',
    ]);
    let body = req.body || {};
    if (!isAdminish) {
      body = Object.fromEntries(
        Object.entries(body).filter(([k]) => SELF_FIELDS.has(k)),
      );
    }

    await db.update(s.employees).set({ ...body, updatedAt: now() }).where(eq(s.employees.id, req.params.id));
    const [row] = await db.select().from(s.employees).where(eq(s.employees.id, req.params.id));
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// PAYROLL
// ============================================================================

router.get('/payroll/runs', async (req, res) => {
  try {
    const scope = buildTenantScope(req, { tenantId: s.payrollRuns.tenantId, clientId: s.payrollRuns.clientId });
    const q = db.select().from(s.payrollRuns);
    const rows = scope
      ? await q.where(scope).orderBy(desc(s.payrollRuns.payDate))
      : await q.orderBy(desc(s.payrollRuns.payDate));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/payroll/runs/:id', async (req, res) => {
  try {
    const scope = buildTenantScope(req, { tenantId: s.payrollRuns.tenantId, clientId: s.payrollRuns.clientId });
    const where = scope ? and(eq(s.payrollRuns.id, req.params.id), scope) : eq(s.payrollRuns.id, req.params.id);
    const [run] = await db.select().from(s.payrollRuns).where(where);
    if (!run) return res.status(404).json({ error: 'Not found' });
    const slips = await db.select().from(s.payslips).where(eq(s.payslips.payrollRunId, req.params.id));
    res.json({ ...run, payslips: slips });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/payroll/runs', requireRole('admin', 'finance_controller'), async (req: Request, res: Response) => {
  try {
    const data = { id: id('pr'), ...req.body, status: 'draft' as const, createdAt: now() };
    await db.insert(s.payrollRuns).values(data);
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/payroll/runs/:id/status', requireRole('admin', 'finance_controller', 'approver', 'finance', 'client_admin'), async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const updates: any = { status };
    if (status === 'processed' || status === 'paid') updates.processedAt = now();
    await db.update(s.payrollRuns).set(updates).where(eq(s.payrollRuns.id, req.params.id));
    const [run] = await db.select().from(s.payrollRuns).where(eq(s.payrollRuns.id, req.params.id));

    // EOR billing hook: when a payroll run is approved, auto-generate the client invoice
    // AND auto-draw from the trust deposit if the client is on the EOR tier.
    if (status === 'approved' && run?.clientId) {
      try {
        const { generateClientInvoiceForPayrollRun } = await import('../services/billing.js');
        await generateClientInvoiceForPayrollRun(run.id);
      } catch (e) {
        console.error('billing hook failed', e);
      }
      try {
        const { autoDrawDepositForPayrollRun } = await import('../services/settlement.js');
        await autoDrawDepositForPayrollRun(run.id);
      } catch (e) {
        console.error('deposit auto-draw hook failed', e);
      }
    }

    res.json(run);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/payroll/payslips', async (req, res) => {
  try {
    const { employeeId } = req.query;
    const scope = buildTenantScope(req, { tenantId: s.payslips.tenantId, clientId: s.payslips.clientId });
    const empClause = employeeId ? eq(s.payslips.employeeId, employeeId as string) : undefined;
    // Employees see only their own payslips.
    const ownClause = req.user?.role === 'employee'
      ? eq(s.payslips.employeeId, req.user.id) // assumes user.id == employees.userId for employee role
      : undefined;
    const clauses = [scope, empClause, ownClause].filter(Boolean) as any[];
    const where = clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : and(...clauses);
    const q = db.select().from(s.payslips);
    const rows = where
      ? await q.where(where).orderBy(desc(s.payslips.createdAt))
      : await q.orderBy(desc(s.payslips.createdAt));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// CUSTOMERS & INVOICES
// ============================================================================

router.get('/customers', async (req, res) => {
  try {
    const scope = buildTenantScope(req, { tenantId: s.customers.tenantId });
    const q = db.select().from(s.customers);
    const rows = scope
      ? await q.where(scope).orderBy(s.customers.name)
      : await q.orderBy(s.customers.name);
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/customers', async (req: Request, res: Response) => {
  try {
    const data = { id: id('cust'), ...req.body, createdAt: now() };
    await db.insert(s.customers).values(data);
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/invoices', async (req, res) => {
  try {
    const scope = buildTenantScope(req, { tenantId: s.invoices.tenantId, clientId: s.invoices.clientId });
    const q = db.select().from(s.invoices);
    const rows = scope
      ? await q.where(scope).orderBy(desc(s.invoices.createdAt))
      : await q.orderBy(desc(s.invoices.createdAt));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/invoices/:id', async (req, res) => {
  try {
    const scope = buildTenantScope(req, { tenantId: s.invoices.tenantId, clientId: s.invoices.clientId });
    const where = scope ? and(eq(s.invoices.id, req.params.id), scope) : eq(s.invoices.id, req.params.id);
    const [inv] = await db.select().from(s.invoices).where(where);
    if (!inv) return res.status(404).json({ error: 'Not found' });
    const items = await db.select().from(s.invoiceLineItems).where(eq(s.invoiceLineItems.invoiceId, req.params.id));
    const payments = await db.select().from(s.payments).where(eq(s.payments.invoiceId, req.params.id));
    res.json({ ...inv, lineItems: items, paymentHistory: payments });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/invoices', async (req: Request, res: Response) => {
  try {
    const { lineItems, ...invData } = req.body;
    const invId = id('inv');
    await db.insert(s.invoices).values({ id: invId, ...invData, platformFee: 0.01, createdAt: now() });
    if (lineItems?.length) {
      for (const li of lineItems) {
        await db.insert(s.invoiceLineItems).values({ id: id('li'), invoiceId: invId, ...li });
      }
    }
    res.status(201).json({ id: invId, ...invData });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/invoices/:id', async (req: Request, res: Response) => {
  try {
    await db.update(s.invoices).set(req.body).where(eq(s.invoices.id, req.params.id));
    const [row] = await db.select().from(s.invoices).where(eq(s.invoices.id, req.params.id));
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const scope = buildTenantScope(req, { tenantId: s.invoices.tenantId, clientId: s.invoices.clientId });
    const where = scope ? and(eq(s.invoices.id, req.params.id), scope) : eq(s.invoices.id, req.params.id);
    const [row] = await db.select().from(s.invoices).where(where);
    if (!row) return res.status(404).json({ error: 'Not found' });
    await db.delete(s.invoices).where(where);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// EXPENSES & RECEIPTS
// ============================================================================

router.get('/expenses', async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    const scope = buildTenantScope(req, { tenantId: s.expenses.tenantId, clientId: s.expenses.clientId });
    const empClause = employeeId ? eq(s.expenses.employeeId, employeeId as string) : undefined;
    const statusClause = status ? eq(s.expenses.status, status as any) : undefined;
    const clauses = [scope, empClause, statusClause].filter(Boolean) as any[];
    const where = clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : and(...clauses);
    const q = db.select().from(s.expenses);
    const rows = where
      ? await q.where(where).orderBy(desc(s.expenses.date))
      : await q.orderBy(desc(s.expenses.date));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/expenses', async (req: Request, res: Response) => {
  try {
    const data = { id: id('exp'), ...req.body, status: 'submitted' as const, createdAt: now() };
    await db.insert(s.expenses).values(data);
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/expenses/:id', async (req: Request, res: Response) => {
  try {
    await db.update(s.expenses).set(req.body).where(eq(s.expenses.id, req.params.id));
    const [row] = await db.select().from(s.expenses).where(eq(s.expenses.id, req.params.id));
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/receipts', async (req, res) => {
  try {
    const { expenseId } = req.query;
    const rows = expenseId
      ? await db.select().from(s.receipts).where(eq(s.receipts.expenseId, expenseId as string))
      : await db.select().from(s.receipts);
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/receipts', async (req: Request, res: Response) => {
  try {
    const data = { id: id('rct'), ...req.body, uploadDate: now() };
    await db.insert(s.receipts).values(data);
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// VENDORS & BILLS
// ============================================================================

router.get('/vendors', async (req, res) => {
  try {
    const scope = buildTenantScope(req, { tenantId: s.vendors.tenantId });
    const q = db.select().from(s.vendors);
    const rows = scope
      ? await q.where(scope).orderBy(s.vendors.name)
      : await q.orderBy(s.vendors.name);
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/vendors', async (req: Request, res: Response) => {
  try {
    const data = { id: id('vnd'), ...req.body, createdAt: now() };
    await db.insert(s.vendors).values(data);
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/bills', async (req, res) => {
  try {
    const { vendorId, status } = req.query;
    const scope = buildTenantScope(req, { tenantId: s.bills.tenantId });
    const vendorClause = vendorId ? eq(s.bills.vendorId, vendorId as string) : undefined;
    const statusClause = status ? eq(s.bills.status, status as any) : undefined;
    const clauses = [scope, vendorClause, statusClause].filter(Boolean) as any[];
    const where = clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : and(...clauses);
    const q = db.select().from(s.bills);
    const rows = where
      ? await q.where(where).orderBy(desc(s.bills.dueDate))
      : await q.orderBy(desc(s.bills.dueDate));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/bills', async (req: Request, res: Response) => {
  try {
    const data = { id: id('bill'), ...req.body, createdAt: now() };
    await db.insert(s.bills).values(data);
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/bills/:id', async (req: Request, res: Response) => {
  try {
    await db.update(s.bills).set(req.body).where(eq(s.bills.id, req.params.id));
    const [row] = await db.select().from(s.bills).where(eq(s.bills.id, req.params.id));
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// ACCOUNTING
// ============================================================================

router.get('/accounting/chart', async (_req, res) => {
  try { res.json(await db.select().from(s.chartOfAccounts).orderBy(s.chartOfAccounts.accountNumber)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/accounting/chart', requireRole('admin', 'finance_controller', 'accountant'), async (req: Request, res: Response) => {
  try {
    const data = { id: id('coa'), ...req.body, createdAt: now() };
    await db.insert(s.chartOfAccounts).values(data);
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/accounting/journal', async (_req, res) => {
  try {
    const entries = await db.select().from(s.journalEntries).orderBy(desc(s.journalEntries.entryDate));
    res.json(entries);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/accounting/journal/:id', async (req, res) => {
  try {
    const [entry] = await db.select().from(s.journalEntries).where(eq(s.journalEntries.id, req.params.id));
    if (!entry) return res.status(404).json({ error: 'Not found' });
    const items = await db.select().from(s.journalLineItems).where(eq(s.journalLineItems.journalEntryId, req.params.id));
    res.json({ ...entry, lineItems: items });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/accounting/journal', requireRole('admin', 'finance_controller', 'accountant'), async (req: Request, res: Response) => {
  try {
    const { lineItems, ...entryData } = req.body;
    const entryId = id('je');
    await db.insert(s.journalEntries).values({ id: entryId, ...entryData, createdAt: now() });
    if (lineItems?.length) {
      for (const li of lineItems) {
        await db.insert(s.journalLineItems).values({ id: id('jli'), journalEntryId: entryId, ...li });
      }
    }
    res.status(201).json({ id: entryId, ...entryData });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// SETTLEMENT & TREASURY
// ============================================================================

router.get('/stablecoins', async (_req, res) => {
  try { res.json(await db.select().from(s.stablecoins)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/wallets', async (req, res) => {
  try {
    const userId = req.user?.id || 'usr-001';
    const rows = await db.select().from(s.wallets).where(eq(s.wallets.userId, userId));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user?.id || 'usr-001';
    const rows = await db.select().from(s.platformTransactions).where(eq(s.platformTransactions.userId, userId)).orderBy(desc(s.platformTransactions.createdAt));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/transactions/send', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'usr-001';
    const data = {
      id: id('stx'), userId, type: 'send' as const,
      ...req.body, platformFee: 0.01, status: 'pending' as const, createdAt: now(),
    };
    await db.insert(s.platformTransactions).values(data);
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/transactions/swap', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'usr-001';
    const data = {
      id: id('stx'), userId, type: 'swap' as const,
      ...req.body, platformFee: 0.01, status: 'pending' as const, createdAt: now(),
    };
    await db.insert(s.platformTransactions).values(data);
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/treasury/deposits', async (req, res) => {
  try {
    const userId = req.user?.id || 'usr-001';
    const rows = await db.select().from(s.treasuryDeposits).where(eq(s.treasuryDeposits.userId, userId));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/treasury/deposits', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'usr-001';
    const data = { id: id('fic'), userId, ...req.body, yieldEarned: 0, status: 'active' as const, depositDate: now() };
    await db.insert(s.treasuryDeposits).values(data);
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// TIME OFF
// ============================================================================

// Time-off tables don't carry tenantId directly; scope by joining through
// employees. Filter list down to employees in caller's client/tenant.
async function tenantScopedEmployeeIds(req: Request): Promise<string[] | null> {
  const empScope = buildTenantScope(req, { tenantId: s.employees.tenantId, clientId: s.employees.clientId });
  if (!empScope) return null; // super_admin → no restriction
  const rows = await db.select({ id: s.employees.id }).from(s.employees).where(empScope);
  return rows.map((r) => r.id);
}

router.get('/time-off/balances', async (req, res) => {
  try {
    const { employeeId } = req.query;
    const allowedIds = await tenantScopedEmployeeIds(req);
    let rows = employeeId
      ? await db.select().from(s.timeOffBalances).where(eq(s.timeOffBalances.employeeId, employeeId as string))
      : await db.select().from(s.timeOffBalances);
    if (allowedIds !== null) rows = rows.filter((r) => allowedIds.includes(r.employeeId));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/time-off/requests', async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    const allowedIds = await tenantScopedEmployeeIds(req);
    let rows;
    if (employeeId) rows = await db.select().from(s.timeOffRequests).where(eq(s.timeOffRequests.employeeId, employeeId as string)).orderBy(desc(s.timeOffRequests.createdAt));
    else if (status) rows = await db.select().from(s.timeOffRequests).where(eq(s.timeOffRequests.status, status as any)).orderBy(desc(s.timeOffRequests.createdAt));
    else rows = await db.select().from(s.timeOffRequests).orderBy(desc(s.timeOffRequests.createdAt));
    if (allowedIds !== null) rows = rows.filter((r) => allowedIds.includes(r.employeeId));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/time-off/requests', async (req: Request, res: Response) => {
  try {
    const data = { id: id('tor'), ...req.body, status: 'pending' as const, createdAt: now() };
    await db.insert(s.timeOffRequests).values(data);
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/time-off/requests/:id', requireRole('admin', 'finance_controller', 'manager'), async (req: Request, res: Response) => {
  try {
    await db.update(s.timeOffRequests).set(req.body).where(eq(s.timeOffRequests.id, req.params.id));
    const [row] = await db.select().from(s.timeOffRequests).where(eq(s.timeOffRequests.id, req.params.id));
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// APPROVALS
// ============================================================================

router.get('/approvals', async (req, res) => {
  try {
    const { status, type } = req.query;
    const scope = buildTenantScope(req, { tenantId: s.approvals.tenantId, clientId: s.approvals.clientId });
    const statusClause = status ? eq(s.approvals.status, status as any) : undefined;
    const typeClause = type ? eq(s.approvals.type, type as any) : undefined;
    const clauses = [scope, statusClause, typeClause].filter(Boolean) as any[];
    const where = clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : and(...clauses);
    const q = db.select().from(s.approvals);
    const rows = where
      ? await q.where(where).orderBy(desc(s.approvals.createdAt))
      : await q.orderBy(desc(s.approvals.createdAt));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/approvals/:id', requireRole('admin', 'finance_controller', 'manager', 'approver'), async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    await db.update(s.approvals).set({ status, approvedBy: req.user?.id, approvedAt: now() }).where(eq(s.approvals.id, req.params.id));
    const [row] = await db.select().from(s.approvals).where(eq(s.approvals.id, req.params.id));
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// PEOPLE (HR)
// ============================================================================

router.get('/people', async (req, res) => {
  try {
    const { department, search } = req.query;
    const scope = buildTenantScope(req, { tenantId: s.employees.tenantId, clientId: s.employees.clientId });
    const deptClause = department && department !== 'all' ? eq(s.employees.department, department as string) : undefined;
    const searchClause = search
      ? or(like(s.employees.firstName, `%${search}%`), like(s.employees.lastName, `%${search}%`), like(s.employees.email, `%${search}%`))
      : undefined;
    const clauses = [scope, deptClause, searchClause].filter(Boolean) as any[];
    const where = clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : and(...clauses);
    const q = db.select().from(s.employees);
    const rows = where
      ? await q.where(where).orderBy(s.employees.lastName)
      : await q.orderBy(s.employees.lastName);
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// REPORTS & EXPORT
// ============================================================================

router.get('/reports', async (req, res) => {
  try {
    const userId = req.user?.id || 'usr-001';
    const rows = await db.select().from(s.reports).where(eq(s.reports.userId, userId)).orderBy(desc(s.reports.createdAt));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/reports', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'usr-001';
    const data = { id: id('rpt'), userId, ...req.body, status: 'generated' as const, createdAt: now() };
    await db.insert(s.reports).values(data);
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// AUTOMATION
// ============================================================================

router.get('/automation/rules', async (req, res) => {
  try {
    const userId = req.user?.id || 'usr-001';
    const rows = await db.select().from(s.automationRules).where(eq(s.automationRules.userId, userId));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/automation/rules', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'usr-001';
    const data = { id: id('auto'), userId, ...req.body, isActive: true, runCount: 0, createdAt: now() };
    await db.insert(s.automationRules).values(data);
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/automation/rules/:id', async (req: Request, res: Response) => {
  try {
    await db.update(s.automationRules).set(req.body).where(eq(s.automationRules.id, req.params.id));
    const [row] = await db.select().from(s.automationRules).where(eq(s.automationRules.id, req.params.id));
    res.json(row);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/automation/rules/:id', async (req: Request, res: Response) => {
  try {
    await db.delete(s.automationRules).where(eq(s.automationRules.id, req.params.id));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// INTEGRATIONS
// ============================================================================

router.get('/integrations', async (req, res) => {
  try {
    const userId = req.user?.id || 'usr-001';
    const rows = await db.select().from(s.integrations).where(eq(s.integrations.userId, userId));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/integrations', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'usr-001';
    const data = { id: id('int'), userId, ...req.body, syncStatus: 'connected' as const, createdAt: now() };
    await db.insert(s.integrations).values(data);
    res.status(201).json(data);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/integrations/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const [row] = await db.select().from(s.integrations).where(eq(s.integrations.id, req.params.id));
    if (!row) return res.status(404).json({ error: 'Integration not found' });
    if (row.userId !== userId) return res.status(403).json({ error: 'Not your integration' });
    await db.delete(s.integrations).where(eq(s.integrations.id, req.params.id));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// WEBHOOKS
// ============================================================================

router.get('/webhooks', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const rows = await db.select().from(s.webhookEndpoints).where(eq(s.webhookEndpoints.userId, userId));
    res.json(rows.map((r: any) => ({ ...r, events: r.events ? JSON.parse(r.events) : [] })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/webhooks', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const { url, events } = req.body ?? {};
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url is required' });
    try { new URL(url); } catch { return res.status(400).json({ error: 'url must be a valid http(s) URL' }); }
    const eventList = Array.isArray(events) && events.length > 0
      ? events
      : ['payroll.run', 'invoice.paid', 'expense.reimbursed'];
    const data = {
      id: id('whk'),
      userId,
      tenantId: req.user?.tenantId ?? null,
      url,
      events: JSON.stringify(eventList),
      status: 'active' as const,
      secret: nanoid(32),
      lastDeliveryAt: null,
      createdAt: now(),
    };
    await db.insert(s.webhookEndpoints).values(data);
    res.status(201).json({ ...data, events: eventList });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/webhooks/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const [row] = await db.select().from(s.webhookEndpoints).where(eq(s.webhookEndpoints.id, req.params.id));
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
    await db.delete(s.webhookEndpoints).where(eq(s.webhookEndpoints.id, req.params.id));
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// FX REPORTING
// ============================================================================

router.get('/fx/rates', async (_req, res) => {
  try {
    const coins = await db.select().from(s.stablecoins);
    const rates: Record<string, Record<string, number>> = {};
    for (const a of coins) {
      rates[a.symbol] = {};
      for (const b of coins) {
        rates[a.symbol][b.symbol] = a.currentPrice / b.currentPrice;
      }
    }
    res.json(rates);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// AUDIT LOGS
// ============================================================================

router.get('/audit-logs', requireRole('admin', 'finance_controller', 'super_admin', 'client_admin', 'finance', 'hr'), async (req, res) => {
  try {
    const scope = buildTenantScope(req, { tenantId: s.auditLogs.tenantId });
    const q = db.select().from(s.auditLogs);
    const rows = scope
      ? await q.where(scope).orderBy(desc(s.auditLogs.timestamp)).limit(100)
      : await q.orderBy(desc(s.auditLogs.timestamp)).limit(100);
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ============================================================================
// AI CHAT
// ============================================================================

router.get('/chat/messages', async (req, res) => {
  try {
    const userId = req.user?.id || 'usr-001';
    const rows = await db.select().from(s.chatMessages).where(eq(s.chatMessages.userId, userId)).orderBy(s.chatMessages.createdAt);
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/chat/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'usr-001';
    const { content } = req.body;

    // Save user message
    const userMsg = { id: id('msg'), userId, role: 'user' as const, content, createdAt: now() };
    await db.insert(s.chatMessages).values(userMsg);

    // Generate AI response (context-aware based on the platform)
    const aiResponse = await generateAIResponse(content, userId);

    // Save assistant message
    const assistantMsg = { id: id('msg'), userId, role: 'assistant' as const, content: aiResponse, createdAt: now() };
    await db.insert(s.chatMessages).values(assistantMsg);

    res.json({ userMessage: userMsg, assistantMessage: assistantMsg });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

async function generateAIResponse(message: string, userId: string): Promise<string> {
  const msg = message.toLowerCase();

  // Context-aware responses based on platform data
  if (msg.includes('payroll') || msg.includes('salary') || msg.includes('pay run')) {
    const runs = await db.select().from(s.payrollRuns).orderBy(desc(s.payrollRuns.payDate)).limit(1);
    const emps = await db.select({ count: sql<number>`count(*)` }).from(s.employees).where(eq(s.employees.status, 'active'));
    const latest = runs[0];
    return `Here's your payroll overview:\n\n• **Active employees**: ${emps[0].count}\n• **Latest pay run**: ${latest?.payDate || 'None'} (${latest?.status || 'N/A'})\n• **Total net pay**: $${latest?.totalNetPay?.toLocaleString() || 0}\n• **Platform fee**: $0.01 per transaction\n\nWould you like me to help you create a new payroll run, review pending payslips, or adjust employee compensation?`;
  }

  if (msg.includes('invoice') || msg.includes('billing') || msg.includes('receivable')) {
    const invs = await db.select().from(s.invoices);
    const overdue = invs.filter(i => i.status === 'overdue');
    const outstanding = invs.reduce((sum, i) => sum + (i.amountDue || 0), 0);
    return `Invoice summary:\n\n• **Total invoices**: ${invs.length}\n• **Outstanding**: $${outstanding.toLocaleString()}\n• **Overdue**: ${overdue.length} invoice(s)\n\n${overdue.length > 0 ? `⚠️ You have overdue invoices. I can send automated reminders or help create payment plans.` : '✅ No overdue invoices!'}\n\nI can help you create new invoices, send reminders, or set up recurring billing.`;
  }

  if (msg.includes('expense') || msg.includes('claim') || msg.includes('receipt')) {
    const exps = await db.select().from(s.expenses);
    const pending = exps.filter(e => e.status === 'submitted');
    return `Expense overview:\n\n• **Total claims**: ${exps.length}\n• **Pending approval**: ${pending.length}\n• **Total pending amount**: $${pending.reduce((s, e) => s + e.amount, 0).toLocaleString()}\n\nI can help you review pending claims, set up auto-approval rules, or generate expense reports.`;
  }

  if (msg.includes('treasury') || msg.includes('balance') || msg.includes('wallet') || msg.includes('yield')) {
    const wallets = await db.select().from(s.wallets).where(eq(s.wallets.userId, 'usr-001'));
    const deposits = await db.select().from(s.treasuryDeposits).where(eq(s.treasuryDeposits.status, 'active'));
    const totalYield = deposits.reduce((s, d) => s + d.yieldEarned, 0);
    return `Treasury overview:\n\n**Wallet Balances:**\n${wallets.map(w => `• ${w.stablecoin}: ${w.balance.toLocaleString()}`).join('\n')}\n\n**Treasury Yield**: $${totalYield.toLocaleString()} earned across ${deposits.length} active deposits\n\nI can help you optimize your treasury allocation, set up new yield deposits, or plan FX swaps.`;
  }

  if (msg.includes('help') || msg.includes('what can') || msg.includes('how do')) {
    return `I'm your AI assistant! I can help with:\n\n🏦 **Payroll** — Run payroll, view pay stubs, manage employees\n📄 **Invoicing** — Create invoices, track payments, send reminders\n💰 **Expenses** — Review claims, approve/reject, generate reports\n🏛️ **Treasury** — Check balances, manage yield, plan FX swaps\n📊 **Reporting** — Generate financial reports, export data\n⚙️ **Customization** — Adjust workflows, set up automation rules\n\nJust ask me about anything related to your financial operations!`;
  }

  if (msg.includes('customize') || msg.includes('change') || msg.includes('modify') || msg.includes('evolve')) {
    return `I can help you customize the platform! Here are some options:\n\n• **Automation Rules** — Set up auto-approvals, scheduled reports, alerts\n• **Approval Workflows** — Configure multi-step approval chains\n• **Report Templates** — Create custom report formats\n• **Integration Setup** — Connect Xero, QuickBooks, Stripe\n• **Role Permissions** — Adjust what each role can access\n\nWhat would you like to customize?`;
  }

  if (msg.includes('bill') || msg.includes('vendor') || msg.includes('payable')) {
    const billRows = await db.select().from(s.bills);
    const overdue = billRows.filter(b => b.status === 'overdue');
    return `Accounts Payable overview:\n\n• **Total bills**: ${billRows.length}\n• **Overdue**: ${overdue.length}\n• **Total outstanding**: $${billRows.filter(b => b.status !== 'paid').reduce((s, b) => s + b.amount, 0).toLocaleString()}\n\nI can help you schedule payments, add vendors, or set up bill approval workflows.`;
  }

  return `Thanks for your message! I'm here to help you manage your financial operations.\n\nYou can ask me about:\n• Payroll & employee management\n• Invoicing & accounts receivable\n• Expenses & claims\n• Treasury & stablecoin management\n• Bills & accounts payable\n• Reports & analytics\n• Platform customization\n\nWhat would you like to explore?`;
}

// Mount documents router
router.use('/documents', documentsRouter);

export default router;
