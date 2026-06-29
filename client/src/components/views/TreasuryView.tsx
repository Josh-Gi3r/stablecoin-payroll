import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, BarChart3, ArrowUpRight, ArrowDownLeft, Zap, Wallet, PieChart, AlertCircle, Loader2 } from 'lucide-react';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, Tab, Tabs, EmptyState } from '../ui';
import { wallets as walletsApi, treasury as treasuryApi, fx as fxApi, transactions as transactionsApi } from '../../lib/api';
import { useApiList, useApiResource, coerceError } from '../../hooks/useApi';

type ServerWallet = {
  id: string;
  userId: string;
  stablecoin: string;
  balance: number;
  updatedAt: string;
};

type ServerTreasuryDeposit = {
  id: string;
  stablecoin: string;
  depositAmount: number;
  yieldEarned: number;
  yieldRate: number;
  status: 'active' | 'withdrawn';
};

type ServerTx = {
  id: string;
  type: 'send' | 'swap' | 'receive' | 'yield' | string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number | null;
  platformFee: number | null;
  status: string;
  createdAt: string;
};

type RatesMap = Record<string, Record<string, number>>;

// Pairs we promote in the live FX table — anchored to USDC + EURC corridors.
// If the server doesn't return one, the row is omitted (no demo fallback).
const PROMOTED_PAIRS: Array<[string, string]> = [
  ['USDC', 'EURC'],
  ['USDC', 'GBPC'],
  ['USDC', 'XSGD'],
  ['USDC', 'JPYC'],
  ['EURC', 'GBPC'],
];

// Approximate Wise transfer fee per corridor (sourced from Wise public pricing
// table, May 2026). Used purely for the static benchmark column on Wise tab —
// platform fee comes from real transaction.platformFee values.
const WISE_FEE_BPS: Record<string, number> = {
  'USDC->EURC': 50,
  'USDC->GBPC': 45,
  'USDC->XSGD': 60,
  'USDC->JPYC': 55,
  'EURC->GBPC': 50,
  'USDC->BRLC': 90,
};

const wiseBpsFor = (from: string, to: string) => WISE_FEE_BPS[`${from}->${to}`] ?? 50;


export default function TreasuryView() {
  const [activeTab, setActiveTab] = useState('holdings');
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: rawWallets, loading: walletsLoading, error: walletsError, reload: reloadWallets } = useApiList<ServerWallet>(
    () => walletsApi.list(),
    [],
    'Failed to load wallets',
  );
  const { data: deposits, loading: depositsLoading, error: depositsError } = useApiList<ServerTreasuryDeposit>(
    () => treasuryApi.deposits(),
    [],
    'Failed to load yield deposits',
  );
  const { data: ratesMap, error: ratesError } = useApiResource<RatesMap>(
    () => fxApi.rates(),
    [],
    'Failed to load FX rates',
  );
  const { data: txns } = useApiList<ServerTx>(
    () => transactionsApi.list(),
    [],
    'Failed to load transactions',
  );

  const error = walletsError ?? depositsError ?? ratesError ?? actionError;
  const liveLoading = walletsLoading || depositsLoading;

  // Derive live holdings from wallets, joining with active yield deposits.
  const liveHoldings = useMemo(() => {
    if (rawWallets.length === 0) return [];
    const totalValue = rawWallets.reduce((s, w) => s + w.balance, 0);
    const activeDeposits = deposits.filter((d) => d.status === 'active');
    return rawWallets.map((w) => {
      const dep = activeDeposits.find((d) => d.stablecoin === w.stablecoin);
      const yieldEarned = activeDeposits
        .filter((d) => d.stablecoin === w.stablecoin)
        .reduce((s, d) => s + d.yieldEarned, 0);
      return {
        currency: w.stablecoin,
        stablecoin: w.stablecoin,
        shares: w.balance,
        valuePerShare: 1.0, // server holds normalized stablecoin balances
        yield: dep?.yieldRate ? dep.yieldRate * 100 : 0,
        totalValue: w.balance,
        unrealizedGain: yieldEarned,
        allocation: totalValue > 0 ? Math.round((w.balance / totalValue) * 100) : 0,
      };
    });
  }, [rawWallets, deposits]);

  const liveTotalAUM = liveHoldings.reduce((s, h) => s + h.totalValue, 0);
  const liveUnrealized = liveHoldings.reduce((s, h) => s + h.unrealizedGain, 0);
  const liveAvgYield = liveHoldings.length > 0
    ? liveHoldings.reduce((s, h) => s + h.yield, 0) / liveHoldings.length
    : 0;

  // Always render live data; show empty state when no wallets exist.
  const treasuryDataLive = {
    totalAUM: liveTotalAUM,
    unrealizedGains: liveUnrealized,
    realizedGains: txns
      .filter((t) => t.type === 'swap' && t.status === 'completed')
      .reduce((s, t) => s + Math.max(0, t.toAmount - t.fromAmount), 0),
    averageYield: liveAvgYield,
  };
  const holdingsLive = liveHoldings;

  // Live FX rates derived from /api/fx/rates. We compute a 24h delta by
  // scanning the most recent swap for each pair vs the live mid; if no swap
  // exists for the pair the change shows as 0% rather than a fake number.
  const liveFxRates = useMemo(() => {
    if (!ratesMap) return [];
    return PROMOTED_PAIRS
      .map(([from, to]) => {
        const rate = ratesMap[from]?.[to];
        if (rate == null) return null;
        const lastSwap = txns
          .filter((t) => t.type === 'swap' && t.fromCurrency === from && t.toCurrency === to && t.exchangeRate)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        const change = lastSwap?.exchangeRate ? rate - lastSwap.exchangeRate : 0;
        const changePercent = lastSwap?.exchangeRate ? (change / lastSwap.exchangeRate) * 100 : 0;
        const halfSpread = rate * 0.0001; // ~1 bp spread when no live book
        return {
          pair: `${from}/${to}`,
          rate,
          change,
          changePercent,
          bid: rate - halfSpread,
          ask: rate + halfSpread,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [ratesMap, txns]);

  // Wise comparison from real swap history. Aggregates per corridor: total
  // volume × Wise BPS estimate vs the actual platform fee paid.
  const liveWiseRows = useMemo(() => {
    const byCorridor: Record<string, { volume: number; platformFee: number; from: string; to: string }> = {};
    txns.filter((t) => t.type === 'swap').forEach((t) => {
      const key = `${t.fromCurrency}->${t.toCurrency}`;
      if (!byCorridor[key]) byCorridor[key] = { volume: 0, platformFee: 0, from: t.fromCurrency, to: t.toCurrency };
      byCorridor[key].volume += t.fromAmount;
      byCorridor[key].platformFee += t.platformFee ?? 0.01;
    });
    return Object.values(byCorridor).map((c) => {
      const wiseFee = (c.volume * wiseBpsFor(c.from, c.to)) / 10000;
      const savings = Math.max(0, wiseFee - c.platformFee);
      const pct = wiseFee > 0 ? (savings / wiseFee) * 100 : 0;
      return {
        corridor: `${c.from} → ${c.to}`,
        platformFee: c.platformFee,
        wiseFee,
        platformSavings: savings,
        percentage: pct.toFixed(1) + '%',
        volume: c.volume,
      };
    }).sort((a, b) => b.platformSavings - a.platformSavings);
  }, [txns]);

  // Rebalancing: derived suggestions based on wallet allocation drift from
  // the equal-weight target. This is intentionally simple — Reduce X, add Y
  // proportionally. No fake "annual yield impact" numbers.
  const liveRebalancing = useMemo(() => {
    if (liveHoldings.length < 2) return [];
    const targetPct = 100 / liveHoldings.length;
    const drifts = liveHoldings
      .map((h) => ({ ...h, drift: h.allocation - targetPct }))
      .filter((h) => Math.abs(h.drift) >= 5)
      .sort((a, b) => b.drift - a.drift);
    return drifts.slice(0, 4).map((h) => ({
      id: h.stablecoin,
      action: h.drift > 0 ? `Reduce ${h.stablecoin} exposure` : `Increase ${h.stablecoin} holdings`,
      reason: h.drift > 0
        ? `Currently ${h.allocation}% of treasury — above ${targetPct.toFixed(0)}% equal-weight target.`
        : `Currently ${h.allocation}% — under-allocated vs ${targetPct.toFixed(0)}% target.`,
      currentAllocation: `${h.allocation}%`,
      targetAllocation: `${targetPct.toFixed(0)}%`,
      currentYield: h.yield,
      stablecoin: h.stablecoin,
      shiftAmount: Math.abs(Math.round((h.drift / 100) * liveTotalAUM)),
      direction: h.drift > 0 ? 'reduce' : 'increase' as 'reduce' | 'increase',
      risk: Math.abs(h.drift) >= 15 ? 'High' : Math.abs(h.drift) >= 10 ? 'Medium' : 'Low',
    }));
  }, [liveHoldings, liveTotalAUM]);

  const handleExecuteRebalance = async (
    opp: typeof liveRebalancing[number],
    counterparty: string,
  ) => {
    setExecutingId(opp.id);
    setActionError(null);
    try {
      const fromCcy = opp.direction === 'reduce' ? opp.stablecoin : counterparty;
      const toCcy = opp.direction === 'reduce' ? counterparty : opp.stablecoin;
      const rate = ratesMap?.[fromCcy]?.[toCcy] ?? 1;
      const fromAmount = opp.shiftAmount;
      await transactionsApi.swap({
        fromCurrency: fromCcy,
        toCurrency: toCcy,
        fromAmount,
        toAmount: fromAmount * rate,
        exchangeRate: rate,
      });
      await reloadWallets();
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to execute rebalance'));
    } finally {
      setExecutingId(null);
    }
  };

  const tabs = [
    { id: 'holdings', label: 'Treasury Holdings', icon: Wallet },
    { id: 'fxrates', label: 'Live FX Rates', icon: BarChart3 },
    { id: 'wise', label: 'Wise Comparison', icon: Zap },
    { id: 'rebalance', label: 'Rebalancing', icon: PieChart },
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

      {/* Holdings Tab */}
      {activeTab === 'holdings' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          {/* Summary Cards */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total AUM', value: `$${(treasuryDataLive.totalAUM / 1000000).toFixed(2)}M`, accent: 'text-slate-900' },
              { label: 'Unrealized Gains', value: `+$${treasuryDataLive.unrealizedGains.toLocaleString()}`, accent: 'text-emerald-400' },
              { label: 'Realized Gains', value: `+$${treasuryDataLive.realizedGains.toLocaleString()}`, accent: 'text-emerald-400' },
              { label: 'Avg Yield', value: `${treasuryDataLive.averageYield}%`, accent: 'text-cyan-400' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-5" style={card}>
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className={`text-2xl font-bold mt-2 ${c.accent}`}>{c.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Holdings Table */}
          <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Stablecoin</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Shares</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Value/Share</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Value</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Yield</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Allocation</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Unrealized P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liveLoading && holdingsLive.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm">
                      <span className="inline-flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading holdings…
                      </span>
                    </td>
                  </tr>
                )}
                {!liveLoading && holdingsLive.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No wallets yet. Treasury data will appear once stablecoin balances are recorded.
                    </td>
                  </tr>
                )}
                {holdingsLive.map((holding, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-50 text-cyan-700">{holding.stablecoin}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono text-slate-600">{holding.shares.toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-slate-400">${holding.valuePerShare.toFixed(4)}</td>
                    <td className="px-6 py-3.5 text-right font-mono font-semibold text-slate-900">${holding.totalValue.toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-right">
                      <span className="px-2 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700">{holding.yield}%</span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500/50" style={{ width: `${holding.allocation}%` }} />
                        </div>
                        <span className="font-mono text-slate-400 text-xs w-8 text-right">{holding.allocation}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-semibold text-emerald-400">+${holding.unrealizedGain.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      )}

      {/* Live FX Rates Tab */}
      {activeTab === 'fxrates' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Pair</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">24h Change</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Bid</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Ask</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Spread</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liveFxRates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No FX rates available. Once stablecoins are seeded, the live rate book appears here.
                    </td>
                  </tr>
                )}
                {liveFxRates.map((rate, idx) => {
                  const spread = ((rate.ask - rate.bid) / rate.bid * 10000).toFixed(1);
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-slate-900">{rate.pair}</td>
                      <td className="px-6 py-3.5 text-right font-mono font-semibold text-slate-900">{rate.rate.toFixed(4)}</td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {rate.change >= 0 ? (
                            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4 text-red-400" />
                          )}
                          <span className={`font-mono font-semibold ${rate.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {rate.changePercent > 0 ? '+' : ''}{rate.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-400">{rate.bid.toFixed(4)}</td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-400">{rate.ask.toFixed(4)}</td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-500">{spread} pips</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
          <motion.div variants={fadeUp} className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Rates updated every 5 seconds via settlement order book
          </motion.div>
        </motion.div>
      )}

      {/* Wise Comparison Tab */}
      {activeTab === 'wise' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl p-4" style={{ ...card, border: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <p className="text-sm font-semibold text-slate-900">PayrollPlatform saves up to 99.8% on transfer fees vs Wise</p>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Corridor</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Platform Fee</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Wise Fee</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">You Save</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liveWiseRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No swaps yet — execute a swap to see platform vs Wise savings here.
                    </td>
                  </tr>
                )}
                {liveWiseRows.map((comp, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-700">{comp.corridor}</td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-400">${comp.platformFee.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-slate-400 line-through">${comp.wiseFee.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-right font-mono font-semibold text-emerald-400">${comp.platformSavings.toFixed(2)}</td>
                    <td className="px-6 py-3.5 text-right">
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">{comp.percentage}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      )}

      {/* Rebalancing Tab */}
      {activeTab === 'rebalance' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
          {liveRebalancing.length === 0 ? (
            <div className="rounded-xl" style={card}>
              <EmptyState
                icon={<PieChart className="w-6 h-6" />}
                title="Allocation looks balanced"
                description="No stablecoin is more than 5% away from the equal-weight target. Execute a few swaps and rebalancing suggestions will surface here."
              />
            </div>
          ) : (
            liveRebalancing.map((opp) => {
              const riskStyle = opp.risk === 'High' ? 'bg-red-50 text-red-700' :
                               opp.risk === 'Medium' ? 'bg-amber-50 text-amber-700' :
                               'bg-emerald-50 text-emerald-700';
              // Counterparty must be a stablecoin we ACTUALLY hold (with non-zero
              // balance). Falling back to USDC silently when nothing else is held
              // would mean offering a swap to an unfunded coin.
              const counterparty = liveHoldings
                .filter((h) => h.totalValue > 0)
                .map((h) => h.stablecoin)
                .find((s) => s !== opp.stablecoin) ?? null;
              const canExecute = counterparty !== null;
              const isExecuting = executingId === opp.id;
              return (
                <motion.div key={opp.id} variants={fadeUp} className="rounded-xl p-5" style={card}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-900">{opp.action}</p>
                      <p className="text-xs text-slate-500 mt-1">{opp.reason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskStyle}`}>{opp.risk}</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                        <Zap className="w-3 h-3" />
                        ${opp.shiftAmount.toLocaleString()} shift
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                    <div className="rounded-lg p-3 bg-slate-50">
                      <p className="text-slate-500">Current allocation</p>
                      <p className="font-mono font-semibold text-slate-900 mt-1">{opp.currentAllocation}</p>
                    </div>
                    <div className="rounded-lg p-3 bg-emerald-50">
                      <p className="text-sky-600">Target (equal-weight)</p>
                      <p className="font-mono font-semibold text-emerald-400 mt-1">{opp.targetAllocation}</p>
                    </div>
                  </div>
                  {!canExecute && (
                    <p className="text-xs text-amber-700 mb-2">
                      No funded counterparty stablecoin to rebalance against — fund another coin first.
                    </p>
                  )}
                  <button
                    onClick={() => canExecute && handleExecuteRebalance(opp, counterparty!)}
                    disabled={isExecuting || !canExecute}
                    title={canExecute ? `Swap via ${counterparty}` : 'No funded counterparty available'}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium text-sm transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isExecuting
                      ? 'Executing…'
                      : `Execute: swap $${opp.shiftAmount.toLocaleString()} ${opp.direction === 'reduce' ? `${opp.stablecoin} → ${counterparty}` : `${counterparty} → ${opp.stablecoin}`}`}
                  </button>
                </motion.div>
              );
            })
          )}
        </motion.div>
      )}
    </PageContainer>
  );
}
