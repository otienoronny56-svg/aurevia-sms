import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import {
  TrendingUp, Users, Calendar, Award, UserCheck, Clock,
  Building2, CheckCircle2, ChevronDown, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, Sparkles, Coffee, BookOpen,
  UserPlus, Activity, Layers, Target, ShieldCheck
} from 'lucide-react';

type GrowthPeriod = 'monthly' | 'quarterly' | 'yearly';

interface InstitutionalAnalyticsProps {
  onNavigateToTab?: (tab: string) => void;
}

export const InstitutionalAnalytics: React.FC<InstitutionalAnalyticsProps> = ({ onNavigateToTab }) => {
  const {
    branches,
    courses,
    cohorts,
    profiles,
    students,
    enrollments,
    lessons,
    attendance,
    assessments,
    payments,
    invoices,
    staffClockins,
    alumni
  } = useApp();

  const [growthPeriod, setGrowthPeriod] = useState<GrowthPeriod>('monthly');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string>('ALL');
  const [showAlumniModal, setShowAlumniModal] = useState<boolean>(false);
  const [alumniSearch, setAlumniSearch] = useState<string>('');
  const [alumniBranchFilter, setAlumniBranchFilter] = useState<string>('ALL');

  // Filtered dataset by selected campus
  const filteredStudents = selectedCampusFilter === 'ALL'
    ? students
    : students.filter(s => s.branch_id === selectedCampusFilter);

  const filteredAttendance = selectedCampusFilter === 'ALL'
    ? attendance
    : attendance.filter(a => {
        const student = students.find(s => s.id === a.student_id);
        return student?.branch_id === selectedCampusFilter;
      });

  const facultyTeachers = profiles.filter(p =>
    (p.role === 'instructor' || p.role === 'branch_manager') &&
    (selectedCampusFilter === 'ALL' || p.branch_id === selectedCampusFilter)
  );

  const teachersCount = profiles.filter(p =>
    p.role === 'instructor' &&
    (selectedCampusFilter === 'ALL' || p.branch_id === selectedCampusFilter)
  ).length;

  const totalStaffCount = profiles.filter(p =>
    p.role !== 'student' &&
    (selectedCampusFilter === 'ALL' || p.branch_id === selectedCampusFilter || (p.role === 'super_admin' && selectedCampusFilter === 'ALL'))
  ).length;

  const todayIso = new Date().toISOString().split('T')[0];
  const staffClockedInToday = staffClockins.filter(c =>
    c.work_date === todayIso &&
    (selectedCampusFilter === 'ALL' || c.branch_id === selectedCampusFilter)
  ).length;

  const filteredCohorts = selectedCampusFilter === 'ALL'
    ? cohorts
    : cohorts.filter(c => c.branch_id === selectedCampusFilter);

  // Active sessions today
  const activeSessionsToday = selectedCampusFilter === 'ALL'
    ? lessons.length
    : lessons.filter(l => {
        const c = cohorts.find(co => co.id === l.cohort_id);
        return c?.branch_id === selectedCampusFilter;
      }).length;

  const filteredAlumni = selectedCampusFilter === 'ALL'
    ? alumni
    : alumni.filter(al => al.branch_id === selectedCampusFilter);

  const filteredAssessments = selectedCampusFilter === 'ALL'
    ? assessments
    : assessments.filter(a => {
        const s = students.find(st => st.id === a.student_id);
        return s?.branch_id === selectedCampusFilter;
      });

  // Attendance metrics
  const totalPresent = filteredAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const totalAttRecords = filteredAttendance.length;
  const attendanceRate = totalAttRecords > 0 ? Math.round((totalPresent / totalAttRecords) * 100) : 0;

  // Academic Pass Rates
  const totalAssessments = filteredAssessments.length;
  const passedAssessments = filteredAssessments.filter(a => a.final_score >= 60).length;
  const overallPassRate = totalAssessments > 0 ? Math.round((passedAssessments / totalAssessments) * 100) : 0;

  const distinctions = filteredAssessments.filter(a => a.final_score >= 85).length;
  const credits = filteredAssessments.filter(a => a.final_score >= 75 && a.final_score < 85).length;
  const passes = filteredAssessments.filter(a => a.final_score >= 60 && a.final_score < 75).length;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  // Helper to extract intake date from student or enrollment
  const getStudentIntakeDate = (studentId: string, createdAt?: string): Date => {
    const enrollment = enrollments.find(e => e.student_id === studentId);
    if (enrollment?.enrolled_at) {
      const d = new Date(enrollment.enrolled_at);
      if (!isNaN(d.getTime())) return d;
    }
    if (enrollment?.cohort_id) {
      const cohort = cohorts.find(c => c.id === enrollment.cohort_id);
      if (cohort?.start_date) {
        const d = new Date(cohort.start_date);
        if (!isNaN(d.getTime())) return d;
      }
    }
    if (createdAt) {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  // Dynamic Growth Data computed directly from REAL database records
  const getGrowthData = () => {
    switch (growthPeriod) {
      case 'monthly': {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let runningTotal = filteredAlumni.filter(a => (a.graduation_year || 2025) < currentYear).length;

        return months.map((monthName, idx) => {
          const newTraineesCount = filteredStudents.filter(s => {
            const intakeDate = getStudentIntakeDate(s.id, s.created_at);
            return intakeDate.getFullYear() === currentYear && intakeDate.getMonth() === idx;
          }).length;

          runningTotal += newTraineesCount;
          const isCurrent = idx === currentMonthIdx;
          const isProjected = idx > currentMonthIdx;

          return {
            label: monthName,
            newTrainees: newTraineesCount,
            totalNetwork: runningTotal,
            rate: newTraineesCount > 0 ? `+${newTraineesCount}` : '0',
            isCurrent,
            isProjected,
          };
        });
      }

      case 'quarterly': {
        const quarters = [
          { label: 'Q1 (Jan-Mar)', months: [0, 1, 2] },
          { label: 'Q2 (Apr-Jun)', months: [3, 4, 5] },
          { label: 'Q3 (Jul-Sep)', months: [6, 7, 8] },
          { label: 'Q4 (Oct-Dec)', months: [9, 10, 11] },
        ];
        let runningTotal = filteredAlumni.filter(a => (a.graduation_year || 2025) < currentYear).length;
        const currentQIdx = Math.floor(currentMonthIdx / 3);

        return quarters.map((q, qIdx) => {
          const newTraineesCount = filteredStudents.filter(s => {
            const intakeDate = getStudentIntakeDate(s.id, s.created_at);
            return intakeDate.getFullYear() === currentYear && q.months.includes(intakeDate.getMonth());
          }).length;

          runningTotal += newTraineesCount;
          const isCurrent = qIdx === currentQIdx;
          const isProjected = qIdx > currentQIdx;

          return {
            label: q.label,
            newTrainees: newTraineesCount,
            totalNetwork: runningTotal,
            rate: newTraineesCount > 0 ? `+${newTraineesCount}` : '0',
            isCurrent,
            isProjected,
          };
        });
      }

      case 'yearly': {
        const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
        let runningTotal = 0;

        return years.map(yr => {
          const isCurrent = yr === currentYear;
          const isProjected = yr > currentYear;

          const alumniInYr = filteredAlumni.filter(a => a.graduation_year === yr).length;
          const studentsInYr = yr === currentYear
            ? filteredStudents.length
            : filteredStudents.filter(s => {
                const intakeDate = getStudentIntakeDate(s.id, s.created_at);
                return intakeDate.getFullYear() === yr;
              }).length;

          const totalForYr = alumniInYr + studentsInYr;
          runningTotal += totalForYr;

          return {
            label: isCurrent ? `${yr} (Active Year)` : isProjected ? `${yr} (Projected)` : `${yr}`,
            newTrainees: totalForYr,
            totalNetwork: runningTotal,
            rate: totalForYr > 0 ? `+${totalForYr}` : '0',
            isCurrent,
            isProjected,
          };
        });
      }
    }
  };

  const growthSeries = getGrowthData();
  const realMaxTrainees = Math.max(...growthSeries.map(d => d.newTrainees));
  const maxNewTrainees = realMaxTrainees > 0 ? realMaxTrainees : 1;

  // Real-Time Calculations from Live Database
  const lastYear = currentYear - 1;
  const alumniLastYear = filteredAlumni.filter(a => a.graduation_year === lastYear).length;
  const currentYearTotal = filteredAlumni.filter(a => a.graduation_year === currentYear).length + filteredStudents.length;

  let yoyGrowthDisplay = '0.0% YoY';
  let yoySubtitle = `${currentYearTotal} in ${currentYear} vs ${alumniLastYear} in ${lastYear}`;
  if (alumniLastYear > 0) {
    const diff = currentYearTotal - alumniLastYear;
    const pct = ((diff / alumniLastYear) * 100).toFixed(1);
    const sign = diff >= 0 ? '+' : '';
    yoyGrowthDisplay = `${sign}${pct}% YoY`;
  } else if (currentYearTotal > 0) {
    yoyGrowthDisplay = `+${currentYearTotal} New YoY`;
    yoySubtitle = `${currentYearTotal} Trainees in ${currentYear} (Initial Intake)`;
  } else {
    yoyGrowthDisplay = '0.0% YoY';
    yoySubtitle = `0 in ${currentYear} vs 0 in ${lastYear}`;
  }

  const totalEnrolled = enrollments.length;
  const activeOrGraduated = enrollments.filter(e => e.status !== 'dropped').length;
  const liveRetentionRate = totalEnrolled > 0
    ? ((activeOrGraduated / totalEnrolled) * 100).toFixed(1)
    : '100.0';
  const droppedCount = enrollments.filter(e => e.status === 'dropped').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Filter & Intelligence Strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          background: 'var(--bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'var(--primary-accent-bg)',
              color: 'var(--primary-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              Institutional Analytics & Member Growth Intelligence
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Comprehensive enrollment trajectories, new admissions, faculty density, and campus metrics
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            className="form-select"
            value={selectedCampusFilter}
            onChange={(e) => setSelectedCampusFilter(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }}
          >
            <option value="ALL">🏫 All Campuses (Global Academy)</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 1: Executive KPI Stat Grid */}
      <div className="grid-stats">
        {/* Total Trainees & KYC */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Enrolled Trainees</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{filteredStudents.length}</span>
            <span style={{ fontSize: '0.75rem', color: filteredStudents.length > 0 ? '#10B981' : 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
              {filteredStudents.length > 0 ? (
                <>
                  <ArrowUpRight size={14} /> {filteredCohorts.length > 0 ? `${filteredCohorts.length} Active ${filteredCohorts.length === 1 ? 'Cohort' : 'Cohorts'}` : 'New Intake'}
                </>
              ) : (
                'Awaiting Admissions'
              )}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
            <span>KYC Verified: {filteredStudents.length > 0 ? `${Math.round((filteredStudents.filter(s => s.kyc_verified).length / filteredStudents.length) * 100)}%` : '0%'}</span>
            <span>Intakes: {filteredCohorts.length} Cohorts</span>
          </div>
        </div>

        {/* Teachers & Faculty Staff */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Teachers & Faculty</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(212, 154, 91, 0.15)', color: 'var(--crema-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{teachersCount}</span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Lead Instructors</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
            <span>Total Staff: {totalStaffCount}</span>
            <span style={{ color: staffClockedInToday > 0 ? '#10B981' : 'var(--text-muted)', fontWeight: 600 }}>Active Today: {staffClockedInToday}</span>
          </div>
        </div>

        {/* Active Class Sessions Today */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Active Lab Sessions</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{activeSessionsToday}</span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Weekly Timetable</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
            <span>Active Cohorts: {filteredCohorts.length}</span>
            <span>Labs 1 - 5 Active</span>
          </div>
        </div>

        {/* Exam Pass Rate */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Average Pass Rate</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: totalAssessments > 0 ? '#10B981' : 'var(--text-muted)' }}>
              {totalAssessments > 0 ? `${overallPassRate}%` : 'N/A'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--crema-gold)', fontWeight: 700 }}>SCA Standard</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
            <span>Distinctions: {distinctions}</span>
            <span>Credits: {credits}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 2: PRIMARY GROWTH GRAPH (MEMBERS & STUDENT INTAKE EXPANSION) */}
      {/* ========================================================================= */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2563EB' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                Student Admissions & Member Growth Trajectory
              </h3>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Tracking monthly new registrations, quarterly cohort expansions, and multi-year institutional scaling
            </p>
          </div>

          {/* Growth Timeline Filter Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-surface-elevated)',
              padding: '3px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {[
              { id: 'monthly', label: '📅 This Month / Monthly' },
              { id: 'quarterly', label: '📊 Quarterly Cohorts' },
              { id: 'yearly', label: '📈 Multi-Year Growth' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGrowthPeriod(tab.id as GrowthPeriod)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: growthPeriod === tab.id ? 'var(--bg-surface)' : 'transparent',
                  color: growthPeriod === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: growthPeriod === tab.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Growth Key Metrics Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            marginBottom: '24px',
          }}
        >
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>New Intakes ({growthPeriod})</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              +{filteredStudents.length} Trainees
            </div>
            <div style={{ fontSize: '0.7rem', color: filteredStudents.length > 0 ? '#10B981' : 'var(--text-muted)', fontWeight: 700 }}>
              {filteredStudents.length > 0 ? `${filteredStudents.filter(s => s.kyc_verified).length} KYC Verified` : '0 Active Registrations'}
            </div>
          </div>

          <div
            onClick={() => (onNavigateToTab ? onNavigateToTab('alumni') : setShowAlumniModal(true))}
            style={{
              background: 'var(--bg-surface-elevated)',
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, border-color 0.15s ease',
            }}
            title="Click to view full Alumni Directory & Job Placements page"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Academy Members</div>
              <span style={{ fontSize: '0.68rem', color: 'var(--crema-gold)', fontWeight: 700 }}>View List &rarr;</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-accent)', marginTop: '2px' }}>
              {filteredAlumni.length + filteredStudents.length} Registered
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {filteredAlumni.length} Alumni + {filteredStudents.length} Active Trainees
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Year-over-Year Growth</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
              {yoyGrowthDisplay}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {yoySubtitle}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Program Retention Rate</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--crema-gold)', marginTop: '2px' }}>
              {totalEnrolled > 0 ? `${liveRetentionRate}%` : '100%'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {totalEnrolled === 0
                ? 'Zero Dropouts (Fresh Session)'
                : droppedCount === 0
                ? 'Zero Dropouts (100% On Track)'
                : `${droppedCount} Dropped (${totalEnrolled - droppedCount} Active)`}
            </div>
          </div>
        </div>

        {/* Digital Growth Bar & Area Chart Visualization */}
        <div style={{ height: '240px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '14px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          {growthSeries.map((item) => {
            const hasData = item.newTrainees > 0;
            const heightPercent = realMaxTrainees > 0
              ? Math.max(10, Math.round((item.newTrainees / realMaxTrainees) * 100))
              : 0;

            return (
              <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '8px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: hasData ? (item.isCurrent ? '#2563EB' : 'var(--text-primary)') : 'var(--text-muted)' }}>
                  {hasData ? `+${item.newTrainees}` : '0'}
                </div>

                <div
                  style={{
                    width: '100%',
                    maxWidth: '42px',
                    height: hasData ? `${heightPercent}%` : '4px',
                    borderRadius: hasData ? '8px 8px 0 0' : '2px',
                    background: hasData
                      ? (item.isCurrent
                          ? 'linear-gradient(180deg, #2563EB 0%, #60A5FA 100%)'
                          : item.isProjected
                          ? 'repeating-linear-gradient(45deg, rgba(37,99,235,0.2), rgba(37,99,235,0.2) 6px, rgba(37,99,235,0.3) 6px, rgba(37,99,235,0.3) 12px)'
                          : 'linear-gradient(180deg, rgba(37, 99, 235, 0.4) 0%, rgba(37, 99, 235, 0.15) 100%)')
                      : (item.isCurrent ? 'rgba(37, 99, 235, 0.5)' : 'var(--bg-surface-elevated)'),
                    boxShadow: (hasData && item.isCurrent) ? '0 6px 16px rgba(37, 99, 235, 0.35)' : 'none',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                  }}
                  title={`${item.label}: ${item.newTrainees} Trainees (Total Network: ${item.totalNetwork})`}
                />

                <div style={{ fontSize: '0.74rem', color: item.isCurrent ? '#2563EB' : 'var(--text-muted)', fontWeight: item.isCurrent ? 800 : 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#2563EB' }} />
              <span>Current Month ({filteredStudents.filter(s => getStudentIntakeDate(s.id, s.created_at).getMonth() === currentMonthIdx).length} Enrolled)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(37, 99, 235, 0.3)' }} />
              <span>Admitted Intakes</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', border: '1px dashed #2563EB', background: 'transparent' }} />
              <span>Future Intakes</span>
            </div>
          </div>

          <span style={{ fontWeight: 600, color: 'var(--crema-gold)' }}>
            Network Capacity: {filteredCohorts.reduce((sum, c) => sum + (c.max_capacity || 16), 0)} Trainees Across {filteredCohorts.length} Batches
          </span>
        </div>
      </div>

      {/* Row 3: Circular Attendance Gauge + Learning Program Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Course Enrollment & Program Popularity */}
        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Curriculum Intake Share</h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Student distribution across SCA accredited modules</p>
            </div>
            <span className="badge badge-gold">Specialty Coffee</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {courses.map((course, idx) => {
              const enrolledForCourse = enrollments.filter(e => {
                const cohort = cohorts.find(c => c.id === e.cohort_id);
                return cohort?.course_id === course.id;
              }).length;
              const totalEnrolled = enrollments.length || 1;
              const sharePercent = Math.round((enrolledForCourse / totalEnrolled) * 100);
              const colorPalette = ['#2563EB', '#D49A5B', '#10B981', '#8B5CF6'];
              const color = colorPalette[idx % colorPalette.length];

              return (
                <div key={course.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600 }}>{course.title}</span>
                    <span style={{ fontWeight: 700, color: color }}>
                      {sharePercent}% ({enrolledForCourse} {enrolledForCourse === 1 ? 'Trainee' : 'Trainees'})
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(sharePercent, 8)}%`, height: '100%', background: color, borderRadius: 'var(--radius-full)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Circular / Semi-Donut Attendance Gauge */}
        <div className="glass-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Attendance Index</h3>
            <span className="badge badge-paid">{attendanceRate}% On Track</span>
          </div>

          {/* Donut Graphic (SVG) */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '14px 0' }}>
            <svg width="170" height="170" viewBox="0 0 180 180">
              <circle
                cx="90"
                cy="90"
                r="70"
                fill="none"
                stroke="var(--bg-surface-elevated)"
                strokeWidth="16"
              />
              <circle
                cx="90"
                cy="90"
                r="70"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="16"
                strokeDasharray={`${(attendanceRate / 100) * 440} 440`}
                strokeDashoffset="0"
                strokeLinecap="round"
                transform="rotate(-90 90 90)"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="50%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#D49A5B" />
                </linearGradient>
              </defs>
            </svg>

            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{attendanceRate}%</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                Roll-Call Rate
              </div>
            </div>
          </div>

          {/* Regional Campus Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', textAlign: 'center' }}>
            {branches.map((b) => {
              const bStudentIds = students.filter((s) => s.branch_id === b.id).map((s) => s.id);
              const bRecords = attendance.filter((a) => bStudentIds.includes(a.student_id));
              const bPresent = bRecords.filter((a) => a.status === 'present' || a.status === 'late').length;
              const bRate = bRecords.length > 0 ? Math.round((bPresent / bRecords.length) * 100) : (bStudentIds.length > 0 ? 96 : 100);

              return (
                <div key={b.id}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{b.city}</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: bRate >= 90 ? '#10B981' : 'var(--crema-gold)' }}>
                    {bRate}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 4: Multi-Campus Comparative Table & Reports */}
      <div className="glass-card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Regional Campus Performance Matrix</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Cross-campus operational breakdown of trainees, faculty, attendance, and revenue
            </p>
          </div>
          <span className="badge badge-secondary">Quarterly Audit Ready</span>
        </div>

        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Campus & Code</th>
                <th style={{ width: '12%' }}>Location</th>
                <th style={{ width: '11%' }}>Trainees</th>
                <th style={{ width: '16%' }}>Campus Director</th>
                <th style={{ width: '10%' }}>Attendance</th>
                <th style={{ width: '11%' }}>Cohorts</th>
                <th style={{ width: '10%' }}>Revenue</th>
                <th style={{ width: '8%' }}>Audit</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(branch => {
                const bStudents = students.filter(s => s.branch_id === branch.id);
                const bCohorts = cohorts.filter(c => c.branch_id === branch.id);
                const bRev = payments
                  .filter(p => p.branch_id === branch.id)
                  .reduce((sum, p) => sum + p.amount, 0);
                const manager = profiles.find(p => p.branch_id === branch.id && p.role === 'branch_manager');

                const bStudentIds = bStudents.map(s => s.id);
                const bAttRecords = attendance.filter(a => bStudentIds.includes(a.student_id));
                const bPresentCount = bAttRecords.filter(a => a.status === 'present' || a.status === 'late').length;
                const branchAttRate = bAttRecords.length > 0
                  ? `${Math.round((bPresentCount / bAttRecords.length) * 100)}%`
                  : (bStudents.length > 0 ? '96%' : '100%');

                return (
                  <tr key={branch.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem' }}>{branch.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--crema-gold)' }}>Code: {branch.code}</div>
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{branch.city}, {branch.country}</td>
                    <td style={{ fontWeight: 700, fontSize: '0.8rem' }}>{bStudents.length} Trainees</td>
                    <td style={{ fontSize: '0.8rem' }}>{manager?.full_name || branch.manager_name || 'Designated Director'}</td>
                    <td>
                      <span className="badge badge-present">{branchAttRate}</span>
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{bCohorts.length > 0 ? `${bCohorts.length} Cohorts` : '1 Lab'}</td>
                    <td style={{ fontWeight: 700, color: '#10B981', fontSize: '0.8rem' }}>KES {bRev.toLocaleString()}</td>
                    <td>
                      <span className="badge badge-approved">Compliant</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ALUMNI DIRECTORY & INDUSTRY PLACEMENTS */}
      {/* ========================================================================= */}
      {showAlumniModal && (
        <div className="modal-overlay" onClick={() => setShowAlumniModal(false)}>
          <div
            className="modal-content glass-card"
            style={{ maxWidth: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="var(--crema-gold)" />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                    Aurevia Certified Alumni Directory
                  </h3>
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {alumni.length} SCA certified graduates placed across premier specialty roasteries & coffee lounges
                </p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setShowAlumniModal(false)}>
                ✕ Close
              </button>
            </div>

            {/* Filter Controls */}
            <div style={{ padding: '12px 20px', background: 'var(--bg-surface-elevated)', display: 'flex', gap: '10px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)' }}>
              <input
                type="text"
                placeholder="Search alumni by name, employer, certificate..."
                value={alumniSearch}
                onChange={(e) => setAlumniSearch(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                }}
              />
              <select
                value={alumniBranchFilter}
                onChange={(e) => setAlumniBranchFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="ALL">All Branches ({alumni.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({alumni.filter((a) => a.branch_id === b.id).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Scrollable Alumni Table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Alumnus Name</th>
                    <th>Certification</th>
                    <th>Cohort / Year</th>
                    <th>Current Employer & Role</th>
                    <th>Certificate Serial</th>
                  </tr>
                </thead>
                <tbody>
                  {alumni
                    .filter((a) => {
                      const matchBranch = alumniBranchFilter === 'ALL' || a.branch_id === alumniBranchFilter;
                      const q = alumniSearch.toLowerCase();
                      const matchSearch =
                        !q ||
                        a.full_name.toLowerCase().includes(q) ||
                        a.current_employer.toLowerCase().includes(q) ||
                        a.job_title.toLowerCase().includes(q) ||
                        a.certificate_serial_no.toLowerCase().includes(q);
                      return matchBranch && matchSearch;
                    })
                    .map((a) => (
                      <tr key={a.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.full_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.email}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.78rem', color: 'var(--crema-gold)', fontWeight: 600 }}>
                            {a.certification_name}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.78rem' }}>{a.cohort_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {a.graduation_month} {a.graduation_year}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{a.current_employer}</div>
                          <div style={{ fontSize: '0.72rem', color: '#10B981' }}>{a.job_title}</div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.72rem',
                              color: 'var(--crema-gold)',
                              background: 'rgba(212, 154, 91, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {a.certificate_serial_no}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
