import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { card, fadeUp } from '../../../lib/viewConstants';

export interface QuickAction {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  /** Accent color, e.g. "var(--sky-500)" */
  color: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
  title?: string;
  onAction?: (id: string) => void;
}

/**
 * Action shortcut card. Each action is a button with icon chip, label,
 * description, and a chevron. Used for the operator's most-common
 * cross-client tasks (Run Payroll, Submit EPF, Filing Calendar) and
 * for client-mode-specific actions.
 */
export function QuickActions({
  actions,
  className = 'col-span-12 sm:col-span-6 lg:col-span-3 p-5 rounded-xl flex flex-col',
  title = 'Quick Actions',
  onAction,
}: QuickActionsProps) {
  return (
    <motion.div variants={fadeUp} className={className} style={card}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
      <div className="space-y-2.5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onAction?.(action.id)}
              className="w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all duration-200"
              style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-default)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = `${action.color}10`;
                (e.currentTarget as HTMLElement).style.borderColor = `${action.color}30`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface-subtle)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${action.color}15`, border: `1px solid ${action.color}25` }}
              >
                <Icon className="w-4 h-4" style={{ color: action.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{action.label}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{action.desc}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
