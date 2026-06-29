import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, BarChart3, DollarSign, CheckCircle, Clock, Calendar, Loader2 } from 'lucide-react';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, Tab, Tabs, ErrorBanner, LoadingState, EmptyState } from '../ui';
import { reports as reportsApi } from '../../lib/api';
import { useApiList, coerceError } from '../../hooks/useApi';

type ServerReport = {
  id: string;
  reportType: string;
  periodStart: string | null;
  periodEnd: string | null;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  status: 'generated' | 'scheduled' | 'sent';
  createdAt: string;
};

const REPORT_TEMPLATES: Array<{ key: string; name: string; description: string; icon: typeof FileText }> = [
  { key: 'general_ledger', name: 'General Ledger', description: 'Complete GL entries with account codes and tax classification', icon: FileText },
  { key: 'profit_loss', name: 'Profit & Loss Statement', description: 'Income statement with revenue, expenses, and net income', icon: BarChart3 },
  { key: 'balance_sheet', name: 'Balance Sheet', description: 'Assets, liabilities, and equity snapshot', icon: DollarSign },
  { key: 'tax_report', name: 'Tax Report', description: 'Tax liability by category and country with compliance status', icon: FileText },
  { key: 'payroll_summary', name: 'Payroll Summary', description: 'Employee payroll with taxes, benefits, and net pay', icon: DollarSign },
  { key: 'fx_gains_losses', name: 'FX Gains/Losses', description: 'Historical FX transactions with realized and unrealized gains', icon: BarChart3 },
];

const REPORT_NAME_BY_KEY: Record<string, string> = REPORT_TEMPLATES.reduce(
  (acc, t) => ({ ...acc, [t.key]: t.name }),
  {} as Record<string, string>,
);

const FORMAT_TO_API: Record<string, ServerReport['format']> = { PDF: 'pdf', CSV: 'csv', XLSX: 'excel' };

export default function ExportView() {
  const [activeTab, setActiveTab] = useState('reports');
  const [selectedFormat, setSelectedFormat] = useState<keyof typeof FORMAT_TO_API>('PDF');
  const [generating, setGenerating] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: items, loading, error: loadError, reload } = useApiList<ServerReport>(
    () => reportsApi.list(),
    [],
    'Failed to load reports',
  );

  const error = loadError ?? actionError;

  const handleGenerate = async (reportType: string) => {
    setGenerating(reportType);
    setActionError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = today.slice(0, 8) + '01';
      await reportsApi.create({
        reportType,
        periodStart: monthStart,
        periodEnd: today,
        format: FORMAT_TO_API[selectedFormat],
      });
      await reload();
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to generate report'));
    } finally {
      setGenerating(null);
    }
  };

  const tabs = [
    { id: 'reports', label: 'Available Reports', icon: FileText },
    { id: 'history', label: `Export History (${items.length})`, icon: Clock },
    { id: 'schedule', label: 'Scheduled Reports', icon: Calendar },
  ];

  return (
    <PageContainer>
      <Tabs value={activeTab} onChange={setActiveTab}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return <Tab key={tab.id} value={tab.id} label={tab.label} icon={<Icon className="w-4 h-4" />} />;
        })}
      </Tabs>

      <ErrorBanner message={error} onRetry={reload} />

      {activeTab === 'reports' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl p-5" style={card}>
            <p className="text-xs text-slate-500 font-medium mb-3">Export Format</p>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(FORMAT_TO_API) as Array<keyof typeof FORMAT_TO_API>).map((format) => (
                <button key={format} onClick={() => setSelectedFormat(format)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    selectedFormat === format
                      ? 'bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)]'
                      : 'bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200'
                  }`}>
                  {format}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REPORT_TEMPLATES.map((template) => {
              const Icon = template.icon;
              const isGenerating = generating === template.key;
              return (
                <div key={template.key} className="rounded-xl p-5 hover:bg-slate-50 transition-colors" style={card}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{template.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleGenerate(template.key)}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--lavender)] text-[var(--ink)] border-2 border-[var(--ink)] font-medium text-sm  transition-all disabled:opacity-60"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isGenerating ? 'Generating…' : `Export as ${selectedFormat}`}
                  </button>
                </div>
              );
            })}
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'history' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          {loading && items.length === 0 && (
            <div className="rounded-xl" style={card}>
              <LoadingState label="Loading export history…" />
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="rounded-xl" style={card}>
              <EmptyState
                icon={<Clock className="w-6 h-6" />}
                title="No exports yet"
                description="Generate a report from the Available Reports tab to see it here."
              />
            </div>
          )}

          {items.length > 0 && (
            <motion.div variants={fadeUp} className="rounded-xl overflow-hidden" style={card}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Report</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Format</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Period</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-400">{r.createdAt.slice(0, 16).replace('T', ' ')}</td>
                      <td className="px-6 py-3.5 font-medium text-slate-700">{REPORT_NAME_BY_KEY[r.reportType] ?? r.reportType}</td>
                      <td className="px-6 py-3.5"><span className="px-2 py-1 rounded-md text-xs font-medium bg-cyan-50 text-cyan-700 uppercase">{r.format}</span></td>
                      <td className="px-6 py-3.5 text-slate-500 text-xs">{r.periodStart && r.periodEnd ? `${r.periodStart} – ${r.periodEnd}` : '—'}</td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          <CheckCircle className="w-3 h-3" />{r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </motion.div>
      )}

      {activeTab === 'schedule' && (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="rounded-xl" style={card}>
            <EmptyState
              icon={<Calendar className="w-6 h-6" />}
              title="Scheduled reports coming soon"
              description="Cron-driven recurring exports require the scheduler runtime. Generate ad-hoc reports for now."
            />
          </motion.div>
        </motion.div>
      )}
    </PageContainer>
  );
}
