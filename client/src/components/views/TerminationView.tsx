import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserMinus, Calculator, ArrowRight, AlertTriangle } from 'lucide-react';
import { fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, PageHeader, Surface, IconChip, Pill, Button, Field, SelectField } from '../ui';
import { settlement as settlementApi } from '../../lib/api';
import { coerceError } from '../../hooks/useApi';

interface SettlementBreakdown {
  proRataSalary: number;
  leaveEncashment: number;
  noticeInLieuPay: number;
  statutorySeverance: number;
  terminationBenefits: number;
  depositRefund: number;
  total: number;
}

interface SettlementResult {
  breakdown: SettlementBreakdown;
  depositRefunded: number;
}

const LINE_ITEMS: Array<{ key: keyof SettlementBreakdown; label: string; hint: string }> = [
  { key: 'proRataSalary',       label: 'Pro-rata salary',         hint: 'Days worked in cessation month' },
  { key: 'leaveEncashment',     label: 'Leave encashment',         hint: 'Unused annual leave × daily wage' },
  { key: 'noticeInLieuPay',     label: 'Notice in lieu',           hint: 'Days × daily wage when notice not served' },
  { key: 'statutorySeverance',  label: 'Statutory severance',      hint: 'MY EA s60J: 10/15/20 days × years × wage/30' },
  { key: 'terminationBenefits', label: 'Termination benefits',     hint: 'Gratuity / bonus / employer-discretionary' },
  { key: 'depositRefund',       label: 'EOR deposit refund',       hint: 'Residual balance refunded to client' },
];

export default function TerminationView() {
  const [employeeId, setEmployeeId] = useState('emp-001');
  const [cessationDate, setCessationDate] = useState(new Date().toISOString().slice(0, 10));
  const [initiatedBy, setInitiatedBy] = useState<'employer' | 'employee' | 'misconduct'>('employer');
  const [unusedAnnualLeaveDays, setLeaveDays] = useState('5');
  const [noticeInLieuDays, setNoticeDays] = useState('0');
  const [contractualSeverance, setSeverance] = useState('');
  const [terminationBenefits, setBenefits] = useState('');

  const [result, setResult] = useState<SettlementResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function calculate() {
    setLoading(true);
    setError(null);
    try {
      const data = await settlementApi.final({
        employeeId,
        cessationDate,
        initiatedBy,
        unusedAnnualLeaveDays: Number(unusedAnnualLeaveDays) || 0,
        noticeInLieuDays: Number(noticeInLieuDays) || 0,
        contractualSeverance: contractualSeverance ? Number(contractualSeverance) : undefined,
        terminationBenefits: terminationBenefits ? Number(terminationBenefits) : undefined,
      });
      setResult(data);
    } catch (e: any) {
      setError(coerceError(e, 'Failed to calculate final settlement'));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUp}>
          <PageHeader
            eyebrow="HR · Termination"
            title="Final settlement calculator"
            subtitle="Compute pro-rata pay, leave encashment, notice-in-lieu, statutory severance, and EOR deposit refund. Hits POST /api/settlement/final."
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <motion.div variants={fadeUp}>
            <Surface padding="md">
              <div className="flex items-center gap-3 mb-4">
                <IconChip icon={<UserMinus className="w-4 h-4" />} tone="danger" size="md" />
                <div>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Termination details</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Severance only applies in MY when employer-initiated.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Employee ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId((e.target as HTMLInputElement).value)}
                />
                <Field
                  label="Cessation date"
                  type="date"
                  value={cessationDate}
                  onChange={(e) => setCessationDate((e.target as HTMLInputElement).value)}
                />
                <SelectField
                  label="Initiated by"
                  value={initiatedBy}
                  onChange={(e) => setInitiatedBy((e.target as HTMLSelectElement).value as any)}
                >
                  <option value="employer">Employer</option>
                  <option value="employee">Employee (resignation)</option>
                  <option value="misconduct">Summary dismissal</option>
                </SelectField>
                <Field
                  label="Unused annual leave (days)"
                  type="number"
                  value={unusedAnnualLeaveDays}
                  onChange={(e) => setLeaveDays((e.target as HTMLInputElement).value)}
                />
                <Field
                  label="Notice-in-lieu (days)"
                  type="number"
                  value={noticeInLieuDays}
                  onChange={(e) => setNoticeDays((e.target as HTMLInputElement).value)}
                />
                <Field
                  label="Contractual severance (optional)"
                  type="number"
                  value={contractualSeverance}
                  onChange={(e) => setSeverance((e.target as HTMLInputElement).value)}
                />
                <Field
                  label="Termination benefits (optional)"
                  type="number"
                  value={terminationBenefits}
                  onChange={(e) => setBenefits((e.target as HTMLInputElement).value)}
                  className="md:col-span-2"
                />
              </div>

              <div className="mt-5 flex items-center justify-end">
                <Button
                  variant="primary"
                  size="md"
                  icon={<Calculator className="w-4 h-4" />}
                  onClick={calculate}
                  disabled={loading}
                >
                  {loading ? 'Calculating…' : 'Calculate settlement'}
                </Button>
              </div>

              {error && (
                <div
                  className="mt-4 rounded-xl p-3 flex items-start gap-2"
                  style={{
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid var(--error)',
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--danger)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                </div>
              )}
            </Surface>
          </motion.div>

          {/* Breakdown */}
          <motion.div variants={fadeUp}>
            <Surface padding="md">
              <div className="flex items-center gap-3 mb-4">
                <IconChip icon={<ArrowRight className="w-4 h-4" />} tone="primary" size="md" />
                <div>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Final settlement breakdown</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {result ? 'Computed values from the settlement engine.' : 'Run the calculation to see line items.'}
                  </p>
                </div>
              </div>

              {!result ? (
                <div
                  className="rounded-xl p-6 text-center"
                  style={{ background: 'var(--bg-surface-subtle)', border: '1px dashed var(--border-default)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No settlement computed yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {LINE_ITEMS.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: 'var(--bg-surface-subtle)' }}
                    >
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.hint}</p>
                      </div>
                      <p className="text-sm font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
                        {result.breakdown[item.key].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}

                  <div
                    className="flex items-center justify-between p-4 rounded-lg mt-3"
                    style={{ background: 'var(--primary-soft)', border: '1px solid var(--border-default)' }}
                  >
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Total final pay</p>
                    <p className="text-base font-mono font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {result.breakdown.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  {result.depositRefunded > 0 && (
                    <Pill tone="success" size="sm" dot>
                      EOR deposit refunded: {result.depositRefunded.toFixed(2)}
                    </Pill>
                  )}
                </div>
              )}
            </Surface>
          </motion.div>
        </div>
      </motion.div>
    </PageContainer>
  );
}
