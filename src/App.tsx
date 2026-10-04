import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './lib/store';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginPage } from './pages/LoginPage';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { BranchManagerDashboard } from './pages/BranchManagerDashboard';
import { InstructorDashboard } from './pages/InstructorDashboard';
import { StudentPortal } from './pages/StudentPortal';
import { PublicReceiptView } from './pages/PublicReceiptView';
import { DomainGatekeeperPage } from './pages/DomainGatekeeperPage';
import { SqlMigrationModal } from './components/modals/SqlMigrationModal';
import { isPortalMode } from './lib/domainConfig';
import { Coffee, ShieldCheck, ExternalLink } from 'lucide-react';

const DashboardRouter: React.FC = () => {
  const { currentProfile, currentRole } = useApp();
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check if opening public receipt link (e.g. ?ref=WER67TRD21 or /receipt)
  const [receiptRef, setReceiptRef] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('ref') || params.get('receipt');
    }
    return null;
  });

  // Theme Management (Light Mode default per user request)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('aur_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aur_theme', theme);
  }, [theme]);

  // Tab State
  const getDefaultTabForRole = (role: string) => {
    switch (role) {
      case 'instructor':
        return 'timetable';
      case 'student':
        return 'overview';
      case 'branch_manager':
        return 'overview';
      case 'super_admin':
      default:
        return 'overview';
    }
  };

  const [activeTab, setActiveTab] = useState<string>(() => getDefaultTabForRole(currentRole));

  // Update default tab when role switches
  useEffect(() => {
    setActiveTab(getDefaultTabForRole(currentRole));
  }, [currentRole]);

  if (receiptRef) {
    return <PublicReceiptView receiptRef={receiptRef} onBack={() => setReceiptRef(null)} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', maxWidth: '100vw', overflow: 'hidden', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* Grouped Left Sidebar (Edurise Style) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenSqlModal={() => setShowSqlModal(true)}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
        {/* Top Header Bar */}
        <Header
          activeTab={activeTab}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenSqlModal={() => setShowSqlModal(true)}
          theme={theme}
          setTheme={setTheme}
        />

        {/* Dynamic Canvas - Tight Edge-to-Edge Margins */}
        <main className="app-main-content" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0, width: '100%' }}>
          {currentRole === 'super_admin' && (
            <SuperAdminDashboard activeTab={activeTab as any} setActiveTab={setActiveTab as any} />
          )}
          {currentRole === 'branch_manager' && (
            <BranchManagerDashboard activeTab={activeTab as any} setActiveTab={setActiveTab as any} />
          )}
          {currentRole === 'instructor' && (
            <InstructorDashboard activeTab={activeTab as any} setActiveTab={setActiveTab as any} />
          )}
          {currentRole === 'student' && (
            <StudentPortal activeTab={activeTab as any} setActiveTab={setActiveTab as any} />
          )}
        </main>

        {/* Institutional Minimal Footer */}
        <footer
          style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '14px 24px',
            background: 'var(--bg-surface)',
            fontSize: '0.76rem',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coffee size={14} color="var(--crema-gold)" />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Tripple T</span>
            <span>• Institutional Multi-Branch Management</span>
          </div>

          <div style={{ display: 'flex', gap: '14px' }}>
            <span>Nairobi Hub</span>
            <span>•</span>
            <span>Mombasa Center</span>
            <span>•</span>
            <span>Kigali Specialty Lab</span>
          </div>
        </footer>
      </div>

      {showSqlModal && <SqlMigrationModal onClose={() => setShowSqlModal(false)} />}
    </div>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Portal Error Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const handleResetSuperAdmin = () => {
        try {
          localStorage.removeItem('aur_current_profile');
          localStorage.removeItem('aur_auth_session');
        } catch (_) {}
        window.location.href = window.location.pathname;
      };

      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', color: 'var(--text-primary)', padding: '24px' }}>
          <div className="glass-card" style={{ maxWidth: '540px', padding: '32px', textAlign: 'center' }}>
            <Coffee size={48} color="var(--crema-gold)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Portal Session Recovery</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              A temporary display glitch was detected while rendering this view. Your records and credentials remain intact.
            </p>

            {this.state.error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#EF4444',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                textAlign: 'left',
                marginBottom: '20px',
                fontFamily: 'monospace',
                overflowX: 'auto',
                maxHeight: '120px'
              }}>
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                Reload Dashboard
              </button>
              <button className="btn btn-secondary" onClick={handleResetSuperAdmin}>
                Reset to Super Admin
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainApp: React.FC = () => {
  const { isAuthenticated, currentRole } = useApp();
  const [bypassGatekeeper, setBypassGatekeeper] = useState(false);
  const onPortal = isPortalMode();

  const [receiptRef, setReceiptRef] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('ref') || params.get('receipt');
    }
    return null;
  });

  if (receiptRef) {
    return <PublicReceiptView receiptRef={receiptRef} onBack={() => setReceiptRef(null)} />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Domain Boundary Enforcement:
  // If user is on the SMS domain (Management), but their account is a student or instructor:
  // Guide them to the Academy Portal (with a developer preview bypass option).
  if (!onPortal && (currentRole === 'student' || currentRole === 'instructor') && !bypassGatekeeper) {
    return <DomainGatekeeperPage onBypassDev={() => setBypassGatekeeper(true)} />;
  }

  return <DashboardRouter />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainApp />
      </AppProvider>
    </ErrorBoundary>
  );
}
