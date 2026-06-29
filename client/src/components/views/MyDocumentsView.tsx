import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, ShieldCheck, Scroll } from 'lucide-react';
import { fadeUp, stagger } from '../../lib/viewConstants';
import { PageContainer, PageHeader, Surface, IconChip, Pill, Button, ErrorBanner, LoadingState, EmptyState } from '../ui';
import { auth as authApi, documents as documentsApi } from '../../lib/api';
import { useApiList, useApiResource, coerceError } from '../../hooks/useApi';

type ServerDocument = {
  id: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  uploadStatus: string;
  verificationStatus: string;
  uploadedAt: string;
};

type ListResponse = { documents: ServerDocument[] };

type AuthMe = { user: { id: string; email?: string } };

const TYPE_GROUP: Record<string, { label: string; bucket: 'payslip' | 'tax' | 'contract' | 'kyc' | 'other'; icon: typeof FileText }> = {
  payslip: { label: 'Payslips', bucket: 'payslip', icon: FileText },
  agreement: { label: 'Contracts', bucket: 'contract', icon: Scroll },
  kyc_business_registration: { label: 'KYC documents', bucket: 'kyc', icon: ShieldCheck },
  kyc_tax_id: { label: 'KYC documents', bucket: 'kyc', icon: ShieldCheck },
  kyc_director_id: { label: 'KYC documents', bucket: 'kyc', icon: ShieldCheck },
  kyc_address_proof: { label: 'KYC documents', bucket: 'kyc', icon: ShieldCheck },
  kyc_bank_statement: { label: 'KYC documents', bucket: 'kyc', icon: ShieldCheck },
  other: { label: 'Other documents', bucket: 'other', icon: FileText },
};

const BUCKET_ORDER: Array<{ key: 'payslip' | 'tax' | 'contract' | 'kyc' | 'other'; label: string; icon: typeof FileText }> = [
  { key: 'payslip', label: 'Payslips', icon: FileText },
  { key: 'tax', label: 'Tax forms', icon: ShieldCheck },
  { key: 'contract', label: 'Contracts', icon: Scroll },
  { key: 'kyc', label: 'KYC documents', icon: ShieldCheck },
  { key: 'other', label: 'Other documents', icon: FileText },
];

const formatBytes = (bytes: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function MyDocumentsView() {
  const { data: me, loading: meLoading, error: meError } = useApiResource<AuthMe>(
    () => authApi.me(),
    [],
    'Failed to load profile',
  );

  const userId = me?.user?.id ?? null;

  const { data: response, loading: docsLoading, error: docsError, reload } = useApiList<ServerDocument>(
    async () => {
      if (!userId) return [];
      const r: ListResponse | ServerDocument[] = await documentsApi.listByUser(userId, { limit: 100 });
      return Array.isArray(r) ? r : (r.documents ?? []);
    },
    [userId],
    'Failed to load documents',
  );

  const grouped = useMemo(() => {
    const out: Record<string, ServerDocument[]> = {};
    response.forEach((doc) => {
      const meta = TYPE_GROUP[doc.documentType] ?? TYPE_GROUP.other;
      (out[meta.bucket] ??= []).push(doc);
    });
    return out;
  }, [response]);

  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async (id: string) => {
    setDownloading(id);
    setDownloadError(null);
    try {
      const { signedUrl } = await documentsApi.signedUrl(id);
      if (signedUrl) window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      setDownloadError(coerceError(e, 'Failed to generate download URL'));
    } finally {
      setDownloading(null);
    }
  };

  const error = meError ?? docsError ?? downloadError;
  const loading = meLoading || docsLoading;

  return (
    <PageContainer>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUp}>
          <PageHeader
            eyebrow="Self-service"
            title="My documents"
            subtitle="Payslips, tax forms, employment contract, and KYC bundle. Click any item to download."
          />
        </motion.div>

        <ErrorBanner message={error} onRetry={reload} />

        {loading && response.length === 0 && (
          <LoadingState label="Loading your documents…" />
        )}

        {!loading && response.length === 0 && !error && (
          <Surface>
            <EmptyState
              icon={<FileText className="w-6 h-6" />}
              title="No documents yet"
              description="Payslips and employment documents will appear here once HR uploads them."
            />
          </Surface>
        )}

        {BUCKET_ORDER.map(({ key, label, icon: HeadIcon }) => {
          const items = grouped[key];
          if (!items || items.length === 0) return null;
          return (
            <motion.div key={key} variants={fadeUp}>
              <Surface padding="none" className="overflow-hidden">
                <div className="px-5 md:px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <IconChip icon={<HeadIcon className="w-4 h-4" />} tone="primary" size="sm" />
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{items.length} document{items.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {items.map((d) => (
                    <div key={d.id} className="px-5 md:px-6 py-3 flex items-center gap-3 hover:bg-slate-50/60 transition-colors flex-wrap">
                      <FileText className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{d.fileName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span className="font-mono">{d.id.slice(0, 8)}</span> · {formatBytes(d.fileSize)} · <Calendar className="w-3 h-3 inline -mt-0.5" /> {d.uploadedAt.slice(0, 10)}
                        </p>
                      </div>
                      <Pill tone={d.verificationStatus === 'verified' ? 'success' : d.uploadStatus === 'completed' ? 'primary' : 'warn'} size="sm" dot>
                        {d.verificationStatus === 'verified' ? 'verified' : d.uploadStatus}
                      </Pill>
                      <Button
                        variant="outlined"
                        size="sm"
                        icon={<Download className="w-3.5 h-3.5" />}
                        onClick={() => handleDownload(d.id)}
                        disabled={downloading === d.id}
                      >
                        {downloading === d.id ? 'Generating…' : 'Download'}
                      </Button>
                    </div>
                  ))}
                </div>
              </Surface>
            </motion.div>
          );
        })}
      </motion.div>
    </PageContainer>
  );
}
