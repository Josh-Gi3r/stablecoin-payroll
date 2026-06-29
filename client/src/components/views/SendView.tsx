import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Clock, CheckCircle, AlertCircle, Users, Building2, Globe, Zap, Loader2, Plus, X } from 'lucide-react';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, Pill, Tab, Table, Tabs } from '../ui';
import { transactions as transactionsApi } from '../../lib/api';
import { useApiList, coerceError } from '../../hooks/useApi';

const RECIPIENTS_KEY = 'payrollApp.savedRecipients.v1';

type SavedRecipient = {
  name: string;
  address: string;
  currency: string;
  country: string;
  type: 'Business' | 'Individual';
};

type ServerTx = {
  id: string;
  type: 'send' | 'swap' | 'receive';
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  platformFee: number;
  recipientAddress: string | null;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
};

// View-shape used by tables / cards. Derived from ServerTx.
type ViewPayment = {
  id: string;
  recipient: string;
  amount: number;
  currency: string;
  toCurrency: string;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  fee: number;
};

const currencies = ['Stablecoin', 'xSGD', 'USDT', 'USDC', 'EURC'];

const SendView = () => {
  const [activeTab, setActiveTab] = useState('send');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('Stablecoin');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Batch + saved-recipients state.
  const [batchRows, setBatchRows] = useState<Array<{ name: string; address: string; currency: string; amount: string }>>(
    [{ name: '', address: '', currency: 'Stablecoin', amount: '' }],
  );
  const [batchSending, setBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [savedLocal, setSavedLocal] = useState<SavedRecipient[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(RECIPIENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(RECIPIENTS_KEY, JSON.stringify(savedLocal)); } catch { /* ignore */ }
  }, [savedLocal]);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [draftRecipient, setDraftRecipient] = useState<SavedRecipient>({ name: '', address: '', currency: 'Stablecoin', country: '', type: 'Business' });

  const { data: txs, loading, error: loadError, reload } = useApiList<ServerTx>(
    () => transactionsApi.list(),
    [],
    'Failed to load transactions',
  );

  const error = loadError ?? submitError;

  const payments: ViewPayment[] = useMemo(
    () =>
      txs
        .filter((t) => t.type === 'send' || t.type === 'swap')
        .map((t) => ({
          id: t.id,
          recipient: t.recipientAddress ?? '—',
          amount: t.fromAmount,
          currency: t.fromCurrency,
          toCurrency: t.toCurrency,
          status: t.status,
          date: t.createdAt.slice(0, 10),
          fee: t.platformFee,
        })),
    [txs],
  );

  // "Saved recipients" derived from past transaction recipients (deduped).
  const savedRecipients = useMemo(() => {
    const seen = new Map<string, ViewPayment>();
    for (const p of payments) {
      if (p.recipient && p.recipient !== '—' && !seen.has(p.recipient)) {
        seen.set(p.recipient, p);
      }
    }
    const fromHistory: SavedRecipient[] = Array.from(seen.values()).slice(0, 12).map((p) => ({
      name: p.recipient,
      address: p.recipient,
      type: 'Business' as const,
      currency: p.currency,
      country: '—',
    }));
    // localStorage entries take precedence; fill out with derived ones.
    const merged: SavedRecipient[] = [...savedLocal];
    for (const r of fromHistory) {
      if (!merged.some((m) => m.address === r.address)) merged.push(r);
    }
    return merged;
  }, [payments, savedLocal]);

  const updateBatchRow = (i: number, field: 'name' | 'address' | 'currency' | 'amount', value: string) =>
    setBatchRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const addBatchRow = () => setBatchRows((rows) => [...rows, { name: '', address: '', currency: 'Stablecoin', amount: '' }]);
  const removeBatchRow = (i: number) => setBatchRows((rows) => rows.filter((_, idx) => idx !== i));

  const handleBatchSend = async () => {
    const validRows = batchRows.filter((r) => r.address.trim() && Number(r.amount) > 0);
    if (validRows.length === 0) {
      setSubmitError('Add at least one recipient with a valid amount.');
      return;
    }
    setBatchSending(true);
    setSubmitError(null);
    setBatchProgress({ done: 0, total: validRows.length });
    try {
      for (let i = 0; i < validRows.length; i++) {
        const r = validRows[i];
        const amt = Number(r.amount);
        await transactionsApi.send({
          type: 'send',
          fromCurrency: r.currency,
          toCurrency: r.currency,
          fromAmount: amt,
          toAmount: amt,
          exchangeRate: 1,
          recipientAddress: r.address,
        });
        setBatchProgress({ done: i + 1, total: validRows.length });
      }
      setBatchRows([{ name: '', address: '', currency: 'Stablecoin', amount: '' }]);
      await reload();
    } catch (e: any) {
      setSubmitError(coerceError(e, 'Batch send failed midway. Re-run to continue.'));
    } finally {
      setBatchSending(false);
    }
  };

  const handleAddRecipient = () => {
    const name = draftRecipient.name.trim();
    const address = draftRecipient.address.trim();
    if (!name || !address) {
      setSubmitError('Recipient name and address are required.');
      return;
    }
    // Address must be either: (a) a valid email, or (b) an EVM-style 0x… 40-hex
    // address, or (c) a generic alphanumeric handle ≥6 chars (for chain-agnostic
    // accounts). Anything else gets rejected so we don't quietly send to garbage.
    const emailRe  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const evmRe    = /^0x[a-fA-F0-9]{40}$/;
    const handleRe = /^[a-zA-Z0-9._-]{6,}$/;
    if (!(emailRe.test(address) || evmRe.test(address) || handleRe.test(address))) {
      setSubmitError('Address must be an email, an 0x… EVM address, or an alphanumeric handle (≥6 chars).');
      return;
    }
    if (savedLocal.some((r) => r.address.toLowerCase() === address.toLowerCase())) {
      setSubmitError('A recipient with that address is already saved.');
      return;
    }
    setSubmitError(null);
    setSavedLocal((rs) => [...rs, { ...draftRecipient, name, address }]);
    setDraftRecipient({ name: '', address: '', currency: 'Stablecoin', country: '', type: 'Business' });
    setShowAddRecipient(false);
  };

  const handleSendToSaved = (r: { name: string; address?: string; currency: string }) => {
    setRecipient(r.address ?? r.name);
    setSelectedCurrency(r.currency);
    setActiveTab('send');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const amt = Number(amount) || 0;
      await transactionsApi.send({
        type: 'send',
        fromCurrency: selectedCurrency,
        toCurrency: selectedCurrency,
        fromAmount: amt,
        toAmount: amt,
        exchangeRate: 1,
        recipientAddress: recipient,
      });
      setRecipient('');
      setAmount('');
      setMemo('');
      await reload();
    } catch (e: any) {
      setSubmitError(coerceError(e, 'Failed to send payment'));
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: 'send', label: 'Send Payment', icon: Send },
    { id: 'batch', label: 'Batch Send', icon: Users },
    { id: 'history', label: 'Payment History', icon: Clock },
    { id: 'recipients', label: 'Saved Recipients', icon: Building2 },
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

      {/* Send Payment Tab */}
      {activeTab === 'send' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Send Form - 3 cols */}
          <motion.form
            onSubmit={handleSend}
            variants={fadeUp}
            className="lg:col-span-3 rounded-xl p-6"
            style={{ ...card, border: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-accent-soft)] border border-[var(--ink)] flex items-center justify-center">
                <Send className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Send Payment</h3>
                <p className="text-xs text-slate-500">Atomic swap settlement with $0.01 flat fee</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Recipient</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Wallet address or company name"
                  required
                  list="send-saved-recipients"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500 transition-colors placeholder-slate-400"
                />
                {savedRecipients.length > 0 && (
                  <datalist id="send-saved-recipients">
                    {savedRecipients.map((r) => <option key={r.name} value={r.name} />)}
                  </datalist>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:border-sky-500 transition-colors placeholder-slate-400"
                  />
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-bold focus:outline-none focus:border-sky-500 transition-colors"
                  >
                    {currencies.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Reference / Memo</label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Payment for invoice INV-001..."
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500 transition-colors placeholder-slate-400"
                />
              </div>

              {/* Fee Display */}
              <div className="rounded-xl p-4" style={{ background: 'var(--primary-soft)', border: '1px solid var(--border-default)' }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" style={{ color: 'var(--sky-700)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Platform Settlement Fee</span>
                  </div>
                  <span className="text-lg font-bold" style={{ color: 'var(--sky-700)' }}>$0.01</span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Flat fee regardless of amount. No hidden charges.</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-semibold  transition-all disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {submitting ? 'Sending…' : 'Send Payment'}
              </button>
            </div>
          </motion.form>

          {/* Quick Stats - 2 cols */}
          <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
            {(() => {
              const sentMtd = payments.reduce((s, p) => s + p.amount, 0);
              const feesSaved = payments.length * 100; // illustrative — Wise typical fee per tx
              return [
                { label: 'Total Sent (MTD)', value: `${sentMtd.toLocaleString()}`, sub: `${payments.length} payment${payments.length !== 1 ? 's' : ''}`, color: 'var(--text-primary)' },
                { label: 'Fees Saved vs Wise', value: `$${feesSaved.toLocaleString()}`, sub: '$0.01 vs ~$100/tx', color: 'var(--sky-700)' },
                { label: 'Avg Settlement Time', value: '< 3 sec', sub: 'Atomic swap', color: 'var(--sky-700)' },
                { label: 'Active Recipients', value: savedRecipients.length.toString(), sub: 'From past sends', color: 'var(--lilac-600)' },
              ];
            })().map((stat) => (
              <div key={stat.label} className="rounded-xl p-5" style={card}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                <p className="text-2xl font-bold mt-2" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{stat.sub}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Recent Payments preview (Send tab only) */}
      {activeTab === 'send' && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Payments</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last 5 settlements across all currencies</p>
            </div>
            <button
              onClick={() => setActiveTab('history')}
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--sky-700)' }}
            >
              View all →
            </button>
          </div>
          {loading && payments.length === 0 ? (
            <div className="rounded-xl p-10 text-center text-sm flex items-center justify-center gap-2" style={card}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Loading payment history…</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="rounded-xl p-10 text-center text-sm" style={card}>
              <p style={{ color: 'var(--text-muted)' }}>No payments yet. Send your first one above.</p>
            </div>
          ) : (
            <Table
              columns={[
                { key: 'id', label: 'Reference', cardTitle: true, className: 'font-mono' },
                { key: 'recipient', label: 'Recipient' },
                {
                  key: 'amount',
                  label: 'Amount',
                  align: 'right',
                  className: 'font-mono tabular-nums',
                  render: (r) => `${r.amount.toLocaleString()} ${r.currency}`,
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (r) => (
                    <Pill
                      tone={r.status === 'completed' ? 'success' : r.status === 'pending' ? 'warn' : 'danger'}
                      dot
                    >
                      {r.status}
                    </Pill>
                  ),
                },
                { key: 'date', label: 'Date', className: 'tabular-nums' },
              ]}
              data={payments.slice(0, 5)}
            />
          )}
        </motion.div>
      )}

      {/* Batch Send Tab */}
      {activeTab === 'batch' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl p-6" style={card}>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Batch Payment</h3>
            <p className="text-sm text-slate-400 mb-6">Send payments to multiple recipients at once. Each transfer costs just $0.01.</p>
            <div className="space-y-3 mb-6">
              {batchRows.map((r, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-3 rounded-xl bg-slate-50">
                  <input
                    type="text"
                    placeholder="Name (optional)"
                    value={r.name}
                    onChange={(e) => updateBatchRow(i, 'name', e.target.value)}
                    className="md:col-span-3 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="text"
                    placeholder="Recipient address"
                    value={r.address}
                    onChange={(e) => updateBatchRow(i, 'address', e.target.value)}
                    className="md:col-span-5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:border-sky-500"
                  />
                  <select
                    value={r.currency}
                    onChange={(e) => updateBatchRow(i, 'currency', e.target.value)}
                    className="md:col-span-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                  >
                    {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={r.amount}
                    onChange={(e) => updateBatchRow(i, 'amount', e.target.value)}
                    className="md:col-span-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm font-mono text-right focus:outline-none focus:border-sky-500"
                  />
                  {batchRows.length > 1 && (
                    <button
                      onClick={() => removeBatchRow(i)}
                      className="md:col-span-12 md:col-start-13 p-2 rounded-lg hover:bg-slate-100 text-slate-400"
                      aria-label="Remove recipient"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addBatchRow}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-slate-300 text-slate-500 text-sm hover:bg-slate-50 hover:text-slate-700"
              >
                <Plus className="w-4 h-4" /> Add row
              </button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200 mb-4">
              <span className="text-sm text-slate-600">Total Fee ({batchRows.filter((r) => r.address && Number(r.amount) > 0).length} payments)</span>
              <span className="text-lg font-bold text-emerald-400">${(batchRows.filter((r) => r.address && Number(r.amount) > 0).length * 0.01).toFixed(2)}</span>
            </div>
            <button
              onClick={handleBatchSend}
              disabled={batchSending}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-semibold  transition-all disabled:opacity-60"
            >
              {batchSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {batchSending && batchProgress
                ? `Sending ${batchProgress.done}/${batchProgress.total}…`
                : 'Send Batch Payment'}
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Payment History Tab */}
      {activeTab === 'history' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Recipient</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Currency</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Fee</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No payments yet.
                    </td>
                  </tr>
                )}
                {payments.map((payment) => {
                  const statusStyle = payment.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700'
                    : payment.status === 'pending'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700';
                  const StatusIcon = payment.status === 'completed' ? CheckCircle :
                                    payment.status === 'pending' ? Clock : AlertCircle;
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-emerald-400 text-xs">{payment.id}</td>
                      <td className="px-6 py-3.5 font-medium text-slate-700">{payment.recipient}</td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-900">{payment.amount.toLocaleString()}</td>
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-1 rounded-md text-xs font-bold bg-cyan-50 text-cyan-700">{payment.currency}</span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-400">{payment.date}</td>
                      <td className="px-6 py-3.5 text-right font-mono text-emerald-400">${payment.fee}</td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusStyle}`}>
                          <StatusIcon className="w-3 h-3" />
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      )}

      {/* Saved Recipients Tab */}
      {activeTab === 'recipients' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="flex justify-end">
            <button
              onClick={() => setShowAddRecipient((v) => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium text-sm"
            >
              <Users className="w-4 h-4" />
              {showAddRecipient ? 'Cancel' : 'Add Recipient'}
            </button>
          </motion.div>

          {showAddRecipient && (
            <motion.div variants={fadeUp} className="rounded-xl p-5 space-y-3" style={card}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Name"
                  value={draftRecipient.name}
                  onChange={(e) => setDraftRecipient((d) => ({ ...d, name: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-sky-400"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={draftRecipient.address}
                  onChange={(e) => setDraftRecipient((d) => ({ ...d, address: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:border-sky-400"
                />
                <select
                  value={draftRecipient.currency}
                  onChange={(e) => setDraftRecipient((d) => ({ ...d, currency: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-sky-400"
                >
                  {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Country (optional)"
                  value={draftRecipient.country}
                  onChange={(e) => setDraftRecipient((d) => ({ ...d, country: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-sky-400"
                />
                <select
                  value={draftRecipient.type}
                  onChange={(e) => setDraftRecipient((d) => ({ ...d, type: e.target.value as 'Business' | 'Individual' }))}
                  className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-sky-400"
                >
                  <option value="Business">Business</option>
                  <option value="Individual">Individual</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddRecipient(false)} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm hover:bg-slate-200">Cancel</button>
                <button onClick={handleAddRecipient} className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100">Save recipient</button>
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {savedRecipients.length === 0 && (
              <div className="md:col-span-2 rounded-xl p-8 text-center" style={card}>
                <p className="text-sm text-slate-500">No saved recipients yet. Add one above or send a payment to populate this list.</p>
              </div>
            )}
            {savedRecipients.map((r, i) => (
              <div key={i} className="rounded-xl p-5" style={card}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-accent-soft)] border border-[var(--ink)] flex items-center justify-center">
                      {r.type === 'Business' ? <Building2 className="w-5 h-5 text-emerald-400" /> : <Users className="w-5 h-5 text-cyan-400" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.type}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-md text-xs font-bold bg-cyan-50 text-cyan-700">{r.currency}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Globe className="w-3 h-3" />
                  {r.country || '—'}
                </div>
                <button
                  onClick={() => handleSendToSaved(r)}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-emerald-700 font-medium text-sm transition-all"
                >
                  <Send className="w-4 h-4" />
                  Send Payment
                </button>
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </PageContainer>
  );
};

export default SendView;
