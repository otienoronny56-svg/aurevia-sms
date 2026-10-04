import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { Cohort, StudentKYC, Profile } from '../../types/database.types';
import {
  Calendar, Users, CheckCircle2, Clock, AlertTriangle, Search,
  Filter, BarChart3, TrendingUp, Building2, Sparkles, Check,
  X, ShieldCheck, Award, FileText, ArrowUpRight, Send, UserCheck,
  Mail, ChevronLeft, ChevronRight, Activity, LineChart
} from 'lucide-react';
import { ExportActionsMenu } from '../common/ExportActionsMenu';
import { exportToCSV, exportToPDFReport } from '../../lib/exportUtils';
import { AttendanceModal } from '../modals/AttendanceModal';

interface StudentRollCallAnalyticsProps {
  defaultCampusId?: string;
  isBranchManagerMode?: boolean;
}

export const StudentRollCallAnalytics: React.FC<StudentRollCallAnalyticsProps> = ({
  defaultCampusId,
  isBranchManagerMode = false,
}) => {
  const {
    attendance,
    students,
    profiles,
    cohorts,
    courses,
    branches,
    currentProfile,
    recordAttendance,
    sendBulkCommunication,
  } = useApp();

  // Active branch ID for scoping
  const activeBranchId = defaultCampusId || (isBranchManagerMode ? currentProfile.branch_id : 'ALL');

  // Filters State
  const [selectedCampus, setSelectedCampus] = useState<string>(activeBranchId || 'ALL');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('ALL');
  const [selectedCohortId, setSelectedCohortId] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '7d' | '14d' | '30d'>('all');
  const [chartMode, setChartMode] = useState<'multiline' | 'bars'>('multiline');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Roll-Call Modal State & Alert Tracking
  const [showRollCallModal, setShowRollCallModal] = useState<boolean>(false);
  const [alertSuccessState, setAlertSuccessState] = useState<{ id: string; channel: 'sms' | 'email' } | null>(null);

  // Filter cohorts available for this campus and course view
  const availableCohorts = useMemo(() => {
    return cohorts.filter((c) => {
      if (selectedCampus !== 'ALL' && c.branch_id !== selectedCampus) return false;
      if (selectedCourseId !== 'ALL' && c.course_id !== selectedCourseId) return false;
      return true;
    });
  }, [cohorts, selectedCampus, selectedCourseId]);

  // Filtered raw attendance records based on campus, cohort, status, date range, and search
  const filteredAttendance = useMemo(() => {
    return attendance.filter((att) => {
      const student = students.find((s) => s.id === att.student_id);
      const profile = profiles.find((p) => p.id === student?.profile_id);
      const cohort = cohorts.find((c) => c.id === att.cohort_id);
      const branchId = student?.branch_id || cohort?.branch_id;

      // 1. Campus filter
      if (selectedCampus !== 'ALL' && branchId !== selectedCampus) return false;

      // 2. Course filter
      if (selectedCourseId !== 'ALL' && cohort?.course_id !== selectedCourseId) return false;

      // 3. Cohort filter
      if (selectedCohortId !== 'ALL' && att.cohort_id !== selectedCohortId) return false;

      // 4. Status filter
      if (selectedStatusFilter !== 'ALL' && att.status !== selectedStatusFilter) return false;

      // 4. Date Range filter
      if (dateRangeFilter !== 'all') {
        const daysMap = { '7d': 7, '14d': 14, '30d': 30 };
        const maxDays = daysMap[dateRangeFilter];
        const recordDate = new Date(att.session_date);
        const now = new Date();
        const diffDays = Math.ceil((now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > maxDays) return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (profile?.full_name || '').toLowerCase().includes(q);
        const matchesReg = (profile?.reg_number || '').toLowerCase().includes(q);
        const matchesTopic = (att.session_title || '').toLowerCase().includes(q);
        const matchesCohort = (cohort?.name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesReg && !matchesTopic && !matchesCohort) return false;
      }

      return true;
    });
  }, [attendance, students, profiles, cohorts, selectedCampus, selectedCohortId, selectedStatusFilter, dateRangeFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAttendance.length / pageSize));
  const paginatedAttendance = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAttendance.slice(startIndex, startIndex + pageSize);
  }, [filteredAttendance, currentPage, pageSize]);

  // Top-Level Analytics Calculations
  const stats = useMemo(() => {
    const total = filteredAttendance.length;
    if (total === 0) {
      return {
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        attendanceRate: 0,
        punctualityRate: 0,
        uniqueSessions: 0,
      };
    }

    const present = filteredAttendance.filter((a) => a.status === 'present').length;
    const late = filteredAttendance.filter((a) => a.status === 'late').length;
    const absent = filteredAttendance.filter((a) => a.status === 'absent').length;
    const excused = filteredAttendance.filter((a) => a.status === 'excused').length;

    const attendanceRate = Math.round(((present + late) / total) * 100);
    const punctualityRate = Math.round((present / Math.max(1, present + late)) * 100);

    const sessionDates = new Set(filteredAttendance.map((a) => a.session_date));

    return {
      total,
      present,
      late,
      absent,
      excused,
      attendanceRate,
      punctualityRate,
      uniqueSessions: sessionDates.size,
    };
  }, [filteredAttendance]);

  // Daily Trend Aggregation (for Vertical Histogram Chart)
  const dailyTrend = useMemo(() => {
    const dateMap = new Map<string, { date: string; title: string; present: number; late: number; absent: number; excused: number; total: number }>();

    filteredAttendance.forEach((att) => {
      const d = att.session_date;
      if (!dateMap.has(d)) {
        dateMap.set(d, {
          date: d,
          title: att.session_title,
          present: 0,
          late: 0,
          absent: 0,
          excused: 0,
          total: 0,
        });
      }
      const entry = dateMap.get(d)!;
      entry.total++;
      if (att.status === 'present') entry.present++;
      else if (att.status === 'late') entry.late++;
      else if (att.status === 'absent') entry.absent++;
      else if (att.status === 'excused') entry.excused++;
    });

    return Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((entry) => {
        const rate = Math.round(((entry.present + entry.late) / Math.max(1, entry.total)) * 100);
        return {
          ...entry,
          rate,
        };
      });
  }, [filteredAttendance]);

  // Cohort Performance Contrast
  const cohortStats = useMemo(() => {
    return availableCohorts.map((coh) => {
      const cohAtt = attendance.filter((a) => a.cohort_id === coh.id);
      const total = cohAtt.length;
      if (total === 0) {
        return {
          cohort: coh,
          total: 0,
          rate: null as number | null,
          status: 'Upcoming / No Logs',
        };
      }
      const attended = cohAtt.filter((a) => a.status === 'present' || a.status === 'late').length;
      const rate = Math.round((attended / total) * 100);
      return {
        cohort: coh,
        total,
        rate,
        status: rate >= 90 ? 'Compliant (>90%)' : rate >= 80 ? 'Good (80-89%)' : 'At Risk (<80%)',
      };
    });
  }, [availableCohorts, attendance]);

  // Certification Risk Trainees (<85% laboratory attendance required for SCA / NITA certification)
  const atRiskStudents = useMemo(() => {
    const studentMap = new Map<string, { student: StudentKYC; profile: Profile; total: number; attended: number; absent: number }>();

    filteredAttendance.forEach((att) => {
      const student = students.find((s) => s.id === att.student_id);
      const profile = profiles.find((p) => p.id === student?.profile_id);
      if (!student || !profile) return;

      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          student,
          profile,
          total: 0,
          attended: 0,
          absent: 0,
        });
      }
      const s = studentMap.get(student.id)!;
      s.total++;
      if (att.status === 'present' || att.status === 'late') {
        s.attended++;
      } else if (att.status === 'absent') {
        s.absent++;
      }
    });

    return Array.from(studentMap.values())
      .map((entry) => ({
        ...entry,
        rate: Math.round((entry.attended / Math.max(1, entry.total)) * 100),
      }))
      .filter((s) => s.total >= 3 && s.rate < 85);
  }, [filteredAttendance, students, profiles]);

  // Quick Action: Send Attendance Reminder SMS / Email (Logs automatically to Communications Hub)
  const handleSendAttendanceAlert = async (
    s: { student: StudentKYC; profile: Profile; absent: number; rate: number },
    channel: 'sms' | 'email' = 'sms'
  ) => {
    try {
      const msg = `Aurevia Academy Alert: Dear ${s.profile.full_name}, your practical class attendance is currently ${s.rate}%. SCA & NITA certification requires at least 85% laboratory attendance to qualify for practical exams. Please consult your lead instructor immediately.`;
      
      await sendBulkCommunication({
        channel,
        purpose: 'attendance_alert',
        subject: channel === 'email' ? `Urgent: Attendance Threshold Warning (${s.rate}%) - Aurevia Academy` : undefined,
        audienceSegment: 'At-Risk Attendance Trainees',
        messageContent: msg,
        recipients: [
          {
            name: s.profile.full_name,
            phone: s.profile.phone || '+254700000000',
            email: s.profile.email || `${s.profile.full_name.toLowerCase().replace(/\s+/g, '.')}@student.aurevia.ac.ke`,
            branchId: s.student.branch_id,
            messageContent: msg,
          },
        ],
      });

      setAlertSuccessState({ id: s.profile.id, channel });
      setTimeout(() => setAlertSuccessState(null), 3500);
    } catch (e) {
      console.error('Failed to dispatch attendance alert:', e);
    }
  };

  // Quick Status Toggle for Audited Logs
  const handleQuickStatusToggle = async (attId: string, currentStatus: 'present' | 'absent' | 'late' | 'excused') => {
    const nextStatusMap: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {
      present: 'late',
      late: 'absent',
      absent: 'excused',
      excused: 'present',
    };
    const nextStatus = nextStatusMap[currentStatus];
    const rec = attendance.find((a) => a.id === attId);
    if (!rec) return;

    await recordAttendance({
      cohortId: rec.cohort_id,
      studentId: rec.student_id,
      sessionDate: rec.session_date,
      sessionTitle: rec.session_title,
      status: nextStatus,
    });
  };

  // Export Roll-Call Data
  const handleExportRollCall = (format: 'csv' | 'pdf') => {
    const headers = ['#', 'Date', 'Trainee Name', 'Reg Number', 'Cohort Name', 'Session Topic', 'Status', 'Session Notes'];
    const rows = filteredAttendance.map((att, idx) => {
      const student = students.find((s) => s.id === att.student_id);
      const profile = profiles.find((p) => p.id === student?.profile_id);
      const cohort = cohorts.find((c) => c.id === att.cohort_id);

      return [
        idx + 1,
        att.session_date,
        profile?.full_name || 'Trainee',
        profile?.reg_number || 'N/A',
        cohort?.name || 'Cohort',
        att.session_title || 'Class Session',
        att.status.toUpperCase(),
        att.notes || 'Official Daily Roll-Call',
      ];
    });

    if (format === 'csv') {
      exportToCSV('Aurevia_RollCall_Register', headers, rows);
    } else {
      exportToPDFReport(
        'Aurevia_RollCall_Register',
        'Official Digital Roll-Call & Attendance Audit',
        `Generated: ${new Date().toLocaleDateString()} | Total Logs: ${filteredAttendance.length}`,
        headers,
        rows
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header & Quick Actions Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} color="var(--crema-gold)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              Campus Digital Roll-Call & Attendance Intelligence
            </h2>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
            Audited trainee lab roll-calls, SCA/NITA certification threshold monitoring, and real-time attendance telemetry
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* SuperAdmin Campus Selector */}
          {!isBranchManagerMode && (
            <select
              className="form-select"
              value={selectedCampus}
              onChange={(e) => {
                setSelectedCampus(e.target.value);
                setSelectedCohortId('ALL');
              }}
              style={{ padding: '6px 12px', fontSize: '0.78rem', minWidth: '160px', background: 'var(--bg-surface-elevated)' }}
            >
              <option value="ALL">All Campuses Nationwide</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          )}

          {/* Export Actions Menu */}
          <ExportActionsMenu
            onExportCSV={() => handleExportRollCall('csv')}
            onExportPDF={() => handleExportRollCall('pdf')}
            label="Export Roll-Call"
          />

          {/* Take Roll-Call Action Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowRollCallModal(true)}
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            <UserCheck size={13} />
            <span>+ Take Roll-Call</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPI Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* Metric 1: Overall Presence Rate */}
        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Class Attendance Rate
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: stats.total === 0 ? 'var(--text-muted)' : stats.attendanceRate >= 90 ? '#10B981' : stats.attendanceRate >= 80 ? 'var(--crema-gold)' : '#EF4444',
                background: stats.total === 0 ? 'rgba(255, 255, 255, 0.05)' : stats.attendanceRate >= 90 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {stats.total === 0 ? 'Awaiting Sessions' : stats.attendanceRate >= 85 ? 'SCA Compliant' : 'Risk Detected'}
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
            {stats.attendanceRate}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={12} color="#10B981" />
            <span>85% statutory threshold for certification</span>
          </div>
        </div>

        {/* Metric 2: Total Sessions Held */}
        <div className="glass-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Lab Sessions & Logs
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--crema-gold)', marginTop: '6px' }}>
            {stats.uniqueSessions} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>sessions</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {stats.total} total trainee roll-call records
          </div>
        </div>

        {/* Metric 3: Present & On-Time */}
        <div className="glass-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Present & On-Time Rate
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6EE7B7', marginTop: '6px' }}>
            {stats.present} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>({stats.late} Late)</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {stats.punctualityRate}% punctuality index
          </div>
        </div>

        {/* Metric 4: Absences & At-Risk Trainees */}
        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Absences & Risk Warnings
            </span>
            {atRiskStudents.length > 0 && (
              <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#EF4444', background: 'rgba(239, 68, 68, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                {atRiskStudents.length} At Risk
              </span>
            )}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stats.absent > 0 ? '#EF4444' : 'var(--text-primary)', marginTop: '6px' }}>
            {stats.absent} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>({stats.excused} Excused)</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {atRiskStudents.length === 0 ? 'All students on track for graduation' : `${atRiskStudents.length} student(s) below 85% attendance`}
          </div>
        </div>
      </div>

      {/* 3. SCA / NITA Certification Risk Watchlist Alert (Conditional) */}
      {atRiskStudents.length > 0 && (
        <div
          className="glass-card"
          style={{
            padding: '16px 20px',
            borderLeft: '4px solid #EF4444',
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.08) 0%, rgba(26, 20, 18, 0.4) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} color="#EF4444" />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  SCA & NITA Laboratory Attendance Threshold Warning
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {atRiskStudents.length} trainee(s) currently below the 85% minimum practical attendance required for final practical exam qualification.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {atRiskStudents.map((item) => (
                <div
                  key={item.student.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--bg-surface-elevated)',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <span style={{ fontSize: '0.76rem', fontWeight: 600 }}>{item.profile.full_name}</span>
                  <span style={{ fontSize: '0.70rem', color: '#EF4444', fontWeight: 700 }}>{item.rate}% ({item.absent} missed)</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleSendAttendanceAlert(item, 'sms')}
                      style={{ padding: '2px 7px', fontSize: '0.66rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                      title="Send SMS Attendance Alert (Logs to Communications Hub)"
                    >
                      <Send size={10} />
                      <span>{alertSuccessState?.id === item.profile.id && alertSuccessState.channel === 'sms' ? 'SMS Sent!' : 'Alert SMS'}</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleSendAttendanceAlert(item, 'email')}
                      style={{ padding: '2px 7px', fontSize: '0.66rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                      title="Send Email Attendance Alert (Logs to Communications Hub)"
                    >
                      <Mail size={10} />
                      <span>{alertSuccessState?.id === item.profile.id && alertSuccessState.channel === 'email' ? 'Email Sent!' : 'Alert Email'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Modern Interactive Graphs: Daily Histogram & Cohort Comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        {/* Graph 1: Modern Multi-Linear Telemetry & Daily Roll-Call Performance */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '0.96rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={15} color="var(--crema-gold)" />
                <span>Multi-Linear Attendance Telemetry</span>
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Multi-metric trend tracking attendance rate %, punctuality index %, and absent counts over time
              </p>
            </div>
            
            {/* View Mode Toggle: Multi-Linear vs Histogram */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-surface-elevated)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setChartMode('multiline')}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: 'none',
                  background: chartMode === 'multiline' ? 'var(--crema-gold)' : 'transparent',
                  color: chartMode === 'multiline' ? '#1A1412' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <LineChart size={12} />
                <span>Multi-Linear</span>
              </button>
              <button
                type="button"
                onClick={() => setChartMode('bars')}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: 'none',
                  background: chartMode === 'bars' ? 'var(--crema-gold)' : 'transparent',
                  color: chartMode === 'bars' ? '#1A1412' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <BarChart3 size={12} />
                <span>Histogram</span>
              </button>
            </div>
          </div>

          {dailyTrend.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.80rem' }}>
              No session logs recorded in selected date window.
            </div>
          ) : chartMode === 'multiline' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.70rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '10px', height: '3px', background: '#10B981', borderRadius: '2px' }} />
                  Attendance Rate (%)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '10px', height: '3px', background: 'var(--crema-gold)', borderRadius: '2px' }} />
                  Punctuality Index (%)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '10px', height: '3px', background: '#EF4444', borderRadius: '2px', borderBottom: '1px dashed #EF4444' }} />
                  Absent Count
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.66rem', color: 'var(--crema-gold)', opacity: 0.85 }}>
                  85% Minimum Standard
                </span>
              </div>

              {/* Multi-Linear Scalable Vector Graphic */}
              <div style={{ position: 'relative', width: '100%', height: '170px', padding: '10px 0' }}>
                {(() => {
                  const width = 500;
                  const height = 150;
                  const padX = 24;
                  const padY = 20;
                  const usableW = width - padX * 2;
                  const usableH = height - padY * 2;
                  const count = dailyTrend.length;
                  const stepX = count > 1 ? usableW / (count - 1) : usableW;

                  // Coords for Attendance Rate
                  const attPoints = dailyTrend.map((d, i) => {
                    const x = padX + (count > 1 ? i * stepX : usableW / 2);
                    const y = padY + usableH - (d.rate / 100) * usableH;
                    return { x, y, data: d };
                  });

                  // Coords for Punctuality Rate
                  const punctPoints = dailyTrend.map((d, i) => {
                    const punctRate = Math.round((d.present / Math.max(1, d.present + d.late)) * 100);
                    const x = padX + (count > 1 ? i * stepX : usableW / 2);
                    const y = padY + usableH - (punctRate / 100) * usableH;
                    return { x, y, punctRate };
                  });

                  // Coords for Absences
                  const maxAbsent = Math.max(1, ...dailyTrend.map((d) => d.absent));
                  const absentPoints = dailyTrend.map((d, i) => {
                    const x = padX + (count > 1 ? i * stepX : usableW / 2);
                    const y = padY + usableH - (d.absent / maxAbsent) * (usableH * 0.45);
                    return { x, y, absent: d.absent };
                  });

                  const buildPath = (pts: { x: number; y: number }[]) => {
                    if (pts.length === 0) return '';
                    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} h 10`;
                    return pts.reduce((acc, pt, i) => {
                      if (i === 0) return `M ${pt.x} ${pt.y}`;
                      const prev = pts[i - 1];
                      const cpX = (prev.x + pt.x) / 2;
                      return `${acc} C ${cpX} ${prev.y}, ${cpX} ${pt.y}, ${pt.x} ${pt.y}`;
                    }, '');
                  };

                  const attPath = buildPath(attPoints);
                  const punctPath = buildPath(punctPoints);
                  const absentPath = buildPath(absentPoints);

                  const areaPath = attPoints.length > 1
                    ? `${attPath} L ${attPoints[attPoints.length - 1].x} ${height - padY} L ${attPoints[0].x} ${height - padY} Z`
                    : '';

                  // 85% Benchmark y
                  const benchY = padY + usableH - (85 / 100) * usableH;

                  return (
                    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="attAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      {[0, 25, 50, 75, 100].map((v) => {
                        const y = padY + usableH - (v / 100) * usableH;
                        return (
                          <g key={v}>
                            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                            <text x={padX - 6} y={y + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end">{v}%</text>
                          </g>
                        );
                      })}

                      {/* 85% Target Line */}
                      <line x1={padX} y1={benchY} x2={width - padX} y2={benchY} stroke="var(--crema-gold)" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />

                      {/* Area Fill */}
                      {areaPath && <path d={areaPath} fill="url(#attAreaGrad)" />}

                      {/* Multi-Linear Paths */}
                      <path d={absentPath} fill="none" stroke="#EF4444" strokeWidth="1.8" strokeDasharray="3 2" />
                      <path d={punctPath} fill="none" stroke="var(--crema-gold)" strokeWidth="2" strokeOpacity="0.8" />
                      <path d={attPath} fill="none" stroke="#10B981" strokeWidth="2.5" />

                      {/* Circular Nodes */}
                      {attPoints.map((pt, idx) => (
                        <g key={idx}>
                          <circle cx={pt.x} cy={pt.y} r="3.5" fill="#10B981" stroke="var(--bg-app)" strokeWidth="1.5" />
                          <circle cx={punctPoints[idx].x} cy={punctPoints[idx].y} r="2.5" fill="var(--crema-gold)" stroke="var(--bg-app)" strokeWidth="1" />
                          <text x={pt.x} y={height - 2} fill="var(--text-muted)" fontSize="8.5" textAnchor="middle">
                            {pt.data.date.slice(5)}
                          </text>
                        </g>
                      ))}
                    </svg>
                  );
                })()}
              </div>

              {/* Bottom Telemetry Insight */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Total Sessions Plotted: <strong style={{ color: 'var(--text-primary)' }}>{dailyTrend.length}</strong>
                </span>
                <span style={{ color: '#10B981', fontWeight: 600 }}>
                  High Mark: {Math.max(...dailyTrend.map((d) => d.rate))}%
                </span>
                <span style={{ color: 'var(--crema-gold)', fontWeight: 600 }}>
                  Mean Punctuality: {Math.round(dailyTrend.reduce((acc, d) => acc + (d.present / Math.max(1, d.present + d.late)), 0) / Math.max(1, dailyTrend.length) * 100)}%
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Vertical Histogram Bars */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: '10px',
                  height: '140px',
                  paddingTop: '16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  position: 'relative',
                }}
              >
                {/* 85% Reference Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: '15%',
                    left: 0,
                    right: 0,
                    borderTop: '1px dashed rgba(212, 154, 91, 0.4)',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                >
                  <span style={{ position: 'absolute', right: 0, top: '-14px', fontSize: '0.62rem', color: 'var(--crema-gold)', opacity: 0.8 }}>
                    85% Threshold
                  </span>
                </div>

                {dailyTrend.map((day) => {
                  const barColor = day.rate >= 90 ? '#10B981' : day.rate >= 80 ? 'var(--crema-gold)' : '#EF4444';
                  const heightPercent = Math.max(15, day.rate);

                  return (
                    <div
                      key={day.date}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%',
                        justifyContent: 'flex-end',
                        position: 'relative',
                        zIndex: 2,
                      }}
                      title={`${day.date}: ${day.title}\nAttendance: ${day.rate}% (${day.present} present, ${day.late} late, ${day.absent} absent)`}
                    >
                      <span style={{ fontSize: '0.66rem', fontWeight: 700, color: barColor, marginBottom: '4px' }}>
                        {day.rate}%
                      </span>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '36px',
                          height: `${heightPercent}%`,
                          background: `linear-gradient(180deg, ${barColor} 0%, rgba(212, 154, 91, 0.25) 100%)`,
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                          cursor: 'pointer',
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Date Labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                {dailyTrend.map((day) => (
                  <div key={day.date} style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {day.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Graph 2: Cohort Compliance Comparison & Breakdown */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '0.96rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={15} color="var(--crema-gold)" />
                <span>Cohort Compliance & Laboratory Standards</span>
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Benchmarked against 85% SCA practical curriculum standards
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {cohortStats.map(({ cohort, total, rate, status }) => {
              const isZeroLogs = total === 0 || rate === null;
              const barColor = isZeroLogs
                ? 'var(--text-muted)'
                : rate >= 90
                ? '#10B981'
                : rate >= 80
                ? 'var(--crema-gold)'
                : '#EF4444';

              return (
                <div key={cohort.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div>
                      <span style={{ fontSize: '0.80rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {cohort.name}
                      </span>
                      <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        ({total} {total === 1 ? 'log' : 'logs'} recorded)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isZeroLogs ? 'var(--text-muted)' : barColor }}>
                        {isZeroLogs ? '--' : `${rate}%`}
                      </span>
                      <span
                        style={{
                          fontSize: '0.64rem',
                          fontWeight: 700,
                          color: isZeroLogs ? 'var(--text-muted)' : barColor,
                          background: isZeroLogs
                            ? 'rgba(255, 255, 255, 0.05)'
                            : rate >= 85
                            ? 'rgba(16, 185, 129, 0.12)'
                            : 'rgba(239, 68, 68, 0.12)',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          border: isZeroLogs ? '1px solid var(--border-subtle)' : 'none',
                        }}
                      >
                        {status}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Progress Bar */}
                  <div style={{ width: '100%', height: '7px', background: 'var(--bg-surface-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: isZeroLogs ? '0%' : `${rate}%`,
                        height: '100%',
                        background: barColor,
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Visual Distribution Summary */}
            <div style={{ marginTop: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                Status Distribution Breakdown:
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-surface-elevated)', borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
                <div style={{ width: `${(stats.present / Math.max(1, stats.total)) * 100}%`, background: '#10B981' }} title={`Present: ${stats.present}`} />
                <div style={{ width: `${(stats.late / Math.max(1, stats.total)) * 100}%`, background: 'var(--crema-gold)' }} title={`Late: ${stats.late}`} />
                <div style={{ width: `${(stats.absent / Math.max(1, stats.total)) * 100}%`, background: '#EF4444' }} title={`Absent: ${stats.absent}`} />
                <div style={{ width: `${(stats.excused / Math.max(1, stats.total)) * 100}%`, background: '#38BDF8' }} title={`Excused: ${stats.excused}`} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                  Present ({stats.present})
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--crema-gold)' }} />
                  Late ({stats.late})
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
                  Absent ({stats.absent})
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38BDF8' }} />
                  Excused ({stats.excused})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Modern Filter Controls Bar */}
      <div
        className="glass-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 220px' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trainee, reg no, or topic..."
              style={{ paddingLeft: '32px', fontSize: '0.78rem', height: '34px' }}
            />
          </div>

          {/* Campus Selector for Super Admin */}
          {!isBranchManagerMode && (
            <select
              className="form-select"
              value={selectedCampus}
              onChange={(e) => {
                setSelectedCampus(e.target.value);
                setSelectedCohortId('ALL');
              }}
              style={{ fontSize: '0.78rem', height: '34px', minWidth: '150px', flex: '1 1 150px' }}
            >
              <option value="ALL">All Academy Campuses</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Course Selector */}
          <select
            className="form-select"
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              setSelectedCohortId('ALL');
            }}
            style={{ fontSize: '0.78rem', height: '34px', minWidth: '170px', flex: '1 1 170px' }}
          >
            <option value="ALL">All Course Tracks</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {/* Cohort Dropdown */}
          <select
            className="form-select"
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            style={{ fontSize: '0.78rem', height: '34px', minWidth: '180px', flex: '1 1 180px' }}
          >
            <option value="ALL">All Cohort Batches</option>
            {availableCohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Date Range Presets */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface-elevated)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            {[
              { id: 'all', label: 'All Dates' },
              { id: '7d', label: '7 Days' },
              { id: '14d', label: '14 Days' },
              { id: '30d', label: '30 Days' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDateRangeFilter(preset.id as any)}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.70rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: 'none',
                  background: dateRangeFilter === preset.id ? 'var(--crema-gold)' : 'transparent',
                  color: dateRangeFilter === preset.id ? '#1A1412' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface-elevated)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          {[
            { id: 'ALL', label: 'All', count: filteredAttendance.length },
            { id: 'present', label: 'Present', count: filteredAttendance.filter((a) => a.status === 'present').length },
            { id: 'late', label: 'Late', count: filteredAttendance.filter((a) => a.status === 'late').length },
            { id: 'absent', label: 'Absent', count: filteredAttendance.filter((a) => a.status === 'absent').length },
            { id: 'excused', label: 'Excused', count: filteredAttendance.filter((a) => a.status === 'excused').length },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setSelectedStatusFilter(pill.id)}
              style={{
                padding: '4px 8px',
                fontSize: '0.70rem',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                background: selectedStatusFilter === pill.id ? 'var(--crema-gold)' : 'transparent',
                color: selectedStatusFilter === pill.id ? '#1A1412' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {pill.label} ({pill.count})
            </button>
          ))}
        </div>
      </div>

      {/* 6. Audited Digital Roll-Call Records Data Table */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Audited Classroom & Practical Roll-Call Logs
            </h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Showing {filteredAttendance.length} verified laboratory and masterclass attendance records
            </p>
          </div>
        </div>

        <div className="table-container" style={{ width: '100%', overflowX: 'hidden' }}>
          <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: '11%' }}>Session Date</th>
                <th style={{ width: '23%' }}>Trainee Name</th>
                <th style={{ width: '13%' }}>Reg Number</th>
                <th style={{ width: '23%' }}>Cohort & Module Topic</th>
                <th style={{ width: '12%' }}>Status</th>
                <th style={{ width: '18%' }}>Roll-Call Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No roll-call logs match your current filter criteria.
                    <div style={{ marginTop: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedCohortId('ALL');
                          setSelectedStatusFilter('ALL');
                          setDateRangeFilter('all');
                          setSearchQuery('');
                          setCurrentPage(1);
                        }}
                        style={{ padding: '3px 10px', fontSize: '0.72rem' }}
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAttendance.map((att) => {
                  const student = students.find((s) => s.id === att.student_id);
                  const profile = profiles.find((p) => p.id === student?.profile_id);
                  const cohort = cohorts.find((c) => c.id === att.cohort_id);

                  const statusBadgeClass =
                    att.status === 'present'
                      ? 'badge-paid'
                      : att.status === 'late'
                      ? 'badge-present'
                      : att.status === 'absent'
                      ? 'badge-danger'
                      : 'badge-pending';

                  return (
                    <tr key={att.id}>
                      {/* Date */}
                      <td style={{ fontWeight: 600, fontSize: '0.80rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={12} color="var(--crema-gold)" />
                          <span>{att.session_date}</span>
                        </div>
                      </td>

                      {/* Trainee Name */}
                      <td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                              color: '#181310',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {(profile?.full_name || 'T').charAt(0)}
                          </div>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {profile?.full_name || 'Trainee'}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {profile?.email || 'Student'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Reg Number */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--crema-gold)', fontWeight: 700 }}>
                          {profile?.reg_number || 'N/A'}
                        </span>
                      </td>

                      {/* Cohort & Topic */}
                      <td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.80rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cohort?.name}>
                          {cohort?.name || 'Class Batch'}
                        </div>
                        <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={att.session_title}>
                          {att.session_title || 'Practical Session'}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <button
                          type="button"
                          onClick={() => handleQuickStatusToggle(att.id, att.status)}
                          title="Click to cycle status (Present -> Late -> Absent -> Excused)"
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                        >
                          <span className={`badge ${statusBadgeClass}`} style={{ fontSize: '0.68rem', padding: '2px 7px', cursor: 'pointer' }}>
                            {att.status.toUpperCase()}
                          </span>
                        </button>
                      </td>

                      {/* Notes / Punctuality */}
                      <td style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={att.notes || 'Official Daily Roll-Call'}>
                        {att.notes || 'Official Daily Roll-Call'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredAttendance.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '0.76rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredAttendance.length)} of {filteredAttendance.length} records</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '12px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="form-select"
                  style={{ fontSize: '0.72rem', padding: '2px 6px', height: '26px' }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ padding: '4px 8px', fontSize: '0.72rem', opacity: currentPage === 1 ? 0.4 : 1 }}
              >
                <ChevronLeft size={12} />
                <span>Prev</span>
              </button>
              <span style={{ padding: '0 6px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: '4px 8px', fontSize: '0.72rem', opacity: currentPage >= totalPages ? 0.4 : 1 }}
              >
                <span>Next</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Take Roll-Call Modal (when triggered) */}
      {showRollCallModal && (
        <AttendanceModal
          cohort={cohorts.find((c) => c.id === selectedCohortId) || availableCohorts[0]}
          defaultCampusId={selectedCampus !== 'ALL' ? selectedCampus : undefined}
          defaultCourseId={selectedCourseId !== 'ALL' ? selectedCourseId : undefined}
          onClose={() => setShowRollCallModal(false)}
        />
      )}
    </div>
  );
};
