import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, FileCheck, Scroll, Wallet, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, PageHeader, Surface, IconChip, Pill, Button, Field, SelectField, ProgressBar, ErrorBanner } from '../ui';
import { clients as clientsApi } from '../../lib/api';
import { coerceError } from '../../hooks/useApi';

type Step = { id: string; label: string; description: string; icon: any };

const EOR_STEPS: Step[] = [
  { id: 'company',   label: 'Company identification', description: 'Cert of Incorporation, M&A, Business Profile, Proof of Address',                            icon: Building2 },
  { id: 'signatory', label: 'Authorized signatory',   description: 'Board resolution, ID copy of representative who will sign the tripartite',                  icon: FileCheck },
  { id: 'tripartite',label: 'Tripartite agreement',   description: 'Between EOR Provider (employer), client (service recipient), and the employee',                     icon: Scroll },
  { id: 'deposit',   label: 'Trust deposit',          description: 'Notice period × (gross salary + fixed allowances). Held in segregated trust account.',     icon: Wallet },
  { id: 'live',      label: 'Live ✓',                 description: 'KYC reviewed, contract signed, deposit received. Employees can be onboarded.',              icon: CheckCircle2 },
];

const DIRECT_STEPS: Step[] = [
  { id: 'company',   label: 'Company info',         description: 'Basic registration details + authorized contact for billing.',                                icon: Building2 },
  { id: 'payroll',   label: 'Payroll setup',        description: 'Pay frequency, currency, statutory registrations, default chart of accounts.',                icon: FileCheck },
  { id: 'live',      label: 'Live ✓',               description: 'Add employees and run your first payroll.',                                                   icon: CheckCircle2 },
];

type FormState = {
  name: string;
  registrationNumber: string;
  taxId: string;
  country: 'MY' | 'SG';
  signatoryName: string;
  signatoryEmail: string;
  signatoryPhone: string;
  noticeMonths: number;
  avgSalary: number;
  fixedAllowances: number;
  defaultPayFrequency: string;
  defaultCurrency: string;
  epfEmployerNumber: string;
  socsoEmployerNumber: string;
  lhdnEmployerNumber: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  registrationNumber: '',
  taxId: '',
  country: 'MY',
  signatoryName: '',
  signatoryEmail: '',
  signatoryPhone: '',
  noticeMonths: 1,
  avgSalary: 6000,
  fixedAllowances: 500,
  defaultPayFrequency: 'monthly',
  defaultCurrency: 'Stablecoin',
  epfEmployerNumber: '',
  socsoEmployerNumber: '',
  lhdnEmployerNumber: '',
};

export default function ClientOnboardingView() {
  const [mode, setMode] = useState<'eor' | 'direct'>('eor');
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const previewTripartite = () => {
    const lines = [
      'TRIPARTITE EMPLOYMENT AGREEMENT — PREVIEW',
      '==========================================',
      '',
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      '',
      'PARTY A — Employer of Record',
      '  EOR Provider (PayrollPlatform)',
      '',
      'PARTY B — Client (Service Recipient)',
      `  Name:                ${form.name || '—'}`,
      `  Country:             ${form.country}`,
      `  Registration No.:    ${form.registrationNumber || '—'}`,
      `  Tax ID:              ${form.taxId || '—'}`,
      `  Authorized signatory: ${form.signatoryName || '—'} <${form.signatoryEmail || '—'}>`,
      '',
      'PARTY C — Employee',
      '  To be added per individual employment.',
      '',
      'TERMS',
      `  Notice period:       ${form.noticeMonths} month(s)`,
      `  Required deposit:    RM ${((form.avgSalary + form.fixedAllowances) * form.noticeMonths).toLocaleString()}`,
      `  (avg salary RM ${form.avgSalary.toLocaleString()} + allowances RM ${form.fixedAllowances.toLocaleString()}) × ${form.noticeMonths} months`,
      `  Pay frequency:       ${form.defaultPayFrequency}`,
      `  Default currency:    ${form.defaultCurrency}`,
      '',
      'STATUTORY REGISTRATIONS',
      `  EPF Employer No.:    ${form.epfEmployerNumber || 'pending'}`,
      `  SOCSO Employer No.:  ${form.socsoEmployerNumber || 'pending'}`,
      `  LHDN Employer File:  ${form.lhdnEmployerNumber || 'pending'}`,
      '',
      '— END OF PREVIEW —',
      'Final document is generated and signed in-app once all three parties have accepted.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tripartite-preview-${(form.name || 'client').toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const steps = mode === 'eor' ? EOR_STEPS : DIRECT_STEPS;
  const progress = Math.round(((activeStep + 1) / steps.length) * 100);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canFinish = form.name.trim().length > 0;

  const handleFinish = async () => {
    if (!canFinish) {
      setError('Company name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await clientsApi.create({
        name: form.name.trim(),
        country: form.country,
        registrationNumber: form.registrationNumber.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
        primaryContactName: form.signatoryName.trim() || undefined,
        primaryContactEmail: form.signatoryEmail.trim() || undefined,
        primaryContactPhone: form.signatoryPhone.trim() || undefined,
        mode: mode === 'eor' ? 'eor' : 'payroll',
        noticeDefaultMonths: form.noticeMonths,
        defaultPayFrequency: form.defaultPayFrequency,
        defaultCurrency: form.defaultCurrency,
        epfEmployerNumber: form.epfEmployerNumber.trim() || null,
        socsoEmployerNumber: form.socsoEmployerNumber.trim() || null,
        lhdnEmployerNumber: form.lhdnEmployerNumber.trim() || null,
      });
      setCreatedId(created?.id ?? 'created');
    } catch (e: any) {
      setError(coerceError(e, 'Failed to create client'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setForm(EMPTY_FORM);
    setActiveStep(0);
    setCreatedId(null);
    setError(null);
  };

  return (
    <PageContainer>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-4xl">
        <motion.div variants={fadeUp}>
          <PageHeader
            eyebrow="Operator · onboarding"
            title="Onboard a new client"
            subtitle="Choose engagement mode and walk through the required steps. EOR is 5 steps; direct payroll is 3."
            actions={
              <div className="flex gap-2">
                <Button variant={mode === 'eor' ? 'primary' : 'outlined'} size="sm" onClick={() => { setMode('eor'); setActiveStep(0); }}>EOR (full service)</Button>
                <Button variant={mode === 'direct' ? 'primary' : 'outlined'} size="sm" onClick={() => { setMode('direct'); setActiveStep(0); }}>Direct payroll</Button>
              </div>
            }
          />
        </motion.div>

        <ErrorBanner message={error} />

        {createdId && (
          <motion.div variants={fadeUp}>
            <Surface padding="md">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--sky-700)' }} />
                <div className="flex-1">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{form.name} is now live</h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Client created (id <span className="font-mono">{createdId}</span>). You can now add employees, generate the tripartite contract, and fund the trust deposit.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outlined" size="sm" onClick={resetWizard}>Onboard another client</Button>
                  </div>
                </div>
              </div>
            </Surface>
          </motion.div>
        )}

        {!createdId && (
          <>
            <motion.div variants={fadeUp}>
              <Surface padding="md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Step {activeStep + 1} of {steps.length}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{progress}%</span>
                </div>
                <ProgressBar value={progress} tone="primary" size="sm" />
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-4">
                  {steps.map((s, i) => {
                    const Icon = s.icon;
                    const isActive = i === activeStep;
                    const isDone = i < activeStep;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveStep(i)}
                        className="text-left p-3 rounded-xl transition-colors"
                        style={{
                          background: isActive ? 'var(--primary-soft)' : isDone ? 'var(--bg-surface-subtle)' : 'transparent',
                          border: '1px solid',
                          borderColor: isActive ? 'rgba(125, 211, 252, 0.35)' : isDone ? 'var(--border-subtle)' : 'var(--border-default)',
                          opacity: isDone || isActive ? 1 : 0.6,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <IconChip icon={<Icon className="w-3.5 h-3.5" />} tone={isDone ? 'primary' : isActive ? 'tertiary' : 'neutral'} size="sm" />
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--sky-700)' }} />}
                        </div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{s.label}</p>
                      </button>
                    );
                  })}
                </div>
              </Surface>
            </motion.div>

            {(() => {
              const ActiveIcon = steps[activeStep].icon;
              return (
                <motion.div variants={fadeUp}>
                  <Surface padding="md">
                    <div className="flex items-center gap-3 mb-4">
                      <IconChip icon={<ActiveIcon className="w-4 h-4" />} tone="primary" size="md" />
                      <div>
                        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{steps[activeStep].label}</h2>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{steps[activeStep].description}</p>
                      </div>
                    </div>

                    {steps[activeStep].id === 'company' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field
                          label="Registered company name"
                          required
                          value={form.name}
                          onChange={(e) => updateField('name', e.target.value)}
                        />
                        <Field
                          label="Registration number"
                          value={form.registrationNumber}
                          onChange={(e) => updateField('registrationNumber', e.target.value)}
                        />
                        <Field
                          label="Tax ID"
                          value={form.taxId}
                          onChange={(e) => updateField('taxId', e.target.value)}
                        />
                        <SelectField
                          label="Country of incorporation"
                          value={form.country}
                          onChange={(e) => updateField('country', e.target.value as 'MY' | 'SG')}
                        >
                          <option value="MY">Malaysia</option>
                          <option value="SG">Singapore</option>
                        </SelectField>
                      </div>
                    )}

                    {steps[activeStep].id === 'signatory' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field
                          label="Signatory name"
                          value={form.signatoryName}
                          onChange={(e) => updateField('signatoryName', e.target.value)}
                        />
                        <Field
                          label="Email"
                          type="email"
                          value={form.signatoryEmail}
                          onChange={(e) => updateField('signatoryEmail', e.target.value)}
                        />
                        <Field
                          label="Phone"
                          value={form.signatoryPhone}
                          onChange={(e) => updateField('signatoryPhone', e.target.value)}
                        />
                        <Field label="Board resolution PDF" type="file" className="md:col-span-2" />
                      </div>
                    )}

                    {steps[activeStep].id === 'tripartite' && (
                      <div className="space-y-4">
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          The tripartite agreement establishes EOR Provider (via local subsidiary) as the legal employer of record, with the client retaining
                          operational control. Once previewed, all three parties sign in sequence.
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Pill tone="muted" dot>EOR Provider signed</Pill>
                          <Pill tone="warn" dot>Client pending</Pill>
                          <Pill tone="muted" dot>Employee — ready when added</Pill>
                        </div>
                        <Button variant="primary" size="md" icon={<Scroll className="w-4 h-4" />} onClick={previewTripartite}>Preview tripartite</Button>
                      </div>
                    )}

                    {steps[activeStep].id === 'deposit' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Field
                            label="Notice period (months)"
                            type="number"
                            value={String(form.noticeMonths)}
                            onChange={(e) => updateField('noticeMonths', Number((e.target as HTMLInputElement).value) || 1)}
                          />
                          <Field
                            label="Avg gross salary (RM)"
                            type="number"
                            value={String(form.avgSalary)}
                            onChange={(e) => updateField('avgSalary', Number((e.target as HTMLInputElement).value) || 0)}
                          />
                          <Field
                            label="Fixed allowances (RM)"
                            type="number"
                            value={String(form.fixedAllowances)}
                            onChange={(e) => updateField('fixedAllowances', Number((e.target as HTMLInputElement).value) || 0)}
                          />
                        </div>
                        <div className="rounded-xl p-4" style={{ background: 'var(--primary-soft)', border: '1px solid var(--border-default)' }}>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Required deposit (per employee)</p>
                          <p className="text-2xl font-semibold mt-1 font-mono" style={{ color: 'var(--text-primary)' }}>
                            RM {((form.avgSalary + form.fixedAllowances) * form.noticeMonths).toLocaleString()}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>(gross + allowances) × notice months. Funded after the client record is created.</p>
                        </div>
                      </div>
                    )}

                    {steps[activeStep].id === 'payroll' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SelectField
                          label="Pay frequency"
                          value={form.defaultPayFrequency}
                          onChange={(e) => updateField('defaultPayFrequency', (e.target as HTMLSelectElement).value)}
                        >
                          <option value="monthly">Monthly</option>
                          <option value="bi-weekly">Bi-weekly</option>
                          <option value="weekly">Weekly</option>
                        </SelectField>
                        <SelectField
                          label="Default currency"
                          value={form.defaultCurrency}
                          onChange={(e) => updateField('defaultCurrency', (e.target as HTMLSelectElement).value)}
                        >
                          <option>Stablecoin</option>
                          <option>xSGD</option>
                          <option>USDT</option>
                        </SelectField>
                        <Field
                          label="EPF employer registration #"
                          value={form.epfEmployerNumber}
                          onChange={(e) => updateField('epfEmployerNumber', (e.target as HTMLInputElement).value)}
                        />
                        <Field
                          label="SOCSO employer registration #"
                          value={form.socsoEmployerNumber}
                          onChange={(e) => updateField('socsoEmployerNumber', (e.target as HTMLInputElement).value)}
                        />
                        <Field
                          label="LHDN employer file #"
                          value={form.lhdnEmployerNumber}
                          onChange={(e) => updateField('lhdnEmployerNumber', (e.target as HTMLInputElement).value)}
                        />
                      </div>
                    )}

                    {steps[activeStep].id === 'live' && (
                      <div className="text-center py-8">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--sky-700)' }} />
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Ready to create the client record</h3>
                        <p className="text-sm mt-1 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
                          Press Finish to register <span className="font-semibold">{form.name || 'this client'}</span> in {form.country}. You can add employees, fund the trust deposit, and generate the tripartite contract afterwards.
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-6 pt-6 gap-2 flex-wrap" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <Button variant="outlined" size="sm" disabled={activeStep === 0 || submitting} onClick={() => setActiveStep(activeStep - 1)}>Back</Button>
                      {activeStep < steps.length - 1 ? (
                        <Button variant="primary" size="sm" iconRight={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => setActiveStep(activeStep + 1)}>
                          Next: {steps[activeStep + 1].label}
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={submitting || !canFinish}
                          icon={submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : undefined}
                          onClick={handleFinish}
                        >
                          {submitting ? 'Creating…' : 'Finish'}
                        </Button>
                      )}
                    </div>
                  </Surface>
                </motion.div>
              );
            })()}
          </>
        )}
      </motion.div>
    </PageContainer>
  );
}
