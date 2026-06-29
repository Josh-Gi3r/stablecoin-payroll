import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, TrendingUp, DollarSign, Filter, Download, AlertCircle, Loader2 } from 'lucide-react';
import { PageContainer, Tab, Tabs, EmptyState } from '../ui';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { accounting as accountingApi } from '../../lib/api';
import { useApiList } from '../../hooks/useApi';

type ServerJournalEntry = {
  id: string;
  entryDate: string;
  description: string;
  status: 'draft' | 'pending-approval' | 'approved' | 'posted';
};

type ServerAccount = {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subType?: string | null;
  balance: number;
  currency: string;
  status: 'active' | 'inactive';
};

const fmtMoney = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function AccountingView() {
  const [activeTab, setActiveTab] = useState('gl');
  const [filterAccount, setFilterAccount] = useState('');

  const { data: glEntries, loading: glLoading, error: glError } = useApiList<ServerJournalEntry>(
    () => accountingApi.journal(),
    [],
    'Failed to load journal entries',
  );
  const { data: accounts, loading: chartLoading, error: chartError } = useApiList<ServerAccount>(
    () => accountingApi.chart(),
    [],
    'Failed to load chart of accounts',
  );

  const error = glError ?? chartError;
  const loading = glLoading || chartLoading;

  const filteredEntries = filterAccount
    ? glEntries.filter((e) => e.description.toLowerCase().includes(filterAccount.toLowerCase()))
    : glEntries;

  // Derive P&L, Balance Sheet, Tax tracking from the live chart of accounts.
  // No hardcoded values — empty chart shows the empty state.
  const grouped = useMemo(() => {
    const by = (t: ServerAccount['accountType']) => accounts.filter((a) => a.accountType === t && a.status === 'active');
    return {
      revenue:    by('revenue'),
      expense:    by('expense'),
      assets:     by('asset'),
      liabilities: by('liability'),
      equity:     by('equity'),
    };
  }, [accounts]);

  const totalRevenue   = grouped.revenue.reduce((s, a) => s + a.balance, 0);
  const totalExpense   = grouped.expense.reduce((s, a) => s + a.balance, 0);
  const totalAssets    = grouped.assets.reduce((s, a) => s + a.balance, 0);
  const totalLiab      = grouped.liabilities.reduce((s, a) => s + a.balance, 0);
  const totalEquity    = grouped.equity.reduce((s, a) => s + a.balance, 0);
  const netIncome      = totalRevenue - totalExpense;
  // Tax tracking: any expense account whose name or subType includes "tax".
  const taxAccounts = grouped.expense.filter((a) =>
    /tax|levy|gst|vat|pcb|epf|socso|cpf|sdl/i.test(a.accountName) || /tax/i.test(a.subType ?? ''),
  );
  const totalTaxLiability = taxAccounts.reduce((s, a) => s + a.balance, 0);

  // Server doesn't return per-entry debit/credit on the entry itself; line
  // items live in journal_line_items. Until those land in the list payload
  // we display zeros to avoid pretending to balance.
  const totalDebit = 0;
  const totalCredit = 0;

  const handleExportGL = () => {
    const header = ['date', 'description', 'reference', 'status'];
    const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const rows = filteredEntries.map((e) => [e.entryDate, e.description, e.id, e.status]);
    const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `general-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'gl', label: 'General Ledger', icon: BookOpen },
    { id: 'pnl', label: 'P&L Statement', icon: TrendingUp },
    { id: 'bs', label: 'Balance Sheet', icon: DollarSign },
    { id: 'tax', label: 'Tax Tracking' },
  ];

  return (
    <PageContainer>
      <Tabs value={activeTab} onChange={setActiveTab}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return <Tab key={tab.id} value={tab.id} label={tab.label} icon={Icon ? <Icon className="w-4 h-4" /> : undefined} />;
        })}
      </Tabs>

      {error && (
        <div
          className="rounded-xl px-3 py-2 flex items-center gap-2 text-sm"
          style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid var(--error)', color: 'var(--error)' }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {activeTab === 'gl' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="flex gap-3 items-center">
            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={card}>
              <Filter className="w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Filter by account..." value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder-slate-500" />
            </div>
            <button
              onClick={handleExportGL}
              disabled={filteredEntries.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium text-sm disabled:opacity-60"
            >
              <Download className="w-4 h-4" />Export GL
            </button>
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm">
                      <span className="inline-flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading journal entries…
                      </span>
                    </td>
                  </tr>
                )}
                {!loading && filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No journal entries yet.
                    </td>
                  </tr>
                )}
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 text-slate-400">{entry.entryDate}</td>
                    <td className="px-6 py-3.5 font-medium text-slate-700">{entry.description}</td>
                    <td className="px-6 py-3.5 text-xs font-mono text-slate-500">{entry.id}</td>
                    <td className="px-6 py-3.5"><span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">{entry.status}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-sky-200 bg-emerald-50">
                  <td className="px-6 py-3.5 text-right font-bold text-slate-900" colSpan={2}>TOTALS</td>
                  <td colSpan={2} className="px-6 py-3.5 text-right font-mono font-bold text-emerald-400">{filteredEntries.length} entries</td>
                </tr>
              </tfoot>
            </table>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Debits', value: fmtMoney(totalDebit), accent: 'text-slate-900' },
              { label: 'Total Credits', value: fmtMoney(totalCredit), accent: 'text-slate-900' },
              { label: 'Balance', value: fmtMoney(Math.abs(totalDebit - totalCredit)), accent: Math.abs(totalDebit - totalCredit) < 0.01 ? 'text-emerald-400' : 'text-red-400' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-5" style={card}>
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className={`text-2xl font-bold mt-2 ${c.accent}`}>{c.value}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'pnl' && (
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="rounded-xl p-6" style={card}>
            <h3 className="text-lg font-bold text-slate-900 mb-6">Income Statement (P&L)</h3>
            {grouped.revenue.length === 0 && grouped.expense.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="w-6 h-6" />}
                title="No revenue or expense accounts yet"
                description="Once the chart of accounts is seeded, revenue and expense balances will roll up here."
              />
            ) : (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-4">
                  <p className="font-semibold text-slate-900 mb-3">Revenue</p>
                  <div className="space-y-2 ml-4">
                    {grouped.revenue.map((a) => (
                      <div key={a.id} className="flex justify-between text-emerald-400">
                        <p className="text-sm">{a.accountNumber} — {a.accountName}</p>
                        <p className="font-mono">+{fmtMoney(a.balance)}</p>
                      </div>
                    ))}
                    <div className="flex justify-between text-slate-900 font-semibold pt-2 border-t border-slate-100">
                      <p>Total Revenue</p>
                      <p className="font-mono text-emerald-400">+{fmtMoney(totalRevenue)}</p>
                    </div>
                  </div>
                </div>
                <div className="border-b border-slate-200 pb-4">
                  <p className="font-semibold text-slate-900 mb-3">Operating Expenses</p>
                  <div className="space-y-2 ml-4">
                    {grouped.expense.map((a) => (
                      <div key={a.id} className="flex justify-between text-slate-400">
                        <p className="text-sm">{a.accountNumber} — {a.accountName}</p>
                        <p className="font-mono">-{fmtMoney(a.balance)}</p>
                      </div>
                    ))}
                    <div className="flex justify-between text-slate-900 font-semibold pt-2 border-t border-slate-100">
                      <p>Total Expenses</p>
                      <p className="font-mono">-{fmtMoney(totalExpense)}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl p-4" style={{ ...card, border: '1px solid var(--border-default)' }}>
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-lg text-slate-900">Net Income</p>
                    <p className={`font-bold text-2xl font-mono ${netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(netIncome)}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'bs' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={fadeUp} className="rounded-xl p-6" style={card}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Assets</h3>
            {grouped.assets.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No asset accounts yet.</p>
            ) : (
              <div className="space-y-3">
                {grouped.assets.map((a) => (
                  <div key={a.id} className="flex justify-between items-center py-2 border-b border-slate-100">
                    <p className="text-slate-400 text-sm">{a.accountNumber} — {a.accountName}</p>
                    <p className="font-mono font-semibold text-slate-900">{fmtMoney(a.balance)}</p>
                  </div>
                ))}
                <div className="flex justify-between items-center py-3 px-3 rounded-lg bg-emerald-50 font-bold">
                  <p className="text-slate-900">Total Assets</p>
                  <p className="font-mono text-emerald-400">{fmtMoney(totalAssets)}</p>
                </div>
              </div>
            )}
          </motion.div>
          <div className="space-y-6">
            <motion.div variants={fadeUp} className="rounded-xl p-6" style={card}>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Liabilities</h3>
              {grouped.liabilities.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No liability accounts yet.</p>
              ) : (
                <div className="space-y-3">
                  {grouped.liabilities.map((l) => (
                    <div key={l.id} className="flex justify-between items-center py-2 border-b border-slate-100">
                      <p className="text-slate-400 text-sm">{l.accountNumber} — {l.accountName}</p>
                      <p className="font-mono font-semibold text-slate-900">{fmtMoney(l.balance)}</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-3 px-3 rounded-lg bg-amber-50 font-bold">
                    <p className="text-slate-900">Total Liabilities</p>
                    <p className="font-mono text-amber-400">{fmtMoney(totalLiab)}</p>
                  </div>
                </div>
              )}
            </motion.div>
            <motion.div variants={fadeUp} className="rounded-xl p-6" style={card}>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Equity</h3>
              {grouped.equity.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No equity accounts yet.</p>
              ) : (
                <div className="space-y-3">
                  {grouped.equity.map((e) => (
                    <div key={e.id} className="flex justify-between items-center py-2 border-b border-slate-100">
                      <p className="text-slate-400 text-sm">{e.accountNumber} — {e.accountName}</p>
                      <p className="font-mono font-semibold text-slate-900">{fmtMoney(e.balance)}</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-3 px-3 rounded-lg bg-cyan-50 font-bold">
                    <p className="text-slate-900">Total Equity</p>
                    <p className="font-mono text-cyan-400">{fmtMoney(totalEquity)}</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}

      {activeTab === 'tax' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Tax Account</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Currency</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Tax Liability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxAccounts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No tax-tagged expense accounts yet. Tag accounts in the chart of accounts with a "Tax" sub-type and they'll roll up here.
                    </td>
                  </tr>
                )}
                {taxAccounts.map((tax) => (
                  <tr key={tax.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-700">{tax.accountNumber} — {tax.accountName}</td>
                    <td className="px-6 py-3.5 text-slate-400">{tax.subType ?? 'Tax'}</td>
                    <td className="px-6 py-3.5 font-mono text-slate-400">{tax.currency}</td>
                    <td className="px-6 py-3.5 text-right font-mono font-semibold text-slate-900">{fmtMoney(tax.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
          <motion.div variants={fadeUp} className="rounded-xl p-4" style={{ ...card, border: '1px solid var(--border-default)' }}>
            <div className="flex justify-between items-center">
              <p className="font-semibold text-slate-900">Total Tax Liability</p>
              <p className="font-mono font-bold text-lg text-amber-400">{fmtMoney(totalTaxLiability)}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </PageContainer>
  );
}
