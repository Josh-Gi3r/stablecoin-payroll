import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Search, MapPin, Building, Mail, CheckCircle, Plus } from 'lucide-react';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import EmployeeProfile, { type EmployeeExtended } from './EmployeeProfile';
import AddEmployeeModal from './AddEmployeeModal';
import { PageContainer, Tab, Tabs, ErrorBanner, LoadingState, EmptyState } from '../ui';
import { employees as employeesApi } from '../../lib/api';
import { useApiList } from '../../hooks/useApi';
import { calculateStatutoryDeductions } from '../../lib/statutoryDeductions';

type ServerEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  position: string;
  department: string;
  employmentType: 'full-time' | 'part-time' | 'contractor';
  hireDate: string;
  status: 'active' | 'inactive' | 'terminated';
  salary: number;
  currency: string;
  nationality: 'malaysian' | 'pr' | 'foreign' | null;
  residentStatus: 'resident' | 'non_resident' | null;
  taxCategory: 'KA1' | 'KA2' | 'KA3' | null;
  ageGroup: 'below_60' | 'above_60' | null;
  hrdfEligible: boolean | null;
  bankAccountType: string | null;
};

function adaptToExtended(e: ServerEmployee, headcount: number): EmployeeExtended {
  const breakdown = calculateStatutoryDeductions({
    grossSalary: e.salary,
    nationality: (e.nationality ?? 'malaysian'),
    residentStatus: (e.residentStatus ?? 'resident'),
    taxCategory: (e.taxCategory ?? 'KA1'),
    ageGroup: (e.ageGroup ?? 'below_60'),
    zakatMonthly: 0,
    cp38Amount: 0,
    isHrdfEligible: e.hrdfEligible !== false && e.nationality !== 'foreign',
    companyHeadcount: headcount,
    accumulatedMtd: 0,
    accumulatedEpf: 0,
    remainingMonths: 3,
  });
  const nationalityLabel: 'Malaysian' | 'PR' | 'Foreign' =
    e.nationality === 'pr' ? 'PR' : e.nationality === 'foreign' ? 'Foreign' : 'Malaysian';
  const typeLabel =
    e.employmentType === 'full-time' ? 'Full-time'
      : e.employmentType === 'part-time' ? 'Part-time' : 'Contractor';
  return {
    id: e.id,
    name: `${e.firstName} ${e.lastName}`.trim(),
    role: e.position,
    department: e.department,
    location: '—',
    email: e.email,
    phone: e.phone ?? '—',
    ic: '—',
    status: e.status === 'active' ? 'active' : 'onboarding',
    startDate: e.hireDate,
    salary: e.salary,
    currency: e.currency || 'Stablecoin',
    type: typeLabel,
    nationality: nationalityLabel,
    residentStatus: e.residentStatus === 'non_resident' ? 'Non-Resident' : 'Resident',
    taxCategory: (e.taxCategory ?? 'KA1') as EmployeeExtended['taxCategory'],
    ageGroup: (e.ageGroup ?? 'below_60'),
    hrdfEligible: e.hrdfEligible !== false,
    bank: '—',
    bankAccount: '—',
    epfNo: '—',
    socsoNo: '—',
    epfEmployee: breakdown.epfEmployee,
    epfEmployer: breakdown.epfEmployer,
    socsoEmployee: breakdown.socsoEmployee,
    socsoEmployer: breakdown.socsoEmployer,
    eisEmployee: breakdown.eisEmployee,
    eisEmployer: breakdown.eisEmployer,
    pcbMtd: breakdown.pcbMtd,
    wht: breakdown.wht,
    hrdf: breakdown.hrdf,
    zakat: 0,
    cp38: 0,
  };
}


const departments = ['All', 'Engineering', 'Design', 'Finance', 'People Ops', 'Marketing'];

// Per the PayrollPlatform brand spec: no gradients on the platform side. These
// are the avatar/header solid-tint fallbacks, drawn from the platform pastel
// ramp so cards rotate through brand colours without leaving the palette.
const gradients = [
  'bg-[var(--lavender-soft)]',
  'bg-[var(--sky-soft)]',
  'bg-[var(--lavender)]',
  'bg-[var(--sky)]',
  'bg-[var(--cream)]',
  'bg-[var(--lavender-soft)]',
  'bg-[var(--sky-soft)]',
  'bg-[var(--lavender)]',
];

export default function PeopleView() {
  const [activeTab, setActiveTab] = useState('directory');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeExtended | null>(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  const { data: rawEmployees, loading, error, reload } = useApiList<ServerEmployee>(
    () => employeesApi.list(),
    [],
    'Failed to load employees',
  );

  const employees = useMemo(
    () => rawEmployees.map((e) => adaptToExtended(e, rawEmployees.length)),
    [rawEmployees],
  );

  const tabs = [
    { id: 'directory', label: 'Directory', icon: Users },
    { id: 'org', label: 'Org Chart', icon: Building },
    { id: 'onboarding', label: 'Onboarding', icon: UserPlus },
  ];

  const filtered = employees.filter((e) => {
    const matchSearch =
      search === '' ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'All' || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  const deptCounts = departments.reduce(
    (acc, d) => {
      acc[d] = d === 'All' ? employees.length : employees.filter((e) => e.department === d).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Profile view
  if (selectedEmployee) {
    const idx = employees.findIndex((e) => e.id === selectedEmployee.id);
    return (
      <EmployeeProfile
        employee={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
        gradient={gradients[idx % gradients.length]}
      />
    );
  }

  return (
    <PageContainer>
      <Tabs value={activeTab} onChange={setActiveTab}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return <Tab key={tab.id} value={tab.id} label={tab.label} icon={<Icon className="w-4 h-4" />} />;
        })}
      </Tabs>

      <ErrorBanner message={error} onRetry={reload} />

      {loading && employees.length === 0 && (
        <div className="rounded-xl" style={card}>
          <LoadingState label="Loading workforce…" />
        </div>
      )}

      {!loading && employees.length === 0 && (
        <div className="rounded-xl" style={card}>
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No employees yet"
            description="Add your first employee to start running payroll."
            action={{ label: 'Add Employee', onClick: () => setShowAddEmployee(true) }}
          />
        </div>
      )}

      {activeTab === 'directory' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">People</h2>
            <button
              onClick={() => setShowAddEmployee(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
              style={{ background: 'var(--lavender)', border: '2px solid var(--ink)' }}
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          </motion.div>
          <motion.div variants={fadeUp} className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Employees', value: `${employees.length}`, accent: 'text-slate-900' },
              { label: 'Full-time', value: `${employees.filter((e) => e.type === 'Full-time').length}`, accent: 'text-emerald-400' },
              { label: 'Contractors', value: `${employees.filter((e) => e.type === 'Contractor').length}`, accent: 'text-cyan-400' },
              { label: 'Onboarding', value: `${employees.filter((e) => e.status === 'onboarding').length}`, accent: 'text-amber-400' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-5" style={card}>
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className={`text-2xl font-bold mt-2 ${c.accent}`}>{c.value}</p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or role..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500 placeholder-slate-400"
              />
            </div>
            <div className="flex gap-2">
              {departments.map((d) => (
                <button
                  key={d}
                  onClick={() => setDeptFilter(d)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    deptFilter === d
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-50 text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {d} <span className="text-slate-400 ml-1">{deptCounts[d]}</span>
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((emp, i) => (
              <button
                key={emp.id}
                onClick={() => setSelectedEmployee(emp)}
                className="rounded-xl p-5 hover:bg-slate-50 transition-colors text-left w-full"
                style={card}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${gradients[employees.indexOf(emp) % gradients.length]} flex items-center justify-center flex-shrink-0 border border-[var(--border-default)]`}
                  >
                    <span className="text-white font-bold text-sm">
                      {emp.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">{emp.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          emp.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {emp.status}
                      </span>
                      {emp.type === 'Contractor' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700">
                          Contractor
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">{emp.role}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {emp.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {emp.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {emp.email}
                      </span>
                      <span className="text-cyan-400 font-mono">
                        Stablecoin {emp.salary.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'org' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl p-6 overflow-x-auto" style={card}>
            <h3 className="text-lg font-bold text-slate-900 mb-6">Organization Structure</h3>
            <div className="flex flex-col items-center min-w-[640px] mx-auto">
              <div
                className="rounded-xl p-4 mb-2"
                style={{ background: 'var(--primary-soft)', border: '1px solid var(--border-default)', borderRadius: '12px' }}
              >
                <p className="font-semibold text-slate-900 text-center">CEO</p>
                <p className="text-xs text-emerald-400 text-center">Executive</p>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div className="flex gap-4 flex-wrap justify-center">
                {['Engineering', 'Design', 'Finance', 'People Ops', 'Marketing'].map((dept) => {
                  const count = employees.filter((e) => e.department === dept).length;
                  const head = employees.find(
                    (e) =>
                      e.department === dept &&
                      (e.role.includes('Manager') || e.role.includes('Lead')),
                  );
                  return (
                    <div key={dept} className="flex flex-col items-center">
                      <div className="w-px h-6 bg-slate-200" />
                      <div
                        className="rounded-xl p-4 min-w-[160px]"
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                        }}
                      >
                        <p className="font-semibold text-slate-900 text-center text-sm">{dept}</p>
                        {head && (
                          <p className="text-xs text-cyan-400 text-center mt-1">{head.name}</p>
                        )}
                        <p className="text-[10px] text-slate-500 text-center mt-0.5">
                          {count} member{count > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'onboarding' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Onboarding Pipeline</h3>
          </motion.div>
          {employees
            .filter((e) => e.status === 'onboarding')
            .map((emp, i) => (
              <motion.div key={emp.id} variants={fadeUp} className="rounded-xl p-5" style={card}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${gradients[i]} flex items-center justify-center border border-[var(--border-default)]`}
                    >
                      <span className="text-white font-bold text-xs">
                        {emp.name.split(' ').map((n) => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{emp.name}</p>
                      <p className="text-xs text-slate-500">
                        {emp.role} &middot; Starting {emp.startDate}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                    In Progress
                  </span>
                </div>
                <div className="space-y-2">
                  {(() => {
                    const daysSinceHire = emp.startDate
                      ? Math.max(0, Math.floor((Date.now() - new Date(emp.startDate).getTime()) / (86400 * 1000)))
                      : 0;
                    return [
                      { step: 'Offer letter signed',   done: daysSinceHire >= 0 },
                      { step: 'Background check',      done: daysSinceHire >= 3 },
                      { step: 'Equipment ordered',     done: daysSinceHire >= 7 },
                      { step: 'Accounts provisioned',  done: daysSinceHire >= 14 },
                      { step: 'Payroll setup',         done: daysSinceHire >= 21 },
                      { step: 'First day orientation', done: daysSinceHire >= 30 },
                    ];
                  })().map((step, j) => (
                    <div key={j} className="flex items-center gap-3">
                      {step.done ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0" />
                      )}
                      <span
                        className={`text-sm ${step.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                      >
                        {step.step}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          {employees.filter((e) => e.status === 'onboarding').length === 0 && (
            <motion.div variants={fadeUp} className="rounded-xl p-8 text-center" style={card}>
              <UserPlus className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-400">No employees currently onboarding</p>
              <button onClick={() => setShowAddEmployee(true)} className="mt-4 px-4 py-2.5 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium text-sm">
                Start New Onboarding
              </button>
            </motion.div>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {showAddEmployee && (
          <AddEmployeeModal
            onClose={() => setShowAddEmployee(false)}
            onAdded={() => { setShowAddEmployee(false); reload(); }}
          />
        )}
      </AnimatePresence>
    </PageContainer>
  );
}
