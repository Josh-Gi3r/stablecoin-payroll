import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, AlertTriangle, CheckCircle2, Clock, Download, Loader2 } from 'lucide-react';
import { fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, PageHeader, Surface, IconChip, Pill, Button } from '../ui';
import { useOrgRole } from '../../contexts/OrgRoleContext';
import { statutory as statutoryApi } from '../../lib/api';
import { useApiList } from '../../hooks/useApi';

// Track filings the user has marked as submitted in localStorage. There is
// no server-side submission state yet; this gives the UI a stable "Filed"
// flag across reloads until a /api/statutory/submissions endpoint lands.
const SUBMITTED_KEY = 'payrollApp.filings.submitted.v1';
function loadSubmitted(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(SUBMITTED_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function saveSubmitted(set: Set<string>) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(SUBMITTED_KEY, JSON.stringify(Array.from(set))); } catch { /* noop */ }
}

// Map a filing scheme + country to the agency-format slug for the
// /api/statutory/filings/:format endpoint.
function downloadFormatFor(scheme: string, country: 'MY' | 'SG'): string | null {
  if (country !== 'MY') return null;
  if (/PCB|LHDN|WHT/i.test(scheme)) return 'lhdn-pcb';
  if (/EPF|KWSP/i.test(scheme))     return 'kwsp-ecaruman';
  if (/SOCSO|EIS|PERKESO/i.test(scheme)) return 'perkeso-assist';
  if (/HRDF|HRD/i.test(scheme))     return 'hrdcorp-etris';
  return null;
}

async function downloadFiling(format: string, clientId?: string) {
  const url = new URL('/api/statutory/filings/' + format, window.location.origin);
  const now = new Date();
  url.searchParams.set('year', String(now.getFullYear()));
  url.searchParams.set('month', String(now.getMonth() + 1));
  if (clientId) url.searchParams.set('clientId', clientId);
  const res = await fetch(url.toString(), { credentials: 'include' });
  if (!res.ok) {
    alert('Failed to generate filing: ' + (await res.text()));
    return;
  }
  const blob = await res.blob();
  const filename = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]
    ?? `${format}.txt`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

interface Filing {
  id: string;
  client: string;
  scheme: string;
  country: 'MY' | 'SG';
  amount: string;
  dueDate: string;
  daysUntil: number;
  status: 'filed' | 'due_soon' | 'overdue';
}

function statusTone(s: Filing['status']) {
  return s === 'overdue' ? 'danger' : s === 'due_soon' ? 'warn' : 'success';
}

function statusIcon(s: Filing['status']) {
  if (s === 'overdue') return <AlertTriangle className="w-3.5 h-3.5" />;
  if (s === 'filed')   return <CheckCircle2 className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
}

export default function FilingCalendarView() {
  const { persona } = useOrgRole();
  const now = new Date();
  const { data: rawFilings, loading, error } = useApiList<Filing>(
    () => statutoryApi.filings({ year: now.getFullYear(), month: now.getMonth() + 1 }),
    [],
    'Failed to load filings',
  );
  const [submitted, setSubmitted] = useState<Set<string>>(() => loadSubmitted());
  useEffect(() => { saveSubmitted(submitted); }, [submitted]);

  // Apply local "submitted" flag on top of server status. If the server
  // already returned 'filed' we leave it; otherwise we promote items the
  // user has marked submitted to 'filed'.
  const filings = rawFilings.map((f) =>
    submitted.has(f.id) && f.status !== 'filed' ? { ...f, status: 'filed' as const } : f,
  );

  const handleSubmit = async (f: Filing) => {
    const fmt = downloadFormatFor(f.scheme, f.country);
    if (fmt) await downloadFiling(fmt, persona.org.clientId);
    setSubmitted((prev) => {
      const next = new Set(prev);
      next.add(f.id);
      return next;
    });
  };

  const handleSubmitAll = async () => {
    const pending = filings.filter((f) => f.status !== 'filed');
    if (pending.length === 0) return;
    if (!window.confirm(`Submit ${pending.length} pending filing${pending.length === 1 ? '' : 's'}? Each one downloads its agency file.`)) return;
    for (const f of pending) await handleSubmit(f);
  };

  const overdue = filings.filter((f) => f.status === 'overdue');
  const dueSoon = filings.filter((f) => f.status === 'due_soon');
  const filed   = filings.filter((f) => f.status === 'filed');

  return (
    <PageContainer>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUp}>
          <PageHeader
            eyebrow="Compliance"
            title="Filing calendar"
            subtitle="Statutory deadlines across all clients and countries. PayrollPlatform files on behalf of EOR clients; Payroll-only clients file themselves with PayrollPlatform-generated files."
            actions={<Button variant="primary" size="sm" onClick={handleSubmitAll} disabled={filings.filter((f) => f.status !== 'filed').length === 0}>Submit all pending</Button>}
          />
        </motion.div>

        {error && (
          <div
            className="rounded-xl px-3 py-2 flex items-center gap-2 text-sm"
            style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid var(--error)', color: 'var(--danger)' }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading && filings.length === 0 && (
          <Surface padding="md">
            <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading filings…
            </div>
          </Surface>
        )}

        {/* Status summary */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Surface padding="md" tone={overdue.length > 0 ? 'accent' : 'default'}>
            <div className="flex items-center gap-3">
              <IconChip icon={<AlertTriangle className="w-4 h-4" />} tone="danger" size="sm" />
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Overdue</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{overdue.length}</p>
              </div>
            </div>
          </Surface>
          <Surface padding="md">
            <div className="flex items-center gap-3">
              <IconChip icon={<Clock className="w-4 h-4" />} tone="primary" size="sm" />
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Due in 7 days</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{dueSoon.length}</p>
              </div>
            </div>
          </Surface>
          <Surface padding="md">
            <div className="flex items-center gap-3">
              <IconChip icon={<CheckCircle2 className="w-4 h-4" />} tone="primary" size="sm" />
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Filed</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{filed.length}</p>
              </div>
            </div>
          </Surface>
        </motion.div>

        {/* Per-section lists */}
        {[
          { title: 'Overdue — file now',     items: overdue },
          { title: 'Due soon (next 7 days)', items: dueSoon },
          { title: 'Already filed',          items: filed   },
        ].map((section) => (
          section.items.length > 0 && (
            <motion.div key={section.title} variants={fadeUp}>
              <Surface padding="none" className="overflow-hidden">
                <div className="px-5 md:px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{section.title}</h2>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{section.items.length} filing{section.items.length > 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {section.items.map((f) => (
                    <div key={f.id} className="px-5 md:px-6 py-3 flex items-center gap-3 flex-wrap">
                      <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{f.scheme} <span className="text-[10px] uppercase tracking-wider ml-2" style={{ color: 'var(--text-muted)' }}>{f.country}</span></p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{f.client}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Amount</p>
                        <p className="text-sm font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{f.amount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Due</p>
                        <p className="text-sm font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{f.dueDate}</p>
                      </div>
                      <Pill tone={statusTone(f.status)} size="sm">
                        {statusIcon(f.status)}
                        {f.status === 'filed' ? 'Filed' : f.status === 'overdue' ? `${Math.abs(f.daysUntil)}d overdue` : f.daysUntil === 0 ? 'Today' : `in ${f.daysUntil}d`}
                      </Pill>
                      {(() => {
                        const fmt = downloadFormatFor(f.scheme, f.country);
                        if (!fmt) return null;
                        return (
                          <Button
                            variant="outlined"
                            size="sm"
                            icon={<Download className="w-3.5 h-3.5" />}
                            onClick={() => downloadFiling(fmt, persona.org.clientId)}
                          >
                            Download
                          </Button>
                        );
                      })()}
                      {f.status !== 'filed' && (
                        <Button variant="primary" size="sm" onClick={() => handleSubmit(f)}>Submit</Button>
                      )}
                    </div>
                  ))}
                </div>
              </Surface>
            </motion.div>
          )
        ))}
      </motion.div>
    </PageContainer>
  );
}
