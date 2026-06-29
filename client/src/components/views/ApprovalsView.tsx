import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, Receipt, CalendarDays, Send, Users, Loader2 } from 'lucide-react';
import { PageContainer, Tab, Tabs, ErrorBanner, LoadingState, EmptyState } from '../ui';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { approvals as approvalsApi } from '../../lib/api';
import { useApiList, coerceError } from '../../hooks/useApi';

type ServerApproval = {
  id: string;
  type: 'expense' | 'pto' | 'payroll' | 'payment' | 'invoice';
  entityId: string;
  requestedBy: string;
  requestedByName: string | null;
  description: string;
  amount: number | null;
  currency: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected';
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
};

const typeConfig: Record<string, { style: string; icon: typeof Receipt; label: string }> = {
  expense: { style: 'bg-amber-50 text-amber-700', icon: Receipt, label: 'Expense' },
  pto: { style: 'bg-cyan-50 text-cyan-700', icon: CalendarDays, label: 'Time Off' },
  payroll: { style: 'bg-emerald-50 text-emerald-700', icon: Users, label: 'Payroll' },
  payment: { style: 'bg-purple-50 text-purple-700', icon: Send, label: 'Payment' },
  invoice: { style: 'bg-sky-50 text-sky-700', icon: Receipt, label: 'Invoice' },
};

const priorityConfig: Record<string, string> = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};




export default function ApprovalsView() {
  const [activeTab, setActiveTab] = useState('pending');
  const [filterType, setFilterType] = useState('all');
  const [acting, setActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: items, loading, error: loadError, reload } = useApiList<ServerApproval>(
    () => approvalsApi.list(),
    [],
    'Failed to load approvals',
  );

  const error = loadError ?? actionError;

  const pendingApprovals = useMemo(() => items.filter((a) => a.status === 'pending'), [items]);
  const completedApprovals = useMemo(() => items.filter((a) => a.status !== 'pending'), [items]);

  const handleAction = async (approvalId: string, status: 'approved' | 'rejected') => {
    setActing(approvalId);
    setActionError(null);
    try {
      await approvalsApi.update(approvalId, status);
      await reload();
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to update approval'));
    } finally {
      setActing(null);
    }
  };

  const tabs = [
    { id: 'pending', label: `Pending (${pendingApprovals.length})`, icon: Clock },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
  ];

  const filtered = filterType === 'all'
    ? pendingApprovals
    : pendingApprovals.filter((a) => a.type === filterType);

  return (
    <PageContainer>
      <Tabs value={activeTab} onChange={setActiveTab}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return <Tab key={tab.id} value={tab.id} label={tab.label} icon={<Icon className="w-4 h-4" />} />;
        })}
      </Tabs>

      <ErrorBanner message={error} onRetry={reload} />

      {loading && items.length === 0 && (
        <div className="rounded-xl" style={card}>
          <LoadingState label="Loading approvals…" />
        </div>
      )}

      {activeTab === 'pending' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="grid grid-cols-4 gap-4">
            {[
              { label: 'Pending', value: `${pendingApprovals.length}`, sub: 'Awaiting your review', accent: 'text-amber-400' },
              { label: 'High Priority', value: `${pendingApprovals.filter((a) => a.priority === 'high').length}`, sub: 'Needs immediate action', accent: 'text-red-400' },
              { label: 'Expenses', value: `$${pendingApprovals.filter((a) => a.type === 'expense').reduce((s, a) => s + (a.amount || 0), 0).toFixed(0)}`, sub: `${pendingApprovals.filter((a) => a.type === 'expense').length} claims`, accent: 'text-slate-900' },
              { label: 'Payments', value: `$${(pendingApprovals.filter((a) => a.type === 'payment' || a.type === 'payroll').reduce((s, a) => s + (a.amount || 0), 0) / 1000000).toFixed(1)}M`, sub: 'Pending settlement', accent: 'text-emerald-400' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-5" style={card}>
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className={`text-2xl font-bold mt-2 ${c.accent}`}>{c.value}</p>
                <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="flex gap-2">
            {['all', 'expense', 'pto', 'payroll', 'payment'].map((t) => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                  filterType === t ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-400 hover:text-slate-900'
                }`}>
                {t === 'all' ? 'All' : t === 'pto' ? 'Time Off' : t}
              </button>
            ))}
          </motion.div>

          {filtered.length === 0 && !loading && (
            <div className="rounded-xl" style={card}>
              <EmptyState
                icon={<CheckCircle className="w-6 h-6" />}
                title="All caught up"
                description={filterType === 'all' ? "No pending approvals." : `No pending ${filterType} approvals.`}
              />
            </div>
          )}

          {filtered.map((approval) => {
            const config = typeConfig[approval.type] ?? typeConfig.expense;
            const TypeIcon = config.icon;
            const isActing = acting === approval.id;
            return (
              <motion.div key={approval.id} variants={fadeUp} className="rounded-xl p-5" style={card}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.style.replace('text-', 'bg-').split(' ')[0]}`}>
                      <TypeIcon className={`w-5 h-5 ${config.style.split(' ')[1]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{approval.description}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${config.style}`}>{config.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityConfig[approval.priority]}`}>{approval.priority}</span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        From <span className="text-slate-700">{approval.requestedByName ?? approval.requestedBy}</span> &middot; {approval.createdAt.slice(0, 10)}
                      </p>
                      {approval.amount != null && (
                        <p className="text-lg font-bold text-slate-900 mt-2 font-mono">
                          {approval.amount.toLocaleString()} <span className="text-xs text-slate-500 font-normal">{approval.currency}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <button
                      onClick={() => handleAction(approval.id, 'approved')}
                      disabled={isActing}
                      className="px-4 py-2.5 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] text-sm font-medium  transition-all disabled:opacity-60 inline-flex items-center gap-1"
                    >
                      {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(approval.id, 'rejected')}
                      disabled={isActing}
                      className="px-4 py-2.5 rounded-xl bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {activeTab === 'completed' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Requester</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completedApprovals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No completed approvals yet.
                    </td>
                  </tr>
                )}
                {completedApprovals.map((a) => {
                  const config = typeConfig[a.type] ?? typeConfig.expense;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5"><span className={`px-2 py-1 rounded-md text-xs font-medium ${config.style}`}>{config.label}</span></td>
                      <td className="px-6 py-3.5 text-slate-700">{a.requestedByName ?? a.requestedBy}</td>
                      <td className="px-6 py-3.5 text-slate-600">{a.description}</td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-900">{a.amount != null ? a.amount.toLocaleString() : '-'}</td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          a.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {a.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {a.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-400 text-xs">{(a.approvedAt ?? a.createdAt).slice(0, 10)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      )}
    </PageContainer>
  );
}
