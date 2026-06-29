import React from 'react';

type Tone = 'default' | 'subtle' | 'raised' | 'accent' | 'tertiary';
type Padding = 'none' | 'sm' | 'md' | 'lg';

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  padding?: Padding;
  glow?: 'primary' | 'tertiary' | 'none';
}

// Platform spec: paper fill, 1px ink border, soft shadow only. Accent tones
// shift the fill but keep the ink silhouette consistent across the system.
const toneStyle: Record<Tone, React.CSSProperties> = {
  default: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
  },
  subtle: {
    background: 'var(--bg-surface-subtle)',
    border: '1px solid var(--border-subtle)',
  },
  raised: {
    background: 'var(--bg-surface-raised)',
    border: '1px solid var(--border-default)',
  },
  accent: {
    background: 'var(--primary-soft)',
    border: '1px solid var(--border-default)',
  },
  tertiary: {
    background: 'var(--tertiary-soft)',
    border: '1px solid var(--border-default)',
  },
};

const paddingClass: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function Surface({
  tone = 'default',
  padding = 'md',
  glow = 'none',
  className = '',
  style,
  ...rest
}: SurfaceProps) {
  const boxShadow =
    glow === 'primary'
      ? 'var(--shadow-pop)'
      : glow === 'tertiary'
        ? 'var(--shadow-lilac)'
        : 'var(--shadow-card)';

  return (
    <div
      className={`${paddingClass[padding]} ${className}`}
      style={{ borderRadius: 'var(--radius)', ...toneStyle[tone], boxShadow, ...style }}
      {...rest}
    />
  );
}
