import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Course } from '../../types/database.types';
import {
  AlertTriangle,
  Trash2,
  BookOpen,
  Calendar,
  GraduationCap,
  X,
  CreditCard,
  AlertCircle
} from 'lucide-react';

interface DeleteCourseModalProps {
  course: Course;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DeleteCourseModal: React.FC<DeleteCourseModalProps> = ({
  course,
  onClose,
  onSuccess,
}) => {
  const { cohorts, enrollments, deleteCourse } = useApp();

  const [confirmText, setConfirmText] = useState('');
  const [understoodCheckbox, setUnderstoodCheckbox] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Impact metrics
  const linkedCohorts = cohorts.filter((c) => c.course_id === course.id);
  const linkedCohortIds = new Set(linkedCohorts.map((c) => c.id));
  const linkedEnrollments = enrollments.filter((e) => linkedCohortIds.has(e.cohort_id));

  const expectedConfirmText = course.code ? course.code.toUpperCase() : 'DELETE';
  const isConfirmValid =
    confirmText.trim().toUpperCase() === expectedConfirmText ||
    confirmText.trim().toUpperCase() === 'DELETE';

  const canDelete = isConfirmValid && understoodCheckbox && !isDeleting;

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    setErrorMsg(null);

    try {
      await deleteCourse(course.id);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to delete course:', err);
      setErrorMsg(err?.message || 'Failed to delete course curriculum.');
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 1300,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="modal-content glass-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          width: '100%',
          padding: 0,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(239, 68, 68, 0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(185, 28, 28, 0.08))',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F87171', margin: 0 }}>
                Decommission Course Curriculum
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                Permanent removal and active cohort schedule audit
              </p>
            </div>
          </div>

          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isDeleting}
            style={{ padding: '6px', borderRadius: '50%', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* COURSE IDENTITY CARD */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(212, 154, 91, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--crema-gold)',
                flexShrink: 0,
              }}
            >
              <BookOpen size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                  {course.code}
                </span>
                <span className="badge" style={{ fontSize: '0.7rem' }}>
                  {course.category}
                </span>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {course.title}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                {course.duration_weeks} Weeks Duration • Tuition: KES {course.fee_amount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* IMPACT METRICS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-sm)',
                  background: linkedCohorts.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: linkedCohorts.length > 0 ? '#EF4444' : 'var(--text-muted)',
                }}
              >
                <Calendar size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Linked Cohorts</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: linkedCohorts.length > 0 ? '#EF4444' : 'var(--text-primary)' }}>
                  {linkedCohorts.length} Batches
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-sm)',
                  background: linkedEnrollments.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: linkedEnrollments.length > 0 ? '#EF4444' : 'var(--text-muted)',
                }}
              >
                <GraduationCap size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Enrolled Trainees</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: linkedEnrollments.length > 0 ? '#EF4444' : 'var(--text-primary)' }}>
                  {linkedEnrollments.length} Trainees
                </div>
              </div>
            </div>
          </div>

          {/* WARNING CHECKLIST */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              marginBottom: '20px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Cascade Effects:
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>
                <strong>Curriculum Archive:</strong> This course will be purged from the academic catalog and will no longer be available for student enrollments.
              </li>
              {linkedCohorts.length > 0 ? (
                <li style={{ color: '#F87171' }}>
                  <strong>Linked Cohort Batches:</strong> All {linkedCohorts.length} intake schedules, calendar timetables, and classroom sessions tied to this course will be permanently removed.
                </li>
              ) : (
                <li>
                  <strong>Cohorts:</strong> No active cohort schedules currently depend on this course.
                </li>
              )}
            </ul>
          </div>

          {/* CONFIRMATION INPUT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '6px',
                }}
              >
                Type <span style={{ color: '#EF4444', fontFamily: 'monospace', fontWeight: 700 }}>{expectedConfirmText}</span> or <span style={{ color: '#EF4444', fontFamily: 'monospace', fontWeight: 700 }}>DELETE</span> to confirm:
              </label>
              <input
                type="text"
                className="input-field"
                placeholder={`Enter "${expectedConfirmText}" or "DELETE"`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isDeleting}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.88rem',
                  fontFamily: 'monospace',
                  borderColor: isConfirmValid ? '#EF4444' : undefined,
                  background: 'var(--bg-surface-elevated)',
                }}
                autoFocus
              />
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={understoodCheckbox}
                onChange={(e) => setUnderstoodCheckbox(e.target.checked)}
                disabled={isDeleting}
                style={{ marginTop: '2px', accentColor: '#EF4444', cursor: 'pointer' }}
              />
              <span>
                I understand this will permanently delete this academic course and all linked cohort schedules.
              </span>
            </label>
          </div>

          {errorMsg && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#FCA5A5',
                fontSize: '0.82rem',
              }}
            >
              {errorMsg}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            background: 'var(--bg-surface-elevated)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={!canDelete}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              fontSize: '0.85rem',
              opacity: canDelete ? 1 : 0.45,
              cursor: canDelete ? 'pointer' : 'not-allowed',
              background: '#DC2626',
              borderColor: '#B91C1C',
              color: '#FFFFFF',
            }}
          >
            {isDeleting ? (
              <>
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: '2px solid #FFFFFF',
                    borderTopColor: 'transparent',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span>Decommissioning Course...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Permanently Delete Course</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
