import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { fadeUp } from '../../../lib/viewConstants';
import { Surface, IconChip, ProgressBar, Button } from '../../ui';

interface TrustDepositCardProps {
  /** Held amount, e.g. "RM 57,200" */
  held: string;
  /** Funding level percentage (0-100) */
  fundingLevel: number;
  /** Required deposit amount, e.g. "RM 58,500" */
  required: string;
  /** Shortfall amount (or "RM 0" if fully funded) */
  shortBy: string;
  /** Subtitle below the held amount */
  subtitle: string;
  /** Whether this card is the headline (uses accent surface tone) */
  feature?: boolean;
  /** Show "Top up deposit" button — typically only for Finance role */
  showTopUp?: boolean;
  onTopUp?: () => void;
}

/**
 * EOR-only widget. Shows the trust account balance the platform holds for the
 * client, the funding level vs required, and a top-up CTA for Finance.
 * Should NOT render when client.mode !== 'eor'.
 */
export function TrustDepositCard({
  held,
  fundingLevel,
  required,
  shortBy,
  subtitle,
  feature = false,
  showTopUp = false,
  onTopUp,
}: TrustDepositCardProps) {
  return (
    <motion.div variants={fadeUp} className="break-inside-avoid mb-4">
      <Surface padding="md" tone={feature ? 'accent' : 'default'}>
        <div className="flex items-center gap-3">
          <IconChip icon={<Wallet className="w-4 h-4" />} tone="primary" size="sm" />
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Trust deposit</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Held by EOR Provider · segregated account</p>
          </div>
        </div>
        <p
          className="text-3xl font-semibold mt-4 tracking-tight"
          style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
        >
          {held}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
        <ProgressBar className="mt-4" value={fundingLevel} tone="primary" label="Funding level" valueLabel={`${fundingLevel}%`} />
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Required</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{required}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Short by</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--warn)' }}>{shortBy}</p>
          </div>
        </div>
        {showTopUp && (
          <Button variant="primary" size="sm" fullWidth className="mt-4" onClick={onTopUp}>
            Top up deposit
          </Button>
        )}
      </Surface>
    </motion.div>
  );
}
