import React from 'react';

type Tone = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'neutral';
type Size = 'sm' | 'md' | 'lg';

interface IconChipProps {
  icon: React.ReactNode;
  tone?: Tone;
  size?: Size;
  className?: string;
}

const toneStyle: Record<Tone, React.CSSProperties> = {
  primary:   { background: 'var(--primary-soft)',    color: 'var(--sky-600)',    border: '1px solid var(--border-default)' },
  secondary: { background: 'var(--secondary-soft)',  color: 'var(--slate-600)',  border: '1px solid var(--border-default)' },
  tertiary:  { background: 'var(--tertiary-soft)',   color: 'var(--lilac-600)',  border: '1px solid var(--border-default)' },
  danger:    { background: 'var(--danger-soft)',     color: '#DC2626',           border: '1px solid var(--error)' },
  neutral:   { background: 'var(--bg-surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' },
};

const sizeClass: Record<Size, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

export function IconChip({ icon, tone = 'primary', size = 'md', className = '' }: IconChipProps) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full flex-shrink-0 ${sizeClass[size]} ${className}`}
      style={toneStyle[tone]}
    >
      {icon}
    </div>
  );
}
