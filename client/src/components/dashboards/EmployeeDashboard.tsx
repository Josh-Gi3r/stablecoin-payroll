import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Calendar, Wallet, FileText, PiggyBank, Plane, ShieldCheck } from 'lucide-react';
import { useOrgRole } from '../../contexts/OrgRoleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  PageContainer, PageHeader, StatCard, Surface, IconChip, Pill, ProgressBar, Button,
  BentoMasonry, ErrorBanner, LoadingState, EmptyState,
} from '../ui';
import { employees as employeesApi, payroll as payrollApi, timeOff as timeOffApi } from '../../lib/api';
import { useApiList, useApiResource } from '../../hooks/useApi';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 28 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

type ServerEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  salary: number;
  fixedAllowances?: number;
  hireDate: string;
  payFrequency: string;
};

type ServerPayslip = {
  id: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate?: string;
  grossPay: number;
  netPay: number;
  totalDeductions: number;
  totalTaxes: number;
  currency: string;
  epfEmployee?: number;
  socsoEmployee?: number;
  eisEmployee?: number;
  pcb?: number;
  status?: string;
};

type ServerLeaveBalance = {
  leaveType: string;
  totalEntitlement: number;
  used: number;
  remaining: number;
};

const fmtRm = (v: number, cur = 'RM') => `${cur} ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function EmployeeDashboard() {
  const { persona } = useOrgRole();
  const { navigateTo } = useNavigation();
  const firstName = persona.userName.split(' ')[0];

  const { data: me, loading: meLoading, error: meError } = useApiResource<ServerEmployee>(
    () => employeesApi.me(),
    [],
    'Could not load your employee profile',
  );

  const { data: payslips, error: payslipsError } = useApiList<ServerPayslip>(
    () => (me ? payrollApi.payslips(me.id) : Promise.resolve([])),
    [me?.id],
    'Could not load payslips',
  );

  const { data: leaveBalances } = useApiList<ServerLeaveBalance>(
    () => (me ? timeOffApi.balances(me.id) : Promise.resolve([])),
    [me?.id],
    'Could not load leave balances',
  );

  const error = meError ?? payslipsError;

  const sortedPayslips = useMemo(
    () => [...payslips].sort((a, b) => (b.payDate ?? b.payPeriodEnd).localeCompare(a.payDate ?? a.payPeriodEnd)),
    [payslips],
  );

  const ytdGross = sortedPayslips.reduce((s, p) => s + p.grossPay, 0);
  const ytdNet = sortedPayslips.reduce((s, p) => s + p.netPay, 0);
  const latest = sortedPayslips[0];
  const nextPayDate = me?.payFrequency === 'monthly'
    ? (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        d.setDate(25);
        return d.toISOString().slice(0, 10);
      })()
    : null;
  const epfBalance = sortedPayslips.reduce((s, p) => s + (p.epfEmployee ?? 0) * 2, 0);
  const annualLeave = leaveBalances.find((b) => b.leaveType === 'annual');
  const leaveDaysRemaining = annualLeave?.remaining ?? 0;
  const leaveDaysTotal = annualLeave?.totalEntitlement ?? 0;

  const monthlyGross = latest?.grossPay ?? me?.salary ?? 0;
  const deductionsList = latest
    ? [
        { label: 'EPF (11%)',        amount: fmtRm(latest.epfEmployee ?? monthlyGross * 0.11), pct: monthlyGross > 0 ? Math.round(((latest.epfEmployee ?? monthlyGross * 0.11) / monthlyGross) * 100 * 5) : 0 },
        { label: 'SOCSO',            amount: fmtRm(latest.socsoEmployee ?? monthlyGross * 0.005), pct: 30 },
        { label: 'EIS',              amount: fmtRm(latest.eisEmployee ?? monthlyGross * 0.002), pct: 15 },
        { label: 'PCB (Income Tax)', amount: fmtRm(latest.pcb ?? 0), pct: monthlyGross > 0 ? Math.round(((latest.pcb ?? 0) / monthlyGross) * 100 * 4) : 0 },
      ]
    : [];

  const totalDeducted = latest ? (latest.totalDeductions + latest.totalTaxes) : 0;

  return (
    <PageContainer>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUp}>
          <PageHeader
            eyebrow={`${persona.org.name} · Employee`}
            title={`Hi, ${me ? me.firstName : firstName}`}
            subtitle="Your next pay, recent payslips, and benefits — managed by EOR Provider on behalf of your employer."
            actions={<Button variant="secondary" size="sm" icon={<FileText className="w-3.5 h-3.5" />} onClick={() => navigateTo('my-pay')}>Download EA form</Button>}
          />
        </motion.div>

        <ErrorBanner message={error} />

        {meLoading && !me && <LoadingState label="Loading your profile…" />}

        <motion.div variants={fadeUp}>
          <Surface tone="accent" padding="lg" glow="primary">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--primary)' }}>
                  Next pay date
                </p>
                <p className="text-4xl font-semibold mt-2" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {nextPayDate ?? '—'}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Estimated net pay · <span style={{ color: 'var(--text-primary)' }}>{latest ? fmtRm(latest.netPay) : '—'}</span> · via stablecoin rails
                </p>
              </div>
              <div className="flex items-center gap-3">
                <IconChip icon={<DollarSign className="w-5 h-5" />}  tone="primary"   size="lg" />
                <IconChip icon={<Calendar className="w-5 h-5" />}    tone="secondary" size="lg" />
                <IconChip icon={<ShieldCheck className="w-5 h-5" />} tone="tertiary"  size="lg" />
              </div>
            </div>
          </Surface>
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="YTD gross"   value={fmtRm(ytdGross)} hint={`${sortedPayslips.length} pay cycles`} icon={<DollarSign className="w-5 h-5" />} tone="primary" />
          <StatCard label="YTD net"     value={fmtRm(ytdNet)}   hint="after statutory"     icon={<Wallet className="w-5 h-5" />}     tone="secondary" />
          <StatCard label="EPF balance" value={fmtRm(epfBalance)}  hint="employee + employer" icon={<PiggyBank className="w-5 h-5" />}  tone="tertiary" />
          <StatCard label="Leave days"  value={`${leaveDaysRemaining}`} hint={`of ${leaveDaysTotal} annual`} icon={<Plane className="w-5 h-5" />} tone="primary" />
        </motion.div>

        <BentoMasonry breakpointCols={{ default: 2, 1023: 1 }}>
          <motion.div variants={fadeUp}>
            <Surface padding="none" className="overflow-hidden">
              <div className="px-5 md:px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <IconChip icon={<FileText className="w-4 h-4" />} tone="primary" size="sm" />
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Payslip history</h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Downloadable · MOM-compliant</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigateTo('my-pay')}>All payslips</Button>
              </div>
              {sortedPayslips.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-6 h-6" />}
                  title="No payslips yet"
                  description="Once your first payroll runs, payslips will appear here."
                />
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {sortedPayslips.slice(0, 6).map((p) => (
                    <div key={p.id} className="px-5 md:px-6 py-3 flex items-center gap-4 hover:bg-slate-50/60 transition-colors">
                      <IconChip icon={<Calendar className="w-4 h-4" />} tone="neutral" size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.payPeriodEnd.slice(0, 7)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Paid {p.payDate?.slice(0, 10) ?? p.payPeriodEnd.slice(0, 10)}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Gross</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtRm(p.grossPay, p.currency)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Net</p>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtRm(p.netPay, p.currency)}</p>
                      </div>
                      <Pill tone="success" size="sm" dot>{p.status ?? 'paid'}</Pill>
                    </div>
                  ))}
                </div>
              )}
            </Surface>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Surface padding="md">
              <div className="flex items-center gap-3 mb-4">
                <IconChip icon={<ShieldCheck className="w-4 h-4" />} tone="tertiary" size="sm" />
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>This month</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Statutory deductions</p>
                </div>
              </div>
              {deductionsList.length === 0 ? (
                <EmptyState title="No data yet" description="Statutory deductions appear after the next payroll run." />
              ) : (
                <>
                  <div className="space-y-3">
                    {deductionsList.map((d, i) => (
                      <div key={d.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{d.amount}</span>
                        </div>
                        <ProgressBar value={Math.min(100, d.pct)} tone={i === 0 ? 'primary' : i === 1 ? 'secondary' : 'tertiary'} size="sm" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total deducted</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtRm(totalDeducted, latest?.currency ?? 'RM')}</span>
                  </div>
                </>
              )}
            </Surface>
          </motion.div>
        </BentoMasonry>
      </motion.div>
    </PageContainer>
  );
}

export default EmployeeDashboard;
