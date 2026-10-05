import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { X, Calendar, Clock, Video, User, Coffee, CheckCircle2, Building, Users, RotateCcw, Sparkles } from 'lucide-react';
import { calculateCohortEndDate, getCohortDurationSummary } from '../../lib/dateUtils';

interface CreateCohortModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateCohortModal: React.FC<CreateCohortModalProps> = ({ onClose, onSuccess }) => {
  const { currentProfile, branches, courses, profiles, createCohort } = useApp();

  const isBranchManager = currentProfile?.role === 'branch_manager';
  const initialBranchId = isBranchManager && currentProfile.branch_id ? currentProfile.branch_id : (branches[0]?.id || '');

  const instructors = profiles.filter(
    (p) => (p.role === 'instructor' || p.role === 'super_admin') && (!isBranchManager || !p.branch_id || p.branch_id === initialBranchId)
  );

  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState(initialBranchId);
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [instructorId, setInstructorId] = useState(instructors[0]?.id || '');
  
  // Preset Timetables
  const TIMETABLE_PRESETS = [
    '08:30 AM - 12:30 PM (Mon-Fri) [Morning Intensive]',
    '02:00 PM - 05:30 PM (Mon-Fri) [Afternoon Lab]',
    '09:00 AM - 11:30 AM & 02:00 PM - 04:30 PM (Mon-Fri) [Dual-Shift / Twice Daily]',
    '08:30-10:30 AM | 01:00-03:00 PM | 05:00-07:00 PM (Mon-Fri) [Tri-Shift / 3x Daily]',
    '09:00 AM - 04:00 PM (Sat-Sun) [Weekend Executive]',
    '05:30 PM - 08:30 PM (Tue & Thu) [Evening Masterclass]',
  ];
  const [scheduleTiming, setScheduleTiming] = useState(TIMETABLE_PRESETS[0]);
  const [customTiming, setCustomTiming] = useState('');

  const selectedCourse = courses.find((c) => c.id === courseId) || courses[0];
  const selectedBranch = branches.find((b) => b.id === branchId) || branches[0];

  // Term Dates: Auto-calculated from course duration (e.g. 5 weeks)
  const todayStr = new Date().toISOString().split('T')[0];
  const initialDuration = selectedCourse?.duration_weeks || 2;
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(() => calculateCohortEndDate(todayStr, initialDuration));
  const [isManualEndDate, setIsManualEndDate] = useState(false);

  // Handlers for dynamic date recalculation
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

  const [maxCapacity, setMaxCapacity] = useState<number | ''>(16);
  const [googleMeetUrl, setGoogleMeetUrl] = useState(
    `https://meet.google.com/aur-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`
  );
  const [status, setStatus] = useState<'upcoming' | 'in_progress'>('upcoming');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto suggest cohort name when course or branch changes if name is empty or default
  React.useEffect(() => {
    if (!name || name.includes('Cohort') || name.includes('Intake')) {
      const bCode = selectedBranch?.code || 'NBO';
      const cCat = selectedCourse?.category ? selectedCourse.category.split(' ')[0] : 'Barista';
      setName(`${bCode} ${cCat} Intensive - Intake ${new Date().getMonth() + 1}`);
    }
  }, [branchId, courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const finalTiming = customTiming.trim() || scheduleTiming;

    try {
      await createCohort({
        name,
        branch_id: branchId,
        course_id: courseId,
        instructor_id: instructorId,
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
      }, 1000);
    } catch (err: any) {
      alert('Error creating cohort: ' + err.message);
    } finally {
      setIsSubmitting(false);
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
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#181310',
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Schedule New Cohort / Class Timetable</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Set up an intake batch, class time slots, and Google Meet virtual room.
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

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {isSuccess ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <CheckCircle2 size={48} color="#6EE7B7" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '1.3rem', color: '#6EE7B7' }}>Cohort Scheduled Successfully!</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                The new class timetable is active and ready for trainee admissions.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                
                {/* Cohort Name */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Cohort Intake Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. NBO Barista Intensive - Cohort 13"
                    required
                  />
                </div>

                {/* Campus Branch */}
                <div className="form-group">
                  <label className="form-label">Academy Campus *</label>
                  {isBranchManager ? (
                    <input
                      type="text"
                      className="form-input"
                      value={`${selectedBranch?.name} (${selectedBranch?.city})`}
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

                {/* Course Curriculum */}
                <div className="form-group">
                  <label className="form-label">Course Curriculum *</label>
                  <select
                    className="form-select"
                    value={courseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.duration_weeks ? `${c.duration_weeks} Wks` : 'Custom'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Faculty Lead */}
                <div className="form-group">
                  <label className="form-label">Assigned Instructor *</label>
                  <select
                    className="form-select"
                    value={instructorId}
                    onChange={(e) => setInstructorId(e.target.value)}
                    required
                  >
                    {instructors.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.full_name} ({inst.specialty || 'Lead Trainer'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="form-group">
                  <label className="form-label">Intake Status *</label>
                  <select
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    required
                  >
                    <option value="upcoming">Upcoming (Open for Enrollment)</option>
                    <option value="in_progress">In Progress (Active Session)</option>
                  </select>
                </div>

                {/* Start Date */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Term Start Date *</label>
                    {selectedCourse?.duration_weeks && (
                      <span style={{ fontSize: '0.70rem', color: 'var(--crema-gold)', fontWeight: 600 }}>
                        {selectedCourse.duration_weeks} Wks Curriculum
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    required
                  />
                </div>

                {/* End Date */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Exam & Completion Date *</label>
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
                    className="form-input"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
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

                {/* Max Student Capacity */}
                <div className="form-group">
                  <label className="form-label">Max Student Capacity</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    className="form-input"
                    value={maxCapacity}
                    placeholder="16"
                    onChange={(e) => {
                      const val = e.target.value;
                      setMaxCapacity(val === '' ? '' : parseInt(val));
                    }}
                    required
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Recommended 12–16 for optimal espresso station ratio.
                  </span>
                </div>
              </div>

              {/* TIMETABLE & CLASS HOURS */}
              <div style={{ marginBottom: '20px', background: 'var(--bg-surface-elevated)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--crema-gold)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={15} />
                  <span>Daily Class Timetable & Schedule Slot</span>
                </h4>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label">Standard Schedule Presets</label>
                  <select
                    className="form-select"
                    value={scheduleTiming}
                    onChange={(e) => {
                      setScheduleTiming(e.target.value);
                      setCustomTiming('');
                    }}
                  >
                    {TIMETABLE_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Or Custom Hours (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={customTiming}
                    onChange={(e) => setCustomTiming(e.target.value)}
                    placeholder="e.g. 08:30-10:30 AM & 02:00-04:30 PM (Mon-Fri) [Split Shift]"
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
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
              </div>

              {/* GOOGLE MEET VIRTUAL CLASSROOM */}
              <div style={{ marginBottom: '24px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Video size={14} color="#60A5FA" />
                    <span>Google Meet Theory Classroom Link</span>
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    value={googleMeetUrl}
                    onChange={(e) => setGoogleMeetUrl(e.target.value)}
                    placeholder="https://meet.google.com/aur-xxx-yyy"
                    required
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Auto-generated link for digital agronomy lectures and sensory theory.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    'Scheduling...'
                  ) : (
                    <>
                      <Calendar size={16} />
                      <span>Create & Publish Cohort</span>
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
