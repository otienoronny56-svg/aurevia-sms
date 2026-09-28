import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { Profile } from '../../types/database.types';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  X,
  AlertCircle,
  FileText,
  ShieldCheck,
  Building2,
  CalendarCheck,
  Info
} from 'lucide-react';

interface RecordStaffLeaveModalProps {
  presetStaffId?: string;
  presetBranchId?: string;
  isBranchManagerMode?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RecordStaffLeaveModal: React.FC<RecordStaffLeaveModalProps> = ({
  presetStaffId,
  presetBranchId,
  isBranchManagerMode = false,
  onClose,
  onSuccess,
}) => {
  const { currentProfile, profiles, branches, leaveRequests, submitLeaveRequest } = useApp();

  const managerBranchId = presetBranchId || (isBranchManagerMode ? currentProfile.branch_id : undefined);

  // Eligible staff members (instructors, managers, staff)
  const eligibleStaff = useMemo(() => {
    return profiles.filter((p) => {
      if (p.role === 'student') return false;
      if (managerBranchId && p.branch_id && p.branch_id !== managerBranchId) return false;
      return true;
    });
  }, [profiles, managerBranchId]);

  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    presetStaffId || eligibleStaff[0]?.id || ''
  );

  const selectedStaff = profiles.find((p) => p.id === selectedStaffId);
  const staffBranch = branches.find((b) => b.id === selectedStaff?.branch_id) || branches[0];

  const todayStr = new Date().toISOString().split('T')[0];
  const [leaveType, setLeaveType] = useState<
    'annual' | 'sick' | 'short' | 'compassionate' | 'off_day' | 'maternity_paternity' | 'study'
  >('annual');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [reason, setReason] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Calculate days between start and end (inclusive)
  const calculatedDays = useMemo(() => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        return 1;
      }
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    } catch {
      return 1;
    }
  }, [startDate, endDate]);

  // Calculate statutory annual leave taken so far for selected staff (21 days statutory per Kenyan Employment Act)
  const staffApprovedAnnualDaysTaken = useMemo(() => {
    if (!selectedStaffId) return 0;
    return leaveRequests
      .filter((l) => l.profile_id === selectedStaffId && l.leave_type === 'annual' && l.status === 'approved')
      .reduce((sum, l) => sum + l.days_count, 0);
  }, [leaveRequests, selectedStaffId]);

  const statutoryAllowance = 21;
  const remainingAnnualLeave = Math.max(0, statutoryAllowance - staffApprovedAnnualDaysTaken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setErrorMessage('Please select a staff member');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setErrorMessage('End date cannot be earlier than start date');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await submitLeaveRequest({
        profileId: selectedStaffId,
        branchId: selectedStaff?.branch_id || managerBranchId || branches[0].id,
        leaveType,
        startDate,
        endDate,
        daysCount: calculatedDays,
        reason: reason || `${leaveType.toUpperCase()} leave registered by ${currentProfile.full_name}`,
        status: autoApprove ? 'approved' : 'pending',
        reviewNotes: autoApprove ? `Directly approved by ${currentProfile.full_name} (${currentProfile.role})` : undefined,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error recording leave request');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(212, 154, 91, 0.12) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'var(--crema-gold)',
                color: '#181310',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Record Staff Leave / Off-Day</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {staffBranch?.name || 'Aurevia Academy Campus'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-icon" style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {errorMessage && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.80rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Staff Selector */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={13} style={{ color: 'var(--crema-gold)' }} />
              Staff Member
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="form-input"
              required
            >
              {eligibleStaff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.full_name} ({st.role.replace('_', ' ').toUpperCase()}) - {st.email}
                </option>
              ))}
            </select>
          </div>

          {/* Statutory 21-Day Allowance Card */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px',
              fontSize: '0.80rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Statutory Annual Leave Entitlement</span>
              <span style={{ fontWeight: 700, color: 'var(--crema-gold)' }}>21 Days / Year</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              <span>Taken this year: {staffApprovedAnnualDaysTaken} days</span>
              <span>
                Remaining: <strong style={{ color: remainingAnnualLeave > 5 ? '#10B981' : '#EF4444' }}>{remainingAnnualLeave} days</strong>
              </span>
            </div>
          </div>

          {/* 2. Leave Category */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Leave Category / Reason Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {[
                { id: 'annual', label: '🏖️ Annual Leave (21d)', desc: 'Official annual vacation' },
                { id: 'off_day', label: '⏱️ Off-Day / Rest', desc: 'Roster rest day / shift comp' },
                { id: 'sick', label: '🤒 Certified Sick Leave', desc: 'Medical / illness recovery' },
                { id: 'compassionate', label: '🕊️ Compassionate', desc: 'Family bereavement / emergency' },
                { id: 'study', label: '📚 Study & Calibration', desc: 'Specialty coffee expo & exams' },
                { id: 'maternity_paternity', label: '👶 Maternity / Paternity', desc: 'Parental statutory leave' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLeaveType(item.id as any)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: leaveType === item.id ? '2px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
                    background: leaveType === item.id ? 'rgba(212, 154, 91, 0.12)' : 'var(--bg-surface-elevated)',
                    color: leaveType === item.id ? 'var(--crema-gold)' : 'var(--text-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>{item.label}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (new Date(endDate) < new Date(e.target.value)) {
                    setEndDate(e.target.value);
                  }
                }}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                required
              />
            </div>
          </div>

          {/* Days summary pill */}
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(212, 154, 91, 0.10)',
              border: '1px solid rgba(212, 154, 91, 0.25)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.78rem',
              marginBottom: '14px',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Total Time-Off Duration:</span>
            <span style={{ fontWeight: 700, color: 'var(--crema-gold)' }}>
              {calculatedDays} {calculatedDays === 1 ? 'Working Day' : 'Working Days'}
            </span>
          </div>

          {/* 4. Reason / Justification */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Official Purpose / Cover Notes</label>
            <textarea
              className="form-input"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Scheduled annual leave. Lab classes will be covered by peer instructor."
            />
          </div>

          {/* 5. Direct Approval Toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              marginBottom: '20px',
            }}
          >
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              style={{ accentColor: 'var(--crema-gold)', width: '16px', height: '16px' }}
            />
            <span>Approve & activate immediately in duty roster</span>
          </label>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <CheckCircle2 size={14} />
              <span>{isSubmitting ? 'Recording...' : 'Record & Save Leave'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
