import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Branch, StudentKYC, Profile } from '../../types/database.types';
import {
  X, Building2, Users, GraduationCap, Search, Phone, Mail,
  ShieldCheck, ArrowRight, BookOpen, Clock, Calendar, CheckCircle2,
  ExternalLink, UserCheck
} from 'lucide-react';

interface BranchRosterModalProps {
  branch: Branch;
  initialTab?: 'students' | 'staff';
  onClose: () => void;
  onSelectStudent?: (student: StudentKYC) => void;
  onNavigateToTab?: (tab: string, branchId: string) => void;
}

export const BranchRosterModal: React.FC<BranchRosterModalProps> = ({
  branch,
  initialTab = 'students',
  onClose,
  onSelectStudent,
  onNavigateToTab,
}) => {
  const { students, profiles, cohorts, courses, staffClockins, leaveRequests } = useApp();
  const [activeTab, setActiveTab] = useState<'students' | 'staff'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Branch Students
  const branchStudents = students.filter((s) => s.branch_id === branch.id);
  const branchCohorts = cohorts.filter((c) => c.branch_id === branch.id);

  // 2. Branch Staff (everyone assigned to this branch who is not a student)
  const branchStaff = profiles.filter(
    (p) => (p.branch_id === branch.id || p.branch_id === null && p.role === 'super_admin') && p.role !== 'student'
  );

  // Filtered lists based on search
  const filteredStudents = branchStudents.filter((st) => {
    const prof = st.profile || profiles.find((p) => p.id === st.profile_id);
    const regNo = prof?.reg_number || '';
    const name = prof?.full_name || '';
    const term = searchTerm.toLowerCase();
    return name.toLowerCase().includes(term) || regNo.toLowerCase().includes(term);
  });

  const filteredStaff = branchStaff.filter((st) => {
    const term = searchTerm.toLowerCase();
    const name = st.full_name?.toLowerCase() || '';
    const email = st.email?.toLowerCase() || '';
    const role = st.role?.toLowerCase() || '';
    return name.includes(term) || email.includes(term) || role.includes(term);
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'branch_manager':
        return { label: 'Branch Director', color: '#D49A5B', bg: 'rgba(212, 154, 91, 0.15)' };
      case 'instructor':
        return { label: 'Senior Instructor', color: '#6EE7B7', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'admin':
        return { label: 'Campus Admin', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)' };
      case 'super_admin':
        return { label: 'Executive HQ', color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.15)' };
      default:
        return { label: role.replace('_', ' ').toUpperCase(), color: '#D6C7BB', bg: 'rgba(255, 255, 255, 0.1)' };
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '880px',
          width: '95%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#16120E',
          border: '1.5px solid rgba(212, 154, 91, 0.28)',
          borderRadius: '20px',
          boxShadow: '0 25px 70px -15px rgba(0, 0, 0, 0.95), 0 0 40px rgba(212, 154, 91, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(180deg, #1E1712 0%, #17120E 100%)',
            borderBottom: '1px solid rgba(212, 154, 91, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(212, 154, 91, 0.2), rgba(212, 154, 91, 0.05))',
                border: '1px solid rgba(212, 154, 91, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--crema-gold)',
                flexShrink: 0,
              }}
            >
              <Building2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(212, 154, 91, 0.18)',
                    color: 'var(--crema-gold)',
                    border: '1px solid rgba(212, 154, 91, 0.3)',
                  }}
                >
                  CAMPUS CODE: {branch.code}
                </span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  {branch.city} • {branch.address}
                </span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#F8F5F1', letterSpacing: '-0.02em' }}>
                {branch.name}
              </h2>
            </div>
          </div>

          <button
            className="btn-icon"
            onClick={onClose}
            title="Close modal"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              color: 'var(--text-secondary)',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTROLS BAR: TABS & SEARCH */}
        <div
          style={{
            padding: '14px 24px',
            background: '#191410',
            borderBottom: '1px solid rgba(212, 154, 91, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* TABS */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('students')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.84rem',
                fontWeight: 600,
                border: activeTab === 'students' ? '1.5px solid #D49A5B' : '1px solid rgba(255, 255, 255, 0.08)',
                background: activeTab === 'students' ? 'rgba(212, 154, 91, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                color: activeTab === 'students' ? '#D49A5B' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <GraduationCap size={16} />
              <span>Enrolled Trainees</span>
              <span
                style={{
                  background: activeTab === 'students' ? '#D49A5B' : 'rgba(255, 255, 255, 0.1)',
                  color: activeTab === 'students' ? '#181310' : 'var(--text-primary)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  marginLeft: '2px',
                }}
              >
                {branchStudents.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.84rem',
                fontWeight: 600,
                border: activeTab === 'staff' ? '1.5px solid #6EE7B7' : '1px solid rgba(255, 255, 255, 0.08)',
                background: activeTab === 'staff' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                color: activeTab === 'staff' ? '#6EE7B7' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Users size={16} />
              <span>Faculty & Staff</span>
              <span
                style={{
                  background: activeTab === 'staff' ? '#6EE7B7' : 'rgba(255, 255, 255, 0.1)',
                  color: activeTab === 'staff' ? '#064E3B' : 'var(--text-primary)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  marginLeft: '2px',
                }}
              >
                {branchStaff.length}
              </span>
            </button>
          </div>

          {/* SEARCH INPUT */}
          <div style={{ position: 'relative', minWidth: '240px', flex: '1', maxWidth: '320px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--crema-gold)' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder={activeTab === 'students' ? 'Search trainees by name or reg no...' : 'Search staff by name or role...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: '34px',
                fontSize: '0.82rem',
                width: '100%',
                background: '#140F0D',
                border: '1.5px solid rgba(212, 154, 91, 0.25)',
                color: '#F8F5F1',
                borderRadius: '8px',
              }}
            />
          </div>
        </div>

        {/* TAB 1: TRAINEES ROSTER */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#16120E' }}>
          {activeTab === 'students' && (
            <div>
              {filteredStudents.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '50px 24px',
                    background: '#1A1411',
                    border: '1px dashed rgba(212, 154, 91, 0.2)',
                    borderRadius: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(212, 154, 91, 0.1)',
                      color: 'var(--crema-gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}
                  >
                    <GraduationCap size={28} />
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.96rem', fontWeight: 700, color: '#F8F5F1' }}>
                    No Enrolled Trainees in {branch.name}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '420px', marginInline: 'auto' }}>
                    New registrations and admitted trainees assigned to this regional campus will be organized here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredStudents.map((st) => {
                    const prof = st.profile || profiles.find((p) => p.id === st.profile_id);
                    const cohort = cohorts.find((c) => c.branch_id === branch.id);
                    const course = courses.find((crs) => crs.id === cohort?.course_id);

                    return (
                      <div
                        key={st.id}
                        style={{
                          background: '#1E1714',
                          border: '1px solid rgba(212, 154, 91, 0.18)',
                          borderRadius: '12px',
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                          flexWrap: 'wrap',
                          transition: 'border-color 0.2s ease',
                        }}
                      >
                        {/* Student Details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #D49A5B, #8C5A28)',
                              color: '#181310',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                            }}
                          >
                            {prof?.full_name ? prof.full_name.substring(0, 2).toUpperCase() : 'ST'}
                          </div>

                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                              {prof?.full_name || 'Anonymous Student'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.74rem',
                                  background: 'rgba(212, 154, 91, 0.12)',
                                  color: 'var(--crema-gold)',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                }}
                              >
                                {prof?.reg_number || 'AUR/PENDING'}
                              </span>
                              {st.kyc_verified && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', color: '#10B981' }}>
                                  <ShieldCheck size={12} /> KYC Verified
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Program & Cohort */}
                        <div style={{ minWidth: '180px' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Assigned Course</div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {course?.title || 'Specialty Coffee Barista Course'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--crema-gold)', marginTop: '2px' }}>
                            {cohort?.name || 'Main Intake'}
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div style={{ minWidth: '150px' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Contact</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} /> {prof?.phone || 'N/A'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Mail size={12} /> {prof?.email || 'N/A'}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div>
                          {onSelectStudent && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                              onClick={() => {
                                onSelectStudent(st);
                              }}
                            >
                              <span>View Dossier</span>
                              <ExternalLink size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STAFF & FACULTY ROSTER */}
          {activeTab === 'staff' && (
            <div>
              {filteredStaff.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '50px 24px',
                    background: '#1A1411',
                    border: '1px dashed rgba(16, 185, 129, 0.2)',
                    borderRadius: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: '#6EE7B7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}
                  >
                    <Users size={28} />
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.96rem', fontWeight: 700, color: '#F8F5F1' }}>
                    No Faculty or Staff Assigned to {branch.name}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '420px', marginInline: 'auto' }}>
                    Branch directors, instructors, and master roasters stationed at this campus will be rostered here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredStaff.map((member) => {
                    const badge = getRoleBadge(member.role);
                    // Check if clocked in today
                    const todayDate = new Date().toISOString().split('T')[0];
                    const isClockedIn = staffClockins.some(
                      (c) => c.profile_id === member.id && c.work_date === todayDate && !c.clock_out
                    );

                    return (
                      <div
                        key={member.id}
                        style={{
                          background: '#1E1714',
                          border: '1px solid rgba(212, 154, 91, 0.18)',
                          borderRadius: '12px',
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {/* Member Identity */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: badge.bg,
                              border: `1px solid ${badge.color}`,
                              color: badge.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                            }}
                          >
                            {member.full_name ? member.full_name.substring(0, 2).toUpperCase() : 'ST'}
                          </div>

                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                              {member.full_name || 'Staff Member'}
                            </div>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: badge.bg,
                                color: badge.color,
                                padding: '2px 8px',
                                borderRadius: '999px',
                                marginTop: '3px',
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </div>

                        {/* Contact details */}
                        <div style={{ minWidth: '180px' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Official Contact</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} /> {member.email}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Phone size={12} /> {member.phone || 'N/A'}
                          </div>
                        </div>

                        {/* Campus Duty Status */}
                        <div style={{ minWidth: '130px' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Daily Duty Status</div>
                          {isClockedIn ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#10B981',
                                fontWeight: 600,
                                fontSize: '0.78rem',
                                marginTop: '3px',
                              }}
                            >
                              <UserCheck size={13} /> Active On Campus
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: 'var(--text-muted)',
                                fontSize: '0.78rem',
                                marginTop: '3px',
                              }}
                            >
                              <Clock size={13} /> Off Duty
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(212, 154, 91, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#191410',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Showing records specifically allocated to <strong style={{ color: 'var(--crema-gold)' }}>{branch.name}</strong> ({branch.code})
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onNavigateToTab && activeTab === 'students' && (
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  onClose();
                  onNavigateToTab('students', branch.id);
                }}
              >
                <span>Open in Students Registry</span>
                <ArrowRight size={14} />
              </button>
            )}

            {onNavigateToTab && activeTab === 'staff' && (
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  onClose();
                  onNavigateToTab('staff', branch.id);
                }}
              >
                <span>Open in Staff Directory</span>
                <ArrowRight size={14} />
              </button>
            )}

            <button
              className="btn btn-primary"
              onClick={onClose}
              style={{ padding: '8px 22px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
