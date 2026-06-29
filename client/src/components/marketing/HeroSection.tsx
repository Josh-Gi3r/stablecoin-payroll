import { useLocation } from 'wouter';

interface HeroSectionProps {
  scrollY: number;
}

export default function HeroSection({ scrollY }: HeroSectionProps) {
  const [, setLocation] = useLocation();

  const parallaxOffset = scrollY * 0.3;

  return (
    <section style={{
      position: 'relative',
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
    }}>
      {/* Background gradient blobs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: '50%',
        height: '70%',
        background: 'radial-gradient(ellipse at center, rgba(125,211,252,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
        transform: `translateY(${parallaxOffset * 0.5}px)`,
      }} />
      <div style={{
        position: 'absolute',
        bottom: '0',
        left: '-5%',
        width: '40%',
        height: '50%',
        background: 'radial-gradient(ellipse at center, rgba(193,168,240,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Grid pattern overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle, #CBD5E1 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        opacity: 0.35,
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '0 1.5rem', width: '100%', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', minHeight: '80vh' }}>

          {/* Left: Copy */}
          <div>
            {/* Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(125,211,252,0.15)',
              border: '1px solid rgba(125,211,252,0.4)',
              borderRadius: '9999px',
              padding: '0.375rem 0.875rem',
              marginBottom: '1.75rem',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0EA5E9', display: 'inline-block' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#0284C7', letterSpacing: '0.02em' }}>
                Now live in Malaysia &amp; Singapore
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
              fontWeight: '800',
              color: '#1A2438',
              lineHeight: 1.1,
              letterSpacing: '-1.5px',
              marginBottom: '1.5rem',
            }}>
              Hire, pay &amp; manage<br />
              your team across<br />
              <span style={{
                color: '#0EA5E9',
                position: 'relative',
                display: 'inline-block',
              }}>
                Asia Pacific.
                <svg
                  style={{ position: 'absolute', bottom: '-4px', left: 0, width: '100%', height: '8px' }}
                  viewBox="0 0 200 8"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path d="M2 6 Q50 2 100 5 Q150 8 198 4" stroke="#7DD3FC" strokeWidth="3" strokeLinecap="round" fill="none"/>
                </svg>
              </span>
            </h1>

            {/* Subheadline */}
            <p style={{
              fontSize: '1.125rem',
              color: '#475569',
              lineHeight: 1.7,
              marginBottom: '2.5rem',
              maxWidth: '480px',
            }}>
              This platform is the unified HR &amp; payroll platform built for APAC. Run compliant payroll, manage leave, and hire via EOR — all in one place.
            </p>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
              <button
                onClick={() => setLocation('/app')}
                style={{
                  backgroundColor: '#7DD3FC',
                  border: '2px solid #7DD3FC',
                  borderRadius: '12px',
                  padding: '0.875rem 2rem',
                  fontWeight: '700',
                  fontSize: '1rem',
                  color: '#1A2438',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 16px rgba(125,211,252,0.4)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#38BDF8';
                  e.currentTarget.style.borderColor = '#38BDF8';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(125,211,252,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#7DD3FC';
                  e.currentTarget.style.borderColor = '#7DD3FC';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(125,211,252,0.4)';
                }}
              >
                Start for Free →
              </button>
              <button
                onClick={() => setLocation('/app')}
                style={{
                  backgroundColor: 'white',
                  border: '2px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '0.875rem 2rem',
                  fontWeight: '600',
                  fontSize: '1rem',
                  color: '#1A2438',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#7DD3FC';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                View Demo
              </button>
            </div>

            {/* Social proof */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex' }}>
                {['#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B'].map((color, i) => (
                  <div key={i} style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: '2px solid white',
                    marginLeft: i > 0 ? '-8px' : '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: '700',
                    color: 'white',
                  }}>
                    {['A', 'B', 'C', '+'][i]}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
                <strong style={{ color: '#1A2438' }}>100+ companies</strong> trust this platform for payroll
              </p>
            </div>
          </div>

          {/* Right: Dashboard Preview Card */}
          <div style={{
            position: 'relative',
            transform: `translateY(${-parallaxOffset * 0.1}px)`,
          }}>
            {/* Main card */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 20px 60px rgba(26,36,56,0.1)',
              overflow: 'hidden',
            }}>
              {/* Card header */}
              <div style={{
                backgroundColor: '#1A2438',
                padding: '1rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: '500' }}>Platform Dashboard</span>
                <div style={{ width: '60px' }} />
              </div>

              {/* Card body */}
              <div style={{ padding: '1.5rem' }}>
                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'Total Payroll', value: 'RM 248,500', change: '+3.2%', color: '#7DD3FC' },
                    { label: 'Employees', value: '142', change: '+5 new', color: '#C8A0F0' },
                    { label: 'Compliance', value: '100%', change: 'All filed', color: '#10B981' },
                  ].map((stat, i) => (
                    <div key={i} style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: '12px',
                      padding: '0.875rem',
                      border: '1px solid #F1F5F9',
                    }}>
                      <p style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{stat.label}</p>
                      <p style={{ fontSize: '1rem', fontWeight: '700', color: '#1A2438', marginBottom: '0.125rem' }}>{stat.value}</p>
                      <p style={{ fontSize: '0.7rem', color: stat.color, fontWeight: '600' }}>{stat.change}</p>
                    </div>
                  ))}
                </div>

                {/* Payroll run list */}
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Payroll Runs</p>
                  {[
                    { name: 'April 2026 — MY', status: 'Approved', amount: 'RM 124,200', statusColor: '#10B981' },
                    { name: 'April 2026 — SG', status: 'Processing', amount: 'SGD 68,400', statusColor: '#F59E0B' },
                    { name: 'March 2026 — MY', status: 'Completed', amount: 'RM 121,800', statusColor: '#94A3B8' },
                  ].map((run, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.625rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: i === 0 ? 'rgba(125,211,252,0.08)' : 'transparent',
                      marginBottom: '0.25rem',
                    }}>
                      <div>
                        <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#1A2438' }}>{run.name}</p>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: '600',
                          color: run.statusColor,
                          backgroundColor: `${run.statusColor}15`,
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                        }}>{run.status}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1A2438' }}>{run.amount}</p>
                    </div>
                  ))}
                </div>

                {/* Countries bar */}
                <div style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  border: '1px solid #F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '500' }}>Active countries</span>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    {['🇲🇾', '🇸🇬', '🇮🇩', '🇵🇭', '🇹🇭'].map((flag, i) => (
                      <span key={i} style={{ fontSize: '1.1rem' }}>{flag}</span>
                    ))}
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: '600', alignSelf: 'center' }}>+6</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge: Statutory compliant */}
            <div style={{
              position: 'absolute',
              top: '-1rem',
              right: '-1.5rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '0.625rem 1rem',
              boxShadow: '0 8px 24px rgba(26,36,56,0.12)',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{ fontSize: '1.1rem' }}>✅</span>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: '700', color: '#1A2438' }}>Statutory Compliant</p>
                <p style={{ fontSize: '0.6rem', color: '#94A3B8' }}>EPF · SOCSO · CPF · SDL</p>
              </div>
            </div>

            {/* Floating badge: Time saved */}
            <div style={{
              position: 'absolute',
              bottom: '1.5rem',
              left: '-1.5rem',
              backgroundColor: '#1A2438',
              borderRadius: '12px',
              padding: '0.625rem 1rem',
              boxShadow: '0 8px 24px rgba(26,36,56,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{ fontSize: '1.1rem' }}>⚡</span>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: '700', color: 'white' }}>2–5 Days to Hire</p>
                <p style={{ fontSize: '0.6rem', color: '#94A3B8' }}>EOR onboarding</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
