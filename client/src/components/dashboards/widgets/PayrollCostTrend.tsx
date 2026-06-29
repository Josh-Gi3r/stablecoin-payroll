import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { card, fadeUp } from '../../../lib/viewConstants';
import { GlassTooltip } from './utilities';

export interface PayrollTrendPoint {
  month: string;
  cost: number;
  budget: number;
}

interface PayrollCostTrendProps {
  data: PayrollTrendPoint[];
  /** Default formats large numbers as $X.XM / $XK / $X */
  formatter?: (value: number) => string;
  /** Override grid span — defaults to col-span-7 on lg */
  className?: string;
}

const defaultFormatter = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

export function PayrollCostTrend({
  data,
  formatter = defaultFormatter,
  className = 'col-span-12 lg:col-span-7 p-5 rounded-xl flex flex-col',
}: PayrollCostTrendProps) {
  return (
    <motion.div variants={fadeUp} className={className} style={card}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Payroll Cost Trend</h3>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <span className="w-2.5 h-0.5 rounded-full inline-block" style={{ background: 'var(--sky-500)' }} /> Actual
          </span>
          <span className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2.5 h-0.5 rounded-full inline-block" style={{ background: 'var(--border-strong)' }} /> Budget
          </span>
        </div>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -10, right: 5 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--sky-500)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--sky-500)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={formatter} axisLine={false} tickLine={false} />
            <Tooltip content={<GlassTooltip formatter={formatter} />} />
            <Area type="monotone" dataKey="cost" stroke="var(--sky-500)" strokeWidth={2} fill="url(#trendFill)" dot={false} />
            <Line type="monotone" dataKey="budget" stroke="var(--border-strong)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
