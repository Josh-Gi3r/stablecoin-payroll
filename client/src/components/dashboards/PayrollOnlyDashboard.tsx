import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, DollarSign, Calendar, ShieldCheck, Wallet,
  CheckCircle2, Play, Download, TrendingUp,
} from 'lucide-react';
import { useOrgRole } from '../../contexts/OrgRoleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, PageHeader, Button, BentoMasonry, ErrorBanner } from '../ui';
import {
  SettlementSavingsHero, KpiStrip, type KpiItem,
  PayrollCostTrend, GrossToNetWaterfall,
  CurrencyHoldings, PendingApprovalsCard, QuickActions,
  StatutoryContributions, PlatformVsWiseSavings, StatutoryFilingStatus,
  RecentActivity,
} from './widgets';
import {
  dashboard as dashboardApi,
  approvals as approvalsApi,
  wallets as walletsApi,
  payroll as payrollApi,
  transactions as transactionsApi,
} from '../../lib/api';
import { useApiList, useApiResource } from '../../hooks/useApi';

type ClientSummary = {
  headcount: number;
  monthlyPayroll: number;
  currency: string;
  nextPayDate: string | null;
  payrollAccuracy: number;
  employerContrib: number;
};
type TrendPoint = { month: string; cost: number; budget: number };
type ApiPayrollRun = { id: string; payDate: string; totalGrossPay: number; totalDeductions: number; totalTaxes: number; totalNetPay: number; currency: string };
type ApiWallet = { stablecoin: string; balance: number };
type ApiApproval = { id: string; type: string; description: string; amount: number | null; currency: string | null; createdAt: string; priority: string; status: string };

const fmtAbs = (cur: string, v: number) => v >= 1_000_000 ? `${cur} ${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${cur} ${(v / 1_000).toFixed(0)}K` : `${cur} ${v.toFixed(0)}`;

export function PayrollOnlyDashboard() {
  const { persona } = useOrgRole();
  const { navigateTo } = useNavigation();
  const quickActionMap: Record<string, string> = {
    'run-payroll': 'payroll',
    'export': 'export',
    'submit': 'statutory',
    'calendar': 'filing-calendar',
  };
  const isMy = persona.org.country !== 'SG';
  const currency = isMy ? 'Stablecoin' : 'xSGD';

  const { data: summary, error: summaryError } = useApiResource<ClientSummary>(() => dashboardApi.clientSummary(), [], 'Failed to load summary');
  const { data: trend } = useApiList<TrendPoint>(() => dashboardApi.payrollCostTrend(), [], 'Failed to load cost trend');
  const { data: payrollRuns } = useApiList<ApiPayrollRun>(() => payrollApi.runs(), [], 'Failed to load payroll runs');
  const { data: wallets } = useApiList<ApiWallet>(() => walletsApi.list(), [], 'Failed to load wallets');
  const { data: pendingApprovals } = useApiList<ApiApproval>(() => approvalsApi.list({ status: 'pending' }), [], 'Failed to load approvals');
  const { data: txns } = useApiList<any>(() => transactionsApi.list(), [], 'Failed to load transactions');

  const latestRun = payrollRuns[0];
  const monthly = summary?.monthlyPayroll ?? 0;
  const headcount = summary?.headcount ?? 0;
  const employerContrib = summary?.employerContrib ?? 0;

  const kpis: KpiItem[] = useMemo(() => {
    const sparkData = trend.slice(-12).map((t) => t.cost);
    return [
      { label: 'Total Employees',  displayValue: `${headcount}`, change: '', positive: true, icon: Users, accent: 'var(--sky-500)' },
      { label: 'Monthly Payroll',  displayValue: fmtAbs(currency, monthly), change: '', positive: true, icon: DollarSign, accent: 'var(--sky-400)', sparkData },
      { label: 'Statutory Due',    displayValue: isMy ? '15th' : '14th', change: 'Monthly', positive: true, icon: Calendar, accent: 'var(--warn)' },
      { label: 'Next Pay Date',    displayValue: summary?.nextPayDate ?? '—', change: '', positive: true, icon: Calendar, accent: 'var(--lilac-500)' },
      { label: 'Payroll Accuracy', displayValue: `${(summary?.payrollAccuracy ?? 0).toFixed(1)}%`, change: '', positive: true, icon: ShieldCheck, accent: 'var(--sky-500)' },
      { label: 'Statutory Total',  displayValue: fmtAbs(currency, employerContrib), change: '', positive: true, icon: Wallet, accent: 'var(--sky-400)' },
    ];
  }, [headcount, monthly, employerContrib, summary, trend, isMy, currency]);

  const trendData = trend.map((t) => ({ month: t.month, cost: t.cost, budget: t.budget }));

  const grossToNetSteps = latestRun
    ? [
        { name: 'Gross Pay', value: latestRun.totalGrossPay, fill: 'var(--sky-500)', type: 'positive' as const },
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

  const pendingItems = pendingApprovals.slice(0, 4).map((a) => ({
    id: a.id,
    type: a.type,
    title: a.description,
    amount: a.amount != null ? `${a.currency ?? currency} ${a.amount.toLocaleString()}` : '—',
    time: a.createdAt.slice(0, 10),
    urgent: a.priority === 'high',
  }));

  const platformVsWiseRows = txns.slice(0, 5).map((t: any) => {
    const wiseFee = t.fromAmount * 0.008;
    return {
      label: `${t.fromCurrency} → ${t.toCurrency}`,
      amount: `${t.fromCurrency} ${t.fromAmount.toLocaleString()}`,
      platform: `$${(t.platformFee ?? 0.01).toFixed(2)}`,
      wise: `$${wiseFee.toFixed(0)}`,
      saved: `$${Math.max(0, wiseFee - (t.platformFee ?? 0.01)).toFixed(2)}`,
    };
  });

  return (
    <PageContainer>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUp}>
          <PageHeader
            eyebrow={`${persona.org.name} · ${persona.role}`}
            title="Payroll overview"
            subtitle="Run payroll, file statutory contributions, and track settlement savings — PayrollPlatform as your payroll software."
            actions={<Button variant="primary" size="sm" icon={<Play className="w-3.5 h-3.5" />} onClick={() => navigateTo('payroll')}>Run payroll</Button>}
          />
        </motion.div>

        <ErrorBanner message={summaryError} />

        <div className="grid grid-cols-12 gap-4">
          <SettlementSavingsHero
            label="Settlement Fees Saved"
            subtitle="vs. Wise & traditional rails"
            value={Number(platformVsWiseRows.reduce((s: number, r: any) => s + Number(r.saved.replace(/[$,]/g, '')), 0).toFixed(2))}
            decimals={2}
            change=""
            sparkData={trend.slice(-12).map((t) => t.cost / 1000)}
            stats={[
              { label: 'Txns MTD', value: `${txns.length}` },
              { label: 'Volume', value: fmtAbs(currency, txns.reduce((s: number, t: any) => s + (t.fromAmount ?? 0), 0)) },
              { label: 'Fee Paid', value: `$${txns.reduce((s: number, t: any) => s + (t.platformFee ?? 0), 0).toFixed(2)}` },
            ]}
            corridorSavings={platformVsWiseRows.slice(0, 3).map((r: any) => ({ label: r.label, wise: r.wise, saved: r.saved }))}
          />
          <KpiStrip items={kpis} />
        </div>

        <div className="grid grid-cols-12 gap-4">
          <PayrollCostTrend data={trendData} />
          <GrossToNetWaterfall steps={grossToNetSteps} />
        </div>

        <BentoMasonry>
          {currencyHoldings.length > 0 && (
            <CurrencyHoldings className="p-5 rounded-xl flex flex-col" data={currencyHoldings} />
          )}
          {pendingItems.length > 0 && (
            <PendingApprovalsCard className="p-5 rounded-xl flex flex-col" items={pendingItems as any} onItemClick={() => navigateTo('approvals')} />
          )}
          <QuickActions
            className="p-5 rounded-xl flex flex-col"
            onAction={(id) => {
              const target = quickActionMap[id];
              if (target) navigateTo(target);
            }}
            actions={[
              { id: 'run-payroll', label: 'Run Payroll', desc: latestRun ? latestRun.payDate.slice(0, 10) : 'Next cycle', icon: Play, color: 'var(--sky-500)' },
              { id: 'export', label: 'Export Payslips', desc: 'PDF / Excel / CSV', icon: Download, color: 'var(--sky-400)' },
              { id: 'submit', label: isMy ? 'Submit EPF' : 'Submit CPF', desc: 'Statutory filings', icon: ShieldCheck, color: 'var(--lilac-500)' },
              { id: 'calendar', label: 'Filing Calendar', desc: 'Upcoming deadlines', icon: Calendar, color: 'var(--warn)' },
            ]}
          />
          {latestRun && (
            <StatutoryContributions
              className="p-5 rounded-xl flex flex-col"
              currency={latestRun.currency}
              period={latestRun.payDate.slice(0, 7)}
              items={isMy ? [
                { label: 'EPF Employee', amount: latestRun.totalGrossPay * 0.11, color: 'var(--sky-500)' },
                { label: 'EPF Employer', amount: latestRun.totalGrossPay * 0.13, color: 'var(--sky-400)' },
                { label: 'SOCSO',        amount: latestRun.totalGrossPay * 0.045, color: 'var(--warn)' },
                { label: 'EIS',          amount: latestRun.totalGrossPay * 0.008, color: 'var(--lilac-500)' },
                { label: 'PCB/MTD',      amount: latestRun.totalTaxes, color: 'var(--danger)' },
                { label: 'HRDF',         amount: latestRun.totalGrossPay * 0.01, color: 'var(--text-muted)' },
              ] : [
                { label: 'CPF Employee', amount: latestRun.totalGrossPay * 0.20, color: 'var(--sky-500)' },
                { label: 'CPF Employer', amount: latestRun.totalGrossPay * 0.17, color: 'var(--sky-400)' },
                { label: 'SDL',          amount: latestRun.totalGrossPay * 0.0025, color: 'var(--warn)' },
              ]}
              shareTiles={[
                { label: 'Employee Share', amount: fmtAbs(currency, latestRun.totalDeductions + latestRun.totalTaxes), sub: isMy ? 'EPF · SOCSO · EIS · PCB' : 'CPF' },
                { label: 'Employer Share', amount: fmtAbs(currency, latestRun.totalGrossPay * 0.17), sub: isMy ? 'EPF · SOCSO · EIS · HRDF' : 'CPF · SDL' },
              ]}
              deadlines={isMy ? [
                { agency: 'EPF (KWSP)', due: '15th', amount: fmtAbs(currency, latestRun.totalGrossPay * 0.24) },
                { agency: 'SOCSO + EIS', due: '15th', amount: fmtAbs(currency, latestRun.totalGrossPay * 0.053) },
                { agency: 'PCB/MTD (LHDN)', due: '15th', amount: fmtAbs(currency, latestRun.totalTaxes) },
              ] : [
                { agency: 'CPF (CPFB)', due: '14th', amount: fmtAbs(currency, latestRun.totalGrossPay * 0.37) },
                { agency: 'SDL', due: '14th', amount: fmtAbs(currency, latestRun.totalGrossPay * 0.0025) },
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
            rows={isMy ? [
              { country: 'EPF (KWSP)',      status: 'compliant', score: 100, due: '15th' },
              { country: 'SOCSO (PERKESO)', status: 'compliant', score: 100, due: '15th' },
              { country: 'EIS',             status: 'compliant', score: 100, due: '15th' },
              { country: 'PCB / MTD',       status: 'compliant', score: 100, due: '15th' },
              { country: 'HRDF (PSMB)',     status: 'compliant', score: 100, due: '15th' },
            ] : [
              { country: 'CPF', status: 'compliant', score: 100, due: '14th' },
              { country: 'SDL', status: 'compliant', score: 100, due: '14th' },
              { country: 'FWL', status: 'compliant', score: 100, due: '14th' },
            ]}
          />
          <RecentActivity
            className="p-5 rounded-xl flex flex-col"
            items={[
              ...(latestRun ? [{
                icon: CheckCircle2,
                color: 'var(--sky-500)',
                text: `${latestRun.payDate.slice(0, 7)} payroll completed`,
                detail: `${latestRun.currency} ${latestRun.totalGrossPay.toLocaleString()} disbursed`,
                time: latestRun.payDate.slice(0, 10),
              }] : []),
              ...txns.slice(0, 4).map((t: any) => ({
                icon: t.type === 'swap' ? TrendingUp : t.type === 'send' ? Wallet : Calendar,
                color: 'var(--lilac-500)',
                text: `${t.type} ${t.fromCurrency} → ${t.toCurrency}`,
                detail: `${t.fromAmount.toLocaleString()} ${t.fromCurrency}`,
                time: t.createdAt.slice(0, 10),
              })),
            ] as any}
          />
        </BentoMasonry>
      </motion.div>
    </PageContainer>
  );
}

export default PayrollOnlyDashboard;
