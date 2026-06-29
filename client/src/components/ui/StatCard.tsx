import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Surface } from './Surface';
import { IconChip } from './IconChip';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  trend?: { value: string; direction: 'up' | 'down' };
  icon?: React.ReactNode;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'neutral';
  /** If provided the card gets a subtle sky wash background instead of default surface. */
  feature?: boolean;
  className?: string;
}

export function StatCard({ label, value, hint, trend, icon, tone = 'primary', feature, className = '' }: StatCardProps) {
  return (
    <Surface tone={feature ? 'accent' : 'default'} padding="md" className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p
            className="text-3xl font-semibold mt-2 tracking-tight"
            style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </p>
          {(trend || hint) && (
            <div className="flex items-center gap-2 mt-2">
              {trend && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium"
                  style={{ color: trend.direction === 'up' ? 'var(--success)' : 'var(--danger)' }}
                >
                  {trend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {trend.value}
                </span>
              )}
              {hint && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
            </div>
          )}
        </div>
        {icon && <IconChip icon={icon} tone={tone} size="md" />}
      </div>
    </Surface>
  );
}
