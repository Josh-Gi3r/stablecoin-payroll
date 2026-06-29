import { motion } from 'framer-motion';
import { card, fadeUp } from '../../../lib/viewConstants';
import PhysicsBubbleChart from '../../PhysicsBubbleChart';

export interface BubbleItem {
  /** Display label inside the bubble (employee name or currency code) */
  name?: string;
  code?: string;
  /** Numeric value (drives bubble area) */
  value: number;
  /** Pre-formatted display string */
  displayValue: string;
  /** Optional avatar/flag/logo */
  image?: string;
  logo?: string;
}

interface TopEarnersBubbleProps {
  items: BubbleItem[];
  /** Chart type — 'employee' uses initials, 'currency' uses logos */
  type?: 'employee' | 'currency';
  title?: string;
  className?: string;
}

/**
 * Bubble chart of top earners (or top holdings). Bubble area is proportional
 * to value, so cost concentration is immediately visible — the highest-paid
 * employee literally takes up the most visual real estate.
 *
 * This visualization is *intentional* for payroll cost analysis. It does NOT
 * belong on HR-only dashboards (no salary visibility) or Employee dashboards
 * (privacy + irrelevance).
 */
export function TopEarnersBubble({
  items,
  type = 'employee',
  title = 'Top 5 Employees by Salary',
  className = 'col-span-12 lg:col-span-4 p-5 rounded-xl',
}: TopEarnersBubbleProps) {
  // The PhysicsBubbleChart uses a ResizeObserver on its outer div and only
  // renders bubbles once it sees a non-zero height. Without an explicit height
  // here (motion.div is block-level by default) the inner `h-full` resolves
  // to 0 and the chart renders empty. Lock to a fixed 450px viewport height,
  // and use flex-column so the SVG fills the space below the title.
  return (
    <motion.div
      variants={fadeUp}
      className={className}
      style={{ ...card, height: 450, display: 'flex', flexDirection: 'column' }}
    >
      <PhysicsBubbleChart items={items as any} type={type} title={title} />
    </motion.div>
  );
}
