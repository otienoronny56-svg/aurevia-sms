import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { Calendar, CheckCircle2, FileText, X, Clock, AlertCircle, ShieldCheck } from 'lucide-react';

interface LeaveRequestModalProps {
  onClose: () => void;
}

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({ onClose }) => {
  const { currentProfile, leaveRequests, submitLeaveRequest } = useApp();

  const [activeTab, setActiveTab] = useState<'apply' | 'my_requests'>('apply');
  const [leaveType, setLeaveType] = useState<'off_day' | 'short' | 'annual' | 'sick' | 'compassionate'>('off_day');
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [reason, setReason] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculated working days
  const calculatedDays = useMemo(() => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 1;
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch {
      return 1;
    }
  }, [startDate, endDate]);

  // My requests & statutory balance
  const myRequests = useMemo(() => {
    return leaveRequests.filter((l) => l.profile_id === currentProfile.id);
  }, [leaveRequests, currentProfile]);

  const annualDaysTaken = useMemo(() => {
    return myRequests
      .filter((l) => l.leave_type === 'annual' && l.status === 'approved')
      .reduce((sum, l) => sum + l.days_count, 0);
  }, [myRequests]);

  const remainingAnnual = Math.max(0, 21 - annualDaysTaken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitLeaveRequest({
        leaveType,
        startDate,
        endDate,
        daysCount: calculatedDays,
        reason,
      });

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1400);
    } catch (err) {
      alert('Error submitting request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '540px', padding: 0, overflow: 'hidden' }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(180deg, #1E1712 0%, #17120E 100%)',
            borderBottom: '1px solid rgba(212, 154, 91, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(212, 154, 91, 0.2), rgba(212, 154, 91, 0.05))',
                border: '1px solid rgba(212, 154, 91, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--crema-gold)',
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#F8F5F1' }}>
                Leave & Off-Day Application
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {currentProfile.full_name} • Statutory 21-Day Annual Entitlement
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div
          style={{
            display: 'flex',
            background: '#16120E',
            borderBottom: '1px solid rgba(212, 154, 91, 0.12)',
            padding: '8px 24px',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('apply')}
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '8px',
              border: activeTab === 'apply' ? '1px solid var(--crema-gold)' : '1px solid transparent',
              background: activeTab === 'apply' ? 'rgba(212, 154, 91, 0.15)' : 'transparent',
              color: activeTab === 'apply' ? 'var(--crema-gold)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            New Application
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_requests')}
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '8px',
              border: activeTab === 'my_requests' ? '1px solid var(--crema-gold)' : '1px solid transparent',
              background: activeTab === 'my_requests' ? 'rgba(212, 154, 91, 0.15)' : 'transparent',
              color: activeTab === 'my_requests' ? 'var(--crema-gold)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>My Requests</span>
            <span
              style={{
                fontSize: '0.68rem',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                padding: '1px 6px',
                borderRadius: '8px',
              }}
            >
              {myRequests.length}
            </span>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px', maxHeight: '75vh', overflowY: 'auto', background: '#181310' }}>
          {activeTab === 'apply' ? (
            savedSuccess ? (
              <div style={{ textAlign: 'center', padding: '36px 0' }}>
                <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 14px' }} />
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px', color: '#F8F5F1' }}>
                  Leave Request Submitted!
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Sent to Branch Manager / Directorate for review and approval.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Statutory Balance Indicator */}
                <div
                  style={{
                    background: '#1F1813',
                    border: '1px solid rgba(212, 154, 91, 0.25)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Annual Leave Entitlement (Kenya Statutory)
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      21 Days / Year Standard
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: remainingAnnual > 5 ? '#10B981' : '#EF4444',
                        background: remainingAnnual > 5 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {remainingAnnual} Days Left
                    </span>
                  </div>
                </div>

                {/* Leave Category Selector */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                    Leave Category
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {[
                      { id: 'off_day', label: '⏱️ Off-Day / Rest', desc: 'Roster rest day / shift comp' },
                      { id: 'annual', label: '🏖️ Annual Leave (21d)', desc: 'Official annual vacation' },
                      { id: 'short', label: '⚡ Short Leave', desc: '1 to 2 working days' },
                      { id: 'sick', label: '🤒 Sick / Medical', desc: 'Illness recovery' },
                      { id: 'compassionate', label: '🕊️ Compassionate', desc: 'Family emergency' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLeaveType(item.id as any)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: leaveType === item.id ? '1.5px solid var(--crema-gold)' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: leaveType === item.id ? 'rgba(212, 154, 91, 0.15)' : '#1B1411',
                          color: leaveType === item.id ? 'var(--crema-gold)' : 'var(--text-secondary)',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.78rem' }}>{item.label}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dates & Working Days */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (new Date(endDate) < new Date(e.target.value)) setEndDate(e.target.value);
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Duration Badge */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(212, 154, 91, 0.1)',
                    border: '1px solid rgba(212, 154, 91, 0.25)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.78rem',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>Calculated Duration:</span>
                  <span style={{ fontWeight: 800, color: 'var(--crema-gold)' }}>
                    {calculatedDays} {calculatedDays === 1 ? 'Working Day' : 'Working Days'}
                  </span>
                </div>

                {/* Justification */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                    Reason & Station Handover Plan
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Attending Coffee Expo in Kigali. Practical sensory session will be covered by Assistant Instructor."
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '10px', fontSize: '0.84rem', fontWeight: 700 }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '10px 18px' }}>
                    Cancel
                  </button>
                </div>
              </form>
            )
          ) : (
            /* My Requests History */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
                  <Clock size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No past leave applications recorded.</p>
                </div>
              ) : (
                myRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      background: '#1F1813',
                      border: '1px solid rgba(212, 154, 91, 0.2)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color: 'var(--crema-gold)',
                        }}
                      >
                        {req.leave_type.replace('_', ' ')} • {req.days_count} d
                      </span>
                      <span
                        className={`badge badge-${
                          req.status === 'approved' ? 'paid' : req.status === 'rejected' ? 'danger' : 'pending'
                        }`}
                        style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                      >
                        {req.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      📅 {req.start_date} to {req.end_date}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                      "{req.reason}"
                    </div>
                    {req.review_notes && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--crema-gold)', marginTop: '4px' }}>
                        💬 <strong>Management Note:</strong> {req.review_notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

