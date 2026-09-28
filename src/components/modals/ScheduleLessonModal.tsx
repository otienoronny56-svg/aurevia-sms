import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { TimetableLesson, LessonMode, Cohort } from '../../types/database.types';
import {
  X, Calendar, Clock, MapPin, User, BookOpen, Video,
  Smartphone, CheckCircle2, Sparkles, Check, Flame, Beaker,
  Compass, Wrench, DollarSign, Tag, AlertTriangle, UserX
} from 'lucide-react';

interface ScheduleLessonModalProps {
  branchId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ScheduleLessonModal: React.FC<ScheduleLessonModalProps> = ({
  branchId,
  onClose,
  onSuccess,
}) => {
  const { cohorts, courses, profiles, lessons, createLesson } = useApp();

  const branchCohorts = cohorts.filter((c) => c.branch_id === branchId || !c.branch_id);
  const branchInstructors = profiles.filter(
    (p) => (p.branch_id === branchId || !p.branch_id) && (p.role === 'instructor' || p.role === 'super_admin')
  );

  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const selectedCourse = courses.find((c) => c.id === courseId) || courses[0];

  const matchingCohorts = branchCohorts.filter((c) => c.course_id === courseId);
  const [cohortId, setCohortId] = useState(matchingCohorts[0]?.id || branchCohorts[0]?.id || '');

  const [instructorId, setInstructorId] = useState(
    branchInstructors[0]?.id || ''
  );
  const selectedInstructor = profiles.find((p) => p.id === instructorId);

  // Lesson Delivery Mode (Default: physical hands-on on-campus lab)
  const [lessonMode, setLessonMode] = useState<LessonMode>('physical_lab');

  const [dayOfWeek, setDayOfWeek] = useState<TimetableLesson['day_of_week']>('Monday');
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('12:30');
  const [labLocation, setLabLocation] = useState('Lab 1');
  const [equipmentNeeded, setEquipmentNeeded] = useState('Portafilters, Scales, Tampers, Specialty Beans');
  const [googleMeetUrl, setGoogleMeetUrl] = useState('https://meet.google.com/aur-class-live');
  const [smsReminder, setSmsReminder] = useState(true);
  const [isRecurring, setIsRecurring] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const LAB_OPTIONS = ['Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Lab 5'];

  // Helper to convert "08:30" to minutes for time overlap checking
  const toMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const newStartMin = toMinutes(startTime);
  const newEndMin = toMinutes(endTime);

  // 1. Lab Conflict Check (Same room booked at overlapping time)
  const labConflictLesson = lessonMode === 'physical_lab' ? lessons.find((l) => {
    if (l.branch_id !== branchId && l.branch_id) return false;
    if (l.day_of_week !== dayOfWeek) return false;
    if (l.lab_location.trim().toLowerCase() !== labLocation.trim().toLowerCase()) return false;

    const existStartMin = toMinutes(l.start_time);
    const existEndMin = toMinutes(l.end_time);
    return newStartMin < existEndMin && newEndMin > existStartMin;
  }) : null;

  const labConflictCourse = labConflictLesson ? courses.find((c) => c.id === labConflictLesson.course_id) : null;
  const labConflictTrainer = labConflictLesson ? profiles.find((p) => p.id === labConflictLesson.instructor_id) : null;

  // 2. Instructor Double-Booking Check (Same teacher assigned to 2 sessions at overlapping time)
  const trainerConflictLesson = instructorId ? lessons.find((l) => {
    if (l.instructor_id !== instructorId) return false;
    if (l.day_of_week !== dayOfWeek) return false;

    const existStartMin = toMinutes(l.start_time);
    const existEndMin = toMinutes(l.end_time);
    return newStartMin < existEndMin && newEndMin > existStartMin;
  }) : null;

  const trainerConflictCourse = trainerConflictLesson ? courses.find((c) => c.id === trainerConflictLesson.course_id) : null;

  const hasAnyConflict = !!labConflictLesson || !!trainerConflictLesson;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await createLesson({
        branch_id: branchId,
        cohort_id: cohortId || branchCohorts[0]?.id,
        course_id: courseId,
        instructor_id: instructorId,
        topic_title: selectedCourse?.title || 'Barista Skills Foundation',
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        lesson_mode: lessonMode,
        lab_location: lessonMode === 'virtual_theory' ? 'Virtual Classroom' : labLocation,
        equipment_needed: lessonMode === 'physical_lab' ? equipmentNeeded : undefined,
        google_meet_url: lessonMode === 'virtual_theory' ? googleMeetUrl : undefined,
        sms_reminder_enabled: smsReminder,
        is_recurring: isRecurring,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert('Error scheduling timetable lesson: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px', maxHeight: '92vh', overflowY: 'auto' }}
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
              <Calendar size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Schedule Timetable Course Session</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Assign trainers and schedule lab sessions with automated collision detection.
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

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* COURSE SELECTION WITH FEES & CODE */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Registered Academic Course & Fee *</span>
              {selectedCourse && (
                <span style={{ color: 'var(--crema-gold)', fontWeight: 700 }}>
                  Tuition Fee: KES {selectedCourse.fee_amount.toLocaleString()} ({selectedCourse.duration_weeks} Weeks)
                </span>
              )}
            </label>
            <select
              className="form-select"
              value={courseId}
              onChange={(e) => {
                const newCId = e.target.value;
                setCourseId(newCId);
                const matching = branchCohorts.filter((c) => c.course_id === newCId);
                if (matching.length > 0) {
                  setCohortId(matching[0].id);
                  if (matching[0].instructor_id) setInstructorId(matching[0].instructor_id);
                }
              }}
              required
              style={{ fontSize: '0.9rem', padding: '10px 14px' }}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} • {c.title} — KES {c.fee_amount.toLocaleString()} ({c.category})
                </option>
              ))}
            </select>
          </div>

          {/* Target Cohort & Assigned Trainer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
            <div className="form-group">
              <label className="form-label">Target Cohort Intake *</label>
              <select
                className="form-select"
                value={cohortId}
                onChange={(e) => {
                  setCohortId(e.target.value);
                  const c = branchCohorts.find((x) => x.id === e.target.value);
                  if (c?.instructor_id) setInstructorId(c.instructor_id);
                }}
                required
              >
                {branchCohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Assigned Faculty Trainer *
                {trainerConflictLesson && (
                  <span style={{ color: '#EF4444', marginLeft: '6px', fontWeight: 700 }}>
                    (Occupied!)
                  </span>
                )}
              </label>
              <select
                className="form-select"
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
                required
                style={{
                  border: trainerConflictLesson ? '1.5px solid #EF4444' : undefined,
                  background: trainerConflictLesson ? 'rgba(239, 68, 68, 0.08)' : undefined,
                }}
              >
                {branchInstructors.map((inst) => {
                  // Check if this specific instructor has a conflict at this time
                  const isBusy = lessons.some((l) => {
                    if (l.instructor_id !== inst.id) return false;
                    if (l.day_of_week !== dayOfWeek) return false;
                    const eStart = toMinutes(l.start_time);
                    const eEnd = toMinutes(l.end_time);
                    return newStartMin < eEnd && newEndMin > eStart;
                  });

                  return (
                    <option key={inst.id} value={inst.id}>
                      {inst.full_name} ({inst.specialty || 'Instructor'}) {isBusy ? '⚠️ [Occupied at this time]' : '✓ [Available]'}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* LESSON DELIVERY MODE SELECTOR */}
          <div style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ marginBottom: '8px' }}>Session Delivery Format *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              {/* Option 1: Physical Hands-On Lab */}
              <div
                onClick={() => {
                  setLessonMode('physical_lab');
                  setLabLocation('Lab 1');
                }}
                style={{
                  background: lessonMode === 'physical_lab' ? 'rgba(212, 154, 91, 0.15)' : 'var(--bg-surface-elevated)',
                  border: `1.5px solid ${lessonMode === 'physical_lab' ? 'var(--crema-gold)' : 'var(--border-subtle)'}`,
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
                    background: lessonMode === 'physical_lab' ? 'rgba(212, 154, 91, 0.3)' : 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--crema-gold)',
                  }}
                >
                  <Beaker size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: lessonMode === 'physical_lab' ? 'var(--crema-gold)' : 'var(--text-primary)' }}>
                    🔬 In-Person Lab Practical
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Physical on-campus machinery lab
                  </div>
                </div>
              </div>

              {/* Option 2: Virtual Theory */}
              <div
                onClick={() => setLessonMode('virtual_theory')}
                style={{
                  background: lessonMode === 'virtual_theory' ? 'rgba(110, 231, 183, 0.12)' : 'var(--bg-surface-elevated)',
                  border: `1.5px solid ${lessonMode === 'virtual_theory' ? '#6EE7B7' : 'var(--border-subtle)'}`,
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
                    background: lessonMode === 'virtual_theory' ? 'rgba(110, 231, 183, 0.25)' : 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6EE7B7',
                  }}
                >
                  <Video size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: lessonMode === 'virtual_theory' ? '#6EE7B7' : 'var(--text-primary)' }}>
                    💻 Virtual Theory Class
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Online Google Meet lecture
                  </div>
                </div>
              </div>

              {/* Option 3: Field / Farm Trip */}
              <div
                onClick={() => {
                  setLessonMode('field_trip');
                  setLabLocation('Coffee Farm & Washing Station');
                }}
                style={{
                  background: lessonMode === 'field_trip' ? 'rgba(234, 179, 8, 0.12)' : 'var(--bg-surface-elevated)',
                  border: `1.5px solid ${lessonMode === 'field_trip' ? '#EAB308' : 'var(--border-subtle)'}`,
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
                    background: lessonMode === 'field_trip' ? 'rgba(234, 179, 8, 0.25)' : 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#EAB308',
                  }}
                >
                  <Compass size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: lessonMode === 'field_trip' ? '#EAB308' : 'var(--text-primary)' }}>
                    🌿 Farm / Factory Visit
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Off-campus coffee estate tour
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Day & Timing */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '18px' }}>
            <div className="form-group">
              <label className="form-label">Day of Week *</label>
              <select
                className="form-select"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value as any)}
                required
              >
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input
                type="time"
                className="form-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input
                type="time"
                className="form-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* PHYSICAL LAB ROOM SELECTION (Lab 1, Lab 2, Lab 3, etc.) */}
          {lessonMode === 'physical_lab' ? (
            <div
              style={{
                marginBottom: '18px',
                background: labConflictLesson ? 'rgba(239, 68, 68, 0.08)' : 'rgba(212, 154, 91, 0.08)',
                border: `1.5px solid ${labConflictLesson ? '#EF4444' : 'rgba(212, 154, 91, 0.25)'}`,
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Select Laboratory Room *</span>
                  {labConflictLesson && (
                    <span style={{ color: '#EF4444', fontWeight: 700 }}>
                      ⚠️ {labLocation} is already booked at this time!
                    </span>
                  )}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  {LAB_OPTIONS.map((lab) => {
                    // Check if this specific lab has a conflict at this time
                    const isLabBusy = lessons.some((l) => {
                      if (l.branch_id !== branchId && l.branch_id) return false;
                      if (l.day_of_week !== dayOfWeek) return false;
                      if (l.lab_location.trim().toLowerCase() !== lab.trim().toLowerCase()) return false;
                      const eStart = toMinutes(l.start_time);
                      const eEnd = toMinutes(l.end_time);
                      return newStartMin < eEnd && newEndMin > eStart;
                    });

                    return (
                      <button
                        key={lab}
                        type="button"
                        onClick={() => setLabLocation(lab)}
                        style={{
                          background: labLocation === lab
                            ? (isLabBusy ? 'rgba(239, 68, 68, 0.25)' : 'rgba(212, 154, 91, 0.25)')
                            : 'var(--bg-surface-elevated)',
                          border: `1.5px solid ${
                            labLocation === lab
                              ? (isLabBusy ? '#EF4444' : 'var(--crema-gold)')
                              : isLabBusy
                              ? 'rgba(239, 68, 68, 0.4)'
                              : 'var(--border-subtle)'
                          }`,
                          color: labLocation === lab
                            ? (isLabBusy ? '#FCA5A5' : 'var(--crema-gold-light)')
                            : isLabBusy
                            ? '#F87171'
                            : 'var(--text-secondary)',
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                          fontWeight: labLocation === lab ? 700 : 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{lab}</span>
                        {isLabBusy && <span style={{ fontSize: '0.68rem', color: '#EF4444' }}>[Occupied]</span>}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  className="form-input"
                  value={labLocation}
                  onChange={(e) => setLabLocation(e.target.value)}
                  placeholder="e.g. Lab 1, Lab 2, Lab 3"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Required Equipment & Tools (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={equipmentNeeded}
                  onChange={(e) => setEquipmentNeeded(e.target.value)}
                  placeholder="e.g. Scales, Portafilters, Tampers, Milk Pitchers"
                />
              </div>
            </div>
          ) : lessonMode === 'virtual_theory' ? (
            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">Google Meet Virtual Classroom URL *</label>
              <input
                type="url"
                className="form-input"
                value={googleMeetUrl}
                onChange={(e) => setGoogleMeetUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
                required
              />
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">Estate / Farm Destination & Departure Point *</label>
              <input
                type="text"
                className="form-input"
                value={labLocation}
                onChange={(e) => setLabLocation(e.target.value)}
                placeholder="e.g. Coffee Farm & Washing Station Tour"
                required
              />
            </div>
          )}

          {/* REAL-TIME CONFLICT WARNINGS (LAB & INSTRUCTOR) */}
          {labConflictLesson && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1.5px solid #EF4444',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <AlertTriangle size={22} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ color: '#FCA5A5', fontWeight: 700, fontSize: '0.88rem' }}>
                  ⚠️ Laboratory Room Collision: {labLocation} is Occupied!
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                  <strong style={{ color: '#FCA5A5' }}>{labLocation}</strong> is already allocated on{' '}
                  <strong>{dayOfWeek}</strong> ({labConflictLesson.start_time} - {labConflictLesson.end_time}) for{' '}
                  <strong style={{ color: 'var(--crema-gold)' }}>{labConflictCourse?.title || labConflictLesson.topic_title}</strong>{' '}
                  (Trainer: {labConflictTrainer?.full_name || 'Assigned Lead'}).
                </div>
                <div style={{ fontSize: '0.74rem', color: '#FCA5A5', marginTop: '6px' }}>
                  👉 Recommendation: Switch to an available room (e.g. <strong>{LAB_OPTIONS.find(l => l !== labLocation) || 'Lab 2'}</strong>) or shift your class timing.
                </div>
              </div>
            </div>
          )}

          {trainerConflictLesson && (
            <div
              style={{
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1.5px solid #EAB308',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <UserX size={22} color="#EAB308" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ color: '#FDE047', fontWeight: 700, fontSize: '0.88rem' }}>
                  ⚠️ Teacher Double-Booking Collision: {selectedInstructor?.full_name} is Busy!
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                  <strong style={{ color: '#FDE047' }}>{selectedInstructor?.full_name}</strong> is already teaching{' '}
                  <strong style={{ color: 'var(--crema-gold)' }}>{trainerConflictCourse?.title || trainerConflictLesson.topic_title}</strong> in{' '}
                  <strong>{trainerConflictLesson.lab_location}</strong> on <strong>{dayOfWeek}</strong> from{' '}
                  <strong>{trainerConflictLesson.start_time} to {trainerConflictLesson.end_time}</strong>.
                </div>
                <div style={{ fontSize: '0.74rem', color: '#FDE047', marginTop: '6px' }}>
                  👉 Recommendation: Select a different available faculty trainer from the dropdown or adjust the schedule timing.
                </div>
              </div>
            </div>
          )}

          {/* Automated Reminders Box */}
          <div
            style={{
              background: 'rgba(212, 154, 91, 0.08)',
              border: '1px solid rgba(212, 154, 91, 0.25)',
              padding: '14px 18px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Smartphone size={20} color="var(--crema-gold)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Automated SMS Class Reminders</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Send automated SMS alert 1 hour before class to assigned trainer & enrolled trainees.
                </div>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={smsReminder}
                onChange={(e) => setSmsReminder(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: smsReminder ? '#6EE7B7' : 'var(--text-muted)' }}>
                {smsReminder ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
              style={{
                background: hasAnyConflict ? 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)' : undefined,
              }}
            >
              {isSaving ? (
                'Publishing Schedule...'
              ) : hasAnyConflict ? (
                <>
                  <AlertTriangle size={16} />
                  <span>Force Schedule (Conflict Warning)</span>
                </>
              ) : (
                <>
                  <Calendar size={16} />
                  <span>Publish Timetable Slot</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
