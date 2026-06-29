import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Download, FileText, TrendingUp, CheckCircle, ShieldCheck } from 'lucide-react';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, Tab, Tabs, ErrorBanner, LoadingState } from '../ui';
import { employees as employeesApi, payroll as payrollApi } from '../../lib/api';
import { useApiList, useApiResource } from '../../hooks/useApi';

type ServerEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  taxCategory: string | null;
  nationality: string | null;
  currency: string;
  salary: number;
};

type ServerPayslip = {
  id: string;
  payrollRunId: string;
  employeeId: string;
  grossPay: number;
  epf: number | null;
  socso: number | null;
  eis: number | null;
  pcb: number | null;
  netPay: number;
  status: string;
  createdAt: string;
};

export default function MyPayView() {
  const [activeTab, setActiveTab] = useState('stubs');

  const tabs = [
    { id: 'stubs',     label: 'Pay Stubs',      icon: DollarSign },
    { id: 'documents', label: 'Tax Documents',   icon: FileText },
    { id: 'summary',   label: 'Year Summary',    icon: TrendingUp },
  ];

  const { data: emp, loading: empLoading, error: empError } = useApiResource<ServerEmployee>(
    () => employeesApi.me(),
    [],
    'No employee record matches your user',
  );

  const { data: rawSlips, loading: slipsLoading, error: slipsError } = useApiList<ServerPayslip>(
    () => emp ? payrollApi.payslips(emp.id) : Promise.resolve([]),
    [emp?.id],
    'Failed to load payslips',
  );

  const error = empError ?? slipsError;
  const loading = empLoading || slipsLoading;

  // Map server payslips → view shape sorted newest first.
  const payStubs = useMemo(
    () =>
      [...rawSlips]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((s) => {
          const date = new Date(s.createdAt);
          const period = `${date.toLocaleString('en', { month: 'long' })} ${date.getFullYear()}`;
          return {
            id: s.id,
            period,
            grossPay: s.grossPay,
            epf: s.epf ?? 0,
            socso: s.socso ?? 0,
            eis: s.eis ?? 0,
            pcb: s.pcb ?? 0,
            netPay: s.netPay,
            status: s.status === 'paid' ? 'paid' : 'pending',
            paidDate: s.createdAt.slice(0, 10),
          };
        }),
    [rawSlips],
  );

  const NET_PAY = payStubs[0]?.netPay ?? 0;
  const DEDUCTIONS = {
    epf: payStubs[0]?.epf ?? 0,
    socso: payStubs[0]?.socso ?? 0,
    eis: payStubs[0]?.eis ?? 0,
    pcb: payStubs[0]?.pcb ?? 0,
  };

  const EMPLOYEE = {
    name: emp ? `${emp.firstName} ${emp.lastName}` : 'Loading…',
    id: emp?.id ?? '—',
    role: emp?.position ?? '',
    department: emp?.department ?? '',
    epfNumber: '—',
    taxNumber: '—',
    taxCategory: emp?.taxCategory ?? 'KA1',
    nationality: emp?.nationality ?? 'Malaysian',
    bankAccount: '—',
    currency: emp?.currency ?? 'Stablecoin',
    grossSalary: emp?.salary ?? 0,
  };

  const initials = emp
    ? `${emp.firstName[0] ?? ''}${emp.lastName[0] ?? ''}`.toUpperCase()
    : '—';

  const downloadCsv = (filename: string, header: string[], rows: (string | number)[][]) => {
    const escape = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const downloadPayslip = (s: typeof payStubs[number]) => {
    downloadCsv(
      `payslip-${EMPLOYEE.name.replace(/\s+/g, '-')}-${s.period.replace(/\s+/g, '-')}.csv`,
      ['field', 'value'],
      [
        ['Employee', EMPLOYEE.name],
        ['Employee ID', EMPLOYEE.id],
        ['Period', s.period],
        ['Pay date', s.paidDate],
        ['Gross pay', s.grossPay],
        ['EPF (employee)', s.epf],
        ['SOCSO', s.socso],
        ['EIS', s.eis],
        ['PCB / MTD', s.pcb],
        ['Net pay', s.netPay],
        ['Status', s.status],
      ],
    );
  };

  const downloadEAForm = () => {
    if (paidStubs.length === 0) {
      alert('No paid payslips yet to compile an EA form.');
      return;
    }
    const year = paidStubs[0]?.paidDate?.slice(0, 4) ?? new Date().getFullYear();
    downloadCsv(
      `EA-form-${EMPLOYEE.name.replace(/\s+/g, '-')}-${year}.csv`,
      ['period', 'gross', 'epf_employee', 'socso', 'eis', 'pcb_mtd', 'net_pay'],
      paidStubs.map((s) => [s.period, s.grossPay, s.epf, s.socso, s.eis, s.pcb, s.netPay])
        .concat([['YTD TOTALS', ytdGross, ytdEpf, paidStubs.reduce((sum, p) => sum + p.socso, 0), paidStubs.reduce((sum, p) => sum + p.eis, 0), ytdPcb, paidStubs.reduce((sum, p) => sum + p.netPay, 0)]]),
    );
  };

  const downloadTaxDoc = (doc: typeof taxDocuments[number]) => {
    downloadCsv(
      `${doc.name.replace(/\s+/g, '-')}.csv`,
      ['document', 'type', 'issued', 'description', 'employee', 'employee_id'],
      [[doc.name, doc.type, doc.issued, doc.desc, EMPLOYEE.name, EMPLOYEE.id]],
    );
  };

  const taxDocuments = [
    { name: 'EA Form (CP8A) — 2025',       type: 'Annual Tax Statement',    issued: '28 Feb 2026', desc: 'Annual income statement for LHDN e-Filing (MyTax)' },
    { name: 'PCB/MTD Summary — 2025',      type: 'Monthly Tax Deduction',   issued: '28 Feb 2026', desc: 'Year-to-date PCB withheld and remitted to LHDN' },
    { name: 'EPF Member Statement — 2025', type: 'Statutory Contribution',  issued: '15 Jan 2026', desc: 'Annual EPF contribution statement from KWSP' },
    { name: 'SOCSO/EIS Summary — 2025',    type: 'Statutory Contribution',  issued: '15 Jan 2026', desc: 'SOCSO and EIS contributions via PERKESO ASSIST' },
  ];

  const paidStubs = payStubs.filter((s) => s.status === 'paid');
  const ytdGross = paidStubs.reduce((s, p) => s + p.grossPay, 0);
  const ytdEpf   = paidStubs.reduce((s, p) => s + p.epf, 0);
  const ytdPcb   = paidStubs.reduce((s, p) => s + p.pcb, 0);
  const ytdNet   = paidStubs.reduce((s, p) => s + p.netPay, 0);

  return (
    <PageContainer>
      {/* Employee identity strip */}
      <div className="flex items-center gap-4 px-5 py-4 rounded-xl" style={{ background: 'var(--bg-accent-soft)', border: '1px solid var(--border-default)' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-emerald-700 font-bold text-lg shrink-0" style={{ background: 'rgba(125, 211, 252, 0.15)' }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900">{EMPLOYEE.name}</p>
          <p className="text-xs text-slate-500">{EMPLOYEE.role} &middot; {EMPLOYEE.department} &middot; {EMPLOYEE.id}</p>
        </div>
        <div className="hidden sm:grid grid-cols-2 gap-x-8 gap-y-0.5 text-xs text-slate-500">
          <span>EPF No: <span className="text-slate-700 font-mono">{EMPLOYEE.epfNumber}</span></span>
          <span>Tax File: <span className="text-slate-700 font-mono">{EMPLOYEE.taxNumber}</span></span>
          <span>PCB Category: <span className="text-slate-700 font-semibold">{EMPLOYEE.taxCategory} — Single</span></span>
          <span>Bank: <span className="text-slate-700">{EMPLOYEE.bankAccount}</span></span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return <Tab key={tab.id} value={tab.id} label={tab.label} icon={<Icon className="w-4 h-4" />} />;
        })}
      </Tabs>

      <ErrorBanner message={error} />

      {loading && payStubs.length === 0 && (
        <div className="rounded-xl" style={card}>
          <LoadingState label="Loading payslips…" />
        </div>
      )}

      {/* Pay Stubs */}
      {activeTab === 'stubs' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
            {[
              { label: 'Last Net Pay',   value: `Stablecoin ${NET_PAY.toLocaleString()}`, sub: 'February 2026',               accent: 'text-slate-900' },
              { label: 'Pay Frequency', value: 'Monthly',                           sub: 'Paid on 28th of each month',  accent: 'text-cyan-400' },
              { label: 'Next Payday',   value: '28 Mar 2026',                       sub: 'Stablecoin via Settlement Protocol',       accent: 'text-emerald-400' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-5" style={card}>
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className={`text-xl font-bold mt-2 ${c.accent}`}>{c.value}</p>
                <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Period</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">EPF</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">SOCSO</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">EIS</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">PCB/MTD</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Pay</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payStubs.map((stub) => (
                  <tr key={stub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-700">{stub.period}</p>
                      <p className="text-xs text-slate-400">Paid {stub.paidDate}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-900 text-xs">{stub.grossPay.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-red-400 text-xs">-{stub.epf}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-amber-400 text-xs">-{stub.socso}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-amber-400 text-xs">-{stub.eis}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-purple-400 text-xs">-{stub.pcb}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400 text-xs">{stub.netPay.toLocaleString()}</td>
                    <td className="px-4 py-3.5">
                      {stub.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          <CheckCircle className="w-3 h-3" />Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => downloadPayslip(stub)} className="flex items-center gap-1 text-emerald-400 hover:text-sky-300 text-xs font-medium">
                        <Download className="w-3 h-3" />CSV
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      )}

      {/* Tax Documents */}
      {activeTab === 'documents' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {taxDocuments.map((doc, i) => (
              <div key={i} className="rounded-xl p-5 hover:bg-slate-50 transition-colors" style={card}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{doc.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{doc.type}</p>
                      <p className="text-xs text-slate-400 mt-1">{doc.desc}</p>
                      <p className="text-xs text-slate-400 mt-1">Issued: {doc.issued}</p>
                    </div>
                  </div>
                  <button onClick={() => doc.name.startsWith('EA Form') ? downloadEAForm() : downloadTaxDoc(doc)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors shrink-0">
                    <Download className="w-3.5 h-3.5" />Download
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
          <motion.div variants={fadeUp} className="rounded-xl p-4" style={{ background: 'rgba(125, 211, 252, 0.04)', border: '1px solid var(--border-default)', borderRadius: '16px' }}>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              EA Form (CP8A) is your annual employment income statement — use it for your LHDN income tax return (e-BE/e-M) via MyTax portal. Deadline: 30 April each year.
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Year Summary */}
      {activeTab === 'summary' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'YTD Gross',          value: `Stablecoin ${ytdGross.toLocaleString()}`, accent: 'text-slate-900' },
              { label: 'YTD EPF (Employee)', value: `Stablecoin ${ytdEpf.toLocaleString()}`,   accent: 'text-red-400' },
              { label: 'YTD PCB/MTD',        value: `Stablecoin ${ytdPcb.toLocaleString()}`,   accent: 'text-purple-400' },
              { label: 'YTD Net Pay',        value: `Stablecoin ${ytdNet.toLocaleString()}`,   accent: 'text-emerald-400' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-5" style={card}>
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className={`text-xl font-bold mt-2 ${c.accent}`}>{c.value}</p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-xl p-6" style={card}>
            <h3 className="font-semibold text-slate-900 mb-5">Monthly Pay Breakdown — Stablecoin {EMPLOYEE.grossSalary.toLocaleString()} Gross</h3>
            <div className="space-y-3">
              {[
                { label: 'Gross Salary',          value: `Stablecoin ${EMPLOYEE.grossSalary.toLocaleString()}`, color: 'bg-emerald-500', note: 'Base salary' },
                { label: 'EPF Employee (11%)',     value: `-Stablecoin ${DEDUCTIONS.epf}`,                      color: 'bg-red-400',     note: 'Retirement — KWSP' },
                { label: 'SOCSO Cat 1 (0.5%)',    value: `-Stablecoin ${DEDUCTIONS.socso}`,                     color: 'bg-amber-400',   note: 'Social security — PERKESO' },
                { label: 'EIS (0.2%)',             value: `-Stablecoin ${DEDUCTIONS.eis}`,                       color: 'bg-amber-300',   note: 'Employment insurance — PERKESO' },
                { label: 'PCB / MTD',             value: `-Stablecoin ${DEDUCTIONS.pcb}`,                       color: 'bg-purple-400',  note: 'Income tax withheld — LHDN' },
                { label: 'Net Take-Home Pay',     value: `Stablecoin ${NET_PAY.toLocaleString()}`,              color: 'bg-emerald-400', note: 'Paid via Stablecoin stablecoin' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.color}`} />
                  <span className="text-sm text-slate-600 flex-1">{item.label}</span>
                  <span className="text-xs text-slate-400 hidden md:block w-44 text-right">{item.note}</span>
                  <span className="text-sm font-mono font-semibold text-slate-900 w-28 text-right">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-xl p-5" style={{ ...card, border: '1px solid var(--border-default)' }}>
            <h3 className="font-semibold text-slate-900 mb-4">Employer Statutory Contributions (on top of your gross)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(() => {
                const gross = payStubs[0]?.grossPay ?? emp?.salary ?? 0;
                const fmt = (n: number) => `Stablecoin ${Math.round(n).toLocaleString()}`;
                return [
                  { label: 'EPF Employer (13%)', value: fmt(gross * 0.13) },
                  { label: 'SOCSO Employer (1.75%)', value: fmt(gross * 0.0175) },
                  { label: 'EIS Employer (0.2%)', value: fmt(gross * 0.002) },
                  { label: 'HRDF (1%)', value: fmt(gross * 0.01) },
                ];
              })().map((item) => (
                <div key={item.label} className="rounded-xl p-3 bg-slate-50">
                  <p className="text-[10px] text-slate-500 font-medium">{item.label}</p>
                  <p className="text-sm font-bold font-mono text-emerald-600 mt-1">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-3">These are paid by your employer — not deducted from your salary. Your EPF account receives both your 11% and the employer's 13% contribution each month.</p>
          </motion.div>
        </motion.div>
      )}
    </PageContainer>
  );
}
