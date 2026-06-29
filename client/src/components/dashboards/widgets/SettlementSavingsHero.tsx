import { motion } from 'framer-motion';
import { Sparkles, TrendingUp } from 'lucide-react';
import { fadeUp } from '../../../lib/viewConstants';
import { AnimatedNumber, Sparkline } from './utilities';

export interface CorridorSaving {
  label: string;
  wise: string;
  saved: string;
}

export interface ProtocolStat {
  label: string;
  value: string;
}

interface SettlementSavingsHeroProps {
  /** e.g. 97.2 (rendered as "$97.2K") */
  value: number;
  /** Display suffix for value, default 'K' */
  suffix?: string;
  /** Display prefix for value, default '$' */
  prefix?: string;
  /** Decimals for animated number */
  decimals?: number;
  /** e.g. "+45%" */
  change: string;
  /** e.g. "vs. Wise & traditional rails" */
  subtitle: string;
  /** Hero title — usually "Settlement Fees Saved" or operator-aggregated variant */
  label: string;
  /** 12-pt sparkline data */
  sparkData: number[];
  /** Three small stat tiles below the hero number */
  stats: ProtocolStat[];
  /** Corridor savings rows (platform fee vs Wise) */
  corridorSavings: CorridorSaving[];
}

export function SettlementSavingsHero({
  value,
  suffix = 'K',
  prefix = '$',
  decimals = 1,
  change,
  subtitle,
  label,
  sparkData,
  stats,
  corridorSavings,
}: SettlementSavingsHeroProps) {
  return (
    <motion.div
      variants={fadeUp}
      className="col-span-12 lg:col-span-5 p-5 rounded-xl relative overflow-hidden flex flex-col justify-between"
      style={{
        background: 'var(--bg-accent-soft)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 0 40px rgba(125, 211, 252, 0.10)',
      }}
    >
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full"
        style={{ background: 'transparent' }}
      />
      <div className="relative">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(125, 211, 252, 0.15)', border: '1px solid var(--border-default)' }}
          >
            <Sparkles className="w-5 h-5" style={{ color: 'var(--sky-700)' }} />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
          </div>
        </div>
        <div className="flex items-end gap-3 mb-2">
          <span className="text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          </span>
          <span className="text-sm font-semibold pb-1 flex items-center gap-1" style={{ color: 'var(--sky-700)' }}>
            <TrendingUp className="w-3.5 h-3.5" />
            {change}
          </span>
        </div>
        <Sparkline data={sparkData} color="var(--sky-500)" height={32} />
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Settlement Protocol — $0.01 flat fees</p>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-2.5"
              style={{ background: 'rgba(125, 211, 252, 0.10)', border: '1px solid var(--border-default)' }}
            >
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p className="text-[13px] font-bold mt-0.5 font-mono" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {corridorSavings.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between text-[10px] py-1 last:border-0"
              style={{ borderBottom: '1px solid rgba(125, 211, 252, 0.30)' }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
              <span className="line-through" style={{ color: 'var(--text-muted)' }}>{r.wise}</span>
              <span className="font-semibold" style={{ color: 'var(--sky-700)' }}>→ {r.saved}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
