import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Download } from 'lucide-react';
import { PageContainer, Tab, Tabs, ErrorBanner, LoadingState, EmptyState } from '../ui';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { transactions as transactionsApi } from '../../lib/api';
import { useApiList } from '../../hooks/useApi';

type ServerTx = {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'yield';
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number | null;
  platformFee: number | null;
  status: 'pending' | 'confirmed' | 'failed' | string;
  createdAt: string;
  completedAt: string | null;
};

const TAX_RATE = 0.21;

export default function FXReportingView() {
  const [activeTab, setActiveTab] = useState('transactions');

  const { data: allTx, loading, error, reload } = useApiList<ServerTx>(
    () => transactionsApi.list(),
    [],
    'Failed to load FX transactions',
  );

  const swaps = useMemo(() => allTx.filter((t) => t.type === 'swap'), [allTx]);

  // Per-row gain/loss = toAmount - fromAmount when both legs are settled.
  // Negative = loss; positive = gain. Same-currency swaps shouldn't happen but
  // are guarded by treating zero diff as no-op.
  const rows = useMemo(
    () =>
      swaps.map((tx) => {
        const delta = tx.toAmount - tx.fromAmount;
        return {
          ...tx,
          realized: delta,
          gain: delta > 0 ? delta : 0,
          loss: delta < 0 ? delta : 0,
          year: tx.createdAt.slice(0, 4),
        };
      }),
    [swaps],
  );

  const totalGains = rows.reduce((s, r) => s + r.gain, 0);
  const totalLosses = rows.reduce((s, r) => s + r.loss, 0);
  const netGain = totalGains + totalLosses;

  const taxImpact = useMemo(() => {
    const byYear: Record<string, { realized_gains: number; realized_losses: number }> = {};
    rows.forEach((r) => {
      if (!byYear[r.year]) byYear[r.year] = { realized_gains: 0, realized_losses: 0 };
      byYear[r.year].realized_gains += r.gain;
      byYear[r.year].realized_losses += r.loss;
    });
    return Object.entries(byYear)
      .map(([year, v]) => {
        const net = v.realized_gains + v.realized_losses;
        return {
          year,
          realized_gains: v.realized_gains,
          realized_losses: Math.abs(v.realized_losses),
          net_gain: net,
          tax_rate: Math.round(TAX_RATE * 100),
          tax_liability: Math.max(0, net) * TAX_RATE,
        };
      })
      .sort((a, b) => b.year.localeCompare(a.year));
  }, [rows]);

  const tabs = [
    { id: 'transactions', label: 'FX Transactions' },
    { id: 'tax', label: 'Tax Impact' },
    { id: 'hedge', label: 'Hedge Analysis' },
  ];

  return (
    <PageContainer>
      <Tabs value={activeTab} onChange={setActiveTab}>
        {tabs.map((tab) => (
          <Tab key={tab.id} value={tab.id} label={tab.label} />
        ))}
      </Tabs>

      <ErrorBanner message={error} onRetry={reload} />

      {loading && allTx.length === 0 && (
        <div className="rounded-xl" style={card}>
          <LoadingState label="Loading FX transactions…" />
        </div>
      )}

      {activeTab === 'transactions' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Realized Gains', value: `$${totalGains.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, sub: `${rows.filter((t) => t.gain > 0).length} swaps`, accent: 'text-emerald-400' },
              { label: 'Realized Losses', value: `$${Math.abs(totalLosses).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, sub: `${rows.filter((t) => t.loss < 0).length} swaps`, accent: 'text-red-400' },
              { label: 'Net FX Gain/Loss', value: `$${netGain.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, sub: `Across ${rows.length} swaps`, accent: netGain >= 0 ? 'text-emerald-400' : 'text-red-400' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-5" style={card}>
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className={`text-2xl font-bold mt-2 ${c.accent}`}>{c.value}</p>
                <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </motion.div>

          {!loading && rows.length === 0 && (
            <div className="rounded-xl" style={card}>
              <EmptyState
                title="No FX swaps yet"
                description="Transactions of type 'swap' will appear here once treasury activity begins."
              />
            </div>
          )}

          {rows.length > 0 && (
            <motion.div variants={fadeUp} className="rounded-xl overflow-x-auto" style={card}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">From/To</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Rate</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Gain/Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((tx) => {
                    const isGain = tx.realized > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3.5 text-slate-400 font-mono text-xs">{tx.createdAt.slice(0, 10)}</td>
                        <td className="px-6 py-3.5 font-medium text-slate-900">
                          <span className="text-cyan-400">{tx.fromCurrency}</span>
                          <span className="text-slate-500 mx-1">&rarr;</span>
                          <span className="text-cyan-400">{tx.toCurrency}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-slate-900">{tx.fromAmount.toLocaleString()}</td>
                        <td className="px-6 py-3.5 text-right font-mono text-slate-400">{tx.exchangeRate?.toFixed(4) ?? '—'}</td>
                        <td className="px-6 py-3.5"><span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 capitalize">{tx.status}</span></td>
                        <td className="px-6 py-3.5 text-right">
                          <div className={`flex items-center justify-end gap-1 font-mono font-semibold ${tx.realized === 0 ? 'text-slate-400' : isGain ? 'text-emerald-400' : 'text-red-400'}`}>
                            {tx.realized > 0 && <TrendingUp className="w-4 h-4" />}
                            {tx.realized < 0 && <TrendingDown className="w-4 h-4" />}
                            {tx.realized === 0 ? '—' : `$${Math.abs(tx.realized).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          )}
        </motion.div>
      )}

      {activeTab === 'tax' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          {taxImpact.length === 0 ? (
            <div className="rounded-xl" style={card}>
              <EmptyState
                title="No tax impact yet"
                description="Once realized FX gains or losses post, year-by-year tax impact will appear here."
              />
            </div>
          ) : (
            <motion.div variants={fadeUp} className="rounded-xl overflow-x-auto" style={card}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Year</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Realized Gains</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Realized Losses</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Gain</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Tax Rate</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Tax Liability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {taxImpact.map((y) => (
                    <tr key={y.year} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-slate-900">{y.year}</td>
                      <td className="px-6 py-3.5 text-right font-mono text-emerald-400">${y.realized_gains.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-3.5 text-right font-mono text-red-400">${y.realized_losses.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-3.5 text-right font-mono font-semibold text-slate-900">${y.net_gain.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-3.5 text-right"><span className="px-2 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700">{y.tax_rate}%</span></td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-amber-400">${y.tax_liability.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </motion.div>
      )}

      {activeTab === 'hedge' && (
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="rounded-xl" style={card}>
            <EmptyState
              title="Hedge analysis coming soon"
              description="Currency exposure rollups and hedge recommendations require the FX risk engine, which isn't wired up yet."
            />
          </motion.div>
        </motion.div>
      )}

      <div className="flex justify-end">
        <button
          disabled={rows.length === 0}
          onClick={() => {
            const header = ['date', 'from', 'to', 'from_amount', 'to_amount', 'rate', 'status', 'realized_gain_loss', 'platform_fee'];
            const escape = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const csvRows = rows.map((r) => [
              r.createdAt.slice(0, 10),
              r.fromCurrency,
              r.toCurrency,
              r.fromAmount,
              r.toAmount,
              r.exchangeRate?.toFixed(6) ?? '',
              r.status,
              r.realized.toFixed(2),
              r.platformFee ?? 0,
            ]);
            const taxRows = taxImpact.map((y) => ['YEAR ' + y.year, '', '', '', '', '', '', `gains=${y.realized_gains.toFixed(2)} losses=${y.realized_losses.toFixed(2)} net=${y.net_gain.toFixed(2)} tax=${y.tax_liability.toFixed(2)}`, '']);
            const csv = [header, ...csvRows, [], ...taxRows].map((r) => r.map(escape).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `fx-report-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium text-sm transition-all disabled:opacity-60"
        >
          <Download className="w-4 h-4" />Export FX Report (CSV)
        </button>
      </div>
    </PageContainer>
  );
}
