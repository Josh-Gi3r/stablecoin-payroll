import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Send, ArrowRightLeft, Plus, Eye, Trash2, DollarSign, X, Loader2 } from 'lucide-react';
import { PageContainer, Tab, Tabs, ErrorBanner, LoadingState, EmptyState, Button } from '../ui';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { invoices as invoicesApi, clients as clientsApi, transactions as transactionsApi } from '../../lib/api';
import { useApiList, coerceError } from '../../hooks/useApi';

type ServerInvoice = {
  id: string;
  invoiceNumber: string;
  clientId: string | null;
  customerId: string | null;
  issueDate: string | null;
  dueDate: string | null;
  currency: string;
  status: 'draft' | 'sent' | 'viewed' | 'partially-paid' | 'paid' | 'overdue' | string;
  total: number;
  amountDue: number;
};

type ServerClient = { id: string; name: string };

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];




const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px' }}>
      <p style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontSize: 14, fontWeight: 600, fontFamily: 'monospace' }}>${(p.value / 1000000).toFixed(2)}M</p>
      ))}
    </div>
  );
};

export default function InvoicingView() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'revenue' | 'settlement'>('invoices');

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ clientId: '', total: '', currency: 'MYR', dueDate: '' });

  // View modal state
  const [viewing, setViewing] = useState<ServerInvoice | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Settlement form state
  const [settlementInvoiceId, setSettlementInvoiceId] = useState('');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settling, setSettling] = useState(false);
  const [swapFrom, setSwapFrom] = useState('');
  const [swapTo, setSwapTo] = useState('');
  const [swapFromCurrency, setSwapFromCurrency] = useState('USDC');
  const [swapToCurrency, setSwapToCurrency] = useState('EURC');
  const [swapping, setSwapping] = useState(false);

  const { data: invoices, loading, error: loadError, reload } = useApiList<ServerInvoice>(
    () => invoicesApi.list(),
    [],
    'Failed to load invoices',
  );

  const error = loadError ?? createError ?? actionError;
  const { data: clients } = useApiList<ServerClient>(
    () => clientsApi.list(),
    [],
    'Failed to load clients',
  );

  const clientNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clients) m.set(c.id, c.name);
    return m;
  }, [clients]);

  const resetDraft = () => setDraft({ clientId: '', total: '', currency: 'MYR', dueDate: '' });

  const handleCreate = async () => {
    if (!draft.clientId || !draft.total || Number(draft.total) <= 0) {
      setCreateError('Pick a client and enter a positive total.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await invoicesApi.create({
        clientId: draft.clientId,
        currency: draft.currency,
        total: Number(draft.total),
        amountDue: Number(draft.total),
        issueDate: today,
        dueDate: draft.dueDate || today,
        status: 'draft',
      });
      resetDraft();
      setShowCreate(false);
      await reload();
    } catch (e: any) {
      setCreateError(coerceError(e, 'Failed to create invoice'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (inv: ServerInvoice) => {
    if (!window.confirm(`Delete ${inv.invoiceNumber}? This cannot be undone.`)) return;
    setDeletingId(inv.id);
    setActionError(null);
    try {
      await invoicesApi.remove(inv.id);
      await reload();
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to delete invoice'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSettlePayment = async () => {
    const inv = invoices.find((i) => i.id === settlementInvoiceId);
    if (!inv) {
      setActionError('Pick an invoice to settle.');
      return;
    }
    const amount = Number(settlementAmount) || inv.amountDue || inv.total;
    if (amount <= 0) {
      setActionError('Enter a positive settlement amount.');
      return;
    }
    setSettling(true);
    setActionError(null);
    try {
      await transactionsApi.send({
        type: 'send',
        fromCurrency: inv.currency,
        toCurrency: inv.currency,
        fromAmount: amount,
        toAmount: amount,
        recipientAddress: `invoice:${inv.id}`,
        memo: `Payment for ${inv.invoiceNumber}`,
      });
      const newAmountDue = Math.max(0, (inv.amountDue ?? inv.total) - amount);
      await invoicesApi.update(inv.id, {
        amountDue: newAmountDue,
        status: newAmountDue === 0 ? 'paid' : 'partially-paid',
      });
      setSettlementAmount('');
      setSettlementInvoiceId('');
      await reload();
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to send settlement'));
    } finally {
      setSettling(false);
    }
  };

  const handleSwap = async () => {
    const fromAmt = Number(swapFrom);
    const toAmt = Number(swapTo);
    if (fromAmt <= 0 || toAmt <= 0) {
      setActionError('Enter both From and To amounts to execute a swap.');
      return;
    }
    setSwapping(true);
    setActionError(null);
    try {
      await transactionsApi.swap({
        fromCurrency: swapFromCurrency,
        toCurrency: swapToCurrency,
        fromAmount: fromAmt,
        toAmount: toAmt,
        exchangeRate: toAmt / fromAmt,
      });
      setSwapFrom('');
      setSwapTo('');
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to execute swap'));
    } finally {
      setSwapping(false);
    }
  };

  // Revenue chart: sum invoice totals + paid amounts per month, last 6 months.
  const revenueData = useMemo(() => {
    const byMonth: Record<string, { revenue: number; invoiced: number }> = {};
    invoices.forEach((inv) => {
      const month = inv.issueDate?.slice(0, 7);
      if (!month) return;
      if (!byMonth[month]) byMonth[month] = { revenue: 0, invoiced: 0 };
      byMonth[month].invoiced += inv.total;
      if (inv.status === 'paid') byMonth[month].revenue += inv.total;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, v]) => ({
        month: MONTH_NAMES[parseInt(month.slice(5, 7), 10) - 1] ?? month,
        revenue: v.revenue,
        invoiced: v.invoiced,
      }));
  }, [invoices]);

  // Pie: count invoices by status bucket.
  const invoiceStatus = useMemo(() => {
    const buckets = { Paid: 0, Pending: 0, Overdue: 0 };
    invoices.forEach((inv) => {
      if (inv.status === 'paid') buckets.Paid++;
      else if (inv.status === 'overdue') buckets.Overdue++;
      else buckets.Pending++;
    });
    return [
      { name: 'Paid',    value: buckets.Paid,    color: 'var(--sky-500)' },
      { name: 'Pending', value: buckets.Pending, color: '#f59e0b' },
      { name: 'Overdue', value: buckets.Overdue, color: '#ef4444' },
    ].filter((b) => b.value > 0);
  }, [invoices]);

  const statusPillClass = (s: string) =>
    s === 'paid' ? 'bg-emerald-50 text-emerald-700'
      : s === 'overdue' ? 'bg-red-50 text-red-700'
        : 'bg-amber-50 text-amber-700';

  const tabs = [
    { id: 'invoices' as const, label: 'Invoice Management', icon: FileText },
    { id: 'revenue' as const, label: 'Revenue Tracking', icon: DollarSign },
    { id: 'settlement' as const, label: 'Payment Settlement', icon: Send },
  ];

  return (
    <PageContainer>
      <Tabs value={activeTab} onChange={setActiveTab}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return <Tab key={tab.id} value={tab.id} label={tab.label} icon={<Icon className="w-4 h-4" />} />;
        })}
      </Tabs>

      <ErrorBanner message={error} />

      {activeTab === 'invoices' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Active Invoices</h3>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium text-sm"><Plus className="w-4 h-4" />Create Invoice</button>
          </motion.div>
          {loading && invoices.length === 0 ? (
            <div className="rounded-xl" style={card}>
              <LoadingState label="Loading invoices…" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="rounded-xl" style={card}>
              <EmptyState
                icon={<FileText className="w-6 h-6" />}
                title="No invoices yet"
                description="Approve a payroll run to auto-generate the first EOR invoice."
              />
            </div>
          ) : (
            <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoice #</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Currency</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Issued</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-emerald-400 text-xs">{inv.invoiceNumber}</td>
                      <td className="px-6 py-3.5 font-medium text-slate-700">
                        {(inv.clientId && clientNameById.get(inv.clientId)) ?? '—'}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-900">{inv.total.toLocaleString()}</td>
                      <td className="px-6 py-3.5"><span className="px-2 py-1 rounded-md text-xs font-bold bg-cyan-50 text-cyan-700">{inv.currency}</span></td>
                      <td className="px-6 py-3.5"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusPillClass(inv.status)}`}>{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</span></td>
                      <td className="px-6 py-3.5 text-slate-400">{inv.issueDate ?? '—'}</td>
                      <td className="px-6 py-3.5 flex gap-2">
                        <button onClick={() => setViewing(inv)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" aria-label="View invoice"><Eye className="w-4 h-4 text-slate-400" /></button>
                        <button onClick={() => handleDelete(inv)} disabled={deletingId === inv.id} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50" aria-label="Delete invoice">
                          {deletingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </motion.div>
      )}

      {activeTab === 'revenue' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={fadeUp} className="lg:col-span-2 rounded-xl p-6" style={card}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Revenue vs Invoiced</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `$${v / 1000000}M`} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="revenue" fill="var(--sky-500)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="invoiced" fill="var(--sky-600)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
          <motion.div variants={fadeUp} className="rounded-xl p-6" style={card}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Invoice Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={invoiceStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                  {invoiceStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {invoiceStatus.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} /><span className="text-slate-400">{s.name}</span></div>
                  <span className="text-slate-600 font-mono">{s.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'settlement' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={fadeUp} className="rounded-xl p-6" style={{ ...card, border: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-2 mb-4"><Send className="w-5 h-5 text-emerald-400" /><h4 className="text-lg font-bold text-slate-900">Send Payment</h4></div>
            <p className="text-sm text-slate-500 mb-4">Pay invoices in same currency</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-slate-500 font-medium">Invoice</label>
                <select
                  value={settlementInvoiceId}
                  onChange={(e) => setSettlementInvoiceId(e.target.value)}
                  className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value="">— Pick an invoice —</option>
                  {invoices.filter((i) => i.status !== 'paid').map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {(inv.clientId && clientNameById.get(inv.clientId)) ?? 'Customer'} ({inv.currency} {(inv.amountDue ?? inv.total).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">Amount</label>
                <input
                  type="number"
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(e.target.value)}
                  placeholder="Defaults to amount due"
                  className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:border-sky-500 placeholder-slate-400"
                />
              </div>
              <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200"><p className="text-xs text-slate-500">Settlement Fee</p><p className="text-lg font-bold text-emerald-400">$0.01 flat</p></div>
            </div>
            <button
              onClick={handleSettlePayment}
              disabled={settling || !settlementInvoiceId}
              className="w-full px-4 py-3 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {settling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {settling ? 'Sending…' : 'Send Payment'}
            </button>
          </motion.div>
          <motion.div variants={fadeUp} className="rounded-xl p-6" style={card}>
            <div className="flex items-center gap-2 mb-4"><ArrowRightLeft className="w-5 h-5" style={{ color: 'var(--sky-600)' }} /><h4 className="text-lg font-bold text-slate-900">Multi-Currency Swap</h4></div>
            <p className="text-sm text-slate-500 mb-4">Convert payment currency instantly</p>
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 font-medium">From currency</label>
                  <select
                    value={swapFromCurrency}
                    onChange={(e) => setSwapFromCurrency(e.target.value)}
                    className="field mt-1.5"
                  >
                    {['USDC','EURC','Stablecoin','xSGD','JPYC','GBPC','USDT'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">To currency</label>
                  <select
                    value={swapToCurrency}
                    onChange={(e) => setSwapToCurrency(e.target.value)}
                    className="field mt-1.5"
                  >
                    {['USDC','EURC','Stablecoin','xSGD','JPYC','GBPC','USDT'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">From ({swapFromCurrency} amount)</label>
                <input
                  type="number"
                  value={swapFrom}
                  onChange={(e) => setSwapFrom(e.target.value)}
                  placeholder="45000"
                  className="field mt-1.5 font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium">To ({swapToCurrency} amount)</label>
                <input
                  type="number"
                  value={swapTo}
                  onChange={(e) => setSwapTo(e.target.value)}
                  placeholder="41400"
                  className="field mt-1.5 font-mono"
                />
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--primary-soft)', border: '1px solid var(--border-default)' }}>
                <p className="text-xs text-slate-500">Exchange Rate + Fee</p>
                <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                  {Number(swapFrom) > 0 && Number(swapTo) > 0
                    ? `1 ${swapFromCurrency} ≈ ${(Number(swapTo) / Number(swapFrom)).toFixed(4)} ${swapToCurrency}`
                    : `1 ${swapFromCurrency} ≈ — ${swapToCurrency}`} · $0.01 flat
                </p>
              </div>
            </div>
            <button
              onClick={handleSwap}
              disabled={swapping}
              className="w-full px-4 py-3 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {swapping ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {swapping ? 'Executing…' : 'Execute Swap'}
            </button>
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Create invoice</h3>
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
              </div>
              {createError && <p className="text-xs text-red-600">{createError}</p>}
              <label className="text-xs font-medium text-slate-500 block">
                Client
                <select
                  value={draft.clientId}
                  onChange={(e) => setDraft({ ...draft, clientId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                >
                  <option value="">— Pick a client —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-slate-500 block">
                  Total
                  <input
                    type="number"
                    value={draft.total}
                    onChange={(e) => setDraft({ ...draft, total: e.target.value })}
                    placeholder="0.00"
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm font-mono"
                  />
                </label>
                <label className="text-xs font-medium text-slate-500 block">
                  Currency
                  <select
                    value={draft.currency}
                    onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                  >
                    {['MYR', 'SGD', 'USD', 'EUR', 'GBP', 'Stablecoin', 'xSGD', 'USDC'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <label className="text-xs font-medium text-slate-500 block">
                Due date
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outlined" size="sm" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleCreate} disabled={creating}>
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {creating ? 'Creating…' : 'Create invoice'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {viewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setViewing(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-mono">{viewing.invoiceNumber}</p>
                  <h3 className="text-lg font-bold text-slate-900">
                    {(viewing.clientId && clientNameById.get(viewing.clientId)) ?? 'Customer'}
                  </h3>
                </div>
                <button onClick={() => setViewing(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">Status</p><p className="font-medium capitalize">{viewing.status}</p></div>
                <div><p className="text-xs text-slate-500">Currency</p><p className="font-mono">{viewing.currency}</p></div>
                <div><p className="text-xs text-slate-500">Total</p><p className="font-mono">{viewing.total.toLocaleString()}</p></div>
                <div><p className="text-xs text-slate-500">Amount due</p><p className="font-mono">{viewing.amountDue?.toLocaleString() ?? '—'}</p></div>
                <div><p className="text-xs text-slate-500">Issued</p><p>{viewing.issueDate ?? '—'}</p></div>
                <div><p className="text-xs text-slate-500">Due</p><p>{viewing.dueDate ?? '—'}</p></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outlined" size="sm" onClick={() => setViewing(null)}>Close</Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSettlementInvoiceId(viewing.id);
                    setActiveTab('settlement');
                    setViewing(null);
                  }}
                  disabled={viewing.status === 'paid'}
                >
                  Settle this invoice
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}
