import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Eye, EyeOff, Bell, Shield, Palette, User } from 'lucide-react';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, Tab, Tabs } from '../ui';
import { auth as authApi, notifications as notificationsApi } from '../../lib/api';

interface DashboardWidget {
  id: string;
  name: string;
  visible: boolean;
  pinned: boolean;
}

const defaultWidgets: DashboardWidget[] = [
  { id: '1', name: 'Total Employees', visible: true, pinned: true },
  { id: '2', name: 'Monthly Payroll', visible: true, pinned: true },
  { id: '3', name: 'Settlement Fees Saved', visible: true, pinned: false },
  { id: '4', name: 'Pending Invoices', visible: true, pinned: false },
  { id: '5', name: 'Monthly Payroll Trend', visible: true, pinned: false },
  { id: '6', name: 'Employees by Department', visible: true, pinned: false },
  { id: '7', name: 'Multi-Currency Holdings', visible: true, pinned: false },
  { id: '8', name: 'Quick Stats', visible: true, pinned: false },
  { id: '9', name: 'FX Rate Monitor', visible: true, pinned: false },
  { id: '10', name: 'Compliance Status', visible: true, pinned: false },
  { id: '11', name: 'Upcoming Deadlines', visible: false, pinned: false },
  { id: '12', name: 'Recent Transactions', visible: true, pinned: false },
];

const WIDGETS_KEY = 'payrollApp.dashboardWidgets.v1';
const PREFS_KEY = 'payrollApp.notificationPrefs.v1';

type Prefs = {
  emailNotifications: boolean;
  taxAlerts: boolean;
  fxAlerts: boolean;
  payrollAlerts: boolean;
  slackIntegration: boolean;
};

const DEFAULT_PREFS: Prefs = {
  emailNotifications: true,
  taxAlerts: true,
  fxAlerts: true,
  payrollAlerts: true,
  slackIntegration: false,
};

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage quota or disabled — silently ignore.
  }
}

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    const stored = loadJson<DashboardWidget[] | null>(WIDGETS_KEY, null as any);
    if (Array.isArray(stored) && stored.length === defaultWidgets.length) return stored;
    return defaultWidgets;
  });
  const [prefs, setPrefs] = useState<Prefs>(() => loadJson(PREFS_KEY, DEFAULT_PREFS));
  const [userId, setUserId] = useState<string | null>(null);
  const [me, setMe] = useState<{ id?: string; email?: string; name?: string; company?: string; role?: string } | null>(null);

  // Account form: bind to me + persisted timezone/currency.
  const [acctName, setAcctName] = useState('');
  const [acctCompany, setAcctCompany] = useState('');
  const [acctTz, setAcctTz] = useState(() => loadJson<string>('payrollApp.account.tz.v1', 'UTC'));
  const [acctCurrency, setAcctCurrency] = useState(() => loadJson<string>('payrollApp.account.currency.v1', 'USD (USDC)'));
  const [acctSaving, setAcctSaving] = useState(false);
  const [acctMessage, setAcctMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Password form
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => { saveJson(WIDGETS_KEY, widgets); }, [widgets]);
  useEffect(() => { saveJson(PREFS_KEY, prefs); }, [prefs]);

  // Hydrate emailNotifications from server preferences once we know the user.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await authApi.me();
        const uid = meRes?.user?.id ?? null;
        if (cancelled || !uid) return;
        setUserId(uid);
        setMe(meRes.user);
        setAcctName(meRes.user?.name ?? '');
        setAcctCompany(meRes.user?.company ?? '');
        const { preferences } = await notificationsApi.preferences(uid);
        if (cancelled || !preferences) return;
        setPrefs((p) => ({
          ...p,
          emailNotifications: preferences.emailEnabled !== false,
          taxAlerts: preferences.taxAlerts !== false,
          fxAlerts: preferences.fxAlerts !== false,
          payrollAlerts: preferences.payrollAlerts !== false,
          slackIntegration: preferences.slackEnabled === true,
        }));
      } catch {
        // Best-effort sync; localStorage stays the source of truth on failure.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSaveAccount = async () => {
    setAcctSaving(true);
    setAcctMessage(null);
    try {
      const updated = await authApi.updateProfile({
        name: acctName.trim() || undefined,
        company: acctCompany.trim() || undefined,
      });
      // Timezone + base currency are local only (no schema column for them).
      saveJson('payrollApp.account.tz.v1', acctTz);
      saveJson('payrollApp.account.currency.v1', acctCurrency);
      if (updated?.user) setMe(updated.user);
      setAcctMessage({ kind: 'ok', text: 'Account saved.' });
    } catch (e: any) {
      setAcctMessage({ kind: 'err', text: e?.response?.data?.error ?? e?.message ?? 'Failed to save account.' });
    } finally {
      setAcctSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwMessage({ kind: 'err', text: 'Fill all three fields.' });
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwMessage({ kind: 'err', text: 'New password and confirmation do not match.' });
      return;
    }
    if (pwNew.length < 8) {
      setPwMessage({ kind: 'err', text: 'New password must be at least 8 characters.' });
      return;
    }
    setPwSaving(true);
    setPwMessage(null);
    try {
      await authApi.changePassword({ currentPassword: pwCurrent, newPassword: pwNew });
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
      setPwMessage({ kind: 'ok', text: 'Password updated.' });
    } catch (e: any) {
      setPwMessage({ kind: 'err', text: e?.response?.data?.error ?? e?.message ?? 'Failed to update password.' });
    } finally {
      setPwSaving(false);
    }
  };

  // Persist all 4 notification toggles to backend.
  useEffect(() => {
    if (!userId) return;
    notificationsApi.updatePreferences(userId, {
      emailEnabled: prefs.emailNotifications,
      taxAlerts: prefs.taxAlerts,
      fxAlerts: prefs.fxAlerts,
      payrollAlerts: prefs.payrollAlerts,
      slackEnabled: prefs.slackIntegration,
    }).catch(() => {});
  }, [userId, prefs.emailNotifications, prefs.taxAlerts, prefs.fxAlerts, prefs.payrollAlerts, prefs.slackIntegration]);

  const emailNotifications = prefs.emailNotifications;
  const taxAlerts = prefs.taxAlerts;
  const fxAlerts = prefs.fxAlerts;
  const payrollAlerts = prefs.payrollAlerts;
  const slackIntegration = prefs.slackIntegration;
  const setEmailNotifications = (v: boolean) => setPrefs((p) => ({ ...p, emailNotifications: v }));
  const setTaxAlerts = (v: boolean) => setPrefs((p) => ({ ...p, taxAlerts: v }));
  const setFxAlerts = (v: boolean) => setPrefs((p) => ({ ...p, fxAlerts: v }));
  const setPayrollAlerts = (v: boolean) => setPrefs((p) => ({ ...p, payrollAlerts: v }));
  const setSlackIntegration = (v: boolean) => setPrefs((p) => ({ ...p, slackIntegration: v }));

  const toggleWidget = (id: string) => {
    setWidgets(widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  };

  const togglePin = (id: string) => {
    setWidgets(widgets.map((w) => (w.id === id ? { ...w, pinned: !w.pinned } : w)));
  };

  const [layoutToast, setLayoutToast] = useState<string | null>(null);
  const handleSaveLayout = () => {
    saveJson(WIDGETS_KEY, widgets);
    setLayoutToast('Dashboard layout saved.');
    setTimeout(() => setLayoutToast(null), 2400);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <PageContainer>
      <Tabs value={activeTab} onChange={setActiveTab}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return <Tab key={tab.id} value={tab.id} label={tab.label} icon={<Icon className="w-4 h-4" />} />;
        })}
      </Tabs>

      {activeTab === 'dashboard' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl p-6" style={card}>
            <h3 className="font-semibold text-slate-900 mb-2">Dashboard Widgets</h3>
            <p className="text-sm text-slate-500 mb-5">Customize which widgets appear on your dashboard. Pin favorites for quick access.</p>
            <div className="space-y-2">
              {widgets.map((widget) => (
                <div key={widget.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleWidget(widget.id)}
                      className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                        widget.visible ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                      {widget.visible && <span className="text-xs">&#10003;</span>}
                    </button>
                    <span className={`font-medium text-sm ${widget.visible ? 'text-slate-700' : 'text-slate-500'}`}>{widget.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {widget.visible && (
                      <button onClick={() => togglePin(widget.id)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                          widget.pinned ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500 hover:text-slate-600'
                        }`}>
                        {widget.pinned ? 'Pinned' : 'Pin'}
                      </button>
                    )}
                    <button onClick={() => toggleWidget(widget.id)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                      {widget.visible ? <Eye className="w-4 h-4 text-slate-400" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleSaveLayout} className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium transition-all">
              <Save className="w-4 h-4" />Save Dashboard Layout
            </button>
            {layoutToast && <p className="mt-2 text-xs text-emerald-700 text-center">{layoutToast}</p>}
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'notifications' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl p-6" style={card}>
            <h3 className="font-semibold text-slate-900 mb-5">Notification Preferences</h3>
            <div className="space-y-3">
              {[
                { label: 'Email Notifications', desc: 'Receive email alerts for important events', state: emailNotifications, toggle: () => setEmailNotifications(!emailNotifications) },
                { label: 'Tax Filing Alerts', desc: 'Get notified about upcoming tax deadlines', state: taxAlerts, toggle: () => setTaxAlerts(!taxAlerts) },
                { label: 'FX Rate Alerts', desc: 'Get notified when FX rates improve for rebalancing', state: fxAlerts, toggle: () => setFxAlerts(!fxAlerts) },
                { label: 'Payroll Reminders', desc: 'Reminders before payroll processing deadlines', state: payrollAlerts, toggle: () => setPayrollAlerts(!payrollAlerts) },
                { label: 'Slack Integration', desc: 'Push notifications to your Slack workspace', state: slackIntegration, toggle: () => setSlackIntegration(!slackIntegration) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div>
                    <p className="font-medium text-sm text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                  </div>
                  <button onClick={item.toggle}
                    className={`relative w-11 h-6 rounded-full transition-colors ${item.state ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${item.state ? 'translate-x-5.5 left-0.5' : 'left-0.5'}`}
                      style={{ transform: item.state ? 'translateX(22px)' : 'translateX(0)' }} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'account' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl p-6" style={card}>
            <h3 className="font-semibold text-slate-900 mb-5">Account Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400">Email Address</label>
                <input type="email" value={me?.email ?? ''} disabled
                  className="w-full mt-1.5 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm font-mono cursor-not-allowed"
                  placeholder="Loading…" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">Company Name</label>
                <input
                  type="text"
                  value={acctCompany}
                  onChange={(e) => setAcctCompany(e.target.value)}
                  className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                  placeholder="PayrollPlatform"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">Display Name</label>
                <input
                  type="text"
                  value={acctName}
                  onChange={(e) => setAcctName(e.target.value)}
                  className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                  placeholder="Your name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400">Timezone</label>
                  <select
                    value={acctTz}
                    onChange={(e) => setAcctTz(e.target.value)}
                    className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                  >
                    <option>UTC</option><option>EST (UTC-5)</option><option>PST (UTC-8)</option><option>GMT (UTC+0)</option><option>SGT (UTC+8)</option><option>JST (UTC+9)</option><option>AEST (UTC+10)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400">Base Currency</label>
                  <select
                    value={acctCurrency}
                    onChange={(e) => setAcctCurrency(e.target.value)}
                    className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500"
                  >
                    <option>USD (USDC)</option><option>EUR (EURC)</option><option>GBP (GBPC)</option><option>SGD (XSGD)</option><option>BRL (BRLC)</option>
                  </select>
                </div>
              </div>
              {acctMessage && (
                <p className={`text-xs ${acctMessage.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {acctMessage.text}
                </p>
              )}
              <button
                onClick={handleSaveAccount}
                disabled={acctSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium transition-all disabled:opacity-60"
              >
                <Save className="w-4 h-4" />{acctSaving ? 'Saving…' : 'Save Account Settings'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'security' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl p-6" style={card}>
            <h3 className="font-semibold text-slate-900 mb-5">Security Settings</h3>
            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                <p className="font-medium text-sm text-slate-700 mb-2">Change Password</p>
                <div className="space-y-3">
                  <input type="password" placeholder="Current password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500 placeholder-slate-400" />
                  <input type="password" placeholder="New password (min 8 chars)" value={pwNew} onChange={(e) => setPwNew(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500 placeholder-slate-400" />
                  <input type="password" placeholder="Confirm new password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-sky-500 placeholder-slate-400" />
                </div>
                {pwMessage && (
                  <p className={`mt-3 text-xs ${pwMessage.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{pwMessage.text}</p>
                )}
                <button
                  onClick={handleChangePassword}
                  disabled={pwSaving}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium transition-all disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />{pwSaving ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </PageContainer>
  );
}
