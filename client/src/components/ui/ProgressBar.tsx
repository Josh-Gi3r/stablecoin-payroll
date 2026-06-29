import React from 'react';

type Tone = 'primary' | 'secondary' | 'tertiary';
type Size = 'sm' | 'md';

interface ProgressBarProps {
  value: number; // 0–100
  tone?: Tone;
  size?: Size;
  label?: string;
  valueLabel?: string;
  className?: string;
}

const toneColor: Record<Tone, string> = {
  primary:   'var(--sky-300)',
  secondary: 'var(--slate-400)',
  tertiary:  'var(--lilac-300)',
};

export function ProgressBar({ value, tone = 'primary', size = 'md', label, valueLabel, className = '' }: ProgressBarProps) {
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={className}>
      {(label || valueLabel) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>}
          {valueLabel && <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{valueLabel}</span>}
        </div>
      )}
      <div
        className={`w-full rounded-full overflow-hidden ${height}`}
        style={{ background: 'var(--bg-surface-raised)' }}
      >
        <div
          className={`${height} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%`, background: toneColor[tone] }}
        />
      </div>
    </div>
  );
}
