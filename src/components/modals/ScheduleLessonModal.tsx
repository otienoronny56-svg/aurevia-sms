import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { TimetableLesson, LessonMode, Cohort, LabVenue } from '../../types/database.types';
import { ManageLabsModal } from './ManageLabsModal';
import {
  X, Calendar, Clock, MapPin, User, BookOpen, Video,
  Smartphone, CheckCircle2, Sparkles, Check, Flame, Beaker,
  Compass, Wrench, AlertTriangle, UserX, Plus, ExternalLink
} from 'lucide-react';

interface ScheduleLessonModalProps {
  branchId: string;
  initialDay?: TimetableLesson['day_of_week'];
  initialStartTime?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ScheduleLessonModal: React.FC<ScheduleLessonModalProps> = ({
  branchId,
  initialDay,
  initialStartTime,
  onClose,
  onSuccess,
}) => {
  const { cohorts, courses, profiles, lessons, labs, createLesson } = useApp();

  const branchCohorts = cohorts.filter((c) => c.branch_id === branchId || !c.branch_id);
  const branchInstructors = profiles.filter(
    (p) => (p.branch_id === branchId || !p.branch_id) && (p.role === 'instructor' || p.role === 'super_admin')
  );

  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const selectedCourse = courses.find((c) => c.id === courseId) || courses[0];

  const matchingCohorts = branchCohorts.filter((c) => c.course_id === courseId);
  const [cohortId, setCohortId] = useState(matchingCohorts[0]?.id || branchCohorts[0]?.id || '');

  const [instructorId, setInstructorId] = useState(
    matchingCohorts[0]?.instructor_id || branchInstructors[0]?.id || ''
  );
  const selectedInstructor = profiles.find((p) => p.id === instructorId);

  // Lesson Delivery Mode: physical_lab | virtual_theory | field_trip
  const [lessonMode, setLessonMode] = useState<LessonMode>('physical_lab');

  // Day & Time
  const [dayOfWeek, setDayOfWeek] = useState<TimetableLesson['day_of_week']>(initialDay || 'Monday');
  const [startTime, setStartTime] = useState(initialStartTime || '10:00');
  const [endTime, setEndTime] = useState('12:00');

  // Location / Lab selection
  const [selectedLabId, setSelectedLabId] = useState<string>(labs[0]?.id || 'lab-1');
  const [customLocationName, setCustomLocationName] = useState(labs[0]?.name || 'Espresso Lab 1');
  const [equipmentNeeded, setEquipmentNeeded] = useState('Scales, Portafilters, Tampers, Specialty Beans');
  const [googleMeetUrl, setGoogleMeetUrl] = useState('https://meet.google.com/aur-class-live');
  const [fieldTripLocation, setFieldTripLocation] = useState('Kiambu Coffee Estate & Washing Station Tour');

  const [smsReminder, setSmsReminder] = useState(true);
  const [isRecurring, setIsRecurring] = useState(true);
  const [allowConflictOverride, setAllowConflictOverride] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [showManageLabs, setShowManageLabs] = useState(false);

  // Convert "HH:MM" to minutes for math
  const toMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const newStartMin = toMinutes(startTime);
  const newEndMin = toMinutes(endTime);

  // Calculate duration string e.g. "2 hrs"
  const durationText = useMemo(() => {
    const diff = newEndMin - newStartMin;
    if (diff <= 0) return 'Invalid timing';
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    if (mins === 0) return `${hrs} Hour${hrs === 1 ? '' : 's'}`;
    return `${hrs}h ${mins}m`;
  }, [newStartMin, newEndMin]);

  // Quick Start Time buttons
  const QUICK_START_TIMES = ['08:00', '10:00', '12:00', '14:00', '16:00'];

  // Quick Duration buttons (auto calculates end time based on startTime!)
  const applyQuickDuration = (durationMinutes: number) => {
    const startM = toMinutes(startTime);
    const endM = startM + durationMinutes;
    const endH = Math.floor(endM / 60);
    const endMinRem = endM % 60;
    const formatted = `${String(endH % 24).padStart(2, '0')}:${String(endMinRem).padStart(2, '0')}`;
    setEndTime(formatted);
  };

  const setQuickStartTime = (st: string) => {
    setStartTime(st);
    // Keep current duration if valid
    const currentDur = newEndMin - newStartMin;
    const durToUse = currentDur > 0 ? currentDur : 120; // default 2 hours
    const startM = toMinutes(st);
    const endM = startM + durToUse;
    const endH = Math.floor(endM / 60);
    const endMinRem = endM % 60;
    setEndTime(`${String(endH % 24).padStart(2, '0')}:${String(endMinRem).padStart(2, '0')}`);
  };

  // Determine effective lab location name
  const currentLabName = useMemo(() => {
    if (lessonMode === 'virtual_theory') return 'Virtual Classroom';
    if (lessonMode === 'field_trip') return fieldTripLocation.trim() || 'Off-Campus Estate';
    const foundLab = labs.find((l) => l.id === selectedLabId);
    return foundLab?.name || customLocationName || 'Espresso Lab 1';
  }, [lessonMode, selectedLabId, customLocationName, fieldTripLocation, labs]);

  // 1. Lab Conflict Check (Physical rooms only)
  const labConflictLesson = useMemo(() => {
    if (lessonMode !== 'physical_lab') return null;
    return lessons.find((l) => {
      if (l.branch_id && branchId && l.branch_id !== branchId) return false;
      if (l.day_of_week !== dayOfWeek) return false;
      if (l.lesson_mode === 'virtual_theory') return false; // Virtual doesn't occupy physical lab
      if (l.lab_location.trim().toLowerCase() !== currentLabName.trim().toLowerCase()) return false;

      const existStart = toMinutes(l.start_time);
      const existEnd = toMinutes(l.end_time);
      return newStartMin < existEnd && newEndMin > existStart;
    });
  }, [lessonMode, lessons, branchId, dayOfWeek, currentLabName, newStartMin, newEndMin]);

  const labConflictCourse = labConflictLesson ? courses.find((c) => c.id === labConflictLesson.course_id) : null;
  const labConflictTrainer = labConflictLesson ? profiles.find((p) => p.id === labConflictLesson.instructor_id) : null;
  const labConflictCohort = labConflictLesson ? cohorts.find((c) => c.id === labConflictLesson.cohort_id) : null;

  // 2. Instructor Double-Booking Check (Any mode: lab, virtual, field!)
  const trainerConflictLesson = useMemo(() => {
    if (!instructorId) return null;
    return lessons.find((l) => {
      if (l.instructor_id !== instructorId) return false;
      if (l.day_of_week !== dayOfWeek) return false;

      const existStart = toMinutes(l.start_time);
      const existEnd = toMinutes(l.end_time);
      return newStartMin < existEnd && newEndMin > existStart;
    });
  }, [instructorId, lessons, dayOfWeek, newStartMin, newEndMin]);

  const trainerConflictCourse = trainerConflictLesson ? courses.find((c) => c.id === trainerConflictLesson.course_id) : null;
  const trainerConflictCohort = trainerConflictLesson ? cohorts.find((c) => c.id === trainerConflictLesson.cohort_id) : null;

  // 3. Cohort Double-Booking Check
  const cohortConflictLesson = useMemo(() => {
    if (!cohortId) return null;
    return lessons.find((l) => {
      if (l.cohort_id !== cohortId) return false;
      if (l.day_of_week !== dayOfWeek) return false;

      const existStart = toMinutes(l.start_time);
      const existEnd = toMinutes(l.end_time);
      return newStartMin < existEnd && newEndMin > existStart;
    });
  }, [cohortId, lessons, dayOfWeek, newStartMin, newEndMin]);

  const hasAnyConflict = !!labConflictLesson || !!trainerConflictLesson || !!cohortConflictLesson;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEndMin <= newStartMin) {
      alert('End time must be after start time.');
      return;
    }

    if (hasAnyConflict && !allowConflictOverride) {
      alert('Cannot schedule lesson: A schedule conflict was detected. Please choose an available room or trainer, or enable override.');
      return;
    }

    setIsSaving(true);
    try {
      await createLesson({
        branch_id: branchId,
        cohort_id: cohortId || branchCohorts[0]?.id,
        course_id: courseId,
        instructor_id: instructorId,
        topic_title: selectedCourse?.title || 'Specialty Coffee Practical Session',
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        lesson_mode: lessonMode,
        lab_location: currentLabName,
        equipment_needed: lessonMode === 'physical_lab' ? equipmentNeeded : undefined,
        google_meet_url: lessonMode === 'virtual_theory' ? googleMeetUrl : undefined,
        sms_reminder_enabled: smsReminder,
        is_recurring: isRecurring,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert('Error scheduling timetable session: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
        <div
          className="modal-content glass-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '780px',
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
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
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  Smart Timetable & Lab Session Scheduler
                </h3>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Allocate labs, online theory, or farm trips with automated real-time conflict checking
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              style={{ padding: '6px', borderRadius: '50%' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSubmit} style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* 1. DELIVERY FORMAT CARDS (Physical Lab / Virtual Theory / Field Trip) */}
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                1. Delivery Format & Setting *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {/* Option 1: Physical Lab */}
                <div
                  onClick={() => setLessonMode('physical_lab')}
                  style={{
                    background: lessonMode === 'physical_lab' ? 'rgba(212, 154, 91, 0.16)' : 'var(--bg-surface-elevated)',
                    border: `2px solid ${lessonMode === 'physical_lab' ? 'var(--crema-gold)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Beaker size={18} color="var(--crema-gold)" />
                    <span style={{ fontWeight: 700, fontSize: '0.86rem', color: lessonMode === 'physical_lab' ? 'var(--crema-gold)' : 'var(--text-primary)' }}>
                      In-Person Lab
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Physical machinery lab with automated room collision prevention
                  </span>
                </div>

                {/* Option 2: Virtual Theory */}
                <div
                  onClick={() => setLessonMode('virtual_theory')}
                  style={{
                    background: lessonMode === 'virtual_theory' ? 'rgba(110, 231, 183, 0.14)' : 'var(--bg-surface-elevated)',
                    border: `2px solid ${lessonMode === 'virtual_theory' ? '#6EE7B7' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Video size={18} color="#6EE7B7" />
                    <span style={{ fontWeight: 700, fontSize: '0.86rem', color: lessonMode === 'virtual_theory' ? '#6EE7B7' : 'var(--text-primary)' }}>
                      Online / Virtual
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Live Google Meet theory class (no physical room clash)
                  </span>
                </div>

                {/* Option 3: Field Trip */}
                <div
                  onClick={() => setLessonMode('field_trip')}
                  style={{
                    background: lessonMode === 'field_trip' ? 'rgba(234, 179, 8, 0.14)' : 'var(--bg-surface-elevated)',
                    border: `2px solid ${lessonMode === 'field_trip' ? '#EAB308' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Compass size={18} color="#EAB308" />
                    <span style={{ fontWeight: 700, fontSize: '0.86rem', color: lessonMode === 'field_trip' ? '#EAB308' : 'var(--text-primary)' }}>
                      Field / Farm Trip
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Off-campus coffee estate or wet washing station tour
                  </span>
                </div>
              </div>
            </div>

            {/* 2. TIME SELECTION WITH CHILD-SIMPLE PRESETS (8:00, 10:00, 1hr, 2hr) */}
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={15} color="var(--crema-gold)" />
                  <span>2. Schedule Day & Timing (1-Click Presets) *</span>
                </label>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: newEndMin > newStartMin ? 'rgba(110, 231, 183, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: newEndMin > newStartMin ? '#6EE7B7' : '#FCA5A5',
                  }}
                >
                  ⏱️ {durationText} ({startTime} - {endTime})
                </span>
              </div>

              {/* Day of Week & Manual Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Day of Week
                  </label>
                  <select
                    className="form-select"
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(e.target.value as any)}
                    style={{ width: '100%' }}
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

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    className="input-field"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    className="input-field"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Quick Start Buttons: 8:00 AM, 10:00 AM, etc. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Quick Start:
                </span>
                {QUICK_START_TIMES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setQuickStartTime(st)}
                    style={{
                      background: startTime === st ? 'rgba(212, 154, 91, 0.25)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${startTime === st ? 'var(--crema-gold)' : 'var(--border-subtle)'}`,
                      color: startTime === st ? 'var(--crema-gold)' : 'var(--text-secondary)',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.74rem',
                      fontWeight: startTime === st ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {st === '08:00' ? '08:00 AM' : st === '10:00' ? '10:00 AM' : st === '12:00' ? '12:00 PM' : st === '14:00' ? '02:00 PM' : '04:00 PM'}
                  </button>
                ))}
              </div>

              {/* Quick Duration Buttons: 1 hr, 1.5 hr, 2 hr, 3 hr, 4 hr */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Set Duration:
                </span>
                {[
                  { label: '1 Hour', mins: 60 },
                  { label: '1.5 Hours', mins: 90 },
                  { label: '2 Hours (Standard)', mins: 120 },
                  { label: '3 Hours', mins: 180 },
                  { label: '4 Hours (Half Day)', mins: 240 },
                ].map((dur) => {
                  const isCurrent = newEndMin - newStartMin === dur.mins;
                  return (
                    <button
                      key={dur.label}
                      type="button"
                      onClick={() => applyQuickDuration(dur.mins)}
                      style={{
                        background: isCurrent ? 'rgba(110, 231, 183, 0.18)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isCurrent ? '#6EE7B7' : 'var(--border-subtle)'}`,
                        color: isCurrent ? '#6EE7B7' : 'var(--text-secondary)',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: isCurrent ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      ⚡ {dur.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. LAB ROOM / LOCATION CONFIGURATION */}
            {lessonMode === 'physical_lab' ? (
              <div
                style={{
                  background: labConflictLesson ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-surface-elevated)',
                  border: `1.5px solid ${labConflictLesson ? '#EF4444' : 'var(--border-medium)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Beaker size={15} color="var(--crema-gold)" />
                    <span>3. Select Campus Laboratory Room *</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowManageLabs(true)}
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={12} />
                    <span>Add / Manage Labs</span>
                  </button>
                </div>

                {/* Lab Buttons with Live Availability Badges */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                  {labs.map((lab) => {
                    // Check if this lab is occupied at this day & time
                    const isBusy = lessons.some((l) => {
                      if (l.branch_id && branchId && l.branch_id !== branchId) return false;
                      if (l.day_of_week !== dayOfWeek) return false;
                      if (l.lesson_mode === 'virtual_theory') return false;
                      if (l.lab_location.trim().toLowerCase() !== lab.name.trim().toLowerCase()) return false;
                      const eStart = toMinutes(l.start_time);
                      const eEnd = toMinutes(l.end_time);
                      return newStartMin < eEnd && newEndMin > eStart;
                    });

                    const isSelected = selectedLabId === lab.id;

                    return (
                      <div
                        key={lab.id}
                        onClick={() => {
                          setSelectedLabId(lab.id);
                          setCustomLocationName(lab.name);
                        }}
                        style={{
                          background: isSelected
                            ? (isBusy ? 'rgba(239, 68, 68, 0.22)' : 'rgba(212, 154, 91, 0.22)')
                            : (isBusy ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-card)'),
                          border: `1.5px solid ${
                            isSelected
                              ? (isBusy ? '#EF4444' : 'var(--crema-gold)')
                              : (isBusy ? 'rgba(239, 68, 68, 0.35)' : 'var(--border-subtle)')
                          }`,
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.84rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {lab.name}
                          </span>
                          <span
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              padding: '2px 5px',
                              borderRadius: '4px',
                              background: isBusy ? 'rgba(239, 68, 68, 0.2)' : 'rgba(110, 231, 183, 0.15)',
                              color: isBusy ? '#FCA5A5' : '#6EE7B7',
                            }}
                          >
                            {isBusy ? '⚠️ Occupied' : '✓ Free'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          Capacity: {lab.capacity || 12} stations • {lab.code}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Required Tools & Lab Gear (Optional)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={equipmentNeeded}
                    onChange={(e) => setEquipmentNeeded(e.target.value)}
                    placeholder="e.g. Scales, Portafilters, Tampers, Specialty Beans"
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>
            ) : lessonMode === 'virtual_theory' ? (
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                }}
              >
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Video size={15} color="#6EE7B7" />
                  <span>3. Google Meet Virtual Classroom URL *</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    className="input-field"
                    value={googleMeetUrl}
                    onChange={(e) => setGoogleMeetUrl(e.target.value)}
                    placeholder="https://meet.google.com/xxx-yyyy-zzz"
                    required
                    style={{ flex: 1, fontSize: '0.82rem' }}
                  />
                  <a
                    href={googleMeetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                  >
                    <ExternalLink size={12} />
                    <span>Test Link</span>
                  </a>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  This URL will be sent via SMS and visible in the student portal & instructor dashboard.
                </span>
              </div>
            ) : (
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                }}
              >
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Compass size={15} color="#EAB308" />
                  <span>3. Estate Destination & Tour Logistics *</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={fieldTripLocation}
                  onChange={(e) => setFieldTripLocation(e.target.value)}
                  placeholder="e.g. Kiambu Coffee Estate & Washing Station Tour"
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>
            )}

            {/* 4. COURSE, COHORT, & TRAINER ALLOCATION */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Academic Course *
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
                  style={{ width: '100%', fontSize: '0.82rem' }}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} • {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Target Cohort Intake *
                </label>
                <select
                  className="form-select"
                  value={cohortId}
                  onChange={(e) => {
                    setCohortId(e.target.value);
                    const c = branchCohorts.find((x) => x.id === e.target.value);
                    if (c?.instructor_id) setInstructorId(c.instructor_id);
                  }}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                >
                  {branchCohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                  Faculty Trainer *
                  {trainerConflictLesson && (
                    <span style={{ color: '#EF4444', fontWeight: 700, marginLeft: '6px' }}>
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
                    width: '100%',
                    fontSize: '0.82rem',
                    border: trainerConflictLesson ? '1.5px solid #EF4444' : undefined,
                    background: trainerConflictLesson ? 'rgba(239, 68, 68, 0.08)' : undefined,
                  }}
                >
                  {branchInstructors.map((inst) => {
                    const isBusy = lessons.some((l) => {
                      if (l.instructor_id !== inst.id) return false;
                      if (l.day_of_week !== dayOfWeek) return false;
                      const eStart = toMinutes(l.start_time);
                      const eEnd = toMinutes(l.end_time);
                      return newStartMin < eEnd && newEndMin > eStart;
                    });

                    return (
                      <option key={inst.id} value={inst.id}>
                        {inst.full_name} {isBusy ? '⚠️ [Occupied]' : '✓ [Available]'}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* 5. REAL-TIME SMART COLLISION / CLASH WARNING BANNERS */}
            {labConflictLesson && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.14)',
                  border: '1.5px solid #EF4444',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <AlertTriangle size={22} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#FCA5A5', fontWeight: 700, fontSize: '0.88rem' }}>
                    🚫 Laboratory Room Collision: {currentLabName} is Occupied!
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                    <strong style={{ color: '#FCA5A5' }}>{currentLabName}</strong> is already allocated on{' '}
                    <strong>{dayOfWeek}</strong> from <strong>{labConflictLesson.start_time} to {labConflictLesson.end_time}</strong> for{' '}
                    <strong style={{ color: 'var(--crema-gold)' }}>{labConflictCohort?.name || 'Cohort'}</strong> ({labConflictCourse?.title || labConflictLesson.topic_title}){' '}
                    taught by <strong>{labConflictTrainer?.full_name || 'Faculty Trainer'}</strong>.
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#FCA5A5', marginTop: '6px' }}>
                    💡 Action: Switch to an available room above (marked with ✓ Free) or adjust your session time.
                  </div>
                </div>
              </div>
            )}

            {trainerConflictLesson && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.14)',
                  border: '1.5px solid #EF4444',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <UserX size={22} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#FCA5A5', fontWeight: 700, fontSize: '0.88rem' }}>
                    🚫 Faculty Trainer Double-Booking: {selectedInstructor?.full_name} is Busy!
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                    <strong style={{ color: '#FCA5A5' }}>{selectedInstructor?.full_name}</strong> is already scheduled to teach{' '}
                    <strong style={{ color: 'var(--crema-gold)' }}>{trainerConflictCourse?.title || trainerConflictLesson.topic_title}</strong> in{' '}
                    <strong>{trainerConflictLesson.lab_location}</strong> on <strong>{dayOfWeek}</strong> from{' '}
                    <strong>{trainerConflictLesson.start_time} to {trainerConflictLesson.end_time}</strong> ({trainerConflictCohort?.name || 'Cohort'}).
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#FCA5A5', marginTop: '6px' }}>
                    💡 Action: Assign a different available trainer from the dropdown or select a different time window.
                  </div>
                </div>
              </div>
            )}

            {cohortConflictLesson && (
              <div
                style={{
                  background: 'rgba(234, 179, 8, 0.14)',
                  border: '1.5px solid #EAB308',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <AlertTriangle size={22} color="#EAB308" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#FDE047', fontWeight: 700, fontSize: '0.88rem' }}>
                    ⚠️ Cohort Schedule Overlap: Trainees are Already Booked!
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                    This cohort is already taking <strong>{cohortConflictLesson.topic_title}</strong> on{' '}
                    <strong>{dayOfWeek}</strong> from <strong>{cohortConflictLesson.start_time} to {cohortConflictLesson.end_time}</strong>.
                  </div>
                </div>
              </div>
            )}

            {!hasAnyConflict && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#6EE7B7',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={18} color="#10B981" />
                <span>All Clear! No room or trainer clashes detected for this time slot.</span>
              </div>
            )}

            {/* Automated SMS Reminder & Recurring Options */}
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={smsReminder}
                  onChange={(e) => setSmsReminder(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  Send automated SMS timetable alerts to trainer & students
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  Recurring weekly lesson
                </span>
              </label>
            </div>

            {/* Conflict Override Option if Clash exists */}
            {hasAnyConflict && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>
                <input
                  type="checkbox"
                  id="conflictOverride"
                  checked={allowConflictOverride}
                  onChange={(e) => setAllowConflictOverride(e.target.checked)}
                  style={{ width: '15px', height: '15px' }}
                />
                <label htmlFor="conflictOverride" style={{ fontSize: '0.75rem', color: '#FCA5A5', cursor: 'pointer', fontWeight: 600 }}>
                  I understand the conflict. Force schedule anyway as administrator override.
                </label>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || (hasAnyConflict && !allowConflictOverride)}
                className="btn btn-primary"
                style={{
                  padding: '9px 20px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  background: hasAnyConflict && !allowConflictOverride
                    ? 'rgba(239, 68, 68, 0.3)'
                    : undefined,
                  borderColor: hasAnyConflict && !allowConflictOverride ? '#EF4444' : undefined,
                  cursor: hasAnyConflict && !allowConflictOverride ? 'not-allowed' : 'pointer',
                }}
              >
                {isSaving ? (
                  <span>Saving Timetable Session...</span>
                ) : hasAnyConflict && !allowConflictOverride ? (
                  <span>⚠️ Cannot Schedule (Conflict Detected)</span>
                ) : hasAnyConflict && allowConflictOverride ? (
                  <span>⚠️ Force Schedule (Admin Override)</span>
                ) : (
                  <span>✓ Publish Timetable Slot</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Manage Labs Modal */}
      {showManageLabs && (
        <ManageLabsModal
          branchId={branchId}
          onClose={() => setShowManageLabs(false)}
          onLabCreated={(newLab) => {
            setSelectedLabId(newLab.id);
            setCustomLocationName(newLab.name);
            setShowManageLabs(false);
          }}
        />
      )}
    </>
  );
};
