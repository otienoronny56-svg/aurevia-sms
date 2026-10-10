import React, { useState } from 'react';
import { useApp } from '../lib/store';
import {
  Users, DollarSign, BookOpen, Plus, Video,
  CheckCircle2, Clock, Calendar,
  ClipboardList, Check, UserCheck,
  LogOut, User, Edit3, CalendarCheck, X, GraduationCap, RotateCcw,
  Beaker, Compass, AlertTriangle, Filter, Trash2, ExternalLink, Sparkles, MapPin, Laptop, Key
} from 'lucide-react';
import { StudentKYCModal } from '../components/modals/StudentKYCModal';
import { MpesaPaymentModal } from '../components/modals/MpesaPaymentModal';
import { CreateCohortModal } from '../components/modals/CreateCohortModal';
import { EditCohortModal } from '../components/modals/EditCohortModal';
import { SignStaffAttendanceModal } from '../components/modals/SignStaffAttendanceModal';
import { AddStaffModal } from '../components/modals/AddStaffModal';
import { ScheduleLessonModal } from '../components/modals/ScheduleLessonModal';
import { ManageLabsModal } from '../components/modals/ManageLabsModal';
import { RecordStaffLeaveModal } from '../components/modals/RecordStaffLeaveModal';
import { BranchRosterModal } from '../components/modals/BranchRosterModal';
import { StudentDetailModal } from '../components/modals/StudentDetailModal';
import { ChangeMyPasswordModal } from '../components/modals/ChangeMyPasswordModal';
import { StudentRollCallAnalytics } from '../components/analytics/StudentRollCallAnalytics';
import { InstitutionalCommunications } from '../components/analytics/InstitutionalCommunications';
import { StaffLeaveManagement } from '../components/analytics/StaffLeaveManagement';
import { PortalCredentialsManager } from '../components/analytics/PortalCredentialsManager';
import { CreateCourseModal } from '../components/modals/CreateCourseModal';
import { EditCourseModal } from '../components/modals/EditCourseModal';
import { AlumniPerformanceModal } from '../components/modals/AlumniPerformanceModal';
import { EditAlumniModal } from '../components/modals/EditAlumniModal';
import { ExportActionsMenu } from '../components/common/ExportActionsMenu';
import { exportToCSV, exportToPDFReport } from '../lib/exportUtils';
import { Course, Invoice, Profile, Cohort, StudentKYC, LessonMode, TimetableLesson, Alumni } from '../types/database.types';
import { FileCheck, CreditCard, Smartphone, Send, ShieldCheck, HelpCircle, Lock, Award, Building2 } from 'lucide-react';

type ManagerTab =
  | 'overview'
  | 'duty_register'
  | 'staff_attendance'
  | 'staff_leaves'
  | 'portal_accounts'
  | 'staff_directory'
  | 'staff'
  | 'timetable'
  | 'courses'
  | 'students'
  | 'admissions'
  | 'cohorts'
  | 'alumni'
  | 'invoices'
  | 'payments'
  | 'attendance'
  | 'communications'
  | 'sms';

interface BranchManagerDashboardProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const BranchManagerDashboard: React.FC<BranchManagerDashboardProps> = ({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
}) => {
  const {
    currentProfile,
    branches,
    courses,
    cohorts,
    profiles,
    students,
    enrollments,
    invoices,
    payments,
    revertPayment,
    verifyAndApprovePayment,
    rejectMpesaPayment,
    smsLogs,
    staffClockins,
    leaveRequests,
    lessons,
    labs,
    deleteLesson,
    verifyStudentKYC,
    reviewLeaveRequest,
    recordStaffAttendanceByManager,
    assessments,
    alumni,
    updateAlumni,
    deleteAlumni,
  } = useApp();

  // Branch Manager belongs strictly to their assigned branch
  const myBranch = branches.find((b) => b.id === currentProfile.branch_id) || branches[0] || {
    id: 'b-default',
    code: 'NBO',
    name: 'Aurevia Nairobi Roastery & Academy',
    address: 'Spring Valley Coffee Hub, Westlands',
    city: 'Nairobi',
  };

  const [localActiveTab, setLocalActiveTab] = useState<ManagerTab>('overview');
  const activeTab = (
    propActiveTab === 'staff_attendance' ? 'duty_register' :
    propActiveTab === 'staff' ? 'staff_directory' :
    propActiveTab === 'admissions' ? 'students' :
    propActiveTab as any
  ) || localActiveTab;
  const setActiveTab = propSetActiveTab || setLocalActiveTab;

  const branchCohorts = cohorts.filter((c) => c.branch_id === myBranch?.id);
  const branchCourses = courses.filter((c) => {
    if (myBranch?.id === '470b5cb5-59e2-4be0-b19b-182d9795e12b' || myBranch?.code === 'ELD') {
      return c.branch_id === myBranch.id || c.code.startsWith('LH-');
    }
    return (!c.branch_id || c.branch_id === myBranch?.id) && !c.code.startsWith('LH-');
  });
  const branchAlumni = alumni.filter((a) => a.branch_id === myBranch?.id);
  const [alumniSearch, setAlumniSearch] = useState('');
  const [selectedAlumniForPerformance, setSelectedAlumniForPerformance] = useState<Alumni | null>(null);
  const [selectedAlumniForEdit, setSelectedAlumniForEdit] = useState<Alumni | null>(null);
  const branchStudents = students.filter((s) => s.branch_id === myBranch?.id);
  const branchInvoices = invoices.filter((i) => i.branch_id === myBranch?.id);
  const branchPayments = payments.filter((p) => p.branch_id === myBranch?.id);
  const branchStaff = profiles
    .filter((p) => {
      if (p.role === 'student' || p.role === 'super_admin') return false;
      return p.id === currentProfile.id || p.branch_id === myBranch?.id || (!p.branch_id && p.role === 'instructor');
    })
    .sort((a, b) => {
      const aIsMgr = a.id === currentProfile.id || a.role === 'branch_manager';
      const bIsMgr = b.id === currentProfile.id || b.role === 'branch_manager';
      if (aIsMgr && !bIsMgr) return -1;
      if (!aIsMgr && bIsMgr) return 1;
      return a.full_name.localeCompare(b.full_name);
    });
  const branchLeaves = leaveRequests.filter((l) => l.branch_id === myBranch?.id);
  const branchLessons = lessons.filter((l) => l.branch_id === myBranch?.id || !l.branch_id);

  // Timetable State & Filters
  const [timetableModeFilter, setTimetableModeFilter] = useState<'all' | LessonMode>('all');
  const [timetableLabFilter, setTimetableLabFilter] = useState<string>('all');
  const [timetableTrainerFilter, setTimetableTrainerFilter] = useState<string>('all');
  const [presetDayForSchedule, setPresetDayForSchedule] = useState<TimetableLesson['day_of_week'] | undefined>(undefined);
  const [showManageLabsModal, setShowManageLabsModal] = useState(false);
  const [verificationToast, setVerificationToast] = useState<string | null>(null);
  const [verifiedAmountInput, setVerifiedAmountInput] = useState<Record<string, number>>({});
  const [verificationRemarksInput, setVerificationRemarksInput] = useState<Record<string, string>>({});
  const [isVerifyingId, setIsVerifyingId] = useState<string | null>(null);

  const filteredBranchLessons = branchLessons.filter((l) => {
    if (timetableModeFilter !== 'all') {
      const mode = l.lesson_mode || 'physical_lab';
      if (mode !== timetableModeFilter) return false;
    }
    if (timetableLabFilter !== 'all') {
      if (l.lab_location !== timetableLabFilter) return false;
    }
    if (timetableTrainerFilter !== 'all') {
      if (l.instructor_id !== timetableTrainerFilter) return false;
    }
    return true;
  });

  // Modals state
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [showBranchRoster, setShowBranchRoster] = useState(false);
  const [rosterInitialTab, setRosterInitialTab] = useState<'students' | 'staff'>('students');
  const [inspectedStudent, setInspectedStudent] = useState<StudentKYC | null>(null);
  const [showCreateCohortModal, setShowCreateCohortModal] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [cohortStatusFilter, setCohortStatusFilter] = useState<'ALL' | 'in_progress' | 'upcoming' | 'completed'>('ALL');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showScheduleLessonModal, setShowScheduleLessonModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRecordLeaveModal, setShowRecordLeaveModal] = useState(false);
  const [selectedStaffForLeave, setSelectedStaffForLeave] = useState<Profile | null>(null);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('ALL');
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [signingStaff, setSigningStaff] = useState<Profile | null>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [selectedCourseForEdit, setSelectedCourseForEdit] = useState<Course | null>(null);

  // Date for Staff Duty Register / Logbook
  const [selectedLogDate, setSelectedLogDate] = useState(new Date().toISOString().split('T')[0]);

  // Computed branch KPIs
  const branchTotalCollected = branchPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const branchTotalDue = branchInvoices.reduce((sum, i) => sum + (Number(i.balance_due) || 0), 0);

  // Quick Sign In / Out helpers
  const handleQuickSignIn = async (staff: Profile) => {
    const nowISO = new Date(`${selectedLogDate}T${new Date().toTimeString().slice(0, 8)}`).toISOString();
    await recordStaffAttendanceByManager({
      profileId: staff.id,
      branchId: myBranch.id,
      workDate: selectedLogDate,
      clockIn: nowISO,
      locationNotes: 'PRESENT: Quick sign-in by Branch Manager as per physical book',
    });
  };

  const handleQuickSignOut = async (staff: Profile, existingClockIn: any) => {
    const nowISO = new Date(`${selectedLogDate}T${new Date().toTimeString().slice(0, 8)}`).toISOString();
    await recordStaffAttendanceByManager({
      profileId: staff.id,
      branchId: myBranch.id,
      workDate: selectedLogDate,
      clockIn: existingClockIn?.clock_in || new Date().toISOString(),
      clockOut: nowISO,
      locationNotes: 'COMPLETED: Signed out in physical book',
    });
  };

  const handleSignAllPresent = async () => {
    const defaultTimeIn = new Date(`${selectedLogDate}T08:00:00`).toISOString();
    for (const st of branchStaff) {
      const already = staffClockins.find(
        (c) => c.profile_id === st.id && (c.work_date || '').slice(0, 10) === selectedLogDate.slice(0, 10)
      );
      if (!already) {
        await recordStaffAttendanceByManager({
          profileId: st.id,
          branchId: myBranch.id,
          workDate: selectedLogDate,
          clockIn: defaultTimeIn,
          locationNotes: 'PRESENT: Bulk verified from physical morning logbook (08:00 AM)',
        });
      }
    }
  };

  // ==========================================
  // EXPORT HANDLERS FOR BRANCH MANAGER TABS
  // ==========================================
  const handleExportStaffAttendance = (format: 'csv' | 'pdf') => {
    const headers = ['#', 'Staff Name', 'Staff ID', 'Role / Dept', 'Time In', 'Time Out', 'Duty Status', 'Location Notes'];
    const rows = branchStaff.map((staff, idx) => {
      const clockRec = staffClockins.find(
        (c) => c.profile_id === staff.id && (c.work_date || '').slice(0, 10) === selectedLogDate.slice(0, 10)
      );
      const isPresent = !!clockRec?.clock_in;
      const isDeparted = !!clockRec?.clock_out;
      const timeIn = clockRec?.clock_in ? new Date(clockRec.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
      const timeOut = clockRec?.clock_out ? new Date(clockRec.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
      const status = isDeparted ? 'Shift Done' : isPresent ? 'On Duty' : 'Pending / Not In';
      return [
        idx + 1,
        staff.full_name,
        staff.staff_id || staff.reg_number || 'AUR/STF',
        staff.job_title || staff.specialty || staff.role,
        timeIn,
        timeOut,
        status,
        clockRec?.location_notes || 'Physical Logbook',
      ];
    });

    if (format === 'csv') {
      exportToCSV(`Staff_Duty_Register_${myBranch.code}_${selectedLogDate}`, headers, rows);
    } else {
      exportToPDFReport(
        `Staff_Duty_Register_${myBranch.code}_${selectedLogDate}`,
        `STAFF DUTY REGISTER - ${myBranch.name.toUpperCase()}`,
        `Official Faculty & Operations Attendance Ledger • Date: ${selectedLogDate}`,
        headers,
        rows
      );
    }
  };

  const handleExportStaffLeaves = (format: 'csv' | 'pdf') => {
    const headers = ['#', 'Staff Name', 'Category', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Reviewer Remarks'];
    const rows = branchLeaves.map((l, idx) => {
      const st = profiles.find((p) => p.id === l.profile_id);
      return [
        idx + 1,
        st?.full_name || 'Staff Member',
        l.leave_type.toUpperCase(),
        l.start_date,
        l.end_date,
        l.days_count,
        l.reason,
        l.status.toUpperCase(),
        l.review_notes || '--',
      ];
    });

    if (format === 'csv') {
      exportToCSV(`Staff_Leaves_${myBranch.code}`, headers, rows);
    } else {
      exportToPDFReport(
        `Staff_Leaves_${myBranch.code}`,
        `STAFF LEAVES & TIME-OFF REGISTER - ${myBranch.name.toUpperCase()}`,
        `Statutory 21-Day Annual Leaves, Medical & Time-Off Log • ${myBranch.name}`,
        headers,
        rows
      );
    }
  };

  const handleExportStaffDirectory = (format: 'csv' | 'pdf') => {
    const headers = ['#', 'Staff Name', 'Staff ID', 'Role / Designation', 'Email', 'Phone', 'Department', 'Annual Leave Taken'];
    const rows = branchStaff.map((staff, idx) => {
      const taken = leaveRequests
        .filter((l) => l.profile_id === staff.id && l.leave_type === 'annual' && l.status === 'approved')
        .reduce((sum, l) => sum + l.days_count, 0);
      return [
        idx + 1,
        staff.full_name,
        staff.staff_id || staff.reg_number || 'AUR/STF',
        staff.job_title || staff.specialty || staff.role.replace('_', ' ').toUpperCase(),
        staff.email,
        staff.phone || 'N/A',
        staff.department || 'Academic Faculty',
        `${taken} / 21 Days`,
      ];
    });

    if (format === 'csv') {
      exportToCSV(`Staff_Directory_${myBranch.code}`, headers, rows);
    } else {
      exportToPDFReport(
        `Staff_Directory_${myBranch.code}`,
        `FACULTY & STAFF DIRECTORY - ${myBranch.name.toUpperCase()}`,
        `Campus Human Resources & Faculty Registry • ${myBranch.name}`,
        headers,
        rows
      );
    }
  };

  const handleExportStudents = (format: 'csv' | 'pdf') => {
    const headers = ['Reg Number', 'Student Name', 'Phone', 'National ID', 'Course', 'Cohort', 'KYC Status', 'Balance Due'];
    const rows = branchStudents.map((st) => {
      const prof = profiles.find((p) => p.id === st.profile_id);
      const enr = enrollments.find((e) => e.student_id === st.id);
      const cohort = cohorts.find((c) => c.id === enr?.cohort_id);
      const course = courses.find((c) => c.id === cohort?.course_id);
      const inv = branchInvoices.find((i) => i.student_id === st.id);
      return [
        prof?.reg_number || 'PENDING',
        prof?.full_name || 'N/A',
        prof?.phone || 'N/A',
        st.national_id_or_passport || 'N/A',
        course?.title || 'N/A',
        cohort?.name || 'N/A',
        st.kyc_verified ? 'Verified' : 'Pending',
        `KES ${(inv?.balance_due || 0).toLocaleString()}`,
      ];
    });

    if (format === 'csv') {
      exportToCSV(`Trainee_Admissions_${myBranch.code}`, headers, rows);
    } else {
      exportToPDFReport(
        `Trainee_Admissions_${myBranch.code}`,
        `CAMPUS TRAINEE ADMISSIONS - ${myBranch.name.toUpperCase()}`,
        `Official Student & KYC Directory • Total Enrolled: ${branchStudents.length}`,
        headers,
        rows
      );
    }
  };

  const handleExportInvoices = (format: 'csv' | 'pdf') => {
    const headers = ['Invoice No', 'Student Name', 'Course', 'Total Fee', 'Paid', 'Balance Due', 'Status', 'Due Date'];
    const rows = branchInvoices.map((inv) => {
      const st = students.find((s) => s.id === inv.student_id);
      const prof = profiles.find((p) => p.id === st?.profile_id);
      const enr = enrollments.find((e) => e.id === inv.enrollment_id || e.student_id === inv.student_id);
      const cohort = cohorts.find((c) => c.id === enr?.cohort_id);
      const course = courses.find((c) => c.id === cohort?.course_id);
      return [
        inv.invoice_number,
        prof?.full_name || 'N/A',
        course?.title || 'Specialty Coffee Course',
        `KES ${(Number(inv.total_fee) || 0).toLocaleString()}`,
        `KES ${(Number(inv.amount_paid) || 0).toLocaleString()}`,
        `KES ${(Number(inv.balance_due) || 0).toLocaleString()}`,
        inv.status.toUpperCase(),
        inv.due_date,
      ];
    });

    if (format === 'csv') {
      exportToCSV(`Campus_Invoices_${myBranch.code}`, headers, rows);
    } else {
      exportToPDFReport(
        `Campus_Invoices_${myBranch.code}`,
        `CAMPUS INVOICES & FEES LEDGER - ${myBranch.name.toUpperCase()}`,
        `Total Billed: KES ${branchInvoices.reduce((s, i) => s + (Number(i.total_fee) || 0), 0).toLocaleString()} • Outstanding: KES ${(Number(branchTotalDue) || 0).toLocaleString()}`,
        headers,
        rows
      );
    }
  };

  const handleExportPayments = (format: 'csv' | 'pdf') => {
    const headers = ['M-Pesa / Ref No', 'Student Name', 'Phone', 'Amount (KES)', 'Method', 'Date & Time', 'Status'];
    const rows = branchPayments.map((p) => {
      const st = students.find((s) => s.id === p.student_id);
      const prof = profiles.find((pr) => pr.id === st?.profile_id);
      return [
        p.mpesa_receipt_number || p.id,
        prof?.full_name || 'N/A',
        p.mpesa_phone_number || prof?.phone || 'N/A',
        `KES ${(Number(p.amount) || 0).toLocaleString()}`,
        p.payment_method.toUpperCase(),
        new Date(p.created_at).toLocaleString(),
        p.status.toUpperCase(),
      ];
    });

    if (format === 'csv') {
      exportToCSV(`Mpesa_Receipts_${myBranch.code}`, headers, rows);
    } else {
      exportToPDFReport(
        `Mpesa_Receipts_${myBranch.code}`,
        `M-PESA & TUITION FEE RECEIPTS - ${myBranch.name.toUpperCase()}`,
        `Total Collections: KES ${(Number(branchTotalCollected) || 0).toLocaleString()} • Total Transactions: ${branchPayments.length}`,
        headers,
        rows
      );
    }
  };

  const handleExportCohorts = (format: 'csv' | 'pdf') => {
    const headers = ['Cohort Name', 'Course', 'Schedule Timing', 'Term Dates', 'Instructor', 'Enrolled', 'Status'];
    const rows = branchCohorts.map((coh) => {
      const course = courses.find((c) => c.id === coh.course_id);
      const instructor = profiles.find((p) => p.id === coh.instructor_id);
      const enrs = enrollments.filter((e) => e.cohort_id === coh.id);
      return [
        coh.name,
        course?.title || 'N/A',
        coh.schedule_timing,
        `${coh.start_date} to ${coh.end_date}`,
        instructor?.full_name || 'Assigned Lead',
        `${enrs.length} / ${coh.max_capacity}`,
        coh.status.toUpperCase(),
      ];
    });

    if (format === 'csv') {
      exportToCSV(`Campus_Cohorts_${myBranch.code}`, headers, rows);
    } else {
      exportToPDFReport(
        `Campus_Cohorts_${myBranch.code}`,
        `CAMPUS COHORTS & INTAKES - ${myBranch.name.toUpperCase()}`,
        `Active & Graduated Cohorts Schedule • ${myBranch.name}`,
        headers,
        rows
      );
    }
  };

  const handleExportAlumni = (format: 'csv' | 'pdf') => {
    const headers = ['#', 'Full Name', 'Course', 'Intake Batch', 'Graduation Month/Year', 'Certificate Serial', 'Phone', 'Employer / Placement', 'Status'];
    const rows = branchAlumni.map((alm, idx) => {
      const crs = courses.find((c) => c.id === alm.course_id);
      return [
        idx + 1,
        alm.full_name,
        crs?.title || alm.certification_name,
        alm.cohort_name || '--',
        `${alm.graduation_month} ${alm.graduation_year}`,
        alm.certificate_serial_no,
        alm.phone || '--',
        alm.current_employer || 'Specialty Coffee Industry',
        alm.employment_status || 'Employed',
      ];
    });

    if (format === 'csv') {
      exportToCSV(`${myBranch.code}_Certified_Alumni`, headers, rows);
    } else {
      exportToPDFReport(
        `${myBranch.code}_Certified_Alumni`,
        `CERTIFIED ALUMNI DIRECTORY - ${myBranch.name.toUpperCase()}`,
        `Official Registry of Certified Graduates & Alumni Placements • Total: ${branchAlumni.length}`,
        headers,
        rows
      );
    }
  };

  const handleExportSMS = (format: 'csv' | 'pdf') => {
    const headers = ['Channel', 'Recipient Phone / Email', 'Recipient Name', 'Purpose', 'Subject / Message', 'Status', 'Sent At'];
    const rows = smsLogs.map((sms) => [
      (sms.channel || 'sms').toUpperCase(),
      sms.channel === 'email' ? (sms.recipient_email || 'N/A') : (sms.recipient_phone || 'N/A'),
      sms.recipient_name,
      sms.purpose,
      sms.subject ? `${sms.subject}: ${sms.message_content}` : sms.message_content,
      sms.delivery_status.toUpperCase(),
      new Date(sms.sent_at).toLocaleString(),
    ]);

    if (format === 'csv') {
      exportToCSV(`Communications_${myBranch.code}`, headers, rows);
    } else {
      exportToPDFReport(
        `Communications_${myBranch.code}`,
        `OMNICHANNEL COMMUNICATIONS & ALERTS LOG - ${myBranch.name.toUpperCase()}`,
        `Institutional Automated SMS & Email Dispatch Record`,
        headers,
        rows
      );
    }
  };

  const handleExportTimetable = (format: 'csv' | 'pdf') => {
    const headers = ['Day', 'Time', 'Delivery Mode', 'Course / Topic', 'Cohort', 'Trainer', 'Venue / Lab / URL'];
    const rows = filteredBranchLessons.map((les) => {
      const course = courses.find((c) => c.id === les.course_id);
      const cohort = cohorts.find((c) => c.id === les.cohort_id);
      const trainer = profiles.find((p) => p.id === les.instructor_id);
      const modeLabel = les.lesson_mode === 'virtual_theory' ? 'Online / Virtual' : les.lesson_mode === 'field_trip' ? 'Field / Farm Trip' : 'In-Person Lab';
      const loc = les.lesson_mode === 'virtual_theory' ? (les.google_meet_url || 'Virtual Class') : les.lab_location;
      return [
        les.day_of_week,
        `${les.start_time} - ${les.end_time}`,
        modeLabel,
        course?.title || les.topic_title,
        cohort?.name || 'Assigned Cohort',
        trainer?.full_name || 'Assigned Trainer',
        loc,
      ];
    });

    if (format === 'csv') {
      exportToCSV(`Campus_Timetable_${myBranch.code}`, headers, rows);
    } else {
      exportToPDFReport(
        `Campus_Timetable_${myBranch.code}`,
        `CAMPUS MASTER TIMETABLE & LAB SCHEDULE - ${myBranch.name.toUpperCase()}`,
        `Weekly Laboratory, Classroom & Field Timetable • ${myBranch.name}`,
        headers,
        rows
      );
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '28px 24px' }}>
      {/* Top Banner - Compact on Sub-Tabs */}
      {activeTab === 'overview' ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
              {myBranch.name}
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              {myBranch.city} Campus Operations
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowBranchRoster(true);
                setRosterInitialTab('students');
              }}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(212, 154, 91, 0.1)',
                borderColor: 'rgba(212, 154, 91, 0.3)',
                color: 'var(--crema-gold)'
              }}
            >
              <GraduationCap size={14} />
              <span>Campus Roster</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowChangePasswordModal(true)}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(212, 154, 91, 0.1)',
                borderColor: 'rgba(212, 154, 91, 0.3)',
                color: 'var(--crema-gold)'
              }}
              title="Update your branch manager portal password"
            >
              <Key size={14} />
              <span>Change Password</span>
            </button>
            <button className="btn btn-secondary" onClick={() => setShowAddStaffModal(true)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <UserCheck size={14} />
              <span>+ Add Staff</span>
            </button>
            <button className="btn btn-secondary" onClick={() => setShowCreateCohortModal(true)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <Calendar size={14} />
              <span>+ Schedule Cohort</span>
            </button>
            <button className="btn btn-primary" onClick={() => setShowKYCModal(true)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <Users size={14} />
              <span>+ Admit Trainee</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '14px',
            paddingBottom: '6px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--crema-gold)' }} />
            <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>
              {activeTab === 'duty_register' || activeTab === 'staff_attendance'
                ? 'Staff Duty Register'
                : activeTab.replace('_', ' ')}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {(activeTab === 'duty_register' || activeTab === 'staff_attendance') && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-surface-elevated)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)' }}>
                  <Calendar size={13} color="var(--crema-gold)" />
                  <input
                    type="date"
                    value={selectedLogDate}
                    onChange={(e) => setSelectedLogDate(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.78rem', outline: 'none' }}
                  />
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={handleSignAllPresent}
                  title="Mark all staff who haven't signed in as Present (08:00 AM)"
                  style={{ padding: '6px 10px', fontSize: '0.76rem' }}
                >
                  <Check size={12} color="#6EE7B7" />
                  <span>Sign All (08:00 AM)</span>
                </button>
                <ExportActionsMenu
                  onExportCSV={() => handleExportStaffAttendance('csv')}
                  onExportPDF={() => handleExportStaffAttendance('pdf')}
                  label="Export Logbook"
                />
              </>
            )}
            {activeTab === 'staff_leaves' && (
              <>
                <ExportActionsMenu
                  onExportCSV={() => handleExportStaffLeaves('csv')}
                  onExportPDF={() => handleExportStaffLeaves('pdf')}
                  label="Export Leaves"
                />
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedStaffForLeave(null);
                    setShowRecordLeaveModal(true);
                  }}
                  style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                >
                  <CalendarCheck size={12} />
                  <span>Record Leave / Off-Day</span>
                </button>
              </>
            )}
            {(activeTab === 'staff_directory' || activeTab === 'staff') && (
              <>
                <ExportActionsMenu
                  onExportCSV={() => handleExportStaffDirectory('csv')}
                  onExportPDF={() => handleExportStaffDirectory('pdf')}
                  label="Export Staff"
                />
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddStaffModal(true)}
                  style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                >
                  <UserCheck size={12} />
                  <span>Add Staff Member</span>
                </button>
              </>
            )}
            {activeTab === 'timetable' && (
              <>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setShowManageLabsModal(true)}
                  title="Configure physical lab rooms, workstations, and equipment"
                >
                  <Beaker size={13} color="var(--crema-gold)" />
                  <span>Manage Campus Labs ({labs.length})</span>
                </button>
                <ExportActionsMenu
                  onExportCSV={() => handleExportTimetable('csv')}
                  onExportPDF={() => handleExportTimetable('pdf')}
                  label="Export Timetable"
                />
                <button
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    setPresetDayForSchedule(undefined);
                    setShowScheduleLessonModal(true);
                  }}
                >
                  <Calendar size={13} />
                  <span>+ Schedule Timetable Lesson</span>
                </button>
              </>
            )}
            {activeTab === 'cohorts' && (
              <>
                <ExportActionsMenu
                  onExportCSV={() => handleExportCohorts('csv')}
                  onExportPDF={() => handleExportCohorts('pdf')}
                  label="Export Cohorts"
                />
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.76rem' }} onClick={() => setShowCreateCohortModal(true)}>
                  <Plus size={12} />
                  <span>Create Cohort</span>
                </button>
              </>
            )}
            {(activeTab === 'students' || activeTab === 'admissions') && (
              <>
                <ExportActionsMenu
                  onExportCSV={() => handleExportStudents('csv')}
                  onExportPDF={() => handleExportStudents('pdf')}
                  label="Export Trainees"
                />
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.76rem' }} onClick={() => setShowKYCModal(true)}>
                  <Users size={12} />
                  <span>Admit Trainee</span>
                </button>
              </>
            )}
            {activeTab === 'invoices' && (
              <>
                <ExportActionsMenu
                  onExportCSV={() => handleExportInvoices('csv')}
                  onExportPDF={() => handleExportInvoices('pdf')}
                  label="Export Invoices"
                />
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.76rem' }} onClick={() => setShowKYCModal(true)}>
                  <Plus size={12} />
                  <span>Issue Invoice</span>
                </button>
              </>
            )}
            {activeTab === 'payments' && (
              <>
                <ExportActionsMenu
                  onExportCSV={() => handleExportPayments('csv')}
                  onExportPDF={() => handleExportPayments('pdf')}
                  label="Export Receipts"
                />
                <button
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                  onClick={() => {
                    setSelectedInvoiceForPayment(null);
                    setShowPaymentModal(true);
                  }}
                >
                  <DollarSign size={12} />
                  <span>Record Receipt</span>
                </button>
              </>
            )}
            {(activeTab === 'sms' || activeTab === 'communications') && (
              <ExportActionsMenu
                onExportCSV={() => handleExportSMS('csv')}
                onExportPDF={() => handleExportSMS('pdf')}
                label="Export Communications"
              />
            )}
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div>
          {/* Branch Stats */}
          <div className="grid-stats" style={{ marginBottom: '28px' }}>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Branch Revenue Collected</span>
                <DollarSign size={18} color="var(--coffee-green)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#6EE7B7' }}>
                KES {(Number(branchTotalCollected) || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                M-Pesa & Cashier verified at this branch
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Pending Fee Balance</span>
                <DollarSign size={18} color="var(--amber-warning)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--amber-warning)' }}>
                KES {(Number(branchTotalDue) || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Across {branchInvoices.filter((i) => i.status !== 'paid').length} active invoices
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Active Cohorts</span>
                <BookOpen size={18} color="var(--crema-gold)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--crema-gold)' }}>
                {branchCohorts.length} Active
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Training labs & practical sessions
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Campus Trainees</span>
                <Users size={18} color="var(--crema-gold-light)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>
                {branchStudents.length} Trainees
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Admitted with {myBranch.code} sequence
              </div>
            </div>
          </div>

          {/* Quick Shortcuts to Duty Register & Classes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            {/* Duty Register summary card */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ClipboardList size={18} color="var(--crema-gold)" />
                    <span>Today's Staff Duty Register</span>
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Daily staff attendance summary
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={() => setActiveTab('duty_register')}
                >
                  Open Full Book →
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {branchStaff.slice(0, 4).map((staff) => {
                  const today = new Date().toISOString().split('T')[0];
                  const cRec = staffClockins.find(
                    (c) => c.profile_id === staff.id && (c.work_date || '').slice(0, 10) === today.slice(0, 10)
                  );
                  return (
                    <div
                      key={staff.id}
                      style={{
                        background: 'var(--bg-surface-elevated)',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{staff.full_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--crema-gold)' }}>
                          {staff.job_title || staff.specialty || staff.role} • {staff.staff_id || 'Staff'}
                        </div>
                      </div>
                      <div>
                        {cRec ? (
                          <span className="badge badge-present" style={{ fontSize: '0.7rem' }}>
                            Signed In: {new Date(cRec.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                            onClick={() => handleQuickSignIn(staff)}
                          >
                            Sign In
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leave Approvals Card */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem' }}>Branch Staff Leave Requests</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Staff leave applications
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {branchLeaves.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                    No active leave requests for this branch.
                  </p>
                ) : (
                  branchLeaves.map((req) => {
                    const staffProf = profiles.find((p) => p.id === req.profile_id);
                    return (
                      <div
                        key={req.id}
                        style={{
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{staffProf?.full_name}</span>
                          <span className={`badge badge-${req.status}`} style={{ fontSize: '0.68rem' }}>{req.status}</span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>"{req.reason}"</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.72rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {req.start_date} to {req.end_date} ({req.days_count} days)
                          </span>
                          {req.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="btn btn-primary"
                                style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                onClick={() => reviewLeaveRequest(req.id, 'approved', 'Approved by Branch Manager')}
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-danger"
                                style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                onClick={() => reviewLeaveRequest(req.id, 'rejected', 'Staff coverage needed')}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DUTY REGISTER / STAFF ATTENDANCE */}
      {/* ========================================================================= */}
      {(activeTab === 'duty_register' || activeTab === 'staff_attendance') && (
        <div>
          {/* KPI Summary Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            {(() => {
              const totalStaff = branchStaff.length;
              const signedInToday = branchStaff.filter((st) => {
                const rec = staffClockins.find(
                  (c) => c.profile_id === st.id && (c.work_date || '').slice(0, 10) === selectedLogDate.slice(0, 10)
                );
                return rec && rec.clock_in;
              }).length;
              const signedOutToday = branchStaff.filter((st) => {
                const rec = staffClockins.find(
                  (c) => c.profile_id === st.id && (c.work_date || '').slice(0, 10) === selectedLogDate.slice(0, 10)
                );
                return rec && rec.clock_out;
              }).length;
              const pendingSignIn = totalStaff - signedInToday;

              return (
                <>
                  <div className="glass-card" style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Campus Staff</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalStaff} Members</div>
                  </div>
                  <div className="glass-card" style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Signed In (On Duty)</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#6EE7B7' }}>{signedInToday} Present</div>
                  </div>
                  <div className="glass-card" style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Signed Out (Shift Done)</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--crema-gold)' }}>{signedOutToday} Departed</div>
                  </div>
                  <div className="glass-card" style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Sign-In</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: pendingSignIn > 0 ? 'var(--amber-warning)' : '#6EE7B7' }}>
                      {pendingSignIn} Awaiting
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Logbook Date Selector & Action Toolbar */}
          <div
            className="glass-card"
            style={{
              padding: '16px 20px',
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'linear-gradient(135deg, rgba(212, 154, 91, 0.08) 0%, rgba(26, 20, 18, 0.6) 100%)',
              border: '1px solid rgba(212, 154, 91, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="var(--crema-gold)" />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Logbook Register Date:
                </span>
              </div>
              <input
                type="date"
                value={selectedLogDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedLogDate(e.target.value)}
                className="input-field"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  fontFamily: 'var(--font-mono)',
                  width: 'auto',
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--crema-gold)',
                }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                  onClick={() => setSelectedLogDate(new Date().toISOString().split('T')[0])}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    setSelectedLogDate(y.toISOString().split('T')[0]);
                  }}
                >
                  Yesterday
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                onClick={handleSignAllPresent}
                title="Fill default 08:00 AM clock-in for all unrecorded staff"
              >
                <CheckCircle2 size={13} color="#10B981" />
                <span>Bulk Sign In (08:00 AM)</span>
              </button>
              <ExportActionsMenu
                onExportCSV={() => handleExportStaffAttendance('csv')}
                onExportPDF={() => handleExportStaffAttendance('pdf')}
                label="Export Logbook"
              />
            </div>
          </div>

          {/* Executive Manager Attendance Status Card (Approach 1: Self-Sign with Super Admin Audit Transparency) */}
          {(() => {
            const managerProfile = branchStaff.find((s) => s.id === currentProfile.id || s.role === 'branch_manager') || currentProfile;
            const managerClock = staffClockins.find(
              (c) => c.profile_id === managerProfile.id && (c.work_date || '').slice(0, 10) === selectedLogDate.slice(0, 10)
            );
            const isSelfLogged = managerClock?.location_notes?.includes('MANAGER SELF-LOGGED');
            const mgrIn = managerClock?.clock_in
              ? new Date(managerClock.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : null;
            const mgrOut = managerClock?.clock_out
              ? new Date(managerClock.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : null;

            return (
              <div
                className="glass-card"
                style={{
                  padding: '16px 20px',
                  marginBottom: '20px',
                  border: '1px solid rgba(212, 154, 91, 0.4)',
                  background: 'linear-gradient(135deg, rgba(212, 154, 91, 0.12) 0%, rgba(20, 16, 14, 0.9) 100%)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                      color: '#181310',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(212, 154, 91, 0.3)',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {managerProfile.full_name}
                      </span>
                      <span className="badge badge-gold" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                        Campus General Manager
                      </span>
                      {managerClock ? (
                        <span className="badge badge-paid" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                          Duty Recorded
                        </span>
                      ) : (
                        <span className="badge badge-pending" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                          Attendance Pending
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      {managerClock ? (
                        <span>
                          Shift: <strong style={{ color: '#6EE7B7' }}>{mgrIn || '--'}</strong>
                          {mgrOut ? <> → <strong style={{ color: 'var(--crema-gold)' }}>{mgrOut}</strong> (Completed)</> : <> → <span style={{ color: '#10B981' }}>On Duty</span></>}
                          {isSelfLogged && (
                            <span style={{ marginLeft: '8px', color: 'var(--crema-gold)', fontStyle: 'italic' }}>
                              • Self-Logged Entry (Super Admin Audited)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span>Your personal attendance for <strong>{selectedLogDate}</strong> is not yet recorded. Log your shift below:</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(212, 154, 91, 0.25)',
                  }}
                  onClick={() => setSigningStaff(managerProfile)}
                >
                  <Edit3 size={14} />
                  <span>{managerClock ? '✏️ Edit My Attendance' : '✍️ Log My Own Attendance'}</span>
                </button>
              </div>
            );
          })()}

          {/* Master Logbook Table (Zero Horizontal Scrolling) */}
          <div className="table-container" style={{ overflowX: 'hidden', marginBottom: '24px' }}>
            <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>#</th>
                  <th style={{ width: '23%' }}>Staff Member</th>
                  <th style={{ width: '13%' }}>Staff ID</th>
                  <th style={{ width: '18%' }}>Department / Role</th>
                  <th style={{ width: '9%' }}>Time In</th>
                  <th style={{ width: '9%' }}>Time Out</th>
                  <th style={{ width: '11%' }}>Duty Status</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Manager Actions</th>
                </tr>
              </thead>
              <tbody>
                {branchStaff.map((staff, index) => {
                  const clockRec = staffClockins.find(
                    (c) => c.profile_id === staff.id && (c.work_date || '').slice(0, 10) === selectedLogDate.slice(0, 10)
                  );
                  const isPresent = !!clockRec?.clock_in;
                  const isDeparted = !!clockRec?.clock_out;
                  const isManager = staff.id === currentProfile.id || staff.role === 'branch_manager';
                  const isSelfLogged = clockRec?.location_notes?.includes('MANAGER SELF-LOGGED');

                  const timeInDisplay = clockRec?.clock_in
                    ? new Date(clockRec.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--:--';
                  const timeOutDisplay = clockRec?.clock_out
                    ? new Date(clockRec.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--:--';

                  return (
                    <tr
                      key={staff.id}
                      style={{
                        background: isManager ? 'rgba(212, 154, 91, 0.04)' : undefined,
                      }}
                    >
                      {/* Ser No. */}
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.80rem' }}>
                        #{index + 1}
                      </td>

                      {/* Staff Member */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isManager
                                ? 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)'
                                : 'linear-gradient(135deg, #4A3E39 0%, #2A2421 100%)',
                              color: isManager ? '#181310' : '#E5D6C5',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              border: isManager ? '1px solid rgba(212, 154, 91, 0.5)' : undefined,
                            }}
                          >
                            {staff.full_name.charAt(0)}
                          </div>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ fontWeight: isManager ? 700 : 600, fontSize: '0.82rem', color: isManager ? 'var(--crema-gold)' : 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {staff.full_name} {isManager && '(You)'}
                            </div>
                            <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {staff.phone || staff.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Staff ID */}
                      <td>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: 'var(--crema-gold)',
                            fontSize: '0.76rem',
                            background: 'rgba(212, 154, 91, 0.1)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid rgba(212, 154, 91, 0.25)',
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {staff.staff_id || staff.reg_number || 'AUR/STF'}
                        </span>
                      </td>

                      {/* Role & Dept */}
                      <td>
                        <div style={{ fontSize: '0.80rem', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isManager && <ShieldCheck size={13} color="var(--crema-gold)" />}
                          <span>{isManager ? 'Branch General Manager' : (staff.job_title || staff.specialty || staff.role)}</span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {isSelfLogged ? (
                            <span style={{ color: 'var(--crema-gold)', fontWeight: 600 }}>★ Self-Signed (Super Admin Audited)</span>
                          ) : clockRec?.location_notes?.includes('VERIFIED BY MANAGER') ? (
                            <span style={{ color: '#10B981', fontWeight: 600 }}>✓ Verified from Logbook</span>
                          ) : (
                            clockRec?.location_notes || staff.department || (staff.system_access === false ? 'Support Operations' : 'Academic Faculty')
                          )}
                        </div>
                      </td>

                      {/* Time In */}
                      <td>
                        {isPresent ? (
                          <span style={{ fontWeight: 700, color: '#6EE7B7', fontFamily: 'var(--font-mono)', fontSize: '0.80rem' }}>
                            {timeInDisplay}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Not In</span>
                        )}
                      </td>

                      {/* Time Out */}
                      <td>
                        {isDeparted ? (
                          <span style={{ fontWeight: 700, color: 'var(--crema-gold)', fontFamily: 'var(--font-mono)', fontSize: '0.80rem' }}>
                            {timeOutDisplay}
                          </span>
                        ) : isPresent ? (
                          <span style={{ color: '#10B981', fontSize: '0.72rem', fontWeight: 600 }}>On Duty...</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>--</span>
                        )}
                      </td>

                      {/* Duty Status */}
                      <td>
                        {isDeparted ? (
                          <span className="badge badge-paid" style={{ fontSize: '0.65rem', padding: '2px 5px', whiteSpace: 'nowrap' }}>
                            Shift Done
                          </span>
                        ) : isPresent ? (
                          <span className="badge badge-present" style={{ fontSize: '0.65rem', padding: '2px 5px', whiteSpace: 'nowrap' }}>
                            On Duty
                          </span>
                        ) : (
                          <span className="badge badge-pending" style={{ fontSize: '0.65rem', padding: '2px 5px', whiteSpace: 'nowrap' }}>
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Manager Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          {isManager ? (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '3px 8px', fontSize: '0.70rem' }}
                              onClick={() => setSigningStaff(staff)}
                              title="Record or update my manager attendance entry"
                            >
                              <span>{clockRec ? '✏️ Edit Shift' : '✍️ Self-Sign'}</span>
                            </button>
                          ) : !isPresent ? (
                            <>
                              <button
                                className="btn btn-primary"
                                style={{ padding: '3px 7px', fontSize: '0.70rem' }}
                                onClick={() => handleQuickSignIn(staff)}
                                title="Quick Sign-in (Now)"
                              >
                                <span>⚡ In</span>
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '3px 6px', fontSize: '0.70rem' }}
                                onClick={() => setSigningStaff(staff)}
                                title="Enter custom time from physical logbook"
                              >
                                <span>✍️ Sign</span>
                              </button>
                            </>
                          ) : !isDeparted ? (
                            <>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '3px 7px', fontSize: '0.70rem' }}
                                onClick={() => handleQuickSignOut(staff, clockRec)}
                                title="Sign Out Now"
                              >
                                <LogOut size={11} color="var(--crema-gold)" />
                                <span>Out</span>
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '3px 6px', fontSize: '0.70rem' }}
                                onClick={() => setSigningStaff(staff)}
                                title="Edit times"
                              >
                                <span>✏️</span>
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '3px 6px', fontSize: '0.70rem' }}
                              onClick={() => setSigningStaff(staff)}
                              title="Re-open logbook entry"
                            >
                              <span>✏️ Log</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: STAFF LEAVES & STATUTORY TIME-OFF MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'staff_leaves' && (
        <StaffLeaveManagement isBranchManagerMode={true} />
      )}

      {/* ========================================================================= */}
      {/* TAB: ACADEMY PORTAL CREDENTIALS & ACCOUNTS HUB */}
      {/* ========================================================================= */}
      {activeTab === 'portal_accounts' && (
        <PortalCredentialsManager isBranchManagerMode={true} />
      )}

      {/* ========================================================================= */}
      {/* TAB: STAFF & FACULTY DIRECTORY */}
      {/* ========================================================================= */}
      {(activeTab === 'staff_directory' || activeTab === 'staff') && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Campus Faculty & Staff HR Directory</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Instructors, trainers, barista lab technicians, and operations team for {myBranch.name}
              </p>
            </div>
          </div>

          <div className="table-container" style={{ width: '100%', overflowX: 'hidden' }}>
            <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>#</th>
                  <th style={{ width: '23%' }}>Staff Member</th>
                  <th style={{ width: '13%' }}>Staff ID</th>
                  <th style={{ width: '18%' }}>Role / Designation</th>
                  <th style={{ width: '16%' }}>Department</th>
                  <th style={{ width: '12%' }}>Annual Leave</th>
                  <th style={{ width: '14%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branchStaff.map((staff, idx) => {
                  const taken = branchLeaves
                    .filter((l) => l.profile_id === staff.id && l.leave_type === 'annual' && l.status === 'approved')
                    .reduce((s, l) => s + l.days_count, 0);
                  const remaining = Math.max(0, 21 - taken);

                  return (
                    <tr key={staff.id}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.80rem' }}>#{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                              color: '#181310',
                              fontWeight: 700,
                              fontSize: '0.80rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {staff.full_name.charAt(0)}
                          </div>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{staff.full_name}</div>
                            <div style={{ fontSize: '0.69rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {staff.email} • {staff.phone || 'No phone'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--crema-gold)', fontWeight: 700 }}>
                          {staff.staff_id || staff.reg_number || 'AUR/STF'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.80rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={staff.job_title || staff.specialty || staff.role.replace('_', ' ').toUpperCase()}>
                        {staff.job_title || staff.specialty || staff.role.replace('_', ' ').toUpperCase()}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {staff.department || 'Academy Faculty'}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: remaining > 5 ? '#10B981' : '#EF4444', whiteSpace: 'nowrap' }}>
                          {remaining} / 21d left
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.70rem', whiteSpace: 'nowrap' }}
                          onClick={() => {
                            setSelectedStaffForLeave(staff);
                            setShowRecordLeaveModal(true);
                          }}
                        >
                          <span>+ Log Leave</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: TIMETABLE & LESSON SCHEDULER */}
      {/* ========================================================================= */}
      {activeTab === 'timetable' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header & KPI Summary Cards */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <Calendar size={22} color="var(--crema-gold)" />
                  <span>Campus Master Timetable & Facility Allocator</span>
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Smart scheduling engine with real-time clash protection for machine labs, trainers, and trainee cohorts across physical, online, and field lessons.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '7px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setShowManageLabsModal(true)}
                >
                  <Beaker size={14} color="var(--crema-gold)" />
                  <span>Configure Campus Labs ({labs.length})</span>
                </button>
                <button
                  className="btn btn-primary"
                  style={{ padding: '7px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    setPresetDayForSchedule(undefined);
                    setShowScheduleLessonModal(true);
                  }}
                >
                  <Calendar size={14} />
                  <span>+ Schedule New Lesson</span>
                </button>
              </div>
            </div>

            {/* Quick KPI Stat Tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {/* Total Lessons */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(212, 154, 91, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--crema-gold)' }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{branchLessons.length}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Weekly Scheduled Classes</div>
                </div>
              </div>

              {/* Physical Labs */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                  <Beaker size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981' }}>
                    {branchLessons.filter((l) => (l.lesson_mode || 'physical_lab') === 'physical_lab').length}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>In-Person Lab Practicals</div>
                </div>
              </div>

              {/* Virtual Lectures */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                  <Laptop size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38BDF8' }}>
                    {branchLessons.filter((l) => l.lesson_mode === 'virtual_theory').length}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Virtual Google Meet Classes</div>
                </div>
              </div>

              {/* Field Trips */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(234, 179, 8, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EAB308' }}>
                  <Compass size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#EAB308' }}>
                    {branchLessons.filter((l) => l.lesson_mode === 'field_trip').length}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Field & Farm Tours</div>
                </div>
              </div>

              {/* Campus Lab Facilities */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--crema-gold)' }}>{labs.length}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Configured Labs</div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.70rem' }}
                  onClick={() => setShowManageLabsModal(true)}
                >
                  Manage
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {/* Format Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Filter size={12} /> Format:
                </span>
                <button
                  type="button"
                  onClick={() => setTimetableModeFilter('all')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: timetableModeFilter === 'all' ? '1px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
                    background: timetableModeFilter === 'all' ? 'rgba(212, 154, 91, 0.15)' : 'transparent',
                    color: timetableModeFilter === 'all' ? 'var(--crema-gold)' : 'var(--text-secondary)',
                  }}
                >
                  All Formats ({branchLessons.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTimetableModeFilter('physical_lab')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: timetableModeFilter === 'physical_lab' ? '1px solid #10B981' : '1px solid var(--border-subtle)',
                    background: timetableModeFilter === 'physical_lab' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                    color: timetableModeFilter === 'physical_lab' ? '#10B981' : 'var(--text-secondary)',
                  }}
                >
                  🔬 In-Person Labs ({branchLessons.filter((l) => (l.lesson_mode || 'physical_lab') === 'physical_lab').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTimetableModeFilter('virtual_theory')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: timetableModeFilter === 'virtual_theory' ? '1px solid #38BDF8' : '1px solid var(--border-subtle)',
                    background: timetableModeFilter === 'virtual_theory' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: timetableModeFilter === 'virtual_theory' ? '#38BDF8' : 'var(--text-secondary)',
                  }}
                >
                  💻 Online / Meet ({branchLessons.filter((l) => l.lesson_mode === 'virtual_theory').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTimetableModeFilter('field_trip')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: timetableModeFilter === 'field_trip' ? '1px solid #EAB308' : '1px solid var(--border-subtle)',
                    background: timetableModeFilter === 'field_trip' ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                    color: timetableModeFilter === 'field_trip' ? '#EAB308' : 'var(--text-secondary)',
                  }}
                >
                  🌿 Field Trips ({branchLessons.filter((l) => l.lesson_mode === 'field_trip').length})
                </button>
              </div>

              {/* Lab & Trainer Dropdowns */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <select
                  value={timetableLabFilter}
                  onChange={(e) => setTimetableLabFilter(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.74rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="all">🏢 All Labs & Venues</option>
                  {Array.from(new Set([...labs.map((lb) => lb.name), ...branchLessons.map((l) => l.lab_location).filter(Boolean)])).map((labName) => (
                    <option key={labName} value={labName}>
                      {labName}
                    </option>
                  ))}
                </select>

                <select
                  value={timetableTrainerFilter}
                  onChange={(e) => setTimetableTrainerFilter(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.74rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="all">👨‍🏫 All Faculty Trainers</option>
                  {profiles
                    .filter((p) => p.role === 'instructor' || p.role === 'super_admin' || p.role === 'branch_manager')
                    .map((trainer) => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.full_name}
                      </option>
                    ))}
                </select>

                {(timetableModeFilter !== 'all' || timetableLabFilter !== 'all' || timetableTrainerFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setTimetableModeFilter('all');
                      setTimetableLabFilter('all');
                      setTimetableTrainerFilter('all');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--crema-gold)',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: '4px 6px',
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Weekly Days Grid (Monday - Saturday) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px', marginBottom: '32px' }}>
            {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const).map((day) => {
              const dayLessons = filteredBranchLessons
                .filter((l) => l.day_of_week === day)
                .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

              return (
                <div
                  key={day}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {/* Column Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--border-subtle)',
                      paddingBottom: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--crema-gold)' }}>
                        {day}
                      </div>
                      <span className="badge badge-secondary" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
                        {dayLessons.length} {dayLessons.length === 1 ? 'Class' : 'Classes'}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.70rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        setPresetDayForSchedule(day);
                        setShowScheduleLessonModal(true);
                      }}
                      title={`Add a lesson on ${day}`}
                    >
                      <Plus size={11} />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Lessons List */}
                  {dayLessons.length === 0 ? (
                    <div
                      style={{
                        padding: '36px 16px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        border: '1px dashed var(--border-medium)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Clock size={20} style={{ opacity: 0.4 }} />
                      <div style={{ fontSize: '0.78rem' }}>No lessons scheduled for {day}</div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '3px 10px', fontSize: '0.70rem', marginTop: '4px' }}
                        onClick={() => {
                          setPresetDayForSchedule(day);
                          setShowScheduleLessonModal(true);
                        }}
                      >
                        + Schedule on {day}
                      </button>
                    </div>
                  ) : (
                    dayLessons.map((les) => {
                      const trainer = profiles.find((p) => p.id === les.instructor_id);
                      const cohort = cohorts.find((c) => c.id === les.cohort_id);
                      const course = courses.find((c) => c.id === les.course_id);
                      const mode = les.lesson_mode || 'physical_lab';

                      // Compute duration string (e.g., 2h, 1.5h)
                      let durationLabel = '';
                      if (les.start_time && les.end_time) {
                        const [sh, sm] = les.start_time.split(':').map(Number);
                        const [eh, em] = les.end_time.split(':').map(Number);
                        const diffMin = (eh * 60 + em) - (sh * 60 + sm);
                        if (diffMin > 0) {
                          const hrs = diffMin / 60;
                          durationLabel = hrs % 1 === 0 ? `${hrs}h` : `${hrs.toFixed(1)}h`;
                        }
                      }

                      return (
                        <div
                          key={les.id}
                          style={{
                            background: 'var(--bg-surface-elevated)',
                            border: mode === 'virtual_theory'
                              ? '1px solid rgba(56, 189, 248, 0.35)'
                              : mode === 'field_trip'
                              ? '1px solid rgba(234, 179, 8, 0.35)'
                              : '1px solid var(--border-medium)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            position: 'relative',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* Timing & Delivery Badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                color: '#6EE7B7',
                                background: 'rgba(110, 231, 183, 0.12)',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Clock size={11} />
                              {les.start_time} - {les.end_time}
                              {durationLabel && (
                                <span style={{ opacity: 0.75, fontSize: '0.68rem', marginLeft: '2px' }}>
                                  ({durationLabel})
                                </span>
                              )}
                            </span>

                            {mode === 'physical_lab' && (
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  color: '#10B981',
                                  background: 'rgba(16, 185, 129, 0.14)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <Beaker size={10} /> In-Person Lab
                              </span>
                            )}
                            {mode === 'virtual_theory' && (
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  color: '#38BDF8',
                                  background: 'rgba(56, 189, 248, 0.14)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <Laptop size={10} /> Online Virtual
                              </span>
                            )}
                            {mode === 'field_trip' && (
                              <span
                                style={{
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  color: '#EAB308',
                                  background: 'rgba(234, 179, 8, 0.14)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <Compass size={10} /> Field Trip
                              </span>
                            )}
                          </div>

                          {/* Course / Topic Title */}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                              {course?.title || les.topic_title}
                            </div>
                            {les.topic_title && les.topic_title !== course?.title && (
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {les.topic_title}
                              </div>
                            )}
                          </div>

                          {/* Cohort Name & Intake Details */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.74rem', color: 'var(--crema-gold-light)', fontWeight: 600 }}>
                              {cohort?.name || 'Assigned Cohort'}
                            </span>
                            {course?.category && (
                              <span className="badge badge-gold" style={{ fontSize: '0.64rem', padding: '1px 5px' }}>
                                {course.category}
                              </span>
                            )}
                          </div>

                          {/* Venue / Lab / Google Meet Block */}
                          <div
                            style={{
                              background: 'rgba(0,0,0,0.22)',
                              padding: '8px 10px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.74rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '5px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <User size={12} color="var(--crema-gold)" style={{ flexShrink: 0 }} />
                              <span>Trainer: <strong>{trainer?.full_name || 'Assigned Lead'}</strong></span>
                            </div>

                            {mode === 'physical_lab' && (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontWeight: 600 }}>
                                  <Beaker size={12} style={{ flexShrink: 0 }} />
                                  <span>{les.lab_location || 'Espresso Lab 1'}</span>
                                </div>
                                {les.equipment_needed && (
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', paddingLeft: '18px' }}>
                                    Tools: {les.equipment_needed}
                                  </div>
                                )}
                              </div>
                            )}

                            {mode === 'virtual_theory' && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginTop: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38BDF8' }}>
                                  <Video size={12} style={{ flexShrink: 0 }} />
                                  <span style={{ fontSize: '0.72rem' }}>Google Meet Live Classroom</span>
                                </div>
                                {les.google_meet_url && (
                                  <a
                                    href={les.google_meet_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      fontSize: '0.70rem',
                                      color: '#38BDF8',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      textDecoration: 'none',
                                      fontWeight: 600,
                                      background: 'rgba(56, 189, 248, 0.12)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    <span>Join</span>
                                    <ExternalLink size={10} />
                                  </a>
                                )}
                              </div>
                            )}

                            {mode === 'field_trip' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EAB308', fontWeight: 600 }}>
                                <MapPin size={12} style={{ flexShrink: 0 }} />
                                <span>{les.lab_location || 'Coffee Farm / Estate Tour'}</span>
                              </div>
                            )}
                          </div>

                          {/* Footer Actions */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', paddingTop: '4px' }}>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              📱 Auto Reminders Active
                            </span>

                            <button
                              type="button"
                              className="btn btn-danger"
                              style={{ padding: '2px 8px', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => {
                                if (window.confirm(`Remove "${course?.title || les.topic_title}" from ${les.day_of_week}'s schedule?`)) {
                                  deleteLesson(les.id);
                                }
                              }}
                              title="Delete session from timetable"
                            >
                              <Trash2 size={10} />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STUDENTS & ADMISSIONS */}
      {/* ========================================================================= */}
      {activeTab === 'students' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Campus Student Admissions & KYC Ledger</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Trainees registered under {myBranch.name}
            </p>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reg Number</th>
                  <th>Student Name</th>
                  <th>National ID</th>
                  <th>Course & Intake</th>
                  <th>KYC Status</th>
                  <th>Balance Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branchStudents.map((st) => {
                  const prof = profiles.find((p) => p.id === st.profile_id);
                  const enr = enrollments.find((e) => e.student_id === st.id);
                  const cohort = cohorts.find((c) => c.id === enr?.cohort_id);
                  const course = courses.find((c) => c.id === cohort?.course_id);
                  const inv = branchInvoices.find((i) => i.student_id === st.id);

                  return (
                    <tr key={st.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--crema-gold)' }}>
                        {prof?.reg_number || 'PENDING'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{prof?.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{prof?.phone}</div>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{st.national_id_or_passport}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{course?.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--crema-gold)' }}>{cohort?.name}</div>
                      </td>
                      <td>
                        {st.kyc_verified ? (
                          <span className="badge badge-approved">
                            <CheckCircle2 size={12} /> Verified
                          </span>
                        ) : (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                            onClick={() => verifyStudentKYC(st.id)}
                          >
                            Verify KYC
                          </button>
                        )}
                      </td>
                      <td>
                        {inv ? (
                          <span
                            style={{
                              fontWeight: 700,
                              color: (Number(inv.balance_due) || 0) > 0 ? 'var(--cherry-red)' : '#6EE7B7',
                              fontSize: '0.85rem',
                            }}
                          >
                            KES {(Number(inv.balance_due) || 0).toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>KES 0</span>
                        )}
                      </td>
                      <td>
                        {inv && (Number(inv.balance_due) || 0) > 0 ? (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                            onClick={() => {
                              setSelectedInvoiceForPayment(inv);
                              setShowPaymentModal(true);
                            }}
                          >
                            <DollarSign size={12} />
                            <span>Collect Fee</span>
                          </button>
                        ) : (
                          <span className="badge badge-paid">Fully Paid</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: COHORTS & CLASSES */}
      {/* ========================================================================= */}
      {activeTab === 'cohorts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Campus Intakes & Laboratory Cohorts</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Physical training cohorts, active batches, and graduated alumni terms for {myBranch.name}
              </p>
            </div>

            {/* Status Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-surface-elevated)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              {[
                { id: 'ALL', label: 'All Batches', count: branchCohorts.length },
                { id: 'in_progress', label: 'In Progress', count: branchCohorts.filter((c) => c.status === 'in_progress').length },
                { id: 'upcoming', label: 'Upcoming', count: branchCohorts.filter((c) => c.status === 'upcoming').length },
                { id: 'completed', label: 'Graduated / Completed', count: branchCohorts.filter((c) => c.status === 'completed').length },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCohortStatusFilter(f.id as any)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: cohortStatusFilter === f.id ? 'var(--crema-gold)' : 'transparent',
                    color: cohortStatusFilter === f.id ? '#1A1412' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
          </div>

          <div className="grid-cards">
            {branchCohorts
              .filter((c) => (cohortStatusFilter === 'ALL' ? true : c.status === cohortStatusFilter))
              .map((cohort) => {
              const course = courses.find((c) => c.id === cohort.course_id);
              const instructor = profiles.find((p) => p.id === cohort.instructor_id);
              const cohortEnrs = enrollments.filter((e) => e.cohort_id === cohort.id);

              return (
                <div key={cohort.id} className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <span className="badge badge-gold" style={{ marginBottom: '6px' }}>
                        {course?.category}
                      </span>
                      <h3 style={{ fontSize: '1.1rem', marginTop: '4px' }}>{cohort.name}</h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{course?.title}</p>
                    </div>
                    <span className={`badge badge-${cohort.status}`}>{cohort.status}</span>
                  </div>

                  <div
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      margin: '12px 0',
                      fontSize: '0.8rem',
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
                      <span style={{ color: 'var(--text-muted)' }}>Instructor:</span>
                      <span style={{ fontWeight: 600, color: 'var(--crema-gold)' }}>
                        {instructor?.full_name || 'Assigned Lead'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Enrollment:</span>
                      <span>{cohortEnrs.length} / {cohort.max_capacity} Students</span>
                    </div>
                  </div>

                  {/* Cohort Action Indicator & Edit Button */}
                  <div
                    style={{
                      background: 'rgba(212, 154, 91, 0.08)',
                      border: '1px solid rgba(212, 154, 91, 0.2)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      marginBottom: '10px',
                    }}
                  >
                    <span style={{ color: 'var(--crema-gold)', fontWeight: 600 }}>🔬 On-Campus Practical Lab</span>
                    <span style={{ color: 'var(--text-muted)' }}>In-Person Session</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setEditingCohort(cohort)}
                      className="btn btn-secondary"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: 600,
                      }}
                    >
                      <Edit3 size={14} style={{ color: 'var(--crema-gold)' }} />
                      <span>Edit Cohort</span>
                    </button>
                    {cohort.google_meet_url && (
                      <a
                        href={cohort.google_meet_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-meet"
                        style={{
                          padding: '8px 12px',
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                        title="Open Live Hybrid Google Meet"
                      >
                        <Video size={14} />
                        <span>Meet</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: CAMPUS COURSES & CURRICULUM (OPTION B - AUTONOMY) */}
      {/* ========================================================================= */}
      {activeTab === 'courses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <BookOpen size={22} color="var(--crema-gold)" />
                <span>{myBranch.name} — Academic Courses & Tuition Fees</span>
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Curriculum, official tuition schedules, and training durations for {myBranch.name} ({myBranch.city})
              </p>
            </div>

            <button
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setShowCreateCourseModal(true)}
            >
              <Plus size={16} />
              <span>+ Add Campus Course</span>
            </button>
          </div>

          {/* Courses Grid */}
          <div className="grid-cards">
            {branchCourses.map((course) => {
              const enrolledInCourse = enrollments.filter((e) => {
                const c = cohorts.find((co) => co.id === e.cohort_id);
                return c?.course_id === course.id && c?.branch_id === myBranch.id;
              }).length;

              const activeCohortsForCourse = branchCohorts.filter((c) => c.course_id === course.id);

              return (
                <div key={course.id} className="glass-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                        {course.category}
                      </span>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                        onClick={() => setSelectedCourseForEdit(course)}
                        title="Edit course fees, duration & curriculum"
                      >
                        <Edit3 size={12} color="var(--crema-gold)" />
                        <span>Edit Course</span>
                      </button>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '6px 0 2px 0' }}>{course.title}</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 12px 0', fontFamily: 'var(--font-mono)' }}>
                      Code: {course.code} • {course.duration_weeks} Weeks Duration
                    </p>

                    <div
                      style={{
                        background: 'rgba(212, 154, 91, 0.08)',
                        border: '1px solid rgba(212, 154, 91, 0.2)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 14px',
                        marginBottom: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Standard Tuition Fee
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--crema-gold)' }}>
                          KES {Number(course.fee_amount).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Active Batches
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                          {activeCohortsForCourse.length} Cohorts
                        </div>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                      {course.description}
                    </p>

                    {course.modules && course.modules.length > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                          KEY SYLLABUS MODULES:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {course.modules.slice(0, 3).map((mod, idx) => (
                            <span key={idx} style={{ fontSize: '0.70rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                              • {mod}
                            </span>
                          ))}
                          {course.modules.length > 3 && (
                            <span style={{ fontSize: '0.70rem', color: 'var(--crema-gold)' }}>
                              +{course.modules.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      👥 {enrolledInCourse} Trainees Admitted
                    </span>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 8px', fontSize: '0.72rem', color: 'var(--crema-gold)' }}
                      onClick={() => {
                        setSelectedCourseForEdit(course);
                      }}
                    >
                      Configure Fees & Syllabus →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: CAMPUS CERTIFIED ALUMNI & GRADUATES */}
      {/* ========================================================================= */}
      {activeTab === 'alumni' && (() => {
        const filteredAlumni = branchAlumni.filter((a) => {
          if (!alumniSearch.trim()) return true;
          const q = alumniSearch.toLowerCase();
          return (
            a.full_name.toLowerCase().includes(q) ||
            (a.email && a.email.toLowerCase().includes(q)) ||
            (a.phone && a.phone.includes(q)) ||
            (a.certificate_serial_no && a.certificate_serial_no.toLowerCase().includes(q)) ||
            (a.cohort_name && a.cohort_name.toLowerCase().includes(q))
          );
        });

        const totalGrads = branchAlumni.length;
        const employedCount = branchAlumni.filter((a) => a.employment_status === 'Employed').length;
        const employmentRate = totalGrads > 0 ? Math.round((employedCount / totalGrads) * 100) : 100;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header & Export Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <Award size={22} color="var(--crema-gold)" />
                  <span>{myBranch.name} — Certified Alumni Registry</span>
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Official registry of graduates, certification credentials, and career outcomes for {myBranch.name}
                </p>
              </div>

              <ExportActionsMenu
                onExportCSV={() => handleExportAlumni('csv')}
                onExportPDF={() => handleExportAlumni('pdf')}
                label="Export Alumni Ledger"
              />
            </div>

            {/* Metrics Ribbon */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(212, 154, 91, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--crema-gold)' }}>
                  <GraduationCap size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{totalGrads}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Certified Graduates</div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10B981' }}>{employmentRate}%</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Active Placement Rate</div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                  <Building2 size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{myBranch.city}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Regional Hub Campus</div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search graduates by name, admission #, phone, or cohort..."
                  value={alumniSearch}
                  onChange={(e) => setAlumniSearch(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Showing <strong>{filteredAlumni.length}</strong> of <strong>{totalGrads}</strong> alumni
              </div>
            </div>

            {/* Alumni Table */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Alumni Name</th>
                      <th>Curriculum / Course</th>
                      <th>Intake Batch</th>
                      <th>Certificate Serial</th>
                      <th>Contact (Phone / Email)</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlumni.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          No alumni records match your search query.
                        </td>
                      </tr>
                    ) : (
                      filteredAlumni.map((a, idx) => {
                        const course = courses.find((c) => c.id === a.course_id);
                        return (
                          <tr key={a.id}>
                            <td style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.full_name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{a.job_title}</div>
                            </td>
                            <td>
                              <span className="badge badge-gold" style={{ fontSize: '0.70rem' }}>
                                {course?.title || a.certification_name}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {a.cohort_name || `${a.graduation_month} ${a.graduation_year}`}
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--crema-gold)' }}>
                              {a.certificate_serial_no}
                            </td>
                            <td style={{ fontSize: '0.76rem' }}>
                              <div>{a.phone || '--'}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.70rem' }}>{a.email || '--'}</div>
                            </td>
                            <td>
                              <span className="badge badge-approved" style={{ fontSize: '0.70rem' }}>
                                {a.employment_status || 'Employed'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                  onClick={() => setSelectedAlumniForPerformance(a)}
                                  title="Inspect Performance & Certificate"
                                >
                                  Transcript
                                </button>
                                <button
                                  className="btn btn-ghost"
                                  style={{ padding: '3px 6px', fontSize: '0.72rem', color: 'var(--crema-gold)' }}
                                  onClick={() => setSelectedAlumniForEdit(a)}
                                  title="Edit Record"
                                >
                                  <Edit3 size={13} />
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
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* TAB 5: INVOICES & M-PESA */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Campus Fee Ledger & Invoices</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Track fee balances and record cashier M-Pesa receipts
              </p>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Student Name</th>
                  <th>Total Fee</th>
                  <th>Amount Paid</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {branchInvoices.map((inv) => {
                  const student = students.find((s) => s.id === inv.student_id || s.profile_id === inv.student_id);
                  const profile = profiles.find((p) => p.id === student?.profile_id || p.id === inv.student_id);

                  return (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--crema-gold)' }}>
                        {inv.invoice_number}
                      </td>
                      <td>{profile?.full_name || 'Trainee'}</td>
                      <td>KES {(Number(inv.total_fee) || 0).toLocaleString()}</td>
                      <td style={{ color: '#6EE7B7', fontWeight: 600 }}>KES {(Number(inv.amount_paid) || 0).toLocaleString()}</td>
                      <td style={{ color: (Number(inv.balance_due) || 0) > 0 ? 'var(--cherry-red)' : 'var(--text-muted)', fontWeight: 700 }}>
                        KES {(Number(inv.balance_due) || 0).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge badge-${inv.status}`}>{inv.status}</span>
                      </td>
                      <td>
                        {(Number(inv.balance_due) || 0) > 0 ? (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            onClick={() => setSelectedInvoiceForPayment(inv)}
                          >
                            Collect Fee
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#6EE7B7' }}>Fully Cleared</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: M-PESA RECEIPTS */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Toast Notification */}
          {verificationToast && (
            <div
              className="glass-card"
              style={{
                padding: '12px 18px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10B981',
                color: '#10B981',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>{verificationToast}</span>
            </div>
          )}

          {/* CAMPUS PAYBILL & BANKING CREDENTIALS STRIP */}
          <div
            className="glass-card"
            style={{
              padding: '18px 20px',
              border: '1px solid rgba(212, 154, 91, 0.3)',
              background: 'linear-gradient(135deg, rgba(212, 154, 91, 0.12) 0%, rgba(24, 19, 16, 0.6) 100%)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'var(--crema-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                  }}
                >
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                    Campus M-Pesa Paybill & Banking Configuration
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Credentials displayed dynamically across all trainee dashboards enrolled in {myBranch.name}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(212, 154, 91, 0.12)',
                  border: '1px solid rgba(212, 154, 91, 0.3)',
                  color: 'var(--crema-gold)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
                title="Institutional Paybill and bank account credentials are centralized and managed exclusively by Head Office (Super Admin)."
              >
                <Lock size={14} color="var(--crema-gold)" />
                <span>Centralized Paybill • Managed by Super Admin</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Safaricom Paybill</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#4ADE80', marginTop: '2px' }}>
                  {myBranch.paybill_number || '174379'}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>Business Number</div>
              </div>

              <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Paybill Account Number</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--crema-gold)', marginTop: '2px' }}>
                  {myBranch.paybill_account_name || (myBranch.code ? `AUREVIA-${myBranch.code}` : 'AUREVIA-HQ')}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>Students see this exact account number</div>
              </div>
            </div>

            {/* Trainee View Preview */}
            <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(0, 166, 81, 0.06)', borderRadius: '6px', border: '1px solid rgba(0, 166, 81, 0.15)', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              <span style={{ fontWeight: 700, color: '#4ADE80' }}>Live Trainee Instruction: </span>
              {myBranch.payment_instructions || `Pay via Paybill ${myBranch.paybill_number || '174379'} and Account Number ${myBranch.paybill_account_name || (myBranch.code ? `AUREVIA-${myBranch.code}` : 'AUREVIA-HQ')}, then paste your M-Pesa message in your trainee portal.`}
            </div>
          </div>

          {/* PENDING M-PESA SMS VERIFICATIONS QUEUE */}
          {branchPayments.filter((p) => p.status === 'pending_verification').length > 0 && (
            <div
              className="glass-card"
              style={{
                padding: '20px',
                border: '1.5px solid rgba(245, 158, 11, 0.4)',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(24, 19, 16, 0.6) 100%)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCheck size={20} color="#FBBF24" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#FBBF24' }}>
                    Pending Student M-Pesa Verifications ({branchPayments.filter((p) => p.status === 'pending_verification').length})
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#FBBF24',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontWeight: 700,
                  }}
                >
                  Action Required
                </span>
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                Students have submitted Safaricom M-Pesa confirmation SMS messages. Review the raw SMS, confirm the funds on your campus statement, verify/adjust the amount (supporting partial payment), and click Verify & Approve to update the student balance and dispatch official SMS/Email receipts.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {branchPayments
                  .filter((p) => p.status === 'pending_verification')
                  .map((p) => {
                    const student = students.find((s) => s.id === p.student_id);
                    const profile = profiles.find((pr) => pr.id === student?.profile_id);
                    const invoice = invoices.find((inv) => inv.id === p.invoice_id);
                    const currentVerifiedAmt = verifiedAmountInput[p.id] ?? p.amount;

                    return (
                      <div
                        key={p.id}
                        style={{
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          borderRadius: '10px',
                          padding: '14px 16px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{profile?.full_name || 'Trainee'}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--crema-gold)', marginLeft: '8px', fontWeight: 600 }}>
                              {profile?.reg_number}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Invoice: <strong>{invoice?.invoice_number}</strong> • Balance Due: <strong style={{ color: 'var(--cherry-red)' }}>KES {(invoice?.balance_due || 0).toLocaleString()}</strong> of Total KES {(invoice?.total_fee || 0).toLocaleString()}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Claimed Amount</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4ADE80' }}>
                              KES {(Number(p.amount) || 0).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              Ref: {p.mpesa_receipt_number || 'VERIF-PENDING'}
                            </div>
                          </div>
                        </div>

                        {/* Raw Safaricom SMS Bubble */}
                        <div
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.76rem',
                            color: 'var(--text-primary)',
                            wordBreak: 'break-word',
                            marginBottom: '12px',
                          }}
                        >
                          <span style={{ color: 'var(--crema-gold)', fontWeight: 700 }}>Pasted Safaricom SMS: </span>
                          {p.raw_mpesa_text || 'No raw SMS text attached.'}
                        </div>

                        {/* Verification & Approval Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                Verified Amount (KES):
                              </label>
                              <input
                                type="number"
                                className="form-input"
                                value={currentVerifiedAmt}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setVerifiedAmountInput((prev) => ({ ...prev, [p.id]: val }));
                                }}
                                style={{ width: '110px', padding: '4px 8px', fontSize: '0.8rem', fontWeight: 700 }}
                              />
                            </div>

                            <input
                              type="text"
                              className="form-input"
                              placeholder="Optional remarks / bank ref..."
                              value={verificationRemarksInput[p.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setVerificationRemarksInput((prev) => ({ ...prev, [p.id]: val }));
                              }}
                              style={{ width: '180px', padding: '4px 8px', fontSize: '0.75rem' }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              className="btn btn-mpesa"
                              disabled={isVerifyingId === p.id}
                              onClick={async () => {
                                setIsVerifyingId(p.id);
                                try {
                                  await verifyAndApprovePayment({
                                    paymentId: p.id,
                                    verifiedAmount: currentVerifiedAmt,
                                    remarks: verificationRemarksInput[p.id] || 'Verified by Campus Manager',
                                  });
                                  setVerificationToast(`Payment of KES ${currentVerifiedAmt.toLocaleString()} for ${profile?.full_name} approved! SMS & email receipt dispatched.`);
                                  setTimeout(() => setVerificationToast(null), 5000);
                                } catch (err: any) {
                                  alert(err.message || 'Failed to approve payment.');
                                } finally {
                                  setIsVerifyingId(null);
                                }
                              }}
                              style={{
                                padding: '6px 14px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <CheckCircle2 size={14} />
                              <span>{isVerifyingId === p.id ? 'Approving...' : '✓ Verify & Approve'}</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={async () => {
                                const reason = window.prompt('Enter rejection reason to notify student:', 'Payment reference not found on campus bank statement');
                                if (reason) {
                                  await rejectMpesaPayment({ paymentId: p.id, reason });
                                  setVerificationToast(`Payment submission rejected.`);
                                  setTimeout(() => setVerificationToast(null), 4000);
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                color: '#EF4444',
                              }}
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* AUDITED COMPLETED RECEIPTS TABLE */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Campus Payment Receipts & Ledger</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Audited payment transactions for {myBranch.name}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-gold"
                onClick={() => setShowPaymentModal(true)}
                style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Record Fee Payment</span>
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>M-Pesa Receipt</th>
                    <th>Student Name & Reg</th>
                    <th>Amount Credited</th>
                    <th>Payment Method</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branchPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No payment receipts logged for this branch yet.
                      </td>
                    </tr>
                  ) : (
                    branchPayments.map((p) => {
                      const student = students.find((s) => s.id === p.student_id);
                      const profile = profiles.find((pr) => pr.id === student?.profile_id);

                      return (
                        <tr key={p.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--crema-gold)', fontWeight: 700 }}>
                            {p.mpesa_receipt_number || 'STK-' + p.id.slice(0, 6)}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{profile?.full_name || 'Trainee'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{profile?.reg_number}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: '#10B981' }}>
                            KES {(Number(p.amount) || 0).toLocaleString()}
                          </td>
                          <td style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                            {p.payment_method}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            <span
                              className={p.status === 'completed' ? 'badge badge-paid' : p.status === 'pending_verification' ? 'badge badge-pending' : 'badge badge-overdue'}
                              style={{ textTransform: 'capitalize' }}
                            >
                              {p.status === 'pending_verification' ? 'Verification Pending' : p.status}
                            </span>
                          </td>
                          <td>
                            {p.status === 'completed' && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={async () => {
                                  if (
                                    window.confirm(
                                      `Void/Revert receipt ${p.mpesa_receipt_number || p.id} for KES ${(Number(p.amount) || 0).toLocaleString()} and restore student fee balance?`
                                    )
                                  ) {
                                    await revertPayment(p.id);
                                  }
                                }}
                                title="Void or revert payment record"
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '0.72rem',
                                  color: 'var(--text-muted)',
                                  border: '1px solid var(--border-subtle)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <RotateCcw size={11} />
                                <span>Void</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: ROLL-CALL LOGS & ATTENDANCE INTELLIGENCE */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <StudentRollCallAnalytics defaultCampusId={myBranch.id} isBranchManagerMode={true} />
      )}

      {/* ========================================================================= */}
      {/* TAB: OMNICHANNEL COMMUNICATIONS HUB */}
      {/* ========================================================================= */}
      {(activeTab === 'communications' || activeTab === 'sms') && (
        <InstitutionalCommunications isBranchManagerMode={true} />
      )}

      {/* Modals */}
      {showKYCModal && <StudentKYCModal onClose={() => setShowKYCModal(false)} />}

      {/* Branch Roster Modal */}
      {showBranchRoster && (
        <BranchRosterModal
          branch={myBranch}
          initialTab={rosterInitialTab}
          onClose={() => setShowBranchRoster(false)}
          onSelectStudent={(st) => setInspectedStudent(st)}
          onNavigateToTab={(tab) => {
            if (tab === 'students') setActiveTab('admissions');
            if (tab === 'staff') setActiveTab('staff_directory');
          }}
        />
      )}

      {/* Student Detail KYC Dossier Modal */}
      {inspectedStudent && (
        <StudentDetailModal
          student={inspectedStudent}
          onClose={() => setInspectedStudent(null)}
        />
      )}
      {showCreateCohortModal && <CreateCohortModal onClose={() => setShowCreateCohortModal(false)} />}
      {editingCohort && (
        <EditCohortModal
          cohort={editingCohort}
          onClose={() => setEditingCohort(null)}
        />
      )}
      {(showPaymentModal || selectedInvoiceForPayment) && (
        <MpesaPaymentModal
          invoice={selectedInvoiceForPayment}
          presetBranchId={myBranch.id}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoiceForPayment(null);
          }}
        />
      )}

      {/* Sign Attendance Modal */}
      {signingStaff && (
        <SignStaffAttendanceModal
          staff={signingStaff}
          branchId={myBranch.id}
          selectedDate={selectedLogDate}
          existingClockIn={staffClockins.find(
            (c) => c.profile_id === signingStaff.id && (c.work_date || '').slice(0, 10) === selectedLogDate.slice(0, 10)
          )}
          onClose={() => setSigningStaff(null)}
        />
      )}
      {showAddStaffModal && (
        <AddStaffModal
          presetBranchId={myBranch.id}
          isBranchManagerMode={true}
          onClose={() => setShowAddStaffModal(false)}
        />
      )}
      {showScheduleLessonModal && (
        <ScheduleLessonModal
          branchId={myBranch.id}
          initialDay={presetDayForSchedule}
          onClose={() => {
            setShowScheduleLessonModal(false);
            setPresetDayForSchedule(undefined);
          }}
        />
      )}
      {showManageLabsModal && (
        <ManageLabsModal
          onClose={() => setShowManageLabsModal(false)}
        />
      )}
      {showRecordLeaveModal && (
        <RecordStaffLeaveModal
          presetStaffId={selectedStaffForLeave?.id}
          presetBranchId={myBranch.id}
          isBranchManagerMode={true}
          onClose={() => {
            setShowRecordLeaveModal(false);
            setSelectedStaffForLeave(null);
          }}
        />
      )}
      {showChangePasswordModal && (
        <ChangeMyPasswordModal onClose={() => setShowChangePasswordModal(false)} />
      )}
      {showCreateCourseModal && (
        <CreateCourseModal onClose={() => setShowCreateCourseModal(false)} />
      )}
      {selectedCourseForEdit && (
        <EditCourseModal
          course={selectedCourseForEdit}
          onClose={() => setSelectedCourseForEdit(null)}
        />
      )}
      {selectedAlumniForPerformance && (
        <AlumniPerformanceModal
          alumni={selectedAlumniForPerformance}
          assessments={assessments}
          courses={courses}
          branches={branches}
          onClose={() => setSelectedAlumniForPerformance(null)}
        />
      )}
      {selectedAlumniForEdit && (
        <EditAlumniModal
          alumni={selectedAlumniForEdit}
          onClose={() => setSelectedAlumniForEdit(null)}
          onUpdate={updateAlumni}
          onDelete={deleteAlumni}
        />
      )}
    </div>
  );
};
