import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Building2, Briefcase, Users, UserCircle, Shield } from 'lucide-react';
import { useOrgRole, DEMO_PERSONAS, Role } from '../contexts/OrgRoleContext';
import { IconChip } from './ui/IconChip';
import { Pill } from './ui/Pill';

/**
 * Demo-mode persona switcher. Lets the viewer jump between organizations
 * (operator ↔ client) and across roles within each
 * organization. The active selection drives dashboards, sidebar nav,
 * and data scope throughout the app.
 */
export function PersonaSwitcher() {
  const { persona, setPersona } = useOrgRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const orgChipTone = persona.org.kind === 'operator' ? 'primary' : 'tertiary';

  // Group personas by org for the dropdown.
  const byOrg = DEMO_PERSONAS.reduce<Record<string, typeof DEMO_PERSONAS>>((acc, p) => {
    (acc[p.org.id] = acc[p.org.id] || []).push(p);
    return acc;
  }, {});

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl"
        style={{
          background: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-default)',
        }}
      >
        <IconChip
          icon={persona.org.kind === 'operator' ? <Shield className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
          tone={orgChipTone}
          size="sm"
          className="!w-7 !h-7"
        />
        <div className="text-left min-w-0 hidden sm:block">
          <p className="text-[11px] leading-none" style={{ color: 'var(--text-muted)' }}>
            {persona.org.kind === 'operator' ? 'Operator' : 'Client'} · viewing as
          </p>
          <p className="text-xs font-semibold mt-0.5 leading-none truncate max-w-[180px]" style={{ color: 'var(--text-primary)' }}>
            {persona.org.name} · <span className="capitalize">{persona.role}</span>
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
      </button>

      {open && (
        <div
          className="absolute z-50 right-0 mt-2 w-[320px] overflow-hidden rounded-2xl"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
              Demo mode
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Switch persona to view the platform from different perspectives.
            </p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {Object.entries(byOrg).map(([orgId, list]) => {
              const firstOrg = list[0].org;
              const isActiveOrg = orgId === persona.org.id;
              return (
                <div key={orgId} className="py-2">
                  <div className="px-4 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                        style={{ color: firstOrg.kind === 'operator' ? 'var(--primary)' : 'var(--tertiary)' }}
                      >
                        {firstOrg.kind === 'operator' ? 'Operator' : 'Client'}
                      </span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {firstOrg.name}
                      </span>
                    </div>
                    {firstOrg.country && (
                      <Pill tone="muted" size="sm">{firstOrg.country}</Pill>
                    )}
                  </div>
                  <div className="px-2 pb-2 space-y-0.5">
                    {list.map((p) => {
                      const isActive = isActiveOrg && p.role === persona.role;
                      const roleIcon = roleIconFor(p.role);
                      return (
                        <button
                          key={`${p.org.id}-${p.role}`}
                          onClick={() => { setPersona(p); setOpen(false); }}
                          className="w-full flex items-start gap-3 px-2.5 py-2 rounded-xl text-left"
                          style={
                            isActive
                              ? { background: 'var(--primary-soft)', border: '1px solid var(--border-default)' }
                              : { background: 'transparent', border: '1px solid transparent' }
                          }
                        >
                          <IconChip icon={roleIcon} tone={isActive ? 'primary' : 'neutral'} size="sm" className="!w-8 !h-8" />
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-xs font-semibold"
                              style={{ color: isActive ? 'var(--primary)' : 'var(--text-primary)' }}
                            >
                              <span className="capitalize">{p.role}</span> · {p.userName}
                            </p>
                            <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>
                              {p.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function roleIconFor(role: Role) {
  switch (role) {
    case 'admin':    return <Shield className="w-3.5 h-3.5" />;
    case 'finance':  return <Briefcase className="w-3.5 h-3.5" />;
    case 'hr':       return <Users className="w-3.5 h-3.5" />;
    case 'employee': return <UserCircle className="w-3.5 h-3.5" />;
  }
}
