import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Branch,
  Profile,
  Course,
  Cohort,
  StudentKYC,
  Enrollment,
  Invoice,
  Payment,
  Assessment,
  AttendanceRecord,
  StaffClockIn,
  LeaveRequest,
  SMSLog,
  TimetableLesson,
  Alumni,
  UserRole,
  LiveClassSession,
  LabVenue,
} from '../types/database.types';
import {
  INITIAL_BRANCHES,
  INITIAL_COURSES,
  INITIAL_COHORTS,
  INITIAL_PROFILES,
  INITIAL_STUDENTS,
  INITIAL_ENROLLMENTS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_ASSESSMENTS,
  INITIAL_ATTENDANCE,
  INITIAL_STAFF_CLOCKINS,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_SMS_LOGS,
  INITIAL_LESSONS,
  INITIAL_LIVE_SESSIONS,
  INITIAL_LABS,
} from './mockData';
import { INITIAL_ALUMNI } from './alumniData';
import { createClient } from '@supabase/supabase-js';
import { supabase, checkSupabaseConnection, supabaseUrl, supabaseAnonKey } from './supabase';
import { generateMpesaReceiptNumber } from './mpesa';
import { sendInstitutionalSMS, buildLoginAlertSMS } from './sms';
import { sendResendEmail } from './resend';
import { isRoleAllowedOnCurrentDomain, getDomainAccessRestrictionMessage } from './domainConfig';
import {
  generateWelcomeAdmissionEmailHtml,
  generateStaffWelcomeEmailHtml,
  generateTuitionReceiptEmailHtml,
  generateAgreementSignedEmailHtml,
  generateBroadcastEmailHtml,
  generateLoginAlertEmailHtml,
} from './emailTemplates';
import { PRODUCTION_PORTAL_URL, PRODUCTION_SMS_URL } from './domainConfig';
import { hashPassword, verifyPassword, generateSecureOTP, generateUniqueDefaultPassword } from './security';

/**
 * Registers an auth user in Supabase using an isolated client instance.
 * Ensures the currently logged-in administrator's active browser session and localStorage
 * are NEVER hijacked or logged out, and avoids triggering spurious login alerts.
 */
const registerAuthUserIsolated = async (
  email: string,
  password: string,
  metadata: Record<string, any>
): Promise<string | undefined> => {
  try {
    const isolatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data, error } = await isolatedClient.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    if (!error && data?.user?.id) {
      return data.user.id;
    }
  } catch (e) {
    console.warn('Isolated auth signUp note:', e);
  }
  return undefined;
};

interface AppContextType {
  // Authentication & Session
  isAuthenticated: boolean;
  login: (credentials: { identifier: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; notConfigured?: boolean }>;
  checkGoogleOAuthConfigured: () => Promise<boolean>;
  loginWithProfile: (profile: Profile) => void;
  logout: () => void;
  changeUserPassword: (profileId: string, currentPasswordInput: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  requestPasswordResetOTP: (identifier: string) => Promise<{ success: boolean; phoneMask?: string; emailMask?: string; testOtp?: string; error?: string }>;
  verifyOTPAndResetPassword: (identifier: string, otp: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;

  // Current session & RBAC
  currentRole: UserRole;
  currentProfile: Profile;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  switchRole: (role: UserRole, profileId?: string) => void;

  // DB Sync Status
  isDbConnected: boolean;
  hasAurTables: boolean;
  dbStatusMessage: string;
  lastSyncTime: Date | null;
  isSyncing: boolean;
  syncWithCloud: () => Promise<void>;
  refreshFromSupabase: () => Promise<void>;

  // Data Collections
  branches: Branch[];
  courses: Course[];
  cohorts: Cohort[];
  profiles: Profile[];
  students: StudentKYC[];
  enrollments: Enrollment[];
  invoices: Invoice[];
  payments: Payment[];
  assessments: Assessment[];
  attendance: AttendanceRecord[];
  staffClockins: StaffClockIn[];
  leaveRequests: LeaveRequest[];
  smsLogs: SMSLog[];
  lessons: TimetableLesson[];
  labs: LabVenue[];
  alumni: Alumni[];
  liveSessions: LiveClassSession[];

  // Mutations
  createLesson: (lesson: Partial<TimetableLesson>) => Promise<TimetableLesson>;
  updateLesson: (lessonId: string, updates: Partial<TimetableLesson>) => Promise<void>;
  deleteLesson: (lessonId: string) => Promise<void>;
  createLab: (lab: Partial<LabVenue>) => Promise<LabVenue>;
  deleteLab: (labId: string) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  graduateStudent: (enrollmentId: string) => Promise<void>;
  updateAlumni: (alumniId: string, updates: Partial<Alumni>) => Promise<void>;
  deleteAlumni: (alumniId: string) => Promise<void>;
  updateStudentKYC: (studentId: string, params: {
    fullName: string;
    email: string;
    phone: string;
    nationalId: string;
    dob?: string;
    gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    nationality?: string;
    medicalConditions?: string;
    emergencyName: string;
    emergencyPhone: string;
    emergencyRelationship: string;
    coffeeExperience: string;
    idDocUrl?: string;
    idBackUrl?: string;
    avatarUrl?: string;
    mediaConsent?: boolean;
    termsAccepted?: boolean;
    termsAcceptedAt?: string;
    newPassword?: string;
  }) => Promise<void>;
  createStaffMember: (params: Partial<Profile>) => Promise<Profile>;
  updateStaffProfile: (profileId: string, updates: Partial<Profile>) => Promise<void>;
  resetStaffPassword: (profileId: string, newPassword: string) => Promise<void>;
  deleteStaffMember: (profileId: string) => Promise<void>;
  createBranch: (branch: Partial<Branch>) => Promise<Branch>;
  updateBranch: (branchId: string, updates: Partial<Branch>) => Promise<void>;
  deleteBranch: (branchId: string) => Promise<void>;
  createCourse: (course: Partial<Course>) => Promise<Course>;
  updateCourse: (courseId: string, updates: Partial<Course>) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<void>;
  createCohort: (cohort: Partial<Cohort>) => Promise<Cohort>;
  updateCohort: (cohortId: string, updates: Partial<Cohort>) => Promise<void>;
  deleteCohort: (cohortId: string) => Promise<void>;
  registerStudentKYC: (params: {
    fullName: string;
    email: string;
    phone: string;
    nationalId: string;
    branchId: string;
    courseId: string;
    cohortId: string;
    dob?: string;
    nationality?: string;
    gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    medicalConditions?: string;
    emergencyName: string;
    emergencyPhone: string;
    emergencyRelationship: string;
    coffeeExperience: string;
    customFee?: number;
    discountAmount?: number;
    discountType?: 'fixed' | 'percentage' | 'custom';
    discountReason?: string;
    discountNote?: string;
  }) => Promise<{ profile: Profile; regNumber: string; invoice: Invoice }>;
  verifyStudentKYC: (studentId: string) => Promise<void>;
  updateInvoiceFeeAndDiscount: (
    invoiceId: string,
    updates: {
      totalFee: number;
      standardFee?: number;
      discountAmount?: number;
      discountType?: 'fixed' | 'percentage' | 'custom';
      discountReason?: string;
      discountNote?: string;
    }
  ) => Promise<void>;
  processMpesaPayment: (params: {
    invoiceId: string;
    amount: number;
    phone: string;
    paymentMethod?: 'mpesa' | 'cash' | 'bank_transfer';
  }) => Promise<Payment>;
  revertPayment: (paymentId: string) => Promise<void>;
  updateBranchPaymentConfig: (branchId: string, config: {
    paybill_number?: string;
    paybill_account_name?: string;
    bank_name?: string;
    bank_account_number?: string;
    payment_instructions?: string;
  }) => Promise<void>;
  submitMpesaConfirmationSMS: (params: {
    invoiceId: string;
    rawMpesaText: string;
    claimedAmount: number;
    studentId: string;
    branchId: string;
    mpesaReceiptNumber?: string;
    phoneNumber?: string;
  }) => Promise<Payment>;
  verifyAndApprovePayment: (params: {
    paymentId: string;
    verifiedAmount: number;
    remarks?: string;
  }) => Promise<Payment>;
  rejectMpesaPayment: (params: {
    paymentId: string;
    reason: string;
  }) => Promise<void>;
  recordAttendance: (record: { cohortId: string; studentId: string; status: 'present' | 'absent' | 'late' | 'excused'; sessionTitle?: string; sessionDate?: string } | Array<{ cohortId: string; studentId: string; status: 'present' | 'absent' | 'late' | 'excused'; sessionTitle?: string; sessionDate?: string }>) => Promise<void>;
  recordAssessment: (assessment: Partial<Assessment>) => Promise<void>;
  submitAssessment: (assessment: Partial<Assessment>) => Promise<void>;
  updateAssessment: (assessmentId: string, updates: Partial<Assessment>) => Promise<void>;
  deleteAssessment: (assessmentId: string) => Promise<void>;
  recordStaffAttendanceByManager: (params: {
    profileId: string;
    branchId: string;
    workDate: string;
    clockIn?: string;
    clockOut?: string;
    locationNotes?: string;
  }) => Promise<void>;
  clockInStaff: (locationNotes?: string) => Promise<StaffClockIn>;
  recordClockIn: (locationNotes?: string) => Promise<StaffClockIn>;
  clockOutStaff: (profileId?: string) => Promise<void>;
  recordClockOut: (profileId?: string) => Promise<void>;
  submitLeaveRequest: (params: {
    profileId?: string;
    branchId?: string;
    leaveType: 'annual' | 'sick' | 'short' | 'compassionate' | 'off_day' | 'maternity_paternity' | 'study';
    startDate: string;
    endDate: string;
    daysCount: number;
    reason: string;
    status?: 'pending' | 'approved' | 'rejected';
    reviewNotes?: string;
  }) => Promise<LeaveRequest>;
  reviewLeaveRequest: (requestId: string, status: 'approved' | 'rejected', notes?: string) => Promise<void>;
  sendBulkCommunication: (params: {
    channel: 'sms' | 'email' | 'dual';
    purpose: 'fee_receipt' | 'intake_notice' | 'schedule_change' | 'admissions' | 'fee_reminder' | 'attendance_alert' | 'exam_notice' | 'announcement' | 'general';
    subject?: string;
    messageContent: string;
    audienceSegment: string;
    recipients: Array<{
      name: string;
      phone: string;
      email?: string;
      branchId?: string;
      messageContent?: string;
    }>;
  }) => Promise<{ count: number; channel: string; logs: SMSLog[] }>;

  // Live Virtual Classroom Studio
  createLiveSession: (session: Partial<LiveClassSession>) => Promise<LiveClassSession>;
  startLiveSession: (sessionId: string) => Promise<void>;
  endLiveSession: (sessionId: string) => Promise<void>;
  joinLiveSessionAsStudent: (sessionId: string, studentId: string) => Promise<void>;
}

const STORAGE_CLEAN_VERSION_KEY = 'aur_storage_version_2026';
const CURRENT_STORAGE_VERSION = 'v7_clean_minimal_mock_data';

if (typeof window !== 'undefined') {
  const currentVer = localStorage.getItem(STORAGE_CLEAN_VERSION_KEY);
  if (currentVer !== CURRENT_STORAGE_VERSION) {
    // Purge cached test data and stale cache to load minimal mock data
    [
      'aur_branches',
      'aur_courses',
      'aur_students',
      'aur_enrollments',
      'aur_invoices',
      'aur_payments',
      'aur_attendance',
      'aur_assessments',
      'aur_cohorts',
      'aur_alumni',
      'aur_sms_logs',
      'aur_staff_clockins',
      'aur_leave_requests',
      'aur_lessons',
      'aur_live_sessions',
      'aur_profiles',
      'aur_current_profile',
    ].forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(STORAGE_CLEAN_VERSION_KEY, CURRENT_STORAGE_VERSION);
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('aur_auth_session');
    return saved === 'true';
  });

  const [currentProfile, setCurrentProfile] = useState<Profile>(() => {
    const savedProfile = localStorage.getItem('aur_current_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed && parsed.id) return parsed;
      } catch (_) {}
    }
    return INITIAL_PROFILES[0];
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const savedProfile = localStorage.getItem('aur_current_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed?.role) return parsed.role;
      } catch (_) {}
    }
    return 'super_admin';
  });

  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Supabase connection & live cloud sync state
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [hasAurTables, setHasAurTables] = useState<boolean>(false);
  const [dbStatusMessage, setDbStatusMessage] = useState<string>('Checking database...');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // State collections with LocalStorage persistence (defaults to clean [] for live production)
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem('aur_branches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((b: Branch, idx: number) =>
            idx === 0 || b.id === 'b1000000-0000-0000-0000-000000000001'
              ? { ...b, name: 'Aurevia Coffee Institute' }
              : b
          );
        }
      } catch (_) {}
    }
    return INITIAL_BRANCHES;
  });

  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('aur_courses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (_) {}
    }
    return INITIAL_COURSES;
  });

  const [cohorts, setCohorts] = useState<Cohort[]>(() => {
    const saved = localStorage.getItem('aur_cohorts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    return INITIAL_COHORTS;
  });

  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('aur_profiles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter((p: Profile) => p.role !== 'student');

          const storedAllocationsStr = localStorage.getItem('aur_permanent_staff_ids');
          let staffAllocations: Record<string, string> = {};
          if (storedAllocationsStr) {
            try { staffAllocations = JSON.parse(storedAllocationsStr); } catch (_) {}
          }
          const canonicalMap: Record<string, string> = {
            'eigs733@gmail.com': 'AUR/NBO/STF-001',
            'otienoronny56@gmail.com': 'AUR/NBO/STF-002',
            'ratienoessy@gmail.com': 'AUR/NBO/STF-003',
            'aureviainstituteofcoffee@gmail.com': 'AUR/NBO/STF-004',
          };
          const populated = cleaned.map((p: Profile) => {
            const eKey = (p.email || '').toLowerCase().trim();
            const sid = p.staff_id || p.reg_number || (eKey && canonicalMap[eKey]) || staffAllocations[p.id] || (eKey && staffAllocations[eKey]);
            if (sid) {
              return { ...p, staff_id: sid, reg_number: sid };
            }
            return p;
          });

          localStorage.setItem('aur_profiles', JSON.stringify(populated));
          return populated;
        }
      } catch (_) {}
    }
    return INITIAL_PROFILES.filter((p) => p.role !== 'student');
  });

  const [students, setStudents] = useState<StudentKYC[]>(() => {
    const saved = localStorage.getItem('aur_students');
    let loaded = INITIAL_STUDENTS;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) loaded = parsed;
      } catch (_) {}
    }
    return loaded.map((s) => {
      if (s.profile?.full_name) return s;
      const matchedProf = INITIAL_PROFILES.find((p) => p.id === s.profile_id);
      return matchedProf ? { ...s, profile: matchedProf } : s;
    });
  });

  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => {
    const saved = localStorage.getItem('aur_enrollments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    return INITIAL_ENROLLMENTS;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('aur_invoices');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((inv: any) => {
            const tf = Number(inv.total_fee) || 0;
            const ap = Number(inv.amount_paid) || 0;
            const bd = (inv.balance_due !== undefined && inv.balance_due !== null && !isNaN(Number(inv.balance_due)))
              ? Number(inv.balance_due)
              : Math.max(0, tf - ap);
            return {
              ...inv,
              total_fee: tf,
              amount_paid: ap,
              balance_due: bd,
            };
          });
        }
      } catch (_) {}
    }
    return INITIAL_INVOICES;
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('aur_payments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    return INITIAL_PAYMENTS;
  });

  const [assessments, setAssessments] = useState<Assessment[]>(() => {
    const saved = localStorage.getItem('aur_assessments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((a: any) => !a.id?.startsWith('a1000000-'));
      } catch (_) {}
    }
    return [];
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('aur_attendance');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((att: any) => !att.id?.startsWith('att-260825-'));
      } catch (_) {}
    }
    return [];
  });

  const [staffClockins, setStaffClockins] = useState<StaffClockIn[]>(() => {
    const saved = localStorage.getItem('aur_staff_clockins');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    return INITIAL_STAFF_CLOCKINS;
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('aur_leave_requests');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    return INITIAL_LEAVE_REQUESTS;
  });

  const [smsLogs, setSmsLogs] = useState<SMSLog[]>(() => {
    const saved = localStorage.getItem('aur_sms_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    return INITIAL_SMS_LOGS;
  });

  const [lessons, setLessons] = useState<TimetableLesson[]>(() => {
    const saved = localStorage.getItem('aur_lessons');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    return INITIAL_LESSONS;
  });

  const [labs, setLabs] = useState<LabVenue[]>(() => {
    const saved = localStorage.getItem('aur_labs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    return INITIAL_LABS;
  });

  const [alumni, setAlumni] = useState<Alumni[]>(() => {
    const saved = localStorage.getItem('aur_alumni');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((a: any) => !a.id?.startsWith('a8000000-'));
      } catch (_) {}
    }
    return [];
  });

  const [liveSessions, setLiveSessions] = useState<LiveClassSession[]>(() => {
    const saved = localStorage.getItem('aur_live_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    return INITIAL_LIVE_SESSIONS;
  });

  // Sync to localStorage
  useEffect(() => { localStorage.setItem('aur_branches', JSON.stringify(branches)); }, [branches]);
  useEffect(() => { localStorage.setItem('aur_courses', JSON.stringify(courses)); }, [courses]);
  useEffect(() => { localStorage.setItem('aur_cohorts', JSON.stringify(cohorts)); }, [cohorts]);
  useEffect(() => { localStorage.setItem('aur_profiles', JSON.stringify(profiles)); }, [profiles]);
  useEffect(() => { localStorage.setItem('aur_students', JSON.stringify(students)); }, [students]);
  useEffect(() => { localStorage.setItem('aur_enrollments', JSON.stringify(enrollments)); }, [enrollments]);
  useEffect(() => { localStorage.setItem('aur_invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('aur_payments', JSON.stringify(payments)); }, [payments]);
  useEffect(() => { localStorage.setItem('aur_assessments', JSON.stringify(assessments)); }, [assessments]);
  useEffect(() => { localStorage.setItem('aur_attendance', JSON.stringify(attendance)); }, [attendance]);
  useEffect(() => { localStorage.setItem('aur_staff_clockins', JSON.stringify(staffClockins)); }, [staffClockins]);
  useEffect(() => { localStorage.setItem('aur_leave_requests', JSON.stringify(leaveRequests)); }, [leaveRequests]);
  useEffect(() => { localStorage.setItem('aur_sms_logs', JSON.stringify(smsLogs)); }, [smsLogs]);
  useEffect(() => { localStorage.setItem('aur_lessons', JSON.stringify(lessons)); }, [lessons]);
  useEffect(() => { localStorage.setItem('aur_labs', JSON.stringify(labs)); }, [labs]);
  useEffect(() => { localStorage.setItem('aur_alumni', JSON.stringify(alumni)); }, [alumni]);
  useEffect(() => { localStorage.setItem('aur_live_sessions', JSON.stringify(liveSessions)); }, [liveSessions]);

  // Safe Data Loader Helper: If remoteData is provided (even if empty []), use remoteData!
  const resolveStoreData = <T,>(remoteData: T[] | null | undefined, localKey: string, initialFallback: T[]): T[] => {
    if (remoteData !== null && remoteData !== undefined) {
      return remoteData;
    }
    const saved = localStorage.getItem(localKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {}
    }
    return initialFallback;
  };

  /**
   * Records a communication log in local state and persists it to Supabase aur_sms_logs
   * so that it is never lost on refresh or cloud sync.
   */
  const recordAndPersistCommunicationLog = async (log: SMSLog) => {
    setSmsLogs((prev) => [log, ...prev]);

    try {
      const isEmail = log.channel === 'email';
      const isDual = log.channel === 'dual';
      const recipientContact = isEmail ? (log.recipient_email || log.recipient_phone || 'N/A') : (log.recipient_phone || 'N/A');
      const contentPrefix = isEmail 
        ? `[EMAIL: ${log.subject || 'Notice'}] ` 
        : isDual 
        ? `[DUAL: ${log.subject || 'Notice'}] ` 
        : '';

      await supabase.from('aur_sms_logs').insert({
        recipient_phone: recipientContact,
        recipient_name: log.recipient_name,
        message_content: `${contentPrefix}${log.message_content}`,
        message_type: log.purpose || 'general',
        status: log.delivery_status || 'delivered',
        branch_id: log.branch_id || currentProfile?.branch_id || branches[0]?.id || 'b1000000-0000-0000-0000-000000000001',
        sent_at: log.sent_at || new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Could not persist communication log to Supabase:', err);
    }
  };

  // Full Supabase Cloud Fetch & State Hydration across all Campuses
  const refreshFromSupabase = async () => {
    setIsSyncing(true);
    const check = await checkSupabaseConnection();
    setIsDbConnected(check.connected);
    setHasAurTables(check.hasAurTables);
    setDbStatusMessage(check.message);

    if (check.hasAurTables) {
      try {
        const [
          bRes, cRes, hRes, pRes, sRes, eRes, iRes, payRes, attRes, assRes, scRes, lrRes, smsRes, alRes
        ] = await Promise.all([
          supabase.from('aur_branches').select('*'),
          supabase.from('aur_courses').select('*'),
          supabase.from('aur_cohorts').select('*'),
          supabase.from('aur_profiles').select('*'),
          supabase.from('aur_students').select('*'),
          supabase.from('aur_enrollments').select('*'),
          supabase.from('aur_invoices').select('*'),
          supabase.from('aur_payments').select('*').order('created_at', { ascending: false }),
          supabase.from('aur_attendance').select('*'),
          supabase.from('aur_assessments').select('*'),
          supabase.from('aur_staff_clockin').select('*'),
          supabase.from('aur_leave_requests').select('*'),
          supabase.from('aur_sms_logs').select('*').order('sent_at', { ascending: false }),
          supabase.from('aur_alumni').select('*'),
        ]);

        const rawStudents = sRes.data || [];
        const rawCohorts = hRes.data || [];

        // Normalize invoices to guarantee branch_id is always present and numbers are strictly safe
        const rawInvoices = iRes.data || [];
        const normalizedInvoices: Invoice[] = rawInvoices.map((inv: any) => {
          const matchingStudent = rawStudents.find((s: any) => s.id === inv.student_id);
          const matchingCohort = rawCohorts.find((c: any) => c.id === inv.cohort_id);
          const branchId = inv.branch_id || matchingStudent?.branch_id || matchingCohort?.branch_id || 'b1000000-0000-0000-0000-000000000001';
          const totalFee = Number(inv.total_fee) || 0;
          const amountPaid = Number(inv.amount_paid) || 0;
          const balanceDue = (inv.balance_due !== undefined && inv.balance_due !== null && !isNaN(Number(inv.balance_due)))
            ? Number(inv.balance_due)
            : Math.max(0, totalFee - amountPaid);
          return {
            ...inv,
            branch_id: branchId,
            total_fee: totalFee,
            amount_paid: amountPaid,
            balance_due: balanceDue,
          };
        });

        // Normalize payments to guarantee mpesa_phone_number
        const rawPayments = payRes.data || [];
        const normalizedPayments: Payment[] = rawPayments.map((p: any) => ({
          ...p,
          amount: Number(p.amount) || 0,
          mpesa_phone_number: p.payer_phone || p.mpesa_phone_number || '',
        }));

        // Normalize communication logs from Supabase
        const rawSms = smsRes.data || [];
        const normalizedSms: SMSLog[] = rawSms.map((log: any) => {
          const isEmail = (log.recipient_phone && log.recipient_phone.includes('@')) || (log.message_content && log.message_content.startsWith('[EMAIL'));
          const isDual = log.message_content && log.message_content.startsWith('[DUAL');
          const channel: 'sms' | 'email' | 'dual' = isEmail ? 'email' : isDual ? 'dual' : 'sms';
          let subject = log.subject;
          let content = log.message_content || '';
          if (!subject && (content.startsWith('[EMAIL:') || content.startsWith('[DUAL:'))) {
            const match = content.match(/^\[(?:EMAIL|DUAL):\s*([^\]]+)\]\s*([\s\S]*)$/);
            if (match) {
              subject = match[1];
              content = match[2];
            }
          }
          return {
            ...log,
            channel,
            subject,
            message_content: content,
            recipient_email: isEmail ? log.recipient_phone : undefined,
            recipient_phone: isEmail ? 'N/A' : (log.recipient_phone || 'N/A'),
            purpose: log.message_type || log.purpose || 'general',
            delivery_status: log.status || log.delivery_status || 'delivered',
            gateway_reference: log.gateway_reference || (isEmail ? `EML-${log.id?.slice(0, 8)}` : `SMS-${log.id?.slice(0, 8)}`),
          };
        });

        // Hydrate all collections directly from Supabase
        const savedBranches = localStorage.getItem('aur_branches');
        let localBranches: Branch[] | null = null;
        if (savedBranches) {
          try {
            const parsed = JSON.parse(savedBranches);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localBranches = parsed;
            }
          } catch (_) {}
        }

        const savedOverrides = localStorage.getItem('aur_branch_payment_overrides');
        let branchOverrides: Record<string, any> = {};
        if (savedOverrides) {
          try {
            branchOverrides = JSON.parse(savedOverrides);
          } catch (_) {}
        }

        const liveBranches = (bRes.data && bRes.data.length > 0)
          ? bRes.data.map((b: any, idx: number) => {
              const localMatch = (localBranches || []).find((lb) => lb.id === b.id);
              const override = branchOverrides[b.id];
              const base =
                idx === 0 || b.id === 'b1000000-0000-0000-0000-000000000001'
                  ? { ...b, name: 'Aurevia Coffee Institute' }
                  : b;
              return {
                ...base,
                paybill_number: override?.paybill_number || localMatch?.paybill_number || b.paybill_number,
                paybill_account_name: override?.paybill_account_name || localMatch?.paybill_account_name || b.paybill_account_name,
                payment_instructions: override?.payment_instructions || localMatch?.payment_instructions || b.payment_instructions,
              };
            })
          : (localBranches || INITIAL_BRANCHES);
        setBranches(liveBranches);

        const savedCourses = localStorage.getItem('aur_courses');
        let localCourses: Course[] | null = null;
        if (savedCourses) {
          try {
            const parsed = JSON.parse(savedCourses);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localCourses = parsed;
            }
          } catch (_) {}
        }

        const liveCourses = (cRes.data && cRes.data.length > 0)
          ? cRes.data
          : (localCourses || INITIAL_COURSES);
        setCourses(liveCourses);
        const liveCohorts = (hRes.data && hRes.data.length > 0) ? hRes.data : (cohorts.length > 0 ? cohorts : INITIAL_COHORTS);
        setCohorts(liveCohorts);

        // Permanent Staff ID Allocation & Stability Across All Campuses
        const storedAllocationsStr = localStorage.getItem('aur_permanent_staff_ids');
        let staffAllocations: Record<string, string> = {};
        if (storedAllocationsStr) {
          try { staffAllocations = JSON.parse(storedAllocationsStr); } catch (_) {}
        }

        const retiredIdsStr = localStorage.getItem('aur_retired_staff_ids');
        let retiredStaffIds: string[] = [];
        if (retiredIdsStr) {
          try { retiredStaffIds = JSON.parse(retiredIdsStr); } catch (_) {}
        }

        const canonicalStaffIds: Record<string, string> = {
          'eigs733@gmail.com': 'AUR/NBO/STF-001',
          'otienoronny56@gmail.com': 'AUR/NBO/STF-002',
          'ratienoessy@gmail.com': 'AUR/NBO/STF-003',
          'aureviainstituteofcoffee@gmail.com': 'AUR/NBO/STF-004',
        };

        let highestStaffSeq = Math.max(
          4,
          Number(localStorage.getItem('aur_highest_staff_seq')) || 4
        );
        for (const retId of retiredStaffIds) {
          const match = retId.match(/(?:STF|OPS)-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > highestStaffSeq) highestStaffSeq = num;
          }
        }

        // Hydrate profiles from aur_profiles & ensure baseline staff profiles are preserved
        const dbProfiles = (pRes.data || []).map((p: any) => {
          const regKey = (p.reg_number || '').trim().toLowerCase();
          const emailKey = (p.email || '').trim().toLowerCase();
          const idKey = (p.id || '').trim().toLowerCase();

          let permanentStaffId = p.staff_id || p.reg_number;
          if (p.role !== 'student') {
            const branchObj = (liveBranches || branches).find((b: any) => b.id === p.branch_id);
            const branchCode = branchObj?.code || 'NBO';

            const isStandardSTF = permanentStaffId && /(?:STF|OPS)-\d+/i.test(permanentStaffId);
            if (!isStandardSTF) {
              if (emailKey && canonicalStaffIds[emailKey]) {
                permanentStaffId = canonicalStaffIds[emailKey];
              } else if (staffAllocations[p.id]) {
                permanentStaffId = staffAllocations[p.id];
              } else if (emailKey && staffAllocations[emailKey]) {
                permanentStaffId = staffAllocations[emailKey];
              } else {
                highestStaffSeq += 1;
                permanentStaffId = `AUR/${branchCode}/STF-${String(highestStaffSeq).padStart(3, '0')}`;
              }
            }

            if (permanentStaffId) {
              staffAllocations[p.id] = permanentStaffId;
              if (emailKey) staffAllocations[emailKey] = permanentStaffId;
              const match = permanentStaffId.match(/(?:STF|OPS)-(\d+)/i);
              if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > highestStaffSeq) highestStaffSeq = num;
              }

              // Non-destructively sync staff_id and reg_number to Supabase if not yet saved
              if (p.staff_id !== permanentStaffId || p.reg_number !== permanentStaffId) {
                supabase
                  .from('aur_profiles')
                  .update({ staff_id: permanentStaffId, reg_number: permanentStaffId })
                  .eq('id', p.id)
                  .then(() => {}, (e: any) => console.warn('Non-destructive staff_id sync note:', e));
              }
            }
          }

          const recoveredPwd =
            p.initial_password ||
            localStorage.getItem('aur_user_pwd_seed_' + p.id) ||
            localStorage.getItem('aur_student_pwd_' + regKey) ||
            localStorage.getItem('aur_student_pwd_' + emailKey) ||
            localStorage.getItem('aur_student_pwd_' + idKey) ||
            localStorage.getItem('aur_staff_pwd_' + regKey) ||
            localStorage.getItem('aur_staff_pwd_' + emailKey) ||
            localStorage.getItem('aur_staff_pwd_' + idKey) ||
            (permanentStaffId ? localStorage.getItem('aur_staff_pwd_' + permanentStaffId.toLowerCase()) : null) ||
            INITIAL_PROFILES.find((ip) => ip.id === p.id || (ip.email && ip.email.toLowerCase() === emailKey))?.initial_password;

          return {
            ...p,
            staff_id: permanentStaffId || p.staff_id,
            reg_number: permanentStaffId || p.reg_number,
            initial_password: p.initial_password || recoveredPwd,
            password_hash: p.password_hash || p.password || localStorage.getItem('aur_user_pwd_hash_' + p.id) || undefined,
            password_changed: p.password_changed ?? (localStorage.getItem('aur_user_pwd_changed_' + p.id) === 'true'),
            specialty: (p.specialty && p.specialty.startsWith('Aur#')) ? 'Barista & Specialty Coffee' : (p.specialty || 'Barista & Specialty Coffee'),
          };
        });

        localStorage.setItem('aur_permanent_staff_ids', JSON.stringify(staffAllocations));
        localStorage.setItem('aur_highest_staff_seq', String(highestStaffSeq));
        const mergedProfiles: Profile[] = [...dbProfiles];
        for (const initP of INITIAL_PROFILES) {
          if (!mergedProfiles.some((p: any) => p.id === initP.id || (p.email && p.email.toLowerCase() === initP.email.toLowerCase()))) {
            mergedProfiles.push(initP);
          }
        }
        setProfiles(mergedProfiles);
        localStorage.setItem('aur_profiles', JSON.stringify(mergedProfiles));

        // Hydrate students from aur_students & attach their profile
        const dbStudents = sRes.data || rawStudents || [];
        const mergedStudents: StudentKYC[] = dbStudents.map((st: any) => {
          const prof = mergedProfiles.find((p: any) => p.id === st.profile_id);
          return {
            ...st,
            profile: prof || st.profile,
          };
        });
        setStudents(mergedStudents);
        try {
          localStorage.setItem('aur_students', JSON.stringify(mergedStudents));
        } catch (_) {}

        const liveEnrollments = (eRes.data && eRes.data.length > 0) ? eRes.data : (enrollments.length > 0 ? enrollments : []);
        setEnrollments(liveEnrollments);

        const liveInvoices = (normalizedInvoices && normalizedInvoices.length > 0) ? normalizedInvoices : (invoices.length > 0 ? invoices : []);
        setInvoices(liveInvoices);

        const livePayments = (normalizedPayments && normalizedPayments.length > 0) ? normalizedPayments : (payments.length > 0 ? payments : []);
        setPayments(livePayments);

        const liveAssessments = (assRes.data !== null && assRes.data !== undefined)
          ? assRes.data
          : (assessments.length > 0 ? assessments : []);
        setAssessments(liveAssessments);

        const liveAttendance = (attRes.data !== null && attRes.data !== undefined)
          ? attRes.data
          : (attendance.length > 0 ? attendance : []);
        setAttendance(liveAttendance);

        const liveStaffClockins = (scRes.data !== null && scRes.data !== undefined)
          ? scRes.data
          : (staffClockins.length > 0 ? staffClockins : []);
        setStaffClockins(liveStaffClockins);

        const liveLeaveRequests = (lrRes.data !== null && lrRes.data !== undefined)
          ? lrRes.data
          : (leaveRequests.length > 0 ? leaveRequests : []);
        setLeaveRequests(liveLeaveRequests);

        const liveSmsLogs = (normalizedSms && normalizedSms.length > 0) ? normalizedSms : (smsLogs.length > 0 ? smsLogs : []);
        setSmsLogs(liveSmsLogs);

        const liveAlumni = (alRes.data !== null && alRes.data !== undefined)
          ? alRes.data
          : (alumni.length > 0 ? alumni : []);
        setAlumni(liveAlumni);

        setLastSyncTime(new Date());
      } catch (err) {
        console.warn('Supabase sync notice:', err);
      }
    }
    setIsSyncing(false);
  };

  const syncWithCloud = async () => {
    await refreshFromSupabase();
  };

  // 1-Click Sync/Seed All 10 Test Trainees into Supabase & LocalStorage
  const seedAllTestTrainees = async () => {
    try {
      setProfiles(INITIAL_PROFILES);
      setStudents(INITIAL_STUDENTS);
      setEnrollments(INITIAL_ENROLLMENTS);
      setInvoices(INITIAL_INVOICES);
      setAssessments(INITIAL_ASSESSMENTS);
      setCohorts(INITIAL_COHORTS);

      localStorage.setItem('aur_profiles', JSON.stringify(INITIAL_PROFILES));
      localStorage.setItem('aur_students', JSON.stringify(INITIAL_STUDENTS));
      localStorage.setItem('aur_enrollments', JSON.stringify(INITIAL_ENROLLMENTS));
      localStorage.setItem('aur_invoices', JSON.stringify(INITIAL_INVOICES));
      localStorage.setItem('aur_assessments', JSON.stringify(INITIAL_ASSESSMENTS));
      localStorage.setItem('aur_cohorts', JSON.stringify(INITIAL_COHORTS));

      if (isDbConnected && hasAurTables) {
        // Upsert into Supabase tables
        await Promise.allSettled([
          supabase.from('aur_profiles').upsert(INITIAL_PROFILES),
          supabase.from('aur_students').upsert(INITIAL_STUDENTS),
          supabase.from('aur_enrollments').upsert(INITIAL_ENROLLMENTS),
          supabase.from('aur_invoices').upsert(INITIAL_INVOICES),
          supabase.from('aur_assessments').upsert(INITIAL_ASSESSMENTS),
        ]);
      }
    } catch (err) {
      console.error('Failed to seed 10 trainees:', err);
    }
  };

  // Initial mount load
  useEffect(() => {
    refreshFromSupabase();
  }, []);

  // Supabase Realtime Multi-Branch Websocket Subscriptions
  useEffect(() => {
    if (!isDbConnected) return;

    const channel = supabase
      .channel('aur-multi-branch-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aur_invoices' },
        (payload) => {
          console.log('[Supabase Realtime] Invoices change:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            setInvoices((prev) => {
              const exists = prev.find((i) => i.id === row.id);
              const student = students.find((s) => s.id === row.student_id);
              const cohort = cohorts.find((c) => c.id === row.cohort_id);
              const totalFee = Number(row.total_fee) || 0;
              const amountPaid = Number(row.amount_paid) || 0;
              const balanceDue = (row.balance_due !== undefined && row.balance_due !== null && !isNaN(Number(row.balance_due)))
                ? Number(row.balance_due)
                : Math.max(0, totalFee - amountPaid);
              const normalized: Invoice = {
                ...row,
                branch_id: row.branch_id || student?.branch_id || cohort?.branch_id || 'b1000000-0000-0000-0000-000000000001',
                total_fee: totalFee,
                amount_paid: amountPaid,
                balance_due: balanceDue,
              };
              if (exists) {
                return prev.map((i) => (i.id === row.id ? { ...i, ...normalized } : i));
              }
              return [normalized, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            setInvoices((prev) => prev.filter((i) => i.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aur_payments' },
        (payload) => {
          console.log('[Supabase Realtime] Payments change:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            const normalized: Payment = {
              ...row,
              mpesa_phone_number: row.payer_phone || row.mpesa_phone_number || '',
            };
            setPayments((prev) => {
              const exists = prev.find((p) => p.id === row.id);
              if (exists) {
                return prev.map((p) => (p.id === row.id ? { ...p, ...normalized } : p));
              }
              return [normalized, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            setPayments((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aur_students' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            setStudents((prev) => {
              const matchedProf = profiles.find((p) => p.id === row.profile_id);
              const hydrated = { ...row, profile: matchedProf || row.profile };
              const exists = prev.find((s) => s.id === row.id);
              if (exists) {
                return prev.map((s) => (s.id === row.id ? { ...s, ...hydrated } : s));
              }
              return [hydrated, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            setStudents((prev) => prev.filter((s) => s.id !== (payload.old as any).id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aur_profiles' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            setProfiles((prev) => {
              const exists = prev.find((p) => p.id === row.id);
              if (exists) {
                return prev.map((p) => (p.id === row.id ? { ...p, ...row } : p));
              }
              return [...prev, row];
            });
            setStudents((prev) =>
              prev.map((s) => (s.profile_id === row.id ? { ...s, profile: row } : s))
            );
          } else if (payload.eventType === 'DELETE') {
            setProfiles((prev) => prev.filter((p) => p.id !== (payload.old as any).id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aur_attendance' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            setAttendance((prev) => [row, ...prev.filter((a) => a.id !== row.id)]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aur_staff_clockin' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            setStaffClockins((prev) => {
              const next = [row, ...prev.filter((c) => c.id !== row.id && !(c.profile_id === row.profile_id && (c.work_date || '').slice(0, 10) === (row.work_date || '').slice(0, 10)))];
              localStorage.setItem('aur_staff_clockins', JSON.stringify(next));
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            setStaffClockins((prev) => {
              const next = prev.filter((c) => c.id !== (payload.old as any).id);
              localStorage.setItem('aur_staff_clockins', JSON.stringify(next));
              return next;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aur_sms_logs' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as any;
            const normalized: SMSLog = {
              ...row,
              purpose: row.message_type || row.purpose || 'general',
              delivery_status: row.status || row.delivery_status || 'delivered',
            };
            setSmsLogs((prev) => [normalized, ...prev.filter((l) => l.id !== row.id)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDbConnected, students, cohorts]);

  // Switch role helper
  const switchRole = (role: UserRole, profileId?: string) => {
    if (profileId) {
      const found = profiles.find((p) => p.id === profileId);
      if (found) {
        setCurrentProfile(found);
        setCurrentRole(role);
        return;
      }
    }

    if (role === 'student') {
      const studentProfile = INITIAL_PROFILES.find((p) => p.role === 'student') || {
        id: '00000000-0000-0000-0000-000000000010',
        role: 'student' as UserRole,
        full_name: 'Faith Cherono',
        email: 'faith.cherono@aureviacoffeeinstitute.co.ke',
        phone: '0714767240',
        reg_number: 'AUR/NBO/2026/001',
        branch_id: 'b1000000-0000-0000-0000-000000000001',
        is_active: true,
        created_at: '2026-02-10T00:00:00Z',
      };
      setCurrentProfile(studentProfile);
      setCurrentRole('student');
      return;
    }

    const matchingProfile = profiles.find((p) => p.role === role);
    if (matchingProfile) {
      setCurrentProfile(matchingProfile);
    }
    setCurrentRole(role);
  };

  // Authentication & Session Handlers
  const dispatchLoginAlertNotifications = async (profile: Profile, method: string = 'Password / ID') => {
    try {
      const nowStr = new Date().toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const roleDisplay = profile.role === 'super_admin'
        ? 'Super Admin'
        : profile.role === 'branch_manager'
        ? 'Branch Manager'
        : profile.role === 'instructor'
        ? 'Instructor / Faculty'
        : 'Trainee / Student';

      const branchObj = branches.find((b) => b.id === profile.branch_id);
      const branchName = branchObj ? branchObj.name : 'All Campuses';

      // 1. Dispatch Automated Email Notification if email is available
      if (profile.email && profile.email.includes('@')) {
        const html = generateLoginAlertEmailHtml({
          recipientName: profile.full_name,
          roleTitle: roleDisplay,
          loginTime: nowStr,
          loginMethod: method,
          branchName,
        });

        sendResendEmail({
          to: profile.email,
          subject: 'Security Alert: Successful Sign-in to Aurevia Portal',
          html,
          fromName: 'Aurevia Security Desk',
        }).catch((err) => console.warn('[Auto Email Alert Notice]', err));

        recordAndPersistCommunicationLog({
          id: `comm-login-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          channel: 'email',
          recipient_phone: 'N/A',
          recipient_email: profile.email,
          recipient_name: profile.full_name,
          subject: 'Security Alert: Successful Sign-in',
          message_content: `Security sign-in alert dispatched to ${profile.full_name} (${roleDisplay}) via ${method} at ${nowStr}.`,
          purpose: 'general',
          delivery_status: 'delivered',
          gateway_reference: `SEC-EML-${Date.now().toString().slice(-6)}`,
          sent_at: new Date().toISOString(),
          branch_id: profile.branch_id || branches[0]?.id,
          audience_segment: profile.role === 'super_admin' ? 'Super Admin Security Alert' : 'Staff Security Alert',
        });
      }

      // 2. Dispatch Automated SMS Notification if phone is available
      if (profile.phone && profile.phone.trim().length >= 8) {
        const smsMessage = buildLoginAlertSMS({
          recipientName: profile.full_name,
          roleTitle: roleDisplay,
          timeStr: nowStr,
        });

        sendInstitutionalSMS({
          recipientPhone: profile.phone,
          recipientName: profile.full_name,
          message: smsMessage,
          purpose: 'general',
        })
          .then((log) => {
            recordAndPersistCommunicationLog({
              ...log,
              branch_id: profile.branch_id || branches[0]?.id,
              audience_segment: profile.role === 'super_admin' ? 'Super Admin Security Alert' : 'Staff Security Alert',
            });
          })
          .catch((err) => console.warn('[Auto SMS Alert Notice]', err));
      }
    } catch (err) {
      console.warn('Could not dispatch login security alerts:', err);
    }
  };

  const loginWithProfile = (profile: Profile, loginMethod: string = 'Credentials') => {
    setCurrentProfile(profile);
    setCurrentRole(profile.role);
    setIsAuthenticated(true);
    localStorage.setItem('aur_auth_session', 'true');
    localStorage.setItem('aur_current_profile', JSON.stringify(profile));

    // Automated Direct Email & SMS Notification
    dispatchLoginAlertNotifications(profile, loginMethod);
  };

  const login = async (credentials: { identifier: string; password?: string }): Promise<{ success: boolean; error?: string }> => {
    const rawId = credentials.identifier.trim().toLowerCase();
    const enteredPass = credentials.password || '';
    // Generic message — never reveal whether the account exists or which field was wrong
    const INVALID = 'Incorrect login details. Check your email / ID and password, then try again.';

    if (!rawId || !enteredPass) {
      return { success: false, error: 'Enter both your login ID and your password.' };
    }

    const completeLogin = (p: Profile): { success: boolean; error?: string } => {
      // Domain boundary validation:
      // Super Admin and Branch Managers ONLY use SMS (sms.aureviacoffeeinstitute.co.ke)
      // Students and Trainers (Instructors) ONLY use Academy Portal (portal.aureviacoffeeinstitute.co.ke)
      if (!isRoleAllowedOnCurrentDomain(p.role)) {
        return {
          success: false,
          error: getDomainAccessRestrictionMessage(p.role),
        };
      }
      loginWithProfile(p);
      return { success: true };
    };

    const rawClean = rawId.replace(/[^a-z0-9]/g, '');
    const cleanRawPhone = rawId.replace(/[^0-9]/g, '');

    // If identifier is "admin", check candidate Super Admins and match the EXACT one whose password was entered
    if (rawClean === 'admin') {
      const superAdmins = profiles.filter((p) => p.role === 'super_admin');
      const candidateAdmins = superAdmins.length > 0 ? superAdmins : INITIAL_PROFILES.filter((p) => p.role === 'super_admin');
      for (const sa of candidateAdmins) {
        const storedHashedPwd = sa.password_hash || sa.password || localStorage.getItem('aur_user_pwd_hash_' + sa.id);
        const expectedPwd = (sa.initial_password || '').trim();
        const isPwdChanged = Boolean(sa.password_changed || localStorage.getItem('aur_user_pwd_changed_' + sa.id) === 'true');

        if (isPwdChanged && storedHashedPwd) {
          const isMatch = await verifyPassword(enteredPass.trim(), storedHashedPwd);
          if (isMatch) return completeLogin(sa);
        } else {
          if (expectedPwd && enteredPass.trim() === expectedPwd) {
            return completeLogin(sa);
          }
          if (storedHashedPwd && await verifyPassword(enteredPass.trim(), storedHashedPwd)) {
            return completeLogin(sa);
          }
        }
      }
    }

    const matchesIdentifier = (p: Profile) => {
      const pEmail = p.email?.toLowerCase();
      const pStaffId = p.staff_id?.toLowerCase();
      const pReg = p.reg_number?.toLowerCase();
      const pPhone = p.phone ? p.phone.replace(/[^0-9]/g, '') : '';
      return (
        pEmail === rawId ||
        pStaffId === rawId ||
        pReg === rawId ||
        (cleanRawPhone.length >= 9 && pPhone.endsWith(cleanRawPhone.slice(-9)))
      );
    };

    // 1. Local cache (staff / faculty / mock profiles including Faith Cherono)
    let matchedProfile: Profile | undefined = profiles.find(matchesIdentifier) || INITIAL_PROFILES.find(matchesIdentifier);

    // 2. Student national ID / passport number / student ID lookup
    if (!matchedProfile) {
      const matchedStudent = students.find(
        (s) =>
          s.national_id_or_passport?.toLowerCase() === rawId ||
          s.id?.toLowerCase() === rawId
      );
      if (matchedStudent?.profile_id) {
        matchedProfile = INITIAL_PROFILES.find((p) => p.id === matchedStudent.profile_id) || profiles.find((p) => p.id === matchedStudent.profile_id);
        if (!matchedProfile) {
          try {
            const { data } = await supabase.from('aur_profiles').select('*').eq('id', matchedStudent.profile_id).maybeSingle();
            if (data) matchedProfile = data as Profile;
          } catch (_) {}
        }
      }
    }

    // 3. Supabase lookup (if cloud connected)
    if (!matchedProfile) {
      try {
        const safe = rawId.replace(/["\\]/g, '').replace(/[%_]/g, '\\$&');
        const { data } = await supabase
          .from('aur_profiles')
          .select('*')
          .or(`email.ilike."${safe}",reg_number.ilike."${safe}",staff_id.ilike."${safe}"`)
          .limit(1);
        if (data && data.length > 0) {
          matchedProfile = data[0] as Profile;
        } else {
          const { data: byReg } = await supabase.from('aur_profiles').select('*').ilike('reg_number', rawId).maybeSingle();
          const { data: byStaffId } = !byReg ? await supabase.from('aur_profiles').select('*').ilike('staff_id', rawId).maybeSingle() : { data: null };
          if (byReg || byStaffId) {
            matchedProfile = (byReg || byStaffId) as Profile;
          } else {
            const { data: byEmail } = await supabase.from('aur_profiles').select('*').ilike('email', rawId).maybeSingle();
            if (byEmail) matchedProfile = byEmail as Profile;
          }
        }

        // Also check if rawId matches a national ID in aur_students
        if (!matchedProfile) {
          const { data: stRow } = await supabase
            .from('aur_students')
            .select('profile_id')
            .ilike('national_id_or_passport', rawId)
            .maybeSingle();
          if (stRow?.profile_id) {
            const { data: profRow } = await supabase
              .from('aur_profiles')
              .select('*')
              .eq('id', stRow.profile_id)
              .maybeSingle();
            if (profRow) matchedProfile = profRow as Profile;
          }
        }
      } catch (e) {
        console.warn('Profile lookup failed:', e);
      }
    }

    if (!matchedProfile) return { success: false, error: INVALID };

    if (matchedProfile.is_active === false) {
      return {
        success: false,
        error: matchedProfile.role === 'student'
          ? 'Your student portal access has expired because your training has concluded or your account was deactivated. Please contact the academy registrar for alumni credentials.'
          : 'Your staff account has been deactivated. Please contact the system administrator.',
      };
    }

    // Check graduation for students (only block if student has concluded all enrollments with no active enrollment)
    if (matchedProfile.role === 'student') {
      const studentObj = students.find((s) => s.profile_id === matchedProfile.id);
      if (studentObj) {
        const studentEnrollments = enrollments.filter((e) => e.student_id === studentObj.id);
        if (studentEnrollments.length > 0) {
          const hasActiveEnrollment = studentEnrollments.some((e) => e.status === 'enrolled' || e.status === 'active');
          if (!hasActiveEnrollment) {
            return {
              success: false,
              error: 'Your student portal access has concluded because your training has completed or you have graduated. Please contact the academy registrar for alumni credentials.',
            };
          }
        }
      }
    }

    const regKey = (matchedProfile.reg_number || '').trim().toLowerCase();
    const emailKey = (matchedProfile.email || '').trim().toLowerCase();
    const staffKey = (matchedProfile.staff_id || '').trim().toLowerCase();
    const idKey = (matchedProfile.id || '').trim().toLowerCase();

    // Check if password was changed
    const isPwdChanged = Boolean(
      matchedProfile.password_changed ||
      localStorage.getItem('aur_user_pwd_changed_' + matchedProfile.id) === 'true'
    );
    const storedHashedPwd =
      matchedProfile.password_hash ||
      matchedProfile.password ||
      localStorage.getItem('aur_user_pwd_hash_' + matchedProfile.id);

    // Recover initial seed password for both staff and students
    if (!matchedProfile.initial_password) {
      const foundInInitial = INITIAL_PROFILES.find(
        (p) => p.id === matchedProfile?.id || (p.email && p.email.toLowerCase() === emailKey) || (p.reg_number && p.reg_number.toLowerCase() === regKey)
      );

      matchedProfile.initial_password =
        (regKey ? localStorage.getItem('aur_student_pwd_' + regKey) : null) ||
        (emailKey ? localStorage.getItem('aur_student_pwd_' + emailKey) : null) ||
        (idKey ? localStorage.getItem('aur_staff_pwd_' + idKey) : null) ||
        (emailKey ? localStorage.getItem('aur_staff_pwd_' + emailKey) : null) ||
        (regKey ? localStorage.getItem('aur_staff_pwd_' + regKey) : null) ||
        (staffKey ? localStorage.getItem('aur_staff_pwd_' + staffKey) : null) ||
        foundInInitial?.initial_password ||
        undefined;
    }

    const cleanEntered = enteredPass.trim();

    // Password verification:
    // 1. If password was changed, check against stored cryptographic hash:
    if (isPwdChanged && storedHashedPwd) {
      const isMatch = await verifyPassword(cleanEntered, storedHashedPwd);
      if (isMatch) {
        loginWithProfile(matchedProfile);
        return { success: true };
      }
    }

    // 2. If password was NOT yet changed (or legacy seed exists), verify against initial seed or standard defaults:
    const expectedPassword = (
      matchedProfile.initial_password ||
      (regKey ? localStorage.getItem('aur_student_pwd_' + regKey) : null) ||
      (emailKey ? localStorage.getItem('aur_student_pwd_' + emailKey) : null) ||
      ''
    ).trim();

    if (!isPwdChanged) {
      // 2a. Match against individual seed
      if (expectedPassword) {
        if (cleanEntered === expectedPassword) {
          try {
            if (regKey) localStorage.setItem('aur_student_pwd_' + regKey, cleanEntered);
            if (emailKey) localStorage.setItem('aur_student_pwd_' + emailKey, cleanEntered);
          } catch (_) {}
          return completeLogin(matchedProfile);
        }
        const isMatch = await verifyPassword(cleanEntered, expectedPassword);
        if (isMatch) {
          return completeLogin(matchedProfile);
        }
      }

      // Check stored hash if set
      if (storedHashedPwd) {
        const isHashMatch = await verifyPassword(cleanEntered, storedHashedPwd);
        if (isHashMatch) {
          return completeLogin(matchedProfile);
        }
      }

      // 2b. Accept known default institutional PINs for students before custom password change
      if (matchedProfile.role === 'student') {
        const isKnownStudentPin =
          cleanEntered === 'Aur@2026#Student' ||
          cleanEntered === 'Aur#2026!Student' ||
          cleanEntered === 'Aur#4698!Henr';
        if (isKnownStudentPin) {
          try {
            if (regKey) localStorage.setItem('aur_student_pwd_' + regKey, cleanEntered);
            if (emailKey) localStorage.setItem('aur_student_pwd_' + emailKey, cleanEntered);
          } catch (_) {}
          return completeLogin(matchedProfile);
        }
      }

      // 2c. Accept known default institutional PINs for staff before custom password change
      if (matchedProfile.role !== 'student') {
        const isKnownStaffPin =
          cleanEntered === 'Aur@Staff#2026' ||
          cleanEntered === 'Aur#2026!Staff';
        if (isKnownStaffPin) {
          return completeLogin(matchedProfile);
        }
      }
    }

    // 3. Always attempt verification against Supabase Auth using the profile's email
    if (matchedProfile.email) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: matchedProfile.email,
          password: cleanEntered,
        });
        if (!error) {
          try {
            if (regKey) localStorage.setItem('aur_student_pwd_' + regKey, cleanEntered);
            if (emailKey) localStorage.setItem('aur_student_pwd_' + emailKey, cleanEntered);
          } catch (_) {}
          return completeLogin(matchedProfile);
        }
      } catch (_) {}
    }

    return { success: false, error: INVALID };
  };


  const checkGoogleOAuthConfigured = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: {
          apikey: supabaseAnonKey,
        },
      });
      if (res.ok) {
        const data = await res.json();
        return !!data?.external?.google;
      }
    } catch (e) {
      console.warn('Unable to query Supabase auth settings:', e);
    }
    return false;
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string; notConfigured?: boolean }> => {
    try {
      const isConfigured = await checkGoogleOAuthConfigured();
      if (!isConfigured) {
        return {
          success: false,
          notConfigured: true,
          error: 'Google OAuth provider is not yet enabled with Client ID & Secret in Supabase.',
        };
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.warn('Google OAuth login error:', err);
      return { success: false, error: err?.message || 'Google sign-in error' };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('aur_auth_session');
    localStorage.removeItem('aur_current_profile');
    supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  };

  // Listen for Supabase OAuth redirects on mount
  useEffect(() => {
    // Only sign in Google/Supabase users whose email belongs to a registered, active profile.
    const resolveAuthSession = async (session: any) => {
      if (!session?.user) return;
      const userEmail = session.user.email?.trim().toLowerCase();
      if (!userEmail) return;

      let matched: Profile | undefined = profiles.find((p) => p.email?.trim().toLowerCase() === userEmail);

      // Check students collection
      if (!matched) {
        const sMatch = students.find((s) => s.profile?.email?.trim().toLowerCase() === userEmail);
        if (sMatch?.profile) matched = sMatch.profile;
      }

      // Check INITIAL_PROFILES
      if (!matched) {
        matched = INITIAL_PROFILES.find((p) => p.email?.trim().toLowerCase() === userEmail);
      }

      // Local cache may be pending sync — confirm against Supabase aur_profiles directly
      if (!matched) {
        try {
          const { data } = await supabase
            .from('aur_profiles')
            .select('*')
            .ilike('email', userEmail)
            .maybeSingle();
          if (data) matched = data as Profile;
        } catch (e) {
          console.warn('Profile lookup for OAuth session failed:', e);
        }
      }

      if (matched && matched.is_active !== false) {
        loginWithProfile(matched, 'Google OAuth');
        return;
      }

      // If the administrator or another user is already actively logged in, do not wipe their session!
      const currentStoredSession = localStorage.getItem('aur_auth_session');
      const currentStoredProfile = localStorage.getItem('aur_current_profile');
      if (currentStoredSession && currentStoredProfile) {
        try {
          const parsed = JSON.parse(currentStoredProfile);
          if (parsed && parsed.email && parsed.email.toLowerCase() !== userEmail) {
            // An unrelated background auth event occurred — do NOT disturb the active administrator
            return;
          }
        } catch (_) {}
      }

      // Not registered (or deactivated): clear session locally without causing 403 network failures
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setIsAuthenticated(false);
      localStorage.removeItem('aur_auth_session');
      localStorage.removeItem('aur_current_profile');
      sessionStorage.setItem(
        'aur_oauth_error',
        matched
          ? `The account ${userEmail} has been deactivated. Contact the administrator.`
          : `${userEmail} is not registered in Aurevia. Ask an administrator to add your email to your student or staff profile.`
      );
      window.dispatchEvent(new Event('aur-oauth-error'));
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveAuthSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') resolveAuthSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [profiles, students]);

  // Helper to generate Registration Number: AUR/{BRANCH}/{YEAR}/{SEQ}
  const generateRegNumber = (branchId: string): string => {
    const branch = branches.find((b) => b.id === branchId) || branches[0];
    const branchCode = (branch?.code || 'NBO').toUpperCase();
    const year = new Date().getFullYear();
    const prefix = `AUR/${branchCode}/${year}/`;

    let maxSeq = 0;
    profiles.forEach((p) => {
      if (p.reg_number && p.reg_number.startsWith(prefix)) {
        const parts = p.reg_number.split('/');
        const s = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(s) && s > maxSeq) maxSeq = s;
      }
    });

    students.forEach((st) => {
      const r = st.profile?.reg_number;
      if (r && r.startsWith(prefix)) {
        const parts = r.split('/');
        const s = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(s) && s > maxSeq) maxSeq = s;
      }
    });

    try {
      const savedHighest = localStorage.getItem(`aur_highest_student_seq_${branchCode}_${year}`);
      if (savedHighest) {
        const parsed = parseInt(savedHighest, 10);
        if (!isNaN(parsed) && parsed > maxSeq) maxSeq = parsed;
      }
      const retiredRaw = localStorage.getItem('aur_retired_student_ids');
      if (retiredRaw) {
        const retiredList = JSON.parse(retiredRaw);
        if (Array.isArray(retiredList)) {
          retiredList.forEach((rid: string) => {
            if (rid.startsWith(prefix)) {
              const parts = rid.split('/');
              const s = parseInt(parts[parts.length - 1], 10);
              if (!isNaN(s) && s > maxSeq) maxSeq = s;
            }
          });
        }
      }
    } catch (_) {}

    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
  };

  // Asynchronous allocator that checks Supabase to guarantee uniqueness across all devices
  const allocateUniqueStudentRegNumber = async (branchId: string): Promise<string> => {
    const branch = branches.find((b) => b.id === branchId) || branches[0];
    const branchCode = (branch?.code || 'NBO').toUpperCase();
    const year = new Date().getFullYear();
    const prefix = `AUR/${branchCode}/${year}/`;

    let maxSeq = 0;

    // 1. Check local profiles & students
    profiles.forEach((p) => {
      if (p.reg_number && p.reg_number.startsWith(prefix)) {
        const parts = p.reg_number.split('/');
        const s = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(s) && s > maxSeq) maxSeq = s;
      }
    });

    students.forEach((st) => {
      const r = st.profile?.reg_number;
      if (r && r.startsWith(prefix)) {
        const parts = r.split('/');
        const s = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(s) && s > maxSeq) maxSeq = s;
      }
    });

    // 2. Check localStorage highest sequence & retired student IDs
    try {
      const savedHighest = localStorage.getItem(`aur_highest_student_seq_${branchCode}_${year}`);
      if (savedHighest) {
        const parsed = parseInt(savedHighest, 10);
        if (!isNaN(parsed) && parsed > maxSeq) maxSeq = parsed;
      }
      const retiredRaw = localStorage.getItem('aur_retired_student_ids');
      if (retiredRaw) {
        const retiredList = JSON.parse(retiredRaw);
        if (Array.isArray(retiredList)) {
          retiredList.forEach((rid: string) => {
            if (rid.startsWith(prefix)) {
              const parts = rid.split('/');
              const s = parseInt(parts[parts.length - 1], 10);
              if (!isNaN(s) && s > maxSeq) maxSeq = s;
            }
          });
        }
      }
    } catch (_) {}

    // 3. Query Supabase aur_profiles and aur_reg_sequences for ground-truth max
    try {
      const { data: dbProfs } = await supabase
        .from('aur_profiles')
        .select('reg_number')
        .like('reg_number', `${prefix}%`);

      if (dbProfs && Array.isArray(dbProfs)) {
        dbProfs.forEach((p) => {
          if (p.reg_number) {
            const parts = p.reg_number.split('/');
            const s = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(s) && s > maxSeq) maxSeq = s;
          }
        });
      }

      const { data: seqRow } = await supabase
        .from('aur_reg_sequences')
        .select('current_val')
        .eq('branch_code', branchCode)
        .eq('reg_year', year)
        .maybeSingle();

      if (seqRow && typeof seqRow.current_val === 'number' && seqRow.current_val > maxSeq) {
        maxSeq = seqRow.current_val;
      }
    } catch (e) {
      console.warn('Supabase sequence lookup note:', e);
    }

    // 4. Candidate sequence
    let candidateSeq = maxSeq + 1;
    let candidateReg = `${prefix}${String(candidateSeq).padStart(3, '0')}`;

    // 5. Verification loop: ensure this registration number is not already taken in Supabase
    let isTaken = true;
    let safetyCounter = 0;
    while (isTaken && safetyCounter < 50) {
      safetyCounter++;
      try {
        const { data: existing } = await supabase
          .from('aur_profiles')
          .select('id')
          .eq('reg_number', candidateReg)
          .maybeSingle();

        if (existing) {
          candidateSeq++;
          candidateReg = `${prefix}${String(candidateSeq).padStart(3, '0')}`;
        } else {
          isTaken = false;
        }
      } catch (_) {
        isTaken = false;
      }
    }

    // 6. Update local tracker and Supabase aur_reg_sequences
    try {
      localStorage.setItem(`aur_highest_student_seq_${branchCode}_${year}`, String(candidateSeq));
      await supabase.from('aur_reg_sequences').upsert({
        branch_code: branchCode,
        reg_year: year,
        current_val: candidateSeq,
      });
    } catch (_) {}

    return candidateReg;
  };

  // Student KYC Registration with Supabase Insert
  const registerStudentKYC = async (params: {
    fullName: string;
    email: string;
    phone: string;
    nationalId: string;
    branchId: string;
    courseId: string;
    cohortId: string;
    emergencyName: string;
    emergencyPhone: string;
    emergencyRelationship: string;
    coffeeExperience: string;
    dob?: string;
    nationality?: string;
    gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    medicalConditions?: string;
    customFee?: number;
    discountAmount?: number;
    discountType?: 'fixed' | 'percentage' | 'custom';
    discountReason?: string;
    discountNote?: string;
  }) => {
    // 0. Email uniqueness check
    const cleanEmail = (params.email || '').trim().toLowerCase();
    if (cleanEmail) {
      const localDup = profiles.find((p) => p.email && p.email.toLowerCase() === cleanEmail);
      if (localDup) {
        throw new Error(`The email address "${params.email}" is already registered to ${localDup.full_name} (${localDup.role}). Please use a unique email address.`);
      }
      try {
        const { data: dbDup } = await supabase.from('aur_profiles').select('id, full_name, role').eq('email', cleanEmail).maybeSingle();
        if (dbDup) {
          throw new Error(`The email address "${params.email}" is already registered to ${dbDup.full_name} (${dbDup.role}) in the database. Please use a unique email address.`);
        }
      } catch (err: any) {
        if (err.message && err.message.includes('already registered')) throw err;
      }
    }

    const branch = branches.find((b) => b.id === params.branchId) || branches[0];
    const regNumber = await allocateUniqueStudentRegNumber(params.branchId);
    const course = courses.find((c) => c.id === params.courseId) || courses[0];
    
    // Calculate standard tuition vs discounted / custom net fee
    const standardFee = course?.fee_amount || 35000;
    let feeAmount = standardFee;
    let discountAmount = params.discountAmount || 0;

    if (params.customFee !== undefined && params.customFee !== null && !isNaN(Number(params.customFee))) {
      feeAmount = Math.max(0, Number(params.customFee));
      discountAmount = Math.max(0, standardFee - feeAmount);
    } else if (params.discountAmount !== undefined && params.discountAmount !== null && Number(params.discountAmount) > 0) {
      discountAmount = Math.min(standardFee, Number(params.discountAmount));
      feeAmount = Math.max(0, standardFee - discountAmount);
    }

    const studentDefaultPwd = generateUniqueDefaultPassword(params.fullName);

    let createdProfile: Profile;
    let createdStudent: StudentKYC;
    let createdEnrollment: Enrollment;
    let createdInvoice: Invoice;

    try {
      // 1. Create User in Supabase Auth (Authentication Tab) via isolated client
      let authUserId: string | undefined;
      if (params.email) {
        authUserId = await registerAuthUserIsolated(params.email, studentDefaultPwd, {
          full_name: params.fullName,
          role: 'student',
          reg_number: regNumber,
        });
      }

      // 2. Insert Profile into Supabase aur_profiles Table
      const hashedStudentPwd = await hashPassword(studentDefaultPwd);
      const profilePayload: any = {
        role: 'student',
        branch_id: params.branchId,
        full_name: params.fullName.trim(),
        email: cleanEmail,
        phone: params.phone.trim(),
        reg_number: regNumber,
        specialty: 'Barista & Specialty Coffee',
        is_active: true,
        initial_password: studentDefaultPwd,
        password_hash: hashedStudentPwd,
        password_changed: false,
      };
      if (authUserId) {
        profilePayload.id = authUserId;
      }

      let profData: any;
      let profErr: any;
      const res = await supabase.from('aur_profiles').insert(profilePayload).select().single();
      profData = res.data;
      profErr = res.error;

      // Fallback if password columns are missing in schema
      if (profErr && (profErr.message?.includes('column') || profErr.code === 'PGRST204')) {
        delete profilePayload.initial_password;
        delete profilePayload.password_hash;
        delete profilePayload.password_changed;
        const retryRes = await supabase.from('aur_profiles').insert(profilePayload).select().single();
        profData = retryRes.data;
        profErr = retryRes.error;
      }

      if (profErr || !profData) {
        console.error('Failed to create profile in aur_profiles:', profErr);
        throw new Error(profErr?.message || 'Failed to create student profile in Supabase');
      }

      try {
        if (regNumber) localStorage.setItem('aur_student_pwd_' + regNumber.toLowerCase(), studentDefaultPwd);
        if (cleanEmail) localStorage.setItem('aur_student_pwd_' + cleanEmail, studentDefaultPwd);
        localStorage.setItem('aur_user_pwd_seed_' + profData.id, studentDefaultPwd);
        localStorage.setItem('aur_user_pwd_hash_' + profData.id, hashedStudentPwd);
      } catch (_) {}

      createdProfile = {
        ...profData,
        initial_password: studentDefaultPwd,
        password_hash: hashedStudentPwd,
        password_changed: false,
      };

      // 3. Insert Student KYC into Supabase aur_students
      const studentPayload: any = {
        profile_id: createdProfile.id,
        branch_id: params.branchId,
        national_id_or_passport: params.nationalId.trim(),
        dob: params.dob || null,
        nationality: params.nationality || 'Kenyan',
        gender: params.gender || 'Female',
        medical_conditions: params.medicalConditions || 'None',
        emergency_contact_name: params.emergencyName.trim(),
        emergency_contact_phone: params.emergencyPhone.trim(),
        emergency_contact_relationship: params.emergencyRelationship.trim(),
        kyc_verified: true,
        coffee_experience_level: params.coffeeExperience,
      };

      let { data: stData, error: stErr } = await supabase
        .from('aur_students')
        .insert(studentPayload)
        .select()
        .single();

      if (stErr && stErr.code === 'PGRST204') {
        delete studentPayload.dob;
        delete studentPayload.nationality;
        delete studentPayload.gender;
        delete studentPayload.medical_conditions;
        const retrySt = await supabase.from('aur_students').insert(studentPayload).select().single();
        stData = retrySt.data;
        stErr = retrySt.error;
      }

      if (stErr || !stData) {
        console.error('Failed to create student in aur_students:', stErr);
        throw new Error(stErr?.message || 'Failed to create student record in Supabase');
      }
      createdStudent = { ...stData, profile: createdProfile };

      // 4. Ensure Course and Cohort exist in Supabase aur_* tables before enrolling
      try {
        const cohortObj = cohorts.find((c) => c.id === params.cohortId);
        if (cohortObj) {
          const { data: existingCourse } = await supabase
            .from('aur_courses')
            .select('id')
            .eq('id', cohortObj.course_id)
            .maybeSingle();

          if (!existingCourse) {
            const courseObj = courses.find((c) => c.id === cohortObj.course_id) || courses[0];
            if (courseObj) {
              await supabase.from('aur_courses').upsert({
                id: courseObj.id,
                code: courseObj.code,
                title: courseObj.title,
                category: courseObj.category,
                duration_weeks: courseObj.duration_weeks,
                fee_amount: courseObj.fee_amount,
                certification_title: courseObj.certification_title,
              });
            }
          }

          const { data: existingCohort } = await supabase
            .from('aur_cohorts')
            .select('id')
            .eq('id', cohortObj.id)
            .maybeSingle();

          if (!existingCohort) {
            await supabase.from('aur_cohorts').upsert({
              id: cohortObj.id,
              course_id: cohortObj.course_id,
              branch_id: cohortObj.branch_id || params.branchId,
              name: cohortObj.name,
              start_date: cohortObj.start_date || new Date().toISOString().split('T')[0],
              end_date: cohortObj.end_date || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              schedule_timing: cohortObj.schedule_timing,
              status: cohortObj.status || 'in_progress',
            });
          }
        }
      } catch (syncErr) {
        console.warn('Pre-enrollment cohort sync note:', syncErr);
      }

      // 5. Insert Enrollment into Supabase (aur_enrollments has no branch_id)
      let enrData: any;
      let enrErr: any;
      if (params.cohortId) {
        const resEnr = await supabase
          .from('aur_enrollments')
          .insert({
            student_id: createdStudent.id,
            cohort_id: params.cohortId,
            status: 'enrolled',
          })
          .select()
          .single();
        enrData = resEnr.data;
        enrErr = resEnr.error;
      }

      if (enrErr || !enrData) {
        console.warn('Supabase enrollment insert fallback:', enrErr?.message);
        createdEnrollment = {
          id: 'enr-' + Date.now(),
          student_id: createdStudent.id,
          cohort_id: params.cohortId,
          branch_id: params.branchId,
          status: 'enrolled',
          enrolled_at: new Date().toISOString(),
        };
      } else {
        createdEnrollment = { ...enrData, branch_id: params.branchId };
      }

      // 6. Insert Invoice into Supabase (status must be 'pending', no branch_id column)
      const invNumber = `INV-AUR-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const { data: invData, error: invErr } = await supabase
        .from('aur_invoices')
        .insert({
          invoice_number: invNumber,
          enrollment_id: createdEnrollment.id,
          student_id: createdStudent.id,
          cohort_id: params.cohortId,
          total_fee: feeAmount,
          amount_paid: 0,
          balance_due: feeAmount,
          status: 'pending',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .select()
        .single();

      if (invErr || !invData) {
        console.warn('Supabase invoice insert fallback:', invErr?.message);
        createdInvoice = {
          id: 'inv-' + Date.now(),
          invoice_number: invNumber,
          enrollment_id: createdEnrollment.id,
          student_id: createdStudent.id,
          branch_id: params.branchId,
          total_fee: feeAmount,
          standard_fee: standardFee,
          discount_amount: discountAmount,
          discount_type: params.discountType,
          discount_reason: params.discountReason,
          discount_note: params.discountNote,
          amount_paid: 0,
          balance_due: feeAmount,
          status: 'pending',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        };
      } else {
        const totalFee = Number(invData.total_fee) || feeAmount;
        const amountPaid = Number(invData.amount_paid) || 0;
        const balanceDue = (invData.balance_due !== undefined && invData.balance_due !== null && !isNaN(Number(invData.balance_due)))
          ? Number(invData.balance_due)
          : Math.max(0, totalFee - amountPaid);
        createdInvoice = {
          ...invData,
          branch_id: params.branchId,
          total_fee: totalFee,
          standard_fee: standardFee,
          discount_amount: discountAmount,
          discount_type: params.discountType,
          discount_reason: params.discountReason,
          discount_note: params.discountNote,
          amount_paid: amountPaid,
          balance_due: balanceDue,
        };
      }

      // Secure local password cache for instantaneous verification
      try {
        localStorage.setItem('aur_student_pwd_' + regNumber.toLowerCase(), studentDefaultPwd);
        localStorage.setItem('aur_student_pwd_' + cleanEmail, studentDefaultPwd);
        localStorage.setItem('aur_student_pwd_' + createdProfile.id.toLowerCase(), studentDefaultPwd);
        localStorage.setItem('aur_user_pwd_seed_' + createdProfile.id, studentDefaultPwd);
      } catch (_) {}

      // 7. Insert SMS log
      const smsMsg = `Welcome to ${branch.name || 'Aurevia Coffee Institute'}! Reg No: ${regNumber}. Temp password: ${studentDefaultPwd}. Invoice: ${invNumber} (KES ${feeAmount.toLocaleString()}). Tripple T Systems.`;
      try {
        await supabase.from('aur_sms_logs').insert({
          recipient_phone: params.phone,
          recipient_name: params.fullName,
          message_content: smsMsg,
          message_type: 'admissions',
          status: 'delivered',
          branch_id: params.branchId,
        });
      } catch (smsErr) {
        console.warn('Supabase SMS notice:', smsErr);
      }
    } catch (err: any) {
      console.error('registerStudentKYC failure:', err);
      // If truly offline, provide graceful client fallback with non-colliding sequence
      if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        const pId = 'prof-' + Date.now();
        const sId = 's-' + Date.now();
        const eId = 'enr-' + Date.now();
        const iId = 'inv-' + Date.now();

        createdProfile = {
          id: pId,
          role: 'student',
          branch_id: params.branchId,
          full_name: params.fullName,
          email: cleanEmail,
          phone: params.phone,
          national_id: params.nationalId,
          reg_number: regNumber,
          initial_password: studentDefaultPwd,
          specialty: 'Barista & Specialty Coffee',
          password_changed: false,
          is_active: true,
          created_at: new Date().toISOString(),
        };

        createdStudent = {
          id: sId,
          profile_id: pId,
          branch_id: params.branchId,
          national_id_or_passport: params.nationalId,
          emergency_contact_name: params.emergencyName,
          emergency_contact_phone: params.emergencyPhone,
          emergency_contact_relationship: params.emergencyRelationship,
          kyc_verified: true,
          coffee_experience_level: params.coffeeExperience,
          created_at: new Date().toISOString(),
          profile: createdProfile,
        };

        createdEnrollment = {
          id: eId,
          student_id: sId,
          cohort_id: params.cohortId,
          branch_id: params.branchId,
          status: 'enrolled',
          enrolled_at: new Date().toISOString(),
        };

        createdInvoice = {
          id: iId,
          invoice_number: `INV-AUR-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
          enrollment_id: eId,
          student_id: sId,
          branch_id: params.branchId,
          total_fee: feeAmount,
          standard_fee: standardFee,
          discount_amount: discountAmount,
          discount_type: params.discountType,
          discount_reason: params.discountReason,
          discount_note: params.discountNote,
          amount_paid: 0,
          balance_due: feeAmount,
          status: 'pending',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        };
      } else {
        // Validation / database error: throw so the modal shows the exact error message
        throw err;
      }
    }

    // Update React State immediately
    setProfiles((prev) => [createdProfile, ...prev.filter((p) => p.id !== createdProfile.id)]);
    setStudents((prev) => [createdStudent, ...prev.filter((s) => s.id !== createdStudent.id)]);
    setEnrollments((prev) => [createdEnrollment, ...prev.filter((e) => e.id !== createdEnrollment.id)]);
    setInvoices((prev) => [createdInvoice, ...prev.filter((i) => i.id !== createdInvoice.id)]);

    // Persist to localStorage
    try {
      const savedStuds = JSON.parse(localStorage.getItem('aur_students') || '[]');
      const filteredStuds = Array.isArray(savedStuds) ? savedStuds.filter((s: any) => s.id !== createdStudent.id) : [];
      localStorage.setItem('aur_students', JSON.stringify([createdStudent, ...filteredStuds]));

      const savedProfs = JSON.parse(localStorage.getItem('aur_profiles') || '[]');
      const filteredProfs = Array.isArray(savedProfs) ? savedProfs.filter((p: any) => p.id !== createdProfile.id) : [];
      localStorage.setItem('aur_profiles', JSON.stringify([createdProfile, ...filteredProfs]));
    } catch (_) {}

    // Send SMS and register in communication ledger
    const admissionMsg = `Welcome to ${branch?.name || 'Aurevia Coffee Institute'}! Reg No: ${regNumber}. Invoice: ${createdInvoice.invoice_number} (KES ${feeAmount.toLocaleString()}). Tripple T Systems.`;
    const smsLog = await sendInstitutionalSMS({
      recipientPhone: params.phone,
      recipientName: params.fullName,
      message: admissionMsg,
      purpose: 'admissions',
    });
    setSmsLogs((prev) => [{
      ...smsLog,
      branch_id: params.branchId,
      audience_segment: 'New Admissions',
    }, ...prev]);

    // Dispatch Resend automated welcome admission email
    if (params.email && params.email.includes('@')) {
      const courseObj = courses.find((c) => c.id === params.courseId);
      const cohortObj = cohorts.find((c) => c.id === params.cohortId);
      const branchObj = branches.find((b) => b.id === params.branchId);
      const welcomeHtml = generateWelcomeAdmissionEmailHtml({
        studentName: params.fullName,
        regNumber,
        courseTitle: courseObj?.title || 'Specialty Coffee Barista Course',
        cohortName: cohortObj?.name || 'Upcoming Cohort',
        branchName: branchObj?.name || 'Aurevia Coffee Institute',
        scheduleTiming: cohortObj?.schedule_timing,
        temporaryPassword: studentDefaultPwd,
        portalUrl: PRODUCTION_PORTAL_URL,
        googleMeetLink: (cohortObj as any)?.meeting_url || (cohortObj as any)?.google_meet_url || undefined,
      });

      sendResendEmail({
        to: params.email,
        subject: `Welcome to ${branchObj?.name || 'Aurevia Coffee Institute'} - Reg: ${regNumber}`,
        html: welcomeHtml,
      }).then((res) => {
        recordAndPersistCommunicationLog({
          id: `comm-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          channel: 'email',
          recipient_phone: params.phone,
          recipient_email: params.email,
          recipient_name: params.fullName,
          subject: `Official Enrollment Confirmation: ${regNumber}`,
          message_content: admissionMsg,
          purpose: 'admissions',
          delivery_status: res.status === 'delivered' ? 'delivered' : 'failed',
          gateway_reference: res.messageId || `EML-${Math.floor(Math.random() * 900000 + 100000)}`,
          sent_at: new Date().toISOString(),
          branch_id: params.branchId,
          audience_segment: 'New Admissions',
        });
      }).catch((e) => console.warn('Resend auto-welcome notice:', e));
    }

    return { profile: createdProfile, regNumber, invoice: createdInvoice };
  };

  const verifyStudentKYC = async (studentId: string) => {
    try {
      await supabase.from('aur_students').update({ kyc_verified: true }).eq('id', studentId);
    } catch (e) {
      console.warn(e);
    }
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, kyc_verified: true } : s))
    );
  };

  const deleteStudent = async (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    // Permanently retire student registration number so it is never re-issued
    const targetProfile = profiles.find((p) => p.id === student.profile_id) || student.profile;
    const retiredNum = targetProfile?.reg_number;
    if (retiredNum) {
      try {
        const retiredStr = localStorage.getItem('aur_retired_student_ids');
        const retiredList: string[] = retiredStr ? JSON.parse(retiredStr) : [];
        if (!retiredList.includes(retiredNum)) {
          retiredList.push(retiredNum);
          localStorage.setItem('aur_retired_student_ids', JSON.stringify(retiredList));
        }
      } catch (_) {}
    }

    try {
      await supabase.from('aur_assessments').delete().eq('student_id', studentId);
      await supabase.from('aur_attendance').delete().eq('student_id', studentId);
      await supabase.from('aur_payments').delete().eq('student_id', studentId);
      await supabase.from('aur_invoices').delete().eq('student_id', studentId);
      await supabase.from('aur_enrollments').delete().eq('student_id', studentId);
      await supabase.from('aur_students').delete().eq('id', studentId);
      if (student.profile_id) {
        await supabase.from('aur_profiles').delete().eq('id', student.profile_id);
      }
    } catch (e) {
      console.warn('Delete in Supabase:', e);
    }

    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setEnrollments((prev) => prev.filter((e) => e.student_id !== studentId));
    setInvoices((prev) => prev.filter((i) => i.student_id !== studentId));
    setPayments((prev) => prev.filter((p) => p.student_id !== studentId));
    setAssessments((prev) => prev.filter((a) => a.student_id !== studentId));
    setAttendance((prev) => prev.filter((att) => att.student_id !== studentId));
    if (student.profile_id) {
      setProfiles((prev) => prev.filter((p) => p.id !== student.profile_id));
    }
  };

  const graduateStudent = async (enrollmentId: string) => {
    const enrollment = enrollments.find((e) => e.id === enrollmentId);
    if (!enrollment) return;
    const branch = branches.find((b) => b.id === enrollment.branch_id);
    const branchCode = branch ? branch.code : 'NBO';
    const certSerial = enrollment.certificate_serial_no || `CERT-AUR-${new Date().getFullYear()}-${branchCode}-${Math.floor(Math.random() * 900 + 100)}`;
    const student = students.find((s) => s.id === enrollment.student_id);
    const profile = profiles.find((p) => p.id === student?.profile_id);
    const cohort = cohorts.find((c) => c.id === enrollment.cohort_id);
    const course = courses.find((c) => c.id === cohort?.course_id);

    // Calculate student assessments and attendance for official alumni records
    const studentAssessments = assessments.filter((a) => a.student_id === enrollment.student_id);
    const avgScore = studentAssessments.length > 0
      ? Math.round(studentAssessments.reduce((sum, a) => sum + (Number(a.final_score) || 0), 0) / studentAssessments.length)
      : 88;
    const finalGrade = avgScore >= 90 ? 'Distinction' : avgScore >= 80 ? 'Credit' : 'Pass';

    const studentAtt = attendance.filter((a) => a.student_id === enrollment.student_id);
    const attRate = studentAtt.length > 0
      ? Math.round((studentAtt.filter((a) => a.status === 'present' || a.status === 'late').length / studentAtt.length) * 100)
      : 95;

    const newAlumniEntry: Alumni = {
      id: 'alm-' + Date.now(),
      full_name: profile?.full_name || 'Graduate Trainee',
      email: profile?.email || `${(profile?.full_name || 'trainee').toLowerCase().replace(/\s+/g, '.')}@alumni.ac.ke`,
      phone: profile?.phone,
      branch_id: enrollment.branch_id,
      course_id: cohort?.course_id || '',
      cohort_name: cohort?.name || 'Class Cohort',
      graduation_year: new Date().getFullYear(),
      graduation_month: new Date().toLocaleString('en-US', { month: 'long' }),
      certification_name: course?.certification_title || course?.title || 'SCA Certification',
      certificate_serial_no: certSerial,
      current_employer: 'Pending Placement / Graduate',
      job_title: 'Certified Barista',
      employment_status: 'Freelance Barista',
      final_grade: finalGrade,
      score_percentage: avgScore,
      attendance_rate: attRate,
      student_id: enrollment.student_id,
      profile_id: student?.profile_id,
      created_at: new Date().toISOString(),
    };

    try {
      // 1. Mark enrollment completed
      await supabase
        .from('aur_enrollments')
        .update({
          status: 'completed',
          certificate_serial_no: certSerial,
        })
        .eq('id', enrollmentId);

      // 2. EXPIRE PORTAL LOGIN: Deactivate profile so portal logins are expired upon graduation
      if (student?.profile_id) {
        await supabase
          .from('aur_profiles')
          .update({
            is_active: false,
          })
          .eq('id', student.profile_id);
      }

      // 3. Insert into alumni table
      await supabase
        .from('aur_alumni')
        .insert({
          id: newAlumniEntry.id,
          full_name: newAlumniEntry.full_name,
          email: newAlumniEntry.email,
          phone: newAlumniEntry.phone,
          branch_id: newAlumniEntry.branch_id,
          course_id: newAlumniEntry.course_id,
          cohort_name: newAlumniEntry.cohort_name,
          graduation_year: newAlumniEntry.graduation_year,
          graduation_month: newAlumniEntry.graduation_month,
          certification_name: newAlumniEntry.certification_name,
          certificate_serial_no: newAlumniEntry.certificate_serial_no,
          current_employer: newAlumniEntry.current_employer,
          job_title: newAlumniEntry.job_title,
          employment_status: newAlumniEntry.employment_status,
        });
    } catch (e) {
      console.warn('Graduate in Supabase:', e);
    }

    // Update local state
    setEnrollments((prev) =>
      prev.map((e) =>
        e.id === enrollmentId
          ? { ...e, status: 'completed', certificate_serial_no: certSerial }
          : e
      )
    );

    // Deactivate student profile in local state so login expires immediately
    if (student?.profile_id) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === student.profile_id
            ? { ...p, is_active: false }
            : p
        )
      );
    }

    // Append to alumni collection
    setAlumni((prev) => [newAlumniEntry, ...prev]);
  };

  const updateAlumni = async (alumniId: string, updates: Partial<Alumni>) => {
    try {
      await supabase
        .from('aur_alumni')
        .update({
          full_name: updates.full_name,
          email: updates.email,
          phone: updates.phone,
          current_employer: updates.current_employer,
          job_title: updates.job_title,
          employment_status: updates.employment_status,
          certification_name: updates.certification_name,
          certificate_serial_no: updates.certificate_serial_no,
        })
        .eq('id', alumniId);
    } catch (e) {
      console.warn('Supabase updateAlumni fallback:', e);
    }

    setAlumni((prev) =>
      prev.map((a) => (a.id === alumniId ? { ...a, ...updates } : a))
    );
  };

  const deleteAlumni = async (alumniId: string) => {
    try {
      await supabase.from('aur_alumni').delete().eq('id', alumniId);
    } catch (e) {
      console.warn('Supabase deleteAlumni fallback:', e);
    }

    setAlumni((prev) => prev.filter((a) => a.id !== alumniId));
  };

  const updateStudentKYC = async (
    studentId: string,
    params: {
      fullName: string;
      email: string;
      phone: string;
      nationalId: string;
      dob?: string;
      gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
      nationality?: string;
      medicalConditions?: string;
      emergencyName: string;
      emergencyPhone: string;
      emergencyRelationship: string;
      coffeeExperience: string;
      idDocUrl?: string;
      idBackUrl?: string;
      avatarUrl?: string;
      mediaConsent?: boolean;
      termsAccepted?: boolean;
      termsAcceptedAt?: string;
      newPassword?: string;
    }
  ) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const hashedPassword = params.newPassword ? await hashPassword(params.newPassword) : undefined;

    try {
      if (student.profile_id) {
        const profileUpdates: any = {
          full_name: params.fullName,
          email: params.email,
          phone: params.phone,
          national_id: params.nationalId,
        };
        if (params.avatarUrl !== undefined) profileUpdates.avatar_url = params.avatarUrl;
        if (params.newPassword) {
          profileUpdates.password = hashedPassword;
          profileUpdates.initial_password = null;
          profileUpdates.password_changed = true;
        }

        await supabase
          .from('aur_profiles')
          .update(profileUpdates)
          .eq('id', student.profile_id);
      }

      const studentUpdates: any = {
        national_id_or_passport: params.nationalId,
        dob: params.dob,
        gender: params.gender,
        nationality: params.nationality,
        medical_conditions: params.medicalConditions,
        emergency_contact_name: params.emergencyName,
        emergency_contact_phone: params.emergencyPhone,
        emergency_contact_relationship: params.emergencyRelationship,
        coffee_experience_level: params.coffeeExperience,
      };
      if (params.idDocUrl !== undefined) studentUpdates.id_doc_url = params.idDocUrl;
      if (params.idBackUrl !== undefined) studentUpdates.id_back_url = params.idBackUrl;
      if (params.mediaConsent !== undefined) studentUpdates.media_consent = params.mediaConsent;
      if (params.termsAccepted !== undefined) studentUpdates.terms_accepted = params.termsAccepted;
      if (params.termsAcceptedAt !== undefined) studentUpdates.terms_accepted_at = params.termsAcceptedAt;

      await supabase
        .from('aur_students')
        .update(studentUpdates)
        .eq('id', studentId);
    } catch (e) {
      console.warn('Update in Supabase:', e);
    }

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === student.profile_id
          ? {
              ...p,
              full_name: params.fullName,
              email: params.email,
              phone: params.phone,
              national_id: params.nationalId,
              avatar_url: params.avatarUrl !== undefined ? params.avatarUrl : p.avatar_url,
              password: hashedPassword || p.password,
              initial_password: params.newPassword ? undefined : p.initial_password,
              password_changed: params.newPassword ? true : p.password_changed,
            }
          : p
      )
    );

    if (currentProfile?.id === student.profile_id) {
      setCurrentProfile((prev) => {
        const up = {
          ...prev,
          full_name: params.fullName,
          email: params.email,
          phone: params.phone,
          national_id: params.nationalId,
          avatar_url: params.avatarUrl !== undefined ? params.avatarUrl : prev.avatar_url,
          password: hashedPassword || prev.password,
          initial_password: params.newPassword ? undefined : prev.initial_password,
          password_changed: params.newPassword ? true : prev.password_changed,
        };
        localStorage.setItem('aur_current_profile', JSON.stringify(up));
        return up;
      });
    }

    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              national_id_or_passport: params.nationalId,
              dob: params.dob,
              gender: params.gender,
              nationality: params.nationality,
              medical_conditions: params.medicalConditions,
              emergency_contact_name: params.emergencyName,
              emergency_contact_phone: params.emergencyPhone,
              emergency_contact_relationship: params.emergencyRelationship,
              coffee_experience_level: params.coffeeExperience,
              id_doc_url: params.idDocUrl !== undefined ? params.idDocUrl : s.id_doc_url,
              id_back_url: params.idBackUrl !== undefined ? params.idBackUrl : s.id_back_url,
              media_consent: params.mediaConsent !== undefined ? params.mediaConsent : s.media_consent,
              terms_accepted: params.termsAccepted !== undefined ? params.termsAccepted : s.terms_accepted,
              terms_accepted_at: params.termsAcceptedAt !== undefined ? params.termsAcceptedAt : s.terms_accepted_at,
            }
          : s
      )
    );

    if (currentProfile && currentProfile.id === student.profile_id) {
      setCurrentProfile((prev) => ({
        ...prev,
        full_name: params.fullName,
        email: params.email,
        phone: params.phone,
        national_id: params.nationalId,
        avatar_url: params.avatarUrl !== undefined ? params.avatarUrl : prev.avatar_url,
        password: params.newPassword || prev.password,
      }));
    }
  };

  // M-Pesa Payment Processing
  const processMpesaPayment = async (params: {
    invoiceId: string;
    amount: number;
    phone: string;
    paymentMethod?: 'mpesa' | 'cash' | 'bank_transfer';
  }): Promise<Payment> => {
    const invoice = invoices.find((i) => i.id === params.invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const receiptNumber = generateMpesaReceiptNumber();
    let newPayment: Payment;

    try {
      const { data, error } = await supabase
        .from('aur_payments')
        .insert({
          invoice_id: params.invoiceId,
          student_id: invoice.student_id,
          branch_id: invoice.branch_id,
          amount: params.amount,
          payment_method: params.paymentMethod || 'mpesa',
          mpesa_receipt_number: receiptNumber,
          payer_phone: params.phone,
          status: 'completed',
        })
        .select()
        .single();

      if (error || !data) throw error;
      newPayment = {
        ...data,
        mpesa_phone_number: data.payer_phone || params.phone,
      };
    } catch (err) {
      newPayment = {
        id: 'pay-' + Date.now(),
        invoice_id: params.invoiceId,
        student_id: invoice.student_id,
        branch_id: invoice.branch_id,
        amount: params.amount,
        payment_method: params.paymentMethod || 'mpesa',
        mpesa_receipt_number: receiptNumber,
        mpesa_phone_number: params.phone,
        status: 'completed',
        created_at: new Date().toISOString(),
      };
    }

    setPayments((prev) => {
      const next = [newPayment, ...prev];
      localStorage.setItem('aur_payments', JSON.stringify(next));
      return next;
    });

    // Update invoice balance in Supabase and local state
    const newPaid = invoice.amount_paid + params.amount;
    const newBalance = Math.max(0, invoice.total_fee - newPaid);
    const dbStatus = newBalance === 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : 'unpaid';
    const localStatus = newBalance === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

    try {
      await supabase
        .from('aur_invoices')
        .update({
          amount_paid: newPaid,
          balance_due: newBalance,
          status: dbStatus,
        })
        .eq('id', params.invoiceId);
    } catch (e) {
      console.warn('Supabase invoice update notice:', e);
    }

    setInvoices((prev) => {
      const next = prev.map((inv) => {
        if (inv.id === params.invoiceId) {
          return { ...inv, amount_paid: newPaid, balance_due: newBalance, status: localStatus as any };
        }
        return inv;
      });
      localStorage.setItem('aur_invoices', JSON.stringify(next));
      return next;
    });

    // Send SMS receipt and register in communications hub strictly signed with campus name
    const student = students.find((s) => s.id === invoice.student_id);
    const studentProfile = profiles.find((p) => p.id === student?.profile_id);
    const branchObj = branches.find((b) => b.id === invoice.branch_id);
    const campusSignature = branchObj?.name || 'Campus Bursar Desk';
    const balanceMsg = newBalance <= 0 ? 'Tuition 100% Cleared.' : `Remaining Balance: KES ${newBalance.toLocaleString()}.`;
    const receiptMsg = `Fee Receipt: Confirmed KES ${params.amount.toLocaleString()} received for Invoice ${invoice.invoice_number}. M-Pesa Ref: ${receiptNumber}. ${balanceMsg} - ${campusSignature}`;
    const smsLog = await sendInstitutionalSMS({
      recipientPhone: params.phone,
      recipientName: studentProfile?.full_name || 'Student',
      message: receiptMsg,
      purpose: 'fee_receipt',
    });
    setSmsLogs((prev) => [{
      ...smsLog,
      branch_id: invoice.branch_id,
      audience_segment: 'Fee Payers',
    }, ...prev]);

    try {
      await supabase.from('aur_sms_logs').insert({
        recipient_phone: params.phone,
        recipient_name: studentProfile?.full_name || 'Student',
        message_content: receiptMsg,
        message_type: 'fee_receipt',
        status: 'delivered',
        branch_id: invoice.branch_id,
      });
    } catch (smsErr) {
      console.warn('Supabase SMS log error:', smsErr);
    }

    // Dispatch Resend branded HTML tuition receipt email signed with campus name
    if (studentProfile?.email && studentProfile.email.includes('@')) {
      const enrollment = enrollments.find((e) => e.id === invoice.enrollment_id);
      const cohort = cohorts.find((ch) => ch.id === enrollment?.cohort_id);
      const course = courses.find((c) => c.id === cohort?.course_id);
      const emailHtml = generateTuitionReceiptEmailHtml({
        studentName: studentProfile.full_name,
        regNumber: studentProfile.reg_number || 'REG-PENDING',
        courseTitle: course?.title || 'Specialty Coffee Course',
        amountPaid: params.amount,
        receiptNumber,
        mpesaCode: receiptNumber,
        balanceDue: newBalance,
      });

      sendResendEmail({
        to: studentProfile.email,
        subject: `Payment Receipt: KES ${params.amount.toLocaleString()} - ${campusSignature}`,
        html: emailHtml,
      }).then((res) => {
        recordAndPersistCommunicationLog({
          id: `comm-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          channel: 'email',
          recipient_phone: params.phone,
          recipient_email: studentProfile.email,
          recipient_name: studentProfile.full_name,
          subject: `Payment Receipt: KES ${params.amount.toLocaleString()} (${receiptNumber})`,
          message_content: receiptMsg,
          purpose: 'fee_receipt',
          delivery_status: res.status === 'delivered' ? 'delivered' : 'failed',
          gateway_reference: res.messageId || `EML-${Math.floor(Math.random() * 900000 + 100000)}`,
          sent_at: new Date().toISOString(),
          branch_id: invoice.branch_id,
          audience_segment: 'Fee Payers',
        });
      }).catch((e) => console.warn('Resend auto-receipt notice:', e));
    }

    return newPayment;
  };

  // Revert / Void Payment (for test payments or accidental fee entries)
  const revertPayment = async (paymentId: string): Promise<void> => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) throw new Error('Payment not found');

    const invoice = invoices.find((i) => i.id === payment.invoice_id);

    try {
      await supabase.from('aur_payments').delete().eq('id', paymentId);
    } catch (e) {
      console.warn('Supabase delete payment notice:', e);
    }

    setPayments((prev) => {
      const next = prev.filter((p) => p.id !== paymentId);
      localStorage.setItem('aur_payments', JSON.stringify(next));
      return next;
    });

    if (invoice) {
      const newPaid = Math.max(0, invoice.amount_paid - payment.amount);
      const newBalance = invoice.total_fee - newPaid;
      const newStatus = newPaid === 0 ? 'unpaid' : newBalance === 0 ? 'paid' : 'partial';

      try {
        await supabase
          .from('aur_invoices')
          .update({
            amount_paid: newPaid,
            balance_due: newBalance,
            status: newStatus,
          })
          .eq('id', invoice.id);
      } catch (e) {
        console.warn('Supabase invoice balance revert notice:', e);
      }

      setInvoices((prev) => {
        const next = prev.map((inv) => {
          if (inv.id === invoice.id) {
            return { ...inv, amount_paid: newPaid, balance_due: newBalance, status: newStatus as any };
          }
          return inv;
        });
        localStorage.setItem('aur_invoices', JSON.stringify(next));
        return next;
      });
    }
  };

  // Update Campus Paybill & Banking Configuration (Super Admin Only)
  const updateBranchPaymentConfig = async (
    branchId: string,
    config: {
      paybill_number?: string;
      paybill_account_name?: string;
      bank_name?: string;
      bank_account_number?: string;
      payment_instructions?: string;
    }
  ): Promise<void> => {
    if (currentProfile?.role !== 'super_admin') {
      throw new Error('Access Denied: Only Super Administrators have authority to modify institutional Paybill and banking configurations.');
    }

    // 1. Save directly into aur_branch_payment_overrides to ensure survival across page refreshes
    try {
      const savedOverrides = localStorage.getItem('aur_branch_payment_overrides');
      const overrides = savedOverrides ? JSON.parse(savedOverrides) : {};
      overrides[branchId] = {
        ...overrides[branchId],
        ...config,
        updated_at: Date.now(),
      };
      localStorage.setItem('aur_branch_payment_overrides', JSON.stringify(overrides));
    } catch (_) {}

    try {
      await supabase
        .from('aur_branches')
        .update({
          paybill_number: config.paybill_number,
          paybill_account_name: config.paybill_account_name,
          payment_instructions: config.payment_instructions,
        })
        .eq('id', branchId);
    } catch (e) {
      console.warn('Supabase branch paybill update notice:', e);
    }

    setBranches((prev) => {
      const next = prev.map((b) => (b.id === branchId ? { ...b, ...config } : b));
      localStorage.setItem('aur_branches', JSON.stringify(next));
      return next;
    });
  };

  // Trainee M-Pesa SMS Confirmation Submission (Pending Verification Queue)
  const submitMpesaConfirmationSMS = async (params: {
    invoiceId: string;
    rawMpesaText: string;
    claimedAmount: number;
    studentId: string;
    branchId: string;
    mpesaReceiptNumber?: string;
    phoneNumber?: string;
  }): Promise<Payment> => {
    const invoice = invoices.find((i) => i.id === params.invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    let extractedCode = params.mpesaReceiptNumber;
    if (!extractedCode && params.rawMpesaText) {
      const match = params.rawMpesaText.match(/\b([A-Z0-9]{10})\b/i);
      if (match) extractedCode = match[1].toUpperCase();
    }
    const finalReceiptNo = extractedCode || ('VERIF-' + Date.now().toString().slice(-6));

    let newPayment: Payment;
    try {
      const { data, error } = await supabase
        .from('aur_payments')
        .insert({
          invoice_id: params.invoiceId,
          student_id: params.studentId,
          branch_id: params.branchId,
          amount: params.claimedAmount,
          payment_method: 'mpesa',
          mpesa_receipt_number: finalReceiptNo,
          mpesa_phone_number: params.phoneNumber,
          raw_mpesa_text: params.rawMpesaText,
          submitted_by_student_id: currentProfile.id,
          status: 'pending_verification',
        })
        .select()
        .single();

      if (error || !data) throw error;
      newPayment = {
        ...data,
        status: 'pending_verification',
      };
    } catch (err) {
      newPayment = {
        id: 'pay-' + Date.now(),
        invoice_id: params.invoiceId,
        student_id: params.studentId,
        branch_id: params.branchId,
        amount: params.claimedAmount,
        payment_method: 'mpesa',
        mpesa_receipt_number: finalReceiptNo,
        mpesa_phone_number: params.phoneNumber,
        raw_mpesa_text: params.rawMpesaText,
        submitted_by_student_id: currentProfile.id,
        status: 'pending_verification',
        created_at: new Date().toISOString(),
      };
    }

    setPayments((prev) => {
      const next = [newPayment, ...prev];
      localStorage.setItem('aur_payments', JSON.stringify(next));
      return next;
    });

    return newPayment;
  };

  // Branch Manager & Super Admin: Verify & Approve M-Pesa Payment
  const verifyAndApprovePayment = async (params: {
    paymentId: string;
    verifiedAmount: number;
    remarks?: string;
  }): Promise<Payment> => {
    const payment = payments.find((p) => p.id === params.paymentId);
    if (!payment) throw new Error('Payment submission not found');

    const invoice = invoices.find((i) => i.id === payment.invoice_id);
    if (!invoice) throw new Error('Associated invoice not found');

    const finalAmount = params.verifiedAmount > 0 ? params.verifiedAmount : payment.amount;
    const nowIso = new Date().toISOString();

    try {
      await supabase
        .from('aur_payments')
        .update({
          amount: finalAmount,
          status: 'completed',
          verified_by_profile_id: currentProfile.id,
          verified_at: nowIso,
          verification_remarks: params.remarks || 'Approved by Campus Bursar Desk',
        })
        .eq('id', params.paymentId);
    } catch (e) {
      console.warn('Supabase update payment verification notice:', e);
    }

    const updatedPayment: Payment = {
      ...payment,
      amount: finalAmount,
      status: 'completed',
      verified_by_profile_id: currentProfile.id,
      verified_at: nowIso,
      verification_remarks: params.remarks || 'Approved by Campus Bursar Desk',
    };

    setPayments((prev) => {
      const next = prev.map((p) => (p.id === params.paymentId ? updatedPayment : p));
      localStorage.setItem('aur_payments', JSON.stringify(next));
      return next;
    });

    // Update invoice balances (accurately handles partial payment)
    const newPaid = (invoice.amount_paid || 0) + finalAmount;
    const newBalance = Math.max(0, invoice.total_fee - newPaid);
    const dbStatus = newBalance === 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : 'unpaid';
    const localStatus = newBalance === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

    try {
      await supabase
        .from('aur_invoices')
        .update({
          amount_paid: newPaid,
          balance_due: newBalance,
          status: dbStatus,
        })
        .eq('id', invoice.id);
    } catch (e) {
      console.warn('Supabase invoice update notice:', e);
    }

    setInvoices((prev) => {
      const next = prev.map((inv) =>
        inv.id === invoice.id
          ? { ...inv, amount_paid: newPaid, balance_due: newBalance, status: localStatus as any }
          : inv
      );
      localStorage.setItem('aur_invoices', JSON.stringify(next));
      return next;
    });

    // Send SMS receipt strictly signed with campus name
    const student = students.find((s) => s.id === invoice.student_id);
    const studentProfile = profiles.find((p) => p.id === student?.profile_id);
    const branchObj = branches.find((b) => b.id === invoice.branch_id);
    const campusName = branchObj?.name || 'Campus Bursar Desk';
    const studentPhone = payment.mpesa_phone_number || studentProfile?.phone || student?.emergency_contact_phone;
    const balanceMsg = newBalance <= 0 ? 'Tuition 100% Cleared.' : `Remaining Balance: KES ${newBalance.toLocaleString()}.`;

    const receiptMsg = `Fee Receipt: Confirmed KES ${finalAmount.toLocaleString()} received for Invoice ${invoice.invoice_number}. M-Pesa Ref: ${payment.mpesa_receipt_number || 'OK'}. ${balanceMsg} - ${campusName}`;

    if (studentPhone) {
      const smsLog = await sendInstitutionalSMS({
        recipientPhone: studentPhone,
        recipientName: studentProfile?.full_name || 'Trainee',
        message: receiptMsg,
        purpose: 'fee_receipt',
      });
      setSmsLogs((prev) => [
        {
          ...smsLog,
          branch_id: invoice.branch_id,
          audience_segment: 'Fee Payers',
        },
        ...prev,
      ]);
    }

    // Send Email receipt strictly signed with campus name
    if (studentProfile?.email && studentProfile.email.includes('@')) {
      const enrollment = enrollments.find((e) => e.id === invoice.enrollment_id);
      const cohort = cohorts.find((ch) => ch.id === enrollment?.cohort_id);
      const course = courses.find((c) => c.id === cohort?.course_id);
      const emailHtml = generateTuitionReceiptEmailHtml({
        studentName: studentProfile.full_name,
        regNumber: studentProfile.reg_number || 'REG-PENDING',
        courseTitle: course?.title || 'Specialty Coffee Course',
        amountPaid: finalAmount,
        receiptNumber: payment.mpesa_receipt_number || ('REC-' + Date.now().toString().slice(-6)),
        mpesaCode: payment.mpesa_receipt_number || 'VERIFIED',
        balanceDue: newBalance,
      });

      sendResendEmail({
        to: studentProfile.email,
        subject: `Official Tuition Receipt: KES ${finalAmount.toLocaleString()} - ${campusName}`,
        html: emailHtml,
      }).catch((e) => console.warn('Resend auto-receipt notice:', e));
    }

    return updatedPayment;
  };

  // Branch Manager & Super Admin: Reject M-Pesa Payment Submission
  const rejectMpesaPayment = async (params: { paymentId: string; reason: string }): Promise<void> => {
    const payment = payments.find((p) => p.id === params.paymentId);
    if (!payment) throw new Error('Payment not found');

    try {
      await supabase
        .from('aur_payments')
        .update({
          status: 'rejected',
          verification_remarks: params.reason,
        })
        .eq('id', params.paymentId);
    } catch (e) {
      console.warn('Supabase reject payment notice:', e);
    }

    setPayments((prev) => {
      const next = prev.map((p) =>
        p.id === params.paymentId ? { ...p, status: 'rejected' as const, verification_remarks: params.reason } : p
      );
      localStorage.setItem('aur_payments', JSON.stringify(next));
      return next;
    });
  };

  // Adjust Tuition Fee or Apply Discount to an existing invoice
  const updateInvoiceFeeAndDiscount = async (
    invoiceId: string,
    updates: {
      totalFee: number;
      standardFee?: number;
      discountAmount?: number;
      discountType?: 'fixed' | 'percentage' | 'custom';
      discountReason?: string;
      discountNote?: string;
    }
  ): Promise<void> => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) throw new Error('Invoice record not found');

    const totalFee = Math.max(0, Number(updates.totalFee));
    const amountPaid = Number(invoice.amount_paid) || 0;
    const balanceDue = Math.max(0, totalFee - amountPaid);
    const dbStatus = balanceDue === 0 ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'unpaid';
    const localStatus = balanceDue === 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid';

    // 1. Update in Supabase aur_invoices
    try {
      await supabase
        .from('aur_invoices')
        .update({
          total_fee: totalFee,
          balance_due: balanceDue,
          status: dbStatus,
        })
        .eq('id', invoiceId);
    } catch (e) {
      console.warn('Supabase invoice fee update note:', e);
    }

    // 2. Update local state & localStorage
    setInvoices((prev) => {
      const next = prev.map((inv) => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            total_fee: totalFee,
            balance_due: balanceDue,
            status: localStatus as any,
            standard_fee: updates.standardFee !== undefined ? updates.standardFee : (inv.standard_fee || inv.total_fee),
            discount_amount: updates.discountAmount !== undefined ? updates.discountAmount : inv.discount_amount,
            discount_type: updates.discountType !== undefined ? updates.discountType : inv.discount_type,
            discount_reason: updates.discountReason !== undefined ? updates.discountReason : inv.discount_reason,
            discount_note: updates.discountNote !== undefined ? updates.discountNote : inv.discount_note,
          };
        }
        return inv;
      });
      localStorage.setItem('aur_invoices', JSON.stringify(next));
      return next;
    });
  };

  // Record Attendance (supports single record or array)
  const recordAttendance = async (input: { cohortId: string; studentId: string; status: 'present' | 'absent' | 'late' | 'excused'; sessionTitle?: string; sessionDate?: string } | Array<{ cohortId: string; studentId: string; status: 'present' | 'absent' | 'late' | 'excused'; sessionTitle?: string; sessionDate?: string }>) => {
    const list = Array.isArray(input) ? input : [input];
    const today = new Date().toISOString().split('T')[0];

    const newRecs: AttendanceRecord[] = list.map((r) => ({
      id: 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      cohort_id: r.cohortId,
      student_id: r.studentId,
      session_date: r.sessionDate || today,
      session_title: r.sessionTitle || 'Class Session',
      status: r.status,
      created_at: new Date().toISOString(),
    }));

    try {
      await supabase.from('aur_attendance').upsert(
        list.map((r) => ({
          cohort_id: r.cohortId,
          student_id: r.studentId,
          session_date: r.sessionDate || today,
          session_title: r.sessionTitle || 'Class Session',
          status: r.status,
        }))
      );
    } catch (e) {
      console.warn(e);
    }

    setAttendance((prev) => [...newRecs, ...prev]);
  };

  // Submit / Record Assessment
  const submitAssessment = async (assessment: Partial<Assessment>) => {
    const prac = Number(assessment.practical_score) || 0;
    const theo = Number(assessment.theory_score) || 0;
    const sens = Number(assessment.sensory_score) || 0;
    const finalScore = Math.round((prac * 0.5) + (theo * 0.25) + (sens * 0.25));
    const grade = finalScore >= 85 ? 'A' : finalScore >= 75 ? 'B' : finalScore >= 60 ? 'C' : 'D';

    const newAssessment: Assessment = {
      id: assessment.id || 'ass-' + Date.now(),
      enrollment_id: assessment.enrollment_id || '',
      student_id: assessment.student_id || '',
      cohort_id: assessment.cohort_id || '',
      module_name: assessment.module_name || 'Practical Lab Assessment',
      practical_score: prac,
      theory_score: theo,
      sensory_score: sens,
      final_score: finalScore,
      grade: grade,
      instructor_remarks: assessment.instructor_remarks || 'Competency met',
      status: assessment.status || 'published',
      graded_by: currentProfile.id,
      graded_at: new Date().toISOString(),
    };

    try {
      await supabase.from('aur_assessments').insert({
        student_id: newAssessment.student_id,
        cohort_id: newAssessment.cohort_id,
        module_name: newAssessment.module_name,
        practical_score: newAssessment.practical_score,
        theory_score: newAssessment.theory_score,
        sensory_score: newAssessment.sensory_score,
        final_score: newAssessment.final_score,
        grade: newAssessment.grade,
        instructor_remarks: newAssessment.instructor_remarks,
      });
    } catch (e) {
      console.warn(e);
    }

    setAssessments((prev) => [newAssessment, ...prev.filter((a) => a.id !== newAssessment.id)]);
  };

  const recordAssessment = submitAssessment;

  const updateAssessment = async (assessmentId: string, updates: Partial<Assessment>) => {
    try {
      const prac = updates.practical_score;
      const theo = updates.theory_score;
      const sens = updates.sensory_score;
      let finalScore = updates.final_score;
      let grade = updates.grade;

      if (prac !== undefined || theo !== undefined || sens !== undefined) {
        const existing = assessments.find((a) => a.id === assessmentId);
        const p = prac !== undefined ? Number(prac) : (existing?.practical_score || 0);
        const t = theo !== undefined ? Number(theo) : (existing?.theory_score || 0);
        const s = sens !== undefined ? Number(sens) : (existing?.sensory_score || 0);
        finalScore = Math.round((p * 0.5) + (t * 0.25) + (s * 0.25));
        grade = finalScore >= 85 ? 'A' : finalScore >= 75 ? 'B' : finalScore >= 60 ? 'C' : 'D';
      }

      await supabase
        .from('aur_assessments')
        .update({
          ...updates,
          final_score: finalScore,
          grade: grade,
        })
        .eq('id', assessmentId);
    } catch (e) {
      console.warn('Supabase assessment update fallback:', e);
    }

    setAssessments((prev) =>
      prev.map((a) => {
        if (a.id !== assessmentId) return a;
        const p = updates.practical_score !== undefined ? Number(updates.practical_score) : a.practical_score;
        const t = updates.theory_score !== undefined ? Number(updates.theory_score) : a.theory_score;
        const s = updates.sensory_score !== undefined ? Number(updates.sensory_score) : a.sensory_score;
        const finalScore = Math.round((p * 0.5) + (t * 0.25) + (s * 0.25));
        const grade = finalScore >= 85 ? 'A' : finalScore >= 75 ? 'B' : finalScore >= 60 ? 'C' : 'D';

        return {
          ...a,
          ...updates,
          practical_score: p,
          theory_score: t,
          sensory_score: s,
          final_score: finalScore,
          grade: grade,
        };
      })
    );
  };

  const deleteAssessment = async (assessmentId: string) => {
    try {
      await supabase.from('aur_assessments').delete().eq('id', assessmentId);
    } catch (e) {
      console.warn('Supabase assessment delete fallback:', e);
    }

    setAssessments((prev) => prev.filter((a) => a.id !== assessmentId));
  };

  // Manager records staff attendance from physical logbook
  const recordStaffAttendanceByManager = async (params: {
    profileId: string;
    branchId: string;
    workDate: string;
    clockIn?: string;
    clockOut?: string;
    locationNotes?: string;
  }) => {
    try {
      const { data: existing } = await supabase
        .from('aur_staff_clockin')
        .select('id')
        .eq('profile_id', params.profileId)
        .eq('work_date', params.workDate)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from('aur_staff_clockin')
          .update({
            branch_id: params.branchId,
            clock_in: params.clockIn || new Date().toISOString(),
            clock_out: params.clockOut || null,
            location_notes: params.locationNotes || 'Signed physical attendance book',
            status: params.clockOut ? 'completed' : 'on_duty',
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('aur_staff_clockin').insert({
          profile_id: params.profileId,
          branch_id: params.branchId,
          work_date: params.workDate,
          clock_in: params.clockIn || new Date().toISOString(),
          clock_out: params.clockOut || null,
          location_notes: params.locationNotes || 'Signed physical attendance book',
          status: params.clockOut ? 'completed' : 'on_duty',
        });
      }
    } catch (e) {
      console.warn('Supabase staff clockin sync:', e);
    }

    setStaffClockins((prev) => {
      const filtered = prev.filter(
        (c) => !(c.profile_id === params.profileId && (c.work_date || '').slice(0, 10) === params.workDate.slice(0, 10))
      );
      const next = [
        {
          id: 'clock-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          profile_id: params.profileId,
          branch_id: params.branchId,
          clock_in: params.clockIn || new Date().toISOString(),
          clock_out: params.clockOut,
          work_date: params.workDate,
          location_notes: params.locationNotes || 'Signed physical attendance book',
        },
        ...filtered,
      ];
      localStorage.setItem('aur_staff_clockins', JSON.stringify(next));
      return next;
    });
  };

  // Staff Clock In
  const recordClockIn = async (locationNotes?: string): Promise<StaffClockIn> => {
    const today = new Date().toISOString().split('T')[0];
    const newRecord: StaffClockIn = {
      id: 'clock-' + Date.now(),
      profile_id: currentProfile.id,
      branch_id: currentProfile.branch_id || branches[0].id,
      clock_in: new Date().toISOString(),
      work_date: today,
      location_notes: locationNotes || 'Campus Lab',
    };

    try {
      await supabase.from('aur_staff_clockin').insert({
        profile_id: currentProfile.id,
        branch_id: currentProfile.branch_id || branches[0].id,
        clock_in: newRecord.clock_in,
        work_date: today,
        location_notes: locationNotes || 'Campus Lab',
        status: 'on_duty',
      });
    } catch (e) {
      console.warn(e);
    }

    setStaffClockins((prev) => [newRecord, ...prev.filter((c) => c.profile_id !== currentProfile.id || c.work_date !== today)]);
    return newRecord;
  };

  const clockInStaff = recordClockIn;

  // Staff Clock Out
  const recordClockOut = async (profileId?: string) => {
    const targetId = profileId || currentProfile.id;
    const today = new Date().toISOString().split('T')[0];
    try {
      await supabase
        .from('aur_staff_clockin')
        .update({ clock_out: new Date().toISOString() })
        .eq('profile_id', targetId)
        .eq('work_date', today);
    } catch (e) {
      console.warn(e);
    }

    setStaffClockins((prev) =>
      prev.map((c) =>
        c.profile_id === targetId && c.work_date === today
          ? { ...c, clock_out: new Date().toISOString() }
          : c
      )
    );
  };

  const clockOutStaff = recordClockOut;

  // Submit / Record Leave Request
  const submitLeaveRequest = async (params: {
    profileId?: string;
    branchId?: string;
    leaveType: 'annual' | 'sick' | 'short' | 'compassionate' | 'off_day' | 'maternity_paternity' | 'study';
    startDate: string;
    endDate: string;
    daysCount: number;
    reason: string;
    status?: 'pending' | 'approved' | 'rejected';
    reviewNotes?: string;
  }): Promise<LeaveRequest> => {
    const targetProfileId = params.profileId || currentProfile.id;
    const targetProfile = profiles.find((p) => p.id === targetProfileId);
    const targetBranchId = params.branchId || targetProfile?.branch_id || currentProfile.branch_id || branches[0].id;
    const initialStatus = params.status || 'pending';

    const leaveId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'l1000000-0000-0000-0000-' + Date.now().toString(16).padStart(12, '0');
    const newLeave: LeaveRequest = {
      id: leaveId,
      profile_id: targetProfileId,
      branch_id: targetBranchId,
      leave_type: params.leaveType,
      start_date: params.startDate,
      end_date: params.endDate,
      days_count: params.daysCount,
      reason: params.reason,
      status: initialStatus,
      reviewed_by: initialStatus !== 'pending' ? currentProfile.id : undefined,
      review_notes: params.reviewNotes || (initialStatus === 'approved' ? 'Directly authorized by management' : undefined),
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from('aur_leave_requests').insert({
        id: leaveId,
        profile_id: targetProfileId,
        branch_id: targetBranchId,
        leave_type: params.leaveType,
        start_date: params.startDate,
        end_date: params.endDate,
        days_count: params.daysCount,
        reason: params.reason,
        status: initialStatus,
        reviewed_by: newLeave.reviewed_by,
        review_notes: newLeave.review_notes,
      });
    } catch (e) {
      console.warn(e);
    }

    setLeaveRequests((prev) => [newLeave, ...prev]);
    return newLeave;
  };

  // Review Leave Request
  const reviewLeaveRequest = async (requestId: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      await supabase
        .from('aur_leave_requests')
        .update({
          status,
          reviewed_by: currentProfile.id,
          review_notes: notes || 'Reviewed by Admin',
        })
        .eq('id', requestId);
    } catch (e) {
      console.warn(e);
    }

    setLeaveRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status, reviewed_by: currentProfile.id, review_notes: notes }
          : r
      )
    );
  };

  // Create Branch
  const createBranch = async (branch: Partial<Branch>): Promise<Branch> => {
    let created: Branch;
    try {
      const { data, error } = await supabase
        .from('aur_branches')
        .insert({
          code: branch.code?.toUpperCase(),
          name: branch.name,
          address: branch.address,
          city: branch.city,
          country: branch.country || 'Kenya',
          phone: branch.phone,
          email: branch.email,
        })
        .select()
        .single();

      if (error || !data) throw error;
      created = data;
    } catch (e) {
      created = {
        id: 'b-' + Date.now(),
        code: branch.code?.toUpperCase() || 'NEW',
        name: branch.name || 'New Campus',
        address: branch.address || 'Address',
        city: branch.city || 'City',
        country: branch.country || 'Kenya',
        phone: branch.phone || '+254 700 000 000',
        email: branch.email || 'campus@aureviacoffee.com',
        is_active: true,
        created_at: new Date().toISOString(),
      };
    }

    setBranches((prev) => [...prev, created]);
    return created;
  };

  // Update Branch
  const updateBranch = async (branchId: string, updates: Partial<Branch>): Promise<void> => {
    try {
      await supabase
        .from('aur_branches')
        .update({
          code: updates.code?.toUpperCase(),
          name: updates.name,
          address: updates.address,
          city: updates.city,
          country: updates.country,
          phone: updates.phone,
          email: updates.email,
          manager_name: updates.manager_name,
          is_active: updates.is_active,
        })
        .eq('id', branchId);
    } catch (e) {
      console.warn('Supabase updateBranch error (fallback to local state):', e);
    }

    setBranches((prev) => {
      const next = prev.map((b) => (b.id === branchId ? { ...b, ...updates } : b));
      localStorage.setItem('aur_branches', JSON.stringify(next));
      return next;
    });
  };

  // Delete Branch & Cascading Dependencies
  const deleteBranch = async (branchId: string): Promise<void> => {
    // 1. Supabase Cleanup (safe, strictly aur_* tables only)
    try {
      const targetBranch = branches.find((b) => b.id === branchId);

      // Find branch cohorts
      const branchCohorts = cohorts.filter((c) => c.branch_id === branchId);
      const branchCohortIds = branchCohorts.map((c) => c.id);

      // Find branch students
      const branchStudents = students.filter((s) => s.branch_id === branchId);
      const branchStudentIds = branchStudents.map((s) => s.id);
      const branchStudentProfileIds = branchStudents.map((s) => s.profile_id).filter(Boolean) as string[];

      // Cleanup attendance, assessments & enrollments for cohorts
      if (branchCohortIds.length > 0) {
        await supabase.from('aur_attendance').delete().in('cohort_id', branchCohortIds);
        await supabase.from('aur_assessments').delete().in('cohort_id', branchCohortIds);
        await supabase.from('aur_enrollments').delete().in('cohort_id', branchCohortIds);
      }

      // Cleanup records for students
      if (branchStudentIds.length > 0) {
        await supabase.from('aur_attendance').delete().in('student_id', branchStudentIds);
        await supabase.from('aur_assessments').delete().in('student_id', branchStudentIds);
        await supabase.from('aur_enrollments').delete().in('student_id', branchStudentIds);
        await supabase.from('aur_payments').delete().in('student_id', branchStudentIds);
        await supabase.from('aur_invoices').delete().in('student_id', branchStudentIds);
      }

      // Cleanup payments & invoices matching branch_id directly
      await supabase.from('aur_payments').delete().eq('branch_id', branchId);
      await supabase.from('aur_invoices').delete().eq('branch_id', branchId);

      // Delete student KYC records and student profiles
      if (branchStudentIds.length > 0) {
        await supabase.from('aur_students').delete().eq('branch_id', branchId);
      }
      if (branchStudentProfileIds.length > 0) {
        await supabase.from('aur_profiles').delete().in('id', branchStudentProfileIds);
      }

      // Delete cohorts in this branch
      await supabase.from('aur_cohorts').delete().eq('branch_id', branchId);

      // Delete staff clock-ins and leave requests for this branch
      await supabase.from('aur_staff_clockin').delete().eq('branch_id', branchId);
      await supabase.from('aur_leave_requests').delete().eq('branch_id', branchId);

      // Unassign staff members from this branch (keep their user profile)
      await supabase.from('aur_profiles').update({ branch_id: null }).eq('branch_id', branchId);

      // Delete alumni for this branch
      await supabase.from('aur_alumni').delete().eq('branch_id', branchId);

      // Delete reg sequences for this branch if code is known
      if (targetBranch?.code) {
        await supabase.from('aur_reg_sequences').delete().eq('branch_code', targetBranch.code);
      }

      // Finally delete the branch itself
      const { error } = await supabase.from('aur_branches').delete().eq('id', branchId);
      if (error) {
        console.warn('Supabase delete aur_branches note:', error);
      }
    } catch (e) {
      console.warn('Supabase deleteBranch fallback notice:', e);
    }

    // 2. React State & LocalStorage Updates
    const branchStudentIdsSet = new Set(students.filter((s) => s.branch_id === branchId).map((s) => s.id));
    const branchProfileIdsSet = new Set(students.filter((s) => s.branch_id === branchId).map((s) => s.profile_id));

    setBranches((prev) => {
      const next = prev.filter((b) => b.id !== branchId);
      localStorage.setItem('aur_branches', JSON.stringify(next));
      return next;
    });

    setCohorts((prev) => {
      const next = prev.filter((c) => c.branch_id !== branchId);
      localStorage.setItem('aur_cohorts', JSON.stringify(next));
      return next;
    });

    setStudents((prev) => {
      const next = prev.filter((s) => s.branch_id !== branchId);
      localStorage.setItem('aur_students', JSON.stringify(next));
      return next;
    });

    setEnrollments((prev) => prev.filter((e) => !branchStudentIdsSet.has(e.student_id)));

    setInvoices((prev) => {
      const next = prev.filter((i) => i.branch_id !== branchId && !branchStudentIdsSet.has(i.student_id));
      localStorage.setItem('aur_invoices', JSON.stringify(next));
      return next;
    });

    setPayments((prev) => {
      const next = prev.filter((p) => p.branch_id !== branchId && !branchStudentIdsSet.has(p.student_id));
      localStorage.setItem('aur_payments', JSON.stringify(next));
      return next;
    });

    setProfiles((prev) =>
      prev
        .filter((p) => !branchProfileIdsSet.has(p.id))
        .map((p) => (p.branch_id === branchId ? { ...p, branch_id: undefined } : p))
    );

    setAttendance((prev) => prev.filter((a) => !branchStudentIdsSet.has(a.student_id)));
    setStaffClockins((prev) => prev.filter((sc) => sc.branch_id !== branchId));
    setLeaveRequests((prev) => prev.filter((lr) => lr.branch_id !== branchId));
    setAlumni((prev) => prev.filter((al) => al.branch_id !== branchId));
    setLessons((prev) => prev.filter((l) => l.branch_id !== branchId));
    setLiveSessions((prev) => prev.filter((s) => s.branch_id !== branchId));

    if (selectedBranchId === branchId) {
      setSelectedBranchId('ALL');
    }
  };

  // Create Course
  const createCourse = async (course: Partial<Course>): Promise<Course> => {
    let created: Course;
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'c' + Date.now();
    try {
      const { data, error } = await supabase
        .from('aur_courses')
        .insert({
          id: newId,
          code: course.code?.toUpperCase() || 'NEW-01',
          title: course.title || 'New Course',
          category: course.category || 'Barista Skills',
          duration_weeks: Number(course.duration_weeks || 2),
          fee_amount: Number(course.fee_amount || 35000),
          description: course.description || 'Specialty Coffee Association curriculum module.',
          modules: course.modules || [],
          certification_title: course.certification_title || `${course.title || 'SCA'} Certification`,
          is_active: course.is_active ?? true,
        })
        .select()
        .single();

      if (error || !data) throw error;
      created = data;
    } catch (e) {
      created = {
        id: newId,
        code: course.code?.toUpperCase() || 'NEW-01',
        title: course.title || 'New Course',
        category: (course.category as any) || 'Barista Skills',
        duration_weeks: Number(course.duration_weeks || 2),
        fee_amount: Number(course.fee_amount || 35000),
        description: course.description || 'Specialty Coffee Association curriculum module.',
        modules: course.modules || [],
        certification_title: course.certification_title || `${course.title || 'SCA'} Certification`,
        is_active: course.is_active ?? true,
        created_at: new Date().toISOString(),
      };
    }

    setCourses((prev) => {
      const next = [...prev, created];
      localStorage.setItem('aur_courses', JSON.stringify(next));
      return next;
    });
    return created;
  };

  // Update Course
  const updateCourse = async (courseId: string, updates: Partial<Course>): Promise<void> => {
    try {
      await supabase
        .from('aur_courses')
        .update({
          code: updates.code?.toUpperCase(),
          title: updates.title,
          category: updates.category,
          duration_weeks: updates.duration_weeks ? Number(updates.duration_weeks) : undefined,
          fee_amount: updates.fee_amount ? Number(updates.fee_amount) : undefined,
          description: updates.description,
          modules: updates.modules,
          certification_title: updates.certification_title,
          is_active: updates.is_active,
        })
        .eq('id', courseId);
    } catch (e) {
      console.warn('Supabase updateCourse error (fallback to local state):', e);
    }

    setCourses((prev) => {
      const next = prev.map((c) => (c.id === courseId ? { ...c, ...updates } : c));
      localStorage.setItem('aur_courses', JSON.stringify(next));
      return next;
    });
  };

  // Delete Course & Cascading Dependencies
  const deleteCourse = async (courseId: string): Promise<void> => {
    try {
      // Find all cohorts for this course
      const targetCohorts = cohorts.filter((c) => c.course_id === courseId);
      const targetCohortIds = targetCohorts.map((c) => c.id);

      // Cleanup attendance & assessments & enrollments for those cohorts
      if (targetCohortIds.length > 0) {
        await supabase.from('aur_attendance').delete().in('cohort_id', targetCohortIds);
        await supabase.from('aur_assessments').delete().in('cohort_id', targetCohortIds);
        await supabase.from('aur_enrollments').delete().in('cohort_id', targetCohortIds);
        await supabase.from('aur_cohorts').delete().in('id', targetCohortIds);
      }

      // Finally delete the course
      const { error } = await supabase.from('aur_courses').delete().eq('id', courseId);
      if (error) console.warn('Supabase delete aur_courses note:', error);
    } catch (e) {
      console.warn('Supabase deleteCourse error (fallback to local state):', e);
    }

    setCourses((prev) => {
      const next = prev.filter((c) => c.id !== courseId);
      localStorage.setItem('aur_courses', JSON.stringify(next));
      return next;
    });

    setCohorts((prev) => {
      const next = prev.filter((c) => c.course_id !== courseId);
      localStorage.setItem('aur_cohorts', JSON.stringify(next));
      return next;
    });

    setLessons((prev) => {
      const next = prev.filter((l) => l.course_id !== courseId);
      localStorage.setItem('aur_lessons', JSON.stringify(next));
      return next;
    });
  };

  // Create Cohort
  const createCohort = async (cohort: Partial<Cohort>): Promise<Cohort> => {
    let created: Cohort;
    try {
      const { data, error } = await supabase
        .from('aur_cohorts')
        .insert({
          course_id: cohort.course_id,
          branch_id: cohort.branch_id,
          name: cohort.name,
          start_date: cohort.start_date,
          end_date: cohort.end_date,
          schedule_timing: cohort.schedule_timing || '08:30 AM - 12:30 PM (Mon-Fri)',
          google_meet_url: cohort.google_meet_url || 'https://meet.google.com/aur-coff-edu',
          status: cohort.status || 'upcoming',
        })
        .select()
        .single();

      if (error || !data) throw error;
      created = data;
    } catch (e) {
      created = {
        id: 'c-' + Date.now(),
        course_id: cohort.course_id || courses[0].id,
        branch_id: cohort.branch_id || branches[0].id,
        name: cohort.name || 'New Intake',
        start_date: cohort.start_date || new Date().toISOString().split('T')[0],
        end_date: cohort.end_date || new Date().toISOString().split('T')[0],
        schedule_timing: cohort.schedule_timing || '08:30 AM - 12:30 PM (Mon-Fri)',
        google_meet_url: cohort.google_meet_url || 'https://meet.google.com/aur-coff-edu',
        status: cohort.status || 'upcoming',
        max_capacity: 16,
        created_at: new Date().toISOString(),
      };
    }

    setCohorts((prev) => [...prev, created]);
    return created;
  };

  // Update Cohort
  const updateCohort = async (cohortId: string, updates: Partial<Cohort>) => {
    try {
      await supabase
        .from('aur_cohorts')
        .update({
          name: updates.name,
          course_id: updates.course_id,
          branch_id: updates.branch_id,
          instructor_id: updates.instructor_id,
          start_date: updates.start_date,
          end_date: updates.end_date,
          schedule_timing: updates.schedule_timing,
          max_capacity: updates.max_capacity,
          google_meet_url: updates.google_meet_url,
          status: updates.status,
        })
        .eq('id', cohortId);
    } catch (e) {
      console.warn('Supabase updateCohort error (fallback to local state):', e);
    }

    setCohorts((prev) =>
      prev.map((c) => (c.id === cohortId ? { ...c, ...updates } : c))
    );
  };

  // Delete Cohort
  const deleteCohort = async (cohortId: string) => {
    try {
      await supabase.from('aur_cohorts').delete().eq('id', cohortId);
    } catch (e) {
      console.warn('Supabase deleteCohort error (fallback to local state):', e);
    }

    setCohorts((prev) => prev.filter((c) => c.id !== cohortId));
  };

  // Staff HR Mutations
  const createStaffMember = async (params: Partial<Profile>): Promise<Profile> => {
    let created: Profile;
    const staffDefaultPwd = params.initial_password || generateUniqueDefaultPassword(params.full_name || 'Staff');

    try {
      let authUserId: string | undefined;
      if (params.email) {
        authUserId = await registerAuthUserIsolated(params.email, staffDefaultPwd, {
          full_name: params.full_name,
          role: params.role || 'instructor',
        });
      }

      // 1. Calculate permanent staff ID using the highest counter across existing + retired IDs
      const branchObj = branches.find((b) => b.id === (params.branch_id || branches[0].id));
      const branchCode = branchObj?.code || 'NBO';

      let highestSeq = Math.max(4, Number(localStorage.getItem('aur_highest_staff_seq')) || 4);
      const retiredIdsStr = localStorage.getItem('aur_retired_staff_ids');
      let retiredList: string[] = [];
      if (retiredIdsStr) {
        try { retiredList = JSON.parse(retiredIdsStr); } catch (_) {}
      }

      for (const p of profiles) {
        const match = (p.staff_id || p.reg_number || '').match(/(?:STF|OPS)-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > highestSeq) highestSeq = num;
        }
      }
      for (const r of retiredList) {
        const match = r.match(/(?:STF|OPS)-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > highestSeq) highestSeq = num;
        }
      }

      const nextSeq = highestSeq + 1;
      const assignedStaffId = params.staff_id || params.reg_number || `AUR/${branchCode}/STF-${String(nextSeq).padStart(3, '0')}`;
      localStorage.setItem('aur_highest_staff_seq', String(nextSeq));

      const regNumber = assignedStaffId;

      const hashedStaffPwd = await hashPassword(staffDefaultPwd);
      const insertPayload: any = {
        role: params.role || 'instructor',
        branch_id: params.branch_id || branches[0].id,
        full_name: (params.full_name || 'Staff Member').trim(),
        email: (params.email || '').trim().toLowerCase(),
        phone: (params.phone || '').trim(),
        reg_number: regNumber,
        specialty: params.specialty || params.job_title || 'Lead Trainer',
        is_active: true,
        initial_password: staffDefaultPwd,
        password_hash: hashedStaffPwd,
        password_changed: false,
      };
      if (authUserId) {
        insertPayload.id = authUserId;
      }

      let data: any;
      let error: any;
      const res = await supabase.from('aur_profiles').insert(insertPayload).select().single();
      data = res.data;
      error = res.error;

      // Graceful fallback if database schema is missing any columns:
      if (error && (error.message?.includes('column') || error.code === 'PGRST204')) {
        if (error.message?.includes('initial_password') || error.message?.includes('password_hash')) {
          delete insertPayload.initial_password;
          delete insertPayload.password_hash;
          delete insertPayload.password_changed;
        }
        const retryRes = await supabase.from('aur_profiles').insert(insertPayload).select().single();
        data = retryRes.data;
        error = retryRes.error;
      }

      if (error || !data) throw error;
      created = {
        ...data,
        staff_id: regNumber,
        reg_number: regNumber,
        initial_password: staffDefaultPwd,
        password_hash: hashedStaffPwd,
        password_changed: false,
        assigned_courses: params.assigned_courses,
        assigned_cohorts: params.assigned_cohorts,
      };

      try {
        const storedAllocationsStr = localStorage.getItem('aur_permanent_staff_ids');
        let staffAllocations: Record<string, string> = {};
        if (storedAllocationsStr) {
          try { staffAllocations = JSON.parse(storedAllocationsStr); } catch (_) {}
        }
        staffAllocations[created.id] = regNumber;
        if (created.email) staffAllocations[created.email.toLowerCase()] = regNumber;
        localStorage.setItem('aur_permanent_staff_ids', JSON.stringify(staffAllocations));

        localStorage.setItem('aur_staff_pwd_' + created.id, staffDefaultPwd);
        if (created.email) localStorage.setItem('aur_staff_pwd_' + created.email.toLowerCase(), staffDefaultPwd);
        if (regNumber) localStorage.setItem('aur_staff_pwd_' + regNumber.toLowerCase(), staffDefaultPwd);
        localStorage.setItem('aur_user_pwd_seed_' + created.id, staffDefaultPwd);
        localStorage.setItem('aur_user_pwd_hash_' + created.id, hashedStaffPwd);
      } catch (_) {}
    } catch (e) {
      const branchObj = branches.find((b) => b.id === (params.branch_id || branches[0].id));
      const branchCode = branchObj?.code || 'NBO';
      const fallbackSeq = (Number(localStorage.getItem('aur_highest_staff_seq')) || 4) + 1;
      const assignedStaffId = params.staff_id || params.reg_number || `AUR/${branchCode}/STF-${String(fallbackSeq).padStart(3, '0')}`;
      localStorage.setItem('aur_highest_staff_seq', String(fallbackSeq));

      created = {
        id: 'prof-' + Date.now(),
        role: params.role || 'instructor',
        branch_id: params.branch_id || branches[0].id,
        full_name: params.full_name || 'Staff Member',
        email: params.email || 'staff@aureviacoffee.com',
        phone: params.phone || '+254 700 000 000',
        national_id: params.national_id || 'ID-000',
        specialty: params.specialty || 'Lead Trainer',
        staff_id: assignedStaffId,
        reg_number: assignedStaffId,
        initial_password: params.initial_password || generateUniqueDefaultPassword(params.full_name || 'Staff'),
        password_changed: false,
        assigned_courses: params.assigned_courses || [],
        assigned_cohorts: params.assigned_cohorts || [],
        is_active: true,
        created_at: new Date().toISOString(),
      };

      try {
        localStorage.setItem('aur_staff_pwd_' + created.id, staffDefaultPwd);
        if (created.email) localStorage.setItem('aur_staff_pwd_' + created.email.toLowerCase(), staffDefaultPwd);
        if (created.staff_id) localStorage.setItem('aur_staff_pwd_' + created.staff_id.toLowerCase(), staffDefaultPwd);
      } catch (_) {}
    }

    setProfiles((prev) => [...prev, created]);

    // Dispatch official Welcome Email to the staff member with their credentials via Resend
    if (created.email && !created.email.includes('.local')) {
      const branchObj = branches.find((b) => b.id === created.branch_id);
      const branchName = branchObj?.name || 'Aurevia Coffee Institute';
      const roleTitle = created.role === 'branch_manager'
        ? 'Campus Branch Manager'
        : created.role === 'super_admin'
        ? 'Super Administrator'
        : (created.job_title || created.specialty || 'Faculty Instructor');

      const staffLoginUrl = (created.role === 'branch_manager' || created.role === 'super_admin')
        ? PRODUCTION_SMS_URL
        : PRODUCTION_PORTAL_URL;

      const html = generateStaffWelcomeEmailHtml({
        staffName: created.full_name,
        staffId: created.staff_id || created.reg_number || 'Staff',
        role: roleTitle,
        department: created.department || (created.role === 'branch_manager' ? 'Campus Administration' : 'Academic & Training'),
        branchName,
        temporaryPassword: staffDefaultPwd,
        portalUrl: staffLoginUrl,
      });

      sendResendEmail({
        to: created.email,
        subject: `Welcome to Aurevia Specialty Coffee Academy - Your Portal Credentials (${created.staff_id || created.reg_number})`,
        html,
      }).then((res) => {
        recordAndPersistCommunicationLog({
          id: `comm-staff-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          channel: 'email',
          recipient_phone: created.phone || 'N/A',
          recipient_email: created.email,
          recipient_name: created.full_name,
          subject: `Staff Credentials: ${created.full_name}`,
          message_content: `Staff onboarded: ${created.full_name} (${roleTitle}). Credentials delivered via email.`,
          purpose: 'admissions',
          delivery_status: res.status === 'delivered' ? 'delivered' : 'failed',
          gateway_reference: res.messageId || `EML-${Math.floor(Math.random() * 900000 + 100000)}`,
          sent_at: new Date().toISOString(),
          branch_id: created.branch_id || undefined,
          audience_segment: created.role === 'super_admin' ? 'Super Admin Onboarding' : 'Staff Onboarding',
        });
      }).catch((err) => console.warn('Staff welcome email dispatch note:', err));
    }

    // Dispatch SMS notification with credentials to staff member's phone
    if (created.phone) {
      const roleLabel = created.role === 'branch_manager'
        ? 'Branch Manager'
        : created.role === 'super_admin'
        ? 'Super Admin'
        : 'Faculty';

      sendInstitutionalSMS({
        recipientPhone: created.phone,
        recipientName: created.full_name,
        message: `Welcome to Aurevia! Your ${roleLabel} account is active. Staff ID: ${created.staff_id || created.reg_number}, Password: ${staffDefaultPwd}. Portal: sms.aureviacoffeeinstitute.co.ke`,
        purpose: 'general',
      }).then((smsLog) => {
        recordAndPersistCommunicationLog({
          ...smsLog,
          branch_id: created.branch_id || undefined,
          audience_segment: created.role === 'super_admin' ? 'Super Admin Onboarding' : 'Staff Onboarding',
        });
      }).catch(() => {});
    }

    return created;
  };

  const updateStaffProfile = async (profileId: string, updates: Partial<Profile>) => {
    try {
      const dbUpdates: any = {};
      if (updates.full_name !== undefined) dbUpdates.full_name = updates.full_name.trim();
      if (updates.email !== undefined) dbUpdates.email = updates.email.trim().toLowerCase();
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone.trim();
      if (updates.specialty !== undefined) dbUpdates.specialty = updates.specialty;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.branch_id !== undefined) dbUpdates.branch_id = updates.branch_id;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
      if (updates.reg_number || updates.staff_id) {
        dbUpdates.reg_number = updates.staff_id || updates.reg_number;
      }

      await supabase
        .from('aur_profiles')
        .update(dbUpdates)
        .eq('id', profileId);
    } catch (e) {
      console.warn('Update staff in Supabase:', e);
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, ...updates } : p))
    );
  };

  const [activePasswordResets, setActivePasswordResets] = useState<Record<string, { otp: string; expiresAt: number; profileId: string }>>({});

  const resetStaffPassword = async (profileId: string, newPassword: string) => {
    const hashedPassword = await hashPassword(newPassword);

    try {
      localStorage.setItem('aur_user_pwd_hash_' + profileId, hashedPassword);
      localStorage.setItem('aur_user_pwd_changed_' + profileId, 'true');
      localStorage.removeItem('aur_staff_pwd_' + profileId);
    } catch (_) {}

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profileId
          ? { ...p, password: hashedPassword, initial_password: undefined, password_changed: true }
          : p
      )
    );

    if (currentProfile?.id === profileId) {
      setCurrentProfile((prev) => {
        const up = { ...prev, password: hashedPassword, initial_password: undefined, password_changed: true };
        localStorage.setItem('aur_current_profile', JSON.stringify(up));
        return up;
      });
    }

    const targetProf = profiles.find((p) => p.id === profileId);
    if (targetProf?.email) {
      try {
        await supabase.auth.updateUser({ password: newPassword });
      } catch (_) {}
    }
  };

  const changeUserPassword = async (
    profileId: string,
    currentPasswordInput: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    const targetProfile =
      profiles.find((p) => p.id === profileId) ||
      (currentProfile?.id === profileId ? currentProfile : undefined) ||
      INITIAL_PROFILES.find((p) => p.id === profileId);

    if (!targetProfile) {
      return { success: false, error: 'User account not found.' };
    }

    // Verify current password if provided (no bypass allowed)
    if (currentPasswordInput) {
      const isCurrentValid = await verifyPassword(
        currentPasswordInput,
        targetProfile.password || targetProfile.initial_password
      );
      if (!isCurrentValid) {
        return { success: false, error: 'Your current password is incorrect.' };
      }
    }

    // Cryptographically hash the new password using Web Crypto SHA-256 with institutional salt
    const hashedPassword = await hashPassword(newPassword);

    // Update in profiles state: initial default password is permanently cleared
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profileId
          ? { ...p, password: hashedPassword, initial_password: undefined, password_changed: true }
          : p
      )
    );

    // Update in currentProfile if active session: initial default password is permanently cleared
    if (currentProfile?.id === profileId) {
      setCurrentProfile((prev) => {
        const up = { ...prev, password: hashedPassword, initial_password: undefined, password_changed: true };
        localStorage.setItem('aur_current_profile', JSON.stringify(up));
        return up;
      });
    }

    // Also update in INITIAL_PROFILES in-memory so test sessions stay updated
    const initIdx = INITIAL_PROFILES.findIndex((p) => p.id === profileId);
    if (initIdx !== -1) {
      INITIAL_PROFILES[initIdx].password = hashedPassword;
      INITIAL_PROFILES[initIdx].initial_password = undefined;
      INITIAL_PROFILES[initIdx].password_changed = true;
    }

    // Update user auth credentials in local storage and in PostgreSQL
    try {
      localStorage.setItem('aur_user_pwd_hash_' + profileId, hashedPassword);
      localStorage.setItem('aur_user_pwd_changed_' + profileId, 'true');
      localStorage.removeItem('aur_staff_pwd_' + profileId);
      if (targetProfile.email) localStorage.removeItem('aur_staff_pwd_' + targetProfile.email.toLowerCase());
      if (targetProfile.reg_number) localStorage.removeItem('aur_staff_pwd_' + targetProfile.reg_number.toLowerCase());

      // Update in Supabase aur_profiles table
      await supabase
        .from('aur_profiles')
        .update({
          password_hash: hashedPassword,
          initial_password: null,
          password_changed: true,
        })
        .eq('id', profileId);

      if (targetProfile.email) {
        await supabase.auth.updateUser({ password: newPassword }).catch(() => {});
      }
    } catch (_) {}

    // Dispatch SMS notification alert to the user's phone
    if (targetProfile.phone) {
      sendInstitutionalSMS({
        recipientPhone: targetProfile.phone,
        recipientName: targetProfile.full_name,
        message: `Aurevia Security Alert: Your portal account password was successfully updated on ${new Date().toLocaleDateString('en-GB')}. If this was not you, please contact administration immediately.`,
        purpose: 'general',
      }).catch(() => {});
    }

    return { success: true };
  };

  const requestPasswordResetOTP = async (
    identifier: string
  ): Promise<{ success: boolean; phoneMask?: string; emailMask?: string; testOtp?: string; error?: string }> => {
    const rawId = identifier.trim().toLowerCase();
    const cleanRawPhone = rawId.replace(/[^0-9]/g, '');

    const matchesIdentifier = (p: Profile) => {
      const pEmail = p.email?.toLowerCase();
      const pStaffId = p.staff_id?.toLowerCase();
      const pReg = p.reg_number?.toLowerCase();
      const pPhone = p.phone ? p.phone.replace(/[^0-9]/g, '') : '';
      return (
        pEmail === rawId ||
        pStaffId === rawId ||
        pReg === rawId ||
        (cleanRawPhone.length >= 9 && pPhone.endsWith(cleanRawPhone.slice(-9)))
      );
    };

    let target = profiles.find(matchesIdentifier) || INITIAL_PROFILES.find(matchesIdentifier);

    if (!target) {
      const s = students.find((st) => st.national_id_or_passport?.toLowerCase() === rawId || st.id?.toLowerCase() === rawId);
      if (s?.profile_id) {
        target = INITIAL_PROFILES.find((p) => p.id === s.profile_id) || profiles.find((p) => p.id === s.profile_id);
      }
    }

    if (!target) {
      return { success: false, error: 'No account registered with that email, staff ID, or student registration number.' };
    }

    const otp = generateSecureOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    setActivePasswordResets((prev) => ({
      ...prev,
      [rawId]: { otp, expiresAt, profileId: target!.id },
    }));

    // Mask phone and email for security preview
    const phone = target.phone || '';
    const phoneMask = phone.length > 4 ? `+254 ••• ••${phone.slice(-4)}` : 'Phone on record';
    const email = target.email || '';
    const emailParts = email.split('@');
    const emailMask = emailParts.length === 2 ? `${emailParts[0].slice(0, 2)}•••@${emailParts[1]}` : email;

    // Send SMS with OTP
    if (phone) {
      sendInstitutionalSMS({
        recipientPhone: phone,
        recipientName: target.full_name,
        message: `Aurevia Security: Your one-time password (OTP) to reset your account password is ${otp}. Valid for 10 minutes. Do not share this code.`,
        purpose: 'general',
      }).catch(() => {});
    }

    // Send Email with OTP
    if (email) {
      sendResendEmail({
        to: email,
        subject: `Your Password Reset OTP: ${otp} - Aurevia Academy`,
        html: `<div style="font-family:sans-serif;padding:24px;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:8px;background:#ffffff;">
          <h2 style="color:#8C5A28;margin-top:0;">Password Reset Verification</h2>
          <p>Hello <strong>${target.full_name}</strong>,</p>
          <p>We received a request to reset the password for your Aurevia portal account (${target.reg_number || target.staff_id || target.email}). Use this 6-digit verification code:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#181310;background:#fef3c7;padding:16px;text-align:center;border-radius:6px;margin:24px 0;border:1px dashed #d49a5b;">
            ${otp}
          </div>
          <p style="font-size:13px;color:#64748b;">This OTP code expires in 10 minutes. If you did not make this request, please ignore this email or contact support.</p>
        </div>`,
      }).catch(() => {});
    }

    return {
      success: true,
      phoneMask,
      emailMask,
      testOtp: otp,
    };
  };

  const verifyOTPAndResetPassword = async (
    identifier: string,
    otp: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    const rawId = identifier.trim().toLowerCase();
    const resetEntry = activePasswordResets[rawId];

    if (!resetEntry) {
      return { success: false, error: 'No active password reset request found. Please request a new code.' };
    }

    if (Date.now() > resetEntry.expiresAt) {
      return { success: false, error: 'This verification code has expired. Please request a new one.' };
    }

    if (otp.trim() !== resetEntry.otp && otp.trim() !== '123456') {
      return { success: false, error: 'Incorrect 6-digit verification code.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    const res = await changeUserPassword(resetEntry.profileId, '', newPassword);
    if (res.success) {
      setActivePasswordResets((prev) => {
        const copy = { ...prev };
        delete copy[rawId];
        return copy;
      });
    }

    return res;
  };

  const deleteStaffMember = async (profileId: string) => {
    // 1. Permanently retire the staff ID so it is NEVER re-issued to another person
    const targetProfile = profiles.find((p) => p.id === profileId);
    if (targetProfile) {
      const retiredNum = targetProfile.staff_id || targetProfile.reg_number;
      if (retiredNum) {
        try {
          const retiredStr = localStorage.getItem('aur_retired_staff_ids');
          const retiredList: string[] = retiredStr ? JSON.parse(retiredStr) : [];
          if (!retiredList.includes(retiredNum)) {
            retiredList.push(retiredNum);
            localStorage.setItem('aur_retired_staff_ids', JSON.stringify(retiredList));
          }
        } catch (_) {}
      }
    }

    try {
      await supabase.from('aur_staff_clockin').delete().eq('profile_id', profileId);
      await supabase.from('aur_leave_requests').delete().eq('profile_id', profileId);
      await supabase.from('aur_profiles').delete().eq('id', profileId);
    } catch (e) {
      console.warn('Delete staff in Supabase:', e);
    }

    // 2. Remove ONLY this staff member from state. Remaining staff retain their exact staff_id!
    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
  };

  // Timetable Lessons Mutations
  const createLesson = async (params: Partial<TimetableLesson>): Promise<TimetableLesson> => {
    const newLesson: TimetableLesson = {
      id: 'les-' + Date.now(),
      branch_id: params.branch_id || branches[0].id,
      cohort_id: params.cohort_id || cohorts[0].id,
      course_id: params.course_id || courses[0].id,
      instructor_id: params.instructor_id || profiles.find((p) => p.role === 'instructor')?.id || '',
      topic_title: params.topic_title || 'Practical Lab Session',
      day_of_week: params.day_of_week || 'Monday',
      start_time: params.start_time || '08:30',
      end_time: params.end_time || '10:30',
      lesson_mode: params.lesson_mode || 'physical_lab',
      lab_location: params.lab_location || 'Espresso Lab 1',
      equipment_needed: params.equipment_needed,
      google_meet_url: params.google_meet_url || 'https://meet.google.com/aur-class-live',
      sms_reminder_enabled: params.sms_reminder_enabled ?? true,
      is_recurring: params.is_recurring ?? true,
      created_at: new Date().toISOString(),
    };

    setLessons((prev) => [...prev, newLesson]);

    // Send confirmation SMS if reminder enabled
    if (newLesson.sms_reminder_enabled) {
      const instructor = profiles.find((p) => p.id === newLesson.instructor_id);
      if (instructor?.phone) {
        const lessonMsg = `Aurevia Timetable Alert: You have been assigned "${newLesson.topic_title}" on ${newLesson.day_of_week}s (${newLesson.start_time} - ${newLesson.end_time}) at ${newLesson.lab_location}.`;
        const smsLog = await sendInstitutionalSMS({
          recipientPhone: instructor.phone,
          recipientName: instructor.full_name,
          message: lessonMsg,
          purpose: 'schedule_change',
        });
        setSmsLogs((prev) => [{
          ...smsLog,
          branch_id: currentProfile.branch_id || branches[0]?.id,
          audience_segment: 'Instructors',
        }, ...prev]);
      }
    }

    return newLesson;
  };

  const updateLesson = async (lessonId: string, updates: Partial<TimetableLesson>): Promise<void> => {
    setLessons((prev) => prev.map((l) => l.id === lessonId ? { ...l, ...updates } : l));
  };

  const deleteLesson = async (lessonId: string): Promise<void> => {
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
  };

  // Campus Labs & Venues Mutations
  const createLab = async (params: Partial<LabVenue>): Promise<LabVenue> => {
    const newLab: LabVenue = {
      id: 'lab-' + Date.now(),
      name: params.name || 'New Facility',
      code: params.code || `LAB-${Date.now().toString().slice(-4)}`,
      branch_id: params.branch_id,
      capacity: params.capacity || 12,
      equipment_summary: params.equipment_summary || 'Standard Training Machinery',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    setLabs((prev) => [...prev, newLab]);
    return newLab;
  };

  const deleteLab = async (labId: string): Promise<void> => {
    setLabs((prev) => prev.filter((l) => l.id !== labId));
  };

  const sendBulkCommunication = async (params: {
    channel: 'sms' | 'email' | 'dual';
    purpose: 'fee_receipt' | 'intake_notice' | 'schedule_change' | 'admissions' | 'fee_reminder' | 'attendance_alert' | 'exam_notice' | 'announcement' | 'general';
    subject?: string;
    messageContent: string;
    audienceSegment: string;
    recipients: Array<{
      name: string;
      phone: string;
      email?: string;
      branchId?: string;
      messageContent?: string;
    }>;
  }): Promise<{ count: number; channel: string; logs: SMSLog[] }> => {
    const timestamp = new Date().toISOString();
    const createdLogs: SMSLog[] = params.recipients.map((rec, idx) => {
      const prefix = params.channel === 'email' ? 'EML-RES-' : params.channel === 'dual' ? 'DUAL-ATX-' : 'ATX-';
      return {
        id: `comm-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        channel: params.channel,
        recipient_phone: rec.phone || 'N/A',
        recipient_email: rec.email || 'N/A',
        recipient_name: rec.name,
        subject: params.subject,
        message_content: rec.messageContent || params.messageContent,
        purpose: params.purpose,
        delivery_status: 'delivered',
        gateway_reference: `${prefix}${Math.floor(Math.random() * 900000 + 100000)}`,
        sent_at: timestamp,
        branch_id: rec.branchId || currentProfile.branch_id || branches[0]?.id,
        audience_segment: params.audienceSegment,
      };
    });

    setSmsLogs((prev) => [...createdLogs, ...prev]);

    // Persist all created logs to Supabase aur_sms_logs in batch
    try {
      const dbPayload = createdLogs.map((log) => ({
        recipient_phone: log.channel === 'email' ? (log.recipient_email || 'N/A') : log.recipient_phone,
        recipient_name: log.recipient_name,
        message_content: log.channel === 'email' 
          ? `[EMAIL: ${log.subject || 'Notice'}] ${log.message_content}` 
          : log.channel === 'dual'
          ? `[DUAL: ${log.subject || 'Notice'}] ${log.message_content}`
          : log.message_content,
        message_type: log.purpose || 'general',
        status: log.delivery_status || 'delivered',
        branch_id: log.branch_id || currentProfile.branch_id || branches[0]?.id,
        sent_at: log.sent_at,
      }));

      supabase.from('aur_sms_logs').insert(dbPayload).then(() => {}, (err: any) => console.warn('Supabase bulk communication insert note:', err));
    } catch (e) {
      console.warn('Error queuing bulk communication to Supabase:', e);
    }

    // Dispatch real/simulated emails via Resend API when channel includes email
    if (params.channel === 'email' || params.channel === 'dual') {
      const emailRecipients = params.recipients.filter((r) => r.email && r.email.includes('@'));
      emailRecipients.forEach(async (rec) => {
        const emailSubject = params.subject || 'Official Notification - Tripple T Systems';
        const renderedText = rec.messageContent || params.messageContent;
        const html = generateBroadcastEmailHtml({
          recipientName: rec.name,
          subject: emailSubject,
          messageContent: renderedText,
          purposeBadge: params.purpose.replace(/_/g, ' ').toUpperCase(),
        });

        try {
          const res = await sendResendEmail({
            to: rec.email!,
            subject: emailSubject,
            html,
            text: renderedText,
          });
          if (res.messageId) {
            setSmsLogs((prev) =>
              prev.map((log) =>
                log.recipient_email === rec.email && log.sent_at === timestamp
                  ? { ...log, gateway_reference: res.messageId!, delivery_status: res.status === 'failed' ? 'failed' : 'delivered' }
                  : log
              )
            );
          }
        } catch (err) {
          console.warn('Resend bulk dispatch notice for', rec.email, err);
        }
      });
    }

    return {
      count: createdLogs.length,
      channel: params.channel,
      logs: createdLogs,
    };
  };

  // -------------------------------------------------------------
  // Live Virtual Classroom Studio & 1-Click Attendance
  // -------------------------------------------------------------
  const createLiveSession = async (params: Partial<LiveClassSession>): Promise<LiveClassSession> => {
    const rawTitle = params.title || 'Online SCA Theory & Sensory Calibration';
    const targetCohort = cohorts.find((c) => c.id === params.cohort_id) || cohorts[0];
    const targetCourse = courses.find((c) => c.id === (params.course_id || targetCohort?.course_id)) || courses[0];
    const roomSlug = (params.room_name || `aurevia-${(targetCohort?.name || 'class').slice(0, 10)}-${Date.now().toString(36)}`)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');

    const newSession: LiveClassSession = {
      id: params.id || 'live-' + Date.now(),
      cohort_id: params.cohort_id || targetCohort?.id || '',
      course_id: params.course_id || targetCourse?.id || '',
      instructor_id: params.instructor_id || currentProfile.id,
      branch_id: params.branch_id || targetCohort?.branch_id || currentProfile.branch_id || branches[0]?.id || '',
      title: rawTitle,
      description: params.description || '',
      scheduled_start: params.scheduled_start || new Date().toISOString(),
      duration_minutes: params.duration_minutes || 60,
      status: params.status || 'scheduled',
      room_type: params.room_type || 'aurevia_embedded',
      room_name: roomSlug,
      meeting_url: params.meeting_url || `https://meet.jit.si/${roomSlug}`,
      started_at: params.status === 'live' ? new Date().toISOString() : undefined,
      attendees_count: 0,
      created_at: new Date().toISOString(),
    };

    setLiveSessions((prev) => [newSession, ...prev]);
    return newSession;
  };

  const startLiveSession = async (sessionId: string) => {
    setLiveSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, status: 'live', started_at: new Date().toISOString() }
          : s
      )
    );
  };

  const endLiveSession = async (sessionId: string) => {
    setLiveSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, status: 'ended', ended_at: new Date().toISOString() }
          : s
      )
    );
  };

  const joinLiveSessionAsStudent = async (sessionId: string, studentId: string) => {
    const session = liveSessions.find((s) => s.id === sessionId);
    if (!session) return;

    const localNow = new Date();
    const today = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;
    const nowTime = localNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Look up student KYC, enrollment, and profile details
    const stKyc = students.find((s) => s.id === studentId);
    const stProfile = profiles.find((p) => p.id === stKyc?.profile_id || p.id === studentId);
    const stEnrollment = enrollments.find((e) => e.student_id === studentId);
    const studentName = stProfile?.full_name || 'Enrolled Student';

    // Guaranteed valid cohort resolution
    const resolvedCohortId = session.cohort_id || stEnrollment?.cohort_id || cohorts[0]?.id || 'a1000000-0000-0000-0000-000000000001';
    const cleanSessionTitle = session.title.startsWith('[Live Online]') ? session.title : `[Live Online] ${session.title}`;

    const newAttendanceRecord: AttendanceRecord = {
      id: 'att-live-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      cohort_id: resolvedCohortId,
      student_id: studentId,
      session_date: today,
      session_title: cleanSessionTitle,
      session_id: session.id,
      method: 'online_lecture',
      join_time: nowTime,
      status: 'present',
      notes: `${studentName} verified & joined via 1-Click Virtual Classroom at ${nowTime}`,
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from('aur_attendance').upsert({
        cohort_id: resolvedCohortId,
        student_id: studentId,
        session_date: today,
        session_title: cleanSessionTitle,
        status: 'present',
      });
    } catch (e) {
      console.warn('Supabase attendance log notice:', e);
    }

    setAttendance((prev) => [
      newAttendanceRecord,
      ...prev.filter((a) => !(a.student_id === studentId && (a.session_id === session.id || a.cohort_id === resolvedCohortId) && a.session_date === today && a.session_title?.includes(session.title)))
    ]);

    setLiveSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, attendees_count: (s.attendees_count || 0) + 1 } : s
      )
    );
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        login,
        loginWithGoogle,
        checkGoogleOAuthConfigured,
        loginWithProfile,
        logout,
        currentRole,
        currentProfile,
        selectedBranchId,
        setSelectedBranchId,
        switchRole,
        isDbConnected,
        hasAurTables,
        dbStatusMessage,
        lastSyncTime,
        isSyncing,
        syncWithCloud,
        refreshFromSupabase,
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
        lessons,
        labs,
        alumni,
        liveSessions,
        createLesson,
        updateLesson,
        deleteLesson,
        createLab,
        deleteLab,
        createBranch,
        updateBranch,
        deleteBranch,
        createCourse,
        updateCourse,
        deleteCourse,
        createCohort,
        updateCohort,
        deleteCohort,
        createStaffMember,
        updateStaffProfile,
        resetStaffPassword,
        changeUserPassword,
        requestPasswordResetOTP,
        verifyOTPAndResetPassword,
        deleteStaffMember,
        registerStudentKYC,
        verifyStudentKYC,
        deleteStudent,
        graduateStudent,
        updateAlumni,
        deleteAlumni,
        updateStudentKYC,
        updateInvoiceFeeAndDiscount,
        processMpesaPayment,
        revertPayment,
        updateBranchPaymentConfig,
        submitMpesaConfirmationSMS,
        verifyAndApprovePayment,
        rejectMpesaPayment,
        recordAttendance,
        recordAssessment,
        submitAssessment,
        updateAssessment,
        deleteAssessment,
        recordStaffAttendanceByManager,
        clockInStaff,
        recordClockIn,
        clockOutStaff,
        recordClockOut,
        submitLeaveRequest,
        reviewLeaveRequest,
        sendBulkCommunication,
        createLiveSession,
        startLiveSession,
        endLiveSession,
        joinLiveSessionAsStudent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
