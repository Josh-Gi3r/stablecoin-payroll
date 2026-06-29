import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Users, Wallet, ShieldCheck, Scroll,
  AlertTriangle, ArrowUpRight, CheckCircle2, Clock, Sparkles,
  LifeBuoy, Activity, FileText, Briefcase, ShieldAlert, UserPlus,
} from 'lucide-react';
import { useOrgRole } from '../../contexts/OrgRoleContext';
import {
  PageContainer, PageHeader, StatCard, Surface, IconChip, Pill, ProgressBar,
  Button, BentoMasonry, ErrorBanner, EmptyState,
} from '../ui';
import {
  PayrollCostTrend,
  TopEarnersBubble,
  RecentActivity,
  type PayrollTrendPoint,
  type BubbleItem,
  type RecentActivityItem,
} from './widgets';
import {
  clients as clientsApi,
  employees as employeesApi,
  deposits as depositsApi,
  documents as documentsApi,
  contracts as contractsApi,
  statutory as statutoryApi,
  dashboard as dashboardApi,
  payroll as payrollApi,
} from '../../lib/api';
import { useApiList } from '../../hooks/useApi';
import { useNavigation } from '../../contexts/NavigationContext';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 28 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

type ServerClient = {
  id: string;
  name: string;
  country: 'MY' | 'SG';
  mode: 'eor' | 'payroll' | 'hr' | 'payroll_hr';
  status: 'active' | 'suspended' | 'archived';
};

type ServerEmployee = {
  id: string; firstName: string; lastName: string;
  clientId: string | null; salary: number; currency: string; status: string;
};

type ServerDeposit = {
  id: string; clientId: string | null; amount: number;
  status: 'pending' | 'received' | 'held' | 'drawn' | 'refunded';
  currency: string;
};

type ServerKycItem = {
  id: string; userId: string; userName: string | null; userEmail: string | null;
  company: string | null; documentType: string; fileName: string;
  uploadedAt: string;
};

type ServerContract = {
  id: string; templateId: string; employeeId: string | null;
  status: 'draft' | 'sent' | 'partially_signed' | 'fully_signed' | string;
  signedBy?: string[];
};

type ServerFiling = {
  id: string; client: string; scheme: string; country: 'MY' | 'SG';
  amount: string; dueDate: string; daysUntil: number;
  status: 'filed' | 'due_soon' | 'overdue';
};

type ServerActivityItem = {
  id: string; action: string; entityType: string; entityId: string;
  timestamp: string;
};

type ServerTopEarner = {
  id: string; name: string; value: number; displayValue: string;
};

type ServerTrend = { month: string; cost: number; budget: number };

type ServerPayrollRun = {
  id: string; payDate: string; totalGrossPay: number; currency: string;
};

const MODE_LABEL: Record<ServerClient['mode'], string> = {
  eor: 'EOR',
  payroll: 'Payroll',
  hr: 'HR',
  payroll_hr: 'Payroll + HR',
};

function ageString(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.max(0, Math.round(ms / 3_600_000));
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

function severity(hours: number): 'danger' | 'warn' | 'muted' {
  return hours > 48 ? 'danger' : hours > 12 ? 'warn' : 'muted';
}

export function OperatorDashboard() {
  const { persona } = useOrgRole();
  const { navigateTo } = useNavigation();
  const isFinance = persona.role === 'finance';
  const isHR = persona.role === 'hr';

  const { data: clients, error: clientsError } = useApiList<ServerClient>(() => clientsApi.list(), [], 'Failed to load clients');
  const { data: employees }    = useApiList<ServerEmployee>(() => employeesApi.list(), [], 'Failed to load employees');
  const { data: deposits }     = useApiList<ServerDeposit>(() => depositsApi.list(), [], 'Failed to load deposits');
  const { data: kycRaw }       = useApiList<ServerKycItem>(() => documentsApi.kycQueue(), [], 'Failed to load KYC queue');
  const { data: contractsRaw } = useApiList<ServerContract>(() => contractsApi.list(), [], 'Failed to load contracts');
  const now = new Date();
  const { data: filings }      = useApiList<ServerFiling>(
    () => statutoryApi.filings({ year: now.getFullYear(), month: now.getMonth() + 1 }),
    [],
    'Failed to load filings',
  );
  const { data: trendRaw }     = useApiList<ServerTrend>(() => dashboardApi.payrollCostTrend(), [], 'Failed to load cost trend');
  const { data: topEarnersRaw } = useApiList<ServerTopEarner>(() => dashboardApi.topEarners(5), [], 'Failed to load top earners');
  const { data: activityRaw }  = useApiList<ServerActivityItem>(() => dashboardApi.recentActivity(8), [], 'Failed to load activity');
  const { data: payrollRuns }  = useApiList<ServerPayrollRun>(() => payrollApi.runs(), [], 'Failed to load payroll runs');

  const employeesByClient = useMemo(() => {
    const m = new Map<string, ServerEmployee[]>();
    employees.forEach((e) => {
      if (!e.clientId) return;
      const list = m.get(e.clientId) ?? [];
      list.push(e);
      m.set(e.clientId, list);
    });
    return m;
  }, [employees]);

  const depositsByClient = useMemo(() => {
    const m = new Map<string, number>();
    deposits.forEach((d) => {
      if (!d.clientId) return;
      if (d.status !== 'received' && d.status !== 'held') return;
      m.set(d.clientId, (m.get(d.clientId) ?? 0) + d.amount);
    });
    return m;
  }, [deposits]);

  const totalDeposits = deposits
    .filter((d) => d.status === 'received' || d.status === 'held')
    .reduce((s, d) => s + d.amount, 0);

  // Cross-client payroll YTD: sum of approved/paid payroll runs this month.
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthGross = payrollRuns
    .filter((r) => (r.payDate ?? '').startsWith(monthPrefix))
    .reduce((s, r) => s + r.totalGrossPay, 0);
  const serviceFeeMTD = monthGross * 0.05;
  const fmtMyr = (v: number) => v >= 1_000_000 ? `RM ${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `RM ${(v / 1_000).toFixed(1)}K` : `RM ${v.toFixed(0)}`;

  // KYC queue items, severity from upload age.
  const kycQueue = kycRaw.slice(0, 8).map((k) => {
    const hours = Math.max(0, Math.round((Date.now() - new Date(k.uploadedAt).getTime()) / 3_600_000));
    return {
      id: k.id,
      name: k.userName ?? k.userEmail ?? k.userId,
      client: k.company ?? '—',
      type: k.documentType.replace(/^kyc_/, '').replace(/_/g, ' '),
      age: ageString(k.uploadedAt),
      severity: severity(hours),
    };
  });

  // Contracts: only pending ones.
  const empById = new Map(employees.map((e) => [e.id, e]));
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const contracts = contractsRaw
    .filter((c) => c.status !== 'fully_signed')
    .slice(0, 6)
    .map((c) => {
      const emp = c.employeeId ? empById.get(c.employeeId) : null;
      const client = emp?.clientId ? clientById.get(emp.clientId) : null;
      const signedBy = c.signedBy ?? [];
      const allParties = ['operator', 'client', 'employee'];
      const missing = allParties.filter((p) => !signedBy.includes(p));
      return {
        id: c.id,
        employee: emp ? `${emp.firstName} ${emp.lastName}` : c.employeeId ?? 'Unassigned',
        client: client?.name ?? '—',
        status: c.status,
        missing: missing.length === 0 ? '—' : missing.join(', '),
      };
    });

  // Statutory remittance — top 4 by urgency.
  const remittance = filings
    .filter((f) => f.status !== 'filed')
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 4)
    .map((f) => ({
      scheme: `${f.scheme} · ${f.country === 'MY' ? 'Malaysia' : 'Singapore'}`,
      due: f.dueDate.slice(5),
      days: Math.max(0, f.daysUntil),
      tone: (f.daysUntil <= 1 ? 'danger' : f.daysUntil <= 3 ? 'warn' : 'muted') as 'danger' | 'warn' | 'muted',
      amount: f.amount,
    }));

  const trend: PayrollTrendPoint[] = trendRaw.map((t) => ({ month: t.month, cost: t.cost, budget: t.budget }));
  const topEarners: BubbleItem[] = topEarnersRaw.map((e) => ({ name: e.name, value: e.value, displayValue: `RM ${e.displayValue}` }));

  const activity: RecentActivityItem[] = activityRaw.slice(0, 7).map((a) => ({
    icon: a.action.includes('payroll') ? FileText
      : a.action.includes('invoice') ? Briefcase
      : a.action.includes('liveness') || a.action.includes('kyc') ? ShieldCheck
      : a.action.includes('contract') || a.action.includes('signed') ? Scroll
      : a.action.includes('remit') || a.action.includes('filing') ? ShieldAlert
      : a.action.includes('hire') || a.action.includes('onboard') ? UserPlus
      : a.action.includes('support') ? LifeBuoy
      : Activity,
    color: 'var(--ink)',
    text: a.action.replace(/_/g, ' '),
    detail: `${a.entityType} · ${a.entityId.slice(0, 12)}`,
    time: ageString(a.timestamp) + ' ago',
  }));

  const totalWorkforce = employees.filter((e) => e.status === 'active').length;
  const activeClients = clients.filter((c) => c.status === 'active').length;
  const compliancePending = kycQueue.length + contracts.length;

  return (
    <PageContainer>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUp}>
          <PageHeader
            eyebrow={`Operator · ${persona.role}`}
            title={isFinance ? 'Platform Finance' : isHR ? 'Platform Compliance' : 'Platform Operations'}
            subtitle={
              isFinance
                ? 'Revenue MTD, client invoices, trust-account balances, settlement health.'
                : isHR
                  ? 'KYC queue, tripartite signing, statutory remittance deadlines across every client.'
                  : `Welcome back, ${persona.userName.split(' ')[0]}. ${activeClients} active client${activeClients === 1 ? '' : 's'} · ${totalWorkforce} active employee${totalWorkforce === 1 ? '' : 's'} · ${compliancePending} compliance item${compliancePending === 1 ? '' : 's'} need you.`
            }
            actions={
              <>
                <Button variant="secondary" size="sm" icon={<ArrowUpRight className="w-3.5 h-3.5" />} onClick={() => navigateTo('export')}>Export</Button>
                <Button variant="primary" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />} onClick={() => navigateTo('client-onboarding')}>Onboard client</Button>
              </>
            }
          />
        </motion.div>

        <ErrorBanner message={clientsError} />

        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Clients"   value={String(activeClients)}        hint={`${clients.length} total · MY + SG`}      icon={<Building2 className="w-5 h-5" />}    tone="primary"   feature />
          <StatCard label="Workforce"        value={String(totalWorkforce)}       hint="active across all clients"               icon={<Users className="w-5 h-5" />}        tone="secondary" />
          <StatCard label="Trust Deposits"   value={fmtMyr(totalDeposits)}        hint={`${deposits.filter((d) => d.status === 'received' || d.status === 'held').length} EOR deposits held`} icon={<Wallet className="w-5 h-5" />}       tone="tertiary" />
          <StatCard label="Service-fee MTD"  value={fmtMyr(serviceFeeMTD)}        hint={`5% of ${fmtMyr(monthGross)} payroll`}    icon={<ArrowUpRight className="w-5 h-5" />} tone="primary" />
        </motion.div>

        <motion.div variants={fadeUp}>
          <PayrollCostTrend
            className="col-span-12 p-5 rounded-xl flex flex-col"
            data={trend}
            formatter={(v) => v >= 1000 ? `RM ${(v / 1000).toFixed(0)}K` : `RM ${v}`}
          />
        </motion.div>

        <BentoMasonry>
          <motion.div variants={fadeUp}>
            <Surface padding="none" className="overflow-hidden">
              <div className="px-5 md:px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <IconChip icon={<Building2 className="w-4 h-4" />} tone="primary" size="sm" />
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Clients</h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Mode · workforce · trust</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigateTo('clients')}>View all</Button>
              </div>
              {clients.length === 0 ? (
                <EmptyState icon={<Building2 className="w-6 h-6" />} title="No clients yet" description="Onboard a client to populate this list." />
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {clients.map((c) => {
                    const emps = employeesByClient.get(c.id) ?? [];
                    const headcount = emps.filter((e) => e.status === 'active').length;
                    const monthlyPayroll = emps.reduce((s, e) => s + (e.salary || 0), 0);
                    const ccy = emps[0]?.currency ?? (c.country === 'SG' ? 'SGD' : 'MYR');
                    const fmtCcy = (v: number) => v === 0 ? '—' : `${ccy} ${v.toLocaleString()}`;
                    const heldRaw = depositsByClient.get(c.id) ?? 0;
                    const requiredRaw = deposits.filter((d) => d.clientId === c.id).reduce((s, d) => s + d.amount, 0);
                    const utilization = requiredRaw > 0 ? Math.round((heldRaw / requiredRaw) * 100) : 0;
                    return (
                      <div key={c.id} className="px-5 md:px-6 py-3 hover:bg-slate-50/60 transition-colors">
                        <div className="flex items-center gap-3 min-w-0 mb-2">
                          <IconChip
                            icon={<span className="text-[10px] font-semibold">{c.country}</span>}
                            tone={c.country === 'SG' ? 'tertiary' : 'primary'}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {MODE_LABEL[c.mode]} · {headcount} {headcount === 1 ? 'employee' : 'employees'}
                            </p>
                          </div>
                          <Pill tone={c.status === 'active' ? 'success' : 'warn'} dot>{c.status}</Pill>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Monthly payroll</p>
                            <p className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{fmtCcy(monthlyPayroll)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Deposit held</p>
                            <p className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{c.mode === 'eor' ? fmtCcy(heldRaw) : '—'}</p>
                          </div>
                        </div>
                        {c.mode === 'eor' && requiredRaw > 0 && (
                          <ProgressBar
                            className="mt-2"
                            value={utilization}
                            tone={utilization > 75 ? 'primary' : utilization > 50 ? 'secondary' : 'tertiary'}
                            size="sm"
                            label="Trust utilization"
                            valueLabel={`${utilization}%`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Surface>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Surface padding="none" className="overflow-hidden">
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <IconChip icon={<ShieldCheck className="w-4 h-4" />} tone="tertiary" size="sm" />
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>KYC queue</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{kycQueue.length} waiting</p>
                  </div>
                </div>
              </div>
              {kycQueue.length === 0 ? (
                <EmptyState icon={<ShieldCheck className="w-6 h-6" />} title="Queue clear" description="No KYC documents waiting." />
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {kycQueue.map((k) => (
                    <div key={k.id} className="px-5 py-2.5 flex items-center gap-3">
                      <AlertTriangle
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: k.severity === 'danger' ? 'var(--error)' : k.severity === 'warn' ? 'var(--warn)' : 'var(--text-muted)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{k.name}</p>
                        <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{k.type} · {k.client}</p>
                      </div>
                      <Pill tone={k.severity} size="sm">{k.age}</Pill>
                    </div>
                  ))}
                </div>
              )}
            </Surface>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Surface padding="none" className="overflow-hidden">
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <IconChip icon={<Scroll className="w-4 h-4" />} tone="secondary" size="sm" />
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Contracts</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{contracts.length} pending</p>
                  </div>
                </div>
              </div>
              {contracts.length === 0 ? (
                <EmptyState icon={<Scroll className="w-6 h-6" />} title="All signed" description="No contracts awaiting signature." />
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {contracts.map((c) => (
                    <div key={c.id} className="px-5 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{c.employee}</p>
                        <Pill tone={c.status === 'partially_signed' ? 'warn' : 'muted'} size="sm">{c.status.replace('_', ' ')}</Pill>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {c.client} · missing: {c.missing}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Surface>
          </motion.div>

          {topEarners.length > 0 && (
            <TopEarnersBubble
              className="p-5 rounded-xl flex flex-col"
              items={topEarners}
              type="employee"
              title="Cross-client payroll concentration"
            />
          )}

          <motion.div variants={fadeUp}>
            <Surface padding="none" className="overflow-hidden">
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <IconChip icon={<LifeBuoy className="w-4 h-4" />} tone="tertiary" size="sm" />
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Support queue</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>—</p>
                  </div>
                </div>
              </div>
              <EmptyState
                icon={<LifeBuoy className="w-6 h-6" />}
                title="Support inbox not yet wired"
                description="Tickets will appear once the support backend lands."
              />
            </Surface>
          </motion.div>

          {remittance.length > 0 && (
            <motion.div variants={fadeUp}>
              <Surface padding="md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <IconChip icon={<Clock className="w-4 h-4" />} tone="primary" size="sm" />
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Statutory remittance</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This month</p>
                    </div>
                  </div>
                  <Button variant="outlined" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => navigateTo('filing-calendar')}>Mark paid</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {remittance.map((r) => (
                    <div
                      key={r.scheme}
                      className="p-3 rounded-xl"
                      style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{r.scheme}</p>
                        <Pill tone={r.tone} size="sm">{r.days === 0 ? 'today' : `${r.days}d`}</Pill>
                      </div>
                      <p className="text-lg font-semibold mt-2" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {r.amount}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Due {r.due}</p>
                    </div>
                  ))}
                </div>
              </Surface>
            </motion.div>
          )}

          <motion.div variants={fadeUp}>
            <Surface padding="none" className="overflow-hidden">
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <IconChip icon={<Activity className="w-4 h-4" />} tone="primary" size="sm" />
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Platform health</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>—</p>
                  </div>
                </div>
              </div>
              <EmptyState
                icon={<Activity className="w-6 h-6" />}
                title="Health probes not yet wired"
                description="Service uptime + p95 latency will appear once the metrics backend lands."
              />
            </Surface>
          </motion.div>

          {activity.length > 0 && (
            <RecentActivity
              className="p-5 rounded-xl flex flex-col"
              items={activity}
              title="Cross-tenant activity"
            />
          )}
        </BentoMasonry>
      </motion.div>
    </PageContainer>
  );
}
