import { useState } from 'react';
import { useLocation } from 'wouter';

interface Props { scrollY: number; }

const plans = [
  {
    name: 'Payroll',
    tagline: 'Software only',
    price: 'From RM 99',
    period: '/month',
    description: 'Automated payroll software. You remain the legal employer.',
    features: [
      'MY & SG statutory calculations',
      'Payslip generation & distribution',
      'LHDN, KWSP, PERKESO exports',
      'IRAS AIS filing exports',
      'Audit trail & reporting',
      'Up to 50 employees',
    ],
    cta: 'Start with Payroll',
    highlight: false,
    badge: null,
  },
  {
    name: 'Payroll + HR',
    tagline: 'Full software suite',
    price: 'From RM 199',
    period: '/month',
    description: 'Complete HR & payroll platform. Everything in Payroll, plus HR tools.',
    features: [
      'Everything in Payroll',
      'Leave management (MY & SG EA)',
      'Expense claims & approvals',
      'Employment contracts + e-sign',
      'Employee self-service portal',
      'Unlimited employees',
    ],
    cta: 'Start with HR + Payroll',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'EOR',
    tagline: 'Employer of Record',
    price: 'Custom',
    period: '',
    description: 'The platform operator becomes the legal employer. Full compliance, zero entity setup.',
    features: [
      'Everything in Payroll + HR',
      'Platform operator as legal employer',
      'Work pass management',
      'Trust deposit & settlement',
      'KYC & liveness verification',
      'Dedicated account manager',
    ],
    cta: 'Talk to Sales',
    highlight: false,
    badge: null,
  },
];

export default function PricingSection({ scrollY }: Props) {
  const [, setLocation] = useLocation();
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);

  return (
    <section id="pricing" style={{
      width: '100%',
      padding: '6rem 1.5rem',
      backgroundColor: 'white',
    }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'rgba(125,211,252,0.15)',
            border: '1px solid rgba(125,211,252,0.4)',
            borderRadius: '9999px',
            padding: '0.375rem 0.875rem',
            marginBottom: '1.25rem',
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0284C7', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
              Pricing
            </span>
          </div>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            fontWeight: '800',
            color: '#1A2438',
            lineHeight: 1.15,
            letterSpacing: '-0.75px',
            marginBottom: '1rem',
          }}>
            Simple, transparent pricing.
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#64748B', lineHeight: 1.7, maxWidth: '520px', margin: '0 auto' }}>
            Pick the mode that fits your team. No hidden fees, no long-term lock-in.
          </p>
        </div>

        {/* Pricing cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {plans.map((plan, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredPlan(i)}
              onMouseLeave={() => setHoveredPlan(null)}
              style={{
                backgroundColor: plan.highlight ? '#1A2438' : 'white',
                border: `1.5px solid ${plan.highlight ? '#1A2438' : hoveredPlan === i ? '#CBD5E1' : '#E2E8F0'}`,
                borderRadius: '20px',
                padding: '2rem',
                transition: 'all 0.25s ease',
                transform: plan.highlight ? 'scale(1.02)' : hoveredPlan === i ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: plan.highlight
                  ? '0 20px 48px rgba(26,36,56,0.2)'
                  : hoveredPlan === i
                  ? '0 12px 32px rgba(26,36,56,0.08)'
                  : '0 1px 4px rgba(26,36,56,0.04)',
                position: 'relative' as const,
              }}
            >
              {plan.badge && (
                <div style={{
                  position: 'absolute' as const,
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#7DD3FC',
                  color: '#1A2438',
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  padding: '0.25rem 0.875rem',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap' as const,
                }}>
                  {plan.badge}
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: plan.highlight ? '#7DD3FC' : '#0284C7', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                  {plan.tagline}
                </p>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: plan.highlight ? 'white' : '#1A2438', marginBottom: '0.5rem' }}>
                  {plan.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: plan.highlight ? '#94A3B8' : '#64748B', lineHeight: 1.5 }}>
                  {plan.description}
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: plan.highlight ? 'white' : '#1A2438' }}>
                  {plan.price}
                </span>
                {plan.period && (
                  <span style={{ fontSize: '0.875rem', color: plan.highlight ? '#94A3B8' : '#64748B', marginLeft: '0.25rem' }}>
                    {plan.period}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: '2rem' }}>
                {plan.features.map((feature, j) => (
                  <div key={j} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    padding: '0.5rem 0',
                    borderBottom: j < plan.features.length - 1 ? `1px solid ${plan.highlight ? 'rgba(255,255,255,0.07)' : '#F1F5F9'}` : 'none',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#7DD3FC', fontWeight: '700', flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: '0.85rem', color: plan.highlight ? '#CBD5E1' : '#475569' }}>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setLocation('/app')}
                style={{
                  width: '100%',
                  backgroundColor: plan.highlight ? '#7DD3FC' : 'transparent',
                  border: `2px solid ${plan.highlight ? '#7DD3FC' : '#E2E8F0'}`,
                  borderRadius: '12px',
                  padding: '0.875rem',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  color: plan.highlight ? '#1A2438' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (plan.highlight) {
                    e.currentTarget.style.backgroundColor = '#38BDF8';
                    e.currentTarget.style.borderColor = '#38BDF8';
                  } else {
                    e.currentTarget.style.borderColor = '#7DD3FC';
                    e.currentTarget.style.color = '#1A2438';
                  }
                }}
                onMouseLeave={(e) => {
                  if (plan.highlight) {
                    e.currentTarget.style.backgroundColor = '#7DD3FC';
                    e.currentTarget.style.borderColor = '#7DD3FC';
                  } else {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.color = '#475569';
                  }
                }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Enterprise note */}
        <p style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.875rem', color: '#94A3B8' }}>
          All plans include a 14-day free trial. No credit card required.{' '}
          <a href="#faq" style={{ color: '#0284C7', textDecoration: 'none', fontWeight: '600' }}>See FAQ →</a>
        </p>
      </div>
    </section>
  );
}
