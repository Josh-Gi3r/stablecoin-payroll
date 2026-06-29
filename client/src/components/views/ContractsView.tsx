import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Scroll, FileSignature, Loader2, Plus, FileDown } from 'lucide-react';
import { fadeUp, stagger } from '../../lib/viewConstants';
import { contracts as contractsApi, employees as employeesApi } from '../../lib/api';

type Template = {
  id: string;
  country: 'MY' | 'SG';
  type: 'tripartite' | 'employee_info' | 'termination';
  version: number;
  title: string;
};

type Signature = {
  party: 'operator' | 'client' | 'employee';
  signerName: string;
  signerEmail: string;
  signedAt: string;
};

type Contract = {
  id: string;
  clientId: string | null;
  employeeId: string | null;
  templateId: string;
  templateVersion: number;
  status: 'draft' | 'sent' | 'partially_signed' | 'signed' | 'archived';
  signatures: string;
  createdAt: string;
  completedAt: string | null;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
};

const pillClass: Record<Contract['status'], string> = {
  draft:             'pill-muted',
  sent:              'pill-primary',
  partially_signed:  'pill-warn',
  signed:            'pill-success',
  archived:          'pill-muted',
};

export default function ContractsView() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [generating, setGenerating] = useState(false);

  const [signingId, setSigningId] = useState<string | null>(null);
  const [signParty, setSignParty] = useState<'operator' | 'client' | 'employee'>('operator');
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signing, setSigning] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, t, e] = await Promise.all([
        contractsApi.list(),
        contractsApi.templates(),
        employeesApi.list(),
      ]);
      setContracts(c);
      setTemplates(t);
      setEmployees(e);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const employeesById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const templatesById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await contractsApi.generate({ templateId: selectedTemplate, employeeId: selectedEmployee });
      setShowForm(false);
      setSelectedTemplate('');
      setSelectedEmployee('');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Generate failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signingId) return;
    setSigning(true);
    try {
      await contractsApi.sign(signingId, { party: signParty, signerName, signerEmail });
      setSigningId(null);
      setSignerName('');
      setSignerEmail('');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Sign failed');
    } finally {
      setSigning(false);
    }
  };

  const downloadPdf = async (id: string) => {
    try {
      const r = await contractsApi.pdf(id);
      if (r.url) window.open(r.url, '_blank');
      else if (r.base64) {
        const blob = new Blob(
          [Uint8Array.from(atob(r.base64), (ch) => ch.charCodeAt(0))],
          { type: 'application/pdf' },
        );
        window.open(URL.createObjectURL(blob), '_blank');
      }
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'PDF render failed');
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
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Contracts</h1>
          <p className="text-sm mt-1 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            Tripartite agreements, employee info forms, and termination notices — versioned and signed by all parties.
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'Generate'}
        </button>
      </motion.div>

      {error && (
        <motion.div variants={fadeUp} className="pill pill-danger w-full justify-start !rounded-xl !px-3 !py-2 !text-sm">
          {error}
        </motion.div>
      )}

      {showForm && (
        <motion.form variants={fadeUp} onSubmit={handleGenerate} className="surface p-5 space-y-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Generate a new contract</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Template</label>
              <select value={selectedTemplate} required onChange={(e) => setSelectedTemplate(e.target.value)} className="field">
                <option value="">Select template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.title} · v{t.version}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Employee</label>
              <select value={selectedEmployee} required onChange={(e) => setSelectedEmployee(e.target.value)} className="field">
                <option value="">Select employee…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} · {emp.position}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={generating || !selectedTemplate || !selectedEmployee} className="btn-primary">
              {generating && <Loader2 className="w-4 h-4 animate-spin" />}
              Generate draft
            </button>
          </div>
        </motion.form>
      )}

      <motion.div variants={fadeUp} className="surface overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="icon-chip-tertiary icon-chip" style={{ width: '1.75rem', height: '1.75rem' }}>
            <Scroll className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {contracts.length} {contracts.length === 1 ? 'contract' : 'contracts'}
          </h2>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
        ) : contracts.length === 0 ? (
          <div className="p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No contracts yet. Generate a tripartite agreement from the employee onboarding flow.
          </div>
        ) : (
          <>
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Template</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Signatures</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => {
                  const emp = c.employeeId ? employeesById.get(c.employeeId) : undefined;
                  const tpl = templatesById.get(c.templateId);
                  const sigs: Signature[] = c.signatures ? JSON.parse(c.signatures) : [];
                  return (
                    <tr key={c.id} className="table-row">
                      <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>
                        {emp ? `${emp.firstName} ${emp.lastName}` : c.employeeId ?? '—'}
                      </td>
                      <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>{tpl?.title ?? c.templateId}</td>
                      <td className="px-5 py-3">
                        <span className={`pill capitalize ${pillClass[c.status]}`}>{c.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {sigs.length === 0 ? '—' : sigs.map((s) => s.party).join(', ')}
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{c.createdAt.slice(0, 10)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {c.status !== 'signed' && c.status !== 'archived' && (
                            <button
                              onClick={() => {
                                setSigningId(c.id);
                                const remaining = (['operator', 'client', 'employee'] as const).find(
                                  (p) => !sigs.some((s) => s.party === p),
                                );
                                if (remaining) setSignParty(remaining);
                              }}
                              className="btn-secondary !px-2.5 !py-1 !text-xs"
                            >
                              <FileSignature className="w-3 h-3" />
                              Sign
                            </button>
                          )}
                          <button onClick={() => downloadPdf(c.id)} className="btn-secondary !px-2.5 !py-1 !text-xs">
                            <FileDown className="w-3 h-3" />
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile stacked */}
            <div className="md:hidden divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {contracts.map((c) => {
                const emp = c.employeeId ? employeesById.get(c.employeeId) : undefined;
                const tpl = templatesById.get(c.templateId);
                const sigs: Signature[] = c.signatures ? JSON.parse(c.signatures) : [];
                return (
                  <div key={c.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {emp ? `${emp.firstName} ${emp.lastName}` : c.employeeId ?? '—'}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{tpl?.title ?? c.templateId}</p>
                      </div>
                      <span className={`pill capitalize ${pillClass[c.status]}`}>{c.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {sigs.length === 0 ? 'No signatures yet' : `Signed by ${sigs.map((s) => s.party).join(', ')}`}
                    </p>
                    <div className="flex gap-2">
                      {c.status !== 'signed' && c.status !== 'archived' && (
                        <button
                          onClick={() => {
                            setSigningId(c.id);
                            const remaining = (['operator', 'client', 'employee'] as const).find(
                              (p) => !sigs.some((s) => s.party === p),
                            );
                            if (remaining) setSignParty(remaining);
                          }}
                          className="btn-secondary !px-2.5 !py-1 !text-xs flex-1"
                        >
                          <FileSignature className="w-3 h-3" />
                          Sign
                        </button>
                      )}
                      <button onClick={() => downloadPdf(c.id)} className="btn-secondary !px-2.5 !py-1 !text-xs flex-1">
                        <FileDown className="w-3 h-3" />
                        PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>

      {signingId && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 10, 22, 0.72)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSigningId(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSign}
            className="surface w-full max-w-md p-6 space-y-4"
          >
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Sign contract</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                In-app typed signature. Audit trail captured.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Party</label>
              <select value={signParty} onChange={(e) => setSignParty(e.target.value as any)} className="field">
                <option value="operator">Operator (PayrollPlatform)</option>
                <option value="client">Client</option>
                <option value="employee">Employee</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Signer full name</label>
              <input value={signerName} onChange={(e) => setSignerName(e.target.value)} required className="field" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Signer email</label>
              <input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} required className="field" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSigningId(null)} className="btn-outlined">Cancel</button>
              <button type="submit" disabled={signing || !signerName || !signerEmail} className="btn-primary">
                {signing && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign
              </button>
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
}
