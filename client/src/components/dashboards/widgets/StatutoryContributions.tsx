import { motion } from 'framer-motion';
import { card, fadeUp } from '../../../lib/viewConstants';

export interface StatutoryContributionItem {
  label: string;
  /** Amount in the smallest currency unit (e.g. RM cents, Stablecoin). */
  amount: number;
  /** Hex or CSS-var color for the dot + progress fill */
  color: string;
}

export interface StatutoryShareTile {
  label: string;
  amount: string;
  sub: string;
}

export interface StatutoryDeadline {
  agency: string;
  due: string;
  amount: string;
}

interface StatutoryContributionsProps {
  /** Per-scheme contribution rows (EPF EE/ER, SOCSO, EIS, etc.). */
  items: StatutoryContributionItem[];
  /** Currency prefix for the amount display, e.g. 'Stablecoin' */
  currency?: string;
  /** Period badge in top-right, e.g. 'Feb 2026' */
  period: string;
  /** Two-column employee/employer share tiles */
  shareTiles: StatutoryShareTile[];
  /** Upcoming filing deadlines for the period */
  deadlines: StatutoryDeadline[];
  /** Title under top-right badge */
  totalDueLabel?: string;
  className?: string;
  title?: string;
}

/**
 * Statutory contributions panel — per-scheme breakdown with progress bars
 * showing relative contribution share, plus employee/employer share tiles
 * and upcoming filing deadlines. Used on Payroll+/EOR client dashboards
 * and aggregated on the Operator dashboard.
 */
export function StatutoryContributions({
  items,
  currency = 'Stablecoin',
  period,
  shareTiles,
  deadlines,
  totalDueLabel = 'Due 15 Mar 2026 — All agencies',
  className = 'col-span-12 lg:col-span-4 p-5 rounded-xl',
  title = 'Statutory Contributions',
}: StatutoryContributionsProps) {
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const fmt = (n: number) => `${currency} ${(n / 1000).toFixed(0)}K`;

  return (
    <motion.div variants={fadeUp} className={className} style={card}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--primary-soft)', color: 'var(--sky-700)', border: '1px solid var(--border-default)' }}
        >
          {period}
        </span>
      </div>

      <div className="space-y-2.5 mb-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
            <span className="text-[11px] flex-1" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
            <span className="text-[12px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{fmt(item.amount)}</span>
            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-raised)' }}>
              <div className="h-full rounded-full" style={{ width: `${(item.amount / total) * 100}%`, background: item.color }} />
            </div>
          </div>
        ))}
      </div>

      <div
        className="p-3 rounded-xl"
        style={{
          background: 'var(--bg-accent-soft)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Total Statutory</span>
          <span className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{fmt(total)}</span>
        </div>
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{totalDueLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {shareTiles.map((s) => (
          <div key={s.label} className="rounded-xl p-2.5" style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-default)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            <p className="text-[13px] font-bold font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>{s.amount}</p>
            <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
          Upcoming Deadlines
        </p>
        {deadlines.map((d, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-1.5 last:border-0"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <span className="text-[11px]" style={{ color: 'var(--text-primary)' }}>{d.agency}</span>
            <div className="text-right">
              <p className="text-[10px] font-semibold" style={{ color: 'var(--warn)' }}>{d.due}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{d.amount}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
