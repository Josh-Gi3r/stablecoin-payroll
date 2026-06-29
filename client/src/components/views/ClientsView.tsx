import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Plus, Loader2 } from 'lucide-react';
import { fadeUp, stagger } from '../../lib/viewConstants';
import { clients as clientsApi } from '../../lib/api';

type Client = {
  id: string;
  tenantId: string;
  name: string;
  country: 'MY' | 'SG';
  registrationNumber?: string | null;
  taxId?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  servicePlan: 'basic' | 'enterprise';
  serviceFeePct: number;
  noticeDefaultMonths: number;
  status: 'active' | 'suspended' | 'archived';
};

const emptyForm = {
  name: '',
  country: 'MY' as 'MY' | 'SG',
  registrationNumber: '',
  taxId: '',
  primaryContactName: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
  servicePlan: 'basic' as 'basic' | 'enterprise',
  serviceFeePct: 0.05,
  noticeDefaultMonths: 1,
};

export default function ClientsView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await clientsApi.list();
      setClients(data);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await clientsApi.create(form);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Failed to create client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="p-4 md:p-6 space-y-5"
    >
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Clients</h1>
          <p className="text-sm mt-1 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            Organizations EOR Provider employs workers on behalf of. Each client is a tenant scoped to its own workforce.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'New Client'}
        </button>
      </motion.div>

      {error && (
        <motion.div
          variants={fadeUp}
          className="pill pill-danger w-full justify-start !rounded-xl !px-3 !py-2 !text-sm"
        >
          {error}
        </motion.div>
      )}

      {showForm && (
        <motion.form
          variants={fadeUp}
          onSubmit={handleCreate}
          className="surface p-5 space-y-4"
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Onboard a new client</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Client name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Country</label>
              <select
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value as 'MY' | 'SG' }))}
                className="field"
              >
                <option value="MY">Malaysia (MY)</option>
                <option value="SG">Singapore (SG)</option>
              </select>
            </div>
            <Field label="Registration number" value={form.registrationNumber} onChange={(v) => setForm((f) => ({ ...f, registrationNumber: v }))} />
            <Field label="Tax ID" value={form.taxId} onChange={(v) => setForm((f) => ({ ...f, taxId: v }))} />
            <Field label="Primary contact name" value={form.primaryContactName} onChange={(v) => setForm((f) => ({ ...f, primaryContactName: v }))} />
            <Field label="Primary contact email" type="email" value={form.primaryContactEmail} onChange={(v) => setForm((f) => ({ ...f, primaryContactEmail: v }))} />
            <Field label="Primary contact phone" value={form.primaryContactPhone} onChange={(v) => setForm((f) => ({ ...f, primaryContactPhone: v }))} />
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Service plan</label>
              <select
                value={form.servicePlan}
                onChange={(e) => setForm((f) => ({ ...f, servicePlan: e.target.value as 'basic' | 'enterprise' }))}
                className="field"
              >
                <option value="basic">Basic</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <Field
              label="Service fee (% of gross payroll)"
              type="number"
              value={String(form.serviceFeePct)}
              onChange={(v) => setForm((f) => ({ ...f, serviceFeePct: Number(v) || 0 }))}
            />
            <Field
              label="Default notice (months)"
              type="number"
              value={String(form.noticeDefaultMonths)}
              onChange={(v) => setForm((f) => ({ ...f, noticeDefaultMonths: Number(v) || 1 }))}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !form.name}
              className="btn-primary"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create client
            </button>
          </div>
        </motion.form>
      )}

      <motion.div variants={fadeUp} className="surface overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="icon-chip-secondary icon-chip" style={{ width: '1.75rem', height: '1.75rem' }}>
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {clients.length} {clients.length === 1 ? 'client' : 'clients'}
          </h2>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
        ) : clients.length === 0 ? (
          <div className="p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No clients yet. Create one to get started.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Country</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Service fee</th>
                  <th className="px-5 py-3 font-medium">Notice</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="table-row">
                    <td className="px-5 py-3">
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.registrationNumber ?? '—'}</div>
                    </td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{c.country}</td>
                    <td className="px-5 py-3 capitalize" style={{ color: 'var(--text-secondary)' }}>{c.servicePlan}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{(c.serviceFeePct * 100).toFixed(2)}%</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{c.noticeDefaultMonths} mo</td>
                    <td className="px-5 py-3">
                      <span className={`pill ${c.status === 'active' ? 'pill-success' : 'pill-muted'}`}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile stacked cards */}
            <div className="md:hidden divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {clients.map((c) => (
                <div key={c.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{c.registrationNumber ?? '—'}</p>
                    </div>
                    <span className={`pill ${c.status === 'active' ? 'pill-success' : 'pill-muted'}`}>{c.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p style={{ color: 'var(--text-muted)' }}>Country</p>
                      <p style={{ color: 'var(--text-primary)' }}>{c.country}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-muted)' }}>Fee</p>
                      <p style={{ color: 'var(--text-primary)' }}>{(c.serviceFeePct * 100).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-muted)' }}>Notice</p>
                      <p style={{ color: 'var(--text-primary)' }}>{c.noticeDefaultMonths} mo</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}
        {required && <span style={{ color: 'var(--status-danger)' }} className="ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="field"
      />
    </div>
  );
}
