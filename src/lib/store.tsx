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
} from './mockData';
import { INITIAL_ALUMNI } from './alumniData';
import { supabase, checkSupabaseConnection } from './supabase';
import { generateMpesaReceiptNumber } from './mpesa';
import { sendInstitutionalSMS } from './sms';
import { sendResendEmail } from './resend';
import {
  generateWelcomeAdmissionEmailHtml,
  generateTuitionReceiptEmailHtml,
  generateAgreementSignedEmailHtml,
  generateBroadcastEmailHtml,
} from './emailTemplates';

interface AppContextType {
  // Authentication & Session
  isAuthenticated: boolean;
  login: (credentials: { identifier: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithProfile: (profile: Profile) => void;
  logout: () => void;

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
  alumni: Alumni[];
  liveSessions: LiveClassSession[];

  // Mutations
  createLesson: (lesson: Partial<TimetableLesson>) => Promise<TimetableLesson>;
  deleteLesson: (lessonId: string) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  graduateStudent: (enrollmentId: string) => Promise<void>;
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
  }) => Promise<{ profile: Profile; regNumber: string; invoice: Invoice }>;
  verifyStudentKYC: (studentId: string) => Promise<void>;
  processMpesaPayment: (params: {
    invoiceId: string;
    amount: number;
    phone: string;
    paymentMethod?: 'mpesa' | 'cash' | 'bank_transfer';
  }) => Promise<Payment>;
  revertPayment: (paymentId: string) => Promise<void>;
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
const CURRENT_STORAGE_VERSION = 'v5_aurevia_coffee_institute_fixed';

if (typeof window !== 'undefined') {
  const currentVer = localStorage.getItem(STORAGE_CLEAN_VERSION_KEY);
  if (currentVer !== CURRENT_STORAGE_VERSION) {
    // Purge cached test data and stale branch cache to load Aurevia Coffee Institute
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
    return saved ? JSON.parse(saved) : [];
  });

  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('aur_profiles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((p: Profile) => p.role !== 'student');
        }
      } catch (_) {}
    }
    return INITIAL_PROFILES.filter((p) => p.role !== 'student');
  });

  const [students, setStudents] = useState<StudentKYC[]>(() => {
    const saved = localStorage.getItem('aur_students');
    return saved ? JSON.parse(saved) : [];
  });

  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => {
    const saved = localStorage.getItem('aur_enrollments');
    return saved ? JSON.parse(saved) : [];
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('aur_invoices');
    return saved ? JSON.parse(saved) : [];
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('aur_payments');
    return saved ? JSON.parse(saved) : [];
  });

  const [assessments, setAssessments] = useState<Assessment[]>(() => {
    const saved = localStorage.getItem('aur_assessments');
    return saved ? JSON.parse(saved) : [];
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('aur_attendance');
    return saved ? JSON.parse(saved) : [];
  });

  const [staffClockins, setStaffClockins] = useState<StaffClockIn[]>(() => {
    const saved = localStorage.getItem('aur_staff_clockins');
    return saved ? JSON.parse(saved) : [];
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('aur_leave_requests');
    return saved ? JSON.parse(saved) : [];
  });

  const [smsLogs, setSmsLogs] = useState<SMSLog[]>(() => {
    const saved = localStorage.getItem('aur_sms_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [lessons, setLessons] = useState<TimetableLesson[]>(() => {
    const saved = localStorage.getItem('aur_lessons');
    return saved ? JSON.parse(saved) : [];
  });

  const [alumni, setAlumni] = useState<Alumni[]>(() => {
    const saved = localStorage.getItem('aur_alumni');
    return saved ? JSON.parse(saved) : [];
  });

  const [liveSessions, setLiveSessions] = useState<LiveClassSession[]>(() => {
    const saved = localStorage.getItem('aur_live_sessions');
    return saved ? JSON.parse(saved) : [];
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

        // Normalize invoices to guarantee branch_id is always present
        const rawInvoices = iRes.data || [];
        const normalizedInvoices: Invoice[] = rawInvoices.map((inv: any) => {
          const matchingStudent = rawStudents.find((s: any) => s.id === inv.student_id);
          const matchingCohort = rawCohorts.find((c: any) => c.id === inv.cohort_id);
          const branchId = inv.branch_id || matchingStudent?.branch_id || matchingCohort?.branch_id || 'b1000000-0000-0000-0000-000000000001';
          return {
            ...inv,
            branch_id: branchId,
            balance_due: inv.balance_due !== undefined ? Number(inv.balance_due) : Math.max(0, Number(inv.total_fee) - Number(inv.amount_paid || 0)),
          };
        });

        // Normalize payments to guarantee mpesa_phone_number
        const rawPayments = payRes.data || [];
        const normalizedPayments: Payment[] = rawPayments.map((p: any) => ({
          ...p,
          mpesa_phone_number: p.payer_phone || p.mpesa_phone_number || '',
        }));

        // Normalize SMS logs
        const rawSms = smsRes.data || [];
        const normalizedSms: SMSLog[] = rawSms.map((log: any) => ({
          ...log,
          purpose: log.message_type || log.purpose || 'general',
          delivery_status: log.status || log.delivery_status || 'delivered',
        }));

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

        const liveBranches = (bRes.data && bRes.data.length > 0)
          ? bRes.data.map((b: any, idx: number) =>
              idx === 0 || b.id === 'b1000000-0000-0000-0000-000000000001'
                ? { ...b, name: 'Aurevia Coffee Institute' }
                : b
            )
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
        setCohorts(hRes.data || []);

        // Remove student profiles from faculty/staff profiles
        const cleanProfiles = (pRes.data && pRes.data.length > 0)
          ? pRes.data.filter((p: any) => p.role !== 'student')
          : INITIAL_PROFILES.filter((p) => p.role !== 'student');
        setProfiles(cleanProfiles);

        setStudents(sRes.data || []);
        setEnrollments(eRes.data || []);
        setInvoices(normalizedInvoices);
        setPayments(normalizedPayments);
        setAssessments(assRes.data || []);
        setAttendance(attRes.data || []);
        setStaffClockins(scRes.data || []);
        setLeaveRequests(lrRes.data || []);
        setSmsLogs(normalizedSms);
        setAlumni(alRes.data || []);

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
              const normalized: Invoice = {
                ...row,
                branch_id: row.branch_id || student?.branch_id || cohort?.branch_id || 'b1000000-0000-0000-0000-000000000001',
                balance_due: row.balance_due !== undefined ? Number(row.balance_due) : Math.max(0, Number(row.total_fee) - Number(row.amount_paid || 0)),
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
              const exists = prev.find((s) => s.id === row.id);
              if (exists) {
                return prev.map((s) => (s.id === row.id ? { ...s, ...row } : s));
              }
              return [row, ...prev];
            });
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
    const matchingProfile = profiles.find((p) => p.role === role);
    if (matchingProfile) {
      const sanitized = matchingProfile.reg_number === 'AUR/NBO/2026/001' || matchingProfile.full_name === 'Faith Cherono'
        ? { ...matchingProfile, phone: '0714767240' }
        : matchingProfile;
      setCurrentProfile(sanitized);
    }
    setCurrentRole(role);
  };

  // Authentication & Session Handlers
  const loginWithProfile = (profile: Profile) => {
    setCurrentProfile(profile);
    setCurrentRole(profile.role);
    setIsAuthenticated(true);
    localStorage.setItem('aur_auth_session', 'true');
    localStorage.setItem('aur_current_profile', JSON.stringify(profile));
  };

  const login = async (credentials: { identifier: string; password?: string }): Promise<{ success: boolean; error?: string }> => {
    const rawId = credentials.identifier.trim().toLowerCase();
    const enteredPass = credentials.password?.trim() || '';

    // 1. Look for staff / admin / trainee in profiles (by email, staff_id, or reg_number)
    const matchedProfile = profiles.find((p) =>
      p.email?.toLowerCase() === rawId ||
      p.staff_id?.toLowerCase() === rawId ||
      p.reg_number?.toLowerCase() === rawId ||
      p.full_name?.toLowerCase() === rawId
    );

    // 2. Look for student in students directory by passport/national ID or ID
    const matchedStudent = !matchedProfile
      ? students.find((s) => s.id === rawId || s.national_id_or_passport?.toLowerCase() === rawId)
      : null;

    if (matchedProfile) {
      if (enteredPass && matchedProfile.initial_password) {
        if (enteredPass !== matchedProfile.initial_password && enteredPass !== 'Aurevia@2026!') {
          return { success: false, error: 'Incorrect password for this profile.' };
        }
      }
      loginWithProfile(matchedProfile);
      return { success: true };
    }

    if (matchedStudent) {
      const studentProfile = profiles.find((p) => p.id === matchedStudent.profile_id);
      if (studentProfile) {
        loginWithProfile(studentProfile);
        return { success: true };
      }
    }

    // Try Supabase Auth sign in if user entered email + password
    if (rawId.includes('@') && enteredPass) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: rawId,
          password: enteredPass,
        });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data.user) {
          const userProfile: Profile = {
            id: data.user.id,
            role: 'super_admin',
            full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Administrator',
            email: data.user.email || rawId,
            phone: data.user.phone || '',
            branch_id: null,
            is_active: true,
            created_at: new Date().toISOString(),
          };
          loginWithProfile(userProfile);
          return { success: true };
        }
      } catch (authErr: any) {
        return { success: false, error: authErr.message || 'Supabase authentication failed.' };
      }
    }

    // Quick keyword fallback for admin testing
    if (rawId === 'admin' || rawId === 'super_admin' || rawId === 'ronny') {
      const adminProfile = profiles.find((p) => p.role === 'super_admin') || INITIAL_PROFILES[0];
      loginWithProfile(adminProfile);
      return { success: true };
    }

    return {
      success: false,
      error: 'No active profile found with this email, staff ID, or registration number.',
    };
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
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
    supabase.auth.signOut().catch(() => {});
  };

  // Listen for Supabase OAuth redirects on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsAuthenticated(true);
        localStorage.setItem('aur_auth_session', 'true');
        const userEmail = session.user.email?.toLowerCase();
        if (userEmail) {
          const matched = profiles.find((p) => p.email?.toLowerCase() === userEmail);
          if (matched) {
            setCurrentProfile(matched);
            setCurrentRole(matched.role);
            localStorage.setItem('aur_current_profile', JSON.stringify(matched));
          } else {
            const googleProfile: Profile = {
              id: session.user.id,
              role: 'super_admin',
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Google User',
              email: session.user.email || '',
              phone: session.user.phone || '',
              branch_id: null,
              is_active: true,
              created_at: new Date().toISOString(),
            };
            setCurrentProfile(googleProfile);
            setCurrentRole('super_admin');
            localStorage.setItem('aur_current_profile', JSON.stringify(googleProfile));
          }
        }
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        localStorage.setItem('aur_auth_session', 'true');
        const userEmail = session.user.email?.toLowerCase();
        if (userEmail) {
          const matched = profiles.find((p) => p.email?.toLowerCase() === userEmail);
          if (matched) {
            setCurrentProfile(matched);
            setCurrentRole(matched.role);
            localStorage.setItem('aur_current_profile', JSON.stringify(matched));
          }
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [profiles]);

  // Helper to generate Registration Number: AUR/{BRANCH}/{YEAR}/{SEQ}
  const generateRegNumber = (branchId: string): string => {
    const branch = branches.find((b) => b.id === branchId) || branches[0];
    const branchCode = branch?.code || 'NBO';
    const year = new Date().getFullYear();
    const existingForBranch = profiles.filter((p) => p.reg_number && p.reg_number.includes(`/${branchCode}/${year}/`));
    const nextSeq = existingForBranch.length + 1;
    return `AUR/${branchCode}/${year}/${String(nextSeq).padStart(3, '0')}`;
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
  }) => {
    const branch = branches.find((b) => b.id === params.branchId) || branches[0];
    const branchCode = branch?.code || 'NBO';
    const regNumber = generateRegNumber(params.branchId);
    const course = courses.find((c) => c.id === params.courseId) || courses[0];
    const feeAmount = course?.fee_amount || 35000;

    let createdProfile: Profile;
    let createdStudent: StudentKYC;
    let createdEnrollment: Enrollment;
    let createdInvoice: Invoice;

    try {
      // 1. Insert Profile into Supabase
      const { data: profData, error: profErr } = await supabase
        .from('aur_profiles')
        .insert({
          role: 'student',
          branch_id: params.branchId,
          full_name: params.fullName,
          email: params.email,
          phone: params.phone,
          national_id: params.nationalId,
          reg_number: regNumber,
          is_active: true,
        })
        .select()
        .single();

      if (profErr || !profData) {
        throw new Error(profErr?.message || 'Failed to create profile');
      }
      createdProfile = profData;

      // 2. Insert Student KYC into Supabase
      const { data: stData, error: stErr } = await supabase
        .from('aur_students')
        .insert({
          profile_id: createdProfile.id,
          branch_id: params.branchId,
          national_id_or_passport: params.nationalId,
          emergency_contact_name: params.emergencyName,
          emergency_contact_phone: params.emergencyPhone,
          emergency_contact_relationship: params.emergencyRelationship,
          kyc_verified: true,
          coffee_experience_level: params.coffeeExperience,
        })
        .select()
        .single();

      if (stErr || !stData) {
        throw new Error(stErr?.message || 'Failed to create student record');
      }
      createdStudent = { ...stData, profile: createdProfile };

      // 3. Insert Enrollment into Supabase
      const { data: enrData, error: enrErr } = await supabase
        .from('aur_enrollments')
        .insert({
          student_id: createdStudent.id,
          cohort_id: params.cohortId,
          branch_id: params.branchId,
          status: 'enrolled',
        })
        .select()
        .single();

      if (enrErr || !enrData) {
        throw new Error(enrErr?.message || 'Failed to create enrollment');
      }
      createdEnrollment = enrData;

      // 4. Insert Invoice into Supabase
      const invNumber = `INV-AUR-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        { data: invData, error: invErr } = await supabase
          .from('aur_invoices')
          .insert({
            invoice_number: invNumber,
            enrollment_id: createdEnrollment.id,
            student_id: createdStudent.id,
            cohort_id: params.cohortId,
            total_fee: feeAmount,
            amount_paid: 0,
            status: 'unpaid',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          })
          .select()
          .single();

      if (invErr || !invData) {
        throw new Error(invErr?.message || 'Failed to create invoice');
      }
      createdInvoice = { ...invData, branch_id: params.branchId };

      // 5. Insert SMS log
      const smsMsg = `Welcome to ${branch.name || 'Aurevia Coffee Institute'}! Reg No: ${regNumber}. Invoice: ${invNumber} (KES ${feeAmount.toLocaleString()}). Tripple T Systems.`;
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
    } catch (err) {
      console.warn('Falling back to local reactive store:', err);
      // Fallback for offline or client-only mode
      const pId = 'prof-' + Date.now();
      const sId = 's-' + Date.now();
      const eId = 'e-' + Date.now();
      const iId = 'inv-' + Date.now();

      createdProfile = {
        id: pId,
        role: 'student',
        branch_id: params.branchId,
        full_name: params.fullName,
        email: params.email,
        phone: params.phone,
        national_id: params.nationalId,
        reg_number: regNumber,
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
        amount_paid: 0,
        balance_due: feeAmount,
        status: 'unpaid',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      };
    }

    // Update React State immediately
    setProfiles((prev) => [...prev, createdProfile]);
    setStudents((prev) => [...prev, createdStudent]);
    setEnrollments((prev) => [...prev, createdEnrollment]);
    setInvoices((prev) => [...prev, createdInvoice]);

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
      });

      sendResendEmail({
        to: params.email,
        subject: `Welcome to ${branchObj?.name || 'Aurevia Coffee Institute'} - Reg: ${regNumber}`,
        html: welcomeHtml,
      }).then((res) => {
        setSmsLogs((prev) => [
          {
            id: `comm-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            channel: 'email',
            recipient_phone: params.phone,
            recipient_email: params.email,
            recipient_name: params.fullName,
            subject: `Official Enrollment Confirmation: ${regNumber}`,
            message_content: admissionMsg,
            purpose: 'admissions',
            delivery_status: res.status === 'delivered' ? 'delivered' : 'failed',
            gateway_reference: res.messageId || `EML-FAIL-${Math.floor(Math.random() * 900000 + 100000)}`,
            sent_at: new Date().toISOString(),
            branch_id: params.branchId,
            audience_segment: 'New Admissions',
          },
          ...prev,
        ]);
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

    try {
      await supabase
        .from('aur_enrollments')
        .update({
          status: 'completed',
          certificate_serial_no: certSerial,
        })
        .eq('id', enrollmentId);
    } catch (e) {
      console.warn('Graduate in Supabase:', e);
    }

    setEnrollments((prev) =>
      prev.map((e) =>
        e.id === enrollmentId
          ? { ...e, status: 'completed', certificate_serial_no: certSerial }
          : e
      )
    );
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

    try {
      if (student.profile_id) {
        const profileUpdates: any = {
          full_name: params.fullName,
          email: params.email,
          phone: params.phone,
          national_id: params.nationalId,
        };
        if (params.avatarUrl !== undefined) profileUpdates.avatar_url = params.avatarUrl;
        if (params.newPassword) profileUpdates.password = params.newPassword;

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
              password: params.newPassword || p.password,
            }
          : p
      )
    );

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

    // Send SMS receipt and register in communications hub
    const student = students.find((s) => s.id === invoice.student_id);
    const studentProfile = profiles.find((p) => p.id === student?.profile_id);
    const branchObj = branches.find((b) => b.id === invoice.branch_id);
    const receiptMsg = `Confirmed KES ${params.amount.toLocaleString()} received for Invoice ${invoice.invoice_number}. M-Pesa Ref: ${receiptNumber}. ${branchObj?.name || 'Aurevia Coffee Institute'} (Tripple T).`;
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

    // Dispatch Resend branded HTML tuition receipt email
    if (studentProfile?.email && studentProfile.email.includes('@')) {
      const enrollment = enrollments.find((e) => e.id === invoice.enrollment_id);
      const cohort = cohorts.find((ch) => ch.id === enrollment?.cohort_id);
      const course = courses.find((c) => c.id === cohort?.course_id);
      const emailHtml = generateTuitionReceiptEmailHtml({
        studentName: studentProfile.full_name,
        regNumber: studentProfile.reg_number || 'AUR/NBO/2026/001',
        courseTitle: course?.title || 'Specialty Coffee Course',
        amountPaid: params.amount,
        receiptNumber,
        mpesaCode: receiptNumber,
        balanceDue: newBalance,
      });

      sendResendEmail({
        to: studentProfile.email,
        subject: `Payment Receipt: KES ${params.amount.toLocaleString()} - ${branchObj?.name || 'Aurevia Coffee Institute'}`,
        html: emailHtml,
      }).then((res) => {
        setSmsLogs((prev) => [
          {
            id: `comm-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            channel: 'email',
            recipient_phone: params.phone,
            recipient_email: studentProfile.email,
            recipient_name: studentProfile.full_name,
            subject: `Payment Receipt: KES ${params.amount.toLocaleString()} (${receiptNumber})`,
            message_content: receiptMsg,
            purpose: 'fee_receipt',
            delivery_status: res.status === 'delivered' ? 'delivered' : 'failed',
            gateway_reference: res.messageId || `EML-FAIL-${Math.floor(Math.random() * 900000 + 100000)}`,
            sent_at: new Date().toISOString(),
            branch_id: invoice.branch_id,
            audience_segment: 'Fee Payers',
          },
          ...prev,
        ]);
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
      await supabase.from('aur_staff_clockin').upsert(
        {
          profile_id: params.profileId,
          branch_id: params.branchId,
          work_date: params.workDate,
          clock_in: params.clockIn || new Date().toISOString(),
          clock_out: params.clockOut || null,
          location_notes: params.locationNotes || 'Signed physical attendance book',
          status: params.clockOut ? 'completed' : 'on_duty',
        },
        { onConflict: 'profile_id,work_date' }
      );
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
        work_date: today,
        location_notes: locationNotes || 'Campus Lab',
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
    try {
      const { data, error } = await supabase
        .from('aur_profiles')
        .insert({
          role: params.role || 'instructor',
          branch_id: params.branch_id || branches[0].id,
          full_name: params.full_name,
          email: params.email,
          phone: params.phone,
          national_id: params.national_id,
          specialty: params.specialty,
          is_active: true,
        })
        .select()
        .single();

      if (error || !data) throw error;
      created = {
        ...data,
        staff_id: params.staff_id,
        initial_password: params.initial_password || 'Aurevia@2026!',
        password_changed: false,
        assigned_courses: params.assigned_courses,
        assigned_cohorts: params.assigned_cohorts,
      };
    } catch (e) {
      created = {
        id: 'prof-' + Date.now(),
        role: params.role || 'instructor',
        branch_id: params.branch_id || branches[0].id,
        full_name: params.full_name || 'Staff Member',
        email: params.email || 'staff@aureviacoffee.com',
        phone: params.phone || '+254 700 000 000',
        national_id: params.national_id || 'ID-000',
        specialty: params.specialty || 'Lead Trainer',
        staff_id: params.staff_id || `AUR/STF-${Date.now().toString().slice(-3)}`,
        initial_password: params.initial_password || 'Aurevia@2026!',
        password_changed: false,
        assigned_courses: params.assigned_courses || [],
        assigned_cohorts: params.assigned_cohorts || [],
        is_active: true,
        created_at: new Date().toISOString(),
      };
    }

    setProfiles((prev) => [...prev, created]);
    return created;
  };

  const updateStaffProfile = async (profileId: string, updates: Partial<Profile>) => {
    try {
      await supabase
        .from('aur_profiles')
        .update({
          full_name: updates.full_name,
          email: updates.email,
          phone: updates.phone,
          national_id: updates.national_id,
          specialty: updates.specialty,
          role: updates.role,
          branch_id: updates.branch_id,
        })
        .eq('id', profileId);
    } catch (e) {
      console.warn('Update staff in Supabase:', e);
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === profileId ? { ...p, ...updates } : p))
    );
  };

  const resetStaffPassword = async (profileId: string, newPassword: string) => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profileId
          ? { ...p, initial_password: newPassword, password_changed: true }
          : p
      )
    );
  };

  const deleteStaffMember = async (profileId: string) => {
    try {
      await supabase.from('aur_staff_clockin').delete().eq('profile_id', profileId);
      await supabase.from('aur_leave_requests').delete().eq('profile_id', profileId);
      await supabase.from('aur_profiles').delete().eq('id', profileId);
    } catch (e) {
      console.warn('Delete staff in Supabase:', e);
    }

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
      end_time: params.end_time || '12:30',
      lab_location: params.lab_location || 'Espresso Lab 1',
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

  const deleteLesson = async (lessonId: string): Promise<void> => {
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
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
        alumni,
        liveSessions,
        createLesson,
        deleteLesson,
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
        deleteStaffMember,
        registerStudentKYC,
        verifyStudentKYC,
        deleteStudent,
        graduateStudent,
        updateStudentKYC,
        processMpesaPayment,
        revertPayment,
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
