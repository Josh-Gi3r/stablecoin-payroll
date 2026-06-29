import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check, User, Briefcase, ShieldCheck, Wallet, Scroll } from 'lucide-react';
import { deposits as depositsApi, contracts as contractsApi } from '../../lib/api';

type FormData = {
  // Personal
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  // Employment
  department: string;
  position: string;
  employmentType: 'full-time' | 'part-time' | 'contractor';
  hireDate: string;
  salary: string;
  payFrequency: 'monthly' | 'bi-weekly' | 'weekly';
  // Statutory
  nationality: 'malaysian' | 'pr' | 'foreign';
  residentStatus: 'resident' | 'non_resident';
  taxCategory: 'KA1' | 'KA2' | 'KA3';
  ageGroup: 'below_60' | 'above_60';
  hrdfEligible: boolean;
  zakatMonthly: string;
  cp38Amount: string;
  // EOR: deposit + contract
  noticePeriodMonths: string;
  allowanceLabel: string;
  allowanceAmount: string;
  generateTripartite: boolean;
};

const EMPTY: FormData = {
  firstName: '', lastName: '', email: '', phone: '',
  department: '', position: '',
  employmentType: 'full-time',
  hireDate: new Date().toISOString().slice(0, 10),
  salary: '',
  payFrequency: 'monthly',
  nationality: 'malaysian',
  residentStatus: 'resident',
  taxCategory: 'KA1',
  ageGroup: 'below_60',
  hrdfEligible: true,
  zakatMonthly: '',
  cp38Amount: '',
  noticePeriodMonths: '1',
  allowanceLabel: 'Transport',
  allowanceAmount: '',
  generateTripartite: true,
};

const DEPARTMENTS = ['Engineering', 'Design', 'Finance', 'People Ops', 'Marketing', 'Operations'];

const STEPS = [
  { id: 1, label: 'Personal',    icon: User },
  { id: 2, label: 'Employment',  icon: Briefcase },
  { id: 3, label: 'Statutory',   icon: ShieldCheck },
  { id: 4, label: 'EOR Setup',   icon: Wallet },
];

const TAX_CATEGORIES = [
  { value: 'KA1', label: 'KA1 — Single' },
  { value: 'KA2', label: 'KA2 — Married, spouse not working' },
  { value: 'KA3', label: 'KA3 — Married, working spouse' },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </label>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="field" />;
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className="field">
      {children}
    </select>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
        style={{ background: checked ? 'var(--primary-300)' : 'var(--bg-surface-raised)', border: `1px solid ${checked ? 'var(--primary-300)' : 'var(--border-default)'}` }}
      >
        <span
          className="inline-block h-4 w-4 rounded-full shadow transform transition-transform"
          style={{
            background: checked ? 'var(--text-inverse)' : 'var(--text-secondary)',
            transform: checked ? 'translateX(22px)' : 'translateX(2px)',
          }}
        />
      </button>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

export default function AddEmployeeModal({ onClose, onAdded }: { onClose: () => void; onAdded?: (emp: FormData) => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [depositQuote, setDepositQuote] = useState<number | null>(null);
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);

  // Reset everything before closing so the next open starts fresh.
  const handleClose = () => {
    setStep(1);
    setForm(EMPTY);
    setSubmitting(false);
    setDone(false);
    setError('');
    setDepositQuote(null);
    setDepositAmount(null);
    setContractId(null);
    onClose();
  };

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const canNext = () => {
    if (step === 1) return form.firstName && form.lastName && form.email;
    if (step === 2) return form.department && form.position && form.salary;
    if (step === 3) return true;
    return true;
  };

  // Live deposit quote as user edits step 4 inputs
  const runQuote = async () => {
    setQuoting(true);
    try {
      const res = await depositsApi.quote({
        salary: parseFloat(form.salary) || 0,
        fixedAllowances: form.allowanceAmount && parseFloat(form.allowanceAmount) > 0
          ? [{ label: form.allowanceLabel || 'Allowance', amount: parseFloat(form.allowanceAmount) }]
          : [],
        noticeMonths: parseInt(form.noticePeriodMonths, 10) || 1,
      });
      setDepositQuote(res.amount);
    } catch {
      setDepositQuote(null);
    } finally {
      setQuoting(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const noticeMonths = parseInt(form.noticePeriodMonths, 10) || 1;
      const fixedAllowances =
        form.allowanceAmount && parseFloat(form.allowanceAmount) > 0
          ? [{ label: form.allowanceLabel || 'Allowance', amount: parseFloat(form.allowanceAmount) }]
          : [];

      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || null,
        department: form.department,
        position: form.position,
        employmentType: form.employmentType,
        hireDate: form.hireDate,
        salary: parseFloat(form.salary),
        salaryType: 'salaried',
        payFrequency: form.payFrequency,
        currency: 'Stablecoin',
        country: 'MY',
        nationality: form.nationality,
        residentStatus: form.residentStatus,
        taxCategory: form.nationality === 'foreign' ? null : form.taxCategory,
        ageGroup: form.ageGroup,
        hrdfEligible: form.nationality === 'foreign' ? false : form.hrdfEligible,
        zakatMonthly: parseFloat(form.zakatMonthly) || 0,
        cp38Amount: parseFloat(form.cp38Amount) || 0,
        noticePeriodMonths: noticeMonths,
        fixedAllowances: JSON.stringify(fixedAllowances),
        status: 'active',
      };
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const created = await res.json();

      // Best-effort: spin up the deposit and draft tripartite agreement.
      try {
        const dep = await depositsApi.createForEmployee(created.id);
        setDepositAmount(dep.amount);
      } catch (e: any) {
        console.warn('deposit auto-create failed', e?.message ?? e);
      }

      if (form.generateTripartite) {
        try {
          const gen = await contractsApi.generate({
            templateId: 'ct-tripartite-my-v1',
            employeeId: created.id,
          });
          setContractId(gen.contract.id);
        } catch (e: any) {
          console.warn('contract auto-generate failed', e?.message ?? e);
        }
      }

      setDone(true);
      onAdded?.(form);
    } catch (e: any) {
      setError(e.message || 'Failed to add employee');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-lg flex flex-col shadow-2xl"
        style={{ background: 'var(--bg-surface)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Onboard employee</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {done ? 'Employee added successfully' : `Step ${step} of ${STEPS.length}`}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--bg-surface-raised)', color: 'var(--text-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        {!done && (
          <div className="flex items-center gap-0 px-6 py-4 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = step === s.id;
              const passed = step > s.id;
              return (
                <div key={s.id} className="flex items-center gap-0 flex-1 min-w-fit">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                      style={
                        passed
                          ? { background: 'var(--primary-300)', color: 'var(--text-inverse)' }
                          : active
                            ? { background: 'var(--primary-soft)', border: '1px solid var(--primary-300)', color: 'var(--primary-300)' }
                            : { background: 'var(--bg-surface-raised)', color: 'var(--text-muted)' }
                      }
                    >
                      {passed ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    </div>
                    <span
                      className="text-xs font-medium whitespace-nowrap"
                      style={{
                        color: active
                          ? 'var(--primary-300)'
                          : passed
                            ? 'var(--text-secondary)'
                            : 'var(--text-muted)',
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="flex-1 h-px mx-3 min-w-[16px]"
                      style={{ background: step > s.id ? 'var(--primary-300)' : 'var(--border-default)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full py-10 text-center"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                  style={{ background: 'var(--primary-soft)', color: 'var(--primary-300)' }}
                >
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {form.firstName} {form.lastName} onboarded
                </h3>
                <div className="text-sm mb-6 max-w-xs space-y-3" style={{ color: 'var(--text-secondary)' }}>
                  <p>Profile created and linked to the client tenant.</p>
                  {depositAmount !== null && (
                    <div
                      className="rounded-lg p-3 text-left"
                      style={{ background: 'var(--primary-soft)', border: '1px solid var(--border-default)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5" style={{ color: 'var(--primary-300)' }} />
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary-300)' }}>Deposit pending</p>
                      </div>
                      <p className="text-base font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                        RM {depositAmount.toLocaleString()}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Mark as received in the Deposits view once funds clear.</p>
                    </div>
                  )}
                  {contractId && (
                    <div
                      className="rounded-lg p-3 text-left"
                      style={{ background: 'var(--tertiary-soft)', border: '1px solid var(--border-default)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Scroll className="w-3.5 h-3.5" style={{ color: 'var(--tertiary-300)' }} />
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tertiary-300)' }}>Tripartite draft</p>
                      </div>
                      <p className="text-xs mt-1 font-mono break-all" style={{ color: 'var(--text-primary)' }}>{contractId}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Collect operator, client, and employee signatures in Contracts.</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleClose}
                  className="btn-primary"
                >
                  Done
                </button>
              </motion.div>
            ) : (
              <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                className="space-y-4"
              >
                {step === 1 && (
                  <>
                    <Row>
                      <div><Label>First name *</Label><Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Ahmad" /></div>
                      <div><Label>Last name *</Label><Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Razif" /></div>
                    </Row>
                    <div><Label>Email address *</Label><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="ahmad@company.com" /></div>
                    <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+60 12-345 6789" /></div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <Row>
                      <div>
                        <Label>Department *</Label>
                        <Select value={form.department} onChange={(e) => set('department', e.target.value)}>
                          <option value="">Select...</option>
                          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </Select>
                      </div>
                      <div><Label>Position *</Label><Input value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="Senior Engineer" /></div>
                    </Row>
                    <Row>
                      <div>
                        <Label>Employment type</Label>
                        <Select value={form.employmentType} onChange={(e) => set('employmentType', e.target.value)}>
                          <option value="full-time">Full-time</option>
                          <option value="part-time">Part-time</option>
                          <option value="contractor">Contractor</option>
                        </Select>
                      </div>
                      <div><Label>Hire date</Label><Input type="date" value={form.hireDate} onChange={(e) => set('hireDate', e.target.value)} /></div>
                    </Row>
                    <Row>
                      <div><Label>Gross salary (Stablecoin) *</Label><Input type="number" value={form.salary} onChange={(e) => set('salary', e.target.value)} placeholder="6500" /></div>
                      <div>
                        <Label>Pay frequency</Label>
                        <Select value={form.payFrequency} onChange={(e) => set('payFrequency', e.target.value)}>
                          <option value="monthly">Monthly</option>
                          <option value="bi-weekly">Bi-weekly</option>
                          <option value="weekly">Weekly</option>
                        </Select>
                      </div>
                    </Row>
                  </>
                )}

                {step === 3 && (
                  <>
                    <Row>
                      <div>
                        <Label>Nationality</Label>
                        <Select value={form.nationality} onChange={(e) => set('nationality', e.target.value)}>
                          <option value="malaysian">Malaysian</option>
                          <option value="pr">Permanent Resident</option>
                          <option value="foreign">Foreign Worker</option>
                        </Select>
                      </div>
                      <div>
                        <Label>Resident status</Label>
                        <Select value={form.residentStatus} onChange={(e) => set('residentStatus', e.target.value)}>
                          <option value="resident">Tax Resident</option>
                          <option value="non_resident">Non-Resident</option>
                        </Select>
                      </div>
                    </Row>

                    {form.nationality !== 'foreign' && form.residentStatus === 'resident' && (
                      <Row>
                        <div>
                          <Label>Tax category (PCB)</Label>
                          <Select value={form.taxCategory} onChange={(e) => set('taxCategory', e.target.value)}>
                            {TAX_CATEGORIES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </Select>
                        </div>
                        <div>
                          <Label>Age group</Label>
                          <Select value={form.ageGroup} onChange={(e) => set('ageGroup', e.target.value)}>
                            <option value="below_60">Below 60</option>
                            <option value="above_60">60 and above</option>
                          </Select>
                        </div>
                      </Row>
                    )}

                    {form.nationality !== 'foreign' && (
                      <div className="surface-raised p-4 space-y-3">
                        <Toggle checked={form.hrdfEligible} onChange={(v) => set('hrdfEligible', v)} label="HRDF eligible (1% employer levy)" />
                      </div>
                    )}

                    <div className="surface-subtle p-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Optional deductions</p>
                      <Row>
                        <div><Label>Zakat (Stablecoin/month)</Label><Input type="number" value={form.zakatMonthly} onChange={(e) => set('zakatMonthly', e.target.value)} placeholder="0.00" /></div>
                        <div><Label>CP38 (Stablecoin/month)</Label><Input type="number" value={form.cp38Amount} onChange={(e) => set('cp38Amount', e.target.value)} placeholder="0.00" /></div>
                      </Row>
                    </div>

                    {form.nationality === 'foreign' && (
                      <div
                        className="rounded-xl px-4 py-3 text-xs"
                        style={{ background: 'var(--status-warn-soft)', border: '1px solid rgba(251,191,36,0.22)', color: 'var(--status-warn)' }}
                      >
                        Foreign worker: EPF at 2%/2%, WHT 30% applies instead of PCB, no EIS, no HRDF.
                      </div>
                    )}
                  </>
                )}

                {step === 4 && (
                  <>
                    <div
                      className="rounded-xl p-4 space-y-1"
                      style={{ background: 'var(--primary-soft)', border: '1px solid var(--border-default)' }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary-300)' }}>
                        Upfront deposit
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        Held by EOR Provider in a segregated trust account, equal to notice period × (gross salary + fixed allowances).
                      </p>
                    </div>

                    <Row>
                      <div>
                        <Label>Notice period (months)</Label>
                        <Select
                          value={form.noticePeriodMonths}
                          onChange={(e) => { set('noticePeriodMonths', e.target.value); setTimeout(runQuote, 0); }}
                        >
                          <option value="1">1 month</option>
                          <option value="2">2 months</option>
                          <option value="3">3 months</option>
                          <option value="6">6 months</option>
                        </Select>
                      </div>
                      <div>
                        <Label>Allowance label</Label>
                        <Input
                          value={form.allowanceLabel}
                          onChange={(e) => set('allowanceLabel', e.target.value)}
                          placeholder="Transport"
                        />
                      </div>
                    </Row>
                    <div>
                      <Label>Fixed allowance (monthly, MYR)</Label>
                      <Input
                        type="number"
                        value={form.allowanceAmount}
                        onChange={(e) => { set('allowanceAmount', e.target.value); setTimeout(runQuote, 0); }}
                        placeholder="0.00"
                        onBlur={runQuote}
                      />
                    </div>

                    <div className="surface-raised p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Required deposit</p>
                          <p className="text-2xl font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                            {quoting ? 'Calculating…' : `RM ${(depositQuote ?? 0).toLocaleString()}`}
                          </p>
                        </div>
                        <button type="button" onClick={runQuote} disabled={quoting} className="btn-secondary !px-3 !py-1.5 !text-xs disabled:opacity-60">
                          {quoting ? 'Calculating…' : 'Recalculate'}
                        </button>
                      </div>
                    </div>

                    <div className="surface-raised p-4">
                      <Toggle
                        checked={form.generateTripartite}
                        onChange={(v) => set('generateTripartite', v)}
                        label="Generate draft Tripartite Employment Agreement"
                      />
                      <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        Renders the MY tripartite template with this employee's details. Signatures are captured in the Contracts view (operator → client → employee).
                      </p>
                    </div>
                  </>
                )}

                {error && (
                  <div
                    className="rounded-xl px-4 py-3 text-xs"
                    style={{ background: 'var(--status-danger-soft)', border: '1px solid rgba(248,113,113,0.22)', color: 'var(--status-danger)' }}
                  >
                    {error}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {!done && (
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <button
              onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
              className="btn-outlined !px-3 !py-2"
            >
              <ChevronLeft className="w-4 h-4" />
              {step > 1 ? 'Back' : 'Cancel'}
            </button>

            {step < STEPS.length ? (
              <button
                onClick={() => {
                  const next = step + 1;
                  setStep(next);
                  if (next === 4) setTimeout(runQuote, 0);
                }}
                disabled={!canNext()}
                className="btn-primary"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? 'Onboarding…' : 'Onboard employee'}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
