import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, eyebrow, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex flex-col md:flex-row md:items-end md:justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--sky-700)' }}>
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-1.5 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
