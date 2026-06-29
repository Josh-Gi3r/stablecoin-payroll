import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { card, fadeUp } from '../../../lib/viewConstants';
import { GlassTooltip } from './utilities';

export type WaterfallType = 'positive' | 'negative' | 'total';

export interface WaterfallStep {
  name: string;
  /** Signed amount: positive for additions, negative for deductions, total for net */
  value: number;
  fill: string;
  type: WaterfallType;
}

interface GrossToNetWaterfallProps {
  /** Steps from gross → deductions → net. The component computes stacked bar positions. */
  steps: WaterfallStep[];
  formatter?: (value: number) => string;
  className?: string;
  title?: string;
}

const defaultFormatter = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(0)}K`;
  return `$${abs}`;
};

/**
 * Compute waterfall bar positions (stacked from the running total).
 * Each step has a `base` (where the bar starts) and `height` (visible bar size).
 * Positives stack upward, negatives stack downward, total sits on the axis.
 */
function computeBars(steps: WaterfallStep[]) {
  let running = 0;
  return steps.map((d) => {
    if (d.type === 'total') {
      return { ...d, base: 0, height: d.value };
    }
    if (d.type === 'positive') {
      const bar = { ...d, base: running, height: d.value };
      running += d.value;
      return bar;
    }
    // negative
    running += d.value;
    return { ...d, base: running, height: -d.value };
  });
}

export function GrossToNetWaterfall({
  steps,
  formatter = defaultFormatter,
  className = 'col-span-12 lg:col-span-5 p-5 rounded-xl flex flex-col',
  title = 'Gross-to-Net Breakdown',
}: GrossToNetWaterfallProps) {
  const bars = computeBars(steps);
  return (
    <motion.div variants={fadeUp} className={className} style={card}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bars} barSize={28} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={formatter} axisLine={false} tickLine={false} />
            <Tooltip content={<GlassTooltip formatter={(v: number) => formatter(Math.abs(v))} />} />
            {/* Invisible base bar that pushes the visible bar to the right vertical position */}
            <Bar dataKey="base" stackId="stack" fill="transparent" radius={0} />
            <Bar dataKey="height" stackId="stack" radius={[4, 4, 0, 0]}>
              {bars.map((entry, i) => (
                <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
