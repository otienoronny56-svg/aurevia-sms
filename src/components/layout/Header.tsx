import React, { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { UserRole } from '../../types/database.types';
import {
  Sun, Moon, Bell, Database, Menu,
  ChevronDown, CheckCircle2, Shield, User,
  Building2, Sparkles, Coffee, RefreshCw, LogOut, Lock
} from 'lucide-react';
import { ChangeMyPasswordModal } from '../modals/ChangeMyPasswordModal';
import { DomainModeBanner } from './DomainModeBanner';

interface HeaderProps {
  activeTab: string;
  onToggleSidebar: () => void;
  onOpenSqlModal: () => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onToggleSidebar,
  onOpenSqlModal,
  theme,
  setTheme,
}) => {
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const {
    currentRole,
    currentProfile,
    switchRole,
    logout,
    isDbConnected,
    dbStatusMessage,
    branches,
    isSyncing,
    lastSyncTime,
    syncWithCloud,
  } = useApp();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const myBranch = branches.find((b) => b.id === currentProfile.branch_id);

  const getBreadcrumb = () => {
    const formattedTab = activeTab
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return `Home / ${formattedTab || 'Dashboard'}`;
  };

  const ROLES: { role: UserRole; title: string; desc: string; icon: string }[] = [
    { role: 'super_admin', title: 'Super Admin', desc: 'Ronny Ronald (Director)', icon: '👑' },
    { role: 'branch_manager', title: 'Branch Manager', desc: 'David Mutua (Nairobi)', icon: '🏢' },
    { role: 'instructor', title: 'Instructor / Tutor', desc: 'Wanjiku Kamau (Q-Grader)', icon: '☕' },
    { role: 'student', title: 'Trainee / Student', desc: 'Faith Cherono (Barista)', icon: '🎓' },
  ];

  return (
    <header
      style={{
        height: '50px',
        background: 'var(--bg-header)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(8px, 2vw, 16px)',
        position: 'sticky',
        top: 0,
        zIndex: 800,
        boxShadow: 'var(--shadow-sm)',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Left: Hamburger & Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 14px)', minWidth: 0, flexShrink: 1 }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
          className="mobile-menu-btn"
          aria-label="Toggle Navigation"
        >
          <Menu size={20} />
        </button>

        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 'clamp(80px, 25vw, 160px)',
            }}
          >
            {getBreadcrumb()}
          </div>
        </div>
      </div>

      {/* Right Controls: Theme Toggle + Database Status + Profile Switcher */}
      {/* Right Controls: Cloud Sync + Theme Toggle + Role Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1.5vw, 10px)', flexShrink: 0 }}>
        {/* SUBDOMAIN MODE BADGE */}
        <DomainModeBanner />

        {/* SUPABASE LIVE CLOUD SYNC BUTTON */}
        <button
          type="button"
          onClick={() => syncWithCloud()}
          disabled={isSyncing}
          style={{
            background: isDbConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${isDbConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: 'var(--radius-full)',
            padding: '3px 9px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: isSyncing ? 'wait' : 'pointer',
            transition: 'all 0.15s ease',
            height: '30px',
          }}
          title={
            isDbConnected
              ? `Supabase PostgreSQL Connected • Multi-Branch Realtime Live • Last synced: ${lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Just now'}. Click to sync.`
              : `Supabase Cloud offline: ${dbStatusMessage}`
          }
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isDbConnected ? '#10B981' : '#EF4444',
              boxShadow: isDbConnected ? '0 0 6px #10B981' : 'none',
            }}
          />
          <RefreshCw
            size={12}
            color={isDbConnected ? '#10B981' : '#EF4444'}
            style={{
              animation: isSyncing ? 'spin 1s linear infinite' : 'none',
              transition: 'transform 0.3s ease',
            }}
          />
          <span
            className="header-role-text"
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: isDbConnected ? '#10B981' : '#EF4444',
              whiteSpace: 'nowrap',
            }}
          >
            {isSyncing ? 'Syncing...' : 'Cloud Live'}
          </span>
        </button>

        {/* LIGHT / WHITE MODE TOGGLE BUTTON */}
        <button
          type="button"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-medium)',
            color: 'var(--text-primary)',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          title={theme === 'light' ? 'Switch to Dark Mode (Espresso)' : 'Switch to White / Light Mode'}
        >
          {theme === 'light' ? <Moon size={14} color="#475569" /> : <Sun size={14} color="#F59E0B" />}
        </button>


        {/* Role Switcher Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title={`Logged in as ${currentProfile.full_name} (${currentProfile.role})`}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.78rem',
                flexShrink: 0,
              }}
            >
              {currentProfile.full_name.charAt(0)}
            </div>

            <div className="header-role-text" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {currentProfile.full_name.split(' ')[0]}
              </span>
              <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', lineHeight: 1 }}>
                {currentRole.replace('_', ' ')}
              </span>
            </div>

            <ChevronDown size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          </button>

          {showRoleDropdown && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '260px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '8px',
                zIndex: 1000,
                animation: 'slideUp 0.15s ease-out',
              }}
            >
              {/* User Account Info Header */}
              <div
                style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '6px',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentProfile.full_name}
                </div>
                <div style={{ fontSize: '0.70rem', color: 'var(--crema-gold)', fontWeight: 600, marginTop: '2px' }}>
                  {currentProfile.email || currentProfile.staff_id || currentProfile.reg_number || 'Signed In'}
                </div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {myBranch ? myBranch.name : 'All Campuses'} • Viewing as: <strong style={{ color: 'var(--text-primary)' }}>{currentRole.replace('_', ' ').toUpperCase()}</strong>
                </div>
              </div>

              {/* SUPER ADMIN ONLY: Preview & Role Inspection Tool */}
              {currentProfile.role === 'super_admin' && (
                <>
                  <div
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '4px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Sparkles size={11} color="var(--crema-gold)" />
                    <span>Admin View-As Preview</span>
                  </div>

                  {ROLES.map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => {
                        switchRole(r.role);
                        setShowRoleDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: currentRole === r.role ? 'var(--bg-active)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.95rem' }}>{r.icon}</span>
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {r.title}
                          </div>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                            {r.desc}
                          </div>
                        </div>
                      </div>

                      {currentRole === r.role && <CheckCircle2 size={13} color="var(--crema-gold)" />}
                    </button>
                  ))}
                </>
              )}

              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '6px', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleDropdown(false);
                    setShowChangePasswordModal(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-active)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Lock size={14} color="var(--crema-gold)" />
                  <span>Change Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setShowRoleDropdown(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    border: 'none',
                    color: '#EF4444',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut size={14} />
                  <span>Log Out & Exit</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showChangePasswordModal && (
        <ChangeMyPasswordModal onClose={() => setShowChangePasswordModal(false)} />
      )}
    </header>
  );
};
