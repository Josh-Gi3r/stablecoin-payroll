import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { card, fadeUp } from '../../../lib/viewConstants';

export interface RecentActivityItem {
  icon: LucideIcon;
  /** Accent color, e.g. "var(--sky-500)" */
  color: string;
  /** Headline, e.g. "January payroll completed" */
  text: string;
  /** Detail line, e.g. "Stablecoin 3.05M disbursed to 228 employees" */
  detail: string;
  /** Relative timestamp, e.g. "2 days ago" */
  time: string;
}

interface RecentActivityProps {
  items: RecentActivityItem[];
  className?: string;
  title?: string;
}

/**
 * Activity feed of recent platform events. Each item has an icon chip
 * tinted with the event's accent color, headline, detail, and timestamp.
 * Used on every dashboard but scoped differently:
 *   - Client: own tenant only
 *   - Operator: cross-tenant feed
 *   - Employee: own actions only
 */
export function RecentActivity({
  items,
  className = 'col-span-12 lg:col-span-4 p-5 rounded-xl',
  title = 'Recent Activity',
}: RecentActivityProps) {
  return (
    <motion.div variants={fadeUp} className={className} style={card}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
      <div className="space-y-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex gap-3">
              <div className="shrink-0 mt-0.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${item.color}12`, border: `1px solid ${item.color}25` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{item.text}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>{item.detail}</p>
              </div>
              <span className="text-[10px] shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>{item.time}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
