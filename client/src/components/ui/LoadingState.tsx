import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  /** What's loading. Defaults to "Loading…" */
  label?: string;
  /** Optional className override on the wrapping card. */
  className?: string;
}

/**
 * Centered "Loading…" with a spinner. Use inside a card when fetching
 * a list/resource for the first time. Mirrors the EmptyState shape so
 * empty/loading toggles look the same.
 */
export function LoadingState({ label = 'Loading…', className = '' }: LoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    >
      <Loader2 className="w-5 h-5 animate-spin mb-3" style={{ color: 'var(--text-muted)' }} />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}
