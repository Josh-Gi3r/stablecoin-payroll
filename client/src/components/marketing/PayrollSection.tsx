interface Props { scrollY: number; }

export default function PayrollSection({ scrollY }: Props) {
  return (
    <section style={{
      width: '100%',
      padding: '6rem 1.5rem',
      backgroundColor: '#1A2438',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background accent */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(ellipse at center, rgba(125,211,252,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '72rem', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>
          {/* Left: Copy */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: 'rgba(125,211,252,0.15)',
              border: '1px solid rgba(125,211,252,0.3)',
              borderRadius: '9999px',
              padding: '0.375rem 0.875rem',
              marginBottom: '1.5rem',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#7DD3FC', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                Payroll Engine
              </span>
            </div>

            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: '800',
              color: 'white',
              lineHeight: 1.15,
              letterSpacing: '-0.75px',
              marginBottom: '1.25rem',
            }}>
              Pay your team in<br />
              <span style={{ color: '#7DD3FC' }}>their local currency.</span>
            </h2>

            <p style={{
              fontSize: '1.05rem',
              color: '#94A3B8',
              lineHeight: 1.7,
              marginBottom: '2.5rem',
            }}>
              The platform's statutory engines handle every deduction automatically — EPF, SOCSO, EIS, PCB for Malaysia; CPF, SDL for Singapore. Gross-to-net in seconds.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1rem' }}>
              {[
                { icon: '🇲🇾', title: 'Malaysia', detail: 'EPF · SOCSO · EIS · HRD Corp · PCB MTD' },
                { icon: '🇸🇬', title: 'Singapore', detail: 'CPF (5 age bands) · SDL · FWL · IRAS AIS' },
                { icon: '💱', title: 'Multi-currency', detail: 'MYR · SGD · USD · and more' },
                { icon: '📅', title: 'Filing Calendar', detail: 'Auto-reminders for all statutory due dates' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1.25rem',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: '700', color: 'white', marginBottom: '0.125rem' }}>{item.title}</p>
                    <p style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Payslip preview */}
          <div>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}>
              {/* Payslip header */}
              <div style={{
                backgroundColor: 'rgba(125,211,252,0.1)',
                borderBottom: '1px solid rgba(125,211,252,0.2)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontSize: '0.7rem', color: '#7DD3FC', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Payslip</p>
                  <p style={{ fontSize: '1rem', fontWeight: '700', color: 'white' }}>April 2026</p>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  color: '#10B981',
                  backgroundColor: 'rgba(16,185,129,0.15)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                }}>
                  Approved
                </span>
              </div>

              {/* Payslip body */}
              <div style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>Employee</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white' }}>Ahmad Razif bin Ismail</p>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Senior Engineer · Kuala Lumpur</p>
                </div>

                {[
                  { label: 'Basic Salary', amount: 'RM 8,500.00', type: 'income' },
                  { label: 'Transport Allowance', amount: 'RM 300.00', type: 'income' },
                  { label: 'EPF (Employee 11%)', amount: '- RM 965.00', type: 'deduction' },
                  { label: 'SOCSO', amount: '- RM 29.75', type: 'deduction' },
                  { label: 'EIS', amount: '- RM 17.60', type: 'deduction' },
                  { label: 'PCB (Income Tax)', amount: '- RM 420.00', type: 'deduction' },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{row.label}</span>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: row.type === 'deduction' ? '#F87171' : '#A7F3D0',
                    }}>{row.amount}</span>
                  </div>
                ))}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '1rem 0 0',
                  marginTop: '0.5rem',
                  borderTop: '2px solid rgba(125,211,252,0.3)',
                }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#7DD3FC' }}>Net Pay</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'white' }}>RM 7,367.65</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
