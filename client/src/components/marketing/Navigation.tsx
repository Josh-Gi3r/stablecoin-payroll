import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

export default function Navigation() {
  const [, setLocation] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: scrolled ? 'rgba(255,255,255,0.97)' : 'white',
      borderBottom: scrolled ? '1px solid #E2E8F0' : '1px solid #E2E8F0',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      transition: 'all 0.3s ease',
      boxShadow: scrolled ? '0 1px 20px rgba(26,36,56,0.06)' : 'none',
    }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4.5rem' }}>

          {/* Logo */}
          <button
            onClick={() => setLocation('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <div style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #7DD3FC 0%, #0EA5E9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(125,211,252,0.4)',
            }}>
              <span style={{ color: 'white', fontWeight: '800', fontSize: '0.9rem', letterSpacing: '-0.5px' }}>S</span>
            </div>
            <span style={{
              fontSize: '1.25rem',
              fontWeight: '800',
              color: '#1A2438',
              letterSpacing: '-0.5px',
            }}>
              PayrollPlatform
            </span>
          </button>

          {/* Desktop Nav Links */}
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }} className="desktop-nav">
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  padding: '0.5rem 0.875rem',
                  borderRadius: '8px',
                  fontWeight: '500',
                  fontSize: '0.9rem',
                  color: '#475569',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#1A2438';
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => setLocation('/app')}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                padding: '0.5rem 1rem',
                fontWeight: '500',
                fontSize: '0.9rem',
                color: '#475569',
                cursor: 'pointer',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#1A2438';
                e.currentTarget.style.backgroundColor = '#F8FAFC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#475569';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setLocation('/app')}
              style={{
                backgroundColor: '#7DD3FC',
                border: '2px solid #7DD3FC',
                borderRadius: '10px',
                padding: '0.5rem 1.25rem',
                fontWeight: '700',
                fontSize: '0.9rem',
                color: '#1A2438',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(125,211,252,0.35)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#38BDF8';
                e.currentTarget.style.borderColor = '#38BDF8';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(125,211,252,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#7DD3FC';
                e.currentTarget.style.borderColor = '#7DD3FC';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(125,211,252,0.35)';
              }}
            >
              Get Started Free
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
