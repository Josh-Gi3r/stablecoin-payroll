import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { card, fadeUp } from '../../../lib/viewConstants';

export type FilingStatus = 'compliant' | 'review' | 'overdue';

export interface FilingStatusRow {
  /** Scheme name, e.g. "EPF (KWSP)" */
  country: string;
  status: FilingStatus;
  /** Progress score 0-100 */
  score: number;
  /** Due date, e.g. "15 Mar" */
  due: string;
}

interface StatutoryFilingStatusProps {
  rows: FilingStatusRow[];
  className?: string;
  title?: string;
}

/**
 * Per-scheme compliance / filing status list. Sky for compliant, amber for
 * review, red for overdue. Used on Payroll+/EOR client dashboards (their
 * own filings) and Operator dashboard (worst-first across clients).
 */
export function StatutoryFilingStatus({
  rows,
  className = 'col-span-12 lg:col-span-4 p-5 rounded-xl',
  title = 'Statutory Filing Status',
}: StatutoryFilingStatusProps) {
  const filed = rows.filter((c) => c.status === 'compliant').length;

  return (
    <motion.div variants={fadeUp} className={className} style={card}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--primary-soft)', color: 'var(--sky-700)', border: '1px solid var(--border-default)' }}
        >
          {filed}/{rows.length} Filed
        </span>
      </div>
      <div className="space-y-2">
        {rows.map((c, i) => {
          const tone =
            c.status === 'compliant' ? 'var(--sky-500)' : c.status === 'review' ? 'var(--warn)' : 'var(--danger)';
          return (
            <div
              key={i}
              className="flex items-center gap-3 p-2.5 rounded-lg"
              style={{ background: 'var(--bg-surface-subtle)' }}
            >
              <span className="text-[12px] flex-1 font-medium" style={{ color: 'var(--text-primary)' }}>{c.country}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Due {c.due}</span>
              <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-raised)' }}>
                <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: tone }} />
              </div>
              {c.status === 'compliant' ? (
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--sky-700)' }} />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" style={{ color: tone }} />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
