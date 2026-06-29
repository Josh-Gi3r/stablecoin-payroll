import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Plus, CheckCircle, Clock, AlertCircle, Building, Calendar, Send, Loader2, X } from 'lucide-react';
import { PageContainer, Tab, Tabs, Button, ErrorBanner } from '../ui';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { bills as billsApi, vendors as vendorsApi, transactions as transactionsApi } from '../../lib/api';
import { useApiList, coerceError } from '../../hooks/useApi';

type ServerBill = {
  id: string;
  vendorId: string | null;
  billNumber: string | null;
  description: string | null;
  amount: number;
  currency: string;
  dueDate: string | null;
  status: 'paid' | 'due' | 'overdue' | 'scheduled' | string;
  category?: string | null;
};

type ServerVendor = {
  id: string;
  name: string;
};

const statusConfig: Record<string, { style: string; icon: typeof CheckCircle; label: string }> = {
  paid: { style: 'bg-emerald-50 text-emerald-700', icon: CheckCircle, label: 'Paid' },
  due: { style: 'bg-amber-50 text-amber-700', icon: Clock, label: 'Due' },
  overdue: { style: 'bg-red-50 text-red-700', icon: AlertCircle, label: 'Overdue' },
  scheduled: { style: 'bg-cyan-50 text-cyan-700', icon: Calendar, label: 'Scheduled' },
};

export default function BillPayView() {
  const [activeTab, setActiveTab] = useState('bills');
  const [paying, setPaying] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // Add Vendor modal
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [vendorDraft, setVendorDraft] = useState('');
  const [creatingVendor, setCreatingVendor] = useState(false);

  // Pay-a-Bill form
  const [payDraft, setPayDraft] = useState({ vendorId: '', currency: 'USDC', amount: '', reference: '' });
  const [payingForm, setPayingForm] = useState(false);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  const { data: bills, loading: billsLoading, error: billsError, reload: reloadBills } =
    useApiList<ServerBill>(() => billsApi.list(), [], 'Failed to load bills');

  const { data: vendors, loading: vendorsLoading, error: vendorsError, reload: reloadVendors } =
    useApiList<ServerVendor>(() => vendorsApi.list(), [], 'Failed to load vendors');

  const error = billsError ?? vendorsError ?? payError;
  const loading = billsLoading || vendorsLoading;

  const vendorNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vendors) m.set(v.id, v.name);
    return m;
  }, [vendors]);

  const handlePay = async (bill: ServerBill) => {
    setPaying(bill.id);
    setPayError(null);
    try {
      await billsApi.update(bill.id, { status: 'paid' });
      await reloadBills();
    } catch (e: any) {
      setPayError(coerceError(e, 'Failed to mark bill paid'));
    } finally {
      setPaying(null);
    }
  };

  const handleAddVendor = async () => {
    if (!vendorDraft.trim()) return;
    setCreatingVendor(true);
    setPayError(null);
    try {
      await vendorsApi.create({ name: vendorDraft.trim() });
      setVendorDraft('');
      setShowAddVendor(false);
      await reloadVendors();
    } catch (e: any) {
      setPayError(coerceError(e, 'Failed to create vendor'));
    } finally {
      setCreatingVendor(false);
    }
  };

  const handlePayBill = async () => {
    if (!payDraft.vendorId || !payDraft.amount || Number(payDraft.amount) <= 0) {
      setPayError('Pick a vendor and enter a positive amount.');
      return;
    }
    setPayingForm(true);
    setPayError(null);
    setPaySuccess(null);
    try {
      const amount = Number(payDraft.amount);
      // Record the bill as paid
      const created = await billsApi.create({
        vendorId: payDraft.vendorId,
        amount,
        currency: payDraft.currency,
        billNumber: payDraft.reference || null,
        status: 'paid',
        dueDate: new Date().toISOString().slice(0, 10),
      });
      // Fire the matching settlement transaction
      await transactionsApi.send({
        type: 'send',
        fromCurrency: payDraft.currency,
        toCurrency: payDraft.currency,
        fromAmount: amount,
        toAmount: amount,
        recipientAddress: `vendor:${payDraft.vendorId}`,
        memo: payDraft.reference || `Bill ${created?.id ?? ''}`,
      });
      setPaySuccess(`Paid ${payDraft.currency} ${amount.toLocaleString()} to ${vendorNameById.get(payDraft.vendorId) ?? 'vendor'}.`);
      setPayDraft({ vendorId: '', currency: 'USDC', amount: '', reference: '' });
      await reloadBills();
    } catch (e: any) {
      setPayError(coerceError(e, 'Failed to pay bill'));
    } finally {
      setPayingForm(false);
    }
  };

  const tabs = [
    { id: 'bills', label: 'Bills', icon: CreditCard },
    { id: 'vendors', label: 'Vendors', icon: Building },
    { id: 'pay', label: 'Pay Bill', icon: Send },
  ];

  const totalDue = bills.filter((b) => b.status === 'due' || b.status === 'overdue').reduce((s, b) => s + b.amount, 0);
  const overdue = bills.filter((b) => b.status === 'overdue');

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

      {activeTab === 'bills' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          {loading && bills.length === 0 && (
            <div className="rounded-xl p-10 text-center text-sm flex items-center justify-center gap-2" style={card}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Loading bills…</span>
            </div>
          )}
          <motion.div variants={fadeUp} className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Due', value: `$${totalDue.toLocaleString()}`, sub: `${bills.filter((b) => b.status === 'due').length} bills due`, accent: 'text-slate-900' },
              { label: 'Overdue', value: `$${overdue.reduce((s, b) => s + b.amount, 0).toLocaleString()}`, sub: `${overdue.length} bill${overdue.length !== 1 ? 's' : ''} overdue`, accent: 'text-red-400' },
              { label: 'Scheduled', value: `$${bills.filter((b) => b.status === 'scheduled').reduce((s, b) => s + b.amount, 0).toLocaleString()}`, sub: 'Auto-pay enabled', accent: 'text-cyan-400' },
              { label: 'Paid (Feb)', value: `$${bills.filter((b) => b.status === 'paid').reduce((s, b) => s + b.amount, 0).toLocaleString()}`, sub: 'This month', accent: 'text-emerald-400' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-5" style={card}>
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className={`text-2xl font-bold mt-2 ${c.accent}`}>{c.value}</p>
                <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No bills yet. Add a vendor and create the first bill from the Vendors tab.
                    </td>
                  </tr>
                )}
                {bills.map((bill) => {
                  const config = statusConfig[bill.status] ?? statusConfig.due;
                  const StatusIcon = config.icon;
                  const vendorName = (bill.vendorId && vendorNameById.get(bill.vendorId)) ?? '—';
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-900">{vendorName}</td>
                      <td className="px-6 py-3.5 text-slate-600">{bill.description ?? '—'}</td>
                      <td className="px-6 py-3.5"><span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">{bill.category ?? '—'}</span></td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-900">{bill.amount.toLocaleString()} {bill.currency}</td>
                      <td className="px-6 py-3.5 text-slate-400 text-xs">{bill.dueDate ?? '—'}</td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.style}`}>
                          <StatusIcon className="w-3 h-3" />{config.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {(bill.status === 'due' || bill.status === 'overdue') && (
                          <button
                            onClick={() => handlePay(bill)}
                            disabled={paying === bill.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            {paying === bill.id && <Loader2 className="w-3 h-3 animate-spin" />}
                            {paying === bill.id ? 'Paying…' : 'Pay Now'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'vendors' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Vendor Directory</h3>
            <button onClick={() => setShowAddVendor(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium text-sm">
              <Plus className="w-4 h-4" />Add Vendor
            </button>
          </motion.div>
          {vendors.length === 0 && !loading ? (
            <div className="rounded-xl p-10 text-center text-sm" style={card}>
              <p style={{ color: 'var(--text-muted)' }}>No vendors yet. Click "Add Vendor" to create one.</p>
            </div>
          ) : (
            <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vendors.map((v) => {
                const vendorBillCount = bills.filter((b) => b.vendorId === v.id).length;
                const vendorTotal = bills
                  .filter((b) => b.vendorId === v.id)
                  .reduce((s, b) => s + b.amount, 0);
                return (
                  <div key={v.id} className="rounded-xl p-5 hover:bg-slate-50 transition-colors" style={card}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Building className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{v.name}</h3>
                          <p className="text-xs text-slate-500">{vendorBillCount} bill{vendorBillCount !== 1 ? 's' : ''} · {vendorTotal.toLocaleString()} total</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Active</span>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {showAddVendor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowAddVendor(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Add vendor</h3>
                <button onClick={() => setShowAddVendor(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
              </div>
              <label className="text-xs font-medium text-slate-500 block">
                Vendor name
                <input
                  type="text"
                  value={vendorDraft}
                  onChange={(e) => setVendorDraft(e.target.value)}
                  placeholder="e.g. Maybank, AWS, Stripe"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                  autoFocus
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outlined" size="sm" onClick={() => setShowAddVendor(false)} disabled={creatingVendor}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleAddVendor} disabled={creatingVendor || !vendorDraft.trim()}>
                  {creatingVendor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {creatingVendor ? 'Adding…' : 'Add vendor'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'pay' && (
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="max-w-lg">
            <div className="rounded-xl p-6" style={{ ...card, border: '1px solid var(--border-default)' }}>
              <h3 className="text-lg font-bold text-slate-900 mb-5">Pay a Bill</h3>
              {paySuccess && <p className="text-xs text-emerald-700 mb-3">{paySuccess}</p>}
              <ErrorBanner message={payError} />
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400">Vendor</label>
                  <select
                    value={payDraft.vendorId}
                    onChange={(e) => setPayDraft({ ...payDraft, vendorId: e.target.value })}
                    className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                  >
                    <option value="">{vendors.length === 0 ? 'No vendors yet — add one in the Vendors tab' : '— Pick a vendor —'}</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400">Amount</label>
                  <div className="flex gap-2 mt-1.5">
                    <select
                      value={payDraft.currency}
                      onChange={(e) => setPayDraft({ ...payDraft, currency: e.target.value })}
                      className="w-24 px-3 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                    >
                      <option>USDC</option><option>EURC</option><option>GBPC</option><option>Stablecoin</option><option>xSGD</option>
                    </select>
                    <input
                      type="number"
                      value={payDraft.amount}
                      onChange={(e) => setPayDraft({ ...payDraft, amount: e.target.value })}
                      placeholder="0.00"
                      className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:border-sky-500 placeholder-slate-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400">Reference / Invoice #</label>
                  <input
                    type="text"
                    value={payDraft.reference}
                    onChange={(e) => setPayDraft({ ...payDraft, reference: e.target.value })}
                    placeholder="INV-2026-001"
                    className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500 placeholder-slate-400"
                  />
                </div>
                <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200">
                  <div className="flex justify-between"><span className="text-xs text-slate-500">Settlement Fee</span><span className="text-emerald-400 font-bold">$0.01</span></div>
                  <div className="flex justify-between mt-1"><span className="text-xs text-slate-500">Settlement</span><span className="text-emerald-400 font-medium text-sm">settlement atomic swap</span></div>
                </div>
                <button
                  onClick={handlePayBill}
                  disabled={payingForm || vendors.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium transition-all disabled:opacity-60"
                >
                  {payingForm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {payingForm ? 'Sending…' : 'Pay Bill'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </PageContainer>
  );
}
