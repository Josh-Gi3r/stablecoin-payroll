import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { card, fadeUp } from '../../../lib/viewConstants';
import { GlassTooltip } from './utilities';

export interface DepartmentDatum {
  name: string;
  value: number;
}

interface DepartmentBarProps {
  data: DepartmentDatum[];
  formatter?: (value: number) => string;
  className?: string;
  title?: string;
}

const defaultFormatter = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

/**
 * Horizontal bar chart of payroll cost by department.
 * Sky-tinted bars with decreasing alpha for a clean monochrome look.
 */
export function DepartmentBar({
  data,
  formatter = defaultFormatter,
  className = 'col-span-12 sm:col-span-6 lg:col-span-3 p-5 rounded-xl flex flex-col',
  title = 'By Department',
}: DepartmentBarProps) {
  return (
    <motion.div variants={fadeUp} className={className} style={card}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barSize={16} margin={{ left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickFormatter={formatter} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" width={65} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<GlassTooltip formatter={formatter} />} cursor={{ fill: 'rgba(125, 211, 252, 0.05)' }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={`rgba(125, 211, 252, ${0.95 - i * 0.15})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
