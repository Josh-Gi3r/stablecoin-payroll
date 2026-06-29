import { motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, PageHeader, Pill, Table, type Column } from '../ui';
import { auditLogs as auditApi } from '../../lib/api';
import { useApiList } from '../../hooks/useApi';

type ServerAuditEntry = {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: string | null;
  ipAddress: string | null;
  timestamp: string;
};

// Derive a category for tone-styling from the action prefix.
function categoryFor(action: string): 'auth' | 'payroll' | 'kyc' | 'contract' | 'admin' {
  if (action.startsWith('login') || action.startsWith('logout') || action.includes('auth')) return 'auth';
  if (action.includes('payroll') || action.includes('payslip') || action.includes('epf') || action.includes('cpf')) return 'payroll';
  if (action.includes('kyc') || action.includes('liveness')) return 'kyc';
  if (action.includes('contract') || action.includes('signed')) return 'contract';
  return 'admin';
}

const categoryTone = (c: string): 'primary' | 'secondary' | 'tertiary' | 'warn' | 'success' =>
  c === 'auth' ? 'secondary' : c === 'payroll' ? 'primary' : c === 'kyc' ? 'warn' : c === 'contract' ? 'tertiary' : 'success';

export default function AuditLogView() {
  const { data: entries, loading, error } = useApiList<ServerAuditEntry>(
    () => auditApi.list(),
    [],
    'Failed to load audit log',
  );

  // Adapt server rows to the UI columns.
  const rows = entries.map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    actor: e.userId,
    action: e.action,
    target: `${e.entityType}:${e.entityId}`,
    ip: e.ipAddress ?? '—',
    category: categoryFor(e.action),
  }));

  const columns: Column<typeof rows[number]>[] = [
    { key: 'timestamp', label: 'Timestamp', sortable: true, className: 'font-mono tabular-nums', cardTitle: true },
    { key: 'actor',     label: 'Actor',     sortable: true, className: 'font-mono' },
    { key: 'action',    label: 'Action',    sortable: true, className: 'font-mono' },
    { key: 'target',    label: 'Target',    className: 'font-mono' },
    { key: 'category',  label: 'Category',  render: (r) => <Pill tone={categoryTone(r.category)} size="sm">{r.category}</Pill> },
    { key: 'ip',        label: 'IP',        className: 'font-mono', align: 'right' },
  ];

  return (
    <PageContainer>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUp}>
          <PageHeader
            eyebrow="Compliance"
            title="Audit log"
            subtitle="Every state-changing action across the platform. Required for compliance and incident response."
          />
        </motion.div>

        {error && (
          <div
            className="rounded-xl px-3 py-2 flex items-center gap-2 text-sm"
            style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid var(--error)', color: 'var(--danger)' }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading && rows.length === 0 ? (
          <div className="rounded-xl p-10 text-center text-sm flex items-center justify-center gap-2"
               style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Loading audit log…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl p-10 text-center text-sm"
               style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            <p style={{ color: 'var(--text-muted)' }}>No audit entries yet. State-changing actions will appear here.</p>
          </div>
        ) : (
          <motion.div variants={fadeUp}>
            <Table columns={columns} data={rows} striped />
          </motion.div>
        )}
      </motion.div>
    </PageContainer>
  );
}
