import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { fadeUp } from '../../../lib/viewConstants';
import { Surface, IconChip, Pill } from '../../ui';

export interface PlatformInvoiceItem {
  id: string;
  /** Display period, e.g. "Apr 1–15" */
  period: string;
  /** Total amount, e.g. "RM 28,960" */
  total: string;
  /** Due date, e.g. "Apr 22" */
  due: string;
  status: 'paid' | 'draft' | 'overdue';
  /** Optional line-item breakdown shown only for finance role */
  breakdown?: { payroll: string; statutory: string; fee: string };
}

interface PlatformInvoicesCardProps {
  invoices: PlatformInvoiceItem[];
  /** Show line-item breakdown (typically Finance role only) */
  showBreakdown?: boolean;
  title?: string;
  subtitle?: string;
}

/**
 * EOR-only widget. Shows invoices the platform has billed the client for —
 * gross payroll pass-through + employer statutory pass-through + 5%
 * service fee. Finance role sees the line-item breakdown per row.
 * Should NOT render when client.mode !== 'eor'.
 */
export function PlatformInvoicesCard({
  invoices,
  showBreakdown = false,
  title = 'Invoices from EOR Provider',
  subtitle = 'Auto-generated from approved payroll runs',
}: PlatformInvoicesCardProps) {
  return (
    <motion.div variants={fadeUp} className="break-inside-avoid mb-4">
      <Surface padding="none" className="overflow-hidden">
        <div
          className="px-5 md:px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <IconChip icon={<FileText className="w-4 h-4" />} tone="secondary" size="sm" />
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
            </div>
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {invoices.map((inv) => (
            <div key={inv.id} className="px-5 md:px-6 py-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{inv.id}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Period {inv.period} · Due {inv.due}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-base font-semibold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {inv.total}
                  </p>
                  <Pill tone={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : 'warn'} size="sm" dot>
                    {inv.status}
                  </Pill>
                </div>
              </div>
              {showBreakdown && inv.breakdown && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-surface-subtle)' }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Gross payroll</p>
                    <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{inv.breakdown.payroll}</p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'var(--bg-surface-subtle)' }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Statutory</p>
                    <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{inv.breakdown.statutory}</p>
                  </div>
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: 'var(--primary-soft)', border: '1px solid var(--border-default)' }}
                  >
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sky-700)' }}>Service fee 5%</p>
                    <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{inv.breakdown.fee}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Surface>
    </motion.div>
  );
}
