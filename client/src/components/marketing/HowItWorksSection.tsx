import { useState } from 'react';

interface Props { scrollY: number; }

const steps = [
  {
    number: '01',
    title: 'Sign up & choose your mode',
    description: 'Create your account in minutes. Select Payroll, HR, Payroll+HR, or EOR mode based on your needs. No credit card required.',
    icon: '🚀',
    detail: 'Takes 2 minutes',
  },
  {
    number: '02',
    title: 'Add your employees',
    description: 'Import your team via CSV or add employees one by one. The platform collects the required statutory info and sets up their profiles automatically.',
    icon: '👥',
    detail: 'Bulk import supported',
  },
  {
    number: '03',
    title: 'Run your first payroll',
    description: 'The platform calculates gross-to-net with all statutory deductions. Review the payroll run, approve it, and payslips are generated and distributed.',
    icon: '💳',
    detail: 'Automated calculations',
  },
  {
    number: '04',
    title: 'Manage, file & scale',
    description: 'Approve leave, process expenses, generate statutory filing exports, and grow your team across APAC — all from one dashboard.',
    icon: '📈',
    detail: 'Full compliance coverage',
  },
];

export default function HowItWorksSection({ scrollY }: Props) {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how-it-works" style={{
      width: '100%',
      padding: '6rem 1.5rem',
      backgroundColor: '#F8FAFC',
      position: 'relative',
    }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
        {/* Section header */}
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
              How It Works
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
            Up and running in<br />
            <span style={{ color: '#0EA5E9' }}>4 simple steps.</span>
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#64748B', lineHeight: 1.7, maxWidth: '480px', margin: '0 auto' }}>
            From sign-up to first payroll run — most teams are live within a week.
          </p>
        </div>

        {/* Steps layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}>
          {/* Left: Step list */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1rem' }}>
            {steps.map((step, i) => (
              <div
                key={i}
                onClick={() => setActiveStep(i)}
                style={{
                  display: 'flex',
                  gap: '1.25rem',
                  padding: '1.5rem',
                  borderRadius: '16px',
                  border: `1.5px solid ${activeStep === i ? '#7DD3FC' : '#E2E8F0'}`,
                  backgroundColor: activeStep === i ? 'rgba(125,211,252,0.08)' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: activeStep === i ? '0 4px 16px rgba(125,211,252,0.2)' : '0 1px 4px rgba(26,36,56,0.04)',
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: activeStep === i ? '#7DD3FC' : '#F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: '800',
                  color: activeStep === i ? '#1A2438' : '#94A3B8',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}>
                  {step.number}
                </div>
                <div>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#1A2438',
                    marginBottom: '0.375rem',
                  }}>
                    {step.title}
                  </h3>
                  <p style={{
                    fontSize: '0.85rem',
                    color: '#64748B',
                    lineHeight: 1.6,
                    display: activeStep === i ? 'block' : 'none',
                  }}>
                    {step.description}
                  </p>
                  {activeStep === i && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: '0.625rem',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      color: '#0284C7',
                      backgroundColor: 'rgba(125,211,252,0.15)',
                      padding: '0.2rem 0.625rem',
                      borderRadius: '9999px',
                    }}>
                      {step.detail}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Right: Visual preview */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            border: '1.5px solid #E2E8F0',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(26,36,56,0.08)',
            position: 'sticky' as const,
            top: '6rem',
          }}>
            {/* Preview header */}
            <div style={{
              backgroundColor: '#1A2438',
              padding: '1rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', marginLeft: 'auto', fontWeight: '500' }}>
                Step {activeStep + 1} of 4
              </span>
            </div>

            {/* Preview content */}
            <div style={{ padding: '2rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                backgroundColor: 'rgba(125,211,252,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                marginBottom: '1.5rem',
              }}>
                {steps[activeStep].icon}
              </div>

              <div style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                color: '#7DD3FC',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                marginBottom: '0.5rem',
              }}>
                Step {steps[activeStep].number}
              </div>

              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '800',
                color: '#1A2438',
                marginBottom: '0.875rem',
                lineHeight: 1.3,
              }}>
                {steps[activeStep].title}
              </h3>

              <p style={{
                fontSize: '0.95rem',
                color: '#64748B',
                lineHeight: 1.7,
                marginBottom: '1.5rem',
              }}>
                {steps[activeStep].description}
              </p>

              {/* Progress dots */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {steps.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveStep(i)}
                    style={{
                      width: i === activeStep ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '9999px',
                      backgroundColor: i === activeStep ? '#7DD3FC' : '#E2E8F0',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
