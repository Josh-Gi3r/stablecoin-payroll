import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Upload, Send, CheckCircle, Clock, AlertCircle, Loader2, X } from 'lucide-react';
import { PageContainer, Tab, Tabs } from '../ui';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { expenses as expensesApi, employees as employeesApi, transactions as transactionsApi } from '../../lib/api';
import { useApiList, coerceError } from '../../hooks/useApi';

type ServerExpense = {
  id: string;
  employeeId: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  vendor: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';
  reimbursementDate: string | null;
  notes: string | null;
  createdAt: string;
};

type ServerEmployeeMin = { id: string; firstName: string; lastName: string; email?: string | null };

const categories = ['Office', 'Meals', 'Travel', 'Software', 'Equipment', 'Education', 'Other'];

// Map server status → display label + style.
const statusConfig: Record<ServerExpense['status'], { style: string; icon: typeof CheckCircle; label: string }> = {
  draft:      { style: 'bg-slate-100 text-slate-600',    icon: Clock,        label: 'Draft' },
  submitted:  { style: 'bg-amber-50 text-amber-700',     icon: Clock,        label: 'Pending' },
  approved:   { style: 'bg-emerald-50 text-emerald-700', icon: CheckCircle,  label: 'Approved' },
  rejected:   { style: 'bg-red-50 text-red-700',         icon: AlertCircle,  label: 'Rejected' },
  reimbursed: { style: 'bg-sky-50 text-sky-700',         icon: CheckCircle,  label: 'Reimbursed' },
};

export default function ExpensesView() {
  const [activeTab, setActiveTab] = useState('list');
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewingExpense, setViewingExpense] = useState<ServerExpense | null>(null);

  const { data: expenses, loading, error: loadError, reload } = useApiList<ServerExpense>(
    () => expensesApi.list(),
    [],
    'Failed to load expenses',
  );

  const { data: emps } = useApiList<ServerEmployeeMin>(
    () => employeesApi.list(),
    [],
    'Failed to load employees',
  );

  const error = loadError ?? actionError;

  const empNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of emps) m.set(e.id, `${e.firstName} ${e.lastName}`.trim());
    return m;
  }, [emps]);

  const approvedExpenses = expenses.filter((e) => e.status === 'approved');

  // Upload-tab Submit Expense form: bind state so submit posts to /api/expenses.
  const [draft, setDraft] = useState({ description: '', category: '', amount: '', employeeId: '' });
  const [batchSending, setBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

  const handleSubmitExpense = async () => {
    if (!draft.description.trim() || !draft.category || Number(draft.amount) <= 0 || !uploadFile) {
      setActionError('Pick a receipt, category, and enter a description + positive amount.');
      return;
    }
    const employeeId = draft.employeeId || emps[0]?.id;
    if (!employeeId) {
      setActionError('Pick the employee this expense is for.');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      await expensesApi.create({
        employeeId,
        description: draft.description.trim(),
        category: draft.category,
        amount: Number(draft.amount),
        currency: 'MYR',
        date: new Date().toISOString().slice(0, 10),
        vendor: null,
        status: 'submitted',
      });
      setDraft({ description: '', category: '', amount: '', employeeId: '' });
      setUploadFile(null);
      await reload();
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to submit expense'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendAllReimbursements = async () => {
    if (approvedExpenses.length === 0) return;
    if (!window.confirm(`Reimburse ${approvedExpenses.length} approved expense${approvedExpenses.length === 1 ? '' : 's'} totalling ${approvedExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}?`)) return;
    setBatchSending(true);
    setActionError(null);
    setBatchProgress({ done: 0, total: approvedExpenses.length });
    try {
      for (let i = 0; i < approvedExpenses.length; i++) {
        const exp = approvedExpenses[i];
        await transactionsApi.send({
          type: 'send',
          fromCurrency: exp.currency,
          toCurrency: exp.currency,
          fromAmount: exp.amount,
          toAmount: exp.amount,
          recipientAddress: `employee:${exp.employeeId}`,
          memo: `Reimbursement: ${exp.description}`,
        });
        await expensesApi.update(exp.id, { status: 'reimbursed', reimbursementDate: new Date().toISOString().slice(0, 10) });
        setBatchProgress({ done: i + 1, total: approvedExpenses.length });
      }
      await reload();
    } catch (e: any) {
      setActionError(coerceError(e, 'Reimbursement run failed midway. Re-run to continue.'));
    } finally {
      setBatchSending(false);
    }
  };
  const totalApproved = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const selectedTotal = expenses.filter((e) => selectedExpenses.includes(e.id)).reduce((sum, e) => sum + e.amount, 0);

  const toggleExpense = (id: string) => {
    setSelectedExpenses((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleAllApproved = () => {
    const approvedIds = approvedExpenses.map((e) => e.id);
    setSelectedExpenses(selectedExpenses.length === approvedIds.length ? [] : approvedIds);
  };

  const handleSendReimbursements = async () => {
    if (selectedExpenses.length === 0) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const empById = new Map(emps.map((e) => [e.id, e]));
      for (const id of selectedExpenses) {
        const exp = expenses.find((e) => e.id === id);
        if (!exp) continue;
        const employee = empById.get(exp.employeeId);
        await transactionsApi.send({
          type: 'send',
          fromCurrency: exp.currency,
          toCurrency: exp.currency,
          fromAmount: exp.amount,
          toAmount: exp.amount,
          exchangeRate: 1,
          recipientAddress: employee?.email ?? exp.employeeId,
          description: `Reimbursement: ${exp.description}`,
        });
        await expensesApi.update(id, { status: 'reimbursed', reimbursementDate: today });
      }
      setSelectedExpenses([]);
      await reload();
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to send reimbursements'));
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: 'list', label: 'Expense List', icon: Receipt },
    { id: 'upload', label: 'Upload Receipt', icon: Upload },
    { id: 'reimburse', label: 'Reimbursements', icon: Send },
  ];

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

      {activeTab === 'list' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Approved', value: `$${totalApproved.toLocaleString()}`, accent: 'text-slate-900' },
              { label: 'Pending Review', value: `$${expenses.filter((e) => e.status === 'submitted').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}`, accent: 'text-amber-400' },
              { label: 'Selected for Reimbursement', value: `$${selectedTotal.toLocaleString()}`, accent: 'text-emerald-400' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl p-5" style={card}>
                <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                <p className={`text-2xl font-bold mt-2 ${stat.accent}`}>{stat.value}</p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3.5 text-left"><input type="checkbox" checked={selectedExpenses.length === approvedExpenses.length && approvedExpenses.length > 0} onChange={toggleAllApproved} className="w-4 h-4 rounded" /></th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No expenses yet. Submit one from the Upload Receipt tab.
                    </td>
                  </tr>
                )}
                {loading && expenses.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm">
                      <span className="inline-flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading expenses…
                      </span>
                    </td>
                  </tr>
                )}
                {expenses.map((expense) => {
                  const config = statusConfig[expense.status];
                  const StatusIcon = config.icon;
                  const isDisabled = expense.status !== 'approved';
                  return (
                    <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5"><input type="checkbox" checked={selectedExpenses.includes(expense.id)} onChange={() => toggleExpense(expense.id)} disabled={isDisabled} className="w-4 h-4 rounded disabled:opacity-30" /></td>
                      <td className="px-6 py-3.5 text-slate-400">{expense.date}</td>
                      <td className="px-6 py-3.5 font-medium text-slate-700">{expense.description}</td>
                      <td className="px-6 py-3.5 text-slate-400">{empNameById.get(expense.employeeId) ?? '—'}</td>
                      <td className="px-6 py-3.5"><span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">{expense.category}</span></td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-900">{expense.amount.toFixed(2)} {expense.currency}</td>
                      <td className="px-6 py-3.5"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.style}`}><StatusIcon className="w-3 h-3" />{config.label}</span></td>
                      <td className="px-6 py-3.5"><button onClick={() => setViewingExpense(expense)} className="text-emerald-400 hover:text-sky-300 text-xs font-medium">View</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

          {selectedTotal > 0 && (
            <motion.div variants={fadeUp} className="rounded-xl p-4 flex items-center justify-between" style={{ ...card, border: '1px solid var(--border-default)' }}>
              <div>
                <p className="text-sm font-semibold text-slate-900">{selectedExpenses.length} expense{selectedExpenses.length !== 1 ? 's' : ''} selected</p>
                <p className="text-xs text-slate-500 mt-1">Total: ${selectedTotal.toLocaleString()}</p>
              </div>
              <button
                onClick={handleSendReimbursements}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium  transition-all disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Sending…' : 'Send Reimbursement'}
              </button>
            </motion.div>
          )}
        </motion.div>
      )}

      {activeTab === 'upload' && (
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="rounded-xl p-8" style={card}>
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-xl bg-[var(--bg-accent-soft)] border border-[var(--ink)] flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Upload Receipt</h3>
              <p className="text-slate-500 text-sm mb-6 text-center">Drag and drop your receipt or click to browse. Supports PDF, JPG, PNG.</p>
              <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="hidden" id="receipt-upload" />
              <label htmlFor="receipt-upload" className="px-6 py-3 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium cursor-pointer  transition-all">Choose File</label>
              {uploadFile && <p className="text-sm text-emerald-400 font-medium mt-4">Selected: {uploadFile.name}</p>}
            </div>
            {uploadFile && (
              <div className="mt-8 space-y-4 border-t border-slate-200 pt-6">
                <h4 className="text-sm font-semibold text-slate-900 mb-4">Expense Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400">Employee</label>
                    <select
                      value={draft.employeeId}
                      onChange={(e) => setDraft({ ...draft, employeeId: e.target.value })}
                      className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                    >
                      <option value="">— Pick an employee —</option>
                      {emps.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400">Description</label>
                    <input
                      type="text"
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      placeholder="What is this expense for?"
                      className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500 placeholder-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400">Category</label>
                    <select
                      value={draft.category}
                      onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                      className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                    >
                      <option value="">— Pick a category —</option>
                      {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400">Amount</label>
                    <input
                      type="number"
                      value={draft.amount}
                      onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:border-sky-500 placeholder-slate-400"
                    />
                  </div>
                  <button
                    onClick={handleSubmitExpense}
                    disabled={submitting}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {submitting ? 'Submitting…' : 'Submit Expense'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'reimburse' && (
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="rounded-xl p-6" style={card}>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Send Reimbursements</h3>
            <p className="text-slate-500 text-sm mb-6">Select approved expenses to send reimbursements via Settlement Protocol's atomic swap settlement.</p>
            <div className="rounded-xl p-5 mb-6" style={{ ...card, border: '1px solid var(--border-default)' }}>
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-xs text-slate-500 font-medium">Total to Reimburse</p><p className="text-2xl font-bold text-slate-900 mt-2">${approvedExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</p></div>
                <div><p className="text-xs text-slate-500 font-medium">Approved Expenses</p><p className="text-2xl font-bold text-slate-900 mt-2">{approvedExpenses.length}</p></div>
                <div><p className="text-xs text-sky-600 font-medium">Settlement Fee</p><p className="text-2xl font-bold text-emerald-400 mt-2">$0.01</p></div>
              </div>
            </div>
            <button
              onClick={handleSendAllReimbursements}
              disabled={batchSending || approvedExpenses.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-semibold transition-all disabled:opacity-60"
            >
              {batchSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {batchSending && batchProgress
                ? `Sending ${batchProgress.done}/${batchProgress.total}…`
                : `Send All Reimbursements via Settlement Protocol${approvedExpenses.length > 0 ? ` (${approvedExpenses.length})` : ''}`}
            </button>
            <p className="text-xs text-slate-500 text-center mt-4">Employees will receive reimbursements in their preferred currency with atomic swap settlement.</p>
          </motion.div>
        </motion.div>
      )}

      {viewingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewingExpense(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 border-2 border-[var(--ink)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Expense Detail</h3>
              <button onClick={() => setViewingExpense(null)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Description</dt><dd className="font-medium text-slate-900">{viewingExpense.description}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Employee</dt><dd className="text-slate-900">{empNameById.get(viewingExpense.employeeId) ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Date</dt><dd className="text-slate-900">{viewingExpense.date}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Category</dt><dd className="text-slate-900">{viewingExpense.category}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Amount</dt><dd className="font-mono text-slate-900">{viewingExpense.amount.toFixed(2)} {viewingExpense.currency}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Vendor</dt><dd className="text-slate-900">{viewingExpense.vendor ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="text-slate-900">{statusConfig[viewingExpense.status].label}</dd></div>
              {viewingExpense.reimbursementDate && (
                <div className="flex justify-between"><dt className="text-slate-500">Reimbursed</dt><dd className="text-slate-900">{viewingExpense.reimbursementDate.slice(0, 10)}</dd></div>
              )}
              {viewingExpense.notes && (
                <div><dt className="text-slate-500 mb-1">Notes</dt><dd className="text-slate-700 bg-slate-50 rounded-lg p-3 text-xs">{viewingExpense.notes}</dd></div>
              )}
            </dl>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
