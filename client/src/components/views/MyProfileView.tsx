import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, CreditCard, Heart, ShieldAlert, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, PageHeader, Surface, IconChip, Field, SelectField, Button } from '../ui';
import { employees as employeesApi } from '../../lib/api';
import { useApiResource, coerceError } from '../../hooks/useApi';

type ServerEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  nric: string | null;
  dateOfBirth: string | null;
  residentialAddress: string | null;
  bankAccount: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  epfBeneficiary: string | null;
};

interface BankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
}

interface EpfBeneficiary {
  name: string;
  nric: string;
  relationship: string;
  allocationPct: number;
}

const EMPTY_BANK: BankAccount = { bankName: 'Maybank', accountName: '', accountNumber: '', branch: '' };
const EMPTY_EPF: EpfBeneficiary = { name: '', nric: '', relationship: 'Spouse', allocationPct: 100 };

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export default function MyProfileView() {
  const { data: emp, loading, error: loadError, reload } = useApiResource<ServerEmployee>(
    () => employeesApi.me(),
    [],
    'No employee record matches your user',
  );

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nric: '',
    dateOfBirth: '',
    residentialAddress: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: 'Spouse',
  });
  const [bank, setBank] = useState<BankAccount>(EMPTY_BANK);
  const [epf, setEpf] = useState<EpfBeneficiary>(EMPTY_EPF);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (emp) {
      setForm({
        firstName: emp.firstName ?? '',
        lastName: emp.lastName ?? '',
        email: emp.email ?? '',
        phone: emp.phone ?? '',
        nric: emp.nric ?? '',
        dateOfBirth: emp.dateOfBirth ?? '',
        residentialAddress: emp.residentialAddress ?? '',
        emergencyContactName: emp.emergencyContactName ?? '',
        emergencyContactPhone: emp.emergencyContactPhone ?? '',
        emergencyContactRelationship: emp.emergencyContactRelationship ?? 'Spouse',
      });
      setBank(parseJson<BankAccount>(emp.bankAccount, EMPTY_BANK));
      setEpf(parseJson<EpfBeneficiary>(emp.epfBeneficiary, EMPTY_EPF));
    }
  }, [emp]);

  const error = loadError ?? saveError;

  const handleSave = async () => {
    if (!emp) return;
    setSaving(true);
    setSaveError(null);
    try {
      await employeesApi.update(emp.id, {
        ...form,
        bankAccount: JSON.stringify(bank),
        epfBeneficiary: JSON.stringify(epf),
      });
      setSavedAt(Date.now());
      await reload();
    } catch (e: any) {
      setSaveError(coerceError(e, 'Failed to save profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-3xl">
        <motion.div variants={fadeUp}>
          <PageHeader
            eyebrow="Self-service"
            title="My profile"
            subtitle="Personal details, bank account, emergency contact, and EPF beneficiary."
            actions={
              <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || loading}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            }
          />
        </motion.div>

        {error && (
          <div
            className="rounded-xl px-3 py-2 flex items-center gap-2 text-sm"
            style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid var(--error)', color: 'var(--danger)' }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {savedAt && Date.now() - savedAt < 3000 && (
          <div
            className="rounded-xl px-3 py-2 flex items-center gap-2 text-sm"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', color: 'var(--success, #10b981)' }}
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Profile saved
          </div>
        )}

        <motion.div variants={fadeUp}>
          <Surface padding="md">
            <div className="flex items-center gap-3 mb-4">
              <IconChip icon={<User className="w-4 h-4" />} tone="primary" size="sm" />
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Personal</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Identity fields require re-verification when changed.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="First name"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: (e.target as HTMLInputElement).value }))}
              />
              <Field
                label="Last name"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: (e.target as HTMLInputElement).value }))}
              />
              <Field
                label="NRIC / Passport"
                value={form.nric}
                onChange={(e) => setForm((f) => ({ ...f, nric: (e.target as HTMLInputElement).value }))}
              />
              <Field
                label="Date of birth"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: (e.target as HTMLInputElement).value }))}
              />
            </div>
          </Surface>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Surface padding="md">
            <div className="flex items-center gap-3 mb-4">
              <IconChip icon={<Mail className="w-4 h-4" />} tone="secondary" size="sm" />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Contact</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Personal email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: (e.target as HTMLInputElement).value }))}
                prefix={<Mail className="w-3.5 h-3.5" />}
              />
              <Field
                label="Mobile"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: (e.target as HTMLInputElement).value }))}
                prefix={<Phone className="w-3.5 h-3.5" />}
              />
              <Field
                label="Residential address"
                value={form.residentialAddress}
                onChange={(e) => setForm((f) => ({ ...f, residentialAddress: (e.target as HTMLInputElement).value }))}
                prefix={<MapPin className="w-3.5 h-3.5" />}
                className="md:col-span-2"
              />
            </div>
          </Surface>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Surface padding="md">
            <div className="flex items-center gap-3 mb-4">
              <IconChip icon={<CreditCard className="w-4 h-4" />} tone="tertiary" size="sm" />
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Bank account</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Account name must match your NRIC.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Bank"
                value={bank.bankName}
                onChange={(e) => setBank((b) => ({ ...b, bankName: (e.target as HTMLSelectElement).value }))}
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
                label="Account name"
                value={bank.accountName}
                onChange={(e) => setBank((b) => ({ ...b, accountName: (e.target as HTMLInputElement).value }))}
              />
              <Field
                label="Account number"
                value={bank.accountNumber}
                onChange={(e) => setBank((b) => ({ ...b, accountNumber: (e.target as HTMLInputElement).value }))}
                className="font-mono"
              />
              <Field
                label="Branch"
                value={bank.branch}
                onChange={(e) => setBank((b) => ({ ...b, branch: (e.target as HTMLInputElement).value }))}
              />
            </div>
          </Surface>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Surface padding="md">
            <div className="flex items-center gap-3 mb-4">
              <IconChip icon={<ShieldAlert className="w-4 h-4" />} tone="primary" size="sm" />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Emergency contact</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Name"
                value={form.emergencyContactName}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: (e.target as HTMLInputElement).value }))}
              />
              <SelectField
                label="Relationship"
                value={form.emergencyContactRelationship}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactRelationship: (e.target as HTMLSelectElement).value }))}
              >
                <option>Spouse</option>
                <option>Parent</option>
                <option>Sibling</option>
                <option>Child</option>
                <option>Friend</option>
              </SelectField>
              <Field
                label="Mobile"
                value={form.emergencyContactPhone}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: (e.target as HTMLInputElement).value }))}
                className="md:col-span-2"
              />
            </div>
          </Surface>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Surface padding="md">
            <div className="flex items-center gap-3 mb-4">
              <IconChip icon={<Heart className="w-4 h-4" />} tone="tertiary" size="sm" />
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>EPF beneficiary</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Optional — used by KWSP for survivor benefit distribution.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Beneficiary name"
                value={epf.name}
                onChange={(e) => setEpf((b) => ({ ...b, name: (e.target as HTMLInputElement).value }))}
              />
              <Field
                label="NRIC / Passport"
                value={epf.nric}
                onChange={(e) => setEpf((b) => ({ ...b, nric: (e.target as HTMLInputElement).value }))}
              />
              <SelectField
                label="Relationship"
                value={epf.relationship}
                onChange={(e) => setEpf((b) => ({ ...b, relationship: (e.target as HTMLSelectElement).value }))}
              >
                <option>Spouse</option>
                <option>Parent</option>
                <option>Sibling</option>
                <option>Child</option>
              </SelectField>
              <Field
                label="Allocation %"
                type="number"
                value={String(epf.allocationPct)}
                onChange={(e) => setEpf((b) => ({ ...b, allocationPct: Number((e.target as HTMLInputElement).value) || 0 }))}
              />
            </div>
          </Surface>
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}
