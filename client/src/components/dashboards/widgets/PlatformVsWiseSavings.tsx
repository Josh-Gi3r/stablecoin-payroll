import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { card, fadeUp } from '../../../lib/viewConstants';

export interface PlatformVsWiseRow {
  /** Corridor label, e.g. "MY → SG (xSGD)" */
  label: string;
  /** Amount being moved, e.g. "Stablecoin 80,000" */
  amount: string;
  /** Platform fee, typically '$0.01' */
  platform: string;
  /** Wise (or other rail) fee */
  wise: string;
  /** Savings — Wise minus platform fee */
  saved: string;
}

interface PlatformVsWiseSavingsProps {
  rows: PlatformVsWiseRow[];
  className?: string;
  title?: string;
  footnote?: string;
}

/**
 * Per-corridor fee comparison. Each row shows a tiny progress bar where
 * the platform fee sits at <1% of the bar so the visual immediately conveys
 * the magnitude of savings. Sky-tinted card border + radial glow for
 * brand emphasis.
 */
export function PlatformVsWiseSavings({
  rows,
  className = 'col-span-12 lg:col-span-4 p-5 rounded-xl relative overflow-hidden',
  title = 'Platform vs Wise',
  footnote = 'Flat $0.01 per transaction, any amount, any corridor',
}: PlatformVsWiseSavingsProps) {
  return (
    <motion.div
      variants={fadeUp}
      className={className}
      style={{ ...card, borderColor: 'var(--ink)' }}
    >
      <div
        className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(125, 211, 252, 0.1) 0%, transparent 70%)' }}
      />
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4" style={{ color: 'var(--sky-700)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
      </div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div
            key={i}
            className="p-3 rounded-xl"
            style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{row.label}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{row.amount}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="font-semibold" style={{ color: 'var(--sky-700)' }}>Platform: {row.platform}</span>
                  <span style={{ color: 'var(--danger)', opacity: 0.7 }}>Wise: {row.wise}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--danger-soft)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: '1%',
                      minWidth: '3px',
                      background: 'var(--sky-500)',
                      boxShadow: '0 0 8px rgba(125, 211, 252, 0.45)',
                    }}
                  />
                </div>
              </div>
              <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: 'var(--sky-700)' }}>
                Save {row.saved}
              </span>
            </div>
          </div>
        ))}
      </div>
      {footnote && (
        <div className="mt-3 text-center">
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{footnote}</p>
        </div>
      )}
    </motion.div>
  );
}
