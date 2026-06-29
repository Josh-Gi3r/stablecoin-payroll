import { motion } from 'framer-motion';
import { Shield, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { card, fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, PageHeader, Pill, IconChip, Button, ErrorBanner, LoadingState } from '../ui';
import api from '../../lib/api';
import { useApiList } from '../../hooks/useApi';

type ServerRate = {
  id: string;
  country: 'MY' | 'SG';
  scheme: string;
  employeeRate: number;
  employerRate: number;
  effectiveDate: string;
};

const COUNTRY_META: Record<'MY' | 'SG', { name: string; currency: string }> = {
  MY: { name: 'Malaysia',  currency: 'MYR' },
  SG: { name: 'Singapore', currency: 'SGD' },
};

const SCHEME_LABELS: Record<string, string> = {
  epf:           'Employees Provident Fund',
  social_security: 'Social Security Org',
  eis:           'Employment Insurance',
  pcb:           'Monthly Tax Deduction',
  hrdf:          'HRD Corp Levy',
  cpf:           'Central Provident Fund',
  sdl:           'Skills Development Levy',
  fwl:           'Foreign Worker Levy',
  zakat:         'Zakat',
  cp38:          'CP38',
  federal_tax:   'Federal Tax',
};

const fmtRate = (r: number) => r === 0 ? '—' : r < 1 ? `${(r * 100).toFixed(2)}%` : r.toString();

export default function StatutoryView() {
  // Endpoint envelope is { success, country, contributionType, rates: [...] };
  // unwrap to the array so useApiList<ServerRate>'s contract holds.
  const { data: myRates, loading: myLoading, error: myError } = useApiList<ServerRate>(
    () => api.get('/statutory/rates/MY').then(r => r.data.rates ?? []),
    [],
    'Failed to load MY statutory rates',
  );
  const { data: sgRates, loading: sgLoading, error: sgError } = useApiList<ServerRate>(
    () => api.get('/statutory/rates/SG').then(r => r.data.rates ?? []),
    [],
    'Failed to load SG statutory rates',
  );

  const error = myError ?? sgError;
  const loading = myLoading || sgLoading;

  const grouped: Record<'MY' | 'SG', ServerRate[]> = {
    MY: myRates,
    SG: sgRates,
  };

  return (
    <PageContainer>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUp}>
          <PageHeader
            eyebrow="Compliance"
            title="Statutory schemes"
            subtitle="Contribution rates and filing status by country. PayrollPlatform files on your behalf for EOR clients."
            actions={
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const url = new URL('/api/statutory/filings/epf', window.location.origin);
                  const now = new Date();
                  url.searchParams.set('year', String(now.getFullYear()));
                  url.searchParams.set('month', String(now.getMonth() + 1));
                  fetch(url.toString(), { credentials: 'include' }).then(async (res) => {
                    if (!res.ok) { alert('Failed to generate filing: ' + (await res.text())); return; }
                    const blob = await res.blob();
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `epf-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.txt`;
                    document.body.appendChild(a); a.click(); a.remove();
                  });
                }}
              >Download EPF filing</Button>
            }
          />
        </motion.div>

        <ErrorBanner message={error} />
        {loading && myRates.length === 0 && sgRates.length === 0 && (
          <div className="rounded-xl" style={card}>
            <LoadingState label="Loading statutory rates…" />
          </div>
        )}

        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {(['MY', 'SG'] as const).map((code) => {
            const meta = COUNTRY_META[code];
            const rates = grouped[code];
            return (
              <div key={code} className="rounded-xl p-5" style={card}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <IconChip icon={<Shield className="w-4 h-4" />} tone="primary" size="sm" />
                    <div>
                      <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{meta.name}</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {meta.currency} · {rates.length} scheme{rates.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{code}</span>
                </div>

                {rates.length === 0 && !loading ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    No statutory rates configured for {meta.name}.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {rates.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold uppercase" style={{ color: 'var(--text-primary)' }}>{s.scheme}</span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{SCHEME_LABELS[s.scheme] ?? s.scheme}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>EE <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{fmtRate(s.employeeRate)}</span></span>
                            <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>ER <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{fmtRate(s.employerRate)}</span></span>
                            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Eff {s.effectiveDate}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}
