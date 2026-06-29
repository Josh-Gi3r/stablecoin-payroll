import { motion } from 'framer-motion';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { card, fadeUp } from '../../../lib/viewConstants';
import { GlassTooltip } from './utilities';

export interface CurrencyHolding {
  name: string;
  value: number;
  /** Display percentage of total (already computed) */
  percentage: number;
}

interface CurrencyHoldingsProps {
  data: CurrencyHolding[];
  formatter?: (value: number) => string;
  /** Override default ramp. */
  colors?: string[];
  className?: string;
  title?: string;
}

const DEFAULT_COLORS = ['var(--sky-500)', 'var(--sky-400)', 'var(--lilac-500)', 'var(--slate-500)'];

const defaultFormatter = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

/**
 * Donut chart of multi-currency wallet holdings (Stablecoin / xSGD / USDT etc.).
 * Used by Treasury-aware client dashboards and cross-client operator view.
 */
export function CurrencyHoldings({
  data,
  formatter = defaultFormatter,
  colors = DEFAULT_COLORS,
  className = 'col-span-12 sm:col-span-6 lg:col-span-3 p-5 rounded-xl flex flex-col',
  title = 'Currency Holdings',
}: CurrencyHoldingsProps) {
  const renderLabel = ({ cx, cy, midAngle, outerRadius, name, percentage }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="var(--text-secondary)"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={11}
        fontWeight={500}
      >
        {name} {percentage}%
      </text>
    );
  };

  return (
    <motion.div variants={fadeUp} className={className} style={card}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={3}
              stroke="none"
              label={renderLabel}
            >
              {data.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<GlassTooltip formatter={formatter} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
