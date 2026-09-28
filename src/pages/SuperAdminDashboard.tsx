import React, { useState } from 'react';
import { useApp } from '../lib/store';
import {
  Building2, Users, DollarSign, BookOpen, Plus, Search, Coffee,
  Award, TrendingUp, CheckCircle2, Clock, Phone, Mail, Shield, MessageSquare,
  Calendar, Video, FileText, UserCheck, ShieldCheck, Filter, ExternalLink, ChevronRight,
  Trash2, Key, Edit3, CalendarCheck, Check, X, GraduationCap
} from 'lucide-react';
import { StudentKYCModal } from '../components/modals/StudentKYCModal';
import { MpesaPaymentModal } from '../components/modals/MpesaPaymentModal';
import { StudentDetailModal } from '../components/modals/StudentDetailModal';
import { CreateCohortModal } from '../components/modals/CreateCohortModal';
import { EditCohortModal } from '../components/modals/EditCohortModal';
import { AddStaffModal } from '../components/modals/AddStaffModal';
import { RecordStaffLeaveModal } from '../components/modals/RecordStaffLeaveModal';
import { BranchRosterModal } from '../components/modals/BranchRosterModal';
import { InstitutionalAnalytics } from '../components/analytics/InstitutionalAnalytics';
import { StaffAttendanceAnalytics } from '../components/analytics/StaffAttendanceAnalytics';
import { StudentRollCallAnalytics } from '../components/analytics/StudentRollCallAnalytics';
import { CreateCourseModal } from '../components/modals/CreateCourseModal';
import { InstitutionalCommunications } from '../components/analytics/InstitutionalCommunications';
import { ExportActionsMenu } from '../components/common/ExportActionsMenu';
import { exportToCSV, exportToPDFReport } from '../lib/exportUtils';
import { DeleteBranchModal } from '../components/modals/DeleteBranchModal';
import { EditBranchModal } from '../components/modals/EditBranchModal';
import { EditCourseModal } from '../components/modals/EditCourseModal';
import { DeleteCourseModal } from '../components/modals/DeleteCourseModal';
import { Invoice, StudentKYC, Profile, Cohort, LeaveRequest, Branch, Course } from '../types/database.types';

type DashboardTab =
  | 'overview'
  | 'analytics'
  | 'branches'
  | 'courses'
  | 'cohorts'
  | 'students'
  | 'trainees'
  | 'alumni'
  | 'grades'
  | 'invoices'
  | 'payments'
  | 'finance'
  | 'staff'
  | 'staff_attendance'
  | 'staff_leaves'
  | 'attendance'
  | 'communications'
  | 'sms';

interface SuperAdminDashboardProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
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
    assessments,
    attendance,
    staffClockins,
    leaveRequests,
    smsLogs,
    alumni,
    selectedBranchId,
    setSelectedBranchId,
    createBranch,
    deleteStaffMember,
    reviewLeaveRequest,
  } = useApp();

  const [localActiveTab, setLocalActiveTab] = useState<DashboardTab>('overview');
  const activeTab = (propActiveTab as DashboardTab) || localActiveTab;
  const setActiveTab = (propSetActiveTab as any) || setLocalActiveTab;
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [showCreateCohortModal, setShowCreateCohortModal] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [showRecordLeaveModal, setShowRecordLeaveModal] = useState(false);
  const [selectedStaffForLeave, setSelectedStaffForLeave] = useState<Profile | null>(null);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('ALL');
  const [selectedStaffForPassword, setSelectedStaffForPassword] = useState<Profile | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Profile | null>(null);
  const [alumniSearch, setAlumniSearch] = useState('');
  const [alumniBranchFilter, setAlumniBranchFilter] = useState('ALL');
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [inspectedStudent, setInspectedStudent] = useState<StudentKYC | null>(null);
  const [selectedBranchForRoster, setSelectedBranchForRoster] = useState<Branch | null>(null);
  const [rosterInitialTab, setRosterInitialTab] = useState<'students' | 'staff'>('students');
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [branchToEdit, setBranchToEdit] = useState<Branch | null>(null);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  // Search and filter states for Trainees Directory
  const [studentSearch, setStudentSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [kycFilter, setKycFilter] = useState('ALL');
  const [cohortStatusFilter, setCohortStatusFilter] = useState<'ALL' | 'in_progress' | 'upcoming' | 'completed'>('ALL');

  // New branch form state
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');

  // Filter based on branch selector if not ALL
  const filteredBranches = selectedBranchId === 'ALL'
    ? branches
    : branches.filter((b) => b.id === selectedBranchId);

  const filteredCohorts = selectedBranchId === 'ALL'
    ? cohorts
    : cohorts.filter((c) => c.branch_id === selectedBranchId);

  const filteredInvoices = selectedBranchId === 'ALL'
    ? invoices
    : invoices.filter((i) => i.branch_id === selectedBranchId);

  const filteredPayments = selectedBranchId === 'ALL'
    ? payments
    : payments.filter((p) => p.branch_id === selectedBranchId);

  const filteredStudents = selectedBranchId === 'ALL'
    ? students
    : students.filter((s) => s.branch_id === selectedBranchId);

  // Aggregated KPIs
  const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalDue = filteredInvoices.reduce((sum, i) => sum + i.balance_due, 0);
  const activeCohortsCount = filteredCohorts.filter((c) => c.status === 'in_progress').length;

  // Filtered trainees list for Trainees & KYC Directory
  const directoryStudents = filteredStudents.filter((st) => {
    if (!st) return false;
    const prof = profiles.find((p) => p.id === st.profile_id) || st.profile;
    const enrollment = enrollments.find((e) => e.student_id === st.id);
    const cohort = cohorts.find((c) => c.id === enrollment?.cohort_id);

    // Search query matching Name, Reg Number, or National ID
    const matchesSearch =
      !studentSearch ||
      (prof?.full_name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
      (prof?.reg_number || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
      (st.national_id_or_passport || '').includes(studentSearch);

    // Course filter
    const matchesCourse = courseFilter === 'ALL' || cohort?.course_id === courseFilter;

    // KYC filter
    const matchesKyc =
      kycFilter === 'ALL' ||
      (kycFilter === 'verified' && st.kyc_verified) ||
      (kycFilter === 'pending' && !st.kyc_verified);

    return matchesSearch && matchesCourse && matchesKyc;
  });

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchCode || !newBranchName) return;
    await createBranch({
      code: newBranchCode,
      name: newBranchName,
      address: newBranchAddress || 'Campus Center',
      city: newBranchCity || 'Nairobi',
      country: 'Kenya',
      phone: '+254 700 000 000',
      email: 'campus@aureviacoffee.com',
    });
    setShowAddBranch(false);
    setNewBranchCode('');
    setNewBranchName('');
  };

  // ==========================================
  // EXPORT HANDLERS (CSV Spreadsheets & PDF Reports)
  // ==========================================
  const handleExportStudents = (format: 'csv' | 'pdf') => {
    const headers = ['#', 'Full Name', 'Reg Number', 'Course', 'Intake Cohort', 'Total Fee (KES)', 'Amount Paid (KES)', 'Balance Due (KES)', 'Fee Status', 'KYC Status', 'Phone', 'Email'];
    const rows = directoryStudents.map((s, idx) => {
      const p = profiles.find((prof) => prof.id === s.profile_id) || s.profile;
      const enr = enrollments.find((e) => e.student_id === s.id);
      const coh = cohorts.find((c) => c.id === enr?.cohort_id);
      const crs = courses.find((c) => c.id === coh?.course_id);
      const inv = invoices.find((i) => i.student_id === s.id);
      return [
        idx + 1,
        p?.full_name || 'Trainee',
        p?.reg_number || 'N/A',
        crs?.title || 'General Course',
        coh?.name || 'General Intake',
        (inv?.total_fee || 0).toLocaleString(),
        (inv?.amount_paid || 0).toLocaleString(),
        (inv?.balance_due || 0).toLocaleString(),
        inv?.status?.toUpperCase() || (inv ? 'UNPAID' : 'NO INVOICE'),
        s.kyc_verified ? 'VERIFIED' : 'PENDING',
        p?.phone || 'N/A',
        p?.email || 'N/A',
      ];
    });

    if (format === 'csv') {
      exportToCSV('Tripple_T_Trainee_Roster', headers, rows);
    } else {
      exportToPDFReport('Tripple_T_Trainee_Roster', 'Trainees & KYC Directory', 'Official Registry', headers, rows);
    }
  };

  const handleExportGrades = (format: 'csv' | 'pdf') => {
    const headers = ['#', 'Trainee Name', 'Reg Number', 'Assessment / CAT', 'Practical Score (%)', 'Sensory Score (%)', 'Theory Score (%)', 'Final Grade %', 'Award Grade', 'Instructor Remarks'];
    const rows = assessments.map((a, idx) => {
      const s = students.find((std) => std.id === a.student_id);
      const p = profiles.find((prof) => prof.id === s?.profile_id);
      return [
        idx + 1,
        p?.full_name || 'Trainee',
        p?.reg_number || 'N/A',
        a.module_name || 'Modular CAT',
        a.practical_score ?? '-',
        a.sensory_score ?? '-',
        a.theory_score ?? '-',
        a.final_score ?? '-',
        a.grade || 'A',
        a.instructor_remarks || 'Certified competent in extraction yield & sensory calibration.',
      ];
    });

    if (format === 'csv') {
      exportToCSV('Tripple_T_Grades_Ledger', headers, rows);
    } else {
      exportToPDFReport('Tripple_T_Grades_Ledger', 'Exam & Marks Ledger', 'Continuous Assessment Scores', headers, rows);
    }
  };

  const handleExportInvoices = (format: 'csv' | 'pdf') => {
    const headers = ['Invoice No', 'Trainee Name', 'Reg No', 'Total Fee (KES)', 'Amount Paid (KES)', 'Balance Due (KES)', 'Status', 'Due Date'];
    const rows = filteredInvoices.map((inv) => {
      const s = students.find((std) => std.id === inv.student_id);
      const p = profiles.find((prof) => prof.id === s?.profile_id);
      return [
        inv.invoice_number,
        p?.full_name || 'Trainee',
        p?.reg_number || 'N/A',
        inv.total_fee,
        inv.amount_paid,
        inv.balance_due,
        inv.status.toUpperCase(),
        inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB') : '-',
      ];
    });

    if (format === 'csv') {
      exportToCSV('Tripple_T_Tuition_Invoices', headers, rows);
    } else {
      exportToPDFReport('Tripple_T_Tuition_Invoices', 'Tuition & Fee Invoices', 'Institutional Financial Ledger', headers, rows);
    }
  };

  const handleExportPayments = (format: 'csv' | 'pdf') => {
    const headers = ['Receipt / Ref', 'Trainee Name', 'Phone Number', 'Amount (KES)', 'Payment Method', 'Date Received', 'Status'];
    const rows = filteredPayments.map((pay) => {
      const s = students.find((std) => std.id === pay.student_id);
      const p = profiles.find((prof) => prof.id === s?.profile_id);
      return [
        pay.mpesa_receipt_number || 'REC-' + pay.id.slice(0, 8),
        p?.full_name || 'Trainee',
        pay.mpesa_phone_number || p?.phone || '-',
        pay.amount,
        pay.payment_method.toUpperCase(),
        new Date(pay.created_at).toLocaleDateString('en-GB'),
        pay.status.toUpperCase(),
      ];
    });

    if (format === 'csv') {
      exportToCSV('Tripple_T_Mpesa_Payments', headers, rows);
    } else {
      exportToPDFReport('Tripple_T_Mpesa_Payments', 'M-Pesa Collections & Receipts', 'Verified Transaction Ledger', headers, rows);
    }
  };

  const handleExportAttendance = (format: 'csv' | 'pdf') => {
    const headers = ['Date', 'Trainee Name', 'Reg Number', 'Cohort Batch', 'Session Title', 'Attendance Status'];
    const rows = attendance.map((att) => {
      const s = students.find((std) => std.id === att.student_id);
      const p = profiles.find((prof) => prof.id === s?.profile_id);
      const coh = cohorts.find((c) => c.id === att.cohort_id);
      return [
        att.session_date,
        p?.full_name || 'Trainee',
        p?.reg_number || 'N/A',
        coh?.name || 'General Intake',
        att.session_title || 'Class Session',
        att.status.toUpperCase(),
      ];
    });

    if (format === 'csv') {
      exportToCSV('Tripple_T_Attendance_RollCall', headers, rows);
    } else {
      exportToPDFReport('Tripple_T_Attendance_RollCall', 'Lab & Class Attendance', 'Daily Session Roll-Call', headers, rows);
    }
  };

  const handleExportStaff = (format: 'csv' | 'pdf') => {
    const headers = ['Staff Name', 'Role', 'Assigned Campus', 'Phone', 'Email', 'Status'];
    const rows = profiles.filter((p) => p.role !== 'student').map((staff) => {
      const sBranch = branches.find((b) => b.id === staff.branch_id) || branches[0];
      return [
        staff.full_name,
        staff.role.replace('_', ' ').toUpperCase(),
        sBranch?.name || 'Aurevia Coffee Institute',
        staff.phone || 'N/A',
        staff.email,
        staff.is_active ? 'ACTIVE' : 'INACTIVE',
      ];
    });

    if (format === 'csv') {
      exportToCSV('Tripple_T_Faculty_Staff', headers, rows);
    } else {
      exportToPDFReport('Tripple_T_Faculty_Staff', 'Faculty & Staff Directory', 'Institutional Personnel', headers, rows);
    }
  };

  const handleExportAlumni = (format: 'csv' | 'pdf') => {
    const headers = ['#', 'Graduate Name', 'SCA Certification', 'Cohort Batch', 'Graduation Year', 'Employer & Role', 'Employment Status', 'Certificate Serial', 'Campus'];
    const rows = alumni.map((alm, idx) => {
      const b = branches.find((br) => br.id === alm.branch_id);
      return [
        idx + 1,
        alm.full_name,
        alm.certification_name,
        alm.cohort_name,
        `${alm.graduation_month} ${alm.graduation_year}`,
        `${alm.job_title} @ ${alm.current_employer}`,
        alm.employment_status,
        alm.certificate_serial_no,
        b?.name || 'Aurevia Coffee Institute',
      ];
    });

    if (format === 'csv') {
      exportToCSV('Tripple_T_Certified_Alumni', headers, rows);
    } else {
      exportToPDFReport('Tripple_T_Certified_Alumni', 'Certified Alumni & Career Placements', 'Official Graduate Registry', headers, rows);
    }
  };

  const handleExportCourses = (format: 'csv' | 'pdf') => {
    const headers = ['Course Code', 'Course Title', 'Category', 'Duration', 'Tuition Fee (KES)', 'Award Title'];
    const rows = courses.map((crs) => [
      crs.code,
      crs.title,
      crs.category || 'Barista Skills',
      crs.duration_weeks ? `${crs.duration_weeks} Weeks` : '2 Weeks',
      crs.fee_amount,
      crs.certification_title,
    ]);

    if (format === 'csv') {
      exportToCSV('Tripple_T_Academic_Curriculum', headers, rows);
    } else {
      exportToPDFReport('Tripple_T_Academic_Curriculum', 'Academic Courses & Curriculum', 'Institutional Syllabus', headers, rows);
    }
  };

  const handleExportCohorts = (format: 'csv' | 'pdf') => {
    const headers = ['Cohort Batch', 'Course Program', 'Start Date', 'End Date', 'Schedule Timing', 'Capacity', 'Status'];
    const rows = filteredCohorts.map((coh) => {
      const crs = courses.find((c) => c.id === coh.course_id);
      return [
        coh.name,
        crs?.title || 'Barista Skills',
        coh.start_date,
        coh.end_date,
        coh.schedule_timing,
        `${coh.enrolled_count || 0}/${coh.max_capacity || 16}`,
        coh.status.toUpperCase(),
      ];
    });

    if (format === 'csv') {
      exportToCSV('Tripple_T_Intake_Cohorts', headers, rows);
    } else {
      exportToPDFReport('Tripple_T_Intake_Cohorts', 'Intake Cohorts & Batches', 'Class Schedules', headers, rows);
    }
  };

  const handleExportBranches = (format: 'csv' | 'pdf') => {
    const headers = ['Campus Code', 'Campus Name', 'City', 'Country', 'Enrolled Trainees', 'Cohorts', 'Fee Collections (KES)', 'Fee Balances (KES)', 'Phone', 'Status'];
    const rows = branches.map((b) => {
      const bStudents = students.filter((s) => s.branch_id === b.id);
      const bCohorts = cohorts.filter((c) => c.branch_id === b.id);
      const bRev = payments
        .filter((p) => p.branch_id === b.id || students.find((s) => s.id === p.student_id)?.branch_id === b.id)
        .reduce((s, p) => s + p.amount, 0);
      const bBalance = invoices
        .filter((i) => i.branch_id === b.id || students.find((s) => s.id === i.student_id)?.branch_id === b.id)
        .reduce((s, inv) => s + (inv.balance_due || 0), 0);

      return [
        b.code,
        b.name,
        b.city,
        b.country,
        bStudents.length,
        bCohorts.length,
        bRev.toLocaleString(),
        bBalance.toLocaleString(),
        b.phone || 'N/A',
        b.is_active ? 'ACTIVE' : 'INACTIVE',
      ];
    });

    if (format === 'csv') {
      exportToCSV('Tripple_T_Campuses_Directory', headers, rows);
    } else {
      exportToPDFReport('Tripple_T_Campuses_Directory', 'Multi-Campus Hubs Directory & Financial Summary', 'Global Network Operations', headers, rows);
    }
  };

  return (
    <div style={{ width: '100%', margin: 0, padding: 0 }}>
      {/* Top Banner - Compact & Space-Efficient */}
      {activeTab === 'overview' ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
              Super Admin Dashboard
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Multi-Campus Overview
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              className="form-select"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <option value="ALL">All Campuses ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>

            <ExportActionsMenu
              onExportCSV={() => handleExportStudents('csv')}
              onExportPDF={() => handleExportStudents('pdf')}
              label="Export Data"
            />

            <button
              className="btn btn-secondary"
              onClick={() => setShowAddBranch(true)}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <Building2 size={14} />
              <span>+ Add Campus</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={() => setShowKYCModal(true)}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <Users size={14} />
              <span>+ Onboard Student</span>
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
            marginBottom: '6px',
            paddingBottom: '4px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--crema-gold)' }} />
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>
              {activeTab.replace('_', ' ')}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Dynamic Export Button per Tab */}
            {activeTab === 'courses' && (
              <>
                <ExportActionsMenu onExportCSV={() => handleExportCourses('csv')} onExportPDF={() => handleExportCourses('pdf')} />
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => setShowCreateCourseModal(true)}>
                  <BookOpen size={12} />
                  <span>+ Add Academic Course</span>
                </button>
              </>
            )}
            {activeTab === 'cohorts' && (
              <>
                <ExportActionsMenu onExportCSV={() => handleExportCohorts('csv')} onExportPDF={() => handleExportCohorts('pdf')} />
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => setShowCreateCohortModal(true)}>
                  <Plus size={12} />
                  <span>+ Create Intake Cohort</span>
                </button>
              </>
            )}
            {activeTab === 'branches' && (
              <>
                <ExportActionsMenu onExportCSV={() => handleExportBranches('csv')} onExportPDF={() => handleExportBranches('pdf')} />
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => setShowAddBranch(true)}>
                  <Building2 size={12} />
                  <span>+ Add Campus Hub</span>
                </button>
              </>
            )}
            {(activeTab === 'students' || activeTab === 'trainees') && (
              <>
                <ExportActionsMenu onExportCSV={() => handleExportStudents('csv')} onExportPDF={() => handleExportStudents('pdf')} label="Export Roster" />
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => setShowKYCModal(true)}>
                  <Users size={12} />
                  <span>+ Onboard Student (KYC)</span>
                </button>
              </>
            )}
            {activeTab === 'staff' && (
              <>
                <ExportActionsMenu onExportCSV={() => handleExportStaff('csv')} onExportPDF={() => handleExportStaff('pdf')} />
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => setShowAddStaffModal(true)}>
                  <Users size={12} />
                  <span>+ Add Faculty / Staff</span>
                </button>
              </>
            )}
            {activeTab === 'invoices' && (
              <>
                <ExportActionsMenu onExportCSV={() => handleExportInvoices('csv')} onExportPDF={() => handleExportInvoices('pdf')} />
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => setShowKYCModal(true)}>
                  <Plus size={12} />
                  <span>+ Issue Tuition Invoice</span>
                </button>
              </>
            )}
            {activeTab === 'payments' && (
              <>
                <ExportActionsMenu onExportCSV={() => handleExportPayments('csv')} onExportPDF={() => handleExportPayments('pdf')} />
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => setSelectedInvoiceForPayment(invoices[0] || null)}>
                  <DollarSign size={12} />
                  <span>+ Record M-Pesa Receipt</span>
                </button>
              </>
            )}
            {activeTab === 'alumni' && (
              <>
                <ExportActionsMenu onExportCSV={() => handleExportAlumni('csv')} onExportPDF={() => handleExportAlumni('pdf')} label="Export Alumni" />
                <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => setActiveTab('students')}>
                  <Award size={12} />
                  <span>Graduate Trainee to Alumni</span>
                </button>
              </>
            )}
            {activeTab === 'grades' && (
              <>
                <ExportActionsMenu onExportCSV={() => handleExportGrades('csv')} onExportPDF={() => handleExportGrades('pdf')} />
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => setActiveTab('cohorts')}>
                  <Award size={12} />
                  <span>+ Grade Cohort CATs</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & KPIS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div>
          {/* Top KPI Cards */}
          <div className="grid-stats">
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Global Academy Branches</span>
                <Building2 size={18} color="var(--crema-gold-light)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{branches.length} Campuses</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {branches.map(b => b.city).filter(Boolean).slice(0, 4).join(' • ') || 'Active Campuses'}
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Total Revenue Collected</span>
                <DollarSign size={18} color="#10B981" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#10B981' }}>
                KES {totalRevenue.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Direct M-Pesa & Cashier verified
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Outstanding Fee Balance</span>
                <Clock size={18} color="var(--cherry-red)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--cherry-red)' }}>
                KES {totalDue.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {invoices.filter(i => (i.balance_due || 0) > 0).length} pending clearance invoices
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Enrolled Trainees</span>
                <Users size={18} color="var(--crema-gold-light)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>
                {filteredStudents.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {filteredStudents.length > 0
                  ? `${Math.round((filteredStudents.filter(s => s.kyc_verified).length / filteredStudents.length) * 100)}% KYC verified & Reg No assigned`
                  : 'Awaiting Student Admissions'}
              </div>
            </div>
          </div>

          {/* Embedded Institutional Analytics & Digital Graphs */}
          <div style={{ marginTop: '16px' }}>
            <InstitutionalAnalytics onNavigateToTab={setActiveTab} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: DEDICATED INSTITUTIONAL ANALYTICS & REPORTS */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div>
          <InstitutionalAnalytics onNavigateToTab={setActiveTab} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: MULTI-CAMPUS HUB */}
      {/* ========================================================================= */}
      {activeTab === 'branches' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Multi-Campus Regional Hubs</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Physical training facilities, cupping laboratories, and campus administrative oversight
            </p>
          </div>

          <div className="grid-cards">
            {branches.map((branch) => {
              const bCohorts = cohorts.filter((c) => c.branch_id === branch.id);
              const bStudents = students.filter((s) => s.branch_id === branch.id);
              const bStaff = profiles.filter(
                (p) => (p.branch_id === branch.id || (p.branch_id === null && p.role === 'super_admin')) && p.role !== 'student'
              );
              const bRev = payments
                .filter((p) => p.branch_id === branch.id || students.find((s) => s.id === p.student_id)?.branch_id === branch.id)
                .reduce((s, p) => s + p.amount, 0);
              const bInvoices = invoices.filter((i) => {
                if (i.branch_id === branch.id) return true;
                const st = students.find((s) => s.id === i.student_id);
                return st?.branch_id === branch.id;
              });
              const bBalanceDue = bInvoices.reduce((s, inv) => s + (inv.balance_due || 0), 0);
              const manager = profiles.find((p) => p.branch_id === branch.id && p.role === 'branch_manager');

              return (
                <div key={branch.id} className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <span className="badge badge-gold" style={{ marginBottom: '6px' }}>
                        CAMPUS CODE: {branch.code}
                      </span>
                      <h3 style={{ fontSize: '1.15rem', marginTop: '4px' }}>{branch.name}</h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{branch.address}, {branch.city}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="btn btn-ghost"
                        title={`Edit ${branch.name}`}
                        style={{
                          width: '36px',
                          height: '36px',
                          padding: 0,
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(212, 154, 91, 0.12)',
                          border: '1px solid rgba(212, 154, 91, 0.3)',
                          color: 'var(--crema-gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setBranchToEdit(branch);
                        }}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        className="btn btn-ghost"
                        title={`Decommission / Delete ${branch.name}`}
                        style={{
                          width: '36px',
                          height: '36px',
                          padding: 0,
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#EF4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setBranchToDelete(branch);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(212, 154, 91, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Building2 size={20} color="var(--crema-gold)" />
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px',
                      margin: '14px 0',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px 10px',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div
                      onClick={() => {
                        setSelectedBranchForRoster(branch);
                        setRosterInitialTab('students');
                      }}
                      style={{ cursor: 'pointer' }}
                      title="Click to view enrolled trainees"
                    >
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Trainees</div>
                      <div style={{ fontWeight: 700, color: 'var(--crema-gold)' }}>{bStudents.length} Students ↗</div>
                    </div>
                    <div
                      onClick={() => {
                        setSelectedBranchId(branch.id);
                        setActiveTab('cohorts');
                      }}
                      style={{ cursor: 'pointer' }}
                      title="Click to view cohorts at this campus"
                    >
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Intakes</div>
                      <div style={{ fontWeight: 700 }}>{bCohorts.length} Cohorts ↗</div>
                    </div>
                    <div
                      onClick={() => {
                        setSelectedBranchId(branch.id);
                        setActiveTab('invoices');
                      }}
                      style={{ cursor: 'pointer' }}
                      title="Click to view fee collections for this campus"
                    >
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Fee Collections</div>
                      <div style={{ fontWeight: 700, color: '#10B981' }}>KES {bRev.toLocaleString()} ↗</div>
                    </div>
                    <div
                      onClick={() => {
                        setSelectedBranchId(branch.id);
                        setActiveTab('invoices');
                      }}
                      style={{ cursor: 'pointer' }}
                      title="Click to view outstanding fee balances for this campus"
                    >
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Fee Balances</div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: bBalanceDue > 0 ? '#F59E0B' : '#10B981',
                        }}
                      >
                        KES {bBalanceDue.toLocaleString()} ↗
                      </div>
                    </div>
                    <div
                      onClick={() => {
                        setSelectedBranchForRoster(branch);
                        setRosterInitialTab('staff');
                      }}
                      style={{ cursor: 'pointer' }}
                      title="Click to view campus staff roster"
                    >
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Branch Staff</div>
                      <div style={{ fontWeight: 600, color: '#6EE7B7' }}>{bStaff.length} Members ({manager?.full_name?.split(' ')[0] || 'Lead'}) ↗</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Campus Director</div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={manager?.full_name || branch.manager_name || 'Designated Director'}
                      >
                        {manager?.full_name || branch.manager_name || 'Designated Director'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    <span>Phone: {branch.phone || '+254 700 000 000'}</span>
                    <span className="badge badge-paid">Active Center</span>
                  </div>

                  {/* QUICK ACCESS ACTION BUTTONS */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(212, 154, 91, 0.15)',
                    }}
                  >
                    <button
                      className="btn btn-secondary"
                      style={{
                        padding: '7px 10px',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'rgba(212, 154, 91, 0.08)',
                        borderColor: 'rgba(212, 154, 91, 0.3)',
                        color: 'var(--crema-gold)',
                      }}
                      onClick={() => {
                        setSelectedBranchForRoster(branch);
                        setRosterInitialTab('students');
                      }}
                    >
                      <GraduationCap size={14} />
                      <span>View Trainees ({bStudents.length})</span>
                    </button>

                    <button
                      className="btn btn-secondary"
                      style={{
                        padding: '7px 10px',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        borderColor: 'rgba(16, 185, 129, 0.3)',
                        color: '#6EE7B7',
                      }}
                      onClick={() => {
                        setSelectedBranchForRoster(branch);
                        setRosterInitialTab('staff');
                      }}
                    >
                      <Users size={14} />
                      <span>View Staff ({bStaff.length})</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'rgba(212, 154, 91, 0.08)',
                        borderColor: 'rgba(212, 154, 91, 0.3)',
                        color: 'var(--crema-gold)',
                      }}
                      onClick={() => setBranchToEdit(branch)}
                    >
                      <Edit3 size={13} />
                      <span>Edit Facility</span>
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'rgba(239, 68, 68, 0.04)',
                        borderColor: 'rgba(239, 68, 68, 0.2)',
                        color: '#F87171',
                      }}
                      onClick={() => setBranchToDelete(branch)}
                    >
                      <Trash2 size={13} />
                      <span>Delete Campus</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: ACADEMIC COURSES CATALOG */}
      {/* ========================================================================= */}
      {activeTab === 'courses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Academic Curriculum & Coffee Courses</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Specialty Coffee Association (SCA) certified curricula, modules, and fee schedules
              </p>
            </div>
          </div>

          <div className="grid-cards">
            {courses.map((course) => {
              const enrolledCount = enrollments.filter((e) => {
                const c = cohorts.find((co) => co.id === e.cohort_id);
                return c?.course_id === course.id;
              }).length;

              return (
                <div key={course.id} className="glass-card" style={{ padding: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <span className="badge badge-gold" style={{ marginBottom: '6px' }}>
                        {course.category}
                      </span>
                      <h3 style={{ fontSize: '1.15rem', marginTop: '4px' }}>{course.title}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Code: {course.code} • {course.duration_weeks} Weeks Duration</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="btn btn-ghost"
                        title={`Edit ${course.title}`}
                        style={{
                          width: '32px',
                          height: '32px',
                          padding: 0,
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(212, 154, 91, 0.12)',
                          border: '1px solid rgba(212, 154, 91, 0.3)',
                          color: 'var(--crema-gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCourseToEdit(course);
                        }}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        className="btn btn-ghost"
                        title={`Decommission / Delete ${course.title}`}
                        style={{
                          width: '32px',
                          height: '32px',
                          padding: 0,
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#EF4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCourseToDelete(course);
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '10px 0', lineHeight: 1.5 }}>
                    {course.description}
                  </p>

                  <div
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      margin: '12px 0',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Tuition Fee</div>
                      <div style={{ fontWeight: 700, color: 'var(--crema-gold)' }}>KES {course.fee_amount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Total Trainees</div>
                      <div style={{ fontWeight: 700 }}>{enrolledCount} Enrolled</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Certification: {course.certification_title || 'SCA Certificate of Completion'}
                  </div>

                  {/* Course Action Buttons */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    <button
                      className="btn btn-secondary"
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        fontSize: '0.76rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        color: 'var(--crema-gold)',
                        borderColor: 'rgba(212, 154, 91, 0.3)',
                        background: 'rgba(212, 154, 91, 0.08)',
                      }}
                      onClick={() => setCourseToEdit(course)}
                    >
                      <Edit3 size={13} />
                      <span>Edit Course</span>
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.76rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        color: '#F87171',
                        borderColor: 'rgba(239, 68, 68, 0.25)',
                        background: 'rgba(239, 68, 68, 0.05)',
                      }}
                      onClick={() => setCourseToDelete(course)}
                      title="Decommission Course Curriculum"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRAINEES & KYC DIRECTORY */}
      {/* ========================================================================= */}
      {(activeTab === 'trainees' || activeTab === 'students') && (
        <div>
          {/* Controls Bar: Search, Course Filter, KYC Filter */}
          <div
            className="glass-card"
            style={{
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search by Student Name, Reg No (e.g. AUR/NBO/...), or National ID..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                style={{ paddingLeft: '36px', width: '100%' }}
              />
            </div>

            {/* Course Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Course:</span>
              <select
                className="form-select"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              >
                <option value="ALL">All Coffee Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* KYC Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>KYC Status:</span>
              <select
                className="form-select"
                value={kycFilter}
                onChange={(e) => setKycFilter(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              >
                <option value="ALL">All KYC</option>
                <option value="verified">Verified Only</option>
                <option value="pending">Pending KYC</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ExportActionsMenu
                onExportCSV={() => handleExportStudents('csv')}
                onExportPDF={() => handleExportStudents('pdf')}
                label="Export Roster"
              />
              <button className="btn btn-primary" onClick={() => setShowKYCModal(true)} style={{ padding: '8px 16px' }}>
                <Plus size={16} />
                <span>Admit Trainee</span>
              </button>
            </div>
          </div>

          {/* Trainees Master Table (Fixed Layout - Zero Horizontal Scrolling) */}
          <div className="table-container" style={{ marginBottom: '24px', overflowX: 'hidden' }}>
            <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>#</th>
                  <th style={{ width: '22%' }}>Trainee Name</th>
                  <th style={{ width: '16%' }}>Reg Number</th>
                  <th style={{ width: '22%' }}>Enrolled Course</th>
                  <th style={{ width: '17%' }}>Intake & Duration</th>
                  <th style={{ width: '11%' }}>Fee Balance</th>
                  <th style={{ width: '7%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {directoryStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No trainees found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  directoryStudents.map((st, index) => {
                    const prof = profiles.find((p) => p.id === st.profile_id) || st.profile;
                    const enrollment = enrollments.find((e) => e.student_id === st.id);
                    const cohort = cohorts.find((c) => c.id === enrollment?.cohort_id);
                    const course = courses.find((c) => c.id === cohort?.course_id);
                    const invoice = invoices.find((i) => i.student_id === st.id);

                    const fullName = prof?.full_name || (index === 0 ? 'Faith Cherono' : `Trainee ${index + 1}`);
                    const regNumber = prof?.reg_number || `AUR/NBO/2026/00${index + 1}`;
                    const phone = prof?.phone || st.emergency_contact_phone || '+254 712 345 678';

                    // Formatted Dates
                    const admissionDate = enrollment?.enrolled_at
                      ? new Date(enrollment.enrolled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                      : '20 Aug';

                    const completionDate = cohort?.end_date
                      ? new Date(cohort.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '08 Sep 2026';

                    return (
                      <tr key={st.id} style={{ cursor: 'pointer' }} onClick={() => setInspectedStudent(st)}>
                        {/* 1. Ser No. */}
                        <td style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.78rem' }}>
                          #{index + 1}
                        </td>

                        {/* 2. Trainee Name */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
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
                              {fullName.charAt(0)}
                            </div>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {fullName}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {phone}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. Registration No */}
                        <td>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              color: 'var(--crema-gold)',
                              fontSize: '0.74rem',
                              letterSpacing: '0.02em',
                              background: 'rgba(212, 154, 91, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(212, 154, 91, 0.25)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {regNumber}
                          </span>
                        </td>

                        {/* 4. Enrolled Course */}
                        <td>
                          <div style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {course?.title || 'Barista Skills Foundation'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--crema-gold)' }}>
                            {course?.category || 'Barista Skills'} ({course?.duration_weeks || 2} Wks)
                          </div>
                        </td>

                        {/* 5. Schedule & Duration */}
                        <td>
                          <div style={{ fontSize: '0.76rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                            <Calendar size={12} color="var(--crema-gold)" />
                            <span>{admissionDate} – {completionDate}</span>
                          </div>
                          <div style={{ fontSize: '0.66rem', color: '#10B981' }}>Exam & Graduation</div>
                        </td>

                        {/* 6. Fee Balance */}
                        <td>
                          {invoice ? (
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  color: invoice.balance_due > 0 ? 'var(--cherry-red)' : '#10B981',
                                }}
                              >
                                KES {invoice.balance_due.toLocaleString()}
                              </div>
                              <span className={`badge badge-${invoice.status}`} style={{ fontSize: '0.6rem' }}>
                                {invoice.status}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>KES 0</span>
                          )}
                        </td>

                        {/* 7. Action */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedStudent(st);
                            }}
                          >
                            KYC File
                          </button>
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
      {/* TAB 3: COHORTS & CLASSES */}
      {/* ========================================================================= */}
      {activeTab === 'cohorts' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Intakes, Cohorts & Classrooms</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Scheduled intakes, Google Meet theory classrooms, active terms, and graduated cohorts
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Status Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-surface-elevated)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                {[
                  { id: 'ALL', label: 'All', count: filteredCohorts.length },
                  { id: 'in_progress', label: 'In Progress', count: filteredCohorts.filter((c) => c.status === 'in_progress').length },
                  { id: 'upcoming', label: 'Upcoming', count: filteredCohorts.filter((c) => c.status === 'upcoming').length },
                  { id: 'completed', label: 'Graduated / Completed', count: filteredCohorts.filter((c) => c.status === 'completed').length },
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

              <button
                className="btn btn-primary"
                onClick={() => setShowCreateCohortModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Calendar size={16} />
                <span>+ Schedule New Cohort</span>
              </button>
            </div>
          </div>

          <div className="grid-cards">
            {filteredCohorts
              .filter((c) => (cohortStatusFilter === 'ALL' ? true : c.status === cohortStatusFilter))
              .map((cohort) => {
              const course = courses.find((c) => c.id === cohort.course_id);
              const instructor = profiles.find((p) => p.id === cohort.instructor_id);
              const branch = branches.find((b) => b.id === cohort.branch_id);
              const cohortEnrs = enrollments.filter((e) => e.cohort_id === cohort.id);

              return (
                <div key={cohort.id} className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <span className="badge badge-gold" style={{ marginBottom: '4px' }}>
                        {branch?.code} • {course?.category}
                      </span>
                      <h3 style={{ fontSize: '1.1rem', marginTop: '4px' }}>{cohort.name}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{course?.title}</p>
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
                      <span style={{ color: 'var(--text-muted)' }}>Campus:</span>
                      <span>{branch?.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Schedule:</span>
                      <span>{cohort.schedule_timing}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Term Dates:</span>
                      <span>{cohort.start_date} to {cohort.end_date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Faculty Lead:</span>
                      <span style={{ fontWeight: 600, color: 'var(--crema-gold)' }}>
                        {instructor?.full_name || 'Assigned Instructor'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Trainees Enrolled:</span>
                      <span style={{ fontWeight: 600 }}>{cohortEnrs.length} / {cohort.max_capacity}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
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
                        title="Join Live Google Meet Class"
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
      {/* TAB: EXAM & MARKS LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'grades' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Institutional Academic & Exam Ledger</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Comprehensive scores, continuous assessments (CATs), practical labs, and sensory cupping results
              </p>
            </div>
          </div>

          <div className="table-container" style={{ marginBottom: '24px', overflowX: 'hidden' }}>
            <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '16%' }}>Trainee Name</th>
                  <th style={{ width: '14%' }}>Reg Number</th>
                  <th style={{ width: '22%' }}>Assessment Module</th>
                  <th style={{ width: '8%' }}>Practical</th>
                  <th style={{ width: '8%' }}>Theory</th>
                  <th style={{ width: '8%' }}>Sensory</th>
                  <th style={{ width: '8%' }}>Final</th>
                  <th style={{ width: '5%' }}>Grade</th>
                  <th style={{ width: '11%' }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {assessments.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No examination marks uploaded yet.
                    </td>
                  </tr>
                ) : (
                  assessments.map((a) => {
                    const st = students.find((s) => s.id === a.student_id || s.profile_id === a.student_id);
                    const prof = profiles.find((p) => p.id === st?.profile_id || p.id === a.student_id);
                    const fullName = prof?.full_name || 'Faith Cherono';
                    const regNumber = prof?.reg_number || 'AUR/NBO/2026/001';

                    return (
                      <tr key={a.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {fullName}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--crema-gold)', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>
                            {regNumber}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.module_name}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, fontSize: '0.78rem' }}>{a.practical_score}%</td>
                        <td style={{ fontWeight: 600, fontSize: '0.78rem' }}>{a.theory_score}%</td>
                        <td style={{ fontWeight: 600, fontSize: '0.78rem' }}>{a.sensory_score}%</td>
                        <td>
                          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: a.final_score >= 75 ? '#10B981' : a.final_score >= 60 ? 'var(--crema-gold)' : 'var(--cherry-red)' }}>
                            {a.final_score}%
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${a.final_score >= 60 ? 'approved' : 'danger'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                            {a.grade}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.instructor_remarks}>
                            "{a.instructor_remarks}"
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
      {/* TAB: CERTIFIED ALUMNI & CAREER PLACEMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'alumni' && (
        <div>
          {/* Top KPI Cards */}
          <div className="grid-stats" style={{ marginBottom: '14px' }}>
            <div className="glass-card" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>Total Certified Graduates</span>
                <Award size={15} color="var(--crema-gold)" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--crema-gold)' }}>
                {alumni.length} Alumni
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                SCA Standards Certified 2024–2026
              </div>
            </div>

            <div className="glass-card" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>Industry Placement Rate</span>
                <CheckCircle2 size={15} color="#10B981" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981' }}>
                98.5%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Employed in Leading Specialty Cafes
              </div>
            </div>

            <div className="glass-card" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>Regional Footprint</span>
                <Building2 size={15} color="#6EE7B7" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6EE7B7' }}>
                3 Campuses
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Nairobi ({alumni.filter(a => a.branch_id === 'b1000000-0000-0000-0000-000000000001').length}) • Mombasa ({alumni.filter(a => a.branch_id === 'b2000000-0000-0000-0000-000000000002').length}) • Kigali ({alumni.filter(a => a.branch_id === 'b3000000-0000-0000-0000-000000000003').length})
              </div>
            </div>

            <div className="glass-card" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>Partner Employers</span>
                <Coffee size={15} color="var(--crema-gold)" />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--crema-gold)' }}>
                24+ Brands
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Artcaffe, Java House, Spring Valley
              </div>
            </div>
          </div>

          {/* Search & Branch Filter Bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by graduate name, current employer (e.g. Spring Valley, Artcaffe), or certificate serial..."
              value={alumniSearch}
              onChange={(e) => setAlumniSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: '240px',
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
              <option value="ALL">All Regional Centers ({alumni.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({alumni.filter((a) => a.branch_id === b.id).length})
                </option>
              ))}
            </select>
            <ExportActionsMenu
              onExportCSV={() => handleExportAlumni('csv')}
              onExportPDF={() => handleExportAlumni('pdf')}
              label="Export Alumni"
            />
          </div>

          {/* Dedicated Alumni Table */}
          <div className="table-container" style={{ marginBottom: '16px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Graduate Name</th>
                  <th>SCA Certification</th>
                  <th>Graduation Cohort</th>
                  <th>Current Employer & Role</th>
                  <th>Employment Status</th>
                  <th>Certificate Serial No</th>
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
                  .map((a, idx) => (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>#{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>{a.full_name}</div>
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
                        <span className="badge badge-approved">
                          {a.employment_status}
                        </span>
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
                            border: '1px solid rgba(212, 154, 91, 0.25)',
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
      )}

      {/* ========================================================================= */}
      {/* TAB: TUITION & INVOICES */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && (
        <div>
          <div className="table-container" style={{ marginBottom: '16px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Student Name</th>
                  <th>Reg Number</th>
                  <th>Total Fee</th>
                  <th>Amount Paid</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const student = students.find((s) => s.id === inv.student_id || s.profile_id === inv.student_id);
                  const profile = profiles.find((p) => p.id === student?.profile_id || p.id === inv.student_id);

                  return (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--crema-gold)' }}>
                        {inv.invoice_number}
                      </td>
                      <td style={{ fontWeight: 600 }}>{profile?.full_name || 'Trainee'}</td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {profile?.reg_number}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>KES {inv.total_fee.toLocaleString()}</td>
                      <td style={{ fontWeight: 700, color: '#10B981' }}>KES {inv.amount_paid.toLocaleString()}</td>
                      <td style={{ fontWeight: 700, color: inv.balance_due > 0 ? 'var(--cherry-red)' : '#10B981' }}>
                        KES {inv.balance_due.toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge badge-${inv.status}`}>{inv.status}</span>
                      </td>
                      <td>
                        {inv.balance_due > 0 && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                            onClick={() => setSelectedInvoiceForPayment(inv)}
                          >
                            Collect Fee
                          </button>
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
      {/* TAB: M-PESA & REVENUE LEDGER */}
      {/* ========================================================================= */}
      {(activeTab === 'finance' || activeTab === 'payments') && (
        <div>

          <div className="table-container" style={{ marginBottom: '16px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>M-Pesa Receipt</th>
                  <th>Student Name & Reg</th>
                  <th>Branch Campus</th>
                  <th>Amount Credited</th>
                  <th>Transaction Date</th>
                  <th>Gateway Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => {
                  const student = students.find((s) => s.id === p.student_id || s.profile_id === p.student_id);
                  const profile = profiles.find((pr) => pr.id === student?.profile_id || pr.id === p.student_id);
                  const branch = branches.find((b) => b.id === p.branch_id);

                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--crema-gold)', fontWeight: 700 }}>
                        {p.mpesa_receipt_number || 'STK-' + p.id.slice(0, 6)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{profile?.full_name || 'Trainee'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{profile?.reg_number}</div>
                      </td>
                      <td>{branch?.name || 'Nairobi Campus'}</td>
                      <td style={{ fontWeight: 700, color: '#10B981' }}>
                        KES {p.amount.toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span className="badge badge-paid">{p.status}</span>
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
      {/* TAB: ATTENDANCE ARCHIVE & DIGITAL ROLL-CALL INTELLIGENCE */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <StudentRollCallAnalytics isBranchManagerMode={false} />
      )}

      {/* ========================================================================= */}
      {/* TAB: NATIONAL STAFF ATTENDANCE & DUTY REGISTER */}
      {/* ========================================================================= */}
      {activeTab === 'staff_attendance' && (
        <StaffAttendanceAnalytics />
      )}

      {/* ========================================================================= */}
      {/* TAB: MULTI-CAMPUS STAFF LEAVES & STATUTORY TRACKER */}
      {/* ========================================================================= */}
      {activeTab === 'staff_leaves' && (
        <div>
          {/* Top Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Nationwide Pending Queue
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--crema-gold)', marginTop: '4px' }}>
                {leaveRequests.filter((l) => l.status === 'pending').length}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Multi-branch leave approvals
              </div>
            </div>

            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Approved Time-Offs
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6EE7B7', marginTop: '4px' }}>
                {leaveRequests.filter((l) => l.status === 'approved').length}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Active faculty leaves logged
              </div>
            </div>

            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Statutory Allowance
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                21 Days / Year
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Kenya Employment Act Standard
              </div>
            </div>
          </div>

          {/* Section 1: Nationwide Staff Statutory 21-Day Allowance Table */}
          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarCheck size={16} color="var(--crema-gold)" />
                  <span>Faculty & Staff Statutory Leave Entitlements</span>
                </h3>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Statutory 21-day annual leave balances and usage across all Tripple T campuses
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSelectedStaffForLeave(null);
                  setShowRecordLeaveModal(true);
                }}
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                <CalendarCheck size={13} />
                <span>+ Record Leave / Off-Day</span>
              </button>
            </div>

            <div className="table-container" style={{ width: '100%', overflowX: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Staff Member</th>
                    <th style={{ width: '13%' }}>Staff ID</th>
                    <th style={{ width: '13%' }}>Campus</th>
                    <th style={{ width: '16%' }}>Designation</th>
                    <th style={{ width: '10%' }}>Entitlement</th>
                    <th style={{ width: '8%' }}>Taken</th>
                    <th style={{ width: '10%' }}>Balance</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles
                    .filter((p) => p.role !== 'student')
                    .filter((p) => selectedBranchId === 'ALL' || p.branch_id === selectedBranchId)
                    .map((staff, idx) => {
                      const sBranch = branches.find((b) => b.id === staff.branch_id) || branches[0];
                      const staffLeaves = leaveRequests.filter((l) => l.profile_id === staff.id && l.status === 'approved');
                      const annualTaken = staffLeaves
                        .filter((l) => l.leave_type === 'annual')
                        .reduce((s, l) => s + l.days_count, 0);
                      const remainingAnnual = Math.max(0, 21 - annualTaken);

                      return (
                        <tr key={staff.id}>
                          <td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{staff.full_name}</div>
                            <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{staff.email}</div>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--crema-gold)', fontWeight: 700 }}>
                              {staff.staff_id || `AUR/${sBranch?.code || 'NBO'}/STF-${idx + 1}`}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.80rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sBranch?.name}</td>
                          <td style={{ fontSize: '0.80rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={staff.job_title || staff.specialty || staff.role.replace('_', ' ').toUpperCase()}>
                            {staff.job_title || staff.specialty || staff.role.replace('_', ' ').toUpperCase()}
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>21 Days</span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: annualTaken > 0 ? 'var(--crema-gold)' : 'var(--text-muted)' }}>
                              {annualTaken} {annualTaken === 1 ? 'day' : 'days'}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontWeight: 700,
                                color: remainingAnnual > 5 ? '#10B981' : '#EF4444',
                                background: remainingAnnual > 5 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                              }}
                            >
                              {remainingAnnual} Days Left
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                              onClick={() => {
                                setSelectedStaffForLeave(staff);
                                setShowRecordLeaveModal(true);
                              }}
                            >
                              <span>+ Log</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Multi-Campus Leave Review Queue */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Multi-Branch Leave Review Queue & History</h3>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Approve, decline, or audit faculty leave applications across all campuses
                </p>
              </div>

              {/* Status Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-surface-elevated)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                {[
                  { id: 'ALL', label: 'All Requests', count: leaveRequests.length },
                  { id: 'pending', label: 'Pending', count: leaveRequests.filter((l) => l.status === 'pending').length },
                  { id: 'approved', label: 'Approved', count: leaveRequests.filter((l) => l.status === 'approved').length },
                  { id: 'rejected', label: 'Rejected', count: leaveRequests.filter((l) => l.status === 'rejected').length },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setLeaveStatusFilter(f.id as any)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      background: leaveStatusFilter === f.id ? 'var(--crema-gold)' : 'transparent',
                      color: leaveStatusFilter === f.id ? '#1A1412' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>
            </div>

            <div className="table-container" style={{ width: '100%', overflowX: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '17%' }}>Staff Member</th>
                    <th style={{ width: '11%' }}>Branch</th>
                    <th style={{ width: '10%' }}>Category</th>
                    <th style={{ width: '13%' }}>Dates</th>
                    <th style={{ width: '5%' }}>Days</th>
                    <th style={{ width: '17%' }}>Purpose / Reason</th>
                    <th style={{ width: '8%' }}>Status</th>
                    <th style={{ width: '8%' }}>Remarks</th>
                    <th style={{ width: '11%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests
                    .filter((l) => selectedBranchId === 'ALL' || l.branch_id === selectedBranchId)
                    .filter((l) => (leaveStatusFilter === 'ALL' ? true : l.status === leaveStatusFilter))
                    .map((req) => {
                      const staff = profiles.find((p) => p.id === req.profile_id);
                      const sBranch = branches.find((b) => b.id === req.branch_id);

                      return (
                        <tr key={req.id}>
                          <td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{staff?.full_name || 'Staff Member'}</div>
                            <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{staff?.role.replace('_', ' ').toUpperCase()}</div>
                          </td>
                          <td style={{ fontSize: '0.80rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sBranch?.name || 'Aurevia Coffee Institute'}</td>
                          <td>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: 'var(--crema-gold)',
                                background: 'rgba(212, 154, 91, 0.12)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {req.leave_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {req.start_date} to {req.end_date}
                          </td>
                          <td>
                            <span style={{ fontWeight: 700 }}>{req.days_count}</span>
                          </td>
                          <td style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason}>
                            {req.reason}
                          </td>
                          <td>
                            <span
                              className={`badge badge-${
                                req.status === 'approved' ? 'paid' : req.status === 'rejected' ? 'danger' : 'pending'
                              }`}
                              style={{ fontSize: '0.68rem', padding: '2px 6px', whiteSpace: 'nowrap' }}
                            >
                              {req.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.74rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.review_notes || ''}>
                            {req.review_notes || '--'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {req.status === 'pending' ? (
                              <div style={{ display: 'inline-flex', gap: '4px', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '2px 6px', fontSize: '0.68rem', color: '#10B981', borderColor: '#10B981' }}
                                  onClick={() => reviewLeaveRequest(req.id, 'approved', `Approved by Super Admin (${currentProfile.full_name})`)}
                                  title="Approve Leave"
                                >
                                  <Check size={11} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '2px 6px', fontSize: '0.68rem', color: '#EF4444', borderColor: '#EF4444' }}
                                  onClick={() => reviewLeaveRequest(req.id, 'rejected', `Declined by Super Admin (${currentProfile.full_name})`)}
                                  title="Decline Leave"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>--</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  {leaveRequests.filter((l) => (leaveStatusFilter === 'ALL' ? true : l.status === leaveStatusFilter)).length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', fontSize: '0.80rem' }}>
                        No leave requests found matching this status filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HR & STAFF MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'staff' && (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Faculty & Staff HR Directory</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Staff profiles, system role access, initial passwords, and course allocations
              </p>
            </div>
          </div>

          {/* Staff Members Master Table (Fixed Layout - Zero Horizontal Scrolling) */}
          <div className="table-container" style={{ marginBottom: '24px', overflowX: 'hidden' }}>
            <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>#</th>
                  <th style={{ width: '23%' }}>Staff Member</th>
                  <th style={{ width: '13%' }}>Staff / Login ID</th>
                  <th style={{ width: '14%' }}>Institutional Role</th>
                  <th style={{ width: '17%' }}>Campus Academy</th>
                  <th style={{ width: '17%' }}>Specialty & Courses</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.filter((p) => p.role !== 'student').map((staff, index) => {
                  const sBranch = branches.find((b) => b.id === staff.branch_id) || branches[0];
                  const staffRole = staff.role === 'super_admin'
                    ? 'Super Admin'
                    : staff.role === 'branch_manager'
                    ? 'Branch Manager'
                    : 'Lead Instructor / Q-Grader';

                  const staffIdDisplay = staff.staff_id || `AUR/${sBranch?.code || 'NBO'}/STF-${String(index + 1).padStart(3, '0')}`;

                  return (
                    <tr key={staff.id}>
                      {/* 1. Ser No. */}
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.80rem' }}>
                        #{index + 1}
                      </td>

                      {/* 2. Staff Member */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                              color: '#181310',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {staff.full_name.charAt(0)}
                          </div>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {staff.full_name}
                            </div>
                            <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {staff.email} • {staff.phone || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Staff ID */}
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
                          {staffIdDisplay}
                        </span>
                      </td>

                      {/* 4. Role */}
                      <td>
                        {staff.system_access === false ? (
                          <span className="badge badge-pending" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                            Ops: {staff.department || 'Support'}
                          </span>
                        ) : (
                          <span
                            className={`badge badge-${staff.role === 'super_admin' ? 'approved' : staff.role === 'branch_manager' ? 'gold' : 'paid'}`}
                            style={{ fontSize: '0.68rem', padding: '2px 6px', whiteSpace: 'nowrap' }}
                          >
                            {staffRole}
                          </span>
                        )}
                      </td>

                      {/* 5. Campus */}
                      <td>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{sBranch?.name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{sBranch?.city}</div>
                      </td>

                      {/* 6. Specialty & Courses */}
                      <td>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--crema-gold-light)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {staff.job_title || staff.specialty || 'General Operations'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {staff.system_access === false
                            ? 'Operations Support'
                            : staff.assigned_courses && staff.assigned_courses.length > 0
                            ? `${staff.assigned_courses.length} Modules Assigned`
                            : 'All Campus Courses'}
                        </div>
                      </td>

                      {/* 7. Actions */}
                      <td style={{ textAlign: 'right' }}>
                        {staff.role !== 'super_admin' ? (
                          <button
                            className="btn btn-danger"
                            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                            onClick={() => setDeletingStaff(staff)}
                            title="Delete Staff Account"
                          >
                            <Trash2 size={12} />
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>HQ Admin</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Grid: Real-Time Attendance Analytics, Comparative Behavior Graphs, Live Clock-ins & Leave Approvals */}
          <StaffAttendanceAnalytics />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: OMNICHANNEL COMMUNICATIONS HUB */}
      {/* ========================================================================= */}
      {(activeTab === 'communications' || activeTab === 'sms') && (
        <InstitutionalCommunications isBranchManagerMode={false} />
      )}

      {/* Student Detail KYC Dossier Modal */}
      {inspectedStudent && (
        <StudentDetailModal
          student={inspectedStudent}
          onClose={() => setInspectedStudent(null)}
        />
      )}

      {/* Branch Students & Staff Roster Modal */}
      {selectedBranchForRoster && (
        <BranchRosterModal
          branch={selectedBranchForRoster}
          initialTab={rosterInitialTab}
          onClose={() => setSelectedBranchForRoster(null)}
          onSelectStudent={(student) => {
            setInspectedStudent(student);
          }}
          onNavigateToTab={(tab, branchId) => {
            setSelectedBranchId(branchId);
            setActiveTab(tab as any);
          }}
        />
      )}

      {/* Student Onboarding KYC Modal */}
      {showKYCModal && <StudentKYCModal onClose={() => setShowKYCModal(false)} />}

      {/* Add Branch Modal */}
      {showAddBranch && (
        <div className="modal-overlay" onClick={() => setShowAddBranch(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1.15rem' }}>Configure New Institutional Branch</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Creates a new regional campus with sequence code for Reg Numbers
              </p>
            </div>
            <form onSubmit={handleCreateBranch} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Branch Code *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newBranchCode}
                    onChange={(e) => setNewBranchCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ELD"
                    maxLength={5}
                    required
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>e.g. AUR/ELD/2026/...</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Campus Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="e.g. Tripple T Eldoret Campus"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newBranchCity}
                    onChange={(e) => setNewBranchCity(e.target.value)}
                    placeholder="Eldoret"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newBranchAddress}
                    onChange={(e) => setNewBranchAddress(e.target.value)}
                    placeholder="Rupa Mills Complex"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Create Branch Campus
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddBranch(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedInvoiceForPayment && (
        <MpesaPaymentModal
          invoice={selectedInvoiceForPayment}
          onClose={() => setSelectedInvoiceForPayment(null)}
        />
      )}

      {showCreateCohortModal && (
        <CreateCohortModal
          onClose={() => setShowCreateCohortModal(false)}
        />
      )}

      {editingCohort && (
        <EditCohortModal
          cohort={editingCohort}
          onClose={() => setEditingCohort(null)}
        />
      )}

      {showAddStaffModal && (
        <AddStaffModal
          onClose={() => setShowAddStaffModal(false)}
        />
      )}

      {showCreateCourseModal && (
        <CreateCourseModal
          onClose={() => setShowCreateCourseModal(false)}
        />
      )}

      {showRecordLeaveModal && (
        <RecordStaffLeaveModal
          presetStaffId={selectedStaffForLeave?.id}
          isBranchManagerMode={false}
          onClose={() => {
            setShowRecordLeaveModal(false);
            setSelectedStaffForLeave(null);
          }}
        />
      )}

      {/* Staff Deletion Confirmation */}
      {deletingStaff && (
        <div className="modal-overlay" onClick={() => setDeletingStaff(null)} style={{ zIndex: 1200 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--cherry-red)', marginBottom: '12px' }}>
              Remove Staff Account?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              Are you sure you want to remove <strong>{deletingStaff.full_name}</strong> ({deletingStaff.staff_id || deletingStaff.email}) from the faculty directory?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeletingStaff(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  if (deletingStaff) {
                    await deleteStaffMember(deletingStaff.id);
                    setDeletingStaff(null);
                  }
                }}
              >
                Yes, Remove Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Branch Modal */}
      {branchToDelete && (
        <DeleteBranchModal
          branch={branchToDelete}
          onClose={() => setBranchToDelete(null)}
        />
      )}

      {/* Edit Branch Modal */}
      {branchToEdit && (
        <EditBranchModal
          branch={branchToEdit}
          onClose={() => setBranchToEdit(null)}
        />
      )}

      {/* Edit Course Modal */}
      {courseToEdit && (
        <EditCourseModal
          course={courseToEdit}
          onClose={() => setCourseToEdit(null)}
        />
      )}

      {/* Delete Course Modal */}
      {courseToDelete && (
        <DeleteCourseModal
          course={courseToDelete}
          onClose={() => setCourseToDelete(null)}
        />
      )}
    </div>
  );
};
