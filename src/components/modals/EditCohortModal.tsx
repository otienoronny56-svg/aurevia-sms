import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Cohort } from '../../types/database.types';
import {
  X,
  Calendar,
  Clock,
  Video,
  User,
  Coffee,
  CheckCircle2,
  Building,
  Users,
  Trash2,
  AlertTriangle,
  Edit3,
  Activity,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { calculateCohortEndDate, getCohortDurationSummary } from '../../lib/dateUtils';

interface EditCohortModalProps {
  cohort: Cohort;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditCohortModal: React.FC<EditCohortModalProps> = ({
  cohort,
  onClose,
  onSuccess,
}) => {
  const { currentProfile, branches, courses, profiles, updateCohort, deleteCohort } = useApp();

  const isBranchManager = currentProfile?.role === 'branch_manager';
  const managerBranchId = currentProfile?.branch_id || cohort.branch_id;

  const [name, setName] = useState(cohort.name);
  const [branchId, setBranchId] = useState(isBranchManager ? managerBranchId : cohort.branch_id);
  const [courseId, setCourseId] = useState(cohort.course_id);
  const [instructorId, setInstructorId] = useState(cohort.instructor_id || '');

  // Preset Timetables (Single and Multi-Session Shifts)
  const TIMETABLE_PRESETS = [
    '08:30 AM - 12:30 PM (Mon-Fri) [Morning Intensive]',
    '02:00 PM - 05:30 PM (Mon-Fri) [Afternoon Lab]',
    '09:00 AM - 11:30 AM & 02:00 PM - 04:30 PM (Mon-Fri) [Dual-Shift / Twice Daily]',
    '08:30-10:30 AM | 01:00-03:00 PM | 05:00-07:00 PM (Mon-Fri) [Tri-Shift / 3x Daily]',
    '09:00 AM - 04:00 PM (Sat-Sun) [Weekend Executive]',
    '05:30 PM - 08:30 PM (Tue & Thu) [Evening Masterclass]',
  ];

  const isCustomPreset = !TIMETABLE_PRESETS.includes(cohort.schedule_timing);
  const [scheduleTiming, setScheduleTiming] = useState(
    isCustomPreset ? 'custom' : cohort.schedule_timing
  );
  const [customTiming, setCustomTiming] = useState(
    isCustomPreset ? cohort.schedule_timing : ''
  );

  // Campus-scoped courses
  const availableCourses = courses.filter((c) => {
    if (branchId === '470b5cb5-59e2-4be0-b19b-182d9795e12b') {
      return c.branch_id === branchId || c.code.startsWith('LH-') || c.id === cohort.course_id;
    }
    return ((!c.branch_id || c.branch_id === branchId) && !c.code.startsWith('LH-')) || c.id === cohort.course_id;
  });

  const selectedCourse = availableCourses.find((c) => c.id === courseId) || courses.find((c) => c.id === courseId);
  const [startDate, setStartDate] = useState(cohort.start_date || '');
  const [endDate, setEndDate] = useState(cohort.end_date || '');
  const [isManualEndDate, setIsManualEndDate] = useState(false);

  // Handlers for dynamic date recalculation based on course duration
  const handleCourseChange = (newCourseId: string) => {
    setCourseId(newCourseId);
    const newCourse = courses.find((c) => c.id === newCourseId);
    if (newCourse?.duration_weeks && startDate) {
      setEndDate(calculateCohortEndDate(startDate, newCourse.duration_weeks));
      setIsManualEndDate(false);
    }
  };

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (selectedCourse?.duration_weeks && newStart) {
      setEndDate(calculateCohortEndDate(newStart, selectedCourse.duration_weeks));
      setIsManualEndDate(false);
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    setIsManualEndDate(true);
  };

  const handleRecalculateEndDate = () => {
    if (startDate && selectedCourse?.duration_weeks) {
      setEndDate(calculateCohortEndDate(startDate, selectedCourse.duration_weeks));
      setIsManualEndDate(false);
    }
  };

  const durationSummary = getCohortDurationSummary(startDate, endDate);

  const [maxCapacity, setMaxCapacity] = useState<number | ''>(cohort.max_capacity ?? 16);
  const [googleMeetUrl, setGoogleMeetUrl] = useState(cohort.google_meet_url || '');
  const [status, setStatus] = useState<Cohort['status']>(cohort.status || 'upcoming');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Instructors filtered for branch if manager
  const instructors = profiles.filter(
    (p) =>
      (p.role === 'instructor' || p.role === 'super_admin') &&
      (!isBranchManager || !p.branch_id || p.branch_id === branchId)
  );

  const selectedBranch = branches.find((b) => b.id === branchId) || branches[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalTiming =
      scheduleTiming === 'custom' ? customTiming.trim() || '08:30 AM - 12:30 PM (Mon-Fri)' : scheduleTiming;

    try {
      await updateCohort(cohort.id, {
        name,
        branch_id: branchId,
        course_id: courseId,
        instructor_id: instructorId || undefined,
        start_date: startDate,
        end_date: endDate,
        schedule_timing: finalTiming,
        max_capacity: Number(maxCapacity) || 16,
        google_meet_url: googleMeetUrl,
        status,
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      alert('Error updating cohort: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCohort(cohort.id);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert('Error deleting cohort: ' + err.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '740px', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(212, 154, 91, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--crema-gold)',
              }}
            >
              <Edit3 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                Edit Saved Cohort
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                Modify batch details, schedule shift timings, instructor assignment, and capacity
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Alert */}
        {isSuccess && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid var(--aur-emerald)',
              padding: '16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
              color: 'var(--aur-emerald)',
            }}
          >
            <CheckCircle2 size={24} />
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                Cohort Updated Successfully!
              </p>
              <p style={{ fontSize: '0.8rem', opacity: 0.9, margin: 0 }}>
                Changes to timings, term dates, and assignments have been synchronized.
              </p>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid var(--aur-crimson)',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--aur-crimson)' }}>
              <AlertTriangle size={22} />
              <h4 style={{ margin: 0, fontWeight: 700 }}>Delete Cohort "{cohort.name}"?</h4>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '8px 0 14px' }}>
              Are you sure you want to delete this cohort batch? This will remove the cohort from the active roster.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                style={{ fontSize: '0.82rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={isDeleting}
                style={{ fontSize: '0.82rem' }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Permanently Delete'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* SECTION 1: COURSE & CAMPUS ASSIGNMENT */}
          <div className="grid-2">
            {/* Campus Selection */}
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={14} style={{ color: 'var(--crema-gold)' }} />
                Academy Campus Branch
              </label>
              {isBranchManager ? (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--crema-gold)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{selectedBranch?.name || 'Assigned Branch'}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                    [Manager Campus Locked]
                  </span>
                </div>
              ) : (
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="form-input"
                  required
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Course Module */}
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Coffee size={14} style={{ color: 'var(--crema-gold)' }} />
                Specialty Course Module
              </label>
              <select
                value={courseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="form-input"
                required
              >
                {availableCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.duration_weeks ? `${c.duration_weeks} Wks • ` : ''}{c.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 2: COHORT NAME & STATUS */}
          <div className="grid-2">
            <div>
              <label className="form-label">Cohort Batch Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                placeholder="e.g. NBO Roasting Intensive - Intake 9"
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={14} style={{ color: 'var(--crema-gold)' }} />
                Cohort Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Cohort['status'])}
                className="form-input"
                required
              >
                <option value="upcoming">Upcoming (Accepting Trainees)</option>
                <option value="in_progress">In Progress (Active Sessions)</option>
                <option value="completed">Completed (Graduated)</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* SECTION 3: TIMETABLE & CLASS HOURS */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Clock size={16} style={{ color: 'var(--crema-gold)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Daily Class Timetable & Shift Schedule
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {TIMETABLE_PRESETS.map((p) => (
                <label
                  key={p}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.85rem',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: scheduleTiming === p ? 'rgba(212, 154, 91, 0.12)' : 'transparent',
                    border: scheduleTiming === p ? '1px solid var(--crema-gold)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="editScheduleTiming"
                    value={p}
                    checked={scheduleTiming === p}
                    onChange={() => setScheduleTiming(p)}
                  />
                  <span>{p}</span>
                </label>
              ))}

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.85rem',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: scheduleTiming === 'custom' ? 'rgba(212, 154, 91, 0.12)' : 'transparent',
                  border: scheduleTiming === 'custom' ? '1px solid var(--crema-gold)' : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="editScheduleTiming"
                  value="custom"
                  checked={scheduleTiming === 'custom'}
                  onChange={() => setScheduleTiming('custom')}
                />
                <span>Custom Schedule Timing...</span>
              </label>

              {scheduleTiming === 'custom' && (
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    value={customTiming}
                    onChange={(e) => setCustomTiming(e.target.value)}
                    placeholder="e.g. 08:30-10:30 AM & 02:00-04:30 PM (Mon-Fri) [Split Shift]"
                    className="form-input"
                    required
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Quick templates:</span>
                    {[
                      '09:00-11:00 AM & 02:00-04:30 PM (Mon-Fri)',
                      '08:30-10:30 AM | 01:00-03:00 PM | 05:00-07:00 PM (Mon, Wed, Fri)',
                      'Morning Theory (09:00-11:00) + Afternoon Lab (02:00-05:00)',
                    ].map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => setCustomTiming(example)}
                        style={{
                          background: 'rgba(212, 154, 91, 0.1)',
                          border: '1px solid rgba(212, 154, 91, 0.25)',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                          color: 'var(--crema-gold)',
                          cursor: 'pointer',
                        }}
                      >
                        + {example.slice(0, 32)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: INSTRUCTOR & CAPACITY */}
          <div className="grid-2">
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} style={{ color: 'var(--crema-gold)' }} />
                Lead Faculty / Assigned Instructor
              </label>
              <select
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
                className="form-input"
              >
                <option value="">-- Unassigned / Assign Later --</option>
                {instructors.map((ins) => (
                  <option key={ins.id} value={ins.id}>
                    {ins.full_name} ({ins.specialty || 'Instructor'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} style={{ color: 'var(--crema-gold)' }} />
                Maximum Trainee Capacity
              </label>
              <input
                type="number"
                min="4"
                max="40"
                value={maxCapacity}
                placeholder="16"
                onChange={(e) => {
                  const val = e.target.value;
                  setMaxCapacity(val === '' ? '' : parseInt(val));
                }}
                className="form-input"
                required
              />
            </div>
          </div>

          {/* SECTION 5: TERM DATES */}
          <div className="grid-2">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <Calendar size={14} style={{ color: 'var(--crema-gold)' }} />
                  Intake Start Date *
                </label>
                {selectedCourse?.duration_weeks && (
                  <span style={{ fontSize: '0.70rem', color: 'var(--crema-gold)', fontWeight: 600 }}>
                    {selectedCourse.duration_weeks} Wks Curriculum
                  </span>
                )}
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <Calendar size={14} style={{ color: 'var(--crema-gold)' }} />
                  Intake End / Graduation Date *
                </label>
                {selectedCourse?.duration_weeks && (
                  <button
                    type="button"
                    onClick={handleRecalculateEndDate}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--crema-gold)',
                      fontSize: '0.70rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                    title={`Reset end date to exactly ${selectedCourse.duration_weeks} weeks from start date`}
                  >
                    <RotateCcw size={10} />
                    <span>Auto-calc ({selectedCourse.duration_weeks} wks)</span>
                  </button>
                )}
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="form-input"
                required
              />
              {durationSummary && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.70rem' }}>
                  <span style={{ color: isManualEndDate ? 'var(--text-secondary)' : '#10B981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {isManualEndDate ? (
                      <>✏️ Custom: {durationSummary.weeks} wks ({durationSummary.days} days)</>
                    ) : (
                      <>⚡ Auto-fills {selectedCourse?.duration_weeks} wks ({durationSummary.days} days)</>
                    )}
                  </span>
                  {isManualEndDate && selectedCourse?.duration_weeks && durationSummary.weeks !== selectedCourse.duration_weeks && (
                    <span style={{ color: 'var(--crema-gold)', fontSize: '0.68rem' }}>
                      Standard is {selectedCourse.duration_weeks} wks
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 6: GOOGLE MEET LIVE URL */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Video size={14} style={{ color: 'var(--crema-gold)' }} />
              Google Meet Class URL (Hybrid Theory Sessions)
            </label>
            <input
              type="url"
              value={googleMeetUrl}
              onChange={(e) => setGoogleMeetUrl(e.target.value)}
              className="form-input"
              placeholder="https://meet.google.com/aur-xxx-xxx"
            />
          </div>

          {/* MODAL ACTIONS */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '18px',
              marginTop: '6px',
            }}
          >
            <button
              type="button"
              className="btn btn-danger"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting || showDeleteConfirm}
            >
              <Trash2 size={16} />
              <span>Delete Cohort</span>
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-gold"
                disabled={isSubmitting}
                style={{ minWidth: '130px' }}
              >
                {isSubmitting ? 'Saving Changes...' : 'Save Cohort'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
