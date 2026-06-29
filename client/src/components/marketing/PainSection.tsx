import { useState } from 'react';

interface PainSectionProps {
  scrollY: number;
}

export default function PainSection({ scrollY }: PainSectionProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const painPoints = [
    {
      title: 'Hiring across borders is a legal maze',
      description: 'Navigating work passes, employment contracts, and country-specific labour laws takes months — and one mistake means liability.',
      icon: '🗂️',
      stat: '3–6 months',
      statLabel: 'typical setup time',
    },
    {
      title: 'Payroll is error-prone and manual',
      description: 'Juggling EPF, SOCSO, CPF, PCB, and FX conversions in spreadsheets leads to costly errors and late filings.',
      icon: '📊',
      stat: '23%',
      statLabel: 'of payrolls have errors',
    },
    {
      title: 'Compliance changes constantly',
      description: 'Tax brackets, statutory rates, and labour laws update every year. Keeping up requires a dedicated compliance team.',
      icon: '⚖️',
      stat: '11+',
      statLabel: 'regulatory bodies to track',
    },
    {
      title: 'Your tools don\'t talk to each other',
      description: 'HR in one system, payroll in another, expenses in a third. No single source of truth means data gaps and reconciliation nightmares.',
      icon: '🔌',
      stat: '4–7',
      statLabel: 'tools the average team uses',
    },
  ];

  return (
    <section style={{
      width: '100%',
      padding: '6rem 1.5rem',
      backgroundColor: 'white',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle background accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, #E2E8F0, transparent)',
      }} />

      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ marginBottom: '4rem', maxWidth: '600px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '9999px',
            padding: '0.375rem 0.875rem',
            marginBottom: '1.25rem',
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#DC2626', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              The Problem
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
            Managing a global team<br />
            is <span style={{ color: '#EF4444', fontStyle: 'italic' }}>harder than it should be.</span>
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#64748B', lineHeight: 1.7 }}>
            Without the right infrastructure, expanding across Asia Pacific means drowning in compliance, paperwork, and disconnected tools.
          </p>
        </div>

        {/* Pain points grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {painPoints.map((point, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                backgroundColor: hoveredIndex === idx ? '#F8FAFC' : 'white',
                border: `1.5px solid ${hoveredIndex === idx ? '#CBD5E1' : '#E2E8F0'}`,
                padding: '1.75rem',
                borderRadius: '16px',
                transition: 'all 0.25s ease',
                cursor: 'default',
                transform: hoveredIndex === idx ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: hoveredIndex === idx ? '0 12px 32px rgba(26,36,56,0.08)' : '0 1px 4px rgba(26,36,56,0.04)',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{point.icon}</div>

              <h3 style={{
                fontSize: '1.05rem',
                fontWeight: '700',
                color: '#1A2438',
                marginBottom: '0.625rem',
                lineHeight: 1.3,
              }}>
                {point.title}
              </h3>

              <p style={{
                fontSize: '0.9rem',
                color: '#64748B',
                lineHeight: 1.65,
                marginBottom: '1.25rem',
              }}>
                {point.description}
              </p>

              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid #F1F5F9',
              }}>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#EF4444' }}>{point.stat}</span>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: '500' }}>{point.statLabel}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bridge to solution */}
        <div style={{
          marginTop: '3.5rem',
          padding: '2rem',
          backgroundColor: 'rgba(125,211,252,0.08)',
          borderRadius: '16px',
          border: '1px solid rgba(125,211,252,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}>
          <div>
            <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1A2438', marginBottom: '0.25rem' }}>
              There's a better way.
            </p>
            <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
              The platform handles all of this — so you can focus on building your team, not managing compliance.
            </p>
          </div>
          <a href="#features" style={{
            backgroundColor: '#7DD3FC',
            borderRadius: '10px',
            padding: '0.625rem 1.5rem',
            fontWeight: '700',
            fontSize: '0.9rem',
            color: '#1A2438',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
            display: 'inline-block',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#38BDF8';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#7DD3FC';
          }}
          >
            See how the platform solves this →
          </a>
        </div>
      </div>
    </section>
  );
}
