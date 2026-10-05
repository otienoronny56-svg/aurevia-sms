import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { UserRole } from '../../types/database.types';
import { generateUniqueDefaultPassword } from '../../lib/security';
import {
  X, UserPlus, Key, Shield, Building, Coffee, Mail, Phone,
  CheckCircle2, Copy, Check, Eye, EyeOff, Sparkles, BookOpen,
  Sparkle, Briefcase, UserCheck, ShieldOff, Send
} from 'lucide-react';
import { PRODUCTION_PORTAL_URL } from '../../lib/domainConfig';
import { sendResendEmail } from '../../lib/resend';
import { generateStaffWelcomeEmailHtml } from '../../lib/emailTemplates';

interface AddStaffModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  presetBranchId?: string;
  isBranchManagerMode?: boolean;
}

export const AddStaffModal: React.FC<AddStaffModalProps> = ({
  onClose,
  onSuccess,
  presetBranchId,
  isBranchManagerMode = false,
}) => {
  const { currentProfile, branches, courses, cohorts, profiles, createStaffMember, sendBulkCommunication } = useApp();

  const isBranchManager = isBranchManagerMode || currentProfile?.role === 'branch_manager';
  const initialBranchId = isBranchManager && (currentProfile?.branch_id || presetBranchId)
    ? (currentProfile?.branch_id || presetBranchId)
    : (presetBranchId || branches[0]?.id || '');

  // Basic Details
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [branchId, setBranchId] = useState(initialBranchId);

  // Staff Category: System Login vs Support Staff
  const [staffCategory, setStaffCategory] = useState<'system' | 'support'>('system');
  
  // For System Staff
  const [role, setRole] = useState<UserRole>('instructor');
  const [specialty, setSpecialty] = useState('Lead Barista Trainer & Q-Grader');
  const [assignedCourseIds, setAssignedCourseIds] = useState<string[]>([courses[0]?.id || '']);

  // For Support Staff (No Login)
  const [department, setDepartment] = useState<'Hygiene & Facilities' | 'Marketing & Outreach' | 'Roastery & Logistics' | 'Security & Front Office'>('Hygiene & Facilities');
  const [jobTitle, setJobTitle] = useState('Lab Hygiene Steward & Machine Cleaner');

  // Auto Staff ID
  const nextStaffNum = profiles.filter((p) => p.role !== 'student').length + 1;
  const branchObj = branches.find((b) => b.id === branchId) || branches[0];
  const branchCode = branchObj?.code || 'NBO';
  const prefix = staffCategory === 'system' ? 'STF' : 'OPS';
  const defaultStaffId = `AUR/${branchCode}/${prefix}-${String(nextStaffNum).padStart(3, '0')}`;
  
  const [staffId, setStaffId] = useState(defaultStaffId);
  const [initialPassword, setInitialPassword] = useState(() => generateUniqueDefaultPassword('Staff'));
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProfile, setCreatedProfile] = useState<any | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsSentNotice, setSmsSentNotice] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentNotice, setEmailSentNotice] = useState<string | null>(null);

  // Generate distinct default password for each new staff member based on their name
  React.useEffect(() => {
    if (fullName.trim()) {
      setInitialPassword(generateUniqueDefaultPassword(fullName));
    }
  }, [fullName]);

  // Update staff ID prefix when branch or category changes
  React.useEffect(() => {
    const pfx = staffCategory === 'system' ? 'STF' : 'OPS';
    setStaffId(`AUR/${branchCode}/${pfx}-${String(nextStaffNum).padStart(3, '0')}`);
  }, [branchId, staffCategory, nextStaffNum, branchCode]);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'branch_manager') {
      setSpecialty('Campus Branch Manager');
    } else if (newRole === 'super_admin') {
      setSpecialty('Super Administrator');
    } else if (newRole === 'instructor') {
      setSpecialty('Lead Barista Trainer & Q-Grader');
    }
  };

  const handleToggleCourse = (cId: string) => {
    setAssignedCourseIds((prev) =>
      prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
    );
  };

  const handleCopyCredentials = () => {
    const roleLabel = (createdProfile?.role || role) === 'branch_manager'
      ? 'Campus Branch Manager'
      : (createdProfile?.role || role) === 'super_admin'
      ? 'Super Administrator'
      : (createdProfile?.job_title || specialty || 'Faculty Instructor');

    const text = `Aurevia Academy Portal Access\nStaff Member: ${fullName}\nRole: ${roleLabel}\nStaff ID / Login: ${staffId}\nBranch: ${branchObj?.name}\nPortal URL: ${PRODUCTION_PORTAL_URL}\n${staffCategory === 'system' ? `Login Identifier: ${staffId} or ${email}\nInitial Password: ${initialPassword}` : 'Access: Support Operations Staff (No Portal Login Needed)'}\nPlease sign in and change your password on first login.`;
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2500);
  };

  const handleSendPortalEmail = async () => {
    const targetEmail = createdProfile?.email || email;
    if (!targetEmail || targetEmail.includes('.local')) {
      alert('Please provide a valid email address to send credentials.');
      return;
    }
    setIsSendingEmail(true);
    try {
      const branchName = branchObj?.name || 'Aurevia Coffee Institute';
      const roleTitle = (createdProfile?.role || role) === 'branch_manager'
        ? 'Campus Branch Manager'
        : (createdProfile?.role || role) === 'super_admin'
        ? 'Super Administrator'
        : (createdProfile?.job_title || specialty || 'Instructor');

      const html = generateStaffWelcomeEmailHtml({
        staffName: createdProfile?.full_name || fullName,
        staffId: createdProfile?.staff_id || staffId,
        role: roleTitle,
        department: createdProfile?.department || (role === 'branch_manager' ? 'Campus Administration' : 'Academic & Training'),
        branchName,
        temporaryPassword: createdProfile?.initial_password || initialPassword,
        portalUrl: PRODUCTION_PORTAL_URL,
      });

      const res = await sendResendEmail({
        to: targetEmail,
        subject: `Welcome to Aurevia Specialty Coffee Academy - Your Portal Credentials (${createdProfile?.staff_id || staffId})`,
        html,
      });

      if (res.success) {
        setEmailSentNotice(`Welcome credentials email delivered to ${targetEmail}!`);
      } else {
        setEmailSentNotice(`Email queued for ${targetEmail}`);
      }
      setTimeout(() => setEmailSentNotice(null), 6000);
    } catch (e: any) {
      alert('Error sending welcome email: ' + e.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendPortalSms = async () => {
    if (!phone || phone.length < 8) {
      alert('Please enter a valid phone number for this staff member.');
      return;
    }
    setIsSendingSms(true);
    try {
      const roleLabel = (createdProfile?.role || role) === 'branch_manager' ? 'Branch Manager' : 'Staff';
      const msg = `Hello ${fullName}, your Aurevia Academy ${roleLabel} account is active. Portal: ${PRODUCTION_PORTAL_URL} | Login ID: ${staffId} | Initial Password: ${initialPassword}. Tripple T Systems.`;
      await sendBulkCommunication({
        channel: 'sms',
        purpose: 'admissions',
        messageContent: msg,
        audienceSegment: 'Staff Onboarding',
        recipients: [
          {
            name: fullName,
            phone,
            branchId,
            messageContent: msg,
          },
        ],
      });
      setSmsSentNotice(`Portal credentials SMS sent to ${phone}!`);
      setTimeout(() => setSmsSentNotice(null), 5000);
    } catch (e: any) {
      alert('Error sending SMS: ' + e.message);
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const isSystem = staffCategory === 'system';
      const finalRole: UserRole = isSystem ? role : 'instructor';

      const finalJobTitle = isSystem
        ? (specialty.trim() || (finalRole === 'branch_manager' ? 'Campus Branch Manager' : finalRole === 'super_admin' ? 'Super Administrator' : 'Lead Barista Trainer'))
        : jobTitle;

      const finalDepartment = isSystem
        ? (finalRole === 'branch_manager' ? 'Campus Operations' : finalRole === 'super_admin' ? 'Campus Operations' : 'Academic & Training')
        : department;

      const newStaff = await createStaffMember({
        full_name: fullName,
        email: email || `${staffId.toLowerCase().replace(/[^a-z0-9]/g, '')}@support.aurevia.local`,
        phone,
        national_id: nationalId,
        branch_id: branchId,
        role: finalRole,
        system_access: isSystem,
        department: finalDepartment,
        job_title: finalJobTitle,
        specialty: finalJobTitle,
        staff_id: staffId,
        initial_password: isSystem ? initialPassword : '',
        password_changed: false,
        assigned_courses: isSystem ? assignedCourseIds : [],
        is_active: true,
      });

      setCreatedProfile(newStaff);

      // Automatically dispatch welcome email if system staff with valid email
      if (isSystem && email && !email.includes('.local')) {
        handleSendPortalEmail().catch(() => {});
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Error registering staff member: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated)',
          }}
        >
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
                color: '#181310',
              }}
            >
              <UserPlus size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add Employee / Staff Member</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Register instructors, managers, or operational support staff (cleaners, marketers, technicians).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          {createdProfile ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(62, 114, 86, 0.2)',
                  border: '2px solid #6EE7B7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={36} color="#6EE7B7" />
              </div>

              <h4 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Staff Profile Registered!</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Employee profile active at <strong>{branchObj?.name}</strong>.
              </p>

              {/* Summary Card */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--crema-gold)',
                  padding: '20px',
                  maxWidth: '480px',
                  margin: '0 auto 24px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--crema-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Briefcase size={14} />
                    <span>EMPLOYEE HR SUMMARY</span>
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                    onClick={handleCopyCredentials}
                  >
                    {copiedCreds ? (
                      <>
                        <Check size={12} color="#6EE7B7" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy HR Record</span>
                      </>
                    )}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Staff Name:</span>
                    <span style={{ fontWeight: 600 }}>{createdProfile.full_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Staff Employee ID:</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--crema-gold)' }}>
                      {createdProfile.staff_id || staffId}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Role / Title:</span>
                    <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                      {createdProfile.role === 'branch_manager'
                        ? 'Campus Branch Manager'
                        : createdProfile.role === 'super_admin'
                        ? 'Super Administrator'
                        : (createdProfile.job_title || createdProfile.specialty || 'Staff Member')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>System Login Access:</span>
                    <span className={`badge badge-${createdProfile.system_access !== false ? 'approved' : 'pending'}`} style={{ fontSize: '0.7rem' }}>
                      {createdProfile.system_access !== false ? 'Enabled (Portal Login)' : 'Disabled (Operations / No Login)'}
                    </span>
                  </div>

                  {createdProfile.system_access !== false && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px', marginTop: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Default Password:</span>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#6EE7B7' }}>
                          {createdProfile.initial_password || initialPassword}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Academy Portal:</span>
                        <span style={{ fontWeight: 600, color: '#10B981', fontSize: '0.78rem' }}>
                          {PRODUCTION_PORTAL_URL}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {createdProfile.system_access !== false && (
                <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleSendPortalEmail}
                      disabled={isSendingEmail || !createdProfile?.email || createdProfile.email.includes('.local')}
                      style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Mail size={14} color="var(--crema-gold)" />
                      <span>{isSendingEmail ? 'Dispatching Email...' : 'Send Welcome Email'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleSendPortalSms}
                      disabled={isSendingSms || !phone}
                      style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Send size={14} color="var(--crema-gold)" />
                      <span>{isSendingSms ? 'Dispatching SMS...' : 'Send Portal Access SMS'}</span>
                    </button>
                  </div>

                  {emailSentNotice && (
                    <div style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 600 }}>
                      ✓ {emailSentNotice}
                    </div>
                  )}

                  {smsSentNotice && (
                    <div style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 600 }}>
                      ✓ {smsSentNotice}
                    </div>
                  )}
                </div>
              )}

              <button className="btn btn-primary" onClick={onClose}>
                Close & View Staff Directory
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* CATEGORY SELECTOR TABS */}
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ marginBottom: '8px' }}>Employee Classification *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div
                    onClick={() => setStaffCategory('system')}
                    style={{
                      background: staffCategory === 'system' ? 'rgba(212, 154, 91, 0.15)' : 'var(--bg-surface-elevated)',
                      border: `1.5px solid ${staffCategory === 'system' ? 'var(--crema-gold)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: staffCategory === 'system' ? 'rgba(212, 154, 91, 0.3)' : 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--crema-gold)',
                      }}
                    >
                      <Shield size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: staffCategory === 'system' ? 'var(--crema-gold)' : 'var(--text-primary)' }}>
                        Faculty & Management
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Instructors, Managers, Admins (Has Portal Login)
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setStaffCategory('support')}
                    style={{
                      background: staffCategory === 'support' ? 'rgba(110, 231, 183, 0.12)' : 'var(--bg-surface-elevated)',
                      border: `1.5px solid ${staffCategory === 'support' ? '#6EE7B7' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: staffCategory === 'support' ? 'rgba(110, 231, 183, 0.25)' : 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6EE7B7',
                      }}
                    >
                      <Briefcase size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: staffCategory === 'support' ? '#6EE7B7' : 'var(--text-primary)' }}>
                        Support & Operations
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Cleaners, Marketers, Logistics (No Login Needed)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 1: Personal Details */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--crema-gold)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={15} />
                  <span>1. Employee Personal Details</span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Full Legal Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Samuel Ouma"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number (M-Pesa / Payroll) *</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0711 234 567"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">National ID / Passport</label>
                    <input
                      type="text"
                      className="form-input"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="e.g. 29481023"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Academy Campus *</label>
                    {isBranchManager ? (
                      <input
                        type="text"
                        className="form-input"
                        value={`${branchObj?.name} (${branchObj?.city})`}
                        disabled
                        style={{
                          background: 'var(--bg-surface-elevated)',
                          color: 'var(--crema-gold)',
                          fontWeight: 600,
                          cursor: 'not-allowed',
                          border: '1px solid var(--border-medium)',
                        }}
                      />
                    ) : (
                      <select
                        className="form-select"
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                        required
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.city})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {staffCategory === 'system' ? (
                    <>
                      <div className="form-group">
                        <label className="form-label">System Role *</label>
                        <select
                          className="form-select"
                          value={role}
                          onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                          required
                        >
                          <option value="instructor">Instructor / Q-Grader Trainer</option>
                          {!isBranchManager && (
                            <>
                              <option value="branch_manager">Campus Branch Manager</option>
                              <option value="super_admin">Super Administrator</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Email Address *</label>
                        <input
                          type="email"
                          className="form-input"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="samuel@aureviacoffee.com"
                          required
                        />
                      </div>

                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Professional Specialty / Title</label>
                        <input
                          type="text"
                          className="form-input"
                          value={specialty}
                          onChange={(e) => setSpecialty(e.target.value)}
                          placeholder="e.g. Lead Barista Trainer & SCA Q-Grader / Master Roaster"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-group">
                        <label className="form-label">Operational Department *</label>
                        <select
                          className="form-select"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value as any)}
                          required
                        >
                          <option value="Hygiene & Facilities">Hygiene & Lab Facilities (Cleaners / Stewards)</option>
                          <option value="Marketing & Outreach">Marketing & Outreach (Field Agents / Promoters)</option>
                          <option value="Roastery & Logistics">Roastery & Logistics (Packaging / Storage)</option>
                          <option value="Security & Front Office">Security & Front Office (Attendants / Guards)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Job Title / Designation *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="e.g. Lab Hygiene Steward & Roastery Cleaner"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Email (Optional)</label>
                        <input
                          type="email"
                          className="form-input"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Optional for support staff"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* SECTION 2: System Login Credentials (Only if Faculty/System) */}
              {staffCategory === 'system' ? (
                <div style={{ marginBottom: '24px', background: 'rgba(212, 154, 91, 0.08)', border: '1px solid rgba(212, 154, 91, 0.25)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--crema-gold)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Key size={15} />
                    <span>2. Initial Login Credentials</span>
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <div className="form-group">
                      <label className="form-label">Assigned Staff Login ID *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={staffId}
                        onChange={(e) => setStaffId(e.target.value)}
                        style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--crema-gold)' }}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label className="form-label" style={{ margin: 0 }}>Unique Default Password</label>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => setInitialPassword(generateUniqueDefaultPassword(fullName || 'Staff'))}
                          style={{ fontSize: '0.72rem', color: 'var(--crema-gold)', padding: '2px 6px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Generate a new randomized unique default password"
                        >
                          <Sparkles size={11} /> Regenerate
                        </button>
                      </div>
                      <input
                        type="text"
                        className="form-input"
                        value={initialPassword}
                        readOnly
                        style={{ fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.3)', color: '#6EE7B7' }}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    * Each user receives their own unique generated default password. Once changed by the user, this default password is permanently invalidated and can never unlock the account again.
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '24px', background: 'rgba(110, 231, 183, 0.08)', border: '1px solid rgba(110, 231, 183, 0.25)', padding: '14px 18px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ShieldOff size={22} color="#6EE7B7" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#6EE7B7' }}>
                      No System Login Needed
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Assigned Employee ID: <strong style={{ color: 'var(--crema-gold)', fontFamily: 'var(--font-mono)' }}>{staffId}</strong>. This operational employee is registered for institutional records, shift attendance, and payroll.
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    'Registering...'
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>{staffCategory === 'system' ? 'Provision Faculty Account' : 'Register Support Employee'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
