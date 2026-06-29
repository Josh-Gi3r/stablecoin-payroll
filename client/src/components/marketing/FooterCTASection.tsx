import { useLocation } from 'wouter';

interface Props { scrollY: number; }

export default function FooterCTASection({ scrollY }: Props) {
  const [, setLocation] = useLocation();

  return (
    <footer style={{ width: '100%', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
      {/* CTA Section */}
      <section style={{
        padding: '6rem 1.5rem',
        background: 'linear-gradient(135deg, #1A2438 0%, #0F172A 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '300px',
          background: 'radial-gradient(ellipse at center, rgba(125,211,252,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '56rem', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: '800',
            color: 'white',
            lineHeight: 1.1,
            letterSpacing: '-1px',
            marginBottom: '1.25rem',
          }}>
            Start hiring across<br />
            <span style={{ color: '#7DD3FC' }}>Asia Pacific today.</span>
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: '#94A3B8',
            lineHeight: 1.7,
            marginBottom: '2.5rem',
            maxWidth: '480px',
            margin: '0 auto 2.5rem',
          }}>
            Join 100+ companies managing their global teams with this platform. 14-day free trial. No credit card required.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <button
              onClick={() => setLocation('/app')}
              style={{
                backgroundColor: '#7DD3FC',
                border: '2px solid #7DD3FC',
                borderRadius: '12px',
                padding: '0.875rem 2.5rem',
                fontWeight: '700',
                fontSize: '1rem',
                color: '#1A2438',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 16px rgba(125,211,252,0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#38BDF8';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#7DD3FC';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Get Started Free →
            </button>
            <button
              onClick={() => setLocation('/app')}
              style={{
                backgroundColor: 'transparent',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '0.875rem 2.5rem',
                fontWeight: '600',
                fontSize: '1rem',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              View Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer links */}
      <div style={{ padding: '3rem 1.5rem', maxWidth: '72rem', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #7DD3FC 0%, #0EA5E9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{ color: 'white', fontWeight: '800', fontSize: '0.8rem' }}>S</span>
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1A2438' }}>PayrollPlatform</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748B', lineHeight: 1.6, maxWidth: '280px' }}>
              Unified HR &amp; payroll platform for Asia Pacific. Hire, pay, and manage your team — compliantly.
            </p>
          </div>

          {/* Product */}
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1A2438', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '1rem' }}>Product</p>
            {['Features', 'Pricing', 'How It Works', 'Integrations', 'Demo'].map(link => (
              <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`} style={{ display: 'block', fontSize: '0.875rem', color: '#64748B', textDecoration: 'none', marginBottom: '0.5rem', transition: 'color 0.2s ease' }}
              onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.color = '#1A2438'}
              onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.color = '#64748B'}
              >{link}</a>
            ))}
          </div>

          {/* Compliance */}
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1A2438', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '1rem' }}>Compliance</p>
            {['Malaysia Payroll', 'Singapore Payroll', 'EOR Services', 'LHDN Filing', 'IRAS AIS'].map(link => (
              <a key={link} href="#features" style={{ display: 'block', fontSize: '0.875rem', color: '#64748B', textDecoration: 'none', marginBottom: '0.5rem', transition: 'color 0.2s ease' }}
              onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.color = '#1A2438'}
              onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.color = '#64748B'}
              >{link}</a>
            ))}
          </div>

          {/* Company */}
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1A2438', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '1rem' }}>Company</p>
            {['About', 'Blog', 'Careers', 'Contact', 'Privacy Policy'].map(link => (
              <a key={link} href="#" style={{ display: 'block', fontSize: '0.875rem', color: '#64748B', textDecoration: 'none', marginBottom: '0.5rem', transition: 'color 0.2s ease' }}
              onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.color = '#1A2438'}
              onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.color = '#64748B'}
              >{link}</a>
            ))}
          </div>
        </div>

        <div style={{
          borderTop: '1px solid #E2E8F0',
          paddingTop: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap' as const,
          gap: '1rem',
        }}>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
            © 2026 Payroll Platform Technologies. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {['Malaysia', 'Singapore'].map(c => (
              <span key={c} style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{c}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
