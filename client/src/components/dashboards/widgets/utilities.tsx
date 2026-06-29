import React, { useEffect, useState, useRef } from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

/**
 * Shared dashboard utilities — extracted from the legacy DashboardView so
 * they can be composed into mode-aware client and operator dashboards.
 */

// ─── Animated number counter ──────────────────────────────────────────────

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}

export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1.2,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = value;

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick);
      }
    };

    ref.current = requestAnimationFrame(tick);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [value, duration]);

  const formatted = display.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

// ─── Inline sparkline (tiny area chart) ───────────────────────────────────

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = 'var(--sky-500)', height = 28 }: SparklineProps) {
  const chartData = data.map((v, i) => ({ v, i }));
  const id = `spark-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────

interface GlassTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; color?: string }>;
  label?: string;
  formatter?: (value: number) => string;
}

export function GlassTooltip({ active, payload, label, formatter }: GlassTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '10px',
        padding: '8px 12px',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {label && <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px' }}>{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color ?? 'var(--sky-700)', fontSize: '12px', fontWeight: 600 }}>
          {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}
