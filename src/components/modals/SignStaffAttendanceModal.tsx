import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { Profile, StaffClockIn } from '../../types/database.types';
import { X, Clock, CheckCircle2, BookOpen, UserCheck, Calendar, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

interface SignStaffAttendanceModalProps {
  staff: Profile;
  branchId: string;
  selectedDate: string;
  existingClockIn?: StaffClockIn;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SignStaffAttendanceModal: React.FC<SignStaffAttendanceModalProps> = ({
  staff,
  branchId,
  selectedDate,
  existingClockIn,
  onClose,
  onSuccess,
}) => {
  const { currentProfile, recordStaffAttendanceByManager } = useApp();

  const isSelfSigning = staff.id === currentProfile?.id || staff.role === 'branch_manager';

  const [dutyDate, setDutyDate] = useState(selectedDate || new Date().toISOString().split('T')[0]);

  const existingInTime = existingClockIn?.clock_in
    ? new Date(existingClockIn.clock_in).toTimeString().slice(0, 5)
    : '08:00';
  const existingOutTime = existingClockIn?.clock_out
    ? new Date(existingClockIn.clock_out).toTimeString().slice(0, 5)
    : '';

  const [timeIn, setTimeIn] = useState(existingInTime || '08:00');
  const [timeOut, setTimeOut] = useState(existingOutTime || '');
  const [dutyStatus, setDutyStatus] = useState<'present' | 'completed' | 'late' | 'half_day' | 'absent' | 'on_leave'>(
    existingClockIn?.clock_out ? 'completed' : 'present'
  );

  const defaultNote = isSelfSigning
    ? 'Manager on-site physical shift verified'
    : 'Transcribed from campus physical reception register';

  const [locationNotes, setLocationNotes] = useState(
    existingClockIn?.location_notes?.replace(/^[A-Z_]+:\s*/, '') || defaultNote
  );
  const [isSaving, setIsSaving] = useState(false);

  // Compute shift duration live
  const calculatedDuration = useMemo(() => {
    if (!timeIn || !timeOut) return null;
    const [inH, inM] = timeIn.split(':').map(Number);
    const [outH, outM] = timeOut.split(':').map(Number);
    if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return null;

    let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Cross-midnight shift

    const hrs = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hrs} hr${hrs !== 1 ? 's' : ''} ${mins > 0 ? `${mins} min${mins !== 1 ? 's' : ''}` : ''}`;
  }, [timeIn, timeOut]);

  // Quick preset buttons
  const applyPreset = (inT: string, outT: string, status: 'present' | 'completed' | 'half_day') => {
    setTimeIn(inT);
    setTimeOut(outT);
    setDutyStatus(status);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Build ISO strings for dutyDate + time
      const clockInISO = timeIn ? new Date(`${dutyDate}T${timeIn}:00`).toISOString() : new Date().toISOString();
      const clockOutISO = timeOut ? new Date(`${dutyDate}T${timeOut}:00`).toISOString() : undefined;

      const auditPrefix = isSelfSigning
        ? `[MANAGER SELF-LOGGED: ${currentProfile?.full_name || 'Branch Manager'}]`
        : `[VERIFIED BY MANAGER: ${currentProfile?.full_name || 'Manager'}]`;

      const finalNotes = `${dutyStatus.toUpperCase()}: ${auditPrefix} ${locationNotes.trim()}`;

      await recordStaffAttendanceByManager({
        profileId: staff.id,
        branchId: branchId,
        workDate: dutyDate,
        clockIn: clockInISO,
        clockOut: clockOutISO,
        locationNotes: finalNotes,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert('Error updating staff attendance log: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '540px', padding: '24px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                background: isSelfSigning
                  ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#181310',
                fontWeight: 700,
              }}
            >
              {isSelfSigning ? <ShieldCheck size={20} color="#FFFFFF" /> : <BookOpen size={20} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {isSelfSigning ? 'Log My Manager Attendance' : 'Sign Staff Physical Logbook'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {staff.full_name} • {staff.staff_id || staff.reg_number || 'Staff'} ({staff.job_title || staff.specialty || (staff.role === 'branch_manager' ? 'Branch Manager' : staff.role)})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Manager Self-Sign Audit Banner */}
        {isSelfSigning && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.10)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <ShieldCheck size={18} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <strong style={{ color: '#10B981' }}>Executive Self-Sign Mode Active:</strong> This entry records your personal duty attendance from the physical logbook. It will be stamped with an official <em>"Manager Self-Logged"</em> audit trail visible to the Super Admin Director.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Duty Date Picker */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '0.80rem', color: 'var(--text-muted)', fontWeight: 600 }}>Shift Date:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={14} color="var(--crema-gold)" />
              <input
                type="date"
                className="input-field"
                value={dutyDate}
                onChange={(e) => setDutyDate(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '4px 8px', fontWeight: 600 }}
                required
              />
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '6px' }}>
              ⚡ Fast Shift Presets (From Book)
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.70rem', padding: '4px 8px' }}
                onClick={() => applyPreset('08:00', '17:00', 'completed')}
              >
                Standard (08:00 - 17:00)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.70rem', padding: '4px 8px' }}
                onClick={() => applyPreset('07:30', '16:30', 'completed')}
              >
                Early Lab (07:30 - 16:30)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.70rem', padding: '4px 8px' }}
                onClick={() => applyPreset('08:00', '13:00', 'half_day')}
              >
                Morning Half-Day (08:00 - 13:00)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.70rem', padding: '4px 8px' }}
                onClick={() => applyPreset('08:00', '', 'present')}
              >
                Signed In Only (Still On Duty)
              </button>
            </div>
          </div>

          {/* Duty Status */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Duty Status *</label>
            <select
              className="form-select"
              value={dutyStatus}
              onChange={(e) => setDutyStatus(e.target.value as any)}
              required
            >
              <option value="completed">Shift Completed (Signed In & Out from Book)</option>
              <option value="present">Present (Signed In, Shift Currently Active)</option>
              <option value="late">Late Reporting (Signed In with Delay)</option>
              <option value="half_day">Half Day Duty</option>
              <option value="absent">Absent / Did Not Report</option>
              <option value="on_leave">Official Leave / Approved Off-Duty</option>
            </select>
          </div>

          {/* Time In and Time Out Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.78rem' }}>
                Book Time In (Arrival) *
              </label>
              <input
                type="time"
                className="form-input"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.78rem' }}>
                Book Time Out (Departure)
              </label>
              <input
                type="time"
                className="form-input"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                placeholder="--:--"
              />
            </div>
          </div>

          {/* Calculated Duration Preview */}
          {calculatedDuration && (
            <div
              style={{
                background: 'rgba(212, 154, 91, 0.1)',
                border: '1px solid rgba(212, 154, 91, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Computed Shift Duration:</span>
              <span style={{ fontWeight: 700, color: 'var(--crema-gold)', fontFamily: 'var(--font-mono)' }}>
                ⏱️ {calculatedDuration}
              </span>
            </div>
          )}

          {/* Manager Notes */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>
              Manager's Logbook Notes / Verification
            </label>
            <input
              type="text"
              className="form-input"
              value={locationNotes}
              onChange={(e) => setLocationNotes(e.target.value)}
              placeholder="e.g. Page 14 morning book entry, signed in at reception"
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? (
                'Saving...'
              ) : (
                <>
                  <UserCheck size={16} />
                  <span>{isSelfSigning ? 'Confirm My Attendance' : 'Save Logbook Record'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
