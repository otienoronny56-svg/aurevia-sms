import {
  Branch,
  Course,
  Profile,
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
  LiveClassSession,
} from '../types/database.types';

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    code: 'NBO',
    name: 'Aurevia Coffee Institute',
    address: 'Spring Valley Coffee Hub, Westlands',
    city: 'Nairobi',
    country: 'Kenya',
    phone: '+254 711 234 567',
    email: 'info@aureviacoffeeinstitute.co.ke',
    manager_name: undefined,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b2000000-0000-0000-0000-000000000002',
    code: 'MSA',
    name: 'Aurevia Coastal Barista Center',
    address: 'Nyali Links Plaza, 2nd Floor',
    city: 'Mombasa',
    country: 'Kenya',
    phone: '+254 722 345 678',
    email: 'mombasa@aureviacoffee.com',
    manager_name: undefined,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b3000000-0000-0000-0000-000000000003',
    code: 'KGL',
    name: 'Aurevia Kigali Specialty Lab',
    address: 'KG 674 St, Kimihurura',
    city: 'Kigali',
    country: 'Rwanda',
    phone: '+250 788 123 456',
    email: 'kigali@aureviacoffee.com',
    manager_name: undefined,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    code: 'BAR-101',
    title: 'Barista Skills Foundation & Latte Art',
    category: 'Barista Skills',
    duration_weeks: 2,
    fee_amount: 35000,
    description: 'Comprehensive commercial espresso extraction, palate calibration, sensory recognition, milk chemistry and microfoam latte art.',
    certification_title: 'Certified Barista Foundation (CBF)',
    is_active: true,
    modules: [
      'Espresso Calibration & Extraction',
      'Milk Chemistry & Microfoam Latte Art',
      'Barista Speed & Service Workflow',
      'Machine Preventative Maintenance',
    ],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c2000000-0000-0000-0000-000000000002',
    code: 'ROAST-201',
    title: 'Roasting Mastery & Drum Dynamics',
    category: 'Roasting',
    duration_weeks: 3,
    fee_amount: 55000,
    description: 'Advanced thermodynamics, rate of rise (RoR) curve profiling, green coffee moisture analysis, and defect roasts on commercial drum roasters.',
    certification_title: 'Certified Coffee Roaster Intermediate (CCRI)',
    is_active: true,
    modules: [
      'Green Coffee Moisture & Density',
      'Thermodynamics & RoR Profiling',
      'First Crack Management & Defect Roasts',
      'Roast Degassing & Cupping QC',
    ],
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c3000000-0000-0000-0000-000000000003',
    code: 'SENS-301',
    title: 'Sensory Analysis & SCA Cupping Protocol',
    category: 'Sensory & Cupping',
    duration_weeks: 2,
    fee_amount: 45000,
    description: 'SCA standard cupping protocol, aroma kit olfactory triangulation, organic acid identification, and palate calibration for coffee buyers.',
    certification_title: 'Certified Coffee Cupper & Sensory Specialist',
    is_active: true,
    modules: [
      'Sensory Physiology & Calibration',
      'Le Nez du Cafe Aroma Recognition',
      'Acid Identification & Triangulation',
      'SCA Official Cupping Protocol',
    ],
    created_at: '2026-01-01T00:00:00Z',
  },
];

// SYSTEM OWNER FALLBACK ONLY
export const INITIAL_PROFILES: Profile[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    role: 'super_admin',
    branch_id: undefined,
    full_name: 'Ronny Ronald',
    email: 'admin@aureviacoffeeinstitute.co.ke',
    phone: '+254 700 000 001',
    reg_number: 'AUR/DIR/001',
    specialty: 'Executive Director & Master Roaster',
    initial_password: 'Aur#9841!Ronn',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
];

// Single Active Cohort
export const INITIAL_COHORTS: Cohort[] = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    course_id: 'c1000000-0000-0000-0000-000000000001',
    branch_id: 'b1000000-0000-0000-0000-000000000001',
    instructor_id: undefined,
    name: 'NBO Barista Intensive - Cohort 12',
    start_date: '2026-10-01',
    end_date: '2026-11-30',
    schedule_timing: '08:30 AM - 12:30 PM (Mon-Fri)',
    google_meet_url: 'https://meet.google.com/aur-bar-nbo12',
    status: 'in_progress',
    max_capacity: 16,
    created_at: '2026-08-01T00:00:00Z',
    enrolled_count: 1,
  },
];

export const INITIAL_STUDENTS: StudentKYC[] = [];

export const INITIAL_ENROLLMENTS: Enrollment[] = [];

export const INITIAL_INVOICES: Invoice[] = [];

export const INITIAL_PAYMENTS: Payment[] = [];

export const INITIAL_ASSESSMENTS: Assessment[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INITIAL_STAFF_CLOCKINS: StaffClockIn[] = [];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [];

export const INITIAL_SMS_LOGS: SMSLog[] = [];

export const INITIAL_LESSONS: TimetableLesson[] = [];

export const INITIAL_LIVE_SESSIONS: LiveClassSession[] = [];
