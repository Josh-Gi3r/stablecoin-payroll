import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../lib/api';

/**
 * Two-level persona model for the demo:
 *   1. Organization: Platform operator or a specific Client (e.g. Acme).
 *   2. Role within that organization: Admin, Finance, HR, Employee.
 *
 * Each demo org is backed by real seeded data on the server. Switching the
 * org + role here changes which dashboards/views render and scopes the
 * data the UI requests.
 */

export type OrgKind = 'operator' | 'client';
export type Role = 'admin' | 'finance' | 'hr' | 'employee';
export type ClientMode = 'payroll' | 'hr' | 'payroll_hr' | 'eor';

export interface Org {
  id: string;         // tenant id
  kind: OrgKind;
  name: string;
  clientId?: string;  // only set for client orgs (maps to clients.id)
  country?: 'MY' | 'SG';
  /** Only for client orgs. Drives sidebar + dashboard + feature gates. */
  mode?: ClientMode;
}

/** The six canonical demo personas. */
export interface Persona {
  org: Org;
  role: Role;
  label: string;      // nav label
  description: string;
  userEmail: string;  // seeded login email
  userName: string;
}

// Seeded orgs mirror server/db/seed.ts
const OPERATOR_ORG: Org = { id: 'tnt-operator', kind: 'operator', name: 'Platform Operations', country: 'MY' };
const ACME_ORG: Org = { id: 'tnt-acme-my', kind: 'client', name: 'Acme Sdn Bhd',  clientId: 'cli-acme-my',  country: 'MY', mode: 'eor' };
const BETA_ORG: Org = { id: 'tnt-beta-my', kind: 'client', name: 'Beta Works',    clientId: 'cli-beta-my',  country: 'MY', mode: 'payroll_hr' };
const GAMMA_ORG: Org = { id: 'tnt-gamma-sg', kind: 'client', name: 'Gamma Pte',    clientId: 'cli-gamma-sg', country: 'SG', mode: 'payroll' };
const DELTA_ORG: Org = { id: 'tnt-delta-sg', kind: 'client', name: 'Delta Studio', clientId: 'cli-delta-sg', country: 'SG', mode: 'hr' };

export const DEMO_PERSONAS: Persona[] = [
  // Operator (platform staff)
  { org: OPERATOR_ORG, role: 'admin',    label: 'PayrollPlatform · Admin',     description: 'Operator super-admin — manages every client and all EOR operations.',                userEmail: 'admin@PayrollPlatform',   userName: 'Alex Rivera' },
  { org: OPERATOR_ORG, role: 'finance',  label: 'PayrollPlatform · Finance',   description: 'Operator finance — invoicing clients, collecting service fees, treasury.',          userEmail: 'finance@PayrollPlatform', userName: 'Jordan Blake' },
  { org: OPERATOR_ORG, role: 'hr',       label: 'PayrollPlatform · Compliance', description: 'Operator compliance — KYC review, contracts, statutory remittance queue.',         userEmail: 'hr@PayrollPlatform',      userName: 'Priya Menon' },

  // Acme — EOR client (full tier)
  { org: ACME_ORG, role: 'admin',    label: 'Acme · Admin (EOR)',     description: 'Client admin — full EOR tier with deposits and tripartite contracts.', userEmail: 'admin@acme.my',    userName: 'Tan Wei Ming' },
  { org: ACME_ORG, role: 'finance',  label: 'Acme · Finance (EOR)',   description: 'Client finance — paying EOR Provider invoices, funding payroll, deposits.',     userEmail: 'finance@acme.my',  userName: 'Sarah Lim' },
  { org: ACME_ORG, role: 'hr',       label: 'Acme · HR (EOR)',        description: 'Client HR — employees, leave, onboarding, tripartite agreements.',     userEmail: 'hr@acme.my',       userName: 'Aisha Bakar' },
  { org: ACME_ORG, role: 'employee', label: 'Acme · Employee',        description: 'Employed by Acme via EOR Provider EOR — own payslips and time off.',           userEmail: 'employee@acme.my', userName: 'Jane Doe' },

  // Beta — Payroll + HR (no EOR)
  { org: BETA_ORG, role: 'admin',    label: 'Beta · Admin (Payroll+HR)', description: 'Client admin — full software suite, no EOR. Beta is its own employer.', userEmail: 'admin@beta.my',    userName: 'Rajesh Kumar' },
  { org: BETA_ORG, role: 'employee', label: 'Beta · Employee',           description: 'Employed by Beta directly — payroll runs through PayrollPlatform software.',         userEmail: 'employee@beta.my', userName: 'Mei Lin' },

  // Gamma — Payroll only (SG)
  { org: GAMMA_ORG, role: 'admin',   label: 'Gamma · Admin (Payroll)',   description: 'Payroll-only client — no HR, no EOR. CPF + SDL + FWL filings.',           userEmail: 'admin@gamma.sg',   userName: 'Wei Chen' },

  // Delta — HR only (SG)
  { org: DELTA_ORG, role: 'admin',   label: 'Delta · Admin (HR)',        description: 'HR-only client — people + leave + onboarding, no payroll.',              userEmail: 'admin@delta.sg',   userName: 'Aisha Tan' },
];

interface OrgRoleContextValue {
  persona: Persona;
  setPersona: (p: Persona) => void;
  personas: Persona[];
  orgs: Org[];
  /** Is the currently active org the operator? */
  isOperator: boolean;
  /** Is the currently active org a client? */
  isClient: boolean;
  /** Client mode (undefined for operator). */
  mode: ClientMode | undefined;
  /** Convenience flags. All false for operator personas. */
  hasPayroll: boolean;
  hasHR: boolean;
  isEor: boolean;
}

const OrgRoleContext = createContext<OrgRoleContextValue | undefined>(undefined);

const STORAGE_KEY = 'app_persona_index';

export function OrgRoleProvider({ children }: { children: React.ReactNode }) {
  const [personaIndex, setPersonaIndex] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed >= 0 && parsed < DEMO_PERSONAS.length ? parsed : 0;
  });

  const persona = DEMO_PERSONAS[personaIndex];

  // Persona switching does a real backend login so the JWT carries the right
  // tenantId/clientId and server-side scoping kicks in. We gate children
  // render on the login completing, otherwise dashboards mount and fire
  // their API calls with whatever stale token is in localStorage — which is
  // how the screenshot 500 banner reproduced. All demo users share the
  // seeded password set via SEED_PASSWORD env var (see server/db/seed.ts).
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setAuthReady(false);
    auth.login(persona.userEmail, import.meta.env.VITE_DEMO_PASSWORD ?? '')
      .catch((e) => {
        // Login can fail if the seed hasn't run; fall through so the UI
        // still renders (with empty data + visible errors).
        // eslint-disable-next-line no-console
        console.warn('persona auto-login failed', persona.userEmail, e?.response?.data?.error);
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });
    return () => { cancelled = true; };
  }, [persona.userEmail]);

  const value = useMemo<OrgRoleContextValue>(() => {
    const orgs: Org[] = [];
    const seen = new Set<string>();
    for (const p of DEMO_PERSONAS) {
      if (!seen.has(p.org.id)) {
        seen.add(p.org.id);
        orgs.push(p.org);
      }
    }
    const isOperator = persona.org.kind === 'operator';
    const mode = isOperator ? undefined : persona.org.mode;
    return {
      persona,
      setPersona: (p: Persona) => {
        const idx = DEMO_PERSONAS.findIndex(
          (x) => x.org.id === p.org.id && x.role === p.role,
        );
        if (idx >= 0) {
          setPersonaIndex(idx);
          if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, String(idx));
        }
      },
      personas: DEMO_PERSONAS,
      orgs,
      isOperator,
      isClient: persona.org.kind === 'client',
      mode,
      hasPayroll: mode === 'payroll' || mode === 'payroll_hr' || mode === 'eor',
      hasHR: mode === 'hr' || mode === 'payroll_hr' || mode === 'eor',
      isEor: mode === 'eor',
    };
  }, [persona]);

  return (
    <OrgRoleContext.Provider value={value}>
      {authReady ? children : <PersonaAuthFallback persona={persona} />}
    </OrgRoleContext.Provider>
  );
}

function PersonaAuthFallback({ persona }: { persona: Persona }) {
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: 'var(--bg-app)', color: 'var(--text-muted)' }}
    >
      <div className="flex items-center gap-3 text-sm">
        <span
          className="inline-block w-3.5 h-3.5 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }}
        />
        <span>Signing in as {persona.userName}…</span>
      </div>
    </div>
  );
}

export function useOrgRole() {
  const ctx = useContext(OrgRoleContext);
  if (!ctx) throw new Error('useOrgRole must be used within OrgRoleProvider');
  return ctx;
}
