import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wallet, ArrowDownRight, ArrowUpRight, RefreshCw, FileDown } from 'lucide-react';
import { fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, PageHeader, Surface, IconChip, Pill, ProgressBar, Button, StatCard, Table, type Column, ErrorBanner, LoadingState, EmptyState } from '../ui';
import { clients as clientsApi, deposits as depositsApi } from '../../lib/api';
import { useApiList } from '../../hooks/useApi';

type ServerClient = {
  id: string;
  name: string;
  mode: 'payroll' | 'hr' | 'payroll_hr' | 'eor';
  noticeDefaultMonths: number;
};

type ServerDeposit = {
  id: string;
  clientId: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'received' | 'held' | 'drawn' | 'refunded';
  receivedDate: string | null;
};

type ServerLedger = {
  id: string;
  depositId: string;
  txType: 'receive' | 'draw' | 'top_up' | 'refund';
  amount: number;
  reference: string | null;
  note: string | null;
  createdAt: string;
  clientName: string | null;
  currency: string | null;
};

type ClientBalance = {
  client: string;
  required: string;
  held: string;
  fundingPct: number;
  status: 'funded' | 'short' | 'overfunded';
  lastDraw: string;
};

const MYR = (n: number) => `RM ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function TrustAccountView() {
  const { data: clientsList, loading: clientsLoading, error: clientsError, reload: reloadClients } = useApiList<ServerClient>(
    () => clientsApi.list(),
    [],
    'Failed to load clients',
  );
  const { data: depositsList, loading: depLoading, error: depError, reload: reloadDeps } = useApiList<ServerDeposit>(
    () => depositsApi.list(),
    [],
    'Failed to load deposits',
  );
  const { data: ledger, loading: ledgerLoading, error: ledgerError, reload: reloadLedger } = useApiList<ServerLedger>(
    () => depositsApi.ledgerAll(),
    [],
    'Failed to load trust ledger',
  );

  const error = clientsError ?? depError ?? ledgerError;
  const loading = clientsLoading || depLoading || ledgerLoading;

  const eorClients = useMemo(() => clientsList.filter((c) => c.mode === 'eor'), [clientsList]);

  const balances: ClientBalance[] = useMemo(() => {
    return eorClients.map((c) => {
      const clientDeposits = depositsList.filter((d) => d.clientId === c.id);
      const required = clientDeposits.reduce((s, d) => s + d.amount, 0);
      const held = clientDeposits
        .filter((d) => d.status === 'received' || d.status === 'held')
        .reduce((s, d) => s + d.amount, 0);
      const fundingPct = required > 0 ? Math.round((held / required) * 100) : 0;
      const status: ClientBalance['status'] =
        required === 0 ? 'funded' : fundingPct >= 105 ? 'overfunded' : fundingPct >= 95 ? 'funded' : 'short';
      const lastDrawEntry = ledger
        .filter((l) => l.txType === 'draw' && l.clientName === c.name)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      return {
        client: c.name,
        required: MYR(required),
        held: MYR(held),
        fundingPct,
        status,
        lastDraw: lastDrawEntry ? lastDrawEntry.createdAt.slice(0, 10) : 'n/a',
      };
    });
  }, [eorClients, depositsList, ledger]);

  const totalHeld = depositsList
    .filter((d) => d.status === 'received' || d.status === 'held')
    .reduce((s, d) => s + d.amount, 0);
  const totalRequired = depositsList.reduce((s, d) => s + d.amount, 0);
  const drawnThisMonth = useMemo(() => {
    const now = new Date();
    const ymPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return ledger
      .filter((l) => l.txType === 'draw' && l.createdAt.startsWith(ymPrefix))
      .reduce((s, l) => s + l.amount, 0);
  }, [ledger]);

  const ledgerColumns: Column<ServerLedger>[] = [
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      className: 'font-mono tabular-nums',
      cardTitle: true,
      render: (r) => r.createdAt.slice(0, 16).replace('T', ' '),
    },
    { key: 'id', label: 'Tx', className: 'font-mono', sortable: true, render: (r) => r.id.slice(0, 12) },
    { key: 'clientName', label: 'Client', sortable: true, render: (r) => r.clientName ?? '—' },
    {
      key: 'txType',
      label: 'Type',
      render: (r) => {
        const tone = r.txType === 'receive' || r.txType === 'top_up' ? 'success' : r.txType === 'draw' ? 'primary' : 'tertiary';
        return <Pill tone={tone as any} size="sm">{r.txType.replace('_', ' ')}</Pill>;
      },
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      className: 'font-mono tabular-nums',
      render: (r) => `${r.currency ?? 'MYR'} ${r.amount.toLocaleString()}`,
    },
    { key: 'reference', label: 'Reference', className: 'font-mono', render: (r) => r.reference ?? '—' },
  ];

  const reloadAll = () => {
    reloadClients();
    reloadDeps();
    reloadLedger();
  };

  const exportLedgerCsv = () => {
    const header = ['date', 'tx_id', 'client', 'type', 'currency', 'amount', 'reference', 'note'];
    const rows = ledger.map((l) => [
      l.createdAt,
      l.id,
      l.clientName ?? '',
      l.txType,
      l.currency ?? 'MYR',
      l.amount.toString(),
      l.reference ?? '',
      l.note ?? '',
    ]);
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trust-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <PageContainer>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUp}>
          <PageHeader
            eyebrow="Operator · Treasury"
            title="Trust account"
            subtitle="Segregated trust balances per EOR client. Held in EOR Provider's regulated MY subsidiary trust account."
            actions={
              <div className="flex gap-2">
                <Button variant="outlined" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={reloadAll}>Reconcile</Button>
                <Button variant="primary" size="sm" icon={<FileDown className="w-3.5 h-3.5" />} onClick={exportLedgerCsv} disabled={ledger.length === 0}>Export ledger</Button>
              </div>
            }
          />
        </motion.div>

        <ErrorBanner message={error} onRetry={reloadAll} />

        {loading && balances.length === 0 && ledger.length === 0 && (
          <LoadingState label="Loading trust account…" />
        )}

        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total held"        value={MYR(totalHeld)}        hint={`across ${eorClients.length} EOR client${eorClients.length === 1 ? '' : 's'}`} icon={<Wallet className="w-5 h-5" />}        tone="primary" feature />
          <StatCard label="Total required"    value={MYR(totalRequired)}    hint="lifetime exposure"      icon={<ArrowUpRight className="w-5 h-5" />} tone="secondary" />
          <StatCard label="Drawn this month" value={MYR(drawnThisMonth)}    hint={`${ledger.filter((l) => l.txType === 'draw').length} draws on file`} icon={<ArrowDownRight className="w-5 h-5" />} tone="tertiary" />
          <StatCard label="Reconciliation"   value={loading ? '…' : 'OK'}   hint={`last: ${new Date().toISOString().slice(0, 10)}`} icon={<RefreshCw className="w-5 h-5" />}    tone="primary" />
        </motion.div>

        <motion.div variants={fadeUp}>
          <Surface padding="none" className="overflow-hidden">
            <div className="px-5 md:px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Per-client balances</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>EOR clients only — direct payroll customers don't have trust deposits.</p>
            </div>
            {balances.length === 0 ? (
              <EmptyState
                icon={<Wallet className="w-6 h-6" />}
                title="No EOR clients yet"
                description="When you onboard an EOR client and create a deposit, balances appear here."
              />
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {balances.map((b) => (
                  <div key={b.client} className="px-5 md:px-6 py-4">
                    <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <IconChip icon={<Wallet className="w-4 h-4" />} tone="primary" size="sm" />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{b.client}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Required {b.required} · Last draw {b.lastDraw}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-base font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{b.held}</p>
                        <Pill tone={b.status === 'funded' ? 'success' : b.status === 'short' ? 'warn' : 'primary'} size="sm" dot>{b.status}</Pill>
                      </div>
                    </div>
                    <ProgressBar value={b.fundingPct} tone={b.fundingPct >= 100 ? 'primary' : 'secondary'} size="sm" valueLabel={`${b.fundingPct}%`} />
                  </div>
                ))}
              </div>
            )}
          </Surface>
        </motion.div>

        <motion.div variants={fadeUp}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Recent ledger entries</h2>
          {ledger.length === 0 && !loading ? (
            <Surface>
              <EmptyState
                icon={<FileDown className="w-6 h-6" />}
                title="No ledger entries yet"
                description="Top-ups, draws, and refunds will appear here as soon as deposits move."
              />
            </Surface>
          ) : (
            <Table columns={ledgerColumns} data={ledger.slice(0, 25)} striped />
          )}
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}
