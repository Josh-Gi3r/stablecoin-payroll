interface Props { scrollY: number; }

const countries = [
  { flag: '🇸🇬', name: 'Singapore', status: 'Live', detail: 'CPF · SDL · IRAS AIS' },
  { flag: '🇲🇾', name: 'Malaysia', status: 'Live', detail: 'EPF · SOCSO · EIS · PCB' },
  { flag: '🇮🇩', name: 'Indonesia', status: 'Coming Soon', detail: 'BPJS · PPh 21' },
  { flag: '🇵🇭', name: 'Philippines', status: 'Coming Soon', detail: 'SSS · PhilHealth · Pag-IBIG' },
  { flag: '🇹🇭', name: 'Thailand', status: 'Coming Soon', detail: 'SSF · PIT' },
  { flag: '🇻🇳', name: 'Vietnam', status: 'Coming Soon', detail: 'SHUI · PIT' },
  { flag: '🇮🇳', name: 'India', status: 'Coming Soon', detail: 'PF · ESI · TDS' },
  { flag: '🇧🇩', name: 'Bangladesh', status: 'Coming Soon', detail: 'Provident Fund' },
  { flag: '🇵🇰', name: 'Pakistan', status: 'Coming Soon', detail: 'EOBI · PESSI' },
  { flag: '🇱🇰', name: 'Sri Lanka', status: 'Coming Soon', detail: 'EPF · ETF' },
  { flag: '🇲🇲', name: 'Myanmar', status: 'Coming Soon', detail: 'SSB' },
];

export default function CountriesSection({ scrollY }: Props) {
  return (
    <section style={{
      width: '100%',
      padding: '6rem 1.5rem',
      backgroundColor: 'white',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background accent */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(ellipse at center, rgba(125,211,252,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '72rem', margin: '0 auto', position: 'relative', zIndex: 1 }}>
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
              Global Coverage
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
            Hire across <span style={{ color: '#0EA5E9' }}>11 countries</span><br />
            in Asia Pacific.
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#64748B', lineHeight: 1.7, maxWidth: '520px', margin: '0 auto' }}>
            Malaysia and Singapore are live with full statutory compliance. More countries rolling out through 2026.
          </p>
        </div>

        {/* Countries grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          {countries.map((country, i) => (
            <div key={i} style={{
              backgroundColor: country.status === 'Live' ? 'rgba(125,211,252,0.08)' : '#F8FAFC',
              border: `1.5px solid ${country.status === 'Live' ? 'rgba(125,211,252,0.35)' : '#E2E8F0'}`,
              borderRadius: '14px',
              padding: '1.25rem',
              transition: 'all 0.2s ease',
              position: 'relative' as const,
            }}>
              {country.status === 'Live' && (
                <div style={{
                  position: 'absolute' as const,
                  top: '0.75rem',
                  right: '0.75rem',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 0 3px rgba(16,185,129,0.2)',
                }} />
              )}
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>{country.flag}</span>
              <p style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1A2438', marginBottom: '0.125rem' }}>{country.name}</p>
              <p style={{ fontSize: '0.7rem', color: country.status === 'Live' ? '#0284C7' : '#94A3B8', fontWeight: '600', marginBottom: '0.375rem' }}>
                {country.status}
              </p>
              <p style={{ fontSize: '0.7rem', color: '#94A3B8', lineHeight: 1.4 }}>{country.detail}</p>
            </div>
          ))}
        </div>

        {/* Compliance note */}
        <div style={{
          marginTop: '3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2rem',
          flexWrap: 'wrap' as const,
        }}>
          {[
            { icon: '✅', text: 'LHDN & KWSP compliant' },
            { icon: '✅', text: 'IRAS AIS & MOM compliant' },
            { icon: '✅', text: '87 unit tests passing' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
