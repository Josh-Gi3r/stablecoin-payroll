import { useState } from 'react';

interface Props { scrollY: number; }

const testimonials = [
  {
    quote: "We were spending 3 days every month on payroll. With this platform, it's done in 30 minutes. The EPF and PCB calculations are spot-on every time.",
    name: 'Nurul Ain Binti Hassan',
    role: 'HR Director',
    company: 'TechVentures MY',
    avatar: 'N',
    country: '🇲🇾',
  },
  {
    quote: "Setting up EOR in Singapore used to take us 2 months. The platform got us live in 4 days. The MOM compliance checks and CPF handling are seamless.",
    name: 'James Lim Wei Jie',
    role: 'Co-founder & CEO',
    company: 'Fintech Startup SG',
    avatar: 'J',
    country: '🇸🇬',
  },
  {
    quote: "The multi-country dashboard gives us a single view of our entire APAC team. Leave approvals, expense claims, payroll — all in one place.",
    name: 'Priya Chandrasekaran',
    role: 'People Operations Lead',
    company: 'Regional Scale-up',
    avatar: 'P',
    country: '🌏',
  },
];

export default function TestimonialsSection({ scrollY }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <section id="testimonials" style={{
      width: '100%',
      padding: '6rem 1.5rem',
      backgroundColor: '#F8FAFC',
    }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
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
              Customer Stories
            </span>
          </div>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            fontWeight: '800',
            color: '#1A2438',
            lineHeight: 1.15,
            letterSpacing: '-0.75px',
          }}>
            Trusted by teams across APAC.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {testimonials.map((t, i) => (
            <div key={i} style={{
              backgroundColor: 'white',
              border: `1.5px solid ${activeIdx === i ? '#7DD3FC' : '#E2E8F0'}`,
              borderRadius: '20px',
              padding: '2rem',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: activeIdx === i ? '0 8px 24px rgba(125,211,252,0.2)' : '0 1px 4px rgba(26,36,56,0.04)',
            }}
            onClick={() => setActiveIdx(i)}
            >
              {/* Stars */}
              <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem' }}>
                {[...Array(5)].map((_, j) => (
                  <span key={j} style={{ color: '#F59E0B', fontSize: '0.875rem' }}>★</span>
                ))}
              </div>

              <p style={{
                fontSize: '0.95rem',
                color: '#475569',
                lineHeight: 1.7,
                fontStyle: 'italic',
                marginBottom: '1.5rem',
              }}>
                "{t.quote}"
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#7DD3FC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: '800',
                  color: '#1A2438',
                  flexShrink: 0,
                }}>
                  {t.avatar}
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1A2438' }}>
                    {t.name} <span style={{ fontSize: '0.9rem' }}>{t.country}</span>
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{t.role} · {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
