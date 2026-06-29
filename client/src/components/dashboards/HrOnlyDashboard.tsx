import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Calendar, UserPlus, Clock, ArrowUpRight, Heart, Cake,
} from 'lucide-react';
import { useOrgRole } from '../../contexts/OrgRoleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { fadeUp, stagger } from '../../lib/viewConstants';
import {
  PageContainer, PageHeader, Surface, IconChip, Pill, ProgressBar, Button, StatCard,
  BentoMasonry, ErrorBanner, EmptyState,
} from '../ui';
import { RecentActivity } from './widgets';
import {
  employees as employeesApi,
  timeOff as timeOffApi,
  dashboard as dashboardApi,
  approvals as approvalsApi,
} from '../../lib/api';
import { useApiList } from '../../hooks/useApi';

type ServerEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  department: string | null;
  position: string | null;
  hireDate: string;
  status: string;
};

type ServerLeaveRequest = {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string | null;
};

type ServerLeaveBalance = {
  id: string;
  employeeId: string;
  type: string;
  totalDays: number;
  usedDays: number;
};

type Activity = { id: string; action: string; entityType: string; entityId: string; timestamp: string };

type ApiApproval = { id: string; type: string; status: string };

const PALETTE = ['var(--sky-500)', 'var(--sky-400)', 'var(--lilac-500)', 'var(--slate-500)', 'var(--warn)'];

const monthDay = (iso: string) => {
  const [, m, d] = iso.split('-');
  if (!m || !d) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${d}`;
};

const yearsBetween = (from: string) => Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / (365.25 * 86400 * 1000)));

export function HrOnlyDashboard() {
  const { persona } = useOrgRole();

  const { data: employees, error: empError } = useApiList<ServerEmployee>(() => employeesApi.list(), [], 'Failed to load employees');
  const { data: leaveRequests, reload: reloadLeave } = useApiList<ServerLeaveRequest>(() => timeOffApi.requests({ status: 'pending' }), [], 'Failed to load leave requests');
  const { navigateTo } = useNavigation();
  const [actingId, setActingId] = useState<string | null>(null);
  const decideLeave = async (id: string, status: 'approved' | 'declined') => {
    setActingId(id);
    try {
      await timeOffApi.updateRequest(id, { status });
      await reloadLeave();
    } finally {
      setActingId(null);
    }
  };
  const { data: leaveBalances } = useApiList<ServerLeaveBalance>(() => timeOffApi.balances(), [], 'Failed to load leave balances');
  const { data: activity } = useApiList<Activity>(() => dashboardApi.recentActivity(8), [], 'Failed to load activity');
  const { data: pendingApprovals } = useApiList<ApiApproval>(() => approvalsApi.list({ status: 'pending' }), [], 'Failed to load approvals');

  const today = new Date().toISOString().slice(0, 10);
  const onLeaveToday = leaveRequests.filter((l) => l.status === 'approved' && l.startDate <= today && l.endDate >= today).length;
  const onboardingEmps = useMemo(() => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400 * 1000).toISOString().slice(0, 10);
    return employees.filter((e) => e.status === 'active' && e.hireDate >= ninetyDaysAgo).slice(0, 5);
  }, [employees]);

  const empById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const leaveDistribution = useMemo(() => {
    const byDept: Record<string, { taken: number; total: number }> = {};
    leaveBalances.forEach((b) => {
      const emp = empById[b.employeeId];
      const dept = emp?.department || 'Other';
      if (!byDept[dept]) byDept[dept] = { taken: 0, total: 0 };
      byDept[dept].taken += b.usedDays;
      byDept[dept].total += b.totalDays;
    });
    return Object.entries(byDept)
      .map(([dept, v], i) => ({ dept, taken: v.taken, total: v.total || 14, color: PALETTE[i % PALETTE.length] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [leaveBalances, empById]);

  const pendingLeave = useMemo(
    () =>
      leaveRequests.slice(0, 6).map((l) => {
        const emp = empById[l.employeeId];
        return {
          id: l.id,
          name: emp ? `${emp.firstName} ${emp.lastName}` : l.employeeId.slice(0, 8),
          type: l.type === 'vacation' ? 'Annual' : l.type === 'sick' ? 'Sick' : 'Personal',
          days: l.days,
          when: `${monthDay(l.startDate)}–${monthDay(l.endDate).split(' ')[1]}`,
        };
      }),
    [leaveRequests, empById],
  );

  const upcomingDates = useMemo(() => {
    const now = new Date();
    const items: Array<{ name: string; date: string; type: 'birthday' | 'anniversary'; years?: number }> = [];
    employees.forEach((e) => {
      if (!e.hireDate) return;
      const hireDate = new Date(e.hireDate);
      const annivThisYear = new Date(now.getFullYear(), hireDate.getMonth(), hireDate.getDate());
      const daysUntil = (annivThisYear.getTime() - now.getTime()) / (86400 * 1000);
      if (daysUntil >= 0 && daysUntil <= 30) {
        items.push({
          name: `${e.firstName} ${e.lastName}`.trim(),
          date: monthDay(annivThisYear.toISOString().slice(0, 10)),
          type: 'anniversary',
          years: yearsBetween(e.hireDate),
        });
      }
    });
    return items.slice(0, 5);
  }, [employees]);

  const onboardingItems = onboardingEmps.map((e, i) => {
    const daysSinceHire = (Date.now() - new Date(e.hireDate).getTime()) / (86400 * 1000);
    const pct = Math.min(100, Math.max(20, Math.round(daysSinceHire / 0.9)));
    const stage = pct < 35 ? 'docs' : pct < 70 ? 'contract' : 'training';
    return {
      name: `${e.firstName} ${e.lastName}`.trim(),
      role: e.position ?? 'New hire',
      stage,
      pct,
      key: e.id ?? `onboarding-${i}`,
    };
  });

  const recentItems = activity.slice(0, 5).map((a) => ({
    icon: a.action.includes('hire') || a.action.includes('onboard') ? UserPlus : a.action.includes('leave') ? Calendar : a.action.includes('review') ? Clock : Heart,
    color: 'var(--sky-500)',
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
            title="People operations"
            subtitle="Headcount, leave, onboarding pipeline, and team engagement — PayrollPlatform as your HR software."
            actions={<Button variant="primary" size="sm" icon={<UserPlus className="w-3.5 h-3.5" />} onClick={() => navigateTo('employee-onboarding')}>Add employee</Button>}
          />
        </motion.div>

        <ErrorBanner message={empError} />

        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Headcount"        value={`${employees.length}`} hint={`${onboardingEmps.length} onboarding · ${employees.filter((e) => e.status !== 'active').length} inactive`} icon={<Users className="w-5 h-5" />}    tone="primary"   feature />
          <StatCard label="On leave today"   value={`${onLeaveToday}`}   hint="approved leave today"             icon={<Calendar className="w-5 h-5" />} tone="secondary" />
          <StatCard label="Pending requests" value={`${pendingApprovals.length}`}   hint={`${leaveRequests.length} leave`}        icon={<Clock className="w-5 h-5" />}    tone="tertiary" />
          <StatCard label="Engagement"       value="—" hint="survey not run yet"                    icon={<Heart className="w-5 h-5" />}   tone="primary" />
        </motion.div>

        <BentoMasonry>
          <motion.div variants={fadeUp}>
            <Surface padding="none" className="overflow-hidden">
              <div className="px-5 md:px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <IconChip icon={<Calendar className="w-4 h-4" />} tone="primary" size="sm" />
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Leave approvals</h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{pendingLeave.length} pending</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigateTo('time-off')}>View all</Button>
              </div>
              {pendingLeave.length === 0 ? (
                <EmptyState icon={<Calendar className="w-6 h-6" />} title="No pending leave" description="Time-off requests requiring approval will appear here." />
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {pendingLeave.map((l) => (
                    <div key={l.id} className="px-5 md:px-6 py-3 flex items-center gap-3 hover:bg-slate-50/60 transition-colors">
                      <IconChip
                        icon={<span className="text-[10px] font-semibold">{l.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>}
                        tone="secondary"
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{l.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{l.type} · {l.days} day{l.days > 1 ? 's' : ''} · {l.when}</p>
                      </div>
                      <Button variant="primary" size="sm" onClick={() => decideLeave(l.id, 'approved')} disabled={actingId === l.id}>Approve</Button>
                      <Button variant="outlined" size="sm" onClick={() => decideLeave(l.id, 'declined')} disabled={actingId === l.id}>Decline</Button>
                    </div>
                  ))}
                </div>
              )}
            </Surface>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Surface padding="none" className="overflow-hidden">
              <div className="px-5 md:px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <IconChip icon={<UserPlus className="w-4 h-4" />} tone="tertiary" size="sm" />
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Onboarding pipeline</h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{onboardingItems.length} in progress</p>
                  </div>
                </div>
              </div>
              {onboardingItems.length === 0 ? (
                <EmptyState icon={<UserPlus className="w-6 h-6" />} title="No active onboardings" description="Recently hired employees (last 90 days) will show their onboarding progress here." />
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {onboardingItems.map((o) => (
                    <div key={o.key} className="px-5 md:px-6 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{o.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{o.role}</p>
                        </div>
                        <Pill tone="secondary" size="sm">{o.stage}</Pill>
                      </div>
                      <ProgressBar value={o.pct} tone="primary" size="sm" valueLabel={`${o.pct}%`} />
                    </div>
                  ))}
                </div>
              )}
            </Surface>
          </motion.div>

          {leaveDistribution.length > 0 && (
            <motion.div variants={fadeUp}>
              <Surface padding="md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Leave by department</h3>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>YTD · /total</span>
                </div>
                <div className="space-y-3">
                  {leaveDistribution.map((d) => (
                    <div key={d.dept}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{d.dept}</span>
                        <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          {d.taken.toFixed(1)} / {d.total}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-raised)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(100, (d.taken / Math.max(1, d.total)) * 100)}%`, background: d.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>
            </motion.div>
          )}

          {upcomingDates.length > 0 && (
            <motion.div variants={fadeUp}>
              <Surface padding="md">
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Coming up</h3>
                <div className="space-y-3">
                  {upcomingDates.map((u) => (
                    <div key={u.name} className="flex items-center gap-3">
                      <IconChip
                        icon={u.type === 'birthday' ? <Cake className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        tone={u.type === 'birthday' ? 'tertiary' : 'primary'}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {u.type === 'birthday' ? 'Birthday' : `${u.years}-yr work anniversary`}
                        </p>
                      </div>
                      <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-secondary)' }}>{u.date}</span>
                    </div>
                  ))}
                </div>
              </Surface>
            </motion.div>
          )}

          {recentItems.length > 0 && (
            <RecentActivity
              className="p-5 rounded-xl flex flex-col"
              title="Recent HR activity"
              items={recentItems as any}
            />
          )}
        </BentoMasonry>
      </motion.div>
    </PageContainer>
  );
}

export default HrOnlyDashboard;
