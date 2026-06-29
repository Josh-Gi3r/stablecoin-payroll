import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Home, Users, FileText, Send, ArrowLeftRight, TrendingUp, Receipt,
  BookOpen, Zap, Plug, TrendingDown, Download, Settings, DollarSign, CalendarDays,
  CreditCard, CheckSquare, UserCircle, Globe,
} from 'lucide-react';
import { useOrgRole } from '../contexts/OrgRoleContext';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (module: string) => void;
}

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: typeof Home;
  category: string;
  keywords: string[];
}

const allCommands: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Overview & KPIs', icon: Home, category: 'Navigate', keywords: ['home', 'overview', 'kpi', 'metrics'] },
  { id: 'payroll', label: 'Payroll', description: 'Run payroll, view history', icon: Users, category: 'Navigate', keywords: ['salary', 'wages', 'pay run'] },
  { id: 'my-pay', label: 'My Pay', description: 'Pay stubs & tax documents', icon: DollarSign, category: 'Navigate', keywords: ['stub', 'payslip', 'w2', 'tax'] },
  { id: 'my-expenses', label: 'My Expenses', description: 'Submit claims & receipts', icon: Receipt, category: 'Navigate', keywords: ['claim', 'receipt', 'reimburse'] },
  { id: 'time-off', label: 'Time Off', description: 'PTO balances & requests', icon: CalendarDays, category: 'Navigate', keywords: ['pto', 'vacation', 'leave', 'sick'] },
  { id: 'people', label: 'People', description: 'Directory & org chart', icon: UserCircle, category: 'Navigate', keywords: ['employee', 'directory', 'hr', 'onboarding', 'org'] },
  { id: 'approvals', label: 'Approvals', description: 'Pending approval queue', icon: CheckSquare, category: 'Navigate', keywords: ['approve', 'reject', 'review', 'pending'] },
  { id: 'invoicing', label: 'Invoicing', description: 'Create & manage invoices', icon: FileText, category: 'Navigate', keywords: ['invoice', 'bill', 'ar', 'receivable'] },
  { id: 'bill-pay', label: 'Bill Pay', description: 'Vendor bills & payments', icon: CreditCard, category: 'Navigate', keywords: ['vendor', 'ap', 'payable', 'bill'] },
  { id: 'expenses', label: 'Expenses', description: 'Company expense management', icon: Receipt, category: 'Navigate', keywords: ['expense', 'spend', 'budget'] },
  { id: 'accounting', label: 'Accounting', description: 'General ledger & reports', icon: BookOpen, category: 'Navigate', keywords: ['ledger', 'journal', 'gl', 'balance sheet'] },
  { id: 'send', label: 'Send', description: 'Send stablecoin payments', icon: Send, category: 'Settlement', keywords: ['transfer', 'payment', 'usdc', 'stablecoin'] },
  { id: 'swap', label: 'Swap', description: 'FX swap between currencies', icon: ArrowLeftRight, category: 'Settlement', keywords: ['fx', 'exchange', 'convert', 'currency'] },
  { id: 'treasury', label: 'Treasury', description: 'Wallet balances & yield', icon: TrendingUp, category: 'Settlement', keywords: ['wallet', 'balance', 'yield', 'liquidity'] },
  { id: 'settlement', label: 'Settlement', description: 'On-chain settlement tracking', icon: Globe, category: 'Settlement', keywords: ['chain', 'blockchain', 'settlement', 'atomic'] },
  { id: 'automation', label: 'Automation', description: 'Rules & scheduled tasks', icon: Zap, category: 'System', keywords: ['rule', 'workflow', 'schedule', 'auto'] },
  { id: 'integrations', label: 'Integrations', description: 'Xero, QuickBooks, APIs', icon: Plug, category: 'System', keywords: ['xero', 'quickbooks', 'api', 'connect'] },
  { id: 'fx-reporting', label: 'FX Reporting', description: 'Currency exposure reports', icon: TrendingDown, category: 'System', keywords: ['forex', 'currency', 'exposure', 'hedge'] },
  { id: 'export', label: 'Export', description: 'Reports & data export', icon: Download, category: 'System', keywords: ['report', 'csv', 'pdf', 'download'] },
  { id: 'settings', label: 'Settings', description: 'App & security settings', icon: Settings, category: 'System', keywords: ['config', 'preference', 'security', '2fa'] },
];

const staffModules = ['dashboard', 'my-pay', 'my-expenses', 'time-off'];
const clientAdminModules = [...staffModules, 'approvals', 'people', 'payroll', 'invoicing', 'deposits', 'contracts'];
const hrModules = [...staffModules, 'people', 'payroll', 'contracts'];
const financeModules = [...staffModules, 'payroll', 'invoicing', 'deposits', 'send', 'fx', 'treasury', 'audit'];

export default function CommandPalette({ open, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { persona, isOperator } = useOrgRole();
  const role = persona.role;

  const commands = useMemo(() => {
    if (isOperator) return allCommands; // Operator (any role) sees everything
    if (role === 'employee') return allCommands.filter((c) => staffModules.includes(c.id));
    if (role === 'hr') return allCommands.filter((c) => hrModules.includes(c.id));
    if (role === 'finance') return allCommands.filter((c) => financeModules.includes(c.id));
    if (role === 'admin') return allCommands.filter((c) => clientAdminModules.includes(c.id));
    return allCommands;
  }, [role, isOperator]);

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.includes(q))
    );
  }, [query, commands]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filtered.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filtered]);

  // Flat list for keyboard nav
  const flatList = useMemo(() => filtered, [filtered]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global CMD+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) {
          onClose();
        } else {
          // Parent controls opening via onNavigate won't work here; we need to signal open
          // This is handled by the parent's own listener
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && flatList[selectedIndex]) {
        e.preventDefault();
        onNavigate(flatList[selectedIndex].id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, selectedIndex, flatList, onNavigate, onClose]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0"
            style={{
              zIndex: 'var(--z-modal)' as unknown as number,
              background: 'rgba(15, 23, 41, 0.4)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-[560px]"
            style={{ zIndex: 'var(--z-modal)' as unknown as number }}
          >
            <div
              className="overflow-hidden"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-overlay)',
              }}
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
                <Search className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search modules, actions..."
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
                <kbd
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                  style={{
                    background: 'var(--bg-surface-raised)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)',
                  }}
                >
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
                {flatList.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No results for "{query}"</p>
                  </div>
                ) : (
                  Object.entries(grouped).map(([category, items]) => (
                    <div key={category}>
                      <p
                        className="px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {category}
                      </p>
                      {items.map((item) => {
                        const globalIdx = flatList.indexOf(item);
                        const Icon = item.icon;
                        const isSelected = globalIdx === selectedIndex;
                        return (
                          <button
                            key={item.id}
                            data-index={globalIdx}
                            onClick={() => onNavigate(item.id)}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className="w-full flex items-center gap-3 px-5 py-2.5 transition-colors"
                            style={{
                              background: isSelected ? 'var(--primary-soft)' : 'transparent',
                            }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                background: isSelected ? 'var(--bg-surface)' : 'var(--bg-surface-subtle)',
                                border: isSelected ? '1px solid rgba(125, 211, 252, 0.35)' : '1px solid transparent',
                              }}
                            >
                              <Icon
                                className="w-4 h-4"
                                style={{ color: isSelected ? 'var(--sky-700)' : 'var(--text-muted)' }}
                              />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p
                                className="text-sm font-medium"
                                style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                              >
                                {item.label}
                              </p>
                              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                                {item.description}
                              </p>
                            </div>
                            {isSelected && (
                              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>↵</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between px-5 py-2.5 text-[10px]"
                style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'var(--bg-surface-raised)' }}>↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'var(--bg-surface-raised)' }}>↵</kbd>
                    Open
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: 'var(--bg-surface-raised)' }}>esc</kbd>
                    Close
                  </span>
                </div>
                <span style={{ color: 'var(--sky-700)' }}>PayrollPlatform</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
