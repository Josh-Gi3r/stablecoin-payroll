interface Props { scrollY: number; }

const integrations = [
  { name: 'Xero', icon: '🔵', category: 'Accounting' },
  { name: 'QuickBooks', icon: '🟢', category: 'Accounting' },
  { name: 'Slack', icon: '💬', category: 'Communication' },
  { name: 'Google Workspace', icon: '📧', category: 'Productivity' },
  { name: 'Microsoft 365', icon: '🪟', category: 'Productivity' },
  { name: 'Stripe', icon: '💳', category: 'Payments' },
  { name: 'Zapier', icon: '⚡', category: 'Automation' },
  { name: 'REST API', icon: '🔌', category: 'Developer' },
];

export default function IntegrationsSection({ scrollY }: Props) {
  return (
    <section style={{
      width: '100%',
      padding: '6rem 1.5rem',
      backgroundColor: 'white',
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
              Integrations
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
            Connects with your<br />existing tools.
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#64748B', lineHeight: 1.7, maxWidth: '480px', margin: '0 auto' }}>
            The platform integrates with the tools your team already uses — accounting, communication, and more.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
          {integrations.map((item, i) => (
            <div key={i} style={{
              backgroundColor: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: '14px',
              padding: '1.5rem 1rem',
              textAlign: 'center' as const,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#7DD3FC';
              (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(125,211,252,0.06)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#E2E8F0';
              (e.currentTarget as HTMLDivElement).style.backgroundColor = '#F8FAFC';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            }}
            >
              <span style={{ fontSize: '1.75rem', display: 'block', marginBottom: '0.625rem' }}>{item.icon}</span>
              <p style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1A2438', marginBottom: '0.25rem' }}>{item.name}</p>
              <p style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{item.category}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
