import { useState } from 'react';

interface FeaturesSectionProps {
  scrollY: number;
}

const features = [
  {
    icon: '🏢',
    title: 'Employer of Record (EOR)',
    description: 'Hire in Malaysia, Singapore, and 9 other APAC countries without setting up a local entity. The platform operator becomes the legal employer — you retain full operational control.',
    tags: ['Work Pass Management', 'Employment Contracts', 'Legal Compliance'],
    color: '#7DD3FC',
  },
  {
    icon: '💰',
    title: 'Payroll Processing',
    description: 'Automated gross-to-net payroll with built-in statutory engines for MY (EPF, SOCSO, EIS, PCB) and SG (CPF, SDL). Payslips generated and distributed automatically.',
    tags: ['Multi-currency', 'Statutory Filings', 'Payslip Generation'],
    color: '#C8A0F0',
  },
  {
    icon: '🌿',
    title: 'Leave Management',
    description: 'Country-specific leave entitlements per Malaysia EA 1955 and Singapore EA. Annual, sick, maternity, paternity, and childcare leave — all tracked and payroll-integrated.',
    tags: ['Annual Leave', 'Sick Leave', 'Statutory Leave'],
    color: '#6EE7B7',
  },
  {
    icon: '🧾',
    title: 'Expenses & Claims',
    description: 'Employees submit claims with receipt uploads. Managers approve in-app. Reimbursements are processed with the next payroll run — zero manual reconciliation.',
    tags: ['Receipt Upload', 'Approval Workflow', 'Auto Reimbursement'],
    color: '#FCD34D',
  },
  {
    icon: '📄',
    title: 'Contracts & Documents',
    description: 'Generate compliant employment contracts with e-signature. Singapore Tripartite KETs templates included. All documents stored securely and accessible anytime.',
    tags: ['E-Signature', 'KETs Templates', 'Secure Storage'],
    color: '#F9A8D4',
  },
  {
    icon: '📊',
    title: 'Compliance & Reporting',
    description: 'Automated LHDN PCB, KWSP e-Caruman, PERKESO ASSIST, and IRAS AIS exports. Filing calendar with due-date reminders. Full audit trail on every action.',
    tags: ['LHDN Filing', 'IRAS AIS', 'Audit Trail'],
    color: '#7DD3FC',
  },
];

export default function FeaturesSection({ scrollY }: FeaturesSectionProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="features" style={{
      width: '100%',
      padding: '6rem 1.5rem',
      backgroundColor: '#F8FAFC',
      position: 'relative',
    }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            backgroundColor: 'rgba(125,211,252,0.15)',
            border: '1px solid rgba(125,211,252,0.4)',
            borderRadius: '9999px',
            padding: '0.375rem 0.875rem',
            marginBottom: '1.25rem',
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0284C7', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
              Platform Features
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
            Everything you need to run<br />
            <span style={{ color: '#0EA5E9' }}>HR &amp; payroll across APAC.</span>
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#64748B', lineHeight: 1.7, maxWidth: '560px', margin: '0 auto' }}>
            One platform. Four modes. From payroll-only software to full Employer of Record — pick the level that fits your team.
          </p>
        </div>

        {/* Features grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {features.map((feature, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                backgroundColor: 'white',
                border: `1.5px solid ${hoveredIndex === idx ? '#CBD5E1' : '#E2E8F0'}`,
                padding: '2rem',
                borderRadius: '16px',
                transition: 'all 0.25s ease',
                cursor: 'default',
                transform: hoveredIndex === idx ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: hoveredIndex === idx ? '0 12px 32px rgba(26,36,56,0.08)' : '0 1px 4px rgba(26,36,56,0.04)',
                position: 'relative' as const,
                overflow: 'hidden',
              }}
            >
              {/* Accent line */}
              <div style={{
                position: 'absolute' as const,
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                backgroundColor: feature.color,
                opacity: hoveredIndex === idx ? 1 : 0,
                transition: 'opacity 0.25s ease',
              }} />

              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: `${feature.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                marginBottom: '1.25rem',
              }}>
                {feature.icon}
              </div>

              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#1A2438',
                marginBottom: '0.625rem',
                lineHeight: 1.3,
              }}>
                {feature.title}
              </h3>

              <p style={{
                fontSize: '0.9rem',
                color: '#64748B',
                lineHeight: 1.65,
                marginBottom: '1.25rem',
              }}>
                {feature.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '0.375rem' }}>
                {feature.tags.map((tag, i) => (
                  <span key={i} style={{
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    color: '#475569',
                    backgroundColor: '#F1F5F9',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '9999px',
                    border: '1px solid #E2E8F0',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Mode comparison callout */}
        <div style={{
          marginTop: '3.5rem',
          backgroundColor: '#1A2438',
          borderRadius: '20px',
          padding: '2.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.5rem',
        }}>
          <div style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: '700', color: '#7DD3FC', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Choose Your Mode</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'white' }}>One platform, four ways to use it.</h3>
          </div>
          {[
            { mode: 'Payroll', desc: 'Payroll software only. You remain the employer.', icon: '💼' },
            { mode: 'HR', desc: 'HR tools — leave, expenses, contracts. No payroll.', icon: '👥' },
            { mode: 'Payroll + HR', desc: 'Full software suite. You retain employment.', icon: '⚡' },
            { mode: 'EOR', desc: 'The platform operator becomes the legal employer. Full compliance covered.', icon: '🌏' },
          ].map((item, i) => (
            <div key={i} style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>{item.icon}</span>
              <p style={{ fontSize: '0.9rem', fontWeight: '700', color: '#7DD3FC', marginBottom: '0.25rem' }}>{item.mode}</p>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
