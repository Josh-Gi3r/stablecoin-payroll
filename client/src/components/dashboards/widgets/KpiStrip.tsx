import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { card, fadeUp } from '../../../lib/viewConstants';
import { Sparkline } from './utilities';

export interface KpiItem {
  label: string;
  /** What to display (e.g. "$3.1M", "230", "Feb 15") */
  displayValue: string;
  /** Change indicator, e.g. "+12%" or "34 days" */
  change: string;
  /** Direction of change */
  positive: boolean;
  icon: LucideIcon;
  /** Accent color, e.g. "var(--sky-500)" or hex */
  accent: string;
  /** Optional 12-pt sparkline */
  sparkData?: number[];
}

interface KpiStripProps {
  items: KpiItem[];
  /** Tailwind grid spec — defaults to a 6-card strip */
  gridClassName?: string;
}

/**
 * 6-card KPI strip used at the top of the Payroll+HR / EOR dashboards.
 * Each card has icon chip, change pill, value, label, and optional sparkline.
 */
export function KpiStrip({ items, gridClassName = 'col-span-12 lg:col-span-7 grid grid-cols-2 lg:grid-cols-3 gap-4' }: KpiStripProps) {
  return (
    <div className={gridClassName}>
      {items.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <motion.div key={idx} variants={fadeUp} className="p-4 rounded-xl" style={card}>
            <div className="flex items-center justify-between mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${kpi.accent}15`, border: `1px solid ${kpi.accent}30` }}
              >
                <Icon className="w-4 h-4" style={{ color: kpi.accent }} />
              </div>
              <span
                className="text-[11px] font-semibold flex items-center gap-0.5"
                style={{ color: kpi.positive ? 'var(--sky-700)' : 'var(--danger)' }}
              >
                {kpi.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.change}
              </span>
            </div>
            <p
              className="text-xl font-bold tracking-tight mb-1"
              style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {kpi.displayValue}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
            {kpi.sparkData && (
              <div className="mt-2">
                <Sparkline data={kpi.sparkData} color={kpi.accent} height={24} />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
