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
  LabVenue,
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
    paybill_number: '174379',
    paybill_account_name: 'AUREVIA-NBO',
    bank_name: 'KCB Bank Kenya',
    bank_account_number: '1289456780',
    payment_instructions: 'Pay via Safaricom M-Pesa Paybill 174379 using Account Name AUREVIA-NBO. Paste your confirmation SMS in your trainee portal.',
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
    paybill_number: '522522',
    paybill_account_name: 'AUREVIA-MSA',
    bank_name: 'Equity Bank Kenya',
    bank_account_number: '011293847291',
    payment_instructions: 'Pay via Safaricom M-Pesa Paybill 522522 using Account Name AUREVIA-MSA. Paste your confirmation SMS in your trainee portal.',
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
    paybill_number: '888888',
    paybill_account_name: 'AUREVIA-KGL',
    bank_name: 'Bank of Kigali (BK)',
    bank_account_number: '000492817492',
    payment_instructions: 'Pay via MTN MoMo / BK Pay using Account Name AUREVIA-KGL.',
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

export const INITIAL_LABS: LabVenue[] = [
  {
    id: 'lab-1',
    name: 'Espresso Lab 1',
    code: 'LAB-ESP-1',
    capacity: 12,
    equipment_summary: 'La Marzocco Linea PB, Mazzer Robur Grinders, Acaia Lunar Scales',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'lab-2',
    name: 'Espresso Lab 2',
    code: 'LAB-ESP-2',
    capacity: 10,
    equipment_summary: 'Slayer Espresso v3, Mahlkönig EK43, Dual Boiler Stations',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'lab-3',
    name: 'Roasting & QC Lab',
    code: 'LAB-ROAST',
    capacity: 8,
    equipment_summary: 'Giesen W6A 6kg Drum Roaster, Ikawa Sample Roaster, ColorTrack QC',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'lab-4',
    name: 'Sensory & Cupping Room',
    code: 'LAB-CUP',
    capacity: 16,
    equipment_summary: 'SCA Certified Cupping Tables, Light Calibration, Water TDS Meters',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'lab-5',
    name: 'Brewing & Extraction Bar',
    code: 'LAB-BREW',
    capacity: 12,
    equipment_summary: 'V60, Chemex, Aeropress, Fellow Stagg EKG Kettles, Refractometers',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_LESSONS: TimetableLesson[] = [
  {
    id: 'les-init-1',
    branch_id: 'b1000000-0000-0000-0000-000000000001',
    cohort_id: 'a1000000-0000-0000-0000-000000000001',
    course_id: 'c1000000-0000-0000-0000-000000000001',
    instructor_id: '00000000-0000-0000-0000-000000000001',
    topic_title: 'Espresso Calibration & Dialing-in',
    day_of_week: 'Monday',
    start_time: '08:00',
    end_time: '10:00',
    lesson_mode: 'physical_lab',
    lab_location: 'Espresso Lab 1',
    equipment_needed: 'Scales, Portafilters, Tampers, Specialty Beans',
    google_meet_url: 'https://meet.google.com/aur-bar-nbo12',
    sms_reminder_enabled: true,
    is_recurring: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'les-init-2',
    branch_id: 'b1000000-0000-0000-0000-000000000001',
    cohort_id: 'a1000000-0000-0000-0000-000000000001',
    course_id: 'c1000000-0000-0000-0000-000000000001',
    instructor_id: '00000000-0000-0000-0000-000000000001',
    topic_title: 'Milk Chemistry & Microfoam Pitcher Dynamics',
    day_of_week: 'Monday',
    start_time: '10:00',
    end_time: '12:00',
    lesson_mode: 'physical_lab',
    lab_location: 'Espresso Lab 1',
    equipment_needed: 'Steam pitchers, thermometer, whole milk, plant milks',
    google_meet_url: 'https://meet.google.com/aur-bar-nbo12',
    sms_reminder_enabled: true,
    is_recurring: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'les-init-3',
    branch_id: 'b1000000-0000-0000-0000-000000000001',
    cohort_id: 'a1000000-0000-0000-0000-000000000001',
    course_id: 'c1000000-0000-0000-0000-000000000001',
    instructor_id: '00000000-0000-0000-0000-000000000001',
    topic_title: 'Coffee Extraction Theory & Total Dissolved Solids',
    day_of_week: 'Wednesday',
    start_time: '10:00',
    end_time: '11:00',
    lesson_mode: 'virtual_theory',
    lab_location: 'Virtual Classroom',
    google_meet_url: 'https://meet.google.com/aur-bar-nbo12',
    sms_reminder_enabled: true,
    is_recurring: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'les-init-4',
    branch_id: 'b1000000-0000-0000-0000-000000000001',
    cohort_id: 'a1000000-0000-0000-0000-000000000001',
    course_id: 'c1000000-0000-0000-0000-000000000001',
    instructor_id: '00000000-0000-0000-0000-000000000001',
    topic_title: 'Kiambu Coffee Estate & Wet Mill Processing Tour',
    day_of_week: 'Friday',
    start_time: '08:00',
    end_time: '12:00',
    lesson_mode: 'field_trip',
    lab_location: 'Kiambu Coffee Estate & Washing Station',
    sms_reminder_enabled: true,
    is_recurring: true,
    created_at: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_LIVE_SESSIONS: LiveClassSession[] = [];
