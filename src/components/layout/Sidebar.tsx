import React from 'react';
import { useApp } from '../../lib/store';
import { isPortalMode } from '../../lib/domainConfig';
import {
  LayoutDashboard, Building2, BookOpen, Users, GraduationCap,
  CreditCard, Smartphone, Calendar, Clock, Award, UserCheck,
  FileText, Database, ChevronRight, Sparkles, Coffee, Shield,
  Receipt, DollarSign, PieChart, Layers, Settings, X, LogOut, Send, FileCheck, Video, Key
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenSqlModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  onOpenSqlModal,
}) => {
  const { currentRole, currentProfile, profiles, branches, cohorts, students, assessments, attendance, lessons, leaveRequests, alumni, liveSessions, logout } = useApp();

  const myBranch = branches.find((b) => b.id === currentProfile.branch_id);

  // Define Grouped Navigation Items per Role
  const getNavGroups = () => {
    switch (currentRole) {
      case 'super_admin':
        return [
          {
            title: 'MAIN',
            items: [
              { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
              { id: 'analytics', label: 'Analytics & Reports', icon: PieChart },
              { id: 'branches', label: 'Multi-Campus Hub', icon: Building2, count: branches.length },
              { id: 'courses', label: 'Academic Courses', icon: BookOpen },
              { id: 'cohorts', label: 'Active Cohorts', icon: Layers, count: cohorts.length },
              { id: 'students', label: 'Students & Trainees', icon: GraduationCap, count: students.length },
              { id: 'alumni', label: 'Certified Alumni & Careers', icon: Award, count: alumni.length },
              { id: 'grades', label: 'Exam & Marks Ledger', icon: BookOpen, count: assessments.length },
            ],
          },
          {
            title: 'STAFF & FACULTY HR',
            items: [
              { id: 'staff_attendance', label: 'National Duty Register', icon: Clock },
              { id: 'staff_leaves', label: 'Leave & Off-Days Approvals', icon: Calendar, count: leaveRequests.filter(l => l.status === 'pending').length },
              { id: 'staff', label: 'Faculty & Staff Directory', icon: Users, count: profiles.filter(p => p.role !== 'student').length },
              { id: 'portal_accounts', label: 'Portal Logins & Accounts', icon: Key },
            ],
          },
          {
            title: 'CAMPUS FINANCE & RECORDS',
            items: [
              { id: 'invoices', label: 'Tuition & Invoices', icon: Receipt },
              { id: 'payments', label: 'M-Pesa Ledger', icon: CreditCard },
              { id: 'attendance', label: 'Attendance Archive', icon: UserCheck, count: attendance.length },
              { id: 'communications', label: 'Communications Hub', icon: Send },
            ],
          },
        ];

      case 'branch_manager':
        return [
          {
            title: 'CAMPUS OPERATIONS',
            items: [
              { id: 'overview', label: 'Campus Dashboard', icon: LayoutDashboard },
              { id: 'timetable', label: 'Timetable & Lessons', icon: Calendar, count: lessons.length },
              { id: 'cohorts', label: 'Intakes & Cohorts', icon: BookOpen, count: cohorts.filter(c => c.branch_id === currentProfile.branch_id).length },
              { id: 'admissions', label: 'Student Admissions', icon: GraduationCap },
            ],
          },
          {
            title: 'STAFF & FACULTY HR',
            items: [
              { id: 'duty_register', label: 'Daily Duty Register', icon: Clock },
              { id: 'staff_leaves', label: 'Leave & Off-Days', icon: Calendar, count: leaveRequests.filter(l => l.branch_id === currentProfile.branch_id && l.status === 'pending').length },
              { id: 'staff_directory', label: 'Staff Directory', icon: Users, count: profiles.filter(p => (p.branch_id === currentProfile.branch_id || !p.branch_id) && p.role !== 'student').length },
              { id: 'portal_accounts', label: 'Portal Logins & Accounts', icon: Key },
            ],
          },
          {
            title: 'FINANCE & RECORDS',
            items: [
              { id: 'invoices', label: 'Campus Invoices', icon: Receipt },
              { id: 'payments', label: 'M-Pesa Receipts', icon: CreditCard },
              { id: 'attendance', label: 'Roll-Call Records', icon: UserCheck },
              { id: 'communications', label: 'Communications Hub', icon: Send },
            ],
          },
        ];

      case 'instructor':
        return [
          {
            title: 'ACADEMIC TEACHING',
            items: [
              { id: 'timetable', label: 'Daily & Weekly Schedule', icon: Calendar, count: lessons.length },
              { id: 'live_classes', label: 'Live Virtual Classroom', icon: Video, count: liveSessions.filter(s => s.status === 'live').length || undefined },
              { id: 'cohorts', label: 'Assigned Cohorts', icon: BookOpen, count: cohorts.filter(c => c.instructor_id === currentProfile.id || c.branch_id === currentProfile.branch_id).length },
              { id: 'grades', label: 'CATs & Marksheets', icon: Award, count: assessments.length },
              { id: 'attendance', label: 'Daily Roll-Call History', icon: UserCheck, count: attendance.length },
            ],
          },
        ];

      case 'student':
        return [
          {
            title: 'STUDENT PORTAL',
            items: [
              { id: 'overview', label: 'My Training Program', icon: BookOpen },
              { id: 'live_classes', label: 'Live Online Classes', icon: Video, count: liveSessions.filter(s => s.status === 'live').length || undefined },
              { id: 'modules', label: 'Syllabus & Modules', icon: Layers },
              { id: 'grades', label: 'My Marks & CATs', icon: Award },
              { id: 'attendance', label: 'My Attendance Logs', icon: UserCheck },
              { id: 'finance', label: 'Tuition & M-Pesa Pay', icon: CreditCard },
              { id: 'profile', label: 'My Profile & KYC Uploads', icon: Settings },
              { id: 'agreements', label: 'Agreements & Consents', icon: FileCheck },
            ],
          },
        ];

      default:
        return [];
    }
  };

  const navGroups = getNavGroups();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 900,
          }}
        />
      )}

      <aside
        className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}
      >
        {/* Top Academy Logo & Brand */}
        <div
          style={{
            padding: '20px 20px 16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(212, 154, 91, 0.3)',
                fontWeight: 800,
                fontSize: '1.2rem',
              }}
            >
              ☕
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Aurevia</span>
                <span style={{ fontSize: '0.65rem', background: isPortalMode() ? 'rgba(16, 185, 129, 0.15)' : 'var(--primary-accent-bg)', color: isPortalMode() ? '#10B981' : 'var(--primary-accent)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  {isPortalMode() ? 'PORTAL' : 'SMS'}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {isPortalMode() ? 'Academy Learning Hub' : 'System Management'}
              </div>
            </div>
          </div>

          {/* Close for mobile */}
          <button
            onClick={onClose}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
            className="mobile-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Group Items */}
        <div
          style={{
            flex: 1,
            padding: '16px 12px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {navGroups.map((group) => (
            <div key={group.title}>
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '0 12px',
                  marginBottom: '8px',
                }}
              >
                {group.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if ((item as any).isAction) {
                          onOpenSqlModal();
                        } else {
                          setActiveTab(item.id);
                          onClose();
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: isActive ? 'var(--bg-active)' : 'transparent',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.84rem',
                        fontWeight: isActive ? 700 : 500,
                        transition: 'all 0.12s ease',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon
                          size={17}
                          color={isActive ? 'var(--crema-gold)' : 'var(--text-muted)'}
                          style={{ transition: 'color 0.12s ease' }}
                        />
                        <span>{item.label}</span>
                      </div>

                      {item.count !== undefined && item.count > 0 && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-full)',
                            background: isActive ? 'var(--primary-accent-bg)' : 'var(--bg-surface-elevated)',
                            color: isActive ? 'var(--primary-accent)' : 'var(--text-muted)',
                            border: `1px solid ${isActive ? 'transparent' : 'var(--border-subtle)'}`,
                          }}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom User Card / Branch Tag */}
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'var(--bg-surface-elevated)',
                border: '1.5px solid var(--border-medium)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.82rem',
                color: 'var(--crema-gold)',
                flexShrink: 0,
              }}
            >
              {currentProfile.full_name.charAt(0)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentProfile.full_name.split(' ')[0]}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {currentRole.replace('_', ' ')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--crema-gold)',
                border: '1px solid var(--border-subtle)',
                whiteSpace: 'nowrap',
              }}
            >
              {myBranch?.code || 'HQ'}
            </span>
            <button
              type="button"
              onClick={logout}
              title="Log Out"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '4px',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
