import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { Cohort, TimetableLesson } from '../../types/database.types';
import { Calendar, CheckCircle2, UserCheck, X, Building2, BookOpen, Clock, User, Check, Users, Sparkles } from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';

interface AttendanceModalProps {
  cohort?: Cohort | null;
  initialLesson?: TimetableLesson;
  defaultCampusId?: string;
  defaultCourseId?: string;
  onClose: () => void;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  cohort: propCohort,
  initialLesson,
  defaultCampusId,
  defaultCourseId,
  onClose,
}) => {
  const {
    students,
    profiles,
    enrollments,
    attendance,
    branches,
    courses,
    cohorts,
    lessons,
    currentProfile,
    recordAttendance,
  } = useApp();

  const isSuperAdmin = currentProfile.role === 'super_admin';
  const isBranchManager = currentProfile.role === 'branch_manager';

  // 1. Campus State
  const [selectedCampusId, setSelectedCampusId] = useState<string>(() => {
    if (propCohort?.branch_id) return propCohort.branch_id;
    if (defaultCampusId && defaultCampusId !== 'ALL') return defaultCampusId;
    if (isBranchManager && currentProfile.branch_id) return currentProfile.branch_id;
    return branches[0]?.id || 'ALL';
  });

  // 2. Course State
  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => {
    if (propCohort?.course_id) return propCohort.course_id;
    if (defaultCourseId && defaultCourseId !== 'ALL') return defaultCourseId;
    return 'ALL';
  });

  // Campus Change Handler with Auto-Cascading Cohort & Instructor Reset
  const handleCampusChange = (newCampusId: string) => {
    setSelectedCampusId(newCampusId);

    // Find cohorts that match the new campus (and current course if possible)
    let matched = cohorts.filter((c) => {
      if (newCampusId !== 'ALL' && c.branch_id !== newCampusId) return false;
      if (selectedCourseId !== 'ALL' && c.course_id !== selectedCourseId) return false;
      return true;
    });

    // If no cohorts matched with this specific course, reset course to 'ALL'
    if (matched.length === 0) {
      setSelectedCourseId('ALL');
      matched = cohorts.filter((c) => newCampusId === 'ALL' || c.branch_id === newCampusId);
    }

    if (matched.length > 0) {
      setSelectedCohortId(matched[0].id);
    }

    // Auto switch instructor to this campus's faculty
    const campusFaculty = profiles.filter(
      (p) => (p.role === 'instructor' || p.role === 'branch_manager') && (newCampusId === 'ALL' || p.branch_id === newCampusId)
    );
    if (campusFaculty.length > 0) {
      setSelectedInstructorId(campusFaculty[0].id);
    }
  };

  // Course Change Handler with Auto-Cascading Cohort Reset
  const handleCourseChange = (newCourseId: string) => {
    setSelectedCourseId(newCourseId);
    const matched = cohorts.filter((c) => {
      if (selectedCampusId !== 'ALL' && c.branch_id !== selectedCampusId) return false;
      if (newCourseId !== 'ALL' && c.course_id !== newCourseId) return false;
      return true;
    });
    if (matched.length > 0) {
      setSelectedCohortId(matched[0].id);
    }
  };

  // Available cohorts cascading by campus & course
  const filteredCohorts = useMemo(() => {
    return cohorts.filter((c) => {
      if (selectedCampusId !== 'ALL' && c.branch_id !== selectedCampusId) return false;
      if (selectedCourseId !== 'ALL' && c.course_id !== selectedCourseId) return false;
      return true;
    });
  }, [cohorts, selectedCampusId, selectedCourseId]);

  // 3. Cohort State
  const [selectedCohortId, setSelectedCohortId] = useState<string>(() => {
    if (propCohort?.id) return propCohort.id;
    return filteredCohorts[0]?.id || cohorts[0]?.id || '';
  });

  // Sync cohort if filter changes and current selection is no longer valid
  useEffect(() => {
    if (!filteredCohorts.some((c) => c.id === selectedCohortId)) {
      if (filteredCohorts.length > 0) {
        setSelectedCohortId(filteredCohorts[0].id);
      }
    }
  }, [filteredCohorts, selectedCohortId]);

  const activeCohort = useMemo(() => {
    return cohorts.find((c) => c.id === selectedCohortId) || propCohort || cohorts[0];
  }, [cohorts, selectedCohortId, propCohort]);

  // Associated Course & Campus for active cohort
  const activeCourse = useMemo(() => {
    return courses.find((c) => c.id === activeCohort?.course_id);
  }, [courses, activeCohort]);

  const activeBranch = useMemo(() => {
    return branches.find((b) => b.id === activeCohort?.branch_id) || branches[0];
  }, [branches, activeCohort]);

  // Timetable Lessons for this cohort
  const cohortLessons = useMemo(() => {
    if (!activeCohort) return [];
    return lessons.filter((l) => l.cohort_id === activeCohort.id);
  }, [lessons, activeCohort]);

  // 4. Session & Topic State
  const [selectedLessonId, setSelectedLessonId] = useState<string>(() => {
    if (initialLesson?.id) return initialLesson.id;
    return cohortLessons.length > 0 ? cohortLessons[0].id : 'CUSTOM';
  });

  const [sessionDate, setSessionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [sessionTitle, setSessionTitle] = useState<string>(() => {
    if (initialLesson?.topic_title) return initialLesson.topic_title;
    if (cohortLessons.length > 0) return cohortLessons[0].topic_title;
    return 'Practical Session: Machine Calibration';
  });

  // Update session title & details when a scheduled lesson is chosen
  const handleLessonSelect = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    if (lessonId !== 'CUSTOM') {
      const foundLesson = cohortLessons.find((l) => l.id === lessonId);
      if (foundLesson) {
        setSessionTitle(foundLesson.topic_title);
        if (foundLesson.instructor_id) {
          setSelectedInstructorId(foundLesson.instructor_id);
        }
      }
    }
  };

  const activeLesson = cohortLessons.find((l) => l.id === selectedLessonId);

  // Dynamic Campus Instructors (filtered by the active campus)
  const campusInstructors = useMemo(() => {
    return profiles.filter((p) => {
      const isTrainer = p.role === 'instructor' || p.role === 'branch_manager' || p.role === 'super_admin';
      if (!isTrainer) return false;
      if (selectedCampusId === 'ALL') return true;
      return p.branch_id === selectedCampusId;
    });
  }, [profiles, selectedCampusId]);

  const [selectedInstructorId, setSelectedInstructorId] = useState<string>(() => {
    if (activeLesson?.instructor_id) return activeLesson.instructor_id;
    if (activeCohort?.instructor_id) return activeCohort.instructor_id;
    return campusInstructors[0]?.id || profiles.find((p) => p.role === 'instructor')?.id || '';
  });

  // Sync instructor when lesson, cohort, or campus changes
  useEffect(() => {
    if (activeLesson?.instructor_id) {
      setSelectedInstructorId(activeLesson.instructor_id);
    } else if (activeCohort?.instructor_id) {
      setSelectedInstructorId(activeCohort.instructor_id);
    } else if (campusInstructors.length > 0 && !campusInstructors.some((ci) => ci.id === selectedInstructorId)) {
      setSelectedInstructorId(campusInstructors[0].id);
    }
  }, [selectedCampusId, selectedCohortId, selectedLessonId, activeLesson, activeCohort, campusInstructors]);

  // Options for custom styled dropdowns
  const campusOptions = useMemo(() => {
    return branches.map((b) => ({
      value: b.id,
      label: b.name,
      sublabel: b.city,
      icon: <Building2 size={13} />,
    }));
  }, [branches]);

  const courseOptions = useMemo(() => {
    return [
      { value: 'ALL', label: 'All Course Tracks', icon: <BookOpen size={13} /> },
      ...courses.map((c) => ({
        value: c.id,
        label: c.title,
        sublabel: `${c.duration_weeks} Weeks • KES ${c.fee_amount.toLocaleString()}`,
        icon: <BookOpen size={13} />,
      })),
    ];
  }, [courses]);

  const cohortOptions = useMemo(() => {
    return filteredCohorts.map((c) => ({
      value: c.id,
      label: c.name,
      sublabel: c.schedule_timing,
      icon: <Users size={13} />,
    }));
  }, [filteredCohorts]);

  const lessonOptions = useMemo(() => {
    return [
      ...cohortLessons.map((l) => {
        const inst = profiles.find((p) => p.id === l.instructor_id);
        return {
          value: l.id,
          label: `${l.day_of_week} (${l.start_time} - ${l.end_time})`,
          sublabel: `${l.topic_title} • Trainer: ${inst?.full_name?.split(' ')[0] || 'Faculty'}`,
          icon: <Clock size={13} />,
        };
      }),
      {
        value: 'CUSTOM',
        label: '+ Custom Session / Calibration',
        sublabel: 'Manual Topic & Timeslot',
      },
    ];
  }, [cohortLessons, profiles]);

  const instructorOptions = useMemo(() => {
    return campusInstructors.map((inst) => {
      const instBranch = branches.find((b) => b.id === inst.branch_id);
      return {
        value: inst.id,
        label: inst.full_name,
        sublabel: `${inst.specialty || inst.role.replace('_', ' ')} ${selectedCampusId === 'ALL' && instBranch ? `[${instBranch.city}]` : ''}`,
        icon: <User size={13} />,
      };
    });
  }, [campusInstructors, branches, selectedCampusId]);

  // 5. Enrolled students for this cohort
  const cohortEnrollments = useMemo(() => {
    if (!activeCohort) return [];
    return enrollments.filter((e) => e.cohort_id === activeCohort.id);
  }, [enrollments, activeCohort]);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Student statuses state
  const [statusMap, setStatusMap] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({});

  // Populate or refresh status map when cohort or date changes
  useEffect(() => {
    const map: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {};
    cohortEnrollments.forEach((e) => {
      const existing = attendance.find(
        (a) => a.cohort_id === activeCohort?.id && a.student_id === e.student_id && a.session_date === sessionDate
      );
      map[e.student_id] = existing ? existing.status : 'present';
    });
    setStatusMap(map);
  }, [cohortEnrollments, activeCohort?.id, sessionDate, attendance]);

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setStatusMap((prev) => ({ ...prev, [studentId]: status }));
  };

  // Batch Quick Actions
  const handleBatchMark = (status: 'present' | 'absent' | 'late' | 'excused') => {
    const updated: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {};
    cohortEnrollments.forEach((enr) => {
      updated[enr.student_id] = status;
    });
    setStatusMap(updated);
  };

  // Status counts for tally bar
  const statusCounts = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;
    Object.values(statusMap).forEach((st) => {
      if (st === 'present') present++;
      else if (st === 'late') late++;
      else if (st === 'absent') absent++;
      else if (st === 'excused') excused++;
    });
    return { present, late, absent, excused, total: cohortEnrollments.length };
  }, [statusMap, cohortEnrollments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCohort) return;

    for (const enr of cohortEnrollments) {
      await recordAttendance({
        cohortId: activeCohort.id,
        studentId: enr.student_id,
        sessionDate,
        sessionTitle: sessionTitle.trim() || 'Practical Lab Session',
        status: statusMap[enr.student_id] || 'present',
      });
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '820px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, rgba(212, 154, 91, 0.25) 0%, rgba(110, 231, 183, 0.2) 100%)',
                border: '1px solid rgba(212, 154, 91, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={22} color="var(--crema-gold)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Digital Session Roll-Call</h3>
                <span className="badge badge-gold" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  {activeBranch?.name}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {activeCourse?.title || 'Specialty Coffee Track'} • {cohortEnrollments.length} Enrolled Trainees
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {savedSuccess ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={36} color="#10B981" />
              </div>
              <h4 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                Session Roll-Call Successfully Saved!
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                {cohortEnrollments.length} trainee attendance records verified and committed to the institutional audit log.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* 1. Cascading Educational Filters & Class Session Context */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '18px',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--crema-gold)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} />
                  <span>Class Session & Academic Context</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  {/* Campus / School Selector */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <Building2 size={12} />
                      <span>Academy Campus / School</span>
                    </label>
                    <CustomSelect
                      value={selectedCampusId}
                      onChange={handleCampusChange}
                      options={campusOptions}
                      disabled={!isSuperAdmin}
                      icon={<Building2 size={13} />}
                    />
                  </div>

                  {/* Course Selector */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <BookOpen size={12} />
                      <span>Course Track</span>
                    </label>
                    <CustomSelect
                      value={selectedCourseId}
                      onChange={handleCourseChange}
                      options={courseOptions}
                      icon={<BookOpen size={13} />}
                    />
                  </div>

                  {/* Cohort Selector */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <Users size={12} />
                      <span>Enrolled Cohort Batch</span>
                    </label>
                    <CustomSelect
                      value={selectedCohortId}
                      onChange={setSelectedCohortId}
                      options={cohortOptions}
                      icon={<Users size={13} />}
                    />
                  </div>
                </div>

                {/* Scheduled Lesson & Instructor Sync */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <Clock size={12} />
                      <span>Scheduled Timetable Session (Teacher Level)</span>
                    </label>
                    <CustomSelect
                      value={selectedLessonId}
                      onChange={handleLessonSelect}
                      options={lessonOptions}
                      icon={<Clock size={13} />}
                    />
                  </div>

                  {/* Dynamic Lead Trainer Selector */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <User size={12} />
                      <span>Lead Trainer / Proctor In-Charge</span>
                    </label>
                    <CustomSelect
                      value={selectedInstructorId}
                      onChange={setSelectedInstructorId}
                      options={instructorOptions}
                      icon={<User size={13} />}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Session Date & Topic Input */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginBottom: '18px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Session Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    required
                    style={{ fontSize: '0.84rem', height: '38px', padding: '6px 12px' }}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Session Topic / Practical Laboratory Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    required
                    placeholder="e.g. Espresso Extraction & Dialing Calibration"
                    style={{ fontSize: '0.84rem', height: '38px', padding: '6px 12px' }}
                  />
                </div>
              </div>

              {/* 3. Batch Actions & Attendance Tally Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  <span>Tally:</span>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>{statusCounts.present} Present</span>
                  <span>•</span>
                  <span style={{ color: 'var(--crema-gold)', fontWeight: 700 }}>{statusCounts.late} Late</span>
                  <span>•</span>
                  <span style={{ color: '#EF4444', fontWeight: 700 }}>{statusCounts.absent} Absent</span>
                  {statusCounts.excused > 0 && (
                    <>
                      <span>•</span>
                      <span style={{ color: '#38BDF8', fontWeight: 700 }}>{statusCounts.excused} Excused</span>
                    </>
                  )}
                </div>

                {/* Batch Mark Buttons */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleBatchMark('present')}
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10B981',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ✓ All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatchMark('late')}
                    style={{
                      background: 'rgba(212, 154, 91, 0.15)',
                      color: 'var(--crema-gold)',
                      border: '1px solid rgba(212, 154, 91, 0.3)',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ⏰ All Late
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatchMark('absent')}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#EF4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ✕ All Absent
                  </button>
                </div>
              </div>

              {/* 4. Student Roll-Call List */}
              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  marginBottom: '20px',
                }}
              >
                {cohortEnrollments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No students currently enrolled in this cohort. Select a different batch or register students.
                  </div>
                ) : (
                  cohortEnrollments.map((enr, idx) => {
                    const st = students.find((s) => s.id === enr.student_id);
                    const pr = profiles.find((p) => p.id === st?.profile_id);
                    const currentStat = statusMap[enr.student_id] || 'present';

                    return (
                      <div
                        key={enr.id}
                        style={{
                          padding: '10px 14px',
                          borderBottom: idx === cohortEnrollments.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.04)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                              color: '#181310',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {(pr?.full_name || 'T').charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {pr?.full_name || 'Enrolled Trainee'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--crema-gold)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                              {pr?.reg_number || 'Pending Reg'}
                            </div>
                          </div>
                        </div>

                        {/* Status Pills Selector */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {(['present', 'late', 'excused', 'absent'] as const).map((stat) => {
                            const isSelected = currentStat === stat;
                            const colors = {
                              present: { bg: 'rgba(16, 185, 129, 0.25)', border: '#10B981', text: '#6EE7B7' },
                              late: { bg: 'rgba(212, 154, 91, 0.25)', border: 'var(--crema-gold)', text: '#FCD34D' },
                              absent: { bg: 'rgba(239, 68, 68, 0.25)', border: '#EF4444', text: '#FCA5A5' },
                              excused: { bg: 'rgba(56, 189, 248, 0.25)', border: '#38BDF8', text: '#7DD3FC' },
                            }[stat];

                            return (
                              <button
                                type="button"
                                key={stat}
                                onClick={() => handleStatusChange(enr.student_id, stat)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.72rem',
                                  fontWeight: isSelected ? 700 : 500,
                                  textTransform: 'uppercase',
                                  cursor: 'pointer',
                                  border: isSelected ? `1px solid ${colors.border}` : '1px solid rgba(255, 255, 255, 0.08)',
                                  background: isSelected ? colors.bg : 'rgba(0, 0, 0, 0.2)',
                                  color: isSelected ? colors.text : 'var(--text-muted)',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {stat}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                  disabled={cohortEnrollments.length === 0}
                >
                  <UserCheck size={18} />
                  <span>Commit Session Roll-Call to Audit Log</span>
                </button>
                <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '0 20px' }}>
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
