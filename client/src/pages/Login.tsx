import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { ArrowRight, Shield, Globe, Scroll } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 26 } },
};

const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

export default function Login() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginAsGuest } = useAuth();
  const [, navigate] = useLocation();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await login(email);
      navigate('/app');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      loginAsGuest();
      navigate('/app');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-app)' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(at 30% 20%, rgba(125, 211, 252, 0.12) 0px, transparent 50%), ' +
            'radial-gradient(at 70% 80%, rgba(200, 160, 240, 0.10) 0px, transparent 50%), ' +
            'radial-gradient(at 50% 50%, rgba(136, 180, 204, 0.05) 0px, transparent 60%)',
        }}
      />

      <motion.div variants={stagger} initial="hidden" animate="visible" className="w-full max-w-md relative z-10">
        <motion.div variants={fadeUp} className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 text-xl font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--primary-300), var(--primary-500))',
              color: 'var(--text-inverse)',
              boxShadow: '0 8px 32px var(--primary-glow)',
            }}
          >
            S
          </div>
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            PayrollPlatform
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Compliance-first Employer of Record for Malaysia &amp; Singapore
          </p>
        </motion.div>

        <motion.div variants={fadeUp} className="surface p-6 mb-4">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Sign in</h2>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Work email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="field"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={!email || isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
              No password required. Dev login creates a PayrollPlatform operator session.
            </p>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="surface-subtle p-5">
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Try as guest</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Explore the platform with demo data. No account required.
          </p>
          <button onClick={handleGuestLogin} disabled={isLoading} className="btn-outlined w-full">
            {isLoading ? 'Loading…' : 'Enter as guest'}
          </button>
        </motion.div>

        <motion.div variants={fadeUp} className="flex justify-center gap-3 mt-6">
          {[
            { icon: Shield, label: 'Tripartite + KYC' },
            { icon: Scroll, label: 'E-sign contracts' },
            { icon: Globe, label: 'APAC statutory' },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="flex items-center gap-2 px-3 py-1.5 rounded-full surface-subtle">
                <Icon className="w-3 h-3" style={{ color: 'var(--primary-300)' }} />
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{f.label}</span>
              </div>
            );
          })}
        </motion.div>

        <motion.div variants={fadeUp} className="mt-6 text-center">
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Powered by Settlement Protocol</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
