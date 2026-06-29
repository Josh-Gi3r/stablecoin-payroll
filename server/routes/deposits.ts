import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import db from '../db/index.js';
import * as s from '../db/schema.js';
import { authMiddleware, requireRole, normalizeRole, isOperator } from '../middleware/auth.js';
import {
  calculateDepositAmount,
  createPendingDepositForEmployee,
  drawFromDeposit,
  getDepositLedger,
  listDeposits,
  markDepositReceived,
  refundDeposit,
} from '../services/deposit.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const role = normalizeRole(req.user!.role);
    const filter: { clientId?: string; tenantId?: string } = {};
    if (role !== 'super_admin') {
      if (!req.user!.clientId) return res.json([]);
      filter.clientId = req.user!.clientId;
    }
    const rows = await listDeposits(filter);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/ledger', async (req: Request, res: Response) => {
  try {
    const [dep] = await db.select().from(s.deposits).where(eq(s.deposits.id, req.params.id));
    if (!dep) return res.status(404).json({ error: 'Not found' });
    const role = normalizeRole(req.user!.role);
    if (role !== 'super_admin' && dep.clientId !== req.user!.clientId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(await getDepositLedger(req.params.id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ledger/all', async (req: Request, res: Response) => {
  // Operator-tenant only (cross-client view of every deposit ledger entry).
  // Allowed roles within the operator tenant: super_admin or finance.
  if (!isOperator(req)) {
    return res.status(403).json({ error: 'Operator role required' });
  }
  const role = normalizeRole(req.user!.role);
  if (role !== 'super_admin' && role !== 'finance') {
    return res.status(403).json({ error: 'Operator admin or finance only' });
  }
  try {
    const rows = await db
      .select({
        id: s.depositLedger.id,
        depositId: s.depositLedger.depositId,
        txType: s.depositLedger.txType,
        amount: s.depositLedger.amount,
        reference: s.depositLedger.reference,
        note: s.depositLedger.note,
        createdAt: s.depositLedger.createdAt,
        clientId: s.deposits.clientId,
        clientName: s.clients.name,
        currency: s.deposits.currency,
      })
      .from(s.depositLedger)
      .leftJoin(s.deposits, eq(s.depositLedger.depositId, s.deposits.id))
      .leftJoin(s.clients, eq(s.deposits.clientId, s.clients.id))
      .orderBy(s.depositLedger.createdAt);
    res.json(rows.reverse());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Quote the deposit amount for a prospective employee — used by the onboarding UI.
router.post('/quote', async (req: Request, res: Response) => {
  try {
    const { salary, fixedAllowances, noticeMonths } = req.body ?? {};
    const amount = calculateDepositAmount(
      Number(salary) || 0,
      Array.isArray(fixedAllowances) ? fixedAllowances : [],
      Number(noticeMonths) || 1,
    );
    res.json({ amount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a pending deposit row for an existing employee.
router.post('/for-employee/:employeeId', requireRole('super_admin', 'finance', 'client_admin'), async (req: Request, res: Response) => {
  try {
    const dep = await createPendingDepositForEmployee(req.params.employeeId);
    res.status(201).json(dep);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/mark-received', requireRole('super_admin', 'finance'), async (req: Request, res: Response) => {
  try {
    await markDepositReceived(req.params.id, req.body ?? {});
    const [row] = await db.select().from(s.deposits).where(eq(s.deposits.id, req.params.id));
    res.json(row);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/draw', requireRole('super_admin', 'finance'), async (req: Request, res: Response) => {
  try {
    const { amount, reference, note } = req.body ?? {};
    if (!amount || !reference) {
      return res.status(400).json({ error: 'amount and reference are required' });
    }
    await drawFromDeposit(req.params.id, Number(amount), String(reference), note);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/refund', requireRole('super_admin', 'finance'), async (req: Request, res: Response) => {
  try {
    const { amount, note } = req.body ?? {};
    await refundDeposit(req.params.id, Number(amount) || 0, note);
    const [row] = await db.select().from(s.deposits).where(eq(s.deposits.id, req.params.id));
    res.json(row);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
