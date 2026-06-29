interface Props { scrollY: number; }

const stats = [
  { value: '2,400+', label: 'Employees Managed', sub: 'Across MY & SG', color: '#7DD3FC' },
  { value: '11', label: 'Countries', sub: 'APAC coverage', color: '#C8A0F0' },
  { value: '87', label: 'Unit Tests', sub: 'Statutory engines', color: '#6EE7B7' },
  { value: '2–5', label: 'Days to Hire', sub: 'Via EOR', color: '#FCD34D' },
];

export default function StatsSection({ scrollY }: Props) {
  return (
    <section style={{
      width: '100%',
      padding: '5rem 1.5rem',
      backgroundColor: '#F8FAFC',
    }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
            fontWeight: '800',
            color: '#1A2438',
            letterSpacing: '-0.5px',
          }}>
            By the numbers.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              backgroundColor: 'white',
              border: '1.5px solid #E2E8F0',
              padding: '2rem',
              borderRadius: '16px',
              textAlign: 'center' as const,
              boxShadow: '0 1px 4px rgba(26,36,56,0.04)',
            }}>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: '800',
                color: stat.color,
                marginBottom: '0.375rem',
                letterSpacing: '-1px',
              }}>
                {stat.value}
              </div>
              <p style={{ fontWeight: '700', color: '#1A2438', fontSize: '0.95rem', marginBottom: '0.25rem' }}>{stat.label}</p>
              <p style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
