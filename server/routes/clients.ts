import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import db from '../db/index.js';
import * as s from '../db/schema.js';
import { authMiddleware, requireRole, normalizeRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${nanoid(8)}`;

const OPERATOR_TENANT_ID = 'tnt-operator';

router.get('/', async (req: Request, res: Response) => {
  try {
    const role = normalizeRole(req.user!.role);
    const rows = await db.select().from(s.clients);
    if (role === 'super_admin') return res.json(rows);
    // Client-scoped users only see their own client
    return res.json(rows.filter((c) => c.id === req.user!.clientId));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const role = normalizeRole(req.user!.role);
    const [row] = await db.select().from(s.clients).where(eq(s.clients.id, req.params.id));
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (role !== 'super_admin' && row.id !== req.user!.clientId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const tenantId = id('tnt');
    const clientId = id('cli');
    const body = req.body || {};

    await db.insert(s.tenants).values({
      id: tenantId,
      type: 'client' as const,
      name: body.name,
      country: body.country ?? 'MY',
      status: 'active' as const,
      configuration: null,
      createdAt: now(),
      updatedAt: now(),
    });

    const clientRow = {
      id: clientId,
      tenantId,
      operatorTenantId: OPERATOR_TENANT_ID,
      name: body.name,
      country: body.country ?? 'MY',
      registrationNumber: body.registrationNumber ?? null,
      taxId: body.taxId ?? null,
      bankAccount: body.bankAccount ? JSON.stringify(body.bankAccount) : null,
      primaryContactName: body.primaryContactName ?? null,
      primaryContactEmail: body.primaryContactEmail ?? null,
      primaryContactPhone: body.primaryContactPhone ?? null,
      servicePlan: body.servicePlan ?? 'basic',
      mode: body.mode ?? 'eor',
      serviceFeePct: body.serviceFeePct ?? 0.05,
      noticeDefaultMonths: body.noticeDefaultMonths ?? 1,
      defaultPayFrequency: body.defaultPayFrequency ?? null,
      defaultCurrency: body.defaultCurrency ?? null,
      epfEmployerNumber: body.epfEmployerNumber ?? null,
      socsoEmployerNumber: body.socsoEmployerNumber ?? null,
      lhdnEmployerNumber: body.lhdnEmployerNumber ?? null,
      status: 'active' as const,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.insert(s.clients).values(clientRow);
    res.status(201).json(clientRow);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireRole('super_admin', 'client_admin'), async (req: Request, res: Response) => {
  try {
    const role = normalizeRole(req.user!.role);
    const [existing] = await db.select().from(s.clients).where(eq(s.clients.id, req.params.id));
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (role !== 'super_admin' && existing.id !== req.user!.clientId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const body = { ...req.body };
    if (body.bankAccount && typeof body.bankAccount !== 'string') {
      body.bankAccount = JSON.stringify(body.bankAccount);
    }
    await db.update(s.clients).set({ ...body, updatedAt: now() }).where(eq(s.clients.id, req.params.id));
    const [row] = await db.select().from(s.clients).where(eq(s.clients.id, req.params.id));
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
