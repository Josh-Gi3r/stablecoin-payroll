import { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorBannerProps {
  /** Error message text. If null/empty, the banner doesn't render. */
  message?: string | null;
  /** Optional retry handler — renders a "Retry" button at the right. */
  onRetry?: () => void;
  /** Optional dismiss handler — when provided, banner shows an X close button. */
  onDismiss?: () => void;
  className?: string;
}

/**
 * Inline error banner used at the top of a view whenever a fetch or
 * mutation fails. Renders nothing when `message` is empty, so callers
 * can drop it in unconditionally. Always shows a dismiss (X) button —
 * if no onDismiss prop is given, the banner manages local hide state
 * so users can clear sticky errors without refreshing.
 */
export function ErrorBanner({ message, onRetry, onDismiss, className = '' }: ErrorBannerProps) {
  const [hidden, setHidden] = useState(false);
  // Reset hide state whenever a new error message arrives.
  useEffect(() => { setHidden(false); }, [message]);

  if (!message || hidden) return null;

  const handleDismiss = () => {
    if (onDismiss) onDismiss();
    else setHidden(true);
  };

  return (
    <div
      className={`rounded-xl px-3 py-2 flex items-center gap-2 text-sm ${className}`}
      style={{
        background: 'rgba(239, 68, 68, 0.06)',
        border: '1px solid var(--error)',
        color: 'var(--danger)',
      }}
      role="alert"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 min-w-0">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-medium underline-offset-2 hover:underline"
        >
          Retry
        </button>
      )}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="p-1 -m-1 rounded-md hover:bg-rose-100 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
