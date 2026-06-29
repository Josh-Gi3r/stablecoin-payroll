import { Request, Response, NextFunction } from 'express';
import { jwtVerify, SignJWT } from 'jose';
import { eq, and } from 'drizzle-orm';

// JWT_SECRET is required. The server refuses to start without it.
// Never fall back to a default — that allows token forgery.
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET env var is not set. Refusing to start.');
  process.exit(1);
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * Tenant ID of the platform operator (the company running this payroll SaaS).
 * Set via OPERATOR_TENANT_ID env var; defaults to 'tnt-operator'.
 */
const OPERATOR_TENANT_ID = process.env.OPERATOR_TENANT_ID ?? 'tnt-operator';

/** True if the caller belongs to the operator tenant. */
export function isOperator(req: Request): boolean {
  return req.user?.tenantId === OPERATOR_TENANT_ID;
}

export type UserRole = 'super_admin' | 'client_admin' | 'finance' | 'hr' | 'employee' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
  clientId: string | null;
  company: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Legacy 'admin' role is treated as 'super_admin' everywhere auth is evaluated.
export function normalizeRole(role: string): UserRole {
  if (role === 'admin') return 'super_admin';
  return role as UserRole;
}

export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    clientId: user.clientId,
    company: user.company,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: normalizeRole(payload.role as string),
      tenantId: (payload.tenantId as string | null) ?? null,
      clientId: (payload.clientId as string | null) ?? null,
      company: payload.company as string,
    };
  } catch {
    return null;
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.payroll_token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const userRole = normalizeRole(req.user.role);
    const normalized = roles.map(normalizeRole);
    // super_admin passes every role check
    if (userRole === 'super_admin' || normalized.includes(userRole)) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

// ---------------------------------------------------------------------------
// Tenant scope — every list/read endpoint should call this and `and()` the
// returned clause into its WHERE so users only see rows they're authorized for.
// ---------------------------------------------------------------------------
export interface TenantScopeColumns {
  tenantId?: any;
  clientId?: any;
}

/**
 * Build a Drizzle SQL clause that scopes to the caller's tenant/client.
 *
 *   - super_admin: no scope (sees everything cross-tenant). Returns undefined.
 *   - client_admin / finance / hr: scoped to their clientId.
 *   - employee: scoped to their clientId. Endpoints that should restrict
 *     further (e.g. only their own payslips) must add `eq(...employeeId, ...)`
 *     on top.
 */
export function buildTenantScope(
  req: Request,
  cols: TenantScopeColumns,
): any | undefined {
  const user = req.user;
  if (!user) return undefined;
  const role = normalizeRole(user.role);
  if (role === 'super_admin') return undefined;

  const clauses: any[] = [];
  if (cols.clientId && user.clientId) clauses.push(eq(cols.clientId, user.clientId));
  else if (cols.tenantId && user.tenantId) clauses.push(eq(cols.tenantId, user.tenantId));
  if (clauses.length === 0) {
    return undefined;
  }
  return clauses.length === 1 ? clauses[0] : and(...clauses);
}
