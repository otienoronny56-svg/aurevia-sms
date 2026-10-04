import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { SMSLog } from '../../types/database.types';
import { INITIAL_PROFILES } from '../../lib/mockData';
import {
  Send, Smartphone, Mail, Sparkles, CheckCircle2, AlertTriangle,
  Search, Users, Building2, BookOpen, CreditCard,
  Calendar, RefreshCw, Eye, MessageSquare, Zap, ShieldCheck,
  Settings, Key, Check, X, ExternalLink, Lock, EyeOff, Info
} from 'lucide-react';
import { ExportActionsMenu } from '../common/ExportActionsMenu';
import { exportToCSV, exportToPDFReport } from '../../lib/exportUtils';
import { getResendConfig, saveResendConfig, testResendConnection, ResendConfig } from '../../lib/resend';

interface InstitutionalCommunicationsProps {
  isBranchManagerMode?: boolean;
}

export const InstitutionalCommunications: React.FC<InstitutionalCommunicationsProps> = ({
  isBranchManagerMode = false,
}) => {
  const {
    currentProfile,
    branches,
    courses,
    cohorts,
    students,
    enrollments,
    profiles,
    invoices,
    attendance,
    smsLogs,
    sendBulkCommunication,
  } = useApp();

  // Active sub-view
  const [activeView, setActiveView] = useState<'compose' | 'logs'>('compose');

  // Channel Selection: 'sms' | 'email' | 'dual'
  const [selectedChannel, setSelectedChannel] = useState<'sms' | 'email' | 'dual'>('dual');

  // Audience Target Selection
  const [targetAudience, setTargetAudience] = useState<
    'all_students' | 'cohort' | 'course' | 'fee_defaulters' | 'low_attendance' | 'staff' | 'custom'
  >('all_students');

  // Scope Filters for Target Selection
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    isBranchManagerMode ? currentProfile.branch_id || branches[0]?.id || 'ALL' : 'ALL'
  );
  const [selectedCohortId, setSelectedCohortId] = useState<string>(cohorts[0]?.id || '');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');

  // Custom Direct Recipient fields
  const [customName, setCustomName] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [customEmail, setCustomEmail] = useState<string>('');

  // Message Fields
  const [purpose, setPurpose] = useState<SMSLog['purpose']>('announcement');
  const [subject, setSubject] = useState<string>('Important Institutional Notice: Aurevia Institute of Coffee');
  const [messageBody, setMessageBody] = useState<string>(
    'Dear {student_name}, this is an official update regarding your training at {campus_name}. Please check your student portal for schedule and session announcements.'
  );

  // Live Device Preview Toggle
  const [previewDevice, setPreviewDevice] = useState<'mobile_sms' | 'desktop_email'>('mobile_sms');

  // Dispatch state & Toast feedback
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<{ count: number; channel: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [templateCopiedAlert, setTemplateCopiedAlert] = useState<string | null>(null);

  // Ledger Table Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [ledgerChannelFilter, setLedgerChannelFilter] = useState<'ALL' | 'sms' | 'email' | 'dual'>('ALL');
  const [ledgerPurposeFilter, setLedgerPurposeFilter] = useState<string>('ALL');
  const [ledgerBranchFilter, setLedgerBranchFilter] = useState<string>(
    isBranchManagerMode ? currentProfile.branch_id || 'ALL' : 'ALL'
  );

  // Inspected Log Modal
  const [selectedLog, setSelectedLog] = useState<SMSLog | null>(null);

  // Resend API Gateway Settings & Diagnostics State
  const [showResendModal, setShowResendModal] = useState<boolean>(false);
  const [resendConfig, setResendConfig] = useState<ResendConfig>(() => getResendConfig());
  const [apiKeyInput, setApiKeyInput] = useState<string>(resendConfig.apiKey);
  const [fromEmailInput, setFromEmailInput] = useState<string>(resendConfig.fromEmail);
  const [fromNameInput, setFromNameInput] = useState<string>(resendConfig.fromName);
  const [replyToInput, setReplyToInput] = useState<string>(resendConfig.replyTo);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [testRecipientEmail, setTestRecipientEmail] = useState<string>(currentProfile.email || 'admin@aureviacoffee.com');
  const [isTestingResend, setIsTestingResend] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; mode?: 'live' | 'sandbox' } | null>(null);
  const [configSavedToast, setConfigSavedToast] = useState<boolean>(false);

  const handleSaveResendConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveResendConfig({
      apiKey: apiKeyInput,
      fromEmail: fromEmailInput,
      fromName: fromNameInput,
      replyTo: replyToInput,
    });
    setResendConfig(updated);
    setConfigSavedToast(true);
    setTimeout(() => setConfigSavedToast(false), 3500);
  };

  const handleTestResend = async () => {
    setIsTestingResend(true);
    setTestResult(null);
    try {
      const res = await testResendConnection(apiKeyInput, testRecipientEmail, fromEmailInput);
      if (res.success) {
        setTestResult({
          success: true,
          mode: res.mode,
          message: res.mode === 'live'
            ? `Live Test Successful! Dispatched via ${res.provider || 'Supabase Edge Function'} (ID: ${res.messageId}). Delivered to "${testRecipientEmail}".`
            : `Sandbox Mode: Simulated diagnostic email (ID: ${res.messageId}). To send live emails, set RESEND_API_KEY in your Supabase Edge Function secrets.`,
        });
      } else {
        setTestResult({
          success: false,
          mode: res.mode,
          message: `Gateway Notification: ${res.error}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Edge Function invocation error: ${err.message}`,
      });
    } finally {
      setIsTestingResend(false);
    }
  };

  // Current branch reference
  const currentBranch = branches.find((b) => b.id === (isBranchManagerMode ? currentProfile.branch_id : selectedBranchId));

  // ---------------------------------------------------------------------------
  // AUDIENCE RESOLVER LOGIC
  // ---------------------------------------------------------------------------
  const resolvedRecipients = useMemo(() => {
    let list: Array<{
      name: string;
      phone: string;
      email: string;
      branchId?: string;
      balanceDue?: number;
      attendanceRate?: number;
      courseName?: string;
      cohortName?: string;
    }> = [];

    // Filter students by branch if specified
    const scopedStudents = students.filter((s) => {
      if (isBranchManagerMode) return s.branch_id === currentProfile.branch_id;
      if (selectedBranchId !== 'ALL') return s.branch_id === selectedBranchId;
      return true;
    });

    const resolveStudentProfile = (profileId?: string, fallbackStudent?: any) => {
      if (fallbackStudent?.profile?.full_name) return fallbackStudent.profile;
      const foundInProfiles = profiles.find((p) => p.id === profileId);
      if (foundInProfiles) return foundInProfiles;
      const foundInMock = INITIAL_PROFILES.find((p) => p.id === profileId);
      if (foundInMock) return foundInMock;
      return undefined;
    };

    const getStudentFinancials = (studentId?: string) => {
      if (!studentId) return { balance: 20000 };
      const studentInvoices = invoices.filter((inv) => inv.student_id === studentId);
      if (studentInvoices.length > 0) {
        const totalBilled = studentInvoices.reduce((acc, curr) => acc + (curr.total_fee || 0), 0);
        const totalPaid = studentInvoices.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
        const balance = studentInvoices.reduce((acc, curr) => acc + (curr.balance_due ?? 0), 0) || (totalBilled - totalPaid);
        return { balance };
      }
      return { balance: 20000 };
    };

    const getStudentAttendanceRate = (studentId?: string) => {
      if (!studentId) return 92;
      const studentLogs = attendance.filter((a) => a.student_id === studentId);
      if (studentLogs.length > 0) {
        const presentCount = studentLogs.filter((a) => a.status === 'present' || a.status === 'late').length;
        return Math.round((presentCount / studentLogs.length) * 100);
      }
      return 92;
    };

    if (targetAudience === 'all_students') {
      list = scopedStudents.map((s) => {
        const prof = resolveStudentProfile(s.profile_id, s);
        const enr = enrollments.find((e) => e.student_id === s.id);
        const studentCohort = cohorts.find((c) => c.id === enr?.cohort_id);
        const studentCourse = courses.find((c) => c.id === studentCohort?.course_id);
        const fin = getStudentFinancials(s.id);
        return {
          name: prof?.full_name || 'Faith Cherono',
          phone: prof?.phone || '0714767240',
          email: prof?.email || 'faith.cherono@aureviacoffeeinstitute.co.ke',
          branchId: s.branch_id,
          balanceDue: fin.balance,
          attendanceRate: getStudentAttendanceRate(s.id),
          courseName: studentCourse?.title,
          cohortName: studentCohort?.name,
        };
      });
    } else if (targetAudience === 'cohort') {
      const cohortEnrs = enrollments.filter((e) => e.cohort_id === selectedCohortId);
      const cohortObj = cohorts.find((c) => c.id === selectedCohortId);
      const courseObj = courses.find((c) => c.id === cohortObj?.course_id);
      list = cohortEnrs.map((e) => {
        const s = students.find((st) => st.id === e.student_id);
        const prof = resolveStudentProfile(s?.profile_id, s);
        const fin = getStudentFinancials(s?.id);
        return {
          name: prof?.full_name || 'Faith Cherono',
          phone: prof?.phone || '0714767240',
          email: prof?.email || 'faith.cherono@aureviacoffeeinstitute.co.ke',
          branchId: s?.branch_id,
          balanceDue: fin.balance,
          attendanceRate: getStudentAttendanceRate(s?.id),
          courseName: courseObj?.title,
          cohortName: cohortObj?.name,
        };
      });
    } else if (targetAudience === 'course') {
      const courseCohorts = cohorts.filter((c) => c.course_id === selectedCourseId).map((c) => c.id);
      const courseEnrs = enrollments.filter((e) => courseCohorts.includes(e.cohort_id));
      const courseObj = courses.find((c) => c.id === selectedCourseId);
      list = courseEnrs.map((e) => {
        const s = students.find((st) => st.id === e.student_id);
        const prof = resolveStudentProfile(s?.profile_id, s);
        const cObj = cohorts.find((c) => c.id === e.cohort_id);
        const fin = getStudentFinancials(s?.id);
        return {
          name: prof?.full_name || 'Faith Cherono',
          phone: prof?.phone || '0714767240',
          email: prof?.email || 'faith.cherono@aureviacoffeeinstitute.co.ke',
          branchId: s?.branch_id,
          balanceDue: fin.balance,
          attendanceRate: getStudentAttendanceRate(s?.id),
          courseName: courseObj?.title,
          cohortName: cObj?.name,
        };
      });
    } else if (targetAudience === 'fee_defaulters') {
      list = scopedStudents
        .map((s) => {
          const prof = resolveStudentProfile(s.profile_id, s);
          const fin = getStudentFinancials(s.id);
          const enr = enrollments.find((e) => e.student_id === s.id);
          const studentCohort = cohorts.find((c) => c.id === enr?.cohort_id);
          const studentCourse = courses.find((c) => c.id === studentCohort?.course_id);
          return {
            name: prof?.full_name || 'Faith Cherono',
            phone: prof?.phone || '0714767240',
            email: prof?.email || 'faith.cherono@aureviacoffeeinstitute.co.ke',
            branchId: s.branch_id,
            balanceDue: fin.balance,
            attendanceRate: getStudentAttendanceRate(s.id),
            courseName: studentCourse?.title,
            cohortName: studentCohort?.name,
          };
        })
        .filter((item) => (item.balanceDue ?? 0) > 0);
    } else if (targetAudience === 'low_attendance') {
      list = scopedStudents.map((s) => {
        const prof = resolveStudentProfile(s.profile_id, s);
        const fin = getStudentFinancials(s.id);
        const rate = getStudentAttendanceRate(s.id);
        const enr = enrollments.find((e) => e.student_id === s.id);
        const studentCohort = cohorts.find((c) => c.id === enr?.cohort_id);
        const studentCourse = courses.find((c) => c.id === studentCohort?.course_id);
        return {
          name: prof?.full_name || 'Faith Cherono',
          phone: prof?.phone || '0714767240',
          email: prof?.email || 'faith.cherono@aureviacoffeeinstitute.co.ke',
          branchId: s.branch_id,
          balanceDue: fin.balance,
          attendanceRate: rate,
          courseName: studentCourse?.title,
          cohortName: studentCohort?.name,
        };
      });
    } else if (targetAudience === 'staff') {
      const staffList = profiles.filter((p) => {
        if (p.role === 'student') return false;
        if (isBranchManagerMode) return p.branch_id === currentProfile.branch_id || !p.branch_id;
        if (selectedBranchId !== 'ALL') return p.branch_id === selectedBranchId || !p.branch_id;
        return true;
      });
      list = staffList.map((p) => ({
        name: p.full_name,
        phone: p.phone || '+254711000222',
        email: p.email,
        branchId: p.branch_id || undefined,
      }));
    } else if (targetAudience === 'custom') {
      if (customName) {
        list = [
          {
            name: customName,
            phone: customPhone || '+254700000000',
            email: customEmail || 'recipient@gmail.com',
            branchId: currentProfile.branch_id || branches[0]?.id,
          },
        ];
      }
    }

    return list;
  }, [
    targetAudience,
    students,
    enrollments,
    cohorts,
    courses,
    invoices,
    attendance,
    profiles,
    selectedBranchId,
    selectedCohortId,
    selectedCourseId,
    isBranchManagerMode,
    currentProfile,
    branches,
    customName,
    customPhone,
    customEmail,
  ]);

  // Dynamic Segment Statistics for clear count badges
  const segmentStats = useMemo(() => {
    const scopedStudents = students.filter((s) => {
      if (isBranchManagerMode) return s.branch_id === currentProfile.branch_id;
      if (selectedBranchId !== 'ALL') return s.branch_id === selectedBranchId;
      return true;
    });

    const feeDefaultersCount = scopedStudents.filter((s) => {
      const studentInvoices = invoices.filter((inv) => inv.student_id === s.id);
      const totalBilled = studentInvoices.reduce((acc, curr) => acc + curr.total_fee, 0);
      const totalPaid = studentInvoices.reduce((acc, curr) => acc + curr.amount_paid, 0);
      const bal = studentInvoices.reduce((acc, curr) => acc + curr.balance_due, 0) || (totalBilled - totalPaid);
      return bal > 0;
    }).length;

    const lowAttendanceCount = scopedStudents.filter((s) => {
      const studentLogs = attendance.filter((a) => a.student_id === s.id);
      if (studentLogs.length === 0) return false;
      const presentCount = studentLogs.filter((a) => a.status === 'present' || a.status === 'late').length;
      return Math.round((presentCount / studentLogs.length) * 100) < 85;
    }).length;

    const staffCount = profiles.filter((p) => {
      if (p.role === 'student') return false;
      if (isBranchManagerMode) return p.branch_id === currentProfile.branch_id || !p.branch_id;
      if (selectedBranchId !== 'ALL') return p.branch_id === selectedBranchId || !p.branch_id;
      return true;
    }).length;

    return {
      all: scopedStudents.length,
      feeDefaulters: feeDefaultersCount,
      lowAttendance: lowAttendanceCount,
      staff: staffCount,
    };
  }, [students, invoices, attendance, profiles, isBranchManagerMode, currentProfile, selectedBranchId]);

  // ---------------------------------------------------------------------------
  // 1-CLICK PRESET TEMPLATES
  // ---------------------------------------------------------------------------
  const PRESET_TEMPLATES = [
    {
      id: 'fee_reminder',
      title: 'Tuition Fee Balance Reminder',
      icon: CreditCard,
      purpose: 'fee_reminder' as const,
      subject: 'Aurevia Academy: Tuition Balance Settlement Notice',
      body: 'Dear {student_name}, this is a friendly reminder from Aurevia Institute of Coffee that your pending tuition balance is KES {balance_due}. Please clear via Paybill 400200 Acc: {student_name} before the upcoming CAT exams.',
    },
    {
      id: 'attendance_warning',
      title: 'SCA 85% Attendance Warning',
      icon: AlertTriangle,
      purpose: 'attendance_alert' as const,
      subject: 'URGENT: SCA Attendance Eligibility Threshold Warning',
      body: 'Official Notice: Dear {student_name}, your recorded attendance in {cohort_name} is currently {attendance_rate}%. SCA certification regulations require minimum 85% attendance to qualify for practical calibration exams.',
    },
    {
      id: 'schedule_change',
      title: 'Practical Lab Timetable & Venue',
      icon: Calendar,
      purpose: 'schedule_change' as const,
      subject: 'Aurevia Timetable Update: Practical Calibration Session',
      body: 'Attention {student_name}: Your next hands-on practical lab for {course_name} at {campus_name} is scheduled for tomorrow at 08:30 AM in Espresso Lab 1. Please come equipped with your SCA sensory handbook.',
    },
    {
      id: 'admissions_welcome',
      title: 'New Student Admission & Induction',
      icon: BookOpen,
      purpose: 'admissions' as const,
      subject: 'Welcome to Aurevia Institute of Coffee - Induction Details',
      body: 'Welcome to Aurevia, {student_name}! Your enrollment in {cohort_name} at {campus_name} is confirmed. Orientation starts this Monday at 09:00 AM. We look forward to shaping your specialty coffee mastery.',
    },
    {
      id: 'exam_notice',
      title: 'CAT / Practical Assessment Notice',
      icon: CheckCircle2,
      purpose: 'exam_notice' as const,
      subject: 'Exam Notice: Practical Extraction & Milk Texturing Assessment',
      body: 'Dear {student_name}, your practical extraction and latte art assessment for {course_name} has been set for Friday at 10:00 AM. Ensure your sensory station setup is calibrated 15 mins prior.',
    },
    {
      id: 'general_broadcast',
      title: 'Institutional General Announcement',
      icon: MessageSquare,
      purpose: 'announcement' as const,
      subject: 'Official Announcement from Aurevia Campus Directorate',
      body: 'Dear {student_name}, please be advised of upcoming campus guest masterclasses by World Barista Championship judges next week at {campus_name}. Attendance is highly encouraged for all active trainees.',
    },
  ];

  const applyTemplate = (tpl: typeof PRESET_TEMPLATES[0]) => {
    setPurpose(tpl.purpose);
    setSubject(tpl.subject);
    setMessageBody(tpl.body);
    setTemplateCopiedAlert(`Loaded "${tpl.title}" preset template!`);
    setTimeout(() => setTemplateCopiedAlert(null), 3000);
  };

  const insertTag = (tag: string) => {
    setMessageBody((prev) => `${prev} ${tag}`);
  };

  // Selected Recipient Index for Live Preview Simulation
  const [previewRecipientIndex, setPreviewRecipientIndex] = useState<number>(0);

  // Helper to personalize raw template message for any individual recipient
  const renderMessageForRecipient = (rawTemplate: string, recipient: typeof resolvedRecipients[0]) => {
    if (!recipient) return rawTemplate;
    const branchName = branches.find((b) => b.id === recipient.branchId)?.name || currentBranch?.name || 'Aurevia Campus';
    return rawTemplate
      .replace(/{student_name}/g, recipient.name)
      .replace(/{staff_name}/g, recipient.name)
      .replace(/{recipient_name}/g, recipient.name)
      .replace(/{name}/g, recipient.name)
      .replace(/{course_name}/g, recipient.courseName || 'Specialty Coffee Skills')
      .replace(/{cohort_name}/g, recipient.cohortName || 'Active Intake')
      .replace(/{campus_name}/g, branchName)
      .replace(/{balance_due}/g, (recipient.balanceDue ?? 0).toLocaleString())
      .replace(/{attendance_rate}/g, (recipient.attendanceRate ?? 100).toString());
  };

  // Currently active preview recipient from selected audience
  const activePreviewRecipient = resolvedRecipients[previewRecipientIndex] || resolvedRecipients[0] || {
    name: 'Faith Cherono',
    phone: '0714767240',
    email: 'faith.cherono@aureviacoffeeinstitute.co.ke',
    balanceDue: 20000,
    attendanceRate: 92,
    courseName: 'Barista Skills Foundation',
    cohortName: 'NBO Barista Intensive - Cohort 12',
    branchId: currentProfile.branch_id || branches[0]?.id,
  };

  const previewRenderedBody = useMemo(() => {
    return renderMessageForRecipient(messageBody, activePreviewRecipient);
  }, [messageBody, activePreviewRecipient, branches, currentBranch]);

  // ---------------------------------------------------------------------------
  // DISPATCH HANDLER (Sends personalized payload per recipient)
  // ---------------------------------------------------------------------------
  const handleDispatch = async () => {
    if (resolvedRecipients.length === 0) {
      alert('Please select a target audience with at least 1 recipient.');
      return;
    }
    if (!messageBody.trim()) {
      alert('Please write a message before dispatching.');
      return;
    }

    setIsDispatching(true);
    try {
      const audienceLabel =
        targetAudience === 'all_students'
          ? 'All Trainees'
          : targetAudience === 'cohort'
          ? `Cohort: ${cohorts.find((c) => c.id === selectedCohortId)?.name || 'Selected'}`
          : targetAudience === 'course'
          ? `Course: ${courses.find((c) => c.id === selectedCourseId)?.title || 'Selected'}`
          : targetAudience === 'fee_defaulters'
          ? 'Fee Balance Defaulters'
          : targetAudience === 'low_attendance'
          ? 'Attendance < 85%'
          : targetAudience === 'staff'
          ? 'Faculty & Staff'
          : 'Direct Custom Recipient';

      const res = await sendBulkCommunication({
        channel: selectedChannel,
        purpose: purpose,
        subject: selectedChannel !== 'sms' ? subject : undefined,
        messageContent: previewRenderedBody,
        audienceSegment: audienceLabel,
        recipients: resolvedRecipients.map((r) => ({
          name: r.name,
          phone: r.phone,
          email: r.email,
          branchId: r.branchId || currentProfile.branch_id || branches[0]?.id,
          messageContent: renderMessageForRecipient(messageBody, r),
        })),
      });

      setDispatchSuccess({ count: res.count, channel: selectedChannel });
      setTimeout(() => setDispatchSuccess(null), 6000);
    } catch (err) {
      console.error('Dispatch error:', err);
      alert('Error dispatching communication.');
    } finally {
      setIsDispatching(false);
    }
  };

  // ---------------------------------------------------------------------------
  // FILTERED LEDGER LOGS
  // ---------------------------------------------------------------------------
  const filteredLogs = useMemo(() => {
    return smsLogs.filter((log) => {
      // Branch filter
      if (isBranchManagerMode) {
        if (log.branch_id && log.branch_id !== currentProfile.branch_id) return false;
      } else if (ledgerBranchFilter !== 'ALL') {
        if (log.branch_id && log.branch_id !== ledgerBranchFilter) return false;
      }

      // Channel filter
      if (ledgerChannelFilter !== 'ALL') {
        const logChannel = log.channel || 'sms';
        if (logChannel !== ledgerChannelFilter) return false;
      }

      // Purpose filter
      if (ledgerPurposeFilter !== 'ALL') {
        if (log.purpose !== ledgerPurposeFilter) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = log.recipient_name?.toLowerCase().includes(q);
        const matchesPhone = log.recipient_phone?.toLowerCase().includes(q);
        const matchesEmail = log.recipient_email?.toLowerCase().includes(q);
        const matchesContent = log.message_content?.toLowerCase().includes(q);
        const matchesRef = log.gateway_reference?.toLowerCase().includes(q);
        const matchesSubject = log.subject?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesContent && !matchesRef && !matchesSubject) {
          return false;
        }
      }

      return true;
    });
  }, [smsLogs, ledgerBranchFilter, ledgerChannelFilter, ledgerPurposeFilter, searchTerm, isBranchManagerMode, currentProfile]);

  // ---------------------------------------------------------------------------
  // EXPORT DISPATCH LEDGER
  // ---------------------------------------------------------------------------
  const handleExport = (format: 'csv' | 'pdf') => {
    const headers = ['Channel', 'Recipient Name', 'Phone / Email', 'Purpose', 'Subject / Message', 'Gateway Ref', 'Status', 'Sent At'];
    const rows = filteredLogs.map((log) => [
      (log.channel || 'sms').toUpperCase(),
      log.recipient_name,
      log.channel === 'email' ? (log.recipient_email || 'N/A') : (log.recipient_phone || 'N/A'),
      log.purpose,
      log.subject ? `${log.subject}: ${log.message_content}` : log.message_content,
      log.gateway_reference || 'N/A',
      log.delivery_status.toUpperCase(),
      new Date(log.sent_at).toLocaleString(),
    ]);

    const titlePrefix = isBranchManagerMode ? `COMMUNICATIONS_LOG_${currentProfile.branch_id}` : 'AUREVIA_OMNICHANNEL_COMMUNICATIONS';

    if (format === 'csv') {
      exportToCSV(titlePrefix, headers, rows);
    } else {
      exportToPDFReport(
        titlePrefix,
        'OMNICHANNEL COMMUNICATIONS DISPATCH LEDGER',
        'Official SMS & Email Automated Gateway Audit Record',
        headers,
        rows
      );
    }
  };

  // Pagination for Ledger Table
  const [ledgerPage, setLedgerPage] = useState<number>(1);
  const [ledgerPageSize, setLedgerPageSize] = useState<number>(10);
  const totalLedgerPages = Math.max(1, Math.ceil(filteredLogs.length / ledgerPageSize));
  const paginatedLogs = useMemo(() => {
    const start = (ledgerPage - 1) * ledgerPageSize;
    return filteredLogs.slice(start, start + ledgerPageSize);
  }, [filteredLogs, ledgerPage, ledgerPageSize]);

  // Metrics summary
  const totalSentCount = smsLogs.length;
  const totalSmsCount = smsLogs.filter((l) => !l.channel || l.channel === 'sms' || l.channel === 'dual').length;
  const totalEmailCount = smsLogs.filter((l) => l.channel === 'email' || l.channel === 'dual').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE KPI METRICS BAR (COMPACT 4-COLUMN ROW) */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '12px',
        }}
      >
        <div className="glass-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              minWidth: '38px',
              borderRadius: '10px',
              background: 'rgba(212, 163, 89, 0.15)',
              border: '1px solid rgba(212, 163, 89, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--crema-gold)',
            }}
          >
            <Send size={18} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
              Total Dispatches
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.2' }}>
              {totalSentCount.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--crema-gold)', whiteSpace: 'nowrap' }}>
              {totalSmsCount} SMS • {totalEmailCount} Mails
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              minWidth: '38px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34D399',
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
              SMS Gateway
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#34D399', lineHeight: '1.2' }}>
              Online (99.8%)
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              AT & Twilio Active
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              minWidth: '38px',
              borderRadius: '10px',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#A78BFA',
            }}
          >
            <Mail size={18} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
              Email SMTP
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#A78BFA', lineHeight: '1.2' }}>
              Active (100%)
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Resend TLS
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              minWidth: '38px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60A5FA',
            }}
          >
            <Users size={18} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
              Audience Reach
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.2' }}>
              {students.length + profiles.length} Contacts
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {students.length} Trainees • {profiles.length} Staff
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP SUB-NAV BAR: COMPOSER vs DISPATCH LEDGER TABLE */}
      {/* ========================================================================= */}
      <div
        className="glass-card"
        style={{
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className={`btn ${activeView === 'compose' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setActiveView('compose')}
          >
            <Send size={16} />
            <span>Omnichannel Bulk Dispatcher</span>
          </button>
          <button
            className={`btn ${activeView === 'logs' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setActiveView('logs')}
          >
            <MessageSquare size={16} />
            <span>Communications Ledger & Audit Table ({smsLogs.length})</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {activeView === 'logs' && (
            <ExportActionsMenu
              onExportCSV={() => handleExport('csv')}
              onExportPDF={() => handleExport('pdf')}
              label="Export Communications"
            />
          )}
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: resendConfig.isConfigured ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(217, 119, 6, 0.4)',
              background: resendConfig.isConfigured ? 'rgba(16, 185, 129, 0.08)' : 'rgba(217, 119, 6, 0.08)',
            }}
            onClick={() => setShowResendModal(true)}
            title="Configure Resend API Key & Email Gateway Settings"
          >
            <Mail size={15} color={resendConfig.isConfigured ? '#34D399' : '#F59E0B'} />
            <span style={{ color: resendConfig.isConfigured ? '#34D399' : '#F59E0B', fontWeight: 600 }}>
              Resend Email Gateway
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                padding: '2px 7px',
                borderRadius: '999px',
                background: resendConfig.isConfigured ? 'rgba(16, 185, 129, 0.25)' : 'rgba(217, 119, 6, 0.25)',
                color: resendConfig.isConfigured ? '#34D399' : '#F59E0B',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {resendConfig.isConfigured ? 'Live API Active' : 'Sandbox Active'}
            </span>
          </button>
        </div>
      </div>

      {/* SUCCESS TOAST NOTIFICATION */}
      {dispatchSuccess && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.3))',
            border: '1px solid #10B981',
            borderRadius: '12px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={24} color="#34D399" />
            <div>
              <div style={{ fontWeight: 600, color: '#34D399', fontSize: '0.95rem' }}>
                Broadcast Successfully Dispatched!
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Queued {dispatchSuccess.count} messages via {dispatchSuccess.channel.toUpperCase()} gateway. Delivery receipts logged in table.
              </div>
            </div>
          </div>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.75rem' }}
            onClick={() => setActiveView('logs')}
          >
            View in Ledger &rarr;
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW A: OMNICHANNEL COMPOSER & LIVE DUAL PREVIEW */}
      {/* ========================================================================= */}
      {activeView === 'compose' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(460px, 1.45fr) minmax(360px, 1fr)',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* LEFT COLUMN: COMPOSE WORKFLOW */}
          <div className="glass-card" style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Header with Title and Toast */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', margin: 0 }}>
                  <Sparkles size={20} color="var(--crema-gold)" />
                  <span>Institutional Broadcast Dispatcher</span>
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: 'rgba(212, 154, 91, 0.12)',
                    color: 'var(--crema-gold)',
                    fontWeight: 700,
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                  }}
                >
                  Step-by-Step Dispatcher
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                Reach students and faculty via direct SMS alerts, branded institutional emails, or dual broadcasts with dynamic merge tags.
              </p>
            </div>

            {templateCopiedAlert && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(212, 154, 91, 0.15)',
                  border: '1px solid var(--crema-gold)',
                  color: 'var(--crema-gold)',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              >
                <Sparkles size={16} />
                <span>{templateCopiedAlert}</span>
              </div>
            )}

            {/* STEP 1: DELIVERY CHANNEL */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--crema-gold)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(212, 154, 91, 0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>1</span>
                  <span>Select Delivery Channel</span>
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Active: <strong style={{ color: selectedChannel === 'dual' ? '#34D399' : selectedChannel === 'sms' ? 'var(--crema-gold)' : '#A78BFA' }}>
                    {selectedChannel === 'dual' ? 'Dual (SMS + Email)' : selectedChannel === 'sms' ? 'SMS Only' : 'Email Only'}
                  </strong>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {/* DUAL CHANNEL */}
                <div
                  onClick={() => setSelectedChannel('dual')}
                  style={{
                    padding: '14px 12px',
                    borderRadius: '12px',
                    border: selectedChannel === 'dual' ? '2px solid #10B981' : '1px solid var(--border-subtle)',
                    background: selectedChannel === 'dual' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface-elevated)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: selectedChannel === 'dual' ? '0 0 16px rgba(16, 185, 129, 0.2)' : 'none',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '-9px',
                      background: '#10B981',
                      color: '#042F2E',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                    }}
                  >
                    Recommended
                  </span>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: selectedChannel === 'dual' ? '#10B981' : 'rgba(16, 185, 129, 0.15)',
                      color: selectedChannel === 'dual' ? '#042F2E' : '#34D399',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Zap size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: selectedChannel === 'dual' ? '#34D399' : 'var(--text-primary)' }}>
                      Dual Omnichannel
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      SMS Text + Branded Email
                    </div>
                  </div>
                </div>

                {/* SMS ONLY */}
                <div
                  onClick={() => setSelectedChannel('sms')}
                  style={{
                    padding: '14px 12px',
                    borderRadius: '12px',
                    border: selectedChannel === 'sms' ? '2px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
                    background: selectedChannel === 'sms' ? 'rgba(212, 154, 91, 0.12)' : 'var(--bg-surface-elevated)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: selectedChannel === 'sms' ? '0 0 16px var(--crema-gold-glow)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: selectedChannel === 'sms' ? 'var(--crema-gold)' : 'rgba(212, 154, 91, 0.15)',
                      color: selectedChannel === 'sms' ? '#181310' : 'var(--crema-gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: selectedChannel === 'sms' ? 'var(--crema-gold)' : 'var(--text-primary)' }}>
                      Direct Mobile SMS
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Rapid alert (&lt;160 chars)
                    </div>
                  </div>
                </div>

                {/* EMAIL ONLY */}
                <div
                  onClick={() => setSelectedChannel('email')}
                  style={{
                    padding: '14px 12px',
                    borderRadius: '12px',
                    border: selectedChannel === 'email' ? '2px solid #8B5CF6' : '1px solid var(--border-subtle)',
                    background: selectedChannel === 'email' ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-surface-elevated)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: selectedChannel === 'email' ? '0 0 16px rgba(139, 92, 246, 0.2)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: selectedChannel === 'email' ? '#8B5CF6' : 'rgba(139, 92, 246, 0.15)',
                      color: selectedChannel === 'email' ? '#FFFFFF' : '#A78BFA',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Mail size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: selectedChannel === 'email' ? '#A78BFA' : 'var(--text-primary)' }}>
                      Institutional Email
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Formal letterhead via Resend
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 2: AUDIENCE TARGETING */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--crema-gold)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(212, 154, 91, 0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>2</span>
                  <span>Select Target Audience</span>
                </label>
                {!isBranchManagerMode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Campus Filter:</span>
                    <select
                      className="form-select"
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      style={{ fontSize: '0.75rem', padding: '4px 8px', height: 'auto', background: 'var(--bg-input)' }}
                    >
                      <option value="ALL">All Campuses (National)</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.city})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Segment Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                {[
                  { id: 'all_students', label: 'All Trainees', icon: Users, count: segmentStats.all, highlight: null },
                  { id: 'fee_defaulters', label: 'Fee Defaulters', icon: CreditCard, count: segmentStats.feeDefaulters, highlight: '#F59E0B' },
                  { id: 'low_attendance', label: 'Attendance < 85%', icon: AlertTriangle, count: segmentStats.lowAttendance, highlight: '#EF4444' },
                  { id: 'cohort', label: 'By Cohort', icon: Calendar, count: null, highlight: null },
                  { id: 'course', label: 'By Course', icon: BookOpen, count: null, highlight: null },
                  { id: 'staff', label: 'Staff & Faculty', icon: Building2, count: segmentStats.staff, highlight: null },
                  { id: 'custom', label: 'Single Recipient', icon: Smartphone, count: null, highlight: null },
                ].map((seg) => {
                  const Icon = seg.icon;
                  const isSelected = targetAudience === seg.id;
                  return (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => setTargetAudience(seg.id as any)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: isSelected ? '1.5px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(212, 154, 91, 0.15)' : 'var(--bg-surface-elevated)',
                        color: isSelected ? 'var(--crema-gold)' : 'var(--text-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={16} color={isSelected ? 'var(--crema-gold)' : (seg.highlight || 'var(--text-secondary)')} />
                      <span style={{ fontSize: '0.74rem', fontWeight: 600, textAlign: 'center', lineHeight: '1.2' }}>{seg.label}</span>
                      {seg.count !== null && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '10px',
                            background: seg.highlight ? `${seg.highlight}25` : 'rgba(212, 154, 91, 0.2)',
                            color: seg.highlight || 'var(--crema-gold)',
                          }}
                        >
                          {seg.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Sub-selectors depending on segment */}
              {targetAudience === 'cohort' && (
                <div style={{ marginBottom: '12px', background: 'rgba(212, 154, 91, 0.06)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Select Target Cohort:
                  </label>
                  <select
                    className="form-select"
                    value={selectedCohortId}
                    onChange={(e) => setSelectedCohortId(e.target.value)}
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  >
                    {cohorts
                      .filter((c) => (isBranchManagerMode ? c.branch_id === currentProfile.branch_id : selectedBranchId === 'ALL' || c.branch_id === selectedBranchId))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {branches.find((b) => b.id === c.branch_id)?.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {targetAudience === 'course' && (
                <div style={{ marginBottom: '12px', background: 'rgba(212, 154, 91, 0.06)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Select Academic Course Group:
                  </label>
                  <select
                    className="form-select"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    style={{ width: '100%', fontSize: '0.84rem' }}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.code}) — Fee: KES {c.fee_amount?.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetAudience === 'custom' && (
                <div style={{ marginBottom: '12px', background: 'rgba(212, 154, 91, 0.06)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.76rem', color: 'var(--crema-gold)', fontWeight: 600, marginBottom: '8px' }}>
                    Single Direct Recipient Details:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Recipient Full Name"
                      className="form-input"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      style={{ fontSize: '0.82rem' }}
                    />
                    <input
                      type="text"
                      placeholder="Phone: +254 7..."
                      className="form-input"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      style={{ fontSize: '0.82rem' }}
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      className="form-input"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      style={{ fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              )}

              {/* Audience Summary Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(212, 154, 91, 0.1), rgba(24, 19, 16, 0.8))',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(212, 154, 91, 0.2)',
                      color: 'var(--crema-gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                    }}
                  >
                    {resolvedRecipients.length}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Ready to contact {resolvedRecipients.length} recipient{resolvedRecipients.length === 1 ? '' : 's'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      {resolvedRecipients.length > 0
                        ? `${resolvedRecipients.slice(0, 3).map((r) => r.name).join(', ')}${resolvedRecipients.length > 3 ? ` + ${resolvedRecipients.length - 3} more` : ''}`
                        : 'No recipients matched the selected segment filters.'}
                    </div>
                  </div>
                </div>
                <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                  {isBranchManagerMode ? currentBranch?.name : selectedBranchId === 'ALL' ? 'All Campuses (National)' : currentBranch?.name}
                </span>
              </div>
            </div>

            {/* STEP 3: MESSAGE & 1-CLICK TEMPLATES */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--crema-gold)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(212, 154, 91, 0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>3</span>
                  <span>Message & Fast Templates</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--crema-gold)', fontWeight: 700 }}>{messageBody.length} Chars</span>
                  <span>•</span>
                  <span style={{ fontWeight: 600, color: Math.ceil(messageBody.length / 160) > 1 ? '#F59E0B' : '#10B981' }}>
                    {Math.ceil(messageBody.length / 160) || 1} SMS Unit{Math.ceil(messageBody.length / 160) > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* 1-Click Fast Templates Bar */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  ⚡ Quick-Load Institutional Presets (1-Click):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
                  {PRESET_TEMPLATES.map((tpl) => {
                    const Icon = tpl.icon;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="btn-ghost"
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-surface-elevated)',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          textAlign: 'left',
                          color: 'var(--text-primary)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Icon size={14} color="var(--crema-gold)" style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tpl.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Email / Dual Subject Line */}
              {selectedChannel !== 'sms' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Email Subject Line:
                  </label>
                  <input
                    type="text"
                    placeholder="Subject line for email recipients..."
                    className="form-input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{
                      width: '100%',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      background: 'var(--bg-input)',
                      borderColor: 'var(--border-medium)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              )}

              {/* High-Contrast Luxury Message Textarea */}
              <div style={{ position: 'relative', width: '100%' }}>
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Write your broadcast message here... Use tags below like {student_name} to auto-personalize for every person."
                  style={{
                    width: '100%',
                    minHeight: '170px',
                    boxSizing: 'border-box',
                    padding: '16px 18px',
                    fontSize: '0.94rem',
                    lineHeight: '1.6',
                    fontFamily: 'inherit',
                    background: '#16110E',
                    color: '#F8F5F1',
                    border: '1.5px solid var(--border-medium)',
                    borderRadius: '12px',
                    boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.4)',
                    outline: 'none',
                    resize: 'vertical',
                    display: 'block',
                  }}
                />
              </div>

              {/* Smart Dynamic Merge Tags */}
              <div style={{ marginTop: '12px', background: 'rgba(212, 154, 91, 0.06)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--crema-gold)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    🏷️ Click to Insert Personalization Tags
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Auto-personalized per recipient
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(targetAudience === 'staff'
                    ? [
                        { tag: '{staff_name}', label: 'Staff Full Name' },
                        { tag: '{campus_name}', label: 'Assigned Campus' },
                      ]
                    : [
                        { tag: '{student_name}', label: 'Student Name' },
                        { tag: '{balance_due}', label: 'Fee Balance Due' },
                        { tag: '{course_name}', label: 'Course Title' },
                        { tag: '{cohort_name}', label: 'Cohort Intake' },
                        { tag: '{campus_name}', label: 'Campus Branch' },
                        { tag: '{attendance_rate}', label: 'Attendance %' },
                      ]
                  ).map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => insertTag(item.tag)}
                      style={{
                        background: 'rgba(212, 154, 91, 0.12)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '8px',
                        padding: '5px 11px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        color: 'var(--crema-gold)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      + {item.label} <span style={{ opacity: 0.65, fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>({item.tag})</span>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  💡 <strong>Personalization Note:</strong> When you send to {resolvedRecipients.length} people, each person automatically receives their personal name, fee balance, and cohort details.
                </div>
              </div>
            </div>

            {/* STEP 4: DISPATCH ACTION CTA BAR */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Channel: <strong style={{ color: selectedChannel === 'dual' ? '#34D399' : selectedChannel === 'sms' ? 'var(--crema-gold)' : '#A78BFA' }}>
                  {selectedChannel === 'dual' ? 'Dual (SMS + Email)' : selectedChannel === 'sms' ? 'Mobile SMS' : 'Institutional Email'}
                </strong> • <strong>{resolvedRecipients.length}</strong> Recipients Queued
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (resolvedRecipients.length === 0) {
                    alert('Please select a target audience with at least 1 recipient.');
                    return;
                  }
                  if (!messageBody.trim()) {
                    alert('Please write a message before dispatching.');
                    return;
                  }
                  setShowConfirmModal(true);
                }}
                disabled={isDispatching || resolvedRecipients.length === 0}
                style={{
                  padding: '12px 28px',
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px var(--crema-gold-glow)',
                }}
              >
                <Send size={16} />
                <span>Review & Dispatch Broadcast ({resolvedRecipients.length})</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: LUXURY REAL-TIME DEVICE PREVIEW */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              className="glass-card"
              style={{
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Eye size={15} color="var(--crema-gold)" />
                  <span>Live Recipient Preview</span>
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={`btn ${previewDevice === 'mobile_sms' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '4px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => setPreviewDevice('mobile_sms')}
                  >
                    <Smartphone size={13} />
                    <span>Phone SMS</span>
                  </button>
                  <button
                    type="button"
                    className={`btn ${previewDevice === 'desktop_email' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '4px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => setPreviewDevice('desktop_email')}
                  >
                    <Mail size={13} />
                    <span>Branded Email</span>
                  </button>
                </div>
              </div>

              {/* Recipient Selector for Preview */}
              {resolvedRecipients.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Simulating personalized message for:
                  </label>
                  <select
                    className="form-select"
                    value={previewRecipientIndex}
                    onChange={(e) => setPreviewRecipientIndex(Number(e.target.value))}
                    style={{ fontSize: '0.78rem', padding: '5px 10px', width: '100%', boxSizing: 'border-box' }}
                  >
                    {resolvedRecipients.map((rec, idx) => (
                      <option key={idx} value={idx}>
                        {rec.name} ({rec.phone}) — {rec.courseName || 'Trainee'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 1. LUXURY MOBILE SMS DEVICE MOCKUP */}
            {previewDevice === 'mobile_sms' ? (
              <div
                style={{
                  background: '#0B0F19',
                  border: '8px solid #1E293B',
                  borderRadius: '36px',
                  padding: '18px 16px',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.7), 0 0 30px rgba(212, 154, 91, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  minHeight: '440px',
                }}
              >
                {/* Dynamic Island Notch */}
                <div style={{ width: '80px', height: '14px', background: '#000000', borderRadius: '10px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1E293B' }} />
                </div>

                {/* Status Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#94A3B8', padding: '0 8px' }}>
                  <span>9:41</span>
                  <span>5G • 100%</span>
                </div>

                {/* SMS Sender Bar */}
                <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--crema-gold)', letterSpacing: '0.5px' }}>
                    AUREVIA-SMS
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                    To: {activePreviewRecipient.name} ({activePreviewRecipient.phone})
                  </div>
                </div>

                {/* Time Badge */}
                <div style={{ textAlign: 'center', fontSize: '0.65rem', color: '#64748B' }}>
                  Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* SMS Chat Bubble */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #1C1917, #0C0A09)',
                    border: '1px solid rgba(212, 154, 91, 0.4)',
                    borderRadius: '16px 16px 16px 4px',
                    padding: '14px 16px',
                    fontSize: '0.84rem',
                    lineHeight: '1.55',
                    color: '#F8F5F1',
                    alignSelf: 'flex-start',
                    maxWidth: '92%',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                  }}
                >
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{previewRenderedBody}</p>
                  <div style={{ marginTop: '10px', fontSize: '0.66rem', color: 'var(--crema-gold)', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                    <span>Delivered via Africa's Talking</span>
                    <span style={{ color: '#10B981', fontWeight: 700 }}>✓✓</span>
                  </div>
                </div>
              </div>
            ) : (
              /* 2. BRANDED EMAIL CLIENT PREVIEW */
              <div
                style={{
                  background: '#1A1411',
                  color: '#F8F5F1',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.7), 0 0 30px rgba(139, 92, 246, 0.1)',
                  border: '1px solid var(--border-medium)',
                  minHeight: '440px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Desktop Window Header */}
                <div style={{ background: '#120E0C', padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                    Institutional Mail Client • TLS Resend Gateway
                  </span>
                </div>

                {/* Email Metadata */}
                <div style={{ background: '#181310', padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    From: <strong style={{ color: 'var(--text-primary)' }}>Aurevia Specialty Coffee Academy &lt;directorate@aureviacoffeeinstitute.co.ke&gt;</strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                    To: <strong style={{ color: 'var(--crema-gold)' }}>{activePreviewRecipient.name} &lt;{activePreviewRecipient.email}&gt;</strong>
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--crema-gold)', marginTop: '8px' }}>
                    {subject}
                  </div>
                </div>

                {/* Email Body */}
                <div style={{ padding: '22px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #D49A5B, #8C5A28)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#181310',
                        fontWeight: 900,
                        fontSize: '0.9rem',
                      }}
                    >
                      A
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                        AUREVIA SPECIALTY COFFEE ACADEMY
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--crema-gold)' }}>
                        Premier SCA Training Campus • Kenya
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.86rem', lineHeight: '1.65', color: '#E6E1DC', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    {previewRenderedBody}
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Campus: {branches.find((b) => b.id === activePreviewRecipient.branchId)?.name || currentBranch?.name} • Official Academic Transmission • SCA Certified Center
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW B: COMMUNICATIONS DISPATCH LEDGER & AUDIT DATA TABLE */}
      {/* ========================================================================= */}
      {activeView === 'logs' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          {/* Filters Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {/* Search Bar */}
            <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 280px' }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search by recipient name, phone, email, subject, or gateway ref..."
                className="input-field"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '36px', fontSize: '0.85rem', width: '100%' }}
              />
            </div>

            {/* Filter Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Channel Filter */}
              <select
                className="input-field"
                value={ledgerChannelFilter}
                onChange={(e) => setLedgerChannelFilter(e.target.value as any)}
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                <option value="ALL">All Channels</option>
                <option value="sms">SMS Only</option>
                <option value="email">Email Only</option>
                <option value="dual">Dual Omnichannel</option>
              </select>

              {/* Purpose Filter */}
              <select
                className="input-field"
                value={ledgerPurposeFilter}
                onChange={(e) => setLedgerPurposeFilter(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                <option value="ALL">All Purposes</option>
                <option value="fee_reminder">Fee Reminder</option>
                <option value="fee_receipt">Fee Receipt</option>
                <option value="attendance_alert">Attendance Alert</option>
                <option value="schedule_change">Schedule Update</option>
                <option value="admissions">Admissions</option>
                <option value="exam_notice">Exam Notice</option>
                <option value="announcement">Announcement</option>
              </select>

              {/* Campus Filter for Super Admin */}
              {!isBranchManagerMode && (
                <select
                  className="input-field"
                  value={ledgerBranchFilter}
                  onChange={(e) => setLedgerBranchFilter(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  <option value="ALL">All Campuses</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* TABLE CONTAINER (Natural Flow without inner vertical scroll lock) */}
          <div className="table-container" style={{ width: '100%', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '960px', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '9%' }}>Channel</th>
                  <th style={{ width: '16%' }}>Recipient</th>
                  <th style={{ width: '14%' }}>Contact</th>
                  <th style={{ width: '12%' }}>Purpose</th>
                  <th style={{ width: '23%' }}>Subject & Message Content</th>
                  <th style={{ width: '11%' }}>Gateway Ref</th>
                  <th style={{ width: '8%' }}>Status</th>
                  <th style={{ width: '7%' }}>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No communication records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => {
                    const channel = log.channel || 'sms';
                    return (
                      <tr key={log.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLog(log)}>
                        {/* Channel Badge */}
                        <td>
                          {channel === 'sms' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34D399',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                              }}
                            >
                              <Smartphone size={12} /> SMS
                            </span>
                          ) : channel === 'email' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: 'rgba(139, 92, 246, 0.15)',
                                color: '#A78BFA',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                              }}
                            >
                              <Mail size={12} /> EMAIL
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: 'rgba(212, 163, 89, 0.15)',
                                color: 'var(--crema-gold)',
                                border: '1px solid rgba(212, 163, 89, 0.3)',
                              }}
                            >
                              <Zap size={12} /> DUAL
                            </span>
                          )}
                        </td>

                        {/* Recipient */}
                        <td style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.recipient_name}>
                          {log.recipient_name}
                        </td>

                        {/* Contact */}
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {channel === 'email' ? log.recipient_email || 'email@aurevia.ac.ke' : log.recipient_phone}
                        </td>

                        {/* Purpose */}
                        <td>
                          <span className="badge badge-gold" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                            {log.purpose?.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Message / Subject */}
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.message_content}>
                          {log.subject ? (
                            <span>
                              <strong style={{ color: 'var(--text-primary)' }}>{log.subject}: </strong>
                              {log.message_content}
                            </span>
                          ) : (
                            log.message_content
                          )}
                        </td>

                        {/* Gateway Ref */}
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {log.gateway_reference || 'ATX-982104'}
                        </td>

                        {/* Status */}
                        <td>
                          <span className="badge badge-paid" style={{ fontSize: '0.68rem' }}>
                            {log.delivery_status || 'delivered'}
                          </span>
                        </td>

                        {/* Sent At */}
                        <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                          {new Date(log.sent_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          {filteredLogs.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-color)',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ color: 'var(--text-muted)' }}>
                Showing {(ledgerPage - 1) * ledgerPageSize + 1} to {Math.min(ledgerPage * ledgerPageSize, filteredLogs.length)} of {filteredLogs.length} transmissions
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={ledgerPage <= 1}
                  onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  &larr; Previous
                </button>

                <span style={{ fontWeight: 600, color: 'var(--crema-gold)' }}>
                  Page {ledgerPage} of {totalLedgerPages}
                </span>

                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={ledgerPage >= totalLedgerPages}
                  onClick={() => setLedgerPage((p) => Math.min(totalLedgerPages, p + 1))}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  Next &rarr;
                </button>

                <select
                  className="input-field"
                  value={ledgerPageSize}
                  onChange={(e) => {
                    setLedgerPageSize(Number(e.target.value));
                    setLedgerPage(1);
                  }}
                  style={{ fontSize: '0.75rem', padding: '4px 8px', marginLeft: '6px' }}
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION SUMMARY MODAL BEFORE SENDING */}
      {showConfirmModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div
            className="modal-content glass-card"
            style={{
              maxWidth: '540px',
              width: '92%',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              border: '1.5px solid var(--crema-gold)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 40px var(--crema-gold-glow)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(212, 154, 91, 0.2)',
                    color: 'var(--crema-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Send size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Confirm Broadcast Dispatch
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    Review audience and personalized preview before sending
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowConfirmModal(false)}
                style={{ padding: '4px 8px', fontSize: '1rem', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Target Breakdown Grid */}
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                fontSize: '0.82rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Selected Channel:</span>
                <strong style={{ color: selectedChannel === 'dual' ? '#34D399' : selectedChannel === 'sms' ? 'var(--crema-gold)' : '#A78BFA' }}>
                  {selectedChannel === 'dual' ? 'Dual (SMS + Email)' : selectedChannel === 'sms' ? 'Mobile SMS' : 'Institutional Email'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Audience Count:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{resolvedRecipients.length} Recipient{resolvedRecipients.length === 1 ? '' : 's'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Campus / Branch:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {isBranchManagerMode ? currentBranch?.name : (selectedBranchId === 'ALL' ? 'All Campuses (National)' : currentBranch?.name)}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Message Purpose:</span>
                <strong style={{ color: 'var(--crema-gold)', textTransform: 'capitalize' }}>
                  {purpose.replace(/_/g, ' ')}
                </strong>
              </div>
            </div>

            {/* Personalized Sample Preview */}
            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Sample Preview for <strong>{activePreviewRecipient.name}</strong>:
              </div>
              <div
                style={{
                  background: '#16110E',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '14px',
                  fontSize: '0.84rem',
                  lineHeight: '1.55',
                  color: '#F8F5F1',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '140px',
                  overflowY: 'auto',
                }}
              >
                {previewRenderedBody}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={isDispatching}
              >
                Cancel & Edit
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  setShowConfirmModal(false);
                  await handleDispatch();
                }}
                disabled={isDispatching}
                style={{
                  padding: '10px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px var(--crema-gold-glow)',
                }}
              >
                {isDispatching ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Confirm & Dispatch Broadcast</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. INSPECTION MODAL FOR SELECTED COMMUNICATION LOG */}
      {/* ========================================================================= */}
      {selectedLog && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div
            className="modal-content glass-card"
            style={{
              maxWidth: '560px',
              width: '90%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} color="var(--crema-gold)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Communication Audit Dossier</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedLog(null)}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Channel: </span>
                <strong>{(selectedLog.channel || 'sms').toUpperCase()}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Gateway Ref: </span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedLog.gateway_reference || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Recipient Name: </span>
                <strong>{selectedLog.recipient_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Contact: </span>
                <strong>{selectedLog.recipient_phone || selectedLog.recipient_email}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Purpose Category: </span>
                <strong style={{ textTransform: 'capitalize' }}>{selectedLog.purpose?.replace(/_/g, ' ')}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Timestamp: </span>
                <strong>{new Date(selectedLog.sent_at).toLocaleString()}</strong>
              </div>
            </div>

            {selectedLog.subject && (
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Subject Line:</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {selectedLog.subject}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Full Message Body:</div>
              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '14px',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedLog.message_content}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedLog(null)}
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. RESEND EMAIL API GATEWAY CONFIGURATION & LIVE DIAGNOSTIC MODAL */}
      {/* ========================================================================= */}
      {showResendModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div
            className="modal-content glass-card"
            style={{
              maxWidth: '680px',
              width: '94%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(197, 160, 89, 0.1)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(197, 160, 89, 0.2), rgba(16, 185, 129, 0.15))',
                    border: '1px solid rgba(197, 160, 89, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Mail size={22} color="var(--crema-gold)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Resend Email API Gateway
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                    Institutional transactional delivery for admissions, M-Pesa fee receipts, & broadcasts
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowResendModal(false)}
                style={{ padding: '6px 10px', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            {/* Gateway Status Badge Banner */}
            <div
              style={{
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.05))',
                border: '1px solid rgba(16, 185, 129, 0.35)',
              }}
            >
              <ShieldCheck size={22} color="#34D399" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#34D399' }}>
                    Verified Domain: aureviacoffeeinstitute.co.ke
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      background: 'rgba(16, 185, 129, 0.25)',
                      color: '#34D399',
                    }}
                  >
                    DOMAIN VERIFIED
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  Emails are securely dispatched via backend <strong>Supabase Edge Function (<code>send-resend-email</code>)</strong> using your verified domain. No sensitive API keys are exposed to the client browser.
                </p>
              </div>
            </div>

            {/* Saved Toast */}
            {configSavedToast && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid #10B981',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  color: '#34D399',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Check size={16} />
                <span>Sender settings saved successfully!</span>
              </div>
            )}

            {/* Configuration Form */}
            <form onSubmit={handleSaveResendConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                    Authorized Sender Email
                  </label>
                  <input
                    type="email"
                    value={fromEmailInput}
                    onChange={(e) => setFromEmailInput(e.target.value)}
                    placeholder="noreply@aureviacoffeeinstitute.co.ke"
                    className="input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
                    Using verified domain: <code>@aureviacoffeeinstitute.co.ke</code>
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={fromNameInput}
                    onChange={(e) => setFromNameInput(e.target.value)}
                    placeholder="Aurevia Specialty Coffee Academy"
                    className="input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
                    Appears in student email inbox headers.
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                  Reply-To Email Address
                </label>
                <input
                  type="email"
                  value={replyToInput}
                  onChange={(e) => setReplyToInput(e.target.value)}
                  placeholder="info@aureviacoffeeinstitute.co.ke"
                  className="input"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Key size={15} />
                  <span>Save Sender Identity</span>
                </button>
              </div>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

            {/* Diagnostic Live Test Section */}
            <div
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} color="var(--crema-gold)" />
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  Live Gateway Diagnostic & Test Dispatch
                </h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                Trigger an immediate test ping email using the current configuration to verify deliverability.
              </p>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="email"
                  value={testRecipientEmail}
                  onChange={(e) => setTestRecipientEmail(e.target.value)}
                  placeholder="Enter your email to receive test ping"
                  className="input"
                  style={{ flex: 1, minWidth: '220px', fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleTestResend}
                  disabled={isTestingResend || !testRecipientEmail}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    fontSize: '0.85rem',
                    borderColor: 'var(--crema-gold)',
                  }}
                >
                  <RefreshCw size={15} className={isTestingResend ? 'animate-spin' : ''} />
                  <span>{isTestingResend ? 'Testing Delivery...' : 'Dispatch Test Email'}</span>
                </button>
              </div>

              {testResult && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    lineHeight: '1.45',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    background: testResult.success
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                    border: testResult.success
                      ? '1px solid rgba(16, 185, 129, 0.4)'
                      : '1px solid rgba(239, 68, 68, 0.4)',
                    color: testResult.success ? '#34D399' : '#FCA5A5',
                  }}
                >
                  {testResult.success ? (
                    <CheckCircle2 size={18} color="#34D399" style={{ flexShrink: 0, marginTop: '1px' }} />
                  ) : (
                    <AlertTriangle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {testResult.success ? 'Diagnostic Delivery Succeeded' : 'Diagnostic Delivery Warning'}
                    </div>
                    <div>{testResult.message}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Setup Guide Accordion */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.5',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={14} color="var(--crema-gold)" />
                <span>Automated Email Workflows Supported:</span>
              </div>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                <li><strong>New Student Admission:</strong> Automatically delivers the formal admission letter with student ID, course details, cohorts, and Google Meet portal theory links upon enrollment.</li>
                <li><strong>M-Pesa Tuition Receipts:</strong> Dispatches official payment receipts with transaction IDs, amounts, and remaining balances whenever an invoice payment is logged.</li>
                <li><strong>Signed Legal Agreements:</strong> Sends timestamped verification copies when students digitally sign terms, codes of conduct, or media consents.</li>
                <li><strong>Omnichannel Broadcasts:</strong> Dispatches emails and SMS to filtered student audiences directly from this Communications Hub.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
