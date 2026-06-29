import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { card, fadeUp } from '../../../lib/viewConstants';

export interface PendingApprovalItem {
  id: string | number;
  /** Category, e.g. "Payroll Run", "EPF Filing", "PCB/MTD" */
  type: string;
  /** Headline line, e.g. "February 2026 — Full Payroll" */
  title: string;
  /** Right-aligned amount string, e.g. "Stablecoin 3.1M" */
  amount: string;
  /** Relative timestamp, e.g. "2h ago" */
  time: string;
  /** Whether to flag this row with the alert icon + warn color */
  urgent: boolean;
}

interface PendingApprovalsCardProps {
  items: PendingApprovalItem[];
  className?: string;
  title?: string;
  onItemClick?: (id: string | number) => void;
}

export function PendingApprovalsCard({
  items,
  className = 'col-span-12 sm:col-span-6 lg:col-span-3 p-5 rounded-xl flex flex-col',
  title = 'Pending Approvals',
  onItemClick,
}: PendingApprovalsCardProps) {
  return (
    <motion.div variants={fadeUp} className={className} style={card}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--warn-soft)', color: '#B45309', border: '1px solid var(--warn)' }}
        >
          {items.length}
        </span>
      </div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item.id)}
            className="w-full text-left p-3 rounded-xl cursor-pointer transition-all duration-200"
            style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-default)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--primary-soft)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(125, 211, 252, 0.35)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface-subtle)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold inline-flex items-center" style={{ color: item.urgent ? 'var(--warn)' : 'var(--text-muted)' }}>
                {item.urgent && <AlertCircle className="w-3 h-3 mr-1" />}
                {item.type}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.time}</span>
            </div>
            <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
            <p className="text-[11px] font-semibold" style={{ color: 'var(--sky-700)' }}>{item.amount}</p>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
