import {
  Users, Send, TrendingUp, Zap, Download, Home, ArrowLeftRight,
  DollarSign, UserCircle, Building2, FileText, Wallet, Shield,
  Scroll, ClipboardCheck, Bell,
  Plug, BookOpen, CreditCard, Receipt, CheckSquare, CalendarDays,
  ShieldCheck, UserPlus, UserMinus,
} from 'lucide-react';
import type { OrgKind, Role, ClientMode, Persona } from '../contexts/OrgRoleContext';

export interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Sidebar nav derived from (orgKind, role, mode). Single source of truth
 * for what each persona can navigate to. Used by both Sidebar.tsx (to
 * render the nav) and MainApp.tsx (to gate which view-keys mount).
 */
export function navFor(orgKind: OrgKind, role: Role, mode?: ClientMode): NavSection[] {
  const hasPayroll = mode === 'payroll' || mode === 'payroll_hr' || mode === 'eor';
  const hasHR = mode === 'hr' || mode === 'payroll_hr' || mode === 'eor';
  const isEor = mode === 'eor';

  // ─── Operator (PayrollPlatform staff) ──────────────────────────
  if (orgKind === 'operator') {
    if (role === 'finance') {
      return [
        { title: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }] },
        {
          title: 'Clients',
          items: [
            { id: 'clients',           label: 'Clients',           icon: Building2 },
            { id: 'client-onboarding', label: 'Onboard client',    icon: UserPlus },
          ],
        },
        {
          title: 'Billing',
          items: [
            { id: 'invoicing',     label: 'Invoicing',     icon: FileText },
            { id: 'deposits',      label: 'Deposits',      icon: Wallet },
            { id: 'trust-account', label: 'Trust account', icon: ShieldCheck },
            { id: 'payroll',       label: 'Payroll',       icon: Users },
            { id: 'approvals',     label: 'Approvals',     icon: CheckSquare },
          ],
        },
        {
          title: 'Treasury',
          items: [
            { id: 'send',         label: 'Send',         icon: Send },
            { id: 'fx',           label: 'FX',           icon: ArrowLeftRight },
            { id: 'treasury',     label: 'Treasury',     icon: TrendingUp },
            { id: 'fx-reporting', label: 'FX reporting', icon: TrendingUp },
          ],
        },
        { title: 'System', items: [
          { id: 'audit',  label: 'Audit log', icon: ClipboardCheck },
          { id: 'export', label: 'Export',    icon: Download },
        ] },
      ];
    }

    if (role === 'hr') {
      // Platform Compliance role
      return [
        { title: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }] },
        {
          title: 'KYC + Contracts',
          items: [
            { id: 'kyc-review',           label: 'KYC review queue', icon: ShieldCheck },
            { id: 'people',               label: 'Workforce',        icon: UserCircle },
            { id: 'employee-onboarding',  label: 'Onboard employee', icon: UserPlus },
            { id: 'contracts',            label: 'Contracts',        icon: Scroll },
          ],
        },
        {
          title: 'Compliance',
          items: [
            { id: 'statutory',        label: 'Statutory',        icon: Shield },
            { id: 'filing-calendar',  label: 'Filing calendar',  icon: CalendarDays },
            { id: 'audit',            label: 'Audit log',        icon: ClipboardCheck },
          ],
        },
      ];
    }

    // super_admin (Operator Admin)
    return [
      { title: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }] },
      {
        title: 'EOR operations',
        items: [
          { id: 'clients',             label: 'Clients',           icon: Building2 },
          { id: 'client-onboarding',   label: 'Onboard client',    icon: UserPlus },
          { id: 'people',              label: 'Workforce',         icon: UserCircle },
          { id: 'employee-onboarding', label: 'Onboard employee',  icon: UserPlus },
          { id: 'termination',         label: 'Termination',       icon: UserMinus },
          { id: 'payroll',             label: 'Payroll',           icon: Users },
          { id: 'contracts',           label: 'Contracts',         icon: Scroll },
          { id: 'deposits',            label: 'Deposits',          icon: Wallet },
          { id: 'approvals',           label: 'Approvals',         icon: CheckSquare },
        ],
      },
      {
        title: 'Compliance',
        items: [
          { id: 'kyc-review',       label: 'KYC review',       icon: ShieldCheck },
          { id: 'statutory',        label: 'Statutory',        icon: Shield },
          { id: 'filing-calendar',  label: 'Filing calendar',  icon: CalendarDays },
          { id: 'audit',            label: 'Audit log',        icon: ClipboardCheck },
        ],
      },
      {
        title: 'Treasury',
        items: [
          { id: 'send',          label: 'Send',          icon: Send },
          { id: 'fx',            label: 'FX',            icon: ArrowLeftRight },
          { id: 'treasury',      label: 'Treasury',      icon: TrendingUp },
          { id: 'trust-account', label: 'Trust account', icon: ShieldCheck },
        ],
      },
      {
        title: 'System',
        items: [
          { id: 'automation',   label: 'Automation',   icon: Zap },
          { id: 'integrations', label: 'Integrations', icon: Plug },
          { id: 'export',       label: 'Export',       icon: Download },
        ],
      },
    ];
  }

  // ─── Client org ───────────────────────────────────────────

  // Employee — self-service only, mode-aware
  if (role === 'employee') {
    const items: NavItem[] = [{ id: 'dashboard', label: 'Dashboard', icon: Home }];
    if (hasPayroll) items.push({ id: 'my-pay', label: 'My pay', icon: DollarSign });
    if (hasPayroll) items.push({ id: 'my-expenses', label: 'My expenses', icon: Receipt });
    if (hasHR)      items.push({ id: 'time-off', label: 'Time off', icon: Bell });
    items.push({ id: 'my-documents', label: 'My documents', icon: FileText });
    return [{ title: 'My workspace', items }];
  }

  const sections: NavSection[] = [
    { title: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }] },
  ];

  if (role === 'finance') {
    const finance: NavItem[] = [];
    if (hasPayroll) finance.push({ id: 'payroll', label: 'Payroll', icon: Users });
    if (hasPayroll) finance.push({ id: 'approvals', label: 'Approvals', icon: CheckSquare });
    if (isEor) finance.push({ id: 'invoicing', label: 'Invoices from EOR Provider', icon: FileText });
    else finance.push({ id: 'invoicing', label: 'Invoicing', icon: FileText });
    if (isEor) finance.push({ id: 'deposits',  label: 'Trust deposit',      icon: Wallet });
    finance.push({ id: 'bill-pay', label: 'Bill pay', icon: CreditCard });
    finance.push({ id: 'expenses', label: 'Expenses', icon: Receipt });
    finance.push({ id: 'accounting', label: 'Accounting', icon: BookOpen });
    if (finance.length) sections.push({ title: 'Finance', items: finance });

    const treasury: NavItem[] = [
      { id: 'send',         label: 'Send',         icon: Send },
      { id: 'fx',           label: 'FX',           icon: ArrowLeftRight },
      { id: 'treasury',     label: 'Treasury',     icon: TrendingUp },
      { id: 'fx-reporting', label: 'FX reporting', icon: TrendingUp },
    ];
    sections.push({ title: 'Treasury', items: treasury });

    sections.push({
      title: 'System',
      items: [
        { id: 'audit',  label: 'Audit log', icon: ClipboardCheck },
        { id: 'export', label: 'Export',    icon: Download },
      ],
    });
    return sections;
  }

  if (role === 'hr') {
    const people: NavItem[] = [];
    if (hasHR) people.push({ id: 'people', label: 'Employees', icon: UserCircle });
    if (hasHR) people.push({ id: 'employee-onboarding', label: 'Onboard employee', icon: UserPlus });
    if (hasPayroll) people.push({ id: 'payroll', label: 'Payroll', icon: Users });
    if (isEor) people.push({ id: 'contracts', label: 'Contracts', icon: Scroll });
    if (hasHR) people.push({ id: 'time-off', label: 'Time off', icon: Bell });
    if (hasHR) people.push({ id: 'expenses', label: 'Expenses', icon: Receipt });
    if (hasHR) people.push({ id: 'approvals', label: 'Approvals', icon: CheckSquare });
    if (people.length) sections.push({ title: 'People', items: people });

    if (hasPayroll) {
      sections.push({
        title: 'Compliance',
        items: [
          { id: 'statutory',       label: 'Statutory',       icon: Shield },
          { id: 'filing-calendar', label: 'Filing calendar', icon: CalendarDays },
        ],
      });
    }
    return sections;
  }

  // client_admin
  const workforce: NavItem[] = [];
  if (hasHR) workforce.push({ id: 'people', label: 'Employees', icon: UserCircle });
  if (hasHR) workforce.push({ id: 'employee-onboarding', label: 'Onboard employee', icon: UserPlus });
  if (hasHR) workforce.push({ id: 'termination', label: 'Termination', icon: UserMinus });
  if (hasPayroll) workforce.push({ id: 'payroll', label: 'Payroll', icon: Users });
  if (isEor) workforce.push({ id: 'contracts', label: 'Contracts', icon: Scroll });
  if (hasHR) workforce.push({ id: 'time-off', label: 'Time off', icon: Bell });
  if (workforce.length) sections.push({ title: 'Workforce', items: workforce });

  const finance: NavItem[] = [];
  if (isEor) finance.push({ id: 'invoicing', label: 'Invoices from EOR Provider', icon: FileText });
  else finance.push({ id: 'invoicing', label: 'Invoicing', icon: FileText });
  if (isEor) finance.push({ id: 'deposits',  label: 'Trust deposit',      icon: Wallet });
  finance.push({ id: 'bill-pay', label: 'Bill pay', icon: CreditCard });
  finance.push({ id: 'expenses', label: 'Expenses', icon: Receipt });
  finance.push({ id: 'accounting', label: 'Accounting', icon: BookOpen });
  finance.push({ id: 'approvals', label: 'Approvals', icon: CheckSquare });
  if (finance.length) sections.push({ title: 'Finance', items: finance });

  const compliance: NavItem[] = [];
  if (hasPayroll) compliance.push({ id: 'statutory', label: 'Statutory', icon: Shield });
  if (hasPayroll) compliance.push({ id: 'filing-calendar', label: 'Filing calendar', icon: CalendarDays });
  compliance.push({ id: 'audit', label: 'Audit log', icon: ClipboardCheck });
  sections.push({ title: 'Compliance', items: compliance });

  sections.push({
    title: 'System',
    items: [
      { id: 'automation',   label: 'Automation',   icon: Zap },
      { id: 'integrations', label: 'Integrations', icon: Plug },
      { id: 'export',       label: 'Export',       icon: Download },
    ],
  });

  return sections;
}

// View-keys reachable from every persona regardless of sidebar (rendered
// in the bottom-left of Sidebar.tsx, plus dashboard which is always the
// landing view).
const UNIVERSAL_MODULES = new Set(['dashboard', 'my-profile', 'settings']);

/**
 * Source of truth for "can this persona navigate to this view?".
 * Returns true if the moduleId is universal or appears anywhere in
 * navFor() for the persona's (orgKind, role, mode).
 */
export function isModuleVisibleForPersona(persona: Persona, moduleId: string): boolean {
  if (UNIVERSAL_MODULES.has(moduleId)) return true;
  const sections = navFor(persona.org.kind, persona.role, persona.org.mode);
  return sections.some((s) => s.items.some((i) => i.id === moduleId));
}
