import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Plus, CheckCircle, Clock, AlertCircle, Umbrella, Briefcase, Heart, Loader2 } from 'lucide-react';
import { useOrgRole } from '../../contexts/OrgRoleContext';
import { PageContainer, Tab, Tabs } from '../ui';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { timeOff as timeOffApi, employees as employeesApi } from '../../lib/api';
import { useApiList, coerceError } from '../../hooks/useApi';

type ServerRequest = {
  id: string;
  employeeId: string;
  type: 'vacation' | 'sick' | 'personal';
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy: string | null;
  createdAt: string;
};

type ServerBalance = {
  id: string;
  employeeId: string;
  type: 'vacation' | 'sick' | 'personal';
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  year: number;
};

const balanceConfig: Record<ServerBalance['type'], { label: string; icon: typeof Umbrella; color: string }> = {
  vacation: { label: 'Vacation',   icon: Umbrella,  color: 'from-cyan-500 to-blue-500' },
  sick:     { label: 'Sick Leave', icon: Heart,     color: 'from-red-400 to-pink-500' },
  personal: { label: 'Personal',   icon: Briefcase, color: 'from-amber-400 to-orange-500' },
};

const statusConfig: Record<string, { style: string; icon: typeof CheckCircle }> = {
  approved: { style: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
  pending: { style: 'bg-amber-50 text-amber-700', icon: Clock },
  rejected: { style: 'bg-red-50 text-red-700', icon: AlertCircle },
};

export default function TimeOffView() {
  const { persona } = useOrgRole();
  const isManagerOrAbove = persona.role !== 'employee';
  const [activeTab, setActiveTab] = useState('balances');
  const [acting, setActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitForm, setSubmitForm] = useState({ type: 'vacation', startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const { data: requests, loading: reqLoading, error: reqError, reload: reloadReqs } =
    useApiList<ServerRequest>(() => timeOffApi.requests(), [], 'Failed to load requests');

  const { data: balances, error: balError } =
    useApiList<ServerBalance>(() => timeOffApi.balances(), [], 'Failed to load balances');

  const { data: emps } =
    useApiList<{ id: string; firstName: string; lastName: string; userId?: string | null }>(
      () => employeesApi.list(),
      [],
      'Failed to load employees',
    );

  const error = reqError ?? balError ?? actionError;

  const empNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of emps) m.set(e.id, `${e.firstName} ${e.lastName}`.trim());
    return m;
  }, [emps]);

  // Self vs team — match by employee.userId. If no employee record matches
  // the persona, show all requests as "team" (typical for HR/Admin).
  const myEmployeeId = useMemo(() => {
    return emps.find((e) => (e as any).userId)?.id ?? null;
  }, [emps]);

  const myRequests = useMemo(
    () => myEmployeeId ? requests.filter((r) => r.employeeId === myEmployeeId) : requests,
    [requests, myEmployeeId],
  );
  const teamRequests = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);

  // Use balances for the persona's employee if available; otherwise show
  // aggregated balances from the first employee (HR/Admin demo).
  const personaBalances = useMemo(() => {
    if (balances.length === 0) return [];
    if (myEmployeeId) {
      return balances.filter((b) => b.employeeId === myEmployeeId);
    }
    const firstEmpId = balances[0].employeeId;
    return balances.filter((b) => b.employeeId === firstEmpId);
  }, [balances, myEmployeeId]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myEmployeeId) {
      setActionError('No employee record matches your user. Cannot submit a request.');
      return;
    }
    if (!submitForm.startDate || !submitForm.endDate) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const start = new Date(submitForm.startDate);
      const end = new Date(submitForm.endDate);
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
      await timeOffApi.createRequest({
        employeeId: myEmployeeId,
        type: submitForm.type,
        startDate: submitForm.startDate,
        endDate: submitForm.endDate,
        days,
        reason: submitForm.reason || null,
      });
      setSubmitForm({ type: 'vacation', startDate: '', endDate: '', reason: '' });
      setActiveTab('balances');
      await reloadReqs();
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to submit request'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (reqId: string, status: 'approved' | 'rejected') => {
    setActing(reqId);
    setActionError(null);
    try {
      await timeOffApi.updateRequest(reqId, { status });
      await reloadReqs();
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to update request'));
    } finally {
      setActing(null);
    }
  };

  const tabs = [
    { id: 'balances', label: 'My Balances', icon: CalendarDays },
    { id: 'request', label: 'Request Time Off', icon: Plus },
    ...(isManagerOrAbove ? [{ id: 'team', label: 'Team Requests', icon: CheckCircle }] : []),
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

      {activeTab === 'balances' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          {personaBalances.length === 0 ? (
            <div className="rounded-xl p-10 text-center text-sm" style={card}>
              <p style={{ color: 'var(--text-muted)' }}>
                {reqLoading ? 'Loading…' : 'No balance records yet for this employee.'}
              </p>
            </div>
          ) : (
            <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
              {personaBalances.map((b) => {
                const cfg = balanceConfig[b.type];
                const Icon = cfg.icon;
                const available = b.totalDays - b.usedDays - b.pendingDays;
                const pctUsed = b.totalDays > 0 ? ((b.usedDays + b.pendingDays) / b.totalDays) * 100 : 0;
                return (
                  <div key={b.id} className="rounded-xl p-5" style={card}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{cfg.label}</p>
                        <p className="text-xs text-slate-500">{b.totalDays} days/year</p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 mb-3 overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--lavender)] border-2 border-[var(--ink)] transition-all" style={{ width: `${pctUsed}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><p className="text-lg font-bold text-emerald-400">{available}</p><p className="text-[10px] text-slate-500">Available</p></div>
                      <div><p className="text-lg font-bold text-slate-900">{b.usedDays}</p><p className="text-[10px] text-slate-500">Used</p></div>
                      <div><p className="text-lg font-bold text-amber-400">{b.pendingDays}</p><p className="text-[10px] text-slate-500">Pending</p></div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
            <div className="px-6 py-4 border-b border-slate-200">
              <h4 className="font-semibold text-slate-900">Recent Requests</h4>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Days</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No requests yet.
                    </td>
                  </tr>
                )}
                {myRequests.map((req) => {
                  const config = statusConfig[req.status];
                  const StatusIcon = config.icon;
                  const cfg = balanceConfig[req.type];
                  return (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3"><span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">{cfg?.label ?? req.type}</span></td>
                      <td className="px-6 py-3 text-slate-700">{req.startDate === req.endDate ? req.startDate : `${req.startDate} \u2192 ${req.endDate}`}</td>
                      <td className="px-6 py-3 text-right font-mono text-slate-900">{req.days}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.style}`}>
                          <StatusIcon className="w-3 h-3" />{req.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-400 text-xs">
                        {req.approvedBy ? (empNameById.get(req.approvedBy) ?? req.approvedBy) : '\u2014'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'request' && (
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.form variants={fadeUp} onSubmit={handleSubmitRequest} className="max-w-lg">
            <div className="rounded-xl p-6" style={card}>
              <h3 className="text-lg font-bold text-slate-900 mb-5">Request Time Off</h3>
              {!myEmployeeId && (
                <div className="mb-4 rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#92400E' }}>
                  No employee record is linked to your user. You can browse this page but cannot submit a leave request. Ask HR to link your account.
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400">Leave Type</label>
                  <select
                    value={submitForm.type}
                    onChange={(e) => setSubmitForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                  >
                    <option value="vacation">Vacation</option>
                    <option value="sick">Sick Leave</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-400">Start Date</label>
                    <input
                      type="date"
                      required
                      value={submitForm.startDate}
                      onChange={(e) => setSubmitForm((f) => ({ ...f, startDate: e.target.value }))}
                      className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400">End Date</label>
                    <input
                      type="date"
                      required
                      value={submitForm.endDate}
                      onChange={(e) => setSubmitForm((f) => ({ ...f, endDate: e.target.value }))}
                      className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400">Notes (optional)</label>
                  <textarea
                    rows={3}
                    value={submitForm.reason}
                    onChange={(e) => setSubmitForm((f) => ({ ...f, reason: e.target.value }))}
                    placeholder="Reason for leave..."
                    className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500 placeholder-slate-400 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !myEmployeeId}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium  transition-all disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}

      {activeTab === 'team' && isManagerOrAbove && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Pending Team Requests</h3>
          </motion.div>
          {teamRequests.length === 0 && (
            <div className="rounded-xl p-10 text-center text-sm" style={card}>
              <p style={{ color: 'var(--text-muted)' }}>No pending requests.</p>
            </div>
          )}
          {teamRequests.map((req) => {
            const cfg = balanceConfig[req.type];
            const empName = empNameById.get(req.employeeId) ?? req.employeeId;
            const isActing = acting === req.id;
            return (
              <motion.div key={req.id} variants={fadeUp} className="rounded-xl p-5" style={card}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">{empName.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{empName}</p>
                      <p className="text-xs text-slate-500">{cfg?.label ?? req.type} \u00b7 {req.startDate === req.endDate ? req.startDate : `${req.startDate} \u2192 ${req.endDate}`} \u00b7 {req.days} day{req.days > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAction(req.id, 'approved')}
                      disabled={isActing}
                      className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-60 inline-flex items-center gap-1"
                    >
                      {isActing && <Loader2 className="w-3 h-3 animate-spin" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'rejected')}
                      disabled={isActing}
                      className="px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </PageContainer>
  );
}
