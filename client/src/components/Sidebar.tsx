import {
  Settings as SettingsIcon, User,
} from 'lucide-react';
import { useOrgRole } from '../contexts/OrgRoleContext';
import { navFor } from '../lib/sidebarNav';
import { IconChip } from './ui/IconChip';
import { Pill } from './ui/Pill';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
}

export default function Sidebar({ activeModule, setActiveModule }: SidebarProps) {
  const { persona } = useOrgRole();
  const sections = navFor(persona.org.kind, persona.role, persona.org.mode);
  const initials = persona.userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const isOperator = persona.org.kind === 'operator';

  return (
    <aside
      className="w-[260px] flex flex-col h-screen shrink-0"
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
      }}
    >
      {/* Brand */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center"
            style={{
              background: 'var(--ink)',
              color: 'var(--paper)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-display)',
              fontSize: '0.95rem',
              letterSpacing: '-0.02em',
            }}
          >
            lt.
          </div>
          <div className="min-w-0">
            <h2
              className="text-sm tracking-tight truncate"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
            >
              PayrollPlatform
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>by EOR Provider · EOR</p>
          </div>
        </div>

        {/* Active persona card */}
        <div
          className="mt-4 p-3 rounded-xl"
          style={{
            background: isOperator ? 'var(--primary-soft)' : 'var(--tertiary-soft)',
            border: isOperator
              ? '1px solid rgba(125, 211, 252, 0.24)'
              : '1px solid rgba(200, 160, 240, 0.24)',
          }}
        >
          <div className="flex items-center justify-between">
            <Pill tone={isOperator ? 'primary' : 'tertiary'} size="sm" dot>
              {isOperator ? 'Operator' : 'Client'}
            </Pill>
            {persona.org.country && (
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                {persona.org.country}
              </span>
            )}
          </div>
          <p className="text-xs font-semibold mt-2 truncate" style={{ color: 'var(--text-primary)' }}>
            {persona.org.name}
          </p>
          <p className="text-[11px] capitalize" style={{ color: 'var(--text-secondary)' }}>
            {persona.role} · {persona.userName}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((module) => {
                const Icon = module.icon;
                const isActive = activeModule === module.id;
                return (
                  <button
                    key={module.id}
                    onClick={() => setActiveModule(module.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                    style={
                      isActive
                        ? { background: 'var(--primary-soft)', border: '1px solid var(--border-default)' }
                        : { background: 'transparent', border: '1px solid transparent' }
                    }
                  >
                    <Icon
                      className="w-[18px] h-[18px] flex-shrink-0"
                      style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}
                    />
                    <span
                      className="text-[13px] font-medium flex-1 text-left"
                      style={{ color: isActive ? 'var(--primary)' : 'var(--text-secondary)' }}
                    >
                      {module.label}
                    </span>
                    {isActive && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: 'var(--primary)', boxShadow: '0 0 8px var(--primary-glow)' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User badge + quick links */}
      <div className="px-3 pb-4 space-y-1.5">
        <div
          className="p-3 rounded-xl flex items-center gap-3"
          style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)' }}
        >
          <IconChip icon={<span className="text-[10px] font-bold">{initials}</span>} tone="tertiary" size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {persona.userName}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
              {persona.userEmail}
            </p>
          </div>
        </div>
        {/* Universal Settings + Profile (every persona, every mode) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveModule('my-profile')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
            style={{
              background: activeModule === 'my-profile' ? 'var(--primary-soft)' : 'transparent',
              border: activeModule === 'my-profile' ? '1px solid rgba(125, 211, 252, 0.22)' : '1px solid transparent',
            }}
          >
            <User className="w-3.5 h-3.5" style={{ color: activeModule === 'my-profile' ? 'var(--primary)' : 'var(--text-muted)' }} />
            <span className="text-[11px] font-medium" style={{ color: activeModule === 'my-profile' ? 'var(--primary)' : 'var(--text-secondary)' }}>Profile</span>
          </button>
          <button
            onClick={() => setActiveModule('settings')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
            style={{
              background: activeModule === 'settings' ? 'var(--primary-soft)' : 'transparent',
              border: activeModule === 'settings' ? '1px solid rgba(125, 211, 252, 0.22)' : '1px solid transparent',
            }}
          >
            <SettingsIcon className="w-3.5 h-3.5" style={{ color: activeModule === 'settings' ? 'var(--primary)' : 'var(--text-muted)' }} />
            <span className="text-[11px] font-medium" style={{ color: activeModule === 'settings' ? 'var(--primary)' : 'var(--text-secondary)' }}>Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
