import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Phone, Building, MapPin, Calendar, ShieldCheck, CreditCard } from 'lucide-react';
import { card, fadeUp } from '../../lib/viewConstants';

export type EmployeeExtended = {
  id: string | number;
  name: string;
  role: string;
  department: string;
  location: string;
  email: string;
  phone: string;
  ic: string;
  status: 'active' | 'onboarding';
  startDate: string;
  salary: number;
  currency: string;
  type: string;
  // HR / statutory profile
  nationality: 'Malaysian' | 'PR' | 'Foreign';
  residentStatus: 'Resident' | 'Non-Resident';
  taxCategory: 'KA1' | 'KA2' | 'KA3' | 'N/A';
  ageGroup: 'below_60' | 'above_60';
  hrdfEligible: boolean;
  bank: string;
  bankAccount: string;
  epfNo: string;
  socsoNo: string;
  // monthly deductions
  epfEmployee: number;
  epfEmployer: number;
  socsoEmployee: number;
  socsoEmployer: number;
  eisEmployee: number;
  eisEmployer: number;
  pcbMtd: number;
  wht: number;
  hrdf: number;
  zakat: number;
  cp38: number;
};

const TAX_CATEGORY_LABELS: Record<string, string> = {
  KA1: 'KA1 — Single',
  KA2: 'KA2 — Married, spouse not working',
  KA3: 'KA3 — Married, working spouse',
  'N/A': 'N/A',
};

function epfEmployeeRate(emp: EmployeeExtended) {
  if (emp.nationality === 'Foreign') return '2%';
  if (emp.ageGroup === 'above_60') return '0%';
  return '11%';
}

function epfEmployerRate(emp: EmployeeExtended) {
  if (emp.nationality === 'Foreign') return '2%';
  if (emp.ageGroup === 'above_60') return '4%';
  return emp.salary <= 5000 ? '13%' : '12%';
}

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function EmployeeProfile({
  employee,
  onBack,
  gradient,
}: {
  employee: EmployeeExtended;
  onBack: () => void;
  gradient: string;
}) {
  const deductions =
    employee.epfEmployee +
    employee.socsoEmployee +
    employee.eisEmployee +
    (employee.pcbMtd || employee.wht) +
    employee.zakat +
    employee.cp38;

  const netPay = employee.salary - deductions;

  const initials = employee.name
    .split(' ')
    .map((n) => n[0])
    .join('');

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-5">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        People
      </button>

      {/* Header */}
      <div className="rounded-xl p-6" style={card}>
        <div className="flex items-start gap-5">
          <div
            className={`w-16 h-16 rounded-xl ${gradient} flex items-center justify-center flex-shrink-0 border border-[var(--ink)]`}
          >
            <span className="font-bold text-xl" style={{ color: 'var(--ink)' }}>{initials}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">{employee.name}</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  employee.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {employee.status}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                {employee.type}
              </span>
            </div>
            <p className="text-slate-500 mt-1">{employee.role}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <Building className="w-3.5 h-3.5" />
                {employee.department}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                {employee.location}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Since{' '}
                {new Date(employee.startDate).toLocaleDateString('en-MY', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                {employee.email}
              </span>
              <span className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
                {employee.phone}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column: employment details + payroll */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Employment details */}
        <div className="rounded-xl p-5" style={card}>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5" />
            Employment Details
          </p>
          <div className="space-y-3">
            {[
              ['IC / Passport No.', employee.ic],
              ['EPF No.', employee.epfNo],
              ['SOCSO No.', employee.socsoNo],
              ['Bank', employee.bank],
              ['Account', employee.bankAccount],
              ['HRDF', employee.hrdfEligible ? 'Eligible' : 'Not eligible'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{label}</span>
                <span
                  className={`font-medium ${
                    label === 'HRDF'
                      ? employee.hrdfEligible
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                      : 'text-slate-700'
                  }`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly payroll breakdown */}
        <div className="rounded-xl p-5" style={card}>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Monthly Payroll
          </p>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Gross salary</span>
              <span className="font-bold text-slate-900">
                Stablecoin {fmt(employee.salary)}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-2.5 space-y-2">
              {[
                ['EPF (employee)', employee.epfEmployee],
                ['SOCSO', employee.socsoEmployee],
                ['EIS', employee.eisEmployee],
                ...(employee.pcbMtd ? [['PCB / MTD', employee.pcbMtd] as [string, number]] : []),
                ...(employee.wht ? [['WHT (30%)', employee.wht] as [string, number]] : []),
                ...(employee.zakat ? [['Zakat', employee.zakat] as [string, number]] : []),
                ...(employee.cp38 ? [['CP38', employee.cp38] as [string, number]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-red-400 font-medium">− Stablecoin {fmt(value as number)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700">Net pay</span>
              <span className="text-base font-bold text-emerald-600">
                Stablecoin {fmt(netPay)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statutory & Tax profile */}
      <div className="rounded-xl overflow-hidden" style={card}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Statutory &amp; Tax Profile
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Income Tax */}
          <div className="px-6 py-5">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-4">
              Income Tax (PCB / MTD)
            </p>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-slate-400 mb-1">Resident Status</p>
                <p className="text-sm font-semibold text-slate-700">{employee.residentStatus}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Tax Category</p>
                <p className="text-sm font-semibold text-slate-700">
                  {TAX_CATEGORY_LABELS[employee.taxCategory]}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Monthly Deduction</p>
                <p className="text-sm font-bold text-slate-900">
                  {employee.wht
                    ? `Stablecoin ${fmt(employee.wht)} (WHT)`
                    : employee.pcbMtd
                    ? `Stablecoin ${fmt(employee.pcbMtd)}`
                    : 'Exempt'}
                </p>
              </div>
            </div>
          </div>

          {/* EPF */}
          <div className="px-6 py-5">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-4">
              EPF / KWSP
            </p>
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-slate-400 mb-1">Nationality</p>
                <p className="text-sm font-semibold text-slate-700">{employee.nationality}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Age Group</p>
                <p className="text-sm font-semibold text-slate-700">
                  {employee.ageGroup === 'below_60' ? 'Below 60' : '60 and above'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">
                  Employee ({epfEmployeeRate(employee)})
                </p>
                <p className="text-sm font-bold text-red-400">Stablecoin {fmt(employee.epfEmployee)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">
                  Employer ({epfEmployerRate(employee)})
                </p>
                <p className="text-sm font-bold text-slate-900">Stablecoin {fmt(employee.epfEmployer)}</p>
              </div>
            </div>
          </div>

          {/* SOCSO */}
          <div className="px-6 py-5">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-4">
              SOCSO / PERKESO —{' '}
              {employee.ageGroup === 'below_60'
                ? 'Category 1 (Below 60)'
                : 'Category 2 (60 and above)'}
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-400 mb-1">Employee (0.5%, capped RM 6,000)</p>
                <p className="text-sm font-bold text-red-400">Stablecoin {fmt(employee.socsoEmployee)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Employer (1.75%, capped RM 6,000)</p>
                <p className="text-sm font-bold text-slate-900">Stablecoin {fmt(employee.socsoEmployer)}</p>
              </div>
            </div>
          </div>

          {/* EIS */}
          <div className="px-6 py-5">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-4">
              EIS — Employment Insurance Scheme
            </p>
            {employee.nationality === 'Foreign' ? (
              <p className="text-sm text-slate-400 italic">Not applicable for foreign workers</p>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Employee (0.2%, capped RM 6,000)</p>
                  <p className="text-sm font-bold text-red-400">Stablecoin {fmt(employee.eisEmployee)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Employer (0.2%, capped RM 6,000)</p>
                  <p className="text-sm font-bold text-slate-900">Stablecoin {fmt(employee.eisEmployer)}</p>
                </div>
              </div>
            )}
          </div>

          {/* HRDF */}
          <div className="px-6 py-5">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-4">
              HRDF — Human Resource Development Fund
            </p>
            {employee.hrdfEligible ? (
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Eligibility</p>
                  <p className="text-sm font-semibold text-emerald-600">Eligible</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Rate (employer only)</p>
                  <p className="text-sm font-semibold text-slate-700">1%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Monthly amount</p>
                  <p className="text-sm font-bold text-slate-900">Stablecoin {fmt(employee.hrdf)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Not applicable</p>
            )}
          </div>

          {/* Zakat / CP38 if any */}
          {(employee.zakat > 0 || employee.cp38 > 0) && (
            <div className="px-6 py-5">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-4">
                Other Deductions
              </p>
              <div className="grid grid-cols-2 gap-6">
                {employee.zakat > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Zakat (monthly directive)</p>
                    <p className="text-sm font-bold text-red-400">Stablecoin {fmt(employee.zakat)}</p>
                  </div>
                )}
                {employee.cp38 > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">CP38 (LHDN arrears directive)</p>
                    <p className="text-sm font-bold text-red-400">Stablecoin {fmt(employee.cp38)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
