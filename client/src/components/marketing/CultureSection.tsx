interface Props { scrollY: number; }

export default function CultureSection({ scrollY }: Props) {
  return (
    <section style={{
      width: '100%',
      padding: '5rem 1.5rem',
      backgroundColor: 'white',
    }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
        <div style={{
          backgroundColor: 'rgba(125,211,252,0.08)',
          borderRadius: '24px',
          border: '1px solid rgba(125,211,252,0.25)',
          padding: '3rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3rem',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0284C7', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '1rem' }}>
              Built for APAC
            </p>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
              fontWeight: '800',
              color: '#1A2438',
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
              marginBottom: '1rem',
            }}>
              Your team. All eleven<br />time zones.
            </h2>
            <p style={{ fontSize: '1rem', color: '#64748B', lineHeight: 1.7 }}>
              This platform is built from the ground up for Asia Pacific — not adapted from a Western payroll tool. Local expertise, local compliance, local support.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { icon: '🌏', title: 'APAC-first', desc: 'Built for the region, not retrofitted' },
              { icon: '⚡', title: 'Fast Setup', desc: 'Live in days, not months' },
              { icon: '🔒', title: 'Data Security', desc: 'SOC 2 compliant infrastructure' },
              { icon: '🤝', title: 'Local Support', desc: 'Teams in KL and Singapore' },
            ].map((item, i) => (
              <div key={i} style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid #E2E8F0',
              }}>
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>{item.icon}</span>
                <p style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1A2438', marginBottom: '0.25rem' }}>{item.title}</p>
                <p style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.4 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
