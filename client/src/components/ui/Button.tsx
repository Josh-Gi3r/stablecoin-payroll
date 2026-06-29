import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'inverted' | 'outlined' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

// Buttons follow PayrollPlatform spec: pill radius, 2px ink border, lavender primary
// fill, paper secondary, ink inverted. No hard-offset shadow on platform side —
// just clean motion via brightness-110 on hover. The ink border is the silhouette.
const variantStyle: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--lavender)',
    color: 'var(--ink)',
    border: '2px solid var(--ink)',
  },
  secondary: {
    background: 'var(--sky)',
    color: 'var(--ink)',
    border: '2px solid var(--ink)',
  },
  inverted: {
    background: 'var(--paper)',
    color: 'var(--ink)',
    border: '2px solid var(--ink)',
  },
  outlined: {
    background: 'transparent',
    color: 'var(--ink)',
    border: '1.5px solid var(--ink)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ink-2)',
  },
  danger: {
    background: 'var(--error)',
    color: 'var(--paper)',
    border: '2px solid var(--ink)',
  },
};

// Pill radius across all sizes — the rounded silhouette is part of the brand.
const sizeStyle: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-full gap-2',
  md: 'px-4 py-2.5 text-sm rounded-full gap-2',
  lg: 'px-5 py-3 text-sm rounded-full gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  iconRight,
  fullWidth,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      style={variantStyle[variant]}
      className={`
        inline-flex items-center justify-center font-medium
        ${sizeStyle[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 active:brightness-95'}
        ${className}
      `}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}
