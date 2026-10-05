import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import {
  Users, GraduationCap, Key, Copy, Check, Send, Search,
  RefreshCw, ShieldCheck, ExternalLink, CheckCircle2, Lock,
  Phone, Mail, Building2, AlertCircle, Sparkles, UserPlus, Trash2
} from 'lucide-react';
import { PRODUCTION_PORTAL_URL } from '../../lib/domainConfig';
import { INITIAL_PROFILES } from '../../lib/mockData';
import { Profile } from '../../types/database.types';
import { AddStaffModal } from '../modals/AddStaffModal';
import { StudentKYCModal } from '../modals/StudentKYCModal';
import { StaffPasswordModal } from '../modals/StaffPasswordModal';
import { sendResendEmail } from '../../lib/resend';
import { generateStaffWelcomeEmailHtml } from '../../lib/emailTemplates';

interface PortalCredentialsManagerProps {
  isBranchManagerMode?: boolean;
}

export const PortalCredentialsManager: React.FC<PortalCredentialsManagerProps> = ({
  isBranchManagerMode = false,
}) => {
  const {
    currentRole,
    currentProfile,
    profiles,
    students,
    cohorts,
    courses,
    branches,
    selectedBranchId,
    sendBulkCommunication,
    deleteStaffMember,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'instructors' | 'students'>('instructors');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'branch_manager' | 'instructor' | 'super_admin'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCohortFilter, setSelectedCohortFilter] = useState('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState(
    isBranchManagerMode && currentProfile.branch_id ? currentProfile.branch_id : 'ALL'
  );

  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [staffForPasswordChange, setStaffForPasswordChange] = useState<any | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<Profile | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingSmsId, setSendingSmsId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isBulkSending, setIsBulkSending] = useState(false);

  // Scope branches
  const effectiveBranchId = isBranchManagerMode && currentProfile.branch_id
    ? currentProfile.branch_id
    : selectedBranchFilter !== 'ALL'
      ? selectedBranchFilter
      : selectedBranchId !== 'ALL'
        ? selectedBranchId
        : 'ALL';

  // Staff & Faculty list (including branch managers, instructors, super admins)
  const staffList = profiles
    .filter((p) => p.role !== 'student')
    .filter((p) => roleFilter === 'ALL' || p.role === roleFilter)
    .filter((p) => effectiveBranchId === 'ALL' || p.branch_id === effectiveBranchId)
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.staff_id?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.specialty?.toLowerCase().includes(q) ||
        p.job_title?.toLowerCase().includes(q) ||
        p.role?.toLowerCase().includes(q)
      );
    });

  // Students list
  const studentsList = students
    .filter((s) => effectiveBranchId === 'ALL' || s.branch_id === effectiveBranchId)
    .filter((s) => {
      if (selectedCohortFilter === 'ALL') return true;
      // match cohort
      return true;
    })
    .map((s) => {
      const prof = profiles.find((p) => p.id === s.profile_id);
      return {
        ...s,
        profile: prof || s.profile,
      };
    })
    .filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const p = s.profile;
      return (
        p?.full_name?.toLowerCase().includes(q) ||
        p?.reg_number?.toLowerCase().includes(q) ||
        p?.email?.toLowerCase().includes(q) ||
        p?.phone?.toLowerCase().includes(q)
      );
    });

  const getStudentPassword = (prof?: Profile | null, stId?: string, regNo?: string): string => {
    const rKey = (regNo || prof?.reg_number || '').trim().toLowerCase();
    const eKey = (prof?.email || '').trim().toLowerCase();
    const pId = (prof?.id || stId || '').trim();

    const storedSeed =
      prof?.initial_password ||
      (pId ? localStorage.getItem('aur_user_pwd_seed_' + pId) : null) ||
      (rKey ? localStorage.getItem('aur_student_pwd_' + rKey) : null) ||
      (eKey ? localStorage.getItem('aur_student_pwd_' + eKey) : null) ||
      (pId ? localStorage.getItem('aur_student_pwd_' + pId.toLowerCase()) : null);

    if (storedSeed) return storedSeed;
    if (prof?.password_changed) return '••••••••';
    const initialMatch = INITIAL_PROFILES.find((ip) => ip.id === pId || (ip.email && ip.email.toLowerCase() === eKey));
    if (initialMatch?.initial_password) return initialMatch.initial_password;

    return 'Aur@2026#Student';
  };

  const getStaffPassword = (inst: Profile): string => {
    const rKey = (inst.staff_id || inst.reg_number || '').trim().toLowerCase();
    const eKey = (inst.email || '').trim().toLowerCase();
    const pId = (inst.id || '').trim();

    const storedSeed =
      inst.initial_password ||
      (pId ? localStorage.getItem('aur_staff_pwd_' + pId) : null) ||
      (eKey ? localStorage.getItem('aur_staff_pwd_' + eKey) : null) ||
      (rKey ? localStorage.getItem('aur_staff_pwd_' + rKey) : null);

    if (storedSeed) return storedSeed;
    if (inst.password_changed) return '••••••••';
    const initialMatch = INITIAL_PROFILES.find((ip) => ip.id === pId || (ip.email && ip.email.toLowerCase() === eKey));
    if (initialMatch?.initial_password) return initialMatch.initial_password;

    return 'Aur#2026!Staff';
  };

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleCopyCredentials = (name: string, loginId: string, pass: string) => {
    const text = `Aurevia Academy Portal Credentials\nName: ${name}\nPortal URL: ${PRODUCTION_PORTAL_URL}\nLogin Identifier: ${loginId}\nPassword: ${pass}\nPlease log in and change your password upon first entry.`;
    navigator.clipboard.writeText(text);
    setCopiedId(loginId);
    showNotification(`Credentials copied for ${name}!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendSingleSms = async (
    name: string,
    phone: string,
    loginId: string,
    pass: string,
    roleTitle: string,
    branchId: string
  ) => {
    if (!phone || phone.length < 8) {
      alert(`No valid phone number found for ${name}.`);
      return;
    }

    setSendingSmsId(loginId);
    try {
      const msg = `Hello ${name}, your Aurevia Academy Portal account is active. Login at: ${PRODUCTION_PORTAL_URL} | Username: ${loginId} | Password: ${pass}. Tripple T Systems.`;

      await sendBulkCommunication({
        channel: 'sms',
        purpose: 'admissions',
        messageContent: msg,
        audienceSegment: roleTitle === 'instructor' ? 'Instructors' : 'Students',
        recipients: [
          {
            name,
            phone,
            branchId,
            messageContent: msg,
          },
        ],
      });

      showNotification(`Portal credentials SMS sent to ${name} (${phone})!`);
    } catch (e: any) {
      alert('Error sending SMS: ' + e.message);
    } finally {
      setSendingSmsId(null);
    }
  };

  const handleSendSingleEmail = async (staff: Profile) => {
    if (!staff.email || staff.email.includes('.local')) {
      alert(`No valid email address found for ${staff.full_name}.`);
      return;
    }
    const loginId = staff.staff_id || staff.email;
    setSendingEmailId(loginId);
    try {
      const branchObj = branches.find((b) => b.id === staff.branch_id);
      const branchName = branchObj?.name || 'Aurevia Coffee Institute';
      const roleTitle = staff.role === 'branch_manager'
        ? 'Campus Branch Manager'
        : staff.role === 'super_admin'
        ? 'Super Administrator'
        : (staff.job_title || staff.specialty || 'Faculty Instructor');
      const pass = getStaffPassword(staff);

      const html = generateStaffWelcomeEmailHtml({
        staffName: staff.full_name,
        staffId: staff.staff_id || staff.reg_number || 'Staff',
        role: roleTitle,
        department: staff.department || (staff.role === 'branch_manager' ? 'Campus Administration' : 'Academic & Training'),
        branchName,
        temporaryPassword: pass,
        portalUrl: PRODUCTION_PORTAL_URL,
      });

      const res = await sendResendEmail({
        to: staff.email,
        subject: `Aurevia Academy Portal Credentials - ${roleTitle} (${staff.staff_id || 'Staff'})`,
        html,
      });

      if (res.success) {
        showNotification(`Welcome credentials email sent to ${staff.full_name} (${staff.email})!`);
      } else {
        showNotification(`Email queued for ${staff.full_name} (${staff.email})`);
      }
    } catch (e: any) {
      alert('Error sending email: ' + e.message);
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleBroadcastCohort = async () => {
    const targetStudents = studentsList.filter((s) => s.profile?.phone);
    if (targetStudents.length === 0) {
      alert('No students found with valid phone numbers in this view.');
      return;
    }

    const confirmMsg = `Send Academy Portal credentials SMS to ${targetStudents.length} trainees?`;
    if (!window.confirm(confirmMsg)) return;

    setIsBulkSending(true);
    try {
      const recipients = targetStudents.map((s) => {
        const p = s.profile;
        const loginId = p?.reg_number || p?.email || s.national_id_or_passport;
        const pass = getStudentPassword(p, s.id, p?.reg_number);
        return {
          name: p?.full_name || 'Student',
          phone: p?.phone || '',
          branchId: s.branch_id,
          messageContent: `Hello ${p?.full_name}, your Aurevia Academy Portal is ready. Portal: ${PRODUCTION_PORTAL_URL} | Reg No: ${loginId} | Pass: ${pass}. Tripple T.`,
        };
      });

      await sendBulkCommunication({
        channel: 'sms',
        purpose: 'admissions',
        messageContent: 'Aurevia Academy Portal Access Details',
        audienceSegment: 'Batch Portal Provisioning',
        recipients,
      });

      showNotification(`Successfully broadcast portal credentials to ${recipients.length} students!`);
    } catch (e: any) {
      alert('Error in bulk dispatch: ' + e.message);
    } finally {
      setIsBulkSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Notice */}
      {actionNotice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10B981',
            color: '#10B981',
            padding: '12px 18px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="glass-card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontSize: '0.72rem', fontWeight: 700 }}>
                PORTAL.AUREVIACOFFEEINSTITUTE
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="var(--crema-gold)" />
                <span>Academy Portal Credentials & Accounts Hub</span>
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              Instantly provision, monitor, copy, and SMS portal login accounts for Faculty Instructors and Trainees.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddStudentModal(true)}
              style={{ fontSize: '0.82rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <GraduationCap size={15} color="var(--crema-gold)" />
              <span>+ Admit Student</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddStaffModal(true)}
              style={{ fontSize: '0.82rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <UserPlus size={15} />
              <span>+ Create Teacher Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Teachers vs Students */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-surface-elevated)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            onClick={() => setActiveSubTab('instructors')}
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'instructors' ? 'var(--crema-gold)' : 'transparent',
              color: activeSubTab === 'instructors' ? '#181310' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Users size={14} />
            <span>Staff & Management ({staffList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('students')}
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'students' ? 'var(--crema-gold)' : 'transparent',
              color: activeSubTab === 'students' ? '#181310' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <GraduationCap size={14} />
            <span>Students & Trainees ({studentsList.length})</span>
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={`Search ${activeSubTab === 'instructors' ? 'staff & managers' : 'trainees'} by name, ID, email...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px 6px 30px',
                fontSize: '0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {activeSubTab === 'students' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleBroadcastCohort}
              disabled={isBulkSending || studentsList.length === 0}
              style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Send size={13} color="var(--crema-gold)" />
              <span>{isBulkSending ? 'Broadcasting SMS...' : 'Broadcast Portal SMS to Listed'}</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: TEACHERS & MANAGEMENT */}
      {activeSubTab === 'instructors' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          {/* Role Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Role Filter:</span>
            {[
              { id: 'ALL', label: `All Staff (${profiles.filter((p) => p.role !== 'student').length})` },
              { id: 'branch_manager', label: `👔 Campus Managers (${profiles.filter((p) => p.role === 'branch_manager').length})` },
              { id: 'instructor', label: `👨‍🏫 Instructors (${profiles.filter((p) => p.role === 'instructor').length})` },
              { id: 'super_admin', label: `🛡️ Super Admins (${profiles.filter((p) => p.role === 'super_admin').length})` },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setRoleFilter(pill.id as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: roleFilter === pill.id ? '1px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
                  background: roleFilter === pill.id ? 'rgba(212, 154, 91, 0.18)' : 'transparent',
                  color: roleFilter === pill.id ? 'var(--crema-gold)' : 'var(--text-secondary)',
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="table-container" style={{ width: '100%', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role & Designation</th>
                  <th>Staff ID</th>
                  <th>Campus</th>
                  <th>Portal Password Status</th>
                  <th style={{ textAlign: 'right' }}>Portal Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((inst) => {
                  const sBranch = branches.find((b) => b.id === inst.branch_id);
                  const loginId = inst.staff_id || inst.reg_number || inst.email;
                  const displayPass = getStaffPassword(inst);

                  const roleBadge = inst.role === 'branch_manager'
                    ? { label: 'Branch Manager', bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' }
                    : inst.role === 'super_admin'
                    ? { label: 'Super Admin', bg: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', border: 'rgba(168, 85, 247, 0.3)' }
                    : { label: 'Instructor', bg: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: 'rgba(16, 185, 129, 0.3)' };

                  return (
                    <tr key={inst.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{inst.full_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{inst.email} • {inst.phone}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: roleBadge.bg,
                              color: roleBadge.color,
                              border: `1px solid ${roleBadge.border}`,
                              width: 'fit-content',
                            }}
                          >
                            {roleBadge.label}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {inst.specialty || inst.job_title || 'Campus Staff'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--crema-gold)', fontWeight: 700 }}>
                          {inst.staff_id || inst.reg_number || (inst.email?.includes('eigs') ? 'AUR/NBO/STF-001' : inst.email?.includes('ronny') ? 'AUR/NBO/STF-002' : inst.email?.includes('ratieno') ? 'AUR/NBO/STF-003' : 'AUR/NBO/STF-004')}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{sBranch?.name || 'All Campuses / HQ'}</td>
                      <td>
                        {inst.password_changed ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#10B981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            <CheckCircle2 size={12} /> Custom Password Active
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--crema-gold)', background: 'rgba(212, 154, 91, 0.15)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                              {displayPass}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>(Default PIN)</span>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleCopyCredentials(inst.full_name, loginId, displayPass)}
                            style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Copy Portal Login & Password"
                          >
                            {copiedId === loginId ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                            <span>Copy</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleSendSingleEmail(inst)}
                            disabled={sendingEmailId === loginId || !inst.email || inst.email.includes('.local')}
                            style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Send Welcome Email with Credentials"
                          >
                            <Mail size={12} color="var(--crema-gold)" />
                            <span>{sendingEmailId === loginId ? 'Sending...' : 'Email'}</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleSendSingleSms(inst.full_name, inst.phone || '', loginId, displayPass, inst.role, inst.branch_id || '')}
                            disabled={sendingSmsId === loginId || !inst.phone}
                            style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Send Portal Access SMS"
                          >
                            <Send size={12} />
                            <span>{sendingSmsId === loginId ? 'Sending...' : 'SMS'}</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setStaffForPasswordChange(inst)}
                            style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Reset Portal Password"
                          >
                            <Lock size={12} />
                            <span>Reset</span>
                          </button>

                          {currentRole === 'super_admin' && inst.role !== 'super_admin' && (
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() => setStaffToDelete(inst)}
                              style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Delete Faculty Staff Account"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {staffList.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No staff or management members found matching this query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS & TRAINEES */}
      {activeSubTab === 'students' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div className="table-container" style={{ width: '100%', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Trainee / Student</th>
                  <th>Student Reg No</th>
                  <th>Campus</th>
                  <th>Portal Password Status</th>
                  <th style={{ textAlign: 'right' }}>Portal Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentsList.map((st) => {
                  const prof = st.profile;
                  const sBranch = branches.find((b) => b.id === st.branch_id);
                  const regNo = prof?.reg_number || st.national_id_or_passport || 'REG-PENDING';
                  const displayPass = getStudentPassword(prof, st.id, regNo);
                  const loginId = regNo;

                  return (
                    <tr key={st.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{prof?.full_name || 'Trainee'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {prof?.email || 'No email'} • {prof?.phone || 'No phone'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--crema-gold)', fontWeight: 700 }}>
                          {regNo}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{sBranch?.name || 'Aurevia Hub'}</td>
                      <td>
                        {prof?.password_changed ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#10B981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            <CheckCircle2 size={12} /> Custom Password Set
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--crema-gold)', background: 'rgba(212, 154, 91, 0.15)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                              {displayPass}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>(Default PIN)</span>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleCopyCredentials(prof?.full_name || 'Student', loginId, displayPass)}
                            style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Copy Portal Login & Password"
                          >
                            {copiedId === loginId ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                            <span>Copy</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleSendSingleSms(prof?.full_name || 'Student', prof?.phone || '', loginId, displayPass, 'student', st.branch_id)}
                            disabled={sendingSmsId === loginId || !prof?.phone}
                            style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Send Portal Access SMS"
                          >
                            <Send size={12} />
                            <span>{sendingSmsId === loginId ? 'Sending...' : 'SMS'}</span>
                          </button>

                          {prof && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => setStaffForPasswordChange(prof)}
                              style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Reset Portal Password"
                            >
                              <Lock size={12} />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {studentsList.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No trainees found matching this query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddStaffModal && (
        <AddStaffModal
          onClose={() => setShowAddStaffModal(false)}
          onSuccess={() => {
            setShowAddStaffModal(false);
            showNotification('Teacher account created successfully!');
          }}
          isBranchManagerMode={isBranchManagerMode}
        />
      )}

      {showAddStudentModal && (
        <StudentKYCModal
          onClose={() => setShowAddStudentModal(false)}
          onSuccess={(regNo) => {
            setShowAddStudentModal(false);
            showNotification(`Trainee admitted with Reg No: ${regNo}!`);
          }}
        />
      )}

      {staffForPasswordChange && (
        <StaffPasswordModal
          staff={staffForPasswordChange}
          onClose={() => setStaffForPasswordChange(null)}
          onSuccess={() => {
            setStaffForPasswordChange(null);
            showNotification(`Password updated for ${staffForPasswordChange.full_name}!`);
          }}
        />
      )}

      {/* Staff Deletion Confirmation */}
      {staffToDelete && (
        <div className="modal-overlay" onClick={() => setStaffToDelete(null)} style={{ zIndex: 1200 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--cherry-red)', marginBottom: '12px' }}>
              Remove Staff Account?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              Are you sure you want to remove <strong>{staffToDelete.full_name}</strong> ({staffToDelete.staff_id || staffToDelete.email}) from the faculty directory?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setStaffToDelete(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  if (staffToDelete) {
                    await deleteStaffMember(staffToDelete.id);
                    showNotification(`Staff account ${staffToDelete.full_name} removed.`);
                    setStaffToDelete(null);
                  }
                }}
              >
                Yes, Remove Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
