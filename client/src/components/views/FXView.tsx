import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, ArrowUpDown, TrendingUp, TrendingDown, Clock, Zap, BarChart3, AlertCircle, Loader2 } from 'lucide-react';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { Button, PageContainer, Tab, Table, Tabs, type Column } from '../ui';
import { fx as fxApi, transactions as transactionsApi } from '../../lib/api';
import { useApiList, useApiResource, coerceError } from '../../hooks/useApi';

type ServerTx = {
  id: string;
  type: 'send' | 'swap' | 'receive';
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  platformFee: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
};

type FxRates = Record<string, Record<string, number>>;

const FXView = () => {
  const [activeTab, setActiveTab] = useState('fx');
  const [fromCurrency, setFromCurrency] = useState('USDT');
  const [toCurrency, setToCurrency] = useState('Stablecoin');
  const [fxAmount, setFxAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: rates, error: ratesError } = useApiResource<FxRates>(
    () => fxApi.rates(),
    [],
    'Failed to load FX rates',
  );

  const { data: txs, error: txsError, reload: reloadTxs } = useApiList<ServerTx>(
    () => transactionsApi.list(),
    [],
    'Failed to load transactions',
  );

  const error = ratesError ?? txsError ?? submitError;

  // Build popularPairs from live FX rates if available (top 5 currency pairs).
  const popularPairs = useMemo(() => {
    if (!rates) return [] as { from: string; to: string; rate: number; change: number; volume: string }[];
    const pairs: { from: string; to: string; rate: number; change: number; volume: string }[] = [];
    const symbols = Object.keys(rates).slice(0, 4);
    for (const a of symbols) {
      for (const b of symbols) {
        if (a === b) continue;
        if (pairs.length >= 5) break;
        const r = rates[a]?.[b];
        if (r) pairs.push({ from: a, to: b, rate: r, change: 0, volume: '—' });
      }
    }
    return pairs;
  }, [rates]);

  const stablecoins = useMemo(() => {
    return rates ? Object.keys(rates) : ['USDT', 'Stablecoin', 'xSGD', 'USDC', 'EURC'];
  }, [rates]);

  const recentFX = useMemo(
    () =>
      txs
        .filter((t) => t.type === 'swap')
        .slice(0, 10)
        .map((t) => ({
          id: t.id,
          from: t.fromCurrency,
          to: t.toCurrency,
          amountIn: t.fromAmount,
          amountOut: t.toAmount,
          rate: t.exchangeRate,
          date: t.createdAt.slice(0, 16).replace('T', ' '),
          fee: t.platformFee,
        })),
    [txs],
  );

  const currentRate = rates?.[fromCurrency]?.[toCurrency] ?? 1;
  const estimatedOutput = fxAmount ? (parseFloat(fxAmount) * currentRate).toFixed(2) : '0.00';

  const handleExecute = async () => {
    const amt = Number(fxAmount) || 0;
    if (amt <= 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await transactionsApi.swap({
        type: 'swap',
        fromCurrency,
        toCurrency,
        fromAmount: amt,
        toAmount: amt * currentRate,
        exchangeRate: currentRate,
      });
      setFxAmount('');
      await reloadTxs();
    } catch (e: any) {
      setSubmitError(coerceError(e, 'Failed to execute FX swap'));
    } finally {
      setSubmitting(false);
    }
  };

  const flipCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const tabs = [
    { id: 'fx', label: 'FX Exchange', icon: ArrowRightLeft },
    { id: 'history', label: 'FX History', icon: Clock },
    { id: 'rates', label: 'Live Rates', icon: BarChart3 },
  ];

  return (
    <PageContainer>
      {/* Tabs */}
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

      {/* FX Exchange Tab */}
      {activeTab === 'fx' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* FX Form - 3 cols */}
          <motion.div variants={fadeUp} className="lg:col-span-3 rounded-xl p-6" style={{ ...card, border: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--bg-accent-soft)', border: '1px solid var(--border-default)' }}>
                <ArrowRightLeft className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">FX Exchange</h3>
                <p className="text-xs text-slate-500">Convert stablecoins at live rates — $0.01 flat fee</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* From */}
              <div className="rounded-xl p-4 bg-slate-50">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-500">You send</label>
                  <span className="text-xs text-slate-500">Balance: 500,000 {fromCurrency}</span>
                </div>
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    placeholder="0.00"
                    value={fxAmount}
                    onChange={(e) => setFxAmount(e.target.value)}
                    className="flex-1 bg-transparent text-2xl font-bold text-slate-900 font-mono outline-none placeholder-slate-400"
                  />
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-sm font-bold focus:outline-none"
                  >
                    {stablecoins.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Flip Button */}
              <div className="flex justify-center -my-1 relative z-10">
                <button
                  onClick={flipCurrencies}
                  className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center transition-all hover:border-sky-300 hover:bg-sky-50"
                  style={{ background: '#ffffff' }}
                >
                  <ArrowUpDown className="w-4 h-4 text-sky-600" />
                </button>
              </div>

              {/* To */}
              <div className="rounded-xl p-4 bg-slate-50">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-500">You receive (estimated)</label>
                  <span className="text-xs text-slate-500">Balance: 120,000 {toCurrency}</span>
                </div>
                <div className="flex gap-3 items-center">
                  <p className="flex-1 text-2xl font-bold text-slate-600 font-mono">{estimatedOutput}</p>
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 text-sm font-bold focus:outline-none"
                  >
                    {stablecoins.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rate & Fee */}
              <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Rate</p>
                    <p className="text-sm font-bold text-slate-900 font-mono mt-1">1 {fromCurrency} = {currentRate.toFixed(4)} {toCurrency}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Fee</p>
                    <p className="text-sm font-bold text-emerald-600 font-mono mt-1">$0.01</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Slippage</p>
                    <p className="text-sm font-bold text-slate-900 font-mono mt-1">{'<'}0.01%</p>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRightLeft className="w-5 h-5" />}
                onClick={handleExecute}
                disabled={submitting || !fxAmount}
              >
                {submitting ? 'Executing…' : 'Execute FX'}
              </Button>
            </div>
          </motion.div>

          {/* Popular Pairs - 2 cols */}
          <motion.div variants={fadeUp} className="lg:col-span-2 space-y-3">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Common Pairs</h4>
            {popularPairs.map((pair, i) => (
              <div
                key={i}
                className="rounded-xl p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                style={card}
                onClick={() => { setFromCurrency(pair.from); setToCurrency(pair.to); }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{pair.from} → {pair.to}</p>
                    <p className="text-xs text-slate-500 mt-1">Vol: ${pair.volume}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-slate-900">{pair.rate}</p>
                    <div className={`flex items-center gap-1 justify-end mt-1 ${pair.change >= 0 ? 'text-sky-600' : 'text-red-400'}`}>
                      {pair.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span className="text-xs font-mono">{pair.change > 0 ? '+' : ''}{pair.change}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Recent FX preview (FX Exchange tab only) */}
      {activeTab === 'fx' && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Recent FX</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last 4 conversions</p>
            </div>
            <button
              onClick={() => setActiveTab('history')}
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--sky-700)' }}
            >
              View all →
            </button>
          </div>
          <Table
            columns={[
              { key: 'id', label: 'Reference', cardTitle: true, className: 'font-mono' },
              {
                key: 'pair',
                label: 'Pair',
                render: (r) => `${r.from} → ${r.to}`,
              },
              {
                key: 'amountIn',
                label: 'Sent',
                align: 'right',
                className: 'font-mono tabular-nums',
                render: (r) => `${r.amountIn.toLocaleString()} ${r.from}`,
              },
              {
                key: 'amountOut',
                label: 'Received',
                align: 'right',
                className: 'font-mono tabular-nums',
                render: (r) => `${r.amountOut.toLocaleString()} ${r.to}`,
              },
              { key: 'rate', label: 'Rate', align: 'right', className: 'font-mono tabular-nums' },
              { key: 'date', label: 'Date', className: 'tabular-nums whitespace-nowrap' },
            ]}
            data={recentFX}
          />
        </motion.div>
      )}

      {/* FX History Tab */}
      {activeTab === 'history' && (
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Pair</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Sent</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Received</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentFX.map((fx) => (
                  <tr key={fx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-emerald-600 text-xs">{fx.id}</td>
                    <td className="px-6 py-3.5">
                      <span className="font-medium text-slate-900">{fx.from}</span>
                      <span className="text-slate-400 mx-1.5">→</span>
                      <span className="font-medium text-slate-900">{fx.to}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono text-slate-700">{fx.amountIn.toLocaleString()} <span className="text-slate-400">{fx.from}</span></td>
                    <td className="px-6 py-3.5 text-right font-mono text-emerald-600">{fx.amountOut.toLocaleString()} <span className="text-slate-400">{fx.to}</span></td>
                    <td className="px-6 py-3.5 text-right font-mono text-slate-400">{fx.rate}</td>
                    <td className="px-6 py-3.5 text-slate-400">{fx.date}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-emerald-600">${fx.fee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      )}

      {/* Live Rates Tab */}
      {activeTab === 'rates' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {popularPairs.map((pair, i) => (
              <div key={i} className="rounded-xl p-5" style={card}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-slate-900 text-lg">{pair.from}/{pair.to}</p>
                  <div className={`flex items-center gap-1 ${pair.change >= 0 ? 'text-sky-600' : 'text-red-400'}`}>
                    {pair.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-sm font-mono">{pair.change > 0 ? '+' : ''}{pair.change}%</span>
                  </div>
                </div>
                <p className="text-2xl font-bold font-mono text-slate-900">{pair.rate}</p>
                <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                  <span>24h Vol: ${pair.volume}</span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-sky-600" />
                    $0.01 fee
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </PageContainer>
  );
};

export default FXView;
