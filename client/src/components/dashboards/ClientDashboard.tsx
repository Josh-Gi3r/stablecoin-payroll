import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Calendar, Wallet, FileText, Plus, ShieldCheck, Play, Download,
  CheckCircle2, TrendingUp, DollarSign, Scroll,
} from 'lucide-react';
import { useOrgRole } from '../../contexts/OrgRoleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, PageHeader, Button, BentoMasonry, ErrorBanner } from '../ui';
import {
  SettlementSavingsHero, KpiStrip, type KpiItem,
  PayrollCostTrend, GrossToNetWaterfall,
  DepartmentBar, CurrencyHoldings, PendingApprovalsCard, QuickActions,
  TopEarnersBubble, StatutoryContributions, PlatformVsWiseSavings,
  StatutoryFilingStatus, RecentActivity,
  TrustDepositCard, PlatformInvoicesCard, NeedsYouCard,
} from './widgets';
import {
  dashboard as dashboardApi,
  invoices as invoicesApi,
  approvals as approvalsApi,
  wallets as walletsApi,
  deposits as depositsApi,
  transactions as transactionsApi,
  payroll as payrollApi,
} from '../../lib/api';
import { useApiList, useApiResource } from '../../hooks/useApi';

type ClientSummary = {
  headcount: number;
  totalSalary: number;
  monthlyPayroll: number;
  currency: string;
  nextPayDate: string | null;
  payrollAccuracy: number;
  employerContrib: number;
};

type TrendPoint = { month: string; cost: number; budget: number };
type DeptTotal = { name: string; value: number };
type TopEarner = { id: string; name: string; value: number; displayValue: string };
type Activity = { id: string; action: string; entityType: string; entityId: string; timestamp: string };
type Wallet = { id: string; stablecoin: string; balance: number };
type ApiInvoice = { id: string; invoiceNumber: string; periodStart?: string; periodEnd?: string; total: number; amountDue: number; dueDate: string; status: string; currency: string };
type ApiApproval = { id: string; type: string; description: string; amount: number | null; currency: string | null; createdAt: string; priority: string; status: string };
type ApiDeposit = { id: string; clientId: string | null; amount: number; status: string; currency: string };
type ApiPayrollRun = { id: string; payDate: string; totalGrossPay: number; totalDeductions: number; totalTaxes: number; totalNetPay: number; currency: string; status: string };

const fmtMyr = (v: number) => v >= 1_000_000 ? `Stablecoin ${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `Stablecoin ${(v / 1_000).toFixed(0)}K` : `Stablecoin ${v.toFixed(0)}`;
const fmtRm = (v: number) => v >= 1_000_000 ? `RM ${(v / 1_000_000).toFixed(1)}M` : `RM ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function ClientDashboard() {
  const { persona, isEor } = useOrgRole();
  const { navigateTo } = useNavigation();
  const quickActionMap: Record<string, string> = {
    'run-payroll': 'payroll',
    'export': 'export',
    'submit-epf': 'statutory',
    'calendar': 'filing-calendar',
  };
  const isFinance = persona.role === 'finance';
  const isAdmin = persona.role === 'admin';

  const { data: summary, error: summaryError } = useApiResource<ClientSummary>(
    () => dashboardApi.clientSummary(),
    [],
    'Failed to load dashboard summary',
  );
  const { data: trend, error: trendError } = useApiList<TrendPoint>(() => dashboardApi.payrollCostTrend(), [], 'Failed to load cost trend');
  const { data: departments } = useApiList<DeptTotal>(() => dashboardApi.departmentTotals(), [], 'Failed to load departments');
  const { data: topEarners } = useApiList<TopEarner>(() => dashboardApi.topEarners(5), [], 'Failed to load top earners');
  const { data: activity } = useApiList<Activity>(() => dashboardApi.recentActivity(8), [], 'Failed to load activity');
  const { data: wallets } = useApiList<Wallet>(() => walletsApi.list(), [], 'Failed to load wallets');
  const { data: invoices } = useApiList<ApiInvoice>(() => invoicesApi.list(), [], 'Failed to load invoices');
  const { data: pendingApprovals } = useApiList<ApiApproval>(() => approvalsApi.list({ status: 'pending' }), [], 'Failed to load approvals');
  const { data: deposits } = useApiList<ApiDeposit>(() => depositsApi.list(), [], 'Failed to load deposits');
  const { data: payrollRuns } = useApiList<ApiPayrollRun>(() => payrollApi.runs(), [], 'Failed to load payroll runs');
  const { data: txns } = useApiList<any>(() => transactionsApi.list(), [], 'Failed to load transactions');

  const error = summaryError ?? trendError;

  const kpis: KpiItem[] = useMemo(() => {
    const monthly = summary?.monthlyPayroll ?? 0;
    const headcount = summary?.headcount ?? 0;
    const employerContrib = summary?.employerContrib ?? 0;
    const sparkData = trend.slice(-12).map((t) => t.cost);
    return [
      { label: 'Headcount',         displayValue: `${headcount}`,                               change: '',     positive: true, icon: Users,        accent: 'var(--sky-500)',    sparkData: sparkData.length ? sparkData.map(() => headcount) : undefined },
      { label: 'Monthly Payroll',   displayValue: fmtMyr(monthly),                              change: '',     positive: true, icon: DollarSign,   accent: 'var(--sky-400)',    sparkData },
      { label: 'Statutory Due',     displayValue: summary?.nextPayDate ?? '—',                  change: '',     positive: true, icon: Calendar,     accent: 'var(--warn)' },
      { label: 'Next Pay',          displayValue: summary?.nextPayDate ?? '—',                  change: '',     positive: true, icon: Calendar,     accent: 'var(--lilac-500)' },
      { label: 'Payroll Accuracy',  displayValue: `${(summary?.payrollAccuracy ?? 0).toFixed(1)}%`, change: '', positive: true, icon: ShieldCheck,  accent: 'var(--sky-500)' },
      { label: 'Employer contrib.', displayValue: fmtMyr(employerContrib),                      change: '',     positive: true, icon: Wallet,       accent: 'var(--sky-400)' },
    ];
  }, [summary, trend]);

  const trendData = trend.map((t) => ({ month: t.month, cost: t.cost, budget: t.budget }));

  const latestRun = payrollRuns[0];
  const grossToNetSteps = latestRun
    ? [
        { name: 'Gross Pay', value: latestRun.totalGrossPay, fill: 'var(--sky-500)',   type: 'positive' as const },
        { name: 'Deductions', value: -latestRun.totalDeductions, fill: 'var(--danger)', type: 'negative' as const },
        { name: 'Taxes', value: -latestRun.totalTaxes, fill: 'var(--warn)', type: 'negative' as const },
        { name: 'Net Pay', value: latestRun.totalNetPay, fill: 'var(--sky-400)', type: 'total' as const },
      ]
    : [];

  const totalWallet = wallets.reduce((s, w) => s + w.balance, 0);
  const currencyHoldings = wallets.map((w) => ({
    name: w.stablecoin,
    value: w.balance,
    percentage: totalWallet > 0 ? Math.round((w.balance / totalWallet) * 100) : 0,
  }));

  const eorDeposit = deposits.find((d) => d.status === 'received' || d.status === 'held');
  const requiredTotal = deposits.reduce((s, d) => s + d.amount, 0);
  const heldTotal = deposits.filter((d) => d.status === 'received' || d.status === 'held').reduce((s, d) => s + d.amount, 0);
  const fundingPct = requiredTotal > 0 ? Math.round((heldTotal / requiredTotal) * 100) : 0;
  const shortBy = Math.max(0, requiredTotal - heldTotal);

  const platformInvoices = invoices.slice(0, 4).map((inv) => {
    const status: 'paid' | 'draft' | 'overdue' =
      inv.status === 'paid' ? 'paid' : inv.status === 'overdue' ? 'overdue' : 'draft';
    return {
      id: inv.invoiceNumber,
      period: inv.periodStart && inv.periodEnd ? `${inv.periodStart.slice(5)} – ${inv.periodEnd.slice(5)}` : '—',
      total: `${inv.currency} ${inv.total.toLocaleString()}`,
      due: inv.dueDate?.slice(5) ?? '—',
      status,
      breakdown: { payroll: `${inv.currency} ${(inv.total * 0.94).toFixed(0)}`, statutory: `${inv.currency} ${(inv.total * 0.01).toFixed(0)}`, fee: `${inv.currency} ${(inv.total * 0.05).toFixed(0)}` },
    };
  });

  const pendingItems = pendingApprovals.slice(0, 5).map((a) => ({
    id: a.id,
    type: a.type,
    title: a.description,
    amount: a.amount != null ? `${a.currency ?? 'MYR'} ${a.amount.toLocaleString()}` : '—',
    time: a.createdAt.slice(0, 10),
    urgent: a.priority === 'high',
  }));

  const swapTxns = txns.filter((t: any) => t.type === 'swap');
  const sendTxns = txns.filter((t: any) => t.type === 'send');
  const platformVsWiseRows = [...sendTxns.slice(0, 3), ...swapTxns.slice(0, 2)].map((t: any) => {
    const wiseFee = t.fromAmount * 0.008; // ~0.8% wise fee approximation
    return {
      label: `${t.fromCurrency} → ${t.toCurrency}`,
      amount: `${t.fromCurrency} ${t.fromAmount.toLocaleString()}`,
      platform: `$${(t.platformFee ?? 0.01).toFixed(2)}`,
      wise: `$${wiseFee.toFixed(0)}`,
      saved: `$${Math.max(0, wiseFee - (t.platformFee ?? 0.01)).toFixed(2)}`,
    };
  });

  const recentItems = activity.slice(0, 6).map((a) => ({
    icon: a.action.includes('payroll') ? CheckCircle2 : a.action.includes('filing') ? ShieldCheck : a.action.includes('send') ? Wallet : Calendar,
    color: a.action.includes('payroll') ? 'var(--sky-500)' : 'var(--sky-400)',
    text: a.action.replace(/_/g, ' '),
    detail: `${a.entityType} ${a.entityId.slice(0, 8)}`,
    time: a.timestamp.slice(0, 10),
  }));

  return (
    <PageContainer>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUp}>
          <PageHeader
            eyebrow={`${persona.org.name} · ${persona.role}`}
            title={isFinance ? 'Finance overview' : isAdmin ? `Welcome, ${persona.userName.split(' ')[0]}` : 'People operations'}
            subtitle={
              isEor
                ? 'EOR client — EOR Provider is the legal employer. Trust deposit, tripartite contracts, and EOR Provider invoicing all available.'
                : 'Payroll + HR client — PayrollPlatform is your software, you are the legal employer.'
            }
            actions={
              <>
                <Button variant="secondary" size="sm" onClick={() => navigateTo('filing-calendar')}>Payroll calendar</Button>
                {isAdmin && <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => navigateTo('employee-onboarding')}>Add employee</Button>}
              </>
            }
          />
        </motion.div>

        <ErrorBanner message={error} />

        <div className="grid grid-cols-12 gap-4">
          <SettlementSavingsHero
            label="Settlement Fees Saved"
            subtitle="vs. Wise & traditional rails"
            value={Number(platformVsWiseRows.reduce((s, r) => s + Number(r.saved.replace(/[$,]/g, '')), 0).toFixed(2))}
            decimals={2}
            change=""
            sparkData={trend.slice(-12).map((t) => t.cost / 1000)}
            stats={[
              { label: 'Txns MTD', value: `${txns.length}` },
              { label: 'Volume', value: fmtMyr(txns.reduce((s: number, t: any) => s + (t.fromAmount ?? 0), 0)) },
              { label: 'Fee Paid', value: `$${txns.reduce((s: number, t: any) => s + (t.platformFee ?? 0), 0).toFixed(2)}` },
            ]}
            corridorSavings={platformVsWiseRows.slice(0, 3).map((r) => ({ label: r.label, wise: r.wise, saved: r.saved }))}
          />
          <KpiStrip items={kpis} />
        </div>

        <div className="grid grid-cols-12 gap-4">
          <PayrollCostTrend data={trendData} />
          <GrossToNetWaterfall steps={grossToNetSteps} />
        </div>

        <BentoMasonry>
          {isEor && requiredTotal > 0 && (
            <TrustDepositCard
              feature={isAdmin}
              showTopUp={isFinance}
              onTopUp={() => navigateTo('deposits')}
              held={fmtRm(heldTotal)}
              fundingLevel={fundingPct}
              required={fmtRm(requiredTotal)}
              shortBy={shortBy > 0 ? fmtRm(shortBy) : ''}
              subtitle={`Across ${deposits.length} employee deposit${deposits.length === 1 ? '' : 's'}`}
            />
          )}
          {isEor && pendingItems.length > 0 && (
            <NeedsYouCard
              actions={pendingItems.slice(0, 3).map((p) => ({
                id: p.id,
                label: p.title,
                tone: p.urgent ? 'warn' : 'primary',
                icon: p.type === 'Payroll' ? CheckCircle2 : p.type === 'Contract' ? Scroll : Wallet,
              })) as any}
              onActionClick={() => navigateTo('approvals')}
            />
          )}
          {isEor && platformInvoices.length > 0 && (
            <PlatformInvoicesCard showBreakdown={isFinance} invoices={platformInvoices} />
          )}
          {departments.length > 0 && (
            <DepartmentBar
              className="p-5 rounded-xl flex flex-col"
              data={departments.slice(0, 6)}
            />
          )}
          {currencyHoldings.length > 0 && (
            <CurrencyHoldings
              className="p-5 rounded-xl flex flex-col"
              data={currencyHoldings}
            />
          )}
          {pendingItems.length > 0 && (
            <PendingApprovalsCard
              className="p-5 rounded-xl flex flex-col"
              items={pendingItems as any}
              onItemClick={() => navigateTo('approvals')}
            />
          )}
          <QuickActions
            className="p-5 rounded-xl flex flex-col"
            onAction={(id) => {
              const target = quickActionMap[id];
              if (target) navigateTo(target);
            }}
            actions={[
              { id: 'run-payroll', label: 'Run Payroll',     desc: latestRun ? latestRun.payDate.slice(0, 10) : 'Next cycle',    icon: Play,        color: 'var(--sky-500)' },
              { id: 'export',      label: 'Export Payslips', desc: 'PDF / Excel / CSV',    icon: Download,    color: 'var(--sky-400)' },
              { id: 'submit-epf',  label: 'Submit EPF',      desc: 'Statutory filings',    icon: ShieldCheck, color: 'var(--lilac-500)' },
              { id: 'calendar',    label: 'Filing Calendar', desc: 'Upcoming deadlines',   icon: Calendar,    color: 'var(--warn)' },
            ]}
          />
          {topEarners.length > 0 && (
            <TopEarnersBubble
              className="p-5 rounded-xl flex flex-col"
              items={topEarners.map((e) => ({ name: e.name, displayValue: `Stablecoin ${e.displayValue}`, value: e.value }))}
            />
          )}
          {latestRun && (
            <StatutoryContributions
              className="p-5 rounded-xl flex flex-col"
              currency={latestRun.currency}
              period={latestRun.payDate.slice(0, 7)}
              items={[
                { label: 'EPF Employee', amount: latestRun.totalGrossPay * 0.11, color: 'var(--sky-500)' },
                { label: 'EPF Employer', amount: latestRun.totalGrossPay * 0.13, color: 'var(--sky-400)' },
                { label: 'SOCSO',        amount: latestRun.totalGrossPay * 0.045, color: 'var(--warn)' },
                { label: 'EIS',          amount: latestRun.totalGrossPay * 0.008, color: 'var(--lilac-500)' },
                { label: 'PCB/MTD',      amount: latestRun.totalTaxes, color: 'var(--danger)' },
                { label: 'HRDF',         amount: latestRun.totalGrossPay * 0.01, color: 'var(--text-muted)' },
              ]}
              shareTiles={[
                { label: 'Employee Share', amount: fmtMyr(latestRun.totalGrossPay * 0.118 + latestRun.totalTaxes), sub: 'EPF · SOCSO · EIS · PCB' },
                { label: 'Employer Share', amount: fmtMyr(latestRun.totalGrossPay * 0.183), sub: 'EPF · SOCSO · EIS · HRDF' },
              ]}
              deadlines={[
                { agency: 'EPF (KWSP)', due: '15th', amount: fmtMyr(latestRun.totalGrossPay * 0.24) },
                { agency: 'SOCSO + EIS', due: '15th', amount: fmtMyr(latestRun.totalGrossPay * 0.053) },
                { agency: 'PCB/MTD (LHDN)', due: '15th', amount: fmtMyr(latestRun.totalTaxes) },
              ]}
            />
          )}
          {platformVsWiseRows.length > 0 && (
            <PlatformVsWiseSavings
              className="p-5 rounded-xl flex flex-col relative overflow-hidden"
              rows={platformVsWiseRows}
            />
          )}
          <StatutoryFilingStatus
            className="p-5 rounded-xl flex flex-col"
            rows={[
              { country: 'EPF (KWSP)',      status: 'compliant', score: 100, due: '15th' },
              { country: 'SOCSO (PERKESO)', status: 'compliant', score: 100, due: '15th' },
              { country: 'EIS',             status: 'compliant', score: 100, due: '15th' },
              { country: 'PCB / MTD',       status: 'compliant', score: 100, due: '15th' },
              { country: 'HRDF (PSMB)',     status: 'compliant', score: 100, due: '15th' },
            ]}
          />
          {recentItems.length > 0 && (
            <RecentActivity
              className="p-5 rounded-xl flex flex-col"
              items={recentItems as any}
            />
          )}
        </BentoMasonry>
      </motion.div>
    </PageContainer>
  );
}

export default ClientDashboard;
