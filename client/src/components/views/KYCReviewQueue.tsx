import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle, FileText, Eye, CheckCircle2, X, Loader2 } from 'lucide-react';
import { fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, PageHeader, Surface, IconChip, Pill, Button, Field, Tab, Tabs, ErrorBanner, LoadingState, EmptyState } from '../ui';
import { documents as documentsApi } from '../../lib/api';
import { useApiList, coerceError } from '../../hooks/useApi';

type ServerKycItem = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  company: string | null;
  documentType: string;
  fileName: string;
  fileSize: number;
  uploadStatus: string;
  verificationStatus: string;
  uploadedAt: string;
};

const TYPE_LABEL: Record<string, string> = {
  kyc_business_registration: 'Business registration',
  kyc_tax_id: 'Tax ID',
  kyc_director_id: 'Director ID',
  kyc_address_proof: 'Address proof',
  kyc_bank_statement: 'Bank statement',
};

function ageInHours(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(ms / (60 * 60 * 1000)));
}

function severity(hours: number): 'high' | 'medium' | 'low' {
  return hours > 24 ? 'high' : hours > 8 ? 'medium' : 'low';
}

function severityTone(s: 'high' | 'medium' | 'low'): 'danger' | 'warn' | 'muted' {
  return s === 'high' ? 'danger' : s === 'medium' ? 'warn' : 'muted';
}

export default function KYCReviewQueue() {
  const [active, setActive] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [recentApproved, setRecentApproved] = useState<ServerKycItem[]>([]);
  const [recentRejected, setRecentRejected] = useState<ServerKycItem[]>([]);

  const { data: items, loading, error: loadError, reload } = useApiList<ServerKycItem>(
    () => documentsApi.kycQueue(),
    [],
    'Failed to load KYC review queue',
  );

  const error = loadError ?? actionError;

  const enriched = useMemo(
    () =>
      items.map((it) => {
        const hours = ageInHours(it.uploadedAt);
        return { ...it, ageHours: hours, severity: severity(hours) };
      }),
    [items],
  );

  const handleAction = async (item: ServerKycItem, status: 'verified' | 'rejected') => {
    const note = notes[item.id]?.trim() ?? '';
    if (!note) {
      setActionError('Reviewer notes are required.');
      return;
    }
    setActing(item.id);
    setActionError(null);
    try {
      await documentsApi.setVerification(item.id, { status, notes: note });
      if (status === 'verified') setRecentApproved((p) => [item, ...p]);
      else setRecentRejected((p) => [item, ...p]);
      setNotes((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      await reload();
    } catch (e: any) {
      setActionError(coerceError(e, `Failed to ${status === 'verified' ? 'approve' : 'reject'} document`));
    } finally {
      setActing(null);
    }
  };

  const handlePreview = async (item: ServerKycItem) => {
    try {
      const { signedUrl } = await documentsApi.signedUrl(item.id);
      if (signedUrl) window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      setActionError(coerceError(e, 'Failed to generate preview link'));
    }
  };

  return (
    <PageContainer>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUp}>
          <PageHeader
            eyebrow="Compliance"
            title="KYC review queue"
            subtitle="Documents uploaded by employees and clients in onboarding. Each requires reviewer notes per audit policy."
          />
        </motion.div>

        <ErrorBanner message={error} onRetry={reload} />

        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Surface padding="md" tone="accent">
            <div className="flex items-center gap-3">
              <IconChip icon={<AlertTriangle className="w-4 h-4" />} tone="danger" size="sm" />
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Pending review</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{enriched.length}</p>
              </div>
            </div>
          </Surface>
          <Surface padding="md">
            <div className="flex items-center gap-3">
              <IconChip icon={<CheckCircle2 className="w-4 h-4" />} tone="primary" size="sm" />
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Approved (this session)</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{recentApproved.length}</p>
              </div>
            </div>
          </Surface>
          <Surface padding="md">
            <div className="flex items-center gap-3">
              <IconChip icon={<X className="w-4 h-4" />} tone="tertiary" size="sm" />
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Rejected (this session)</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{recentRejected.length}</p>
              </div>
            </div>
          </Surface>
        </motion.div>

        <Tabs value={active} onChange={setActive}>
          <Tab value="pending"  label={`Pending (${enriched.length})`}  icon={<ShieldCheck className="w-3.5 h-3.5" />} />
          <Tab value="approved" label={`Approved (${recentApproved.length})`} icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
          <Tab value="rejected" label={`Rejected (${recentRejected.length})`} icon={<X className="w-3.5 h-3.5" />} />
        </Tabs>

        {active === 'pending' && (
          <motion.div variants={fadeUp}>
            <Surface padding="none" className="overflow-hidden">
              {loading && enriched.length === 0 ? (
                <LoadingState label="Loading KYC queue…" />
              ) : enriched.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck className="w-6 h-6" />}
                  title="Queue clear"
                  description="No pending KYC documents to review."
                />
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {enriched.map((item) => {
                    const isActing = acting === item.id;
                    return (
                      <div key={item.id} className="px-5 md:px-6 py-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <IconChip icon={<FileText className="w-4 h-4" />} tone={item.severity === 'high' ? 'danger' : 'primary'} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {item.fileName}
                              <span className="text-[10px] uppercase tracking-wider ml-2" style={{ color: 'var(--text-muted)' }}>
                                {TYPE_LABEL[item.documentType] ?? item.documentType.replace(/^kyc_/, '').replace(/_/g, ' ')}
                              </span>
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {item.userName ?? item.userEmail ?? item.userId}
                              {item.company ? ` · ${item.company}` : ''}
                              {' · uploaded '}{item.uploadedAt.slice(0, 16).replace('T', ' ')}
                            </p>
                          </div>
                          <Pill tone={severityTone(item.severity) as any} size="sm">{item.ageHours}h waiting</Pill>
                          <Button variant="outlined" size="sm" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => handlePreview(item)}>Preview</Button>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            onClick={() => handleAction(item, 'verified')}
                            disabled={isActing}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outlined"
                            size="sm"
                            icon={<X className="w-3.5 h-3.5" />}
                            onClick={() => handleAction(item, 'rejected')}
                            disabled={isActing}
                          >
                            Reject
                          </Button>
                        </div>
                        <div className="mt-3">
                          <Field
                            label="Reviewer notes (required)"
                            placeholder="e.g. ID matches application, name spelled correctly, document not expired"
                            value={notes[item.id] ?? ''}
                            onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: (e.target as HTMLInputElement).value }))}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Surface>
          </motion.div>
        )}

        {active === 'approved' && (
          <Surface padding={recentApproved.length === 0 ? 'md' : 'none'} className="overflow-hidden">
            {recentApproved.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No approvals in this session yet.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {recentApproved.map((item) => (
                  <div key={item.id} className="px-5 md:px-6 py-3 flex items-center gap-3">
                    <IconChip icon={<CheckCircle2 className="w-4 h-4" />} tone="primary" size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.fileName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.userName ?? item.userId} {item.company ? `· ${item.company}` : ''}</p>
                    </div>
                    <Pill tone="success" size="sm" dot>approved</Pill>
                  </div>
                ))}
              </div>
            )}
          </Surface>
        )}

        {active === 'rejected' && (
          <Surface padding={recentRejected.length === 0 ? 'md' : 'none'} className="overflow-hidden">
            {recentRejected.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No rejections in this session yet.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {recentRejected.map((item) => (
                  <div key={item.id} className="px-5 md:px-6 py-3 flex items-center gap-3">
                    <IconChip icon={<X className="w-4 h-4" />} tone="danger" size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.fileName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.userName ?? item.userId} {item.company ? `· ${item.company}` : ''}</p>
                    </div>
                    <Pill tone="danger" size="sm" dot>rejected</Pill>
                  </div>
                ))}
              </div>
            )}
          </Surface>
        )}
      </motion.div>
    </PageContainer>
  );
}
