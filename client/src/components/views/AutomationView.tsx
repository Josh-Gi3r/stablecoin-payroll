import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, CheckCircle, Plus, Edit2, Trash2, Clock, Play, Pause, RotateCcw } from 'lucide-react';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, Tab, Tabs, ErrorBanner, LoadingState, EmptyState } from '../ui';
import { automation as automationApi } from '../../lib/api';
import { useApiList, coerceError } from '../../hooks/useApi';

type ServerRule = {
  id: string;
  name: string;
  trigger: string;
  isActive: boolean;
  lastRun: string | null;
  runCount: number;
};

export default function AutomationView() {
  const [activeTab, setActiveTab] = useState('rules');
  const [acting, setActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftTrigger, setDraftTrigger] = useState('Monthly · 25th @ 22:00');

  const { data: rules, loading, error: loadError, reload } = useApiList<ServerRule>(
    () => automationApi.rules(),
    [],
    'Failed to load automation rules',
  );

  const error = loadError ?? actionError;

  const togglePause = async (rule: ServerRule) => {
    setActing(rule.id);
    setActionError(null);
    try {
      await automationApi.updateRule(rule.id, { isActive: !rule.isActive });
      await reload();
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to update rule'));
    } finally {
      setActing(null);
    }
  };

  const handleCreate = async () => {
    if (!draftName.trim() || !draftTrigger.trim()) {
      setActionError('Name and trigger are required.');
      return;
    }
    setCreating(true);
    setActionError(null);
    try {
      await automationApi.createRule({ name: draftName.trim(), trigger: draftTrigger.trim() });
      setDraftName('');
      setDraftTrigger('Monthly · 25th @ 22:00');
      setShowCreate(false);
      await reload();
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to create rule'));
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (rule: ServerRule) => {
    const next = window.prompt('Rename automation rule:', rule.name);
    if (!next || next.trim() === rule.name) return;
    setActing(rule.id);
    setActionError(null);
    try {
      await automationApi.updateRule(rule.id, { name: next.trim() });
      await reload();
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to rename rule'));
    } finally {
      setActing(null);
    }
  };

  const handleDelete = async (rule: ServerRule) => {
    if (!window.confirm(`Delete "${rule.name}"? This cannot be undone.`)) return;
    setActing(rule.id);
    setActionError(null);
    try {
      await automationApi.deleteRule(rule.id);
      await reload();
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to delete rule'));
    } finally {
      setActing(null);
    }
  };

  const tabs = [
    { id: 'rules', label: 'Automation Rules', icon: Zap },
    { id: 'logs', label: 'Execution Logs', icon: Clock },
  ];

  const activeRules = rules.filter((r) => r.isActive).length;
  const totalRuns = rules.reduce((s, r) => s + (r.runCount || 0), 0);

  return (
    <PageContainer>
      <Tabs value={activeTab} onChange={setActiveTab}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return <Tab key={tab.id} value={tab.id} label={tab.label} icon={<Icon className="w-4 h-4" />} />;
        })}
      </Tabs>

      <ErrorBanner message={error} onRetry={reload} />

      {loading && rules.length === 0 && (
        <div className="rounded-xl" style={card}>
          <LoadingState label="Loading automation rules…" />
        </div>
      )}

      {activeTab === 'rules' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Active Rules', value: `${activeRules}`, sub: `of ${rules.length} total`, accent: 'text-emerald-400' },
              { label: 'Total Runs', value: `${totalRuns}`, sub: 'Across all rules', accent: 'text-cyan-400' },
              { label: 'Paused Rules', value: `${rules.length - activeRules}`, sub: 'Awaiting resume', accent: 'text-amber-400' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl p-5" style={card}>
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className={`text-2xl font-bold mt-2 ${c.accent}`}>{c.value}</p>
                <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Payroll & HR Automations</h3>
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium text-sm"
            >
              <Plus className="w-4 h-4" />{showCreate ? 'Cancel' : 'Create Rule'}
            </button>
          </motion.div>

          {showCreate && (
            <motion.div variants={fadeUp} className="rounded-xl p-5 space-y-3" style={card}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Rule name</label>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="e.g. Monthly Payroll — All Employees"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Trigger</label>
                  <input
                    type="text"
                    value={draftTrigger}
                    onChange={(e) => setDraftTrigger(e.target.value)}
                    placeholder="e.g. Monthly · 25th @ 22:00"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                  className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="px-3 py-2 rounded-full bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] text-sm font-medium disabled:opacity-60"
                >
                  {creating ? 'Creating…' : 'Create rule'}
                </button>
              </div>
            </motion.div>
          )}

          {rules.length === 0 && !loading && (
            <div className="rounded-xl" style={card}>
              <EmptyState
                icon={<Zap className="w-6 h-6" />}
                title="No automation rules yet"
                description="Create a rule to automate payroll runs, statutory reminders, or HR alerts."
              />
            </div>
          )}

          {rules.map((rule) => {
            const isActing = acting === rule.id;
            return (
              <motion.div key={rule.id} variants={fadeUp} className="rounded-xl p-5 hover:bg-slate-50 transition-colors" style={card}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(125, 211, 252,0.1)', border: '1px solid var(--border-default)' }}>
                        <Zap className="w-3.5 h-3.5 text-sky-600" />
                      </div>
                      <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        rule.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>{rule.isActive ? 'Active' : 'Paused'}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs ml-9 mt-2">
                      <div><span className="text-slate-400">Trigger:</span> <span className="text-slate-600">{rule.trigger}</span></div>
                      <div><span className="text-slate-400">Last Run:</span> <span className="text-slate-400">{rule.lastRun ?? 'Never'}</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => togglePause(rule)}
                      disabled={isActing}
                      className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                      title={rule.isActive ? 'Pause' : 'Resume'}
                    >
                      {rule.isActive ? <Pause className="w-4 h-4 text-slate-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
                    </button>
                    <button onClick={() => handleEdit(rule)} disabled={isActing} className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50" title="Rename">
                      <Edit2 className="w-4 h-4 text-slate-400" />
                    </button>
                    <button onClick={() => handleDelete(rule)} disabled={isActing} className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50" title="Delete">
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-3 border-t border-slate-100 ml-9">
                  <div className="flex items-center gap-1 text-xs text-slate-500"><RotateCcw className="w-3 h-3" /> {rule.runCount} runs</div>
                  {rule.isActive && <div className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="w-3 h-3" /> Enabled</div>}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {activeTab === 'logs' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl" style={card}>
            <EmptyState
              icon={<Clock className="w-6 h-6" />}
              title="Execution logs not yet available"
              description="Per-run execution history will appear here once the automation runtime is enabled."
            />
          </motion.div>
        </motion.div>
      )}
    </PageContainer>
  );
}
