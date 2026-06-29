import { motion } from 'framer-motion';
import { Bell, BadgeCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fadeUp } from '../../../lib/viewConstants';
import { Surface, IconChip, Pill } from '../../ui';

export interface NeedsYouAction {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: 'primary' | 'secondary' | 'tertiary' | 'warn' | 'danger';
}

interface NeedsYouCardProps {
  actions: NeedsYouAction[];
  title?: string;
  onActionClick?: (id: string) => void;
}

/**
 * Personal action queue card — surface things the active user needs
 * to do (approve payroll, sign contract, top up deposit, etc.).
 * Used on every client dashboard.
 */
export function NeedsYouCard({
  actions,
  title = 'Needs you',
  onActionClick,
}: NeedsYouCardProps) {
  return (
    <motion.div variants={fadeUp} className="break-inside-avoid mb-4">
      <Surface padding="none" className="overflow-hidden">
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <IconChip icon={<Bell className="w-4 h-4" />} tone="tertiary" size="sm" />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          </div>
          <Pill tone="warn" size="sm">{actions.length}</Pill>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {actions.map((a) => {
            const Icon = a.icon;
            // Map 'warn' tone to primary for IconChip since it doesn't have warn
            const chipTone = a.tone === 'warn' || a.tone === 'danger' ? 'primary' : a.tone;
            return (
              <button
                key={a.id}
                onClick={() => onActionClick?.(a.id)}
                className="w-full px-5 py-3 flex items-center gap-3 text-left transition-colors hover:bg-slate-50/60"
              >
                <IconChip icon={<Icon className="w-4 h-4" />} tone={chipTone} size="sm" />
                <p className="flex-1 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{a.label}</p>
                <BadgeCheck className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              </button>
            );
          })}
        </div>
      </Surface>
    </motion.div>
  );
}
