import React, { forwardRef } from 'react';

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, prefix, suffix, className = '', style, required, ...rest },
  ref,
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          {label}
          {required && <span className="ml-0.5" style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{
          background: 'var(--bg-surface-subtle)',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border-default)'}`,
          ...style,
        }}
      >
        {prefix}
        <input
          ref={ref}
          required={required}
          className={`flex-1 bg-transparent outline-none text-sm placeholder:opacity-60 ${className}`}
          style={{ color: 'var(--text-primary)' }}
          {...rest}
        />
        {suffix}
      </div>
      {(hint || error) && (
        <p className="text-xs mt-1" style={{ color: error ? 'var(--danger)' : 'var(--text-muted)' }}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, error, className = '', children, required, ...rest },
  ref,
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          {label}
          {required && <span className="ml-0.5" style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      <select
        ref={ref}
        required={required}
        className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${className}`}
        style={{
          background: 'var(--bg-surface-subtle)',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border-default)'}`,
          color: 'var(--text-primary)',
        }}
        {...rest}
      >
        {children}
      </select>
      {(hint || error) && (
        <p className="text-xs mt-1" style={{ color: error ? 'var(--danger)' : 'var(--text-muted)' }}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
