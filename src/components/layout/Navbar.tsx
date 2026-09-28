import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { UserRole } from '../../types/database.types';
import {
  Coffee, Shield, Building2, GraduationCap, UserCheck,
  Database, Clock, ChevronDown, CheckCircle2, AlertCircle, Copy, Check, Key
} from 'lucide-react';
import { ChangeMyPasswordModal } from '../modals/ChangeMyPasswordModal';

interface NavbarProps {
  onOpenSqlModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSqlModal }) => {
  const {
    currentProfile,
    switchRole,
    selectedBranchId,
    setSelectedBranchId,
    branches,
    profiles,
    isDbConnected,
    hasAurTables,
    staffClockins,
    clockInStaff,
    clockOutStaff,
  } = useApp();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // Check today's clock in status for current staff/instructor
  const today = new Date().toISOString().split('T')[0];
  const myTodayClockIn = staffClockins.find(
    (c) => c.profile_id === currentProfile.id && c.work_date === today
  );

  const roles: { role: UserRole; label: string; icon: any }[] = [
    { role: 'super_admin', label: 'Super Admin', icon: Shield },
    { role: 'branch_manager', label: 'Branch Manager', icon: Building2 },
    { role: 'instructor', label: 'Instructor / Tutor', icon: GraduationCap },
    { role: 'student', label: 'Student Portal', icon: UserCheck },
  ];

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(17, 13, 11, 0.92)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Brand & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-gold)',
            }}
          >
            <Coffee size={22} color="#181310" strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
                className="gold-gradient-text"
              >
                AUREVIA
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(212, 154, 91, 0.15)',
                  color: 'var(--crema-gold-light)',
                  border: '1px solid var(--border-subtle)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Coffee Academy
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Multi-Branch Institutional System
            </p>
          </div>
        </div>

        {/* Center: Branch Selector (for Admins) & Quick Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentProfile.role === 'super_admin' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={16} color="var(--crema-gold)" />
              <select
                className="form-select"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  borderRadius: 'var(--radius-full)',
                  borderColor: 'var(--border-medium)',
                }}
              >
                <option value="ALL">🌐 All Campuses (Global View)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    📍 {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>

        {/* Right: Staff Clock-In & Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Quick Staff Clock-in if instructor or branch manager */}
          {(currentProfile.role === 'instructor' || currentProfile.role === 'branch_manager') && (
            <div>
              {myTodayClockIn ? (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => clockOutStaff(myTodayClockIn.id)}
                  title="Click to Clock Out"
                >
                  <Clock size={14} color="var(--coffee-green)" />
                  <span style={{ color: '#6EE7B7' }}>
                    In: {new Date(myTodayClockIn.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {myTodayClockIn.clock_out && <span style={{ color: 'var(--text-muted)' }}>(Done)</span>}
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => clockInStaff()}
                >
                  <Clock size={14} />
                  <span>Clock In</span>
                </button>
              )}
            </div>
          )}

          {/* Active Role Selector Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 12px',
                borderRadius: 'var(--radius-full)',
                borderColor: 'var(--border-medium)',
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'rgba(212, 154, 91, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--crema-gold)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                {currentProfile.full_name.charAt(0)}
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  {currentProfile.full_name.split(' ')[0]}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--crema-gold)' }}>
                  {roles.find((r) => r.role === currentProfile.role)?.label}
                </div>
              </div>
              <ChevronDown size={14} color="var(--text-muted)" />
            </button>

            {roleMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  marginTop: '8px',
                  width: '260px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '8px',
                  zIndex: 100,
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-subtle)',
                    marginBottom: '6px',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Signed in as
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentProfile.full_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--crema-gold)' }}>
                    {currentProfile.reg_number || currentProfile.specialty || currentProfile.email}
                  </div>
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '4px 12px' }}>
                  SWITCH ROLE (TESTING RBAC)
                </div>

                {roles.map(({ role, label, icon: Icon }) => (
                  <button
                    key={role}
                    onClick={() => {
                      switchRole(role);
                      setRoleMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: currentProfile.role === role ? 'rgba(212, 154, 91, 0.15)' : 'transparent',
                      color: currentProfile.role === role ? 'var(--crema-gold-light)' : 'var(--text-primary)',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      textAlign: 'left',
                    }}
                  >
                    <Icon size={16} color={currentProfile.role === role ? 'var(--crema-gold)' : 'var(--text-secondary)'} />
                    <span>{label}</span>
                    {currentProfile.role === role && (
                      <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--crema-gold)' }} />
                    )}
                  </button>
                ))}

                <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '6px', paddingTop: '6px' }}>
                  <button
                    onClick={() => {
                      setShowChangePasswordModal(true);
                      setRoleMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      color: 'var(--crema-gold)',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      textAlign: 'left',
                    }}
                  >
                    <Key size={15} />
                    <span>Change My Password</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showChangePasswordModal && (
        <ChangeMyPasswordModal onClose={() => setShowChangePasswordModal(false)} />
      )}
    </header>
  );
};
