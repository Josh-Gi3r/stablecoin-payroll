import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Camera, CreditCard, FileCheck, Scroll, ShieldCheck, CheckCircle2, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';
import { fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, PageHeader, Surface, IconChip, Pill, Button, Field, SelectField, ProgressBar, ErrorBanner } from '../ui';
import { useOrgRole } from '../../contexts/OrgRoleContext';
import { employees as employeesApi, liveness as livenessApi } from '../../lib/api';
import { coerceError } from '../../hooks/useApi';

const STEPS = [
  { id: 'personal', label: 'Personal details',     description: 'Name, NRIC/passport, date of birth, address.',                                  icon: User },
  { id: 'liveness', label: 'ID + liveness',        description: 'Capture ID document and pass the liveness check (mandatory per KYC policy).', icon: Camera },
  { id: 'bank',     label: 'Bank account',         description: 'Bank, account name (must match ID), account number, proof of ownership.',     icon: CreditCard },
  { id: 'employment', label: 'Employment details', description: 'Position, department, start date, gross salary, fixed allowances.',           icon: FileCheck },
  { id: 'contract', label: 'Contract',             description: 'Tripartite (EOR) or 2-party employment agreement. All parties sign in app.',  icon: Scroll },
  { id: 'statutory',label: 'Statutory registration', description: 'EPF/SOCSO/EIS/CPF registration tracked here. Filed within 5 working days.', icon: ShieldCheck },
  { id: 'live',     label: 'Ready ✓',              description: 'Onboarding complete. The employee can sign in and is included in the next payroll run.', icon: CheckCircle2 },
];

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nric: string;
  dateOfBirth: string;
  residentialAddress: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranch: string;
  position: string;
  department: string;
  hireDate: string;
  employmentType: 'full_time' | 'part_time' | 'contract';
  salary: string;
  fixedAllowances: string;
  payFrequency: 'monthly' | 'biweekly' | 'weekly';
  salaryType: 'salary' | 'hourly';
};

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  nric: '',
  dateOfBirth: '',
  residentialAddress: '',
  bankName: 'Maybank',
  bankAccountName: '',
  bankAccountNumber: '',
  bankBranch: '',
  position: '',
  department: '',
  hireDate: '',
  employmentType: 'full_time',
  salary: '',
  fixedAllowances: '',
  payFrequency: 'monthly',
  salaryType: 'salary',
};

export default function EmployeeOnboardingView() {
  const [activeStep, setActiveStep] = useState(0);
  const [nationality, setNationality] = useState<'singapore_citizen' | 'pr' | 'foreign' | 'malaysian'>('malaysian');
  const [hasExistingPass, setHasExistingPass] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [livenessSending, setLivenessSending] = useState(false);
  const [livenessSentTo, setLivenessSentTo] = useState<string | null>(null);

  const previewContract = () => {
    const lines = [
      'EMPLOYMENT CONTRACT — PREVIEW',
      '==============================',
      '',
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      '',
      'PARTY A — Employer of Record',
      '  EOR Provider (PayrollPlatform)',
      '',
      'PARTY B — Client (Service Recipient)',
      `  ${persona.org.name}`,
      '',
      'PARTY C — Employee',
      `  Name:               ${form.firstName || '—'} ${form.lastName || ''}`.trim(),
      `  NRIC / Passport:    ${form.nric || '—'}`,
      `  Date of birth:      ${form.dateOfBirth || '—'}`,
      `  Email:              ${form.email || '—'}`,
      `  Mobile:             ${form.phone || '—'}`,
      `  Address:            ${form.residentialAddress || '—'}`,
      '',
      'EMPLOYMENT TERMS',
      `  Position:           ${form.position || '—'}`,
      `  Department:         ${form.department || '—'}`,
      `  Employment type:    ${form.employmentType}`,
      `  Hire date:          ${form.hireDate || '—'}`,
      `  Salary:             ${form.salary ? `RM ${Number(form.salary).toLocaleString()}` : '—'} (${form.salaryType})`,
      `  Pay frequency:      ${form.payFrequency}`,
      `  Fixed allowances:   ${form.fixedAllowances ? `RM ${form.fixedAllowances}` : '—'}`,
      '',
      'BANK ACCOUNT',
      `  Bank:               ${form.bankName}`,
      `  Account name:       ${form.bankAccountName || '—'}`,
      `  Account number:     ${form.bankAccountNumber || '—'}`,
      `  Branch:             ${form.bankBranch || '—'}`,
      '',
      'STATUTORY',
      `  Nationality:        ${nationality}`,
      `  Country:            ${persona.org.country}`,
      '',
      '— END OF PREVIEW —',
      'The signed PDF and e-signature flow are generated after Finish.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-preview-${(form.firstName || 'employee').toLowerCase()}-${(form.lastName || '').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sendLivenessLink = async () => {
    if (!form.email.trim()) {
      setError('Enter the candidate email on Personal details before sending the liveness link.');
      return;
    }
    setLivenessSending(true);
    setError(null);
    try {
      // No employee id yet during onboarding — use a synthetic id namespaced to
      // the email so the liveness service can match it later.
      const synthId = `pending-${form.email.trim().replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
      await livenessApi.initialize({ userId: synthId, email: form.email.trim() });
      setLivenessSentTo(form.email.trim());
    } catch (e: any) {
      setError(coerceError(e, 'Failed to send liveness link'));
    } finally {
      setLivenessSending(false);
    }
  };

  const progress = Math.round(((activeStep + 1) / STEPS.length) * 100);
  const { persona, isEor } = useOrgRole();
  const isSgEor = isEor && persona.org.country === 'SG';
  const momBlocked = isSgEor && nationality === 'foreign' && !hasExistingPass;

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canFinish =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.position.trim() &&
    form.department.trim() &&
    form.hireDate &&
    Number(form.salary) > 0;

  const handleFinish = async () => {
    if (!canFinish) {
      setError('Fill in name, email, position, department, hire date, and salary before finishing.');
      return;
    }
    if (momBlocked) {
      setError('Cannot create — MOM advisory blocks EOR Provider from sponsoring this candidate.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const bankAccount = (form.bankAccountName || form.bankAccountNumber)
        ? JSON.stringify({ bankName: form.bankName, accountName: form.bankAccountName, accountNumber: form.bankAccountNumber, branch: form.bankBranch })
        : null;
      const created = await employeesApi.create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        nric: form.nric.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        residentialAddress: form.residentialAddress.trim() || null,
        bankAccount,
        department: form.department.trim(),
        position: form.position.trim(),
        employmentType: form.employmentType,
        hireDate: form.hireDate,
        salary: Number(form.salary),
        salaryType: form.salaryType,
        payFrequency: form.payFrequency,
        fixedAllowances: Number(form.fixedAllowances) || 0,
        status: 'active',
      });
      setCreatedId(created?.id ?? 'created');
    } catch (e: any) {
      setError(coerceError(e, 'Failed to create employee'));
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
            eyebrow="HR · onboarding"
            title="Onboard a new employee"
            subtitle="7-step KYC + employment flow per PayrollPlatform's onboarding policy. Liveness check is mandatory."
          />
        </motion.div>

        <ErrorBanner message={error} />

        {createdId && (
          <motion.div variants={fadeUp}>
            <Surface padding="md">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--sky-700)' }} />
                <div className="flex-1">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {form.firstName} {form.lastName} added
                  </h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Employee created (id <span className="font-mono">{createdId}</span>). They appear in the workforce list and will be included in the next payroll run.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outlined" size="sm" onClick={resetWizard}>Onboard another employee</Button>
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
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Step {activeStep + 1} of {STEPS.length}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{progress}%</span>
                </div>
                <ProgressBar value={progress} tone="primary" size="sm" />
                <div className="grid grid-cols-2 md:grid-cols-7 gap-2 mt-4">
                  {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const isActive = i === activeStep;
                    const isDone = i < activeStep;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveStep(i)}
                        className="text-left p-2 rounded-lg transition-colors"
                        style={{
                          background: isActive ? 'var(--primary-soft)' : isDone ? 'var(--bg-surface-subtle)' : 'transparent',
                          border: '1px solid',
                          borderColor: isActive ? 'rgba(125, 211, 252, 0.35)' : isDone ? 'var(--border-subtle)' : 'var(--border-default)',
                          opacity: isDone || isActive ? 1 : 0.55,
                        }}
                      >
                        <IconChip icon={<Icon className="w-3.5 h-3.5" />} tone={isDone ? 'primary' : isActive ? 'tertiary' : 'neutral'} size="sm" />
                        <p className="text-[11px] font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{s.label}</p>
                      </button>
                    );
                  })}
                </div>
              </Surface>
            </motion.div>

            {(() => {
              const ActiveIcon = STEPS[activeStep].icon;
              return (
                <motion.div variants={fadeUp}>
                  <Surface padding="md">
                    <div className="flex items-center gap-3 mb-4">
                      <IconChip icon={<ActiveIcon className="w-4 h-4" />} tone="primary" size="md" />
                      <div>
                        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{STEPS[activeStep].label}</h2>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{STEPS[activeStep].description}</p>
                      </div>
                    </div>

                    {STEPS[activeStep].id === 'personal' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Field
                            label="First name (as per NRIC)"
                            required
                            value={form.firstName}
                            onChange={(e) => updateField('firstName', e.target.value)}
                          />
                          <Field
                            label="Last name"
                            required
                            value={form.lastName}
                            onChange={(e) => updateField('lastName', e.target.value)}
                          />
                          <Field
                            label="Work email"
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => updateField('email', e.target.value)}
                          />
                          <Field
                            label="NRIC / Passport"
                            value={form.nric}
                            onChange={(e) => updateField('nric', e.target.value)}
                          />
                          <Field
                            label="Date of birth"
                            type="date"
                            value={form.dateOfBirth}
                            onChange={(e) => updateField('dateOfBirth', e.target.value)}
                          />
                          <SelectField
                            label="Nationality"
                            value={nationality}
                            onChange={(e) => setNationality(e.target.value as any)}
                          >
                            <option value="malaysian">Malaysian</option>
                            <option value="singapore_citizen">Singapore Citizen</option>
                            <option value="pr">Permanent Resident (SG/MY)</option>
                            <option value="foreign">Foreign National</option>
                          </SelectField>
                          <Field
                            label="Mobile"
                            value={form.phone}
                            onChange={(e) => updateField('phone', e.target.value)}
                          />
                          <Field
                            label="Residential address"
                            className="md:col-span-2"
                            value={form.residentialAddress}
                            onChange={(e) => updateField('residentialAddress', e.target.value)}
                          />
                          {isSgEor && nationality === 'foreign' && (
                            <label className="md:col-span-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              <input
                                type="checkbox"
                                checked={hasExistingPass}
                                onChange={(e) => setHasExistingPass(e.target.checked)}
                              />
                              Candidate already holds a valid SG work pass tied to another employer
                            </label>
                          )}
                        </div>

                        {momBlocked && (
                          <div
                            className="rounded-xl p-4 flex items-start gap-3"
                            style={{
                              background: 'rgba(239, 68, 68, 0.06)',
                              border: '1px solid var(--error)',
                            }}
                          >
                            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--danger)' }} />
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--danger)' }}>
                                Blocked: MOM Sep 2024 advisory
                              </p>
                              <p>
                                EOR Provider cannot sponsor a Singapore work pass for a foreign national. The hiring entity must
                                engage this employee directly. Candidates who already hold a valid pass may proceed via Letter of
                                Consent on a case-by-case basis — escalate to compliance.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {STEPS[activeStep].id === 'liveness' && (
                      <div className="space-y-4">
                        <Field label="ID document upload" type="file" />
                        <div className="rounded-xl p-6 text-center" style={{ background: 'var(--bg-surface-subtle)', border: '1px dashed var(--border-default)' }}>
                          <Camera className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Liveness check</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            The candidate must complete a video liveness test on their device.
                            {form.email && <> Sending to <span className="font-mono">{form.email}</span>.</>}
                          </p>
                          <Button
                            variant="primary"
                            size="sm"
                            className="mt-3"
                            onClick={sendLivenessLink}
                            disabled={livenessSending || !form.email.trim()}
                          >
                            {livenessSending ? 'Sending…' : livenessSentTo ? 'Resend liveness link' : 'Send liveness link'}
                          </Button>
                          {livenessSentTo && (
                            <p className="text-xs mt-2" style={{ color: 'var(--sky-700)' }}>
                              Liveness test link sent to {livenessSentTo}.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {STEPS[activeStep].id === 'bank' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SelectField
                          label="Bank"
                          value={form.bankName}
                          onChange={(e) => updateField('bankName', e.target.value)}
                        >
                          <option>Maybank</option>
                          <option>CIMB</option>
                          <option>Public Bank</option>
                          <option>RHB</option>
                          <option>Hong Leong</option>
                          <option>DBS</option>
                          <option>OCBC</option>
                          <option>UOB</option>
                        </SelectField>
                        <Field
                          label="Account name (matches ID)"
                          value={form.bankAccountName}
                          onChange={(e) => updateField('bankAccountName', e.target.value)}
                        />
                        <Field
                          label="Account number"
                          value={form.bankAccountNumber}
                          onChange={(e) => updateField('bankAccountNumber', e.target.value)}
                        />
                        <Field
                          label="Branch"
                          value={form.bankBranch}
                          onChange={(e) => updateField('bankBranch', e.target.value)}
                        />
                        <Field label="Bank statement (proof of ownership)" type="file" className="md:col-span-2" />
                      </div>
                    )}

                    {STEPS[activeStep].id === 'employment' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field
                          label="Position"
                          required
                          value={form.position}
                          onChange={(e) => updateField('position', e.target.value)}
                        />
                        <Field
                          label="Department"
                          required
                          value={form.department}
                          onChange={(e) => updateField('department', e.target.value)}
                        />
                        <Field
                          label="Start date"
                          type="date"
                          required
                          value={form.hireDate}
                          onChange={(e) => updateField('hireDate', e.target.value)}
                        />
                        <SelectField
                          label="Employment type"
                          value={form.employmentType}
                          onChange={(e) => updateField('employmentType', e.target.value as FormState['employmentType'])}
                        >
                          <option value="full_time">Full-time</option>
                          <option value="part_time">Part-time</option>
                          <option value="contract">Contract</option>
                        </SelectField>
                        <Field
                          label="Gross monthly salary (RM)"
                          type="number"
                          required
                          value={form.salary}
                          onChange={(e) => updateField('salary', e.target.value)}
                        />
                        <Field
                          label="Fixed allowances (RM)"
                          type="number"
                          value={form.fixedAllowances}
                          onChange={(e) => updateField('fixedAllowances', e.target.value)}
                        />
                        <SelectField
                          label="Pay frequency"
                          value={form.payFrequency}
                          onChange={(e) => updateField('payFrequency', e.target.value as FormState['payFrequency'])}
                        >
                          <option value="monthly">Monthly</option>
                          <option value="biweekly">Bi-weekly</option>
                          <option value="weekly">Weekly</option>
                        </SelectField>
                        <SelectField
                          label="Salary basis"
                          value={form.salaryType}
                          onChange={(e) => updateField('salaryType', e.target.value as FormState['salaryType'])}
                        >
                          <option value="salary">Fixed salary</option>
                          <option value="hourly">Hourly</option>
                        </SelectField>
                      </div>
                    )}

                    {STEPS[activeStep].id === 'contract' && (
                      <div className="space-y-4">
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          PayrollPlatform will render a tripartite agreement for EOR clients (EOR Provider + client + employee) or a 2-party agreement for direct-payroll clients.
                          All signatures are captured in-app with timestamp + IP audit.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Pill tone="muted" dot>EOR Provider ready</Pill>
                          <Pill tone="warn" dot>Client pending</Pill>
                          <Pill tone="muted" dot>Employee — sign last</Pill>
                        </div>
                        <Button variant="primary" size="md" icon={<Scroll className="w-4 h-4" />} onClick={previewContract}>Preview &amp; send for signature</Button>
                      </div>
                    )}

                    {STEPS[activeStep].id === 'statutory' && (
                      <div className="space-y-3">
                        {[
                          { name: 'EPF (KWSP)',     status: 'in_flight' as const, deadline: 'within 5 working days' },
                          { name: 'SOCSO (PERKESO)', status: 'in_flight' as const, deadline: 'within 5 working days' },
                          { name: 'EIS',            status: 'in_flight' as const, deadline: 'within 5 working days' },
                          { name: 'LHDN (PCB file)',status: 'pending' as const,    deadline: 'within 30 days' },
                        ].map((s) => (
                          <div key={s.name} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-surface-subtle)' }}>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.deadline}</p>
                            </div>
                            <Pill tone={s.status === 'in_flight' ? 'warn' : 'muted'} size="sm" dot>{s.status}</Pill>
                          </div>
                        ))}
                      </div>
                    )}

                    {STEPS[activeStep].id === 'live' && (
                      <div className="text-center py-8">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--sky-700)' }} />
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Ready to create the employee record</h3>
                        <p className="text-sm mt-1 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
                          Press Finish to register{' '}
                          <span className="font-semibold">
                            {form.firstName ? `${form.firstName} ${form.lastName}`.trim() : 'this employee'}
                          </span>
                          {form.position ? ` as ${form.position}` : ''}. They'll appear in the workforce list immediately.
                        </p>
                        {!canFinish && (
                          <p className="text-xs mt-3" style={{ color: 'var(--danger)' }}>
                            Required fields missing — go back and fill in name, email, position, department, hire date, and salary.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-6 pt-6 gap-2 flex-wrap" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <Button variant="outlined" size="sm" disabled={activeStep === 0 || submitting} onClick={() => setActiveStep(activeStep - 1)}>Back</Button>
                      {activeStep < STEPS.length - 1 ? (
                        <Button variant="primary" size="sm" iconRight={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => setActiveStep(activeStep + 1)}>
                          Next: {STEPS[activeStep + 1].label}
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={submitting || !canFinish || momBlocked}
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
