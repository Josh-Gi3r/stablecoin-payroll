import { useState } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Upload, Plus, CheckCircle, Clock, AlertCircle, DollarSign, Camera, Loader2 } from 'lucide-react';
import { PageContainer, Tab, Tabs } from '../ui';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { employees as employeesApi, expenses as expensesApi } from '../../lib/api';
import { useApiList, useApiResource, coerceError } from '../../hooks/useApi';

type ServerExpense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';
};

// Map server status → view label/style. Note: server uses 'submitted'
// for in-flight; UI treats it as 'pending'.
const statusConfig: Record<string, { style: string; icon: typeof CheckCircle; label: string }> = {
  draft:      { style: 'bg-slate-100 text-slate-600',    icon: Clock,        label: 'Draft' },
  submitted:  { style: 'bg-amber-50 text-amber-700',     icon: Clock,        label: 'Pending' },
  approved:   { style: 'bg-cyan-50 text-cyan-700',       icon: CheckCircle,  label: 'Approved' },
  reimbursed: { style: 'bg-emerald-50 text-emerald-700', icon: DollarSign,   label: 'Reimbursed' },
  rejected:   { style: 'bg-red-50 text-red-700',         icon: AlertCircle,  label: 'Rejected' },
};

const categories = ['Meals', 'Transport', 'Travel', 'Software', 'Supplies', 'Events', 'Equipment', 'Other'];

export default function MyExpensesView() {
  const [activeTab, setActiveTab] = useState('expenses');
  const [submitForm, setSubmitForm] = useState({ description: '', category: 'Meals', amount: '', date: new Date().toISOString().slice(0, 10) });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: emp } = useApiResource<{ id: string }>(
    () => employeesApi.me(),
    [],
    'No employee record matches your user',
  );

  const { data: myExpenses, loading, error: loadError, reload } = useApiList<ServerExpense>(
    () => emp ? expensesApi.list({ employeeId: emp.id }) : Promise.resolve([]),
    [emp?.id],
    'Failed to load expenses',
  );

  const error = loadError ?? submitError;

  const tabs = [
    { id: 'expenses', label: 'My Expenses', icon: Receipt },
    { id: 'submit', label: 'Submit Claim', icon: Plus },
  ];

  const pending = myExpenses.filter((e) => e.status === 'submitted');
  const pendingTotal = pending.reduce((s, e) => s + e.amount, 0);
  const reimbursed = myExpenses.filter((e) => e.status === 'reimbursed');
  const reimbursedTotal = reimbursed.reduce((s, e) => s + e.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emp) {
      setSubmitError('No employee record matches your user');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await expensesApi.create({
        employeeId: emp.id,
        description: submitForm.description,
        category: submitForm.category,
        amount: Number(submitForm.amount) || 0,
        currency: 'USDC',
        date: submitForm.date,
        status: 'submitted',
      });
      setSubmitForm({ description: '', category: 'Meals', amount: '', date: new Date().toISOString().slice(0, 10) });
      setActiveTab('expenses');
      await reload();
    } catch (e: any) {
      setSubmitError(coerceError(e, 'Failed to submit claim'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <Tabs value={activeTab} onChange={setActiveTab}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return <Tab key={tab.id} value={tab.id} label={tab.label} icon={<Icon className="w-4 h-4" />} />;
        })}
      </Tabs>

      {error && (
        <div
          className="rounded-xl px-3 py-2 flex items-center gap-2 text-sm"
          style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid var(--error)', color: 'var(--danger)' }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {activeTab === 'expenses' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
            {[
              { label: 'Pending Claims', value: `$${pendingTotal.toFixed(2)}`, sub: `${pending.length} expenses awaiting approval`, accent: 'text-amber-400' },
              { label: 'Reimbursed (YTD)', value: `$${reimbursedTotal.toFixed(2)}`, sub: `${reimbursed.length} expenses paid out`, accent: 'text-emerald-400' },
              { label: 'Total Submitted', value: `$${myExpenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}`, sub: `${myExpenses.length} total expenses`, accent: 'text-slate-900' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-5" style={card}>
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className={`text-2xl font-bold mt-2 ${c.accent}`}>{c.value}</p>
                <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Receipt</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && myExpenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm">
                      <span className="inline-flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading expenses…
                      </span>
                    </td>
                  </tr>
                )}
                {!loading && myExpenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No expense claims yet. Submit one in the next tab.
                    </td>
                  </tr>
                )}
                {myExpenses.map((exp) => {
                  const config = statusConfig[exp.status] ?? statusConfig.submitted;
                  const StatusIcon = config.icon;
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 text-slate-400 text-xs">{exp.date}</td>
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-slate-700">{exp.description}</p>
                        <p className="text-xs text-slate-500">{exp.id}</p>
                      </td>
                      <td className="px-6 py-3.5"><span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">{exp.category}</span></td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-900">{exp.amount.toFixed(2)} {exp.currency}</td>
                      <td className="px-6 py-3.5"><CheckCircle className="w-4 h-4 text-emerald-400" /></td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.style}`}>
                          <StatusIcon className="w-3 h-3" />{config.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'submit' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.form variants={fadeUp} onSubmit={handleSubmit} className="max-w-2xl">
            <div className="rounded-xl p-6" style={card}>
              <h3 className="text-lg font-bold text-slate-900 mb-5">Submit Expense Claim</h3>
              <div className="space-y-4">
                {/* Receipt upload — capture only; backend wiring is a follow-up */}
                <div>
                  <label className="text-xs font-medium text-slate-400">Receipt / Proof</label>
                  <div className="mt-1.5 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center hover:border-emerald-500 transition-colors cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                      <Camera className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="text-sm text-slate-600">Drag &amp; drop receipt or click to upload</p>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG, PDF up to 10MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-400">Category</label>
                    <select
                      value={submitForm.category}
                      onChange={(e) => setSubmitForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                    >
                      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={submitForm.amount}
                      onChange={(e) => setSubmitForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:border-sky-500 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400">Date of Expense</label>
                  <input
                    type="date"
                    required
                    value={submitForm.date}
                    onChange={(e) => setSubmitForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400">Description</label>
                  <input
                    type="text"
                    required
                    value={submitForm.description}
                    onChange={(e) => setSubmitForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. Client dinner at Restaurant Name"
                    className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500 placeholder-slate-400"
                  />
                </div>

                <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200">
                  <p className="text-xs text-slate-500">Reimbursement will be settled via Settlement Protocol to your registered wallet.</p>
                  <p className="text-xs text-emerald-400 font-medium mt-1">Settlement fee: $0.01 flat</p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium  transition-all disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {submitting ? 'Submitting…' : 'Submit Expense Claim'}
                </button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </PageContainer>
  );
}
