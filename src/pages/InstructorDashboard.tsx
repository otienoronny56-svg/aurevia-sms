import React, { useState, useMemo } from 'react';
import { useApp } from '../lib/store';
import {
  GraduationCap, Video, Award, UserCheck, Calendar, Clock,
  CheckCircle2, Coffee, FileText, ChevronRight, BookOpen,
  MapPin, Users, Sparkles, AlertCircle, Beaker, Compass, Wrench,
  Sun, Check, Plus, Edit3, Trash2, ShieldCheck, Database, X,
  ChevronDown, ChevronUp, ChevronLeft, Search, Radio, Play, Square, PhoneOff, ExternalLink
} from 'lucide-react';
import { GradingSheetModal } from '../components/modals/GradingSheetModal';
import { EditAssessmentModal } from '../components/modals/EditAssessmentModal';
import { AttendanceModal } from '../components/modals/AttendanceModal';
import { LeaveRequestModal } from '../components/modals/LeaveRequestModal';
import { VirtualClassroomModal } from '../components/modals/VirtualClassroomModal';
import { ScheduleLiveClassModal } from '../components/modals/ScheduleLiveClassModal';
import { Cohort, TimetableLesson, Assessment, LiveClassSession } from '../types/database.types';

type InstructorTab = 'timetable' | 'cohorts' | 'live_classes' | 'grades' | 'attendance';
type DayFilter = 'Today' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'All';

interface InstructorDashboardProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
}) => {
  const {
    currentProfile,
    cohorts,
    courses,
    enrollments,
    students,
    profiles,
    assessments,
    attendance,
    staffClockins,
    branches,
    lessons,
    liveSessions,
    startLiveSession,
    endLiveSession,
    clockInStaff,
    clockOutStaff,
    deleteAssessment,
  } = useApp();

  const [localActiveTab, setLocalActiveTab] = useState<InstructorTab>('timetable');
  const activeTab = (propActiveTab as InstructorTab) || localActiveTab;
  const setActiveTab = propSetActiveTab || setLocalActiveTab;

  // Today's Day Name
  const DAYS_MAP: Record<number, TimetableLesson['day_of_week']> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };
  const todayDayName = DAYS_MAP[new Date().getDay()] || 'Monday';
  const todayIso = new Date().toISOString().split('T')[0];

  // Day Filter (Defaults to Today for clean, uncluttered mobile view)
  const [selectedDayFilter, setSelectedDayFilter] = useState<DayFilter>('Today');

  // Cohorts assigned to this instructor
  const myCohorts = cohorts.filter(
    (c) => c.instructor_id === currentProfile.id || c.branch_id === currentProfile.branch_id
  );

  // Lessons assigned to this instructor
  const myLessons = lessons.filter(
    (l) => l.instructor_id === currentProfile.id || l.branch_id === currentProfile.branch_id
  );

  const [selectedCohortForGrading, setSelectedCohortForGrading] = useState<Cohort | null>(null);
  const [selectedCohortForAttendance, setSelectedCohortForAttendance] = useState<Cohort | null>(null);
  const [selectedCohortForRoster, setSelectedCohortForRoster] = useState<Cohort | null>(null);
  const [selectedLessonForAttendance, setSelectedLessonForAttendance] = useState<TimetableLesson | null>(null);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Live Class Sessions State
  const [activeLiveSessionModal, setActiveLiveSessionModal] = useState<LiveClassSession | null>(null);
  const [showScheduleLiveModal, setShowScheduleLiveModal] = useState(false);

  // Cohort & Session Filter for Live Classes
  const myLiveSessions = liveSessions.filter((s) =>
    s.instructor_id === currentProfile.id ||
    s.branch_id === currentProfile.branch_id ||
    myCohorts.some((c) => c.id === s.cohort_id)
  );
  const activeBroadcastingSession = myLiveSessions.find((s) => s.status === 'live');

  // Attendance Archive Grouping & Filter State
  const [attCohortFilter, setAttCohortFilter] = useState<string>('ALL');
  const [showAttCohortDropdown, setShowAttCohortDropdown] = useState<boolean>(false);
  const [attDateFilter, setAttDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [attSearchQuery, setAttSearchQuery] = useState<string>('');
  const [expandedSessionKey, setExpandedSessionKey] = useState<string | null>(null);
  const [attPage, setAttPage] = useState<number>(1);
  const [attPageSize, setAttPageSize] = useState<number>(6);

  // Today's clock in status
  const myTodayClockIn = staffClockins.find(
    (c) => c.profile_id === currentProfile.id && c.work_date === todayIso
  );

  const myBranch = branches.find((b) => b.id === currentProfile.branch_id) || branches[0];

  // Helper to open attendance modal from timetable lesson
  const handleOpenAttendanceFromLesson = (lesson: TimetableLesson) => {
    const cohort = cohorts.find((c) => c.id === lesson.cohort_id) || myCohorts[0];
    if (cohort) {
      setSelectedCohortForAttendance(cohort);
      setSelectedLessonForAttendance(lesson);
    }
  };

  // Robust Student & Profile Resolver for Assessments & Attendance
  const getStudentInfo = (studentId: string, enrollmentId?: string) => {
    // 1. Find in students table
    const st = students.find((s) => s.id === studentId);
    if (st) {
      const pr = profiles.find((p) => p.id === st.profile_id);
      if (pr) return { fullName: pr.full_name, regNumber: pr.reg_number };
    }

    // 2. Find directly in profiles
    const prDirect = profiles.find((p) => p.id === studentId);
    if (prDirect) return { fullName: prDirect.full_name, regNumber: prDirect.reg_number };

    // 3. Find via enrollment
    if (enrollmentId) {
      const enr = enrollments.find((e) => e.id === enrollmentId);
      if (enr) {
        const stEnr = students.find((s) => s.id === enr.student_id);
        if (stEnr) {
          const prEnr = profiles.find((p) => p.id === stEnr.profile_id);
          if (prEnr) return { fullName: prEnr.full_name, regNumber: prEnr.reg_number };
        }
      }
    }

    // Fallback with first registered student
    const defaultStudentProfile = profiles.find((p) => p.role === 'student');
    return {
      fullName: defaultStudentProfile?.full_name || 'Faith Cherono',
      regNumber: defaultStudentProfile?.reg_number || 'AUR/NBO/2026/001',
    };
  };

  // Group attendance records by session to prevent long flat lists
  const myAttendanceRecords = useMemo(() => {
    return attendance.filter((a) => {
      // 1. Directly belongs to instructor's assigned cohort or branch cohort
      if (myCohorts.some((c) => c.id === a.cohort_id)) return true;

      // 2. Belongs to a live session hosted by this instructor or in this branch
      if (
        liveSessions.some(
          (s) =>
            s.id === a.session_id &&
            (s.instructor_id === currentProfile.id || s.branch_id === currentProfile.branch_id)
        )
      ) {
        return true;
      }

      // 3. Online virtual lecture records (e.g. [Live Online]) or method === 'online_lecture'
      if (
        a.method === 'online_lecture' ||
        (a.session_title && a.session_title.includes('[Live Online]'))
      ) {
        const stEnr = enrollments.find((e) => e.student_id === a.student_id);
        const isMyStudent = stEnr ? myCohorts.some((c) => c.id === stEnr.cohort_id) : true;
        if (isMyStudent) return true;
      }

      // 4. Any record for student enrolled in any of this instructor's cohorts
      const studentEnrolledInMyCohort = enrollments.some(
        (e) => e.student_id === a.student_id && myCohorts.some((c) => c.id === e.cohort_id)
      );
      return studentEnrolledInMyCohort;
    });
  }, [attendance, myCohorts, liveSessions, currentProfile, enrollments]);

  const groupedSessions = useMemo(() => {
    const sessionMap = new Map<string, {
      key: string;
      cohortId: string;
      sessionDate: string;
      sessionTitle: string;
      isOnline: boolean;
      records: typeof attendance;
    }>();

    myAttendanceRecords.forEach((att) => {
      // Robust cohort identification with fallback to student enrollment
      const matchedCohort = cohorts.find((c) => c.id === att.cohort_id);
      const studentEnr = enrollments.find((e) => e.student_id === att.student_id);
      const effectiveCohortId = matchedCohort?.id || studentEnr?.cohort_id || myCohorts[0]?.id || cohorts[0]?.id || 'a1000000-0000-0000-0000-000000000001';

      const key = `${effectiveCohortId}_${att.session_date}_${att.session_title || 'Session'}`;
      if (!sessionMap.has(key)) {
        const isOnline = att.method === 'online_lecture' || (att.session_title && att.session_title.includes('[Live Online]'));
        sessionMap.set(key, {
          key,
          cohortId: effectiveCohortId,
          sessionDate: att.session_date,
          sessionTitle: att.session_title || 'Practical Lab Session',
          isOnline: !!isOnline,
          records: [],
        });
      }
      const sess = sessionMap.get(key)!;
      sess.records.push(att);
    });

    const sessionsList = Array.from(sessionMap.values()).map((sess) => {
      // Find the cohort's official enrolled trainees
      const targetCohort = cohorts.find((c) => c.id === sess.cohortId);
      const cohortEnrollments = enrollments.filter(
        (e) => e.cohort_id === sess.cohortId && e.status !== 'dropped'
      );
      const cohortRosterCount = cohortEnrollments.length || targetCohort?.enrolled_count || sess.records.length;
      const expectedTotal = Math.max(cohortRosterCount, sess.records.length);

      const present = sess.records.filter((r) => r.status === 'present').length;
      const late = sess.records.filter((r) => r.status === 'late').length;
      const excused = sess.records.filter((r) => r.status === 'excused').length;
      const explicitAbsent = sess.records.filter((r) => r.status === 'absent').length;

      // In online sessions or incomplete roll-calls, anyone in the cohort roster who didn't join is absent
      const unrecordedAbsent = Math.max(0, expectedTotal - (present + late + excused + explicitAbsent));
      const absent = explicitAbsent + unrecordedAbsent;

      // Turnout is the percentage of actual attendees (present + late) against the total expected cohort roster
      const rate = Math.round(((present + late) / Math.max(1, expectedTotal)) * 100);

      // Synthesize full trainee register for transparent audit in the expanded ledger
      const allCohortStudentRecords = cohortEnrollments.map((enr) => {
        const existingRec = sess.records.find((r) => r.student_id === enr.student_id);
        if (existingRec) return existingRec;
        return {
          id: `unatt-${sess.key}-${enr.student_id}`,
          cohort_id: sess.cohortId,
          student_id: enr.student_id,
          session_date: sess.sessionDate,
          session_title: sess.sessionTitle,
          status: 'absent' as const,
          method: sess.isOnline ? ('online_lecture' as const) : ('in_person' as const),
          notes: sess.isOnline ? 'Did not join live virtual classroom session' : 'Absent from scheduled roll-call',
          created_at: sess.records[0]?.created_at || new Date().toISOString(),
        };
      });

      const finalRecords = allCohortStudentRecords.length > 0 ? allCohortStudentRecords : sess.records;

      return {
        ...sess,
        expectedTotal,
        records: finalRecords,
        stats: {
          total: expectedTotal,
          signed: sess.records.length,
          present,
          late,
          absent,
          excused,
          rate,
        },
      };
    });

    return sessionsList.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
  }, [myAttendanceRecords, cohorts, enrollments, myCohorts]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return groupedSessions.filter((sess) => {
      if (attCohortFilter !== 'ALL' && sess.cohortId !== attCohortFilter) return false;

      if (attDateFilter !== 'all') {
        const localNow = new Date();
        const todayStr = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
        const isoToday = localNow.toISOString().split('T')[0];

        if (attDateFilter === 'today' && sess.sessionDate !== todayStr && sess.sessionDate !== isoToday) {
          return false;
        }

        if (attDateFilter === '7d' || attDateFilter === '30d') {
          const daysLimit = attDateFilter === '7d' ? 7 : 30;
          const diffDays = Math.ceil((new Date().getTime() - new Date(sess.sessionDate).getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > daysLimit) return false;
        }
      }

      if (attSearchQuery.trim()) {
        const q = attSearchQuery.toLowerCase();
        const cohort = cohorts.find((c) => c.id === sess.cohortId);
        const matchesTitle = sess.sessionTitle.toLowerCase().includes(q);
        const matchesCohort = (cohort?.name || '').toLowerCase().includes(q);
        const matchesStudent = sess.records.some((r) => {
          const info = getStudentInfo(r.student_id);
          return (info.fullName || '').toLowerCase().includes(q) || (info.regNumber || '').toLowerCase().includes(q);
        });
        if (!matchesTitle && !matchesCohort && !matchesStudent) return false;
      }

      return true;
    });
  }, [groupedSessions, attCohortFilter, attDateFilter, attSearchQuery, cohorts]);

  const totalSessionPages = Math.max(1, Math.ceil(filteredSessions.length / attPageSize));
  const paginatedSessions = useMemo(() => {
    const start = (attPage - 1) * attPageSize;
    return filteredSessions.slice(start, start + attPageSize);
  }, [filteredSessions, attPage, attPageSize]);

  // Determine active day to display in daily focus view
  const activeDayToDisplay = selectedDayFilter === 'Today' ? todayDayName : selectedDayFilter;
  const filteredLessons = selectedDayFilter === 'All'
    ? myLessons
    : myLessons.filter((l) => l.day_of_week === activeDayToDisplay);

  return (
    <div className="dashboard-container" style={{ padding: '16px 12px' }}>
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div style={{ minWidth: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <GraduationCap size={18} color="var(--crema-gold)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--crema-gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Faculty & Instructor Portal
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', fontWeight: 700, margin: '2px 0' }}>
            Welcome back, {currentProfile.full_name}
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {currentProfile.specialty || 'Lead Instructor'} • {myBranch.name}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {myTodayClockIn ? (
            <button
              className="btn btn-secondary"
              onClick={() => clockOutStaff(myTodayClockIn.id)}
              style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            >
              <Clock size={15} color="#6EE7B7" />
              <span>
                In: {new Date(myTodayClockIn.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {myTodayClockIn.clock_out && ' (Done)'}
              </span>
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => clockInStaff()}
              style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            >
              <Clock size={15} />
              <span>Clock In Today</span>
            </button>
          )}

          <button
            className="btn btn-secondary"
            onClick={() => setShowLeaveModal(true)}
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
          >
            <FileText size={15} />
            <span>Apply for Leave</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setShowScheduleLiveModal(true)}
            style={{ padding: '8px 14px', fontSize: '0.82rem', gap: '6px', background: activeBroadcastingSession ? '#EF4444' : undefined }}
          >
            <Video size={15} />
            <span>{activeBroadcastingSession ? 'Studio Live Now' : 'Go Live / Schedule'}</span>
          </button>
        </div>
      </div>

      {/* Persistent Live Broadcast Header Banner if Instructor is Live */}
      {activeBroadcastingSession && (
        <div
          className="glass-card"
          style={{
            marginBottom: '20px',
            padding: '14px 20px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, var(--bg-surface) 100%)',
            border: '1.5px solid #EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)',
              }}
            >
              <Radio size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.75rem', color: '#EF4444', textTransform: 'uppercase' }}>
                  🔴 You Are Broadcasting Live
                </span>
                <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                  {cohorts.find((c) => c.id === activeBroadcastingSession.cohort_id)?.name}
                </span>
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '2px 0 0 0' }}>
                {activeBroadcastingSession.title}
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-primary"
              onClick={() => setActiveLiveSessionModal(activeBroadcastingSession)}
              style={{ padding: '8px 16px', fontSize: '0.82rem', gap: '6px' }}
            >
              <Video size={14} />
              <span>Open Instructor Studio</span>
            </button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                if (window.confirm('End this live broadcast for all students?')) {
                  await endLiveSession(activeBroadcastingSession.id);
                }
              }}
              style={{ padding: '8px 14px', fontSize: '0.82rem', gap: '6px' }}
            >
              <Square size={13} />
              <span>End Broadcast</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: DAILY FOCUS & TIMETABLE (ATTENDANCE ONLY) */}
      {/* ========================================================================= */}
      {activeTab === 'timetable' && (
        <div>
          {/* Day Filter Bar */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '4px',
                maxWidth: '100%',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
              }}
            >
              {/* Today Button */}
              <button
                type="button"
                onClick={() => setSelectedDayFilter('Today')}
                style={{
                  background: selectedDayFilter === 'Today' ? 'var(--crema-gold)' : 'transparent',
                  color: selectedDayFilter === 'Today' ? '#181310' : 'var(--crema-gold-light)',
                  border: `1px solid ${selectedDayFilter === 'Today' ? 'var(--crema-gold)' : 'rgba(212, 154, 91, 0.25)'}`,
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Sun size={14} />
                <span>☀️ Today ({todayDayName})</span>
              </button>

              {/* Day Pills */}
              {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const).map((day) => {
                const count = myLessons.filter((l) => l.day_of_week === day).length;
                const isSelected = selectedDayFilter === day;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDayFilter(day)}
                    style={{
                      background: isSelected ? 'rgba(212, 154, 91, 0.2)' : 'rgba(255,255,255,0.03)',
                      color: isSelected ? 'var(--crema-gold-light)' : 'var(--text-secondary)',
                      border: `1px solid ${isSelected ? 'var(--crema-gold)' : 'var(--border-subtle)'}`,
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{day.slice(0, 3)}</span>
                    {count > 0 && (
                      <span
                        style={{
                          background: isSelected ? 'var(--crema-gold)' : 'rgba(255,255,255,0.1)',
                          color: isSelected ? '#181310' : 'var(--text-muted)',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          fontSize: '0.65rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Switch to Full Week View */}
            <button
              type="button"
              onClick={() => setSelectedDayFilter(selectedDayFilter === 'All' ? 'Today' : 'All')}
              style={{
                background: selectedDayFilter === 'All' ? 'rgba(110, 231, 183, 0.15)' : 'transparent',
                color: selectedDayFilter === 'All' ? '#6EE7B7' : 'var(--text-muted)',
                border: `1px solid ${selectedDayFilter === 'All' ? '#6EE7B7' : 'var(--border-subtle)'}`,
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Calendar size={13} />
              <span>{selectedDayFilter === 'All' ? '✓ Full Week Active' : '📅 Show Full Week Grid'}</span>
            </button>
          </div>

          {/* VIEW MODE 1: DAILY FOCUS VIEW */}
          {selectedDayFilter !== 'All' && (
            <div style={{ maxWidth: '820px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{selectedDayFilter === 'Today' ? `☀️ Today's Schedule (${todayDayName})` : `📅 ${selectedDayFilter} Schedule`}</span>
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {filteredLessons.length} {filteredLessons.length === 1 ? 'session scheduled' : 'sessions scheduled'}
                  </p>
                </div>
              </div>

              {filteredLessons.length === 0 ? (
                <div
                  className="glass-card"
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <Coffee size={36} color="var(--crema-gold)" style={{ opacity: 0.5, marginBottom: '10px' }} />
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    No Teaching Sessions on {activeDayToDisplay}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    You have no scheduled classes for this day. Use the day buttons above to view other days.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {filteredLessons.map((les) => {
                    const cohort = cohorts.find((c) => c.id === les.cohort_id);
                    const course = courses.find((c) => c.id === les.course_id);
                    const enrolled = enrollments.filter((e) => e.cohort_id === les.cohort_id);
                    const isVirtual = les.lesson_mode === 'virtual_theory';

                    // Check if roll-call has already been marked today for this cohort
                    const markedTodayCount = attendance.filter(
                      (att) => att.cohort_id === les.cohort_id && att.session_date === todayIso
                    ).length;
                    const isMarkedToday = markedTodayCount > 0;

                    return (
                      <div
                        key={les.id}
                        className="glass-card"
                        style={{
                          padding: '18px 20px',
                          border: '1px solid var(--border-medium)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        {/* Header: Timing & Room */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                color: '#6EE7B7',
                                background: 'rgba(110, 231, 183, 0.12)',
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-sm)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              <Clock size={13} />
                              {les.start_time} - {les.end_time}
                            </span>

                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: '0.84rem',
                                color: 'var(--crema-gold)',
                                background: 'rgba(212, 154, 91, 0.12)',
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-sm)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <MapPin size={13} />
                              {les.lab_location}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {isMarkedToday && (
                              <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>
                                ✓ Signed Today ({markedTodayCount})
                              </span>
                            )}
                            <span className="badge badge-paid" style={{ fontSize: '0.72rem' }}>
                              {isVirtual ? '💻 Virtual' : '🔬 Physical Lab'}
                            </span>
                          </div>
                        </div>

                        {/* Course & Cohort Details */}
                        <div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '2px 0', wordBreak: 'break-word', lineHeight: 1.35 }}>
                            {course?.title || les.topic_title}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--crema-gold-light)', fontWeight: 600 }}>
                              {cohort?.name}
                            </span>
                            {course && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                • Fee: KES {(Number(course.fee_amount) || 0).toLocaleString()}
                              </span>
                            )}
                            <span style={{ fontSize: '0.78rem', color: '#6EE7B7', fontWeight: 600 }}>
                              • {enrolled.length} Trainees in Attendance
                            </span>
                          </div>
                        </div>

                        {/* Tools / Equipment */}
                        {les.equipment_needed && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '4px' }}>
                            <Wrench size={12} style={{ display: 'inline', marginRight: '5px' }} />
                            Tools: {les.equipment_needed}
                          </div>
                        )}

                        {/* Roll-Call Button */}
                        <div style={{ marginTop: '4px' }}>
                          <button
                            className={`btn ${isMarkedToday ? 'btn-secondary' : 'btn-primary'}`}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              fontSize: '0.9rem',
                              fontWeight: 700,
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                            onClick={() => handleOpenAttendanceFromLesson(les)}
                          >
                            <UserCheck size={18} color={isMarkedToday ? '#6EE7B7' : undefined} />
                            <span>
                              {isMarkedToday
                                ? `Audit / View Today's Signed Roll-Call (${markedTodayCount})`
                                : `Take Official Roll-Call (${enrolled.length} Trainees)`}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: FULL WEEK GRID */}
          {selectedDayFilter === 'All' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '14px', marginBottom: '32px', width: '100%', maxWidth: '100%' }}>
              {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const).map((day) => {
                const dayLessons = myLessons.filter((l) => l.day_of_week === day);

                return (
                  <div
                    key={day}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      minWidth: 0,
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border-subtle)',
                        paddingBottom: '8px',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--crema-gold)' }}>
                        {day}
                      </div>
                      <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>
                        {dayLessons.length} {dayLessons.length === 1 ? 'Class' : 'Classes'}
                      </span>
                    </div>

                    {dayLessons.length === 0 ? (
                      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        No classes scheduled.
                      </div>
                    ) : (
                      dayLessons.map((les) => {
                        const cohort = cohorts.find((c) => c.id === les.cohort_id);
                        const course = courses.find((c) => c.id === les.course_id);
                        const enrolled = enrollments.filter((e) => e.cohort_id === les.cohort_id);

                        return (
                          <div
                            key={les.id}
                            style={{
                              background: 'var(--bg-surface-elevated)',
                              border: '1px solid var(--border-medium)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              minWidth: 0,
                              width: '100%',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                              <span
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  color: '#6EE7B7',
                                  background: 'rgba(110, 231, 183, 0.12)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Clock size={12} />
                                {les.start_time} - {les.end_time}
                              </span>
                              <span style={{ fontSize: '0.74rem', color: 'var(--crema-gold)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', textAlign: 'right' }}>
                                <MapPin size={12} style={{ flexShrink: 0 }} />
                                <span>{les.lab_location}</span>
                              </span>
                            </div>

                            <div style={{ fontWeight: 700, fontSize: '0.90rem', color: 'var(--text-primary)', wordBreak: 'break-word', lineHeight: 1.35 }}>
                              {course?.title || les.topic_title}
                            </div>

                            <div style={{ fontSize: '0.74rem', color: 'var(--crema-gold-light)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span>{cohort?.name}</span>
                              <span>•</span>
                              <span style={{ color: enrolled.length > 0 ? '#6EE7B7' : 'var(--text-muted)' }}>
                                {enrolled.length} Trainees
                              </span>
                            </div>

                            <button
                              className="btn btn-secondary"
                              style={{ width: '100%', padding: '8px 12px', fontSize: '0.80rem', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              onClick={() => handleOpenAttendanceFromLesson(les)}
                            >
                              <UserCheck size={14} color="#6EE7B7" />
                              <span>Take Roll-Call</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: VIRTUAL CLASSROOM & LIVE SESSIONS */}
      {/* ========================================================================= */}
      {activeTab === 'live_classes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Virtual Classroom & Live Lecture Studio
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                Schedule theory sessions, broadcast live, and capture 1-click digital attendance records for your cohorts.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowScheduleLiveModal(true)}
              style={{ padding: '9px 18px', fontSize: '0.84rem', gap: '8px' }}
            >
              <Plus size={16} />
              <span>Schedule / Launch Live Class</span>
            </button>
          </div>

          {/* 1. Active Broadcasting Session (If Any) */}
          {activeBroadcastingSession ? (
            <div
              className="glass-card"
              style={{
                padding: 'clamp(16px, 3vw, 24px)',
                border: '1.5px solid #EF4444',
                background: 'radial-gradient(circle at top left, rgba(239, 68, 68, 0.1) 0%, var(--bg-surface) 100%)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        background: '#EF4444',
                        color: '#FFF',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      LIVE NOW
                    </span>
                    <span className="badge badge-gold" style={{ fontSize: '0.74rem' }}>
                      {cohorts.find((c) => c.id === activeBroadcastingSession.cohort_id)?.name}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                    {activeBroadcastingSession.title}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {activeBroadcastingSession.description || 'Theory and sensory calibration class.'}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => setActiveLiveSessionModal(activeBroadcastingSession)}
                    style={{ padding: '10px 20px', fontSize: '0.88rem', gap: '8px' }}
                  >
                    <Video size={16} />
                    <span>Launch Studio Stage</span>
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={async () => {
                      if (window.confirm('End this live class?')) {
                        await endLiveSession(activeBroadcastingSession.id);
                      }
                    }}
                    style={{ padding: '10px 14px', fontSize: '0.88rem' }}
                    title="End Class for all students"
                  >
                    <Square size={14} />
                  </button>
                </div>
              </div>

              {/* Real-time Student Attendance Monitor */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                }}
              >
                {(() => {
                  const cohort = cohorts.find((c) => c.id === activeBroadcastingSession.cohort_id);
                  const cohortEnrollments = enrollments.filter((e) => e.cohort_id === activeBroadcastingSession.cohort_id);
                  const today = new Date().toISOString().split('T')[0];

                  const presentStudents = cohortEnrollments.filter((enr) =>
                    attendance.some(
                      (a) =>
                        a.cohort_id === activeBroadcastingSession.cohort_id &&
                        a.student_id === enr.student_id &&
                        a.session_date === today &&
                        a.status === 'present'
                    )
                  );

                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Users size={16} color="var(--crema-gold)" />
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            Digital Roll-Call Live Telemetry:
                          </span>
                          <span style={{ fontSize: '0.84rem', color: '#10B981', fontWeight: 700 }}>
                            {presentStudents.length} / {cohortEnrollments.length} Students Present ({cohortEnrollments.length ? Math.round((presentStudents.length / cohortEnrollments.length) * 100) : 0}%)
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Automatically updated when students join via 1-Click
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                        {cohortEnrollments.map((enr) => {
                          const stInfo = getStudentInfo(enr.student_id, enr.id);
                          const attRecord = attendance.find(
                            (a) =>
                              a.cohort_id === activeBroadcastingSession.cohort_id &&
                              a.student_id === enr.student_id &&
                              a.session_date === today
                          );
                          const isPresent = attRecord?.status === 'present';

                          return (
                            <div
                              key={enr.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-sm)',
                                background: isPresent ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface)',
                                border: isPresent ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-subtle)',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{stInfo.fullName}</div>
                                <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>{stInfo.regNumber}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span
                                  className={`badge ${isPresent ? 'badge-paid' : 'badge-pending'}`}
                                  style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  {isPresent ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                                  {isPresent ? (attRecord?.join_time ? `In ${attRecord.join_time}` : 'Present') : 'Waiting'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            /* No Active Class Banner */
            <div
              className="glass-card"
              style={{
                padding: '24px',
                textAlign: 'center',
                border: '1px dashed var(--border-medium)',
                background: 'var(--bg-surface)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(197, 160, 89, 0.1)',
                  color: 'var(--crema-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                }}
              >
                <Video size={24} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px 0' }}>
                No Live Class In Progress
              </h3>
              <p style={{ maxWidth: '440px', margin: '0 auto 16px auto', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Start a live theory lecture or schedule one for your cohort. Students will immediately see a 1-click entry link on their dashboards.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setShowScheduleLiveModal(true)}
                style={{ padding: '8px 18px', fontSize: '0.84rem', gap: '6px' }}
              >
                <Play size={14} />
                <span>Go Live Right Now</span>
              </button>
            </div>
          )}

          {/* 2. Scheduled Upcoming Live Classes */}
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>
              Scheduled Upcoming Theory Classes
            </h3>

            {(() => {
              const scheduledList = myLiveSessions.filter((s) => s.status === 'scheduled');
              if (scheduledList.length === 0) {
                return (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', padding: '8px 0' }}>
                    No upcoming sessions currently on schedule.
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                  {scheduledList.map((session) => {
                    const cohort = cohorts.find((c) => c.id === session.cohort_id);
                    const course = courses.find((c) => c.id === session.course_id);

                    return (
                      <div
                        key={session.id}
                        className="glass-card"
                        style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                              {cohort?.name || 'Cohort'}
                            </span>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Clock size={12} />
                              {new Date(session.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                            {session.title}
                          </h4>
                          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, lineClamp: 2 }}>
                            {session.description || course?.title}
                          </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--crema-gold)' }}>
                            {session.room_type === 'google_meet' ? 'Google Meet Link' : 'Aurevia Studio'}
                          </span>
                          <button
                            className="btn btn-primary"
                            onClick={async () => {
                              await startLiveSession(session.id);
                              setActiveLiveSessionModal({ ...session, status: 'live' });
                            }}
                            style={{ padding: '6px 14px', fontSize: '0.78rem', gap: '5px' }}
                          >
                            <Play size={12} />
                            <span>Start Class Now</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ASSIGNED COHORTS */}
      {/* ========================================================================= */}
      {activeTab === 'cohorts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>My Assigned Cohorts & Intakes</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                On-campus physical training cohorts and registered students
              </p>
            </div>
          </div>

          <div className="grid-cards">
            {myCohorts.map((cohort) => {
              const course = courses.find((c) => c.id === cohort.course_id);
              const cohortEnrs = enrollments.filter((e) => e.cohort_id === cohort.id);

              return (
                <div key={cohort.id} className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <span className="badge badge-gold" style={{ marginBottom: '6px' }}>
                        {course?.category}
                      </span>
                      <h3 style={{ fontSize: '1.15rem', marginTop: '4px' }}>{cohort.name}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{course?.title}</p>
                    </div>
                    <span className="badge badge-paid">In Session</span>
                  </div>

                  <div
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      margin: '12px 0',
                      fontSize: '0.82rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Lab Schedule:</span>
                      <span style={{ fontWeight: 500 }}>{cohort.schedule_timing}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
                      <span>{cohort.start_date} to {cohort.end_date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Students Enrolled:</span>
                      <span style={{ fontWeight: 600, color: 'var(--crema-gold)' }}>
                        {cohortEnrs.length} Students
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '10px 12px', fontSize: '0.85rem' }}
                      onClick={() => setSelectedCohortForRoster(cohort)}
                    >
                      <Users size={16} color="var(--crema-gold)" />
                      <span>View Trainees</span>
                    </button>

                    <button
                      className="btn btn-primary"
                      style={{ padding: '10px 12px', fontSize: '0.85rem' }}
                      onClick={() => setSelectedCohortForGrading(cohort)}
                    >
                      <Award size={16} />
                      <span>Exam Marksheet</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CATS & EXAMINATION MARKSHEETS (WITH NAMES, EDIT & DELETE) */}
      {/* ========================================================================= */}
      {activeTab === 'grades' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Academic Examination & CAT Marksheets</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Official continuous assessment tests (CATs), practical evaluations, and certification exam grades recorded in ledger
              </p>
            </div>
            
            {myCohorts.length > 0 && (
              <button
                className="btn btn-primary"
                onClick={() => setSelectedCohortForGrading(myCohorts[0])}
                style={{ padding: '10px 18px', fontSize: '0.88rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Edit3 size={16} />
                <span>📝 Enter / Grade Class Exam Marks</span>
              </button>
            )}
          </div>

          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '180px' }}>Trainee Name & Reg No</th>
                  <th style={{ minWidth: '190px' }}>Assessment / Test Event</th>
                  <th style={{ width: '100px' }}>Practical</th>
                  <th style={{ width: '90px' }}>Theory</th>
                  <th style={{ width: '90px' }}>Sensory</th>
                  <th style={{ width: '110px' }}>Final Grade</th>
                  <th style={{ minWidth: '160px' }}>Instructor Remarks</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No examination marks recorded yet. Click "Enter / Grade Class Exam Marks" above to grade your cohort.
                    </td>
                  </tr>
                ) : (
                  assessments.map((a) => {
                    const studentInfo = getStudentInfo(a.student_id, a.enrollment_id);

                    return (
                      <tr key={a.id}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {studentInfo.fullName}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--crema-gold)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {studentInfo.regNumber}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{a.module_name}</td>
                        <td style={{ fontWeight: 600 }}>{a.practical_score}%</td>
                        <td style={{ fontWeight: 600 }}>{a.theory_score}%</td>
                        <td style={{ fontWeight: 600, color: 'var(--crema-gold)' }}>{a.sensory_score}%</td>
                        <td>
                          <span className="badge badge-paid" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                            {a.final_score}% ({a.grade})
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{a.instructor_remarks}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => setEditingAssessment(a)}
                              style={{ padding: '5px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Edit Marks"
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => {
                                if (window.confirm(`Delete mark entry for ${studentInfo.fullName}?`)) {
                                  deleteAssessment(a.id);
                                }
                              }}
                              style={{ padding: '5px 8px', fontSize: '0.72rem', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                              title="Delete Mark Entry"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DAILY ROLL-CALL HISTORY (STRUCTURED & GROUPED BY SESSION) */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Institutional Digital Roll-Call Archive</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Showing {filteredSessions.length} sessions ({myAttendanceRecords.length} student records) grouped by class date & topic
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(110, 231, 183, 0.12)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(110, 231, 183, 0.25)' }}>
              <ShieldCheck size={16} color="#6EE7B7" />
              <span style={{ fontSize: '0.76rem', color: '#6EE7B7', fontWeight: 700 }}>
                Single-Sign Daily Lock Active
              </span>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              padding: '12px',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 300px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '160px' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="form-input"
                  value={attSearchQuery}
                  onChange={(e) => {
                    setAttSearchQuery(e.target.value);
                    setAttPage(1);
                  }}
                  placeholder="Search session topic or student..."
                  style={{ paddingLeft: '32px', fontSize: '0.78rem', height: '34px', width: '100%' }}
                />
              </div>

              {/* Custom Styled Cohort Dropdown */}
              <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '150px' }}>
                <button
                  type="button"
                  onClick={() => setShowAttCohortDropdown(!showAttCohortDropdown)}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '0 12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    <BookOpen size={13} color="var(--crema-gold)" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {attCohortFilter === 'ALL'
                        ? `All My Cohorts (${myCohorts.length})`
                        : (cohorts.find((c) => c.id === attCohortFilter)?.name || 'Selected Cohort')}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    color="var(--text-muted)"
                    style={{
                      flexShrink: 0,
                      transform: showAttCohortDropdown ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                      marginLeft: '6px',
                    }}
                  />
                </button>

                {showAttCohortDropdown && (
                  <>
                    <div
                      onClick={() => setShowAttCohortDropdown(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        right: 0,
                        minWidth: '240px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        padding: '6px',
                        zIndex: 999,
                        maxHeight: '260px',
                        overflowY: 'auto',
                        animation: 'slideUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setAttCohortFilter('ALL');
                          setAttPage(1);
                          setShowAttCohortDropdown(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-xs)',
                          border: 'none',
                          background: attCohortFilter === 'ALL' ? 'var(--bg-active)' : 'transparent',
                          color: attCohortFilter === 'ALL' ? 'var(--crema-gold)' : 'var(--text-primary)',
                          fontSize: '0.80rem',
                          fontWeight: attCohortFilter === 'ALL' ? 700 : 500,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'background-color 0.12s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.85rem' }}>👥</span>
                          <span>All My Cohorts ({myCohorts.length})</span>
                        </div>
                        {attCohortFilter === 'ALL' && <CheckCircle2 size={14} color="var(--crema-gold)" />}
                      </button>

                      <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

                      {myCohorts.map((c) => {
                        const isSelected = attCohortFilter === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setAttCohortFilter(c.id);
                              setAttPage(1);
                              setShowAttCohortDropdown(false);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: 'var(--radius-xs)',
                              border: 'none',
                              background: isSelected ? 'var(--bg-active)' : 'transparent',
                              color: isSelected ? 'var(--crema-gold)' : 'var(--text-primary)',
                              fontSize: '0.80rem',
                              fontWeight: isSelected ? 700 : 500,
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'background-color 0.12s ease',
                            }}
                          >
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 600 }}>{c.name}</div>
                              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>{c.schedule_timing}</div>
                            </div>
                            {isSelected && <CheckCircle2 size={14} color="var(--crema-gold)" style={{ flexShrink: 0, marginLeft: '8px' }} />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Date Presets */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { id: 'all', label: 'All Dates' },
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setAttDateFilter(p.id as any);
                    setAttPage(1);
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    background: attDateFilter === p.id ? 'var(--crema-gold)' : 'transparent',
                    color: attDateFilter === p.id ? '#1A1412' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grouped Session Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredSessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No roll-call sessions recorded matching your filter. Use "Take Official Roll-Call" from your daily schedule to sign attendance.
              </div>
            ) : (
              paginatedSessions.map((sess) => {
                const cohort = cohorts.find((c) => c.id === sess.cohortId);
                const isExpanded = expandedSessionKey === sess.key;

                return (
                  <div
                    key={sess.key}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    {/* Session Summary Header */}
                    <div
                      onClick={() => setExpandedSessionKey(isExpanded ? null : sess.key)}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            background: 'rgba(212, 154, 91, 0.15)',
                            color: 'var(--crema-gold)',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid rgba(212, 154, 91, 0.3)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Calendar size={13} />
                          <span>{sess.sessionDate}</span>
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.90rem', color: 'var(--text-primary)' }}>
                              {sess.sessionTitle}
                            </span>
                            {sess.isOnline && (
                              <span
                                style={{
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  color: '#EF4444',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Radio size={11} /> 1-Click Virtual Roll-Call
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {cohort?.name || 'Class Batch'} • {sess.isOnline ? `${sess.stats.present + sess.stats.late} of ${sess.stats.total} Trainees Joined (${sess.stats.absent} Absent)` : `${sess.stats.total} Trainees Signed`}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Status Pills */}
                        <div style={{ display: 'flex', gap: '6px', fontSize: '0.72rem' }}>
                          <span style={{ color: '#10B981', fontWeight: 600 }}>{sess.stats.present} Present</span>
                          {sess.stats.late > 0 && <span style={{ color: 'var(--crema-gold)', fontWeight: 600 }}>• {sess.stats.late} Late</span>}
                          {sess.stats.absent > 0 && <span style={{ color: '#EF4444', fontWeight: 600 }}>• {sess.stats.absent} Absent</span>}
                          {sess.stats.excused > 0 && <span style={{ color: '#38BDF8', fontWeight: 600 }}>• {sess.stats.excused} Excused</span>}
                        </div>

                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: sess.stats.rate >= 85 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: sess.stats.rate >= 85 ? '#6EE7B7' : '#EF4444',
                          }}
                        >
                          {sess.stats.rate}% Turnout
                        </span>

                        <button
                          type="button"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Accordion: Student Roll-Call Breakdown */}
                    {isExpanded && (
                      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>
                          Verified Trainee Attendance Ledger:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
                          {sess.records.map((r) => {
                            const studentInfo = getStudentInfo(r.student_id);
                            return (
                              <div
                                key={r.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: 'var(--bg-surface-elevated)',
                                  padding: '8px 12px',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(255, 255, 255, 0.03)',
                                  gap: '10px',
                                }}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '0.80rem', fontWeight: 600 }}>{studentInfo.fullName}</div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--crema-gold)', fontFamily: 'var(--font-mono)' }}>
                                    {studentInfo.regNumber}
                                  </div>
                                  {r.notes && (
                                    <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-word' }}>
                                      {r.notes}
                                    </div>
                                  )}
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                  <span className={`badge badge-${r.status}`} style={{ fontSize: '0.66rem', textTransform: 'capitalize' }}>
                                    {r.status}
                                  </span>
                                  {r.join_time && (
                                    <span style={{ fontSize: '0.66rem', color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <Clock size={10} /> {r.join_time}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          {filteredSessions.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.76rem',
                color: 'var(--text-secondary)',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                Showing {((attPage - 1) * attPageSize) + 1} - {Math.min(attPage * attPageSize, filteredSessions.length)} of {filteredSessions.length} class sessions
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={attPage === 1}
                  onClick={() => setAttPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '4px 8px', fontSize: '0.72rem', opacity: attPage === 1 ? 0.4 : 1 }}
                >
                  <ChevronLeft size={12} />
                  <span>Prev</span>
                </button>
                <span style={{ padding: '0 6px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Page {attPage} of {totalSessionPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={attPage >= totalSessionPages}
                  onClick={() => setAttPage((p) => Math.min(totalSessionPages, p + 1))}
                  style={{ padding: '4px 8px', fontSize: '0.72rem', opacity: attPage >= totalSessionPages ? 0.4 : 1 }}
                >
                  <span>Next</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedCohortForGrading && (
        <GradingSheetModal
          cohort={selectedCohortForGrading}
          onClose={() => setSelectedCohortForGrading(null)}
        />
      )}

      {editingAssessment && (
        <EditAssessmentModal
          assessment={editingAssessment}
          onClose={() => setEditingAssessment(null)}
        />
      )}

      {selectedCohortForAttendance && (
        <AttendanceModal
          cohort={selectedCohortForAttendance}
          initialLesson={selectedLessonForAttendance || undefined}
          onClose={() => {
            setSelectedCohortForAttendance(null);
            setSelectedLessonForAttendance(null);
          }}
        />
      )}

      {/* Trainee Roster Modal */}
      {selectedCohortForRoster && (
        <div className="modal-overlay" onClick={() => setSelectedCohortForRoster(null)} style={{ zIndex: 1200 }}>
          <div
            className="modal-content"
            style={{ maxWidth: '640px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ fontSize: '1.12rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="var(--crema-gold)" />
                  <span>{selectedCohortForRoster.name} — Trainee Roster</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  {courses.find((c) => c.id === selectedCohortForRoster.course_id)?.title} • {selectedCohortForRoster.schedule_timing}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedCohortForRoster(null)}
                style={{ padding: '6px', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Trainee List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {(() => {
                const enrs = enrollments.filter((e) => e.cohort_id === selectedCohortForRoster.id);
                if (enrs.length === 0) {
                  return (
                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No trainees currently registered in this cohort intake.
                    </div>
                  );
                }

                return enrs.map((enr) => {
                  const student = students.find((s) => s.id === enr.student_id);
                  const profile = profiles.find((p) => p.id === student?.profile_id);
                  const studentAtt = attendance.filter((a) => a.cohort_id === selectedCohortForRoster.id && a.student_id === enr.student_id);
                  const attendedCount = studentAtt.filter((a) => a.status === 'present' || a.status === 'late').length;
                  const attRate = studentAtt.length > 0 ? Math.round((attendedCount / studentAtt.length) * 100) : 100;

                  return (
                    <div
                      key={enr.id}
                      style={{
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                            color: '#181310',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {(profile?.full_name || 'T').charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{profile?.full_name || 'Trainee'}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--crema-gold)', fontFamily: 'var(--font-mono)' }}>
                            {profile?.reg_number || 'REG-PENDING'} • {profile?.phone || 'No phone'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Lab Attendance</div>
                          <div style={{ fontSize: '0.80rem', fontWeight: 700, color: attRate >= 85 ? '#10B981' : '#EF4444' }}>
                            {attRate}% ({attendedCount}/{studentAtt.length || 0} sessions)
                          </div>
                        </div>
                        <span className={`badge ${student?.kyc_verified ? 'badge-paid' : 'badge-pending'}`} style={{ fontSize: '0.68rem' }}>
                          {student?.kyc_verified ? 'KYC Verified' : 'KYC Pending'}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedCohortForRoster(null)}
                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const cohort = selectedCohortForRoster;
                  setSelectedCohortForRoster(null);
                  setSelectedCohortForGrading(cohort);
                }}
                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              >
                <Award size={14} />
                <span>Open Marksheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveModal && <LeaveRequestModal onClose={() => setShowLeaveModal(false)} />}

      {/* Virtual Classroom Studio Modal */}
      {activeLiveSessionModal && (
        <VirtualClassroomModal
          session={activeLiveSessionModal}
          onClose={() => setActiveLiveSessionModal(null)}
        />
      )}

      {/* Schedule / Go Live Modal */}
      {showScheduleLiveModal && (
        <ScheduleLiveClassModal
          onClose={() => setShowScheduleLiveModal(false)}
          initialCohortId={myCohorts[0]?.id}
          onSuccess={(newSess) => {
            if (newSess.status === 'live') {
              setActiveLiveSessionModal(newSess);
            }
          }}
        />
      )}
    </div>
  );
};
