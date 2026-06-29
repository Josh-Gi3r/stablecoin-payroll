import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, CheckCircle, AlertCircle, Link2, RefreshCw, Plus, ExternalLink, Clock, BookOpen, Briefcase, CreditCard, Landmark, Trash2, X, Unplug } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageContainer, Tab, Tabs, ErrorBanner, LoadingState, EmptyState } from '../ui';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { integrations as integrationsApi, webhooks as webhooksApi } from '../../lib/api';
import { useApiList, coerceError } from '../../hooks/useApi';

type ServerWebhook = {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'disabled' | 'failed';
  secret: string | null;
  lastDeliveryAt: string | null;
  createdAt: string;
};

const WEBHOOK_EVENT_OPTIONS = [
  { id: 'payroll.run', label: 'Payroll run completed' },
  { id: 'invoice.paid', label: 'Invoice paid' },
  { id: 'expense.reimbursed', label: 'Expense reimbursed' },
  { id: 'employee.created', label: 'Employee created' },
  { id: 'kyc.approved', label: 'KYC approved' },
  { id: 'transaction.sent', label: 'Transaction sent' },
];

type ServerIntegration = {
  id: string;
  provider: 'xero' | 'quickbooks' | 'stripe' | 'plaid';
  syncStatus: 'connected' | 'disconnected' | 'error';
  lastSyncDate: string | null;
  createdAt: string;
};

const PROVIDER_META: Record<string, { name: string; Icon: LucideIcon; description: string; features: string[] }> = {
  xero:       { name: 'Xero',              Icon: BookOpen,  description: 'Accounting integration with GL and invoice sync',     features: ['GL Sync', 'Invoice Sync', 'Bill Sync', 'Tax Tracking'] },
  quickbooks: { name: 'QuickBooks Online', Icon: Briefcase, description: 'Cloud accounting with hourly data synchronization',  features: ['GL Sync', 'Invoice Sync', 'Expense Sync'] },
  stripe:     { name: 'Stripe',            Icon: CreditCard, description: 'Payment processing with real-time transaction sync', features: ['Payment Sync', 'Invoice Sync', 'Refund Tracking'] },
  plaid:      { name: 'Plaid',             Icon: Landmark,  description: 'Bank account aggregation and balance feeds',         features: ['Account Sync', 'Transaction Feed', 'Balance Updates'] },
};

const apiEndpoints = [
  { method: 'GET', path: '/employees', description: 'List employees', auth: 'Bearer Token' },
  { method: 'POST', path: '/payroll/runs', description: 'Create payroll run', auth: 'Bearer Token' },
  { method: 'GET', path: '/invoices', description: 'List invoices', auth: 'Bearer Token' },
  { method: 'POST', path: '/transactions/send', description: 'Send a payment', auth: 'Bearer Token' },
  { method: 'GET', path: '/statutory/rates/:country', description: 'Statutory contribution rates', auth: 'Bearer Token' },
  { method: 'GET', path: '/audit-logs', description: 'List audit logs', auth: 'Bearer Token' },
];

export default function IntegrationsView() {
  const [activeTab, setActiveTab] = useState('connections');

  const { data: rows, loading, error: loadError, reload } = useApiList<ServerIntegration>(
    () => integrationsApi.list(),
    [],
    'Failed to load integrations',
  );
  const [connecting, setConnecting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const error = loadError ?? actionError;

  const { data: webhooksList, loading: webhooksLoading, error: webhooksError, reload: reloadWebhooks } = useApiList<ServerWebhook>(
    () => webhooksApi.list(),
    [],
    'Failed to load webhooks',
  );
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [hookUrl, setHookUrl] = useState('');
  const [hookEvents, setHookEvents] = useState<string[]>(['payroll.run', 'invoice.paid']);
  const [hookSaving, setHookSaving] = useState(false);
  const [hookError, setHookError] = useState<string | null>(null);
  const [deletingHook, setDeletingHook] = useState<string | null>(null);

  const toggleHookEvent = (id: string) => {
    setHookEvents((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]);
  };

  const handleRegisterWebhook = async () => {
    setHookError(null);
    if (!hookUrl.trim()) { setHookError('URL is required'); return; }
    try { new URL(hookUrl.trim()); } catch { setHookError('Enter a valid URL (https://…)'); return; }
    if (hookEvents.length === 0) { setHookError('Select at least one event'); return; }
    setHookSaving(true);
    try {
      await webhooksApi.create({ url: hookUrl.trim(), events: hookEvents });
      await reloadWebhooks();
      setShowWebhookModal(false);
      setHookUrl('');
      setHookEvents(['payroll.run', 'invoice.paid']);
    } catch (e: any) {
      setHookError(coerceError(e, 'Failed to register webhook'));
    } finally {
      setHookSaving(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    setDeletingHook(id);
    try {
      await webhooksApi.remove(id);
      await reloadWebhooks();
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to delete webhook'));
    } finally {
      setDeletingHook(null);
    }
  };

  const handleConnect = async (provider: ServerIntegration['provider']) => {
    setConnecting(provider);
    setActionError(null);
    try {
      await integrationsApi.create({ provider });
      await reload();
    } catch (e: any) {
      setActionError(coerceError(e, `Failed to connect ${provider}`));
    } finally {
      setConnecting(null);
    }
  };

  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const handleDisconnect = async (integration: ServerIntegration) => {
    if (!confirm(`Disconnect ${PROVIDER_META[integration.provider]?.name ?? integration.provider}?`)) return;
    setDisconnecting(integration.id);
    setActionError(null);
    try {
      await integrationsApi.remove(integration.id);
      await reload();
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to disconnect integration'));
    } finally {
      setDisconnecting(null);
    }
  };

  const tabs = [
    { id: 'connections', label: 'Integrations', icon: Link2 },
    { id: 'webhooks', label: 'Webhooks & Logs', icon: Zap },
    { id: 'api', label: 'API Documentation', icon: ExternalLink },
  ];

  const connected = rows.filter((i) => i.syncStatus === 'connected').length;
  const connectedProviders = new Set(rows.map((r) => r.provider));
  const allProviders: ServerIntegration['provider'][] = ['xero', 'quickbooks', 'stripe', 'plaid'];
  const availableProviders = allProviders.filter((p) => !connectedProviders.has(p));

  return (
    <PageContainer>
      <Tabs value={activeTab} onChange={setActiveTab}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return <Tab key={tab.id} value={tab.id} label={tab.label} icon={<Icon className="w-4 h-4" />} />;
        })}
      </Tabs>

      <ErrorBanner message={error} onRetry={reload} />

      {activeTab === 'connections' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Connected', value: `${connected}`, sub: `of ${rows.length} integrations`, accent: 'text-emerald-400' },
              { label: 'Sync Status', value: connected > 0 ? 'Healthy' : 'Idle', sub: connected > 0 ? 'All feeds active' : 'No active feeds', accent: connected > 0 ? 'text-emerald-400' : 'text-slate-500' },
              { label: 'Last Activity', value: rows.find((i) => i.lastSyncDate)?.lastSyncDate?.slice(0, 10) ?? '—', sub: 'Most recent sync', accent: 'text-cyan-400' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-5" style={card}>
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className={`text-2xl font-bold mt-2 ${c.accent}`}>{c.value}</p>
                <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </motion.div>

          {loading && rows.length === 0 && (
            <div className="rounded-xl" style={card}>
              <LoadingState label="Loading integrations…" />
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="rounded-xl" style={card}>
              <EmptyState
                icon={<Link2 className="w-6 h-6" />}
                title="No integrations connected"
                description="Connect Xero, QuickBooks, Stripe or Plaid to sync accounting and banking data."
              />
            </div>
          )}

          {availableProviders.length > 0 && (
            <motion.div variants={fadeUp} className="rounded-xl p-5" style={card}>
              <p className="text-xs text-slate-500 font-medium mb-3">Available providers</p>
              <div className="flex gap-2 flex-wrap">
                {availableProviders.map((p) => {
                  const meta = PROVIDER_META[p];
                  const Icon = meta?.Icon ?? Link2;
                  return (
                    <button
                      key={p}
                      onClick={() => handleConnect(p)}
                      disabled={connecting === p}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm text-slate-700 transition-colors disabled:opacity-60"
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                      {connecting === p ? 'Connecting…' : `Connect ${meta?.name ?? p}`}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {rows.length > 0 && (
            <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rows.map((integration) => {
                const meta = PROVIDER_META[integration.provider] ?? { name: integration.provider, Icon: Link2, description: '', features: [] };
                const Icon = meta.Icon;
                const isConnected = integration.syncStatus === 'connected';
                return (
                  <div key={integration.id} className="rounded-xl p-5 hover:bg-slate-50 transition-colors" style={card}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: 'var(--cream)', border: '1px solid var(--ink)' }}>
                          <Icon className="w-5 h-5" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{meta.name}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                            isConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {isConnected ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {integration.syncStatus}
                          </span>
                        </div>
                      </div>
                      {isConnected ? (
                        <button
                          onClick={() => handleDisconnect(integration)}
                          disabled={disconnecting === integration.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium hover:bg-rose-100 transition-colors disabled:opacity-60"
                        >
                          <Unplug className="w-3.5 h-3.5" />
                          {disconnecting === integration.id ? 'Disconnecting…' : 'Disconnect'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnect(integration.provider)}
                          disabled={connecting === integration.provider}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-60"
                        >
                          {connecting === integration.provider ? 'Connecting…' : 'Connect'}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mb-3">{meta.description}</p>
                    {integration.lastSyncDate && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                        <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last: {integration.lastSyncDate.slice(0, 16).replace('T', ' ')}</div>
                        <div className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Real-time</div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {meta.features.map((feature, i) => (
                        <span key={i} className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">{feature}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      )}

      {activeTab === 'webhooks' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Registered Webhooks</h3>
            <button
              onClick={() => setShowWebhookModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium text-sm transition-all"
            >
              <Plus className="w-4 h-4" />Register Webhook
            </button>
          </motion.div>

          <ErrorBanner message={webhooksError} onRetry={reloadWebhooks} />

          {webhooksLoading && webhooksList.length === 0 && (
            <motion.div variants={fadeUp} className="rounded-xl" style={card}>
              <LoadingState label="Loading webhooks…" />
            </motion.div>
          )}

          {!webhooksLoading && webhooksList.length === 0 && (
            <motion.div variants={fadeUp} className="rounded-xl" style={card}>
              <EmptyState
                icon={<Zap className="w-6 h-6" />}
                title="No webhooks registered"
                description="Register a webhook URL to receive real-time event notifications when payroll runs, invoices, or expenses are processed."
              />
            </motion.div>
          )}

          {webhooksList.length > 0 && (
            <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">URL</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Events</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Last delivery</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {webhooksList.map((hook) => (
                    <tr key={hook.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs text-slate-700 break-all max-w-xs">{hook.url}</td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {hook.events.map((e) => (
                            <span key={e} className="px-2 py-0.5 rounded-md text-xs bg-slate-100 text-slate-600">{e}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          hook.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                          hook.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {hook.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {hook.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-500">{hook.lastDeliveryAt ? hook.lastDeliveryAt.slice(0, 16).replace('T', ' ') : '—'}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleDeleteWebhook(hook.id)}
                          disabled={deletingHook === hook.id}
                          className="p-2 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors disabled:opacity-60"
                          title="Delete webhook"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {showWebhookModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowWebhookModal(false)}>
              <div className="w-full max-w-lg rounded-xl bg-white p-6 border-2 border-[var(--ink)]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Register Webhook</h3>
                  <button onClick={() => setShowWebhookModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Endpoint URL</label>
                    <input
                      type="url"
                      value={hookUrl}
                      onChange={(e) => setHookUrl(e.target.value)}
                      placeholder="https://example.com/webhooks/platform"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-sky-500 placeholder-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">Events to receive</label>
                    <div className="grid grid-cols-1 gap-2">
                      {WEBHOOK_EVENT_OPTIONS.map((opt) => (
                        <label key={opt.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hookEvents.includes(opt.id)}
                            onChange={() => toggleHookEvent(opt.id)}
                            className="rounded"
                          />
                          <span className="text-sm text-slate-700"><span className="font-mono text-xs text-slate-500">{opt.id}</span> — {opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {hookError && <p className="text-xs text-red-600">{hookError}</p>}
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      onClick={() => setShowWebhookModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRegisterWebhook}
                      disabled={hookSaving}
                      className="px-4 py-2 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] text-sm font-medium disabled:opacity-60"
                    >
                      {hookSaving ? 'Registering…' : 'Register'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'api' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl p-6" style={card}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">platform Platform API</h3>
            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                <p className="text-xs text-slate-500 font-medium mb-2">Base URL</p>
                <code className="px-3 py-2 rounded-lg bg-slate-100 text-emerald-400 font-mono text-sm">https://api.PayrollPlatform/v1</code>
              </div>
              <div className="rounded-xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                <p className="text-xs text-slate-500 font-medium mb-2">Authentication</p>
                <p className="text-sm text-slate-400 mb-2">Use Bearer token authentication with your API key:</p>
                <code className="block px-3 py-2 rounded-lg bg-slate-100 text-cyan-400 font-mono text-sm">Authorization: Bearer YOUR_API_KEY</code>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
            <div className="px-6 py-4 border-b border-slate-200">
              <h4 className="font-semibold text-slate-900">Endpoints</h4>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Endpoint</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Auth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apiEndpoints.map((ep, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        ep.method === 'GET' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>{ep.method}</span>
                    </td>
                    <td className="px-6 py-3 font-mono text-cyan-400 text-xs">{ep.path}</td>
                    <td className="px-6 py-3 text-slate-600">{ep.description}</td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{ep.auth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      )}
    </PageContainer>
  );
}
