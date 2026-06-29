import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, TrendingUp, DollarSign, AlertCircle, CheckCircle, Clock, Send, Plus, Search, ShieldCheck, Loader2, X } from 'lucide-react';
import { calculateStatutoryDeductions, getDaysUntilDeadline, getComplianceStatus } from '../../lib/statutoryDeductions';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import AddEmployeeModal from './AddEmployeeModal';
import { PageContainer, Tab, Tabs, ErrorBanner, LoadingState } from '../ui';
import { employees as employeesApi, payroll as payrollApi, transactions as transactionsApi } from '../../lib/api';
import { useApiList, coerceError } from '../../hooks/useApi';

// Server employee row (subset of fields the view uses).
type ServerEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  status: 'active' | 'inactive' | 'terminated';
  salary: number;
  currency: string;
  nationality: 'malaysian' | 'pr' | 'foreign' | null;
  taxCategory: 'KA1' | 'KA2' | 'KA3' | null;
  ageGroup: 'below_60' | 'above_60' | null;
  residentStatus: 'resident' | 'non_resident' | null;
};

type PayrollRun = {
  id: string;
  payPeriodStart: string | null;
  payPeriodEnd: string | null;
  payDate: string | null;
  status: 'draft' | 'approved' | 'processed' | 'paid' | string;
  totalGross: number | null;
  totalNet: number | null;
};

const complianceStatusStyle = {
  safe: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  overdue: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
};

export default function PayrollView() {
  const [activeTab, setActiveTab] = useState('roster');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runSubmitting, setRunSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ done: number; total: number } | null>(null);
  const [sendDone, setSendDone] = useState(false);

  const {
    data: rawEmployees,
    loading: empLoading,
    error: empError,
    reload: reloadEmployees,
  } = useApiList<ServerEmployee>(() => employeesApi.list(), [], 'Failed to load employees');

  const {
    data: payrollRuns,
    loading: runsLoading,
    error: runsError,
    reload: reloadRuns,
  } = useApiList<PayrollRun>(() => payrollApi.runs(), [], 'Failed to load payroll runs');

  // Map server employees → view shape (single name, "Active" string, defaults
  // for the optional statutory fields). Memoized so the breakdowns below
  // are stable across re-renders.
  const employees = useMemo(
    () =>
      rawEmployees
        .filter((e) => e.status !== 'terminated')
        .map((e) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`.trim(),
          role: e.position,
          salary: e.salary,
          currency: e.currency || 'Stablecoin',
          department: e.department,
          status: e.status === 'active' ? 'Active' : 'Inactive',
          nationality: (e.nationality ?? 'malaysian') as 'malaysian' | 'pr' | 'foreign',
          taxCategory: (e.taxCategory ?? 'KA1') as 'KA1' | 'KA2' | 'KA3',
          ageGroup: (e.ageGroup ?? 'below_60') as 'below_60' | 'above_60',
          residentStatus: (e.residentStatus ?? 'resident') as 'resident' | 'non_resident',
        })),
    [rawEmployees],
  );

  const employeeBreakdowns = useMemo(
    () =>
      employees.map((emp) =>
        calculateStatutoryDeductions({
          grossSalary: emp.salary,
          nationality: emp.nationality,
          residentStatus: emp.residentStatus,
          taxCategory: emp.taxCategory,
          ageGroup: emp.ageGroup,
          zakatMonthly: 0,
          cp38Amount: 0,
          isHrdfEligible: emp.nationality !== 'foreign',
          companyHeadcount: employees.length,
          accumulatedMtd: 0,
          accumulatedEpf: 0,
          remainingMonths: 3,
        }),
      ),
    [employees],
  );

  const now = new Date();
  const daysLeft = getDaysUntilDeadline(now.getFullYear(), now.getMonth() + 1);
  const complianceStatus = getComplianceStatus(daysLeft);

  const totalGross = employees.reduce((sum, e) => sum + e.salary, 0);
  const totalNetPay = employeeBreakdowns.reduce((sum, b) => sum + b.netPay, 0);
  const totalEpfEmployee = employeeBreakdowns.reduce((sum, b) => sum + b.epfEmployee, 0);
  const totalEpfEmployer = employeeBreakdowns.reduce((sum, b) => sum + b.epfEmployer, 0);
  const totalSocsoEmployee = employeeBreakdowns.reduce((sum, b) => sum + b.socsoEmployee, 0);
  const totalSocsoEmployer = employeeBreakdowns.reduce((sum, b) => sum + b.socsoEmployer, 0);
  const totalEisEmployee = employeeBreakdowns.reduce((sum, b) => sum + b.eisEmployee, 0);
  const totalEisEmployer = employeeBreakdowns.reduce((sum, b) => sum + b.eisEmployer, 0);
  const totalPcb = employeeBreakdowns.reduce((sum, b) => sum + b.pcbMtd, 0);
  const totalHrdf = employeeBreakdowns.reduce((sum, b) => sum + b.hrdf, 0);
  const totalWht = employeeBreakdowns.reduce((sum, b) => sum + b.wht, 0);
  const totalCostToCompany = employeeBreakdowns.reduce((sum, b) => sum + b.totalCostToCompany, 0);

  const filteredEmployees = searchQuery
    ? employees.filter((e) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.department.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : employees;

  // Latest payroll run (by payDate). Falls back to a default-period banner if
  // none exist yet.
  const latestRun = useMemo(() => {
    if (payrollRuns.length === 0) return null;
    return [...payrollRuns].sort((a, b) =>
      (b.payDate ?? '').localeCompare(a.payDate ?? ''),
    )[0];
  }, [payrollRuns]);

  // Approve & Run — creates a draft run for the current month and reloads.
  const handleApproveAndRun = async () => {
    setRunSubmitting(true);
    setRunError(null);
    try {
      const today = new Date();
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
      const payDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
      await payrollApi.createRun({
        payPeriodStart: periodStart,
        payPeriodEnd: periodEnd,
        payDate,
        currency: employees[0]?.currency ?? 'Stablecoin',
        totalGross,
        totalNet: Math.round(totalNetPay),
      });
      await reloadRuns();
    } catch (e: any) {
      setRunError(coerceError(e, 'Failed to create payroll run'));
    } finally {
      setRunSubmitting(false);
    }
  };

  // Send Payroll — fires one transactions.send per active employee.
  const handleSendPayroll = async () => {
    const actives = employees
      .map((e, i) => ({ emp: e, breakdown: employeeBreakdowns[i] }))
      .filter((x) => x.emp.status === 'Active');
    if (actives.length === 0) {
      setRunError('No active employees to pay.');
      return;
    }
    setSending(true);
    setRunError(null);
    setSendProgress({ done: 0, total: actives.length });
    setSendDone(false);
    try {
      for (let i = 0; i < actives.length; i++) {
        const { emp, breakdown } = actives[i];
        const net = Math.round(breakdown?.netPay ?? emp.salary);
        await transactionsApi.send({
          fromCurrency: emp.currency || 'Stablecoin',
          toCurrency: emp.currency || 'Stablecoin',
          fromAmount: net,
          toAmount: net,
          recipientAddress: `employee:${emp.id}`,
          memo: `Payroll for ${emp.name}`,
        });
        setSendProgress({ done: i + 1, total: actives.length });
      }
      setSendDone(true);
    } catch (e: any) {
      setRunError(coerceError(e, 'Send payroll failed midway. Re-run to continue from where it stopped.'));
    } finally {
      setSending(false);
    }
  };

  const error = empError ?? runsError ?? runError;
  const loading = empLoading || runsLoading;

  const tabs = [
    { id: 'roster', label: 'Employee Roster', icon: Users },
    { id: 'processing', label: 'Run Payroll', icon: DollarSign },
    { id: 'tax', label: 'Statutory Deductions', icon: TrendingUp },
    { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
    { id: 'settlement', label: 'Settlement', icon: Send },
  ];

  return (
    <PageContainer>
      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return <Tab key={tab.id} value={tab.id} label={tab.label} icon={<Icon className="w-4 h-4" />} />;
        })}
      </Tabs>

      <ErrorBanner message={error} onRetry={() => { reloadEmployees(); reloadRuns(); }} />

      {loading && employees.length === 0 && (
        <div className="rounded-xl" style={card}>
          <LoadingState label="Loading payroll data…" />
        </div>
      )}

      {/* Employee Roster Tab */}
      {activeTab === 'roster' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="flex gap-3 items-center">
            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={card}>
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder-slate-500"
              />
            </div>
            <button
              onClick={() => setShowAddEmployee(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-all"
              style={{ background: 'var(--lavender)', border: '2px solid var(--ink)' }}>
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Employees', value: employees.length, accent: 'text-slate-900' },
              { label: 'Active', value: employees.filter((e) => e.status === 'Active').length, accent: 'text-emerald-600' },
              { label: 'Malaysian / PR', value: employees.filter((e) => e.nationality !== 'foreign').length, accent: 'text-cyan-600' },
              { label: 'Foreign Workers', value: employees.filter((e) => e.nationality === 'foreign').length, accent: 'text-amber-600' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl p-4" style={card}>
                <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.accent}`}>{stat.value}</p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-xl overflow-x-auto" style={card}>
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross (Stablecoin)</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Nationality</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Tax Cat.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-emerald-700"
                          style={{ background: 'rgba(125, 211, 252, 0.12)' }}>
                          {emp.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <span className="font-medium text-slate-700">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">{emp.role}</td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">{emp.department}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono text-slate-700">{emp.salary.toLocaleString()}</td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.nationality === 'malaysian' ? 'bg-emerald-50 text-emerald-700'
                        : emp.nationality === 'pr' ? 'bg-cyan-50 text-cyan-700'
                        : 'bg-amber-50 text-amber-700'
                      }`}>
                        {emp.nationality === 'malaysian' ? 'Malaysian' : emp.nationality === 'pr' ? 'PR' : 'Foreign'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600">{emp.taxCategory}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      )}

      {/* Run Payroll Tab */}
      {activeTab === 'processing' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Gross Payroll', value: `Stablecoin ${totalGross.toLocaleString()}`, sub: `${employees.length} employees`, accent: 'text-slate-900' },
              { label: 'Total Net Pay', value: `Stablecoin ${Math.round(totalNetPay).toLocaleString()}`, sub: 'After all deductions', accent: 'text-emerald-600' },
              { label: 'Total Cost to Company', value: `Stablecoin ${Math.round(totalCostToCompany).toLocaleString()}`, sub: 'Incl. employer contributions', accent: 'text-slate-900' },
              { label: 'Settlement Fee', value: '$0.01', sub: '97% savings vs Wise', accent: 'text-emerald-600' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-5" style={card}>
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className={`text-xl font-bold mt-2 ${c.accent}`}>{c.value}</p>
                <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-xl p-6" style={{ ...card, border: '1px solid var(--border-default)' }}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {latestRun
                ? `${latestRun.status === 'draft' ? 'Pending' : 'Latest'} Payroll Run`
                : 'New Payroll Run'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-xs text-slate-500 font-medium">Pay Period</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {latestRun?.payPeriodStart && latestRun?.payPeriodEnd
                    ? `${latestRun.payPeriodStart} – ${latestRun.payPeriodEnd}`
                    : 'Current month'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Pay Date</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {latestRun?.payDate ?? 'Last day of month'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Statutory Due Date</p>
                <p className="text-lg font-bold text-amber-600 mt-1">
                  {daysLeft >= 0 ? `${daysLeft}d remaining` : `${Math.abs(daysLeft)}d overdue`}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleApproveAndRun}
                disabled={runSubmitting || employees.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'var(--lavender)', border: '2px solid var(--ink)' }}
              >
                {runSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {runSubmitting ? 'Creating run…' : 'Approve & Run Payroll'}
              </button>
              <button onClick={() => setShowPreview(true)} className="px-6 py-3 rounded-xl font-medium text-slate-600 transition-all hover:bg-slate-50" style={card}>
                Preview Payslips
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Statutory Deductions Tab */}
      {activeTab === 'tax' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          {/* Summary cards */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'EPF (Employee)', value: `Stablecoin ${totalEpfEmployee.toLocaleString()}`, sub: '11% of gross', accent: 'text-slate-900' },
              { label: 'EPF (Employer)', value: `Stablecoin ${totalEpfEmployer.toLocaleString()}`, sub: '12–13% of gross', accent: 'text-slate-900' },
              { label: 'SOCSO + EIS', value: `Stablecoin ${(totalSocsoEmployee + totalSocsoEmployer + totalEisEmployee + totalEisEmployer).toLocaleString()}`, sub: 'Combined employee + employer', accent: 'text-slate-900' },
              { label: 'PCB / MTD', value: `Stablecoin ${Math.round(totalPcb).toLocaleString()}`, sub: 'Income tax withheld', accent: 'text-amber-600' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-5" style={card}>
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className={`text-xl font-bold mt-2 ${c.accent}`}>{c.value}</p>
                <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </motion.div>

          {/* Per-employee statutory breakdown */}
          <motion.div variants={fadeUp} className="rounded-xl overflow-x-auto" style={card}>
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Per-Employee Deductions — March 2026</h3>
              <p className="text-xs text-slate-400 mt-0.5">All amounts in Stablecoin</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Employee</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">EPF (Emp)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">SOCSO</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">EIS</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">PCB/MTD</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">WHT</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp, i) => {
                    const b = employeeBreakdowns[i];
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-700 text-xs">{emp.name}</p>
                            <p className="text-slate-400 text-[11px]">{emp.nationality === 'foreign' ? 'Foreign' : emp.nationality === 'pr' ? 'PR' : 'Malaysian'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700 text-xs">{emp.salary.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500 text-xs">{b.epfEmployee.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500 text-xs">{b.socsoEmployee.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500 text-xs">{b.eisEmployee.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-amber-600 text-xs">{Math.round(b.pcbMtd).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {b.wht > 0
                            ? <span className="text-red-500">{Math.round(b.wht).toLocaleString()}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600 text-xs">{Math.round(b.netPay).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-sky-200" style={{ background: 'var(--primary-soft)' }}>
                    <td className="px-4 py-3 font-bold text-slate-900 text-xs">TOTALS</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 text-xs">{totalGross.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 text-xs">{totalEpfEmployee.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 text-xs">{totalSocsoEmployee.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 text-xs">{totalEisEmployee.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-600 text-xs">{Math.round(totalPcb).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-red-500 text-xs">{Math.round(totalWht).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 text-xs">{Math.round(totalNetPay).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>

          {/* Employer contributions */}
          <motion.div variants={fadeUp} className="rounded-xl p-5" style={card}>
            <h3 className="font-semibold text-slate-900 mb-4">Employer Statutory Contributions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'EPF (Employer)', value: totalEpfEmployer, color: 'text-slate-900' },
                { label: 'SOCSO (Employer)', value: totalSocsoEmployer, color: 'text-slate-900' },
                { label: 'EIS (Employer)', value: totalEisEmployer, color: 'text-slate-900' },
                { label: 'HRDF', value: totalHrdf, color: 'text-slate-900' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl p-4 bg-slate-50">
                  <p className="text-xs text-slate-500 font-medium">{item.label}</p>
                  <p className={`text-lg font-bold mt-1 font-mono ${item.color}`}>Stablecoin {item.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">Total Cost to Company</p>
              <p className="text-xl font-bold text-slate-900 font-mono">Stablecoin {Math.round(totalCostToCompany).toLocaleString()}</p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
          {/* Deadline countdown */}
          <motion.div variants={fadeUp} className="rounded-xl p-6" style={{ ...card, border: '1px solid var(--border-default)' }}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Statutory Payment Deadline</h3>
                <p className="text-sm text-slate-500 mt-1">EPF, SOCSO/EIS, PCB — all due 15th of the following month</p>
              </div>
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${complianceStatusStyle[complianceStatus].bg} ${complianceStatusStyle[complianceStatus].text}`}>
                <span className={`w-2 h-2 rounded-full ${complianceStatusStyle[complianceStatus].dot}`} />
                {daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due today' : `${daysLeft} days left`}
              </span>
            </div>
          </motion.div>

          {/* Statutory filing items */}
          <motion.div variants={fadeUp}>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Malaysia — March 2026 Contributions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: 'EPF (KWSP)', portal: 'i-Akaun / e-Caruman', employee: totalEpfEmployee, employer: totalEpfEmployer, due: '15 April 2026', status: 'Pending' },
                { name: 'SOCSO (PERKESO)', portal: 'PERKESO ASSIST', employee: totalSocsoEmployee, employer: totalSocsoEmployer, due: '15 April 2026', status: 'Pending' },
                { name: 'EIS (SIP)', portal: 'PERKESO ASSIST', employee: totalEisEmployee, employer: totalEisEmployer, due: '15 April 2026', status: 'Pending' },
                { name: 'PCB / MTD (LHDN)', portal: 'MyTax e-CP39', employee: Math.round(totalPcb), employer: 0, due: '15 April 2026', status: 'Pending' },
                { name: 'HRDF (HRD Corp)', portal: 'HRD Corp Portal', employee: 0, employer: totalHrdf, due: '15 April 2026', status: 'Pending' },
                ...(totalWht > 0 ? [{ name: 'WHT (Non-resident)', portal: 'LHDN', employee: Math.round(totalWht), employer: 0, due: '15 April 2026', status: 'Pending' }] : []),
              ].map((item) => (
                <div key={item.name} className="rounded-xl p-5" style={card}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">via {item.portal}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                      <Clock className="w-3 h-3" />
                      {item.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400">Employee</p>
                      <p className="font-mono font-semibold text-slate-700 mt-0.5">Stablecoin {item.employee.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Employer</p>
                      <p className="font-mono font-semibold text-slate-700 mt-0.5">Stablecoin {item.employer.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Due</p>
                      <p className="font-medium text-slate-700 mt-0.5">{item.due}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Settlement Tab */}
      {activeTab === 'settlement' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl p-6" style={{ ...card, border: '1px solid var(--border-default)' }}>
            <h3 className="text-lg font-bold text-slate-900 mb-6">Send Payroll via Settlement Protocol</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="rounded-xl p-4 bg-slate-50">
                <p className="text-xs text-slate-500 font-medium">Total Net Pay</p>
                <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">Stablecoin {Math.round(totalNetPay).toLocaleString()}</p>
              </div>
              <div className="rounded-xl p-4 bg-slate-50">
                <p className="text-xs text-slate-500 font-medium">Currency</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">Stablecoin</p>
              </div>
              <div className="rounded-xl p-4 bg-emerald-50">
                <p className="text-xs text-emerald-600 font-medium">Settlement Fee</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">$0.01 flat</p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {employees.filter((e) => e.status === 'Active').map((emp, i) => {
                const b = employeeBreakdowns[i];
                return (
                  <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-emerald-700"
                        style={{ background: 'rgba(125, 211, 252, 0.12)' }}>
                        {emp.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <span className="text-sm text-slate-600">{emp.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-mono">Gross: {emp.salary.toLocaleString()}</span>
                      <span className="text-sm font-mono font-semibold text-emerald-600">Net: {Math.round(b.netPay).toLocaleString()}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700">Stablecoin</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSendPayroll}
              disabled={sending || employees.filter((e) => e.status === 'Active').length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'var(--lavender)', border: '2px solid var(--ink)' }}
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {sending && sendProgress
                ? `Sending ${sendProgress.done}/${sendProgress.total}…`
                : sendDone
                  ? 'Payroll sent ✓'
                  : `Send Payroll — Stablecoin ${Math.round(totalNetPay).toLocaleString()}`}
            </button>
            {sendDone && (
              <p className="text-xs text-emerald-600 mt-3 text-center">All transfers dispatched. Each employee should see funds in their wallet shortly.</p>
            )}
          </motion.div>
        </motion.div>
      )}
      <AnimatePresence>
        {showAddEmployee && (
          <AddEmployeeModal
            onClose={() => setShowAddEmployee(false)}
            onAdded={() => { setShowAddEmployee(false); reloadEmployees(); }}
          />
        )}
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Payslip preview</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Per-employee gross → net breakdown for the current run</p>
                </div>
                <button onClick={() => setShowPreview(false)} className="p-2 rounded-lg hover:bg-slate-100">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 sticky top-0 bg-white">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Statutory</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Tax (PCB)</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees
                      .map((e, i) => ({ emp: e, breakdown: employeeBreakdowns[i] }))
                      .filter((x) => x.emp.status === 'Active')
                      .map(({ emp, breakdown: b }) => {
                        const statutory = (b?.epfEmployee ?? 0) + (b?.socsoEmployee ?? 0) + (b?.eisEmployee ?? 0);
                        const tax = b?.pcbMtd ?? 0;
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50">
                            <td className="px-6 py-3 font-medium text-slate-900">{emp.name} <span className="text-xs text-slate-400 ml-1">({emp.role})</span></td>
                            <td className="px-6 py-3 text-right font-mono text-slate-700">{Math.round(emp.salary).toLocaleString()}</td>
                            <td className="px-6 py-3 text-right font-mono text-amber-600">{Math.round(statutory).toLocaleString()}</td>
                            <td className="px-6 py-3 text-right font-mono text-red-600">{Math.round(tax).toLocaleString()}</td>
                            <td className="px-6 py-3 text-right font-mono font-semibold text-emerald-600">{Math.round(b?.netPay ?? emp.salary).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
                <button onClick={() => setShowPreview(false)} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}
