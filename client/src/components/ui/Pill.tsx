import React from 'react';

type Tone = 'primary' | 'secondary' | 'tertiary' | 'success' | 'warn' | 'danger' | 'muted';

interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
  size?: 'sm' | 'md';
}

// Pills follow the PayrollPlatform spec: paper fill, 1.5px ink border, pill radius.
// Tone shifts the soft fill + dot/text accent — but the silhouette stays ink.
const toneStyle: Record<Tone, React.CSSProperties> = {
  primary:   { background: 'var(--primary-soft)',     color: 'var(--ink)', border: '1.5px solid var(--ink)' },
  secondary: { background: 'var(--secondary-soft)',   color: 'var(--ink)', border: '1.5px solid var(--ink)' },
  tertiary:  { background: 'var(--tertiary-soft)',    color: 'var(--ink)', border: '1.5px solid var(--ink)' },
  success:   { background: 'rgba(47, 191, 113, 0.16)', color: 'var(--ok)',    border: '1.5px solid var(--ink)' },
  warn:      { background: 'rgba(245, 158, 11, 0.18)', color: '#7C3F08',      border: '1.5px solid var(--ink)' },
  danger:    { background: 'rgba(239, 68, 68, 0.16)',  color: 'var(--error)', border: '1.5px solid var(--ink)' },
  muted:     { background: 'var(--paper)',             color: 'var(--ink-2)', border: '1.5px solid var(--ink)' },
};

// Brand accents for the dot — sharper than the desaturated text colour.
const dotAccent: Record<Tone, string> = {
  primary:   'var(--lavender)',
  secondary: 'var(--sky)',
  tertiary:  'var(--lavender)',
  success:   'var(--ok)',
  warn:      'var(--warn)',
  danger:    'var(--error)',
  muted:     'var(--muted)',
};

export function Pill({ tone = 'primary', dot, size = 'sm', className = '', style, children, ...rest }: PillProps) {
  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-medium ${sizeCls} ${className}`}
      style={{ ...toneStyle[tone], ...style }}
      {...rest}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: dotAccent[tone] }}
        />
      )}
      {children}
    </span>
  );
}
