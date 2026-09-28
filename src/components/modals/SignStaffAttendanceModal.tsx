import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Profile, StaffClockIn } from '../../types/database.types';
import { X, Clock, CheckCircle2, BookOpen, UserCheck, Calendar } from 'lucide-react';

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
  const { recordStaffAttendanceByManager } = useApp();

  const nowTime = new Date().toTimeString().slice(0, 5); // "08:30"
  const existingInTime = existingClockIn?.clock_in
    ? new Date(existingClockIn.clock_in).toTimeString().slice(0, 5)
    : '08:00';
  const existingOutTime = existingClockIn?.clock_out
    ? new Date(existingClockIn.clock_out).toTimeString().slice(0, 5)
    : '';

  const [timeIn, setTimeIn] = useState(existingInTime || '08:00');
  const [timeOut, setTimeOut] = useState(existingOutTime || '');
  const [dutyStatus, setDutyStatus] = useState<'present' | 'late' | 'absent' | 'on_leave'>('present');
  const [locationNotes, setLocationNotes] = useState(
    existingClockIn?.location_notes || 'Signed physical logbook at reception'
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Build ISO strings for selectedDate + timeIn
      const clockInISO = timeIn ? new Date(`${selectedDate}T${timeIn}:00`).toISOString() : new Date().toISOString();
      const clockOutISO = timeOut ? new Date(`${selectedDate}T${timeOut}:00`).toISOString() : undefined;

      await recordStaffAttendanceByManager({
        profileId: staff.id,
        branchId: branchId,
        workDate: selectedDate,
        clockIn: clockInISO,
        clockOut: clockOutISO,
        locationNotes: `${dutyStatus.toUpperCase()}: ${locationNotes}`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert('Error updating staff attendance: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#181310',
              }}
            >
              <BookOpen size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Sign Staff Attendance Logbook</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {staff.full_name} • {staff.staff_id || 'Staff'} ({staff.job_title || staff.specialty || staff.role})
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

        <form onSubmit={handleSubmit}>
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Duty Date:</div>
            <div style={{ fontWeight: 700, color: 'var(--crema-gold)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
              <Calendar size={14} />
              <span>{selectedDate}</span>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Duty Status *</label>
            <select
              className="form-select"
              value={dutyStatus}
              onChange={(e) => setDutyStatus(e.target.value as any)}
              required
            >
              <option value="present">Present (On Duty as per Book)</option>
              <option value="late">Late Reporting</option>
              <option value="absent">Absent / Did Not Report</option>
              <option value="on_leave">Approved Leave / Off-Duty</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Book Sign-In Time (Time In) *</label>
              <input
                type="time"
                className="form-input"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Book Sign-Out Time (Time Out)</label>
              <input
                type="time"
                className="form-input"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                placeholder="--:--"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Manager's Logbook Notes</label>
            <input
              type="text"
              className="form-input"
              value={locationNotes}
              onChange={(e) => setLocationNotes(e.target.value)}
              placeholder="e.g. Signed physical book at 08:05 AM, assigned to Lab 1"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? (
                'Saving...'
              ) : (
                <>
                  <UserCheck size={16} />
                  <span>Confirm Logbook Entry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
