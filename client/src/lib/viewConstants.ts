/**
 * Shared view constants — used across all dashboard view components.
 * Tokens are wired to the PayrollPlatform theme defined in client/src/index.css;
 * prefer CSS classes (`surface`, `field`, `pill`, etc.) for new code.
 *
 * Brand palette (PayrollPlatform / scrapbook brutalism — platform side):
 * - Primary: #B794F4 (lavender) — primary CTA fill
 * - Secondary: #7BB8E8 (sky)    — secondary accent
 * - Neutral:  #F6F2EA (cream)   — page background
 * - Paper:    #FFFFFF (paper)   — card fill
 * - Ink:      #0A0A0A (ink)     — type, borders, outlines
 * - Status:   ok #2FBF71 / warn #F59E0B / error #EF4444 / info #3B82F6
 */

export const card = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius)',
  boxShadow: 'var(--shadow-card)',
};

export const cardLarge = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)',
  padding: '1.5rem',
};

export const cardSmall = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius)',
  boxShadow: 'var(--shadow-card)',
  padding: '1rem',
};

export const subtleCard = {
  background: 'var(--bg-surface-subtle)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius)',
};

export const raisedCard = {
  background: 'var(--bg-surface-raised)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius)',
};

/* Brand color tokens (PayrollPlatform) */
export const colors = {
  primary: '#B794F4',      /* Lavender — primary CTA */
  secondary: '#7BB8E8',    /* Sky      — secondary accent */
  tertiary: '#B794F4',     /* Lavender — alias */
  success: '#2FBF71',      /* OK */
  warning: '#F59E0B',      /* Warn */
  danger: '#EF4444',       /* Error */
  info: '#3B82F6',         /* Info */
  textPrimary: '#0A0A0A',  /* Ink */
  textSecondary: '#2A2A2A',
  textMuted: '#6B6B6B',
};

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 28 },
  },
};

export const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};
