import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    >
      {icon && (
        <div
          className="mb-4 inline-flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 'var(--radius-pill)',
            background: 'var(--bg-surface-raised)',
            color: 'var(--text-muted)',
          }}
        >
          {icon}
        </div>
      )}
      <h3
        className="font-semibold"
        style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)' }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="mt-1.5 max-w-sm"
          style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}
        >
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
