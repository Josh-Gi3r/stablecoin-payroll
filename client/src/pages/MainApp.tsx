import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { LogOut, Settings, Search } from 'lucide-react';

import Sidebar from '../components/Sidebar';
import MobileMenu from '../components/MobileMenu';
import NotificationCenter from '../components/NotificationCenter';
import CommandPalette from '../components/CommandPalette';
import ChatSidebar from '../components/ChatSidebar';
import PayrollView from '../components/views/PayrollView';
import InvoicingView from '../components/views/InvoicingView';
import SendView from '../components/views/SendView';
import FXView from '../components/views/FXView';
import TreasuryView from '../components/views/TreasuryView';
import ExpensesView from '../components/views/ExpensesView';
import AccountingView from '../components/views/AccountingView';
import AutomationView from '../components/views/AutomationView';
import IntegrationsView from '../components/views/IntegrationsView';
import FXReportingView from '../components/views/FXReportingView';
import ExportView from '../components/views/ExportView';
import SettingsView from '../components/views/SettingsView';
import MyPayView from '../components/views/MyPayView';
import MyExpensesView from '../components/views/MyExpensesView';
import TimeOffView from '../components/views/TimeOffView';
import PeopleView from '../components/views/PeopleView';
import BillPayView from '../components/views/BillPayView';
import ApprovalsView from '../components/views/ApprovalsView';
import ClientsView from '../components/views/ClientsView';
import DepositsView from '../components/views/DepositsView';
import ContractsView from '../components/views/ContractsView';
import StatutoryView from '../components/views/StatutoryView';
import AuditLogView from '../components/views/AuditLogView';
import NotFoundView from '../components/views/NotFoundView';
import MyDocumentsView from '../components/views/MyDocumentsView';
import MyProfileView from '../components/views/MyProfileView';
import ClientOnboardingView from '../components/views/ClientOnboardingView';
import EmployeeOnboardingView from '../components/views/EmployeeOnboardingView';
import TrustAccountView from '../components/views/TrustAccountView';
import FilingCalendarView from '../components/views/FilingCalendarView';
import KYCReviewQueue from '../components/views/KYCReviewQueue';
import TerminationView from '../components/views/TerminationView';
import { canAccessModule, getDefaultModule } from '../lib/roleAccessConfig';
import { EmployeeDashboard } from '../components/dashboards/EmployeeDashboard';
import { OperatorDashboard } from '../components/dashboards/OperatorDashboard';
import { ClientDashboard } from '../components/dashboards/ClientDashboard';
import PayrollOnlyDashboard from '../components/dashboards/PayrollOnlyDashboard';
import HrOnlyDashboard from '../components/dashboards/HrOnlyDashboard';
import { PersonaSwitcher } from '../components/PersonaSwitcher';
import { useOrgRole } from '../contexts/OrgRoleContext';
import { NavigationProvider } from '../contexts/NavigationContext';


function MainAppContent() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const { persona } = useOrgRole();
  const [, navigate] = useLocation();

  // Reset to dashboard when persona changes so the user lands on the right
  // role-specific dashboard.
  useEffect(() => {
    setActiveModule('dashboard');
  }, [persona]);

  const handleLogout = () => {
    navigate('/');
  };

  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);

  // Global CMD+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const renderModule = () => {
    // Source of truth for "can this persona reach this view?" is
    // sidebarNav.navFor (used by Sidebar to render and by canAccessModule
    // to gate). If we get here with a view-key the persona's sidebar
    // doesn't expose, bounce back to dashboard.
    if (!canAccessModule(persona, activeModule)) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn(
          `[gate] Blocked '${activeModule}' for persona ${persona.org.kind}/${persona.role}. ` +
          `Add it to navFor() in client/src/lib/sidebarNav.ts if it should be reachable.`,
        );
      }
      setActiveModule(getDefaultModule());
      return null;
    }

    // Mode-aware dashboard routing.
    //   employee role         → EmployeeDashboard
    //   operator org          → OperatorDashboard
    //   client mode === 'eor' → ClientDashboard (full EOR strip)
    //   client mode 'payroll' → PayrollOnlyDashboard (lean, no HR)
    //   client mode 'hr'      → HrOnlyDashboard (people-focused, no payroll)
    //   client 'payroll_hr'   → ClientDashboard (mode-aware: hides EOR strip)
    if (activeModule === 'dashboard') {
      if (persona.role === 'employee') return <EmployeeDashboard />;
      if (persona.org.kind === 'operator') return <OperatorDashboard />;
      const mode = persona.org.mode;
      if (mode === 'payroll') return <PayrollOnlyDashboard />;
      if (mode === 'hr') return <HrOnlyDashboard />;
      // 'eor' and 'payroll_hr' both share ClientDashboard; the latter just
      // doesn't see the EOR-specific sections (Trust Deposit, Platform Invoices).
      return <ClientDashboard />;
    }

    switch (activeModule) {
      case 'clients':
        return <ClientsView />;
      case 'deposits':
        return <DepositsView />;
      case 'contracts':
        return <ContractsView />;
      case 'payroll':
        return <PayrollView />;
      case 'invoicing':
        return <InvoicingView />;
      case 'send':
        return <SendView />;
      case 'fx':
        return <FXView />;
      case 'treasury':
        return <TreasuryView />;
      case 'expenses':
        return <ExpensesView />;
      case 'accounting':
        return <AccountingView />;
      case 'automation':
        return <AutomationView />;
      case 'integrations':
        return <IntegrationsView />;
      case 'fx-reporting':
        return <FXReportingView />;
      case 'export':
        return <ExportView />;
      case 'settings':
        return <SettingsView />;
      case 'my-pay':
        return <MyPayView />;
      case 'my-expenses':
        return <MyExpensesView />;
      case 'time-off':
        return <TimeOffView />;
      case 'people':
        return <PeopleView />;
      case 'bill-pay':
        return <BillPayView />;
      case 'approvals':
        return <ApprovalsView />;
      case 'statutory':
        return <StatutoryView />;
      case 'audit':
        return <AuditLogView />;
      case 'my-documents':
        return <MyDocumentsView />;
      case 'my-profile':
        return <MyProfileView />;
      case 'client-onboarding':
        return <ClientOnboardingView />;
      case 'employee-onboarding':
        return <EmployeeOnboardingView />;
      case 'trust-account':
        return <TrustAccountView />;
      case 'filing-calendar':
        return <FilingCalendarView />;
      case 'kyc-review':
        return <KYCReviewQueue />;
      case 'termination':
        return <TerminationView />;
      default:
        return <NotFoundView onGoHome={() => setActiveModule('dashboard')} />;
    }
  };

  return (
    <NavigationProvider value={{ navigateTo: setActiveModule }}>
    <div className="flex h-screen flex-col md:flex-row" style={{ background: 'var(--bg-app)' }}>
      <div className="hidden md:block">
        <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header
          className="px-3 md:px-6 py-3 flex items-center shrink-0 gap-2 md:gap-4"
          style={{
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <MobileMenu activeModule={activeModule} setActiveModule={setActiveModule} />

          {/* Brand (mobile only — sidebar shows it on desktop) */}
          <div className="min-w-0 md:hidden">
            <h1 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>PayrollPlatform</h1>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>EOR Platform</p>
          </div>

          {/* Search (CMD+K trigger) */}
          <button
            onClick={() => setCmdPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs flex-1 max-w-sm ml-auto md:ml-0"
            style={{
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-muted)',
            }}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Search…</span>
            <kbd
              className="px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              ⌘K
            </kbd>
          </button>
          <button
            onClick={() => setCmdPaletteOpen(true)}
            className="sm:hidden p-2 rounded-lg ml-auto"
            style={{
              background: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 md:ml-auto">
            {/* Two-level org + role persona switcher (demo) */}
            <PersonaSwitcher />
            <NotificationCenter />

            <button
              className="p-2 rounded-lg hidden sm:inline-flex"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setActiveModule('settings')}
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ background: 'var(--bg-app)' }}
        >
          {renderModule()}
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        onNavigate={(module) => { setActiveModule(module); setCmdPaletteOpen(false); }}
      />

      {/* AI Chat Sidebar */}
      <ChatSidebar />
    </div>
    </NavigationProvider>
  );
}

export default function MainApp() {
  return <MainAppContent />;
}
