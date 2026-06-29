import { useState } from 'react';

interface Props { scrollY: number; }

const faqs = [
  {
    q: 'How long does onboarding take?',
    a: 'For Payroll and HR modes, most teams are live within 2–3 business days. EOR onboarding (including KYC and work pass setup) typically takes 4–7 business days.',
  },
  {
    q: 'Which countries are currently supported?',
    a: 'Malaysia and Singapore are fully live with complete statutory compliance. Indonesia, Philippines, Thailand, Vietnam, India, Bangladesh, Pakistan, Sri Lanka, and Myanmar are in the roadmap for 2026.',
  },
  {
    q: 'How does EOR work? Who is the legal employer?',
    a: 'In EOR mode, the platform operator (via a local subsidiary) becomes the legal employer of your team members. You retain full operational control — the platform handles employment contracts, statutory filings, and compliance.',
  },
  {
    q: 'What statutory calculations does the platform handle?',
    a: 'For Malaysia: EPF (employee 11%, employer 13%), SOCSO (Cat 1 & 2), EIS, HRD Corp, and PCB MTD with 2025 tax brackets. For Singapore: CPF (5 age bands, 2026 rates), SDL, FWL, and IRAS AIS.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. The platform has no long-term contracts. You can cancel your subscription at any time. Your data remains accessible for 90 days after cancellation.',
  },
  {
    q: 'Is there a setup fee?',
    a: 'No setup fees. All plans include a 14-day free trial. Pricing is based on your chosen mode and employee count.',
  },
  {
    q: 'How does the filing export work?',
    a: 'The platform generates ready-to-submit files: LHDN e-PCB (CP39), KWSP i-Akaun e-Caruman, PERKESO ASSIST CSV, HRD Corp e-TRiS CSV, and IRAS AIS CSV/XML. Download from the Filing Calendar view.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. All data is encrypted at rest and in transit. KYC documents and payslips are stored in AWS S3 with strict access controls. The platform maintains a full audit trail of all actions.',
  },
];

export default function FAQSection({ scrollY }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" style={{
      width: '100%',
      padding: '6rem 1.5rem',
      backgroundColor: 'white',
    }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '5rem', alignItems: 'start' }}>
          {/* Left */}
          <div style={{ position: 'sticky' as const, top: '6rem' }}>
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
                FAQ
              </span>
            </div>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
              fontWeight: '800',
              color: '#1A2438',
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
              marginBottom: '1rem',
            }}>
              Frequently asked questions.
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.7 }}>
              Can't find your answer?{' '}
              <a href="mailto:hello@example.com" style={{ color: '#0284C7', textDecoration: 'none', fontWeight: '600' }}>
                Contact us →
              </a>
            </p>
          </div>

          {/* Right: Accordion */}
          <div>
            {faqs.map((faq, i) => (
              <div
                key={i}
                style={{
                  borderBottom: '1px solid #F1F5F9',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.25rem 0',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left' as const,
                    gap: '1rem',
                  }}
                >
                  <span style={{
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    color: openIdx === i ? '#0EA5E9' : '#1A2438',
                    lineHeight: 1.4,
                    transition: 'color 0.2s ease',
                  }}>
                    {faq.q}
                  </span>
                  <span style={{
                    fontSize: '1.25rem',
                    color: openIdx === i ? '#7DD3FC' : '#CBD5E1',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                    transform: openIdx === i ? 'rotate(45deg)' : 'rotate(0)',
                    display: 'inline-block',
                  }}>
                    +
                  </span>
                </button>
                {openIdx === i && (
                  <div style={{
                    paddingBottom: '1.25rem',
                    fontSize: '0.9rem',
                    color: '#64748B',
                    lineHeight: 1.7,
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
