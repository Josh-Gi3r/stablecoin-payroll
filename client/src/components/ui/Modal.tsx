import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: Size;
  /** Hide the close (X) button in the header. Default false. */
  hideCloseButton?: boolean;
  /** Disable click-outside-to-close. Default false. */
  disableBackdropClose?: boolean;
}

const sizeWidth: Record<Size, string> = {
  sm: '420px',
  md: '560px',
  lg: '760px',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideCloseButton,
  disableBackdropClose,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Focus the dialog on open
  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{
            zIndex: 'var(--z-modal)' as unknown as number,
            background: 'rgba(15, 23, 41, 0.4)',
            backdropFilter: 'blur(4px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
          onClick={() => { if (!disableBackdropClose) onClose(); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            className="w-full max-h-[90vh] flex flex-col outline-none"
            style={{
              maxWidth: sizeWidth[size],
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-overlay)',
            }}
          >
            {(title || !hideCloseButton) && (
              <div
                className="flex items-start justify-between gap-4 px-5 py-4"
                style={{ borderBottom: '1px solid var(--border-default)' }}
              >
                <div className="min-w-0">
                  {title && (
                    <h2
                      id="modal-title"
                      className="font-semibold"
                      style={{ color: 'var(--text-primary)', fontSize: 'var(--text-lg)' }}
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      className="mt-1"
                      style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}
                    >
                      {description}
                    </p>
                  )}
                </div>
                {!hideCloseButton && (
                  <button
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-lg transition-colors"
                    style={{
                      width: 32,
                      height: 32,
                      color: 'var(--text-muted)',
                    }}
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer && (
              <div
                className="flex items-center justify-end gap-2 px-5 py-3"
                style={{ borderTop: '1px solid var(--border-default)' }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
