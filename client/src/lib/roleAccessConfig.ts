import type { Persona } from '../contexts/OrgRoleContext';
import { isModuleVisibleForPersona } from './sidebarNav';

export type UserRole = 'super_admin' | 'client_admin' | 'finance' | 'hr' | 'employee';

/**
 * View-key access for the demo's six personas. Source of truth for both
 * sidebar rendering and route gating is `sidebarNav.navFor` — this module
 * just delegates so MainApp's gate matches what the Sidebar actually
 * shows. The legacy `roleAccessConfig.allowedModules` map was a second,
 * out-of-sync source of truth; deleted to prevent drift.
 */

export function canAccessModule(persona: Persona, moduleId: string): boolean {
  return isModuleVisibleForPersona(persona, moduleId);
}

export function getDefaultModule(): string {
  return 'dashboard';
}

export function getDashboardType(role: UserRole): 'admin' | 'client' | 'finance' | 'hr' | 'employee' {
  switch (role) {
    case 'super_admin': return 'admin';
    case 'client_admin': return 'client';
    case 'finance': return 'finance';
    case 'hr': return 'hr';
    default: return 'employee';
  }
}
