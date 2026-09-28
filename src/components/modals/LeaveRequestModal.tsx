import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Calendar, CheckCircle2, FileText, X } from 'lucide-react';

interface LeaveRequestModalProps {
  onClose: () => void;
}

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({ onClose }) => {
  const { submitLeaveRequest } = useApp();

  const [leaveType, setLeaveType] = useState<'annual' | 'sick' | 'short' | 'compassionate'>('short');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [daysCount, setDaysCount] = useState(1);
  const [reason, setReason] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitLeaveRequest({
      leaveType,
      startDate,
      endDate,
      daysCount,
      reason,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(212, 154, 91, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={18} color="var(--crema-gold)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Staff Leave Application</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Faculty & Operations Leave Request
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

        <div style={{ padding: '24px' }}>
          {savedSuccess ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <CheckCircle2 size={48} color="#6EE7B7" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '1.2rem' }}>Leave Request Submitted!</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Sent to Branch Manager / Super Admin for approval.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Leave Category</label>
                <select
                  className="form-select"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                >
                  <option value="short">Short Leave (1 - 2 days)</option>
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick / Medical Leave</option>
                  <option value="compassionate">Compassionate Leave</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
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
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Working Days</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    className="form-input"
                    value={daysCount}
                    onChange={(e) => setDaysCount(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason / Cover Arrangements</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Attending Coffee Expo in Kigali. Practical cupping covered by Assistant Instructor."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>
                  <span>Submit Leave Request</span>
                </button>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
