import { useLocation } from 'wouter';

interface Props { scrollY: number; }

export default function PlatformPreviewSection({ scrollY }: Props) {
  const [, setLocation] = useLocation();

  return (
    <section style={{
      width: '100%',
      padding: '6rem 1.5rem',
      backgroundColor: '#1A2438',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '800px',
        height: '400px',
        background: 'radial-gradient(ellipse at center, rgba(125,211,252,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '72rem', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'rgba(125,211,252,0.15)',
            border: '1px solid rgba(125,211,252,0.3)',
            borderRadius: '9999px',
            padding: '0.375rem 0.875rem',
            marginBottom: '1.25rem',
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#7DD3FC', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
              The Platform
            </span>
          </div>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            fontWeight: '800',
            color: 'white',
            lineHeight: 1.15,
            letterSpacing: '-0.75px',
            marginBottom: '1rem',
          }}>
            One dashboard for your<br />entire APAC team.
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#94A3B8', lineHeight: 1.7, maxWidth: '520px', margin: '0 auto' }}>
            11 personas, 4 modes, 7 feature phases — all live and working. Try the demo to see the full platform.
          </p>
        </div>

        {/* Feature highlights grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
          {[
            { icon: '📊', title: 'Operator Dashboard', desc: 'Cross-client payroll trends & platform health' },
            { icon: '💼', title: 'Client Dashboard', desc: 'Bento layout with KPIs, payroll runs & activity' },
            { icon: '👤', title: 'Employee Portal', desc: 'Payslips, leave requests & expense claims' },
            { icon: '🔐', title: 'KYC Review Queue', desc: 'Approve/reject with reviewer notes' },
            { icon: '📋', title: 'Audit Log', desc: 'Every action logged with timestamp & actor' },
            { icon: '🤖', title: 'Automation', desc: 'Payroll approval hooks & deposit auto-draw' },
          ].map((item, i) => (
            <div key={i} style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: '14px',
              padding: '1.25rem',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>{item.icon}</span>
              <p style={{ fontSize: '0.875rem', fontWeight: '700', color: 'white', marginBottom: '0.25rem' }}>{item.title}</p>
              <p style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.4 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
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
            Explore the Live Demo →
          </button>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.875rem' }}>
            11 demo personas available. Set SEED_PASSWORD in .env; the seeded password is printed to console at seed time.
          </p>
        </div>
      </div>
    </section>
  );
}
