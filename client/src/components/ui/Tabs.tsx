import React, { createContext, useContext, useRef, useEffect } from 'react';

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
  registerTab: (value: string, el: HTMLButtonElement | null) => void;
  focusNext: (currentValue: string, dir: 1 | -1) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps<V extends string = string> {
  value: V;
  onChange: (value: V) => void;
  children: React.ReactNode;
  className?: string;
  /** When true the tab list scrolls horizontally on overflow. Default true. */
  scrollable?: boolean;
}

export function Tabs<V extends string = string>({ value, onChange, children, className = '', scrollable = true }: TabsProps<V>) {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const registerTab = (val: string, el: HTMLButtonElement | null) => {
    if (el) tabRefs.current.set(val, el);
    else tabRefs.current.delete(val);
  };

  const focusNext = (currentValue: string, dir: 1 | -1) => {
    const values = Array.from(tabRefs.current.keys());
    const idx = values.indexOf(currentValue);
    if (idx === -1) return;
    const nextIdx = (idx + dir + values.length) % values.length;
    const nextValue = values[nextIdx];
    const el = tabRefs.current.get(nextValue);
    el?.focus();
    onChange(nextValue as V);
  };

  return (
    <TabsContext.Provider value={{ value: value as string, onChange: onChange as (v: string) => void, registerTab, focusNext }}>
      <div
        role="tablist"
        className={`flex items-center gap-2 ${scrollable ? 'overflow-x-auto' : 'flex-wrap'} ${className}`}
        style={{
          paddingBottom: scrollable ? 4 : 0,
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabProps {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function Tab({ value, label, icon, disabled }: TabProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('<Tab> must be inside <Tabs>');

  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ctx.registerTab(value, ref.current);
    return () => ctx.registerTab(value, null);
  }, [value, ctx]);

  const active = ctx.value === value;

  return (
    <button
      ref={ref}
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      disabled={disabled}
      onClick={() => ctx.onChange(value)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); ctx.focusNext(value, 1); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); ctx.focusNext(value, -1); }
      }}
      className="inline-flex items-center gap-2 whitespace-nowrap font-medium transition-colors"
      style={{
        padding: '0.5rem 0.875rem',
        borderRadius: 'var(--radius)',
        fontSize: 'var(--text-sm)',
        color: active ? 'var(--sky-700)' : 'var(--text-secondary)',
        background: active ? 'var(--primary-soft)' : 'transparent',
        border: '1px solid',
        borderColor: active ? 'rgba(125, 211, 252, 0.35)' : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transitionDuration: 'var(--duration-fast)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
