import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { hashSync, compareSync } from 'bcryptjs';
import { nanoid } from 'nanoid';
import db from '../db/index.js';
import { users } from '../db/schema.js';
import { signToken, authMiddleware, AuthUser } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role = 'employee', company = 'Payroll Platform' } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const now = new Date().toISOString();
    const id = `usr-${nanoid(8)}`;
    const password_hash = hashSync(password, 10);

    await db.insert(users).values({ id, email, password_hash, name, role, company, isGuest: false, createdAt: now, updatedAt: now });

    const user: AuthUser = { id, email, name, role: role as any, tenantId: null, clientId: null, company };
    const token = await signToken(user);

    res.cookie('app_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const row = rows[0];
    if (!compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user: AuthUser = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role as any,
      tenantId: (row as any).tenantId ?? null,
      clientId: (row as any).clientId ?? null,
      company: row.company,
    };
    const token = await signToken(user);

    res.cookie('app_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/guest
router.post('/guest', async (_req: Request, res: Response) => {
  try {
    const now = new Date().toISOString();
    const id = `guest-${nanoid(8)}`;
    const user: AuthUser = {
      id,
      email: `${id}@demo.example`,
      name: 'Guest User',
      role: 'super_admin' as const,
      tenantId: 'tnt-operator',
      clientId: null,
      company: 'Payroll Platform',
    };
    const password_hash = hashSync(nanoid(16), 10);

    await db.insert(users).values({
      id,
      email: user.email,
      name: user.name,
      password_hash,
      role: 'super_admin' as any,
      tenantId: user.tenantId,
      clientId: null,
      company: user.company,
      isGuest: true,
      createdAt: now,
      updatedAt: now,
    });

    const token = await signToken(user);
    res.cookie('app_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// PATCH /api/auth/me — update the caller's profile (name, company).
// Email + role + tenant scope are intentionally NOT editable here.
router.patch('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const updates: Record<string, string> = {};
    if (typeof req.body?.name === 'string' && req.body.name.trim()) updates.name = req.body.name.trim();
    if (typeof req.body?.company === 'string' && req.body.company.trim()) updates.company = req.body.company.trim();
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'name or company required' });
    }
    await db.update(users).set(updates).where(eq(users.id, userId));
    const [row] = await db.select().from(users).where(eq(users.id, userId));
    if (!row) return res.status(404).json({ error: 'User not found' });
    const updated: AuthUser = {
      id: row.id, email: row.email, name: row.name, role: row.role as any,
      tenantId: (row as any).tenantId ?? null,
      clientId: (row as any).clientId ?? null,
      company: row.company,
    };
    // Re-issue cookie so the JWT name/company stay fresh.
    const token = await signToken(updated);
    res.cookie('app_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/password — change the caller's password.
// Requires currentPassword for verification.
router.post('/password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'newPassword must be at least 8 characters' });
    }
    const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!row) return res.status(404).json({ error: 'User not found' });
    if (!compareSync(currentPassword, row.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const newHash = hashSync(newPassword, 10);
    await db.update(users).set({ password_hash: newHash }).where(eq(users.id, userId));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('app_token');
  res.json({ ok: true });
});

export default router;
