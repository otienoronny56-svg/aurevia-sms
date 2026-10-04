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

// ONLY FAITH CHERONO
export const INITIAL_STUDENTS: StudentKYC[] = [
  {
    id: 'f1000000-0000-0000-0000-000000000001',
    profile_id: '00000000-0000-0000-0000-000000000010',
    branch_id: 'b1000000-0000-0000-0000-000000000001',
    national_id_or_passport: '34892104',
    emergency_contact_name: 'Mary Cherono',
    emergency_contact_phone: '+254 712 111 000',
    emergency_contact_relationship: 'Mother',
    kyc_verified: true,
    coffee_experience_level: 'Home Brewer',
    terms_accepted: true,
    media_consent: true,
    terms_accepted_at: '2026-08-20T00:00:00Z',
    created_at: '2026-02-10T00:00:00Z',
    profile: INITIAL_PROFILES[3],
  },
];

// ONLY FAITH'S ENROLLMENT
export const INITIAL_ENROLLMENTS: Enrollment[] = [
  {
    id: 'e1000000-0000-0000-0000-000000000001',
    student_id: 'f1000000-0000-0000-0000-000000000001',
    cohort_id: 'a1000000-0000-0000-0000-000000000001',
    branch_id: 'b1000000-0000-0000-0000-000000000001',
    status: 'active',
    enrolled_at: '2026-08-20T00:00:00Z',
    certificate_serial_no: 'CERT-AUR-2026-NBO-001',
  },
];

// ONLY FAITH'S INVOICE
export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'd1000000-0000-0000-0000-000000000001',
    invoice_number: 'INV-AUR-2026-0001',
    enrollment_id: 'e1000000-0000-0000-0000-000000000001',
    student_id: 'f1000000-0000-0000-0000-000000000001',
    branch_id: 'b1000000-0000-0000-0000-000000000001',
    total_fee: 35000,
    amount_paid: 15000,
    balance_due: 20000,
    status: 'partial',
    due_date: '2026-09-08',
    created_at: '2026-08-20T10:00:00Z',
  },
];

// ONLY FAITH'S PAYMENT
export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'b5000000-0000-0000-0000-000000000001',
    invoice_id: 'd1000000-0000-0000-0000-000000000001',
    student_id: 'f1000000-0000-0000-0000-000000000001',
    branch_id: 'b1000000-0000-0000-0000-000000000001',
    amount: 15000,
    payment_method: 'mpesa',
    mpesa_receipt_number: 'TCH71LKM24',
    mpesa_phone_number: '0714767240',
    status: 'completed',
    created_at: '2026-08-20T11:15:00Z',
  },
];

export const INITIAL_ASSESSMENTS: Assessment[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INITIAL_STAFF_CLOCKINS: StaffClockIn[] = [];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [];

export const INITIAL_SMS_LOGS: SMSLog[] = [
  {
    id: 'sms10000-0000-0000-0000-000000000001',
    channel: 'sms',
    recipient_phone: '0714767240',
    recipient_email: 'faith.cherono@aureviacoffeeinstitute.co.ke',
    recipient_name: 'Faith Cherono',
    subject: 'Admission Confirmation - Barista Skills Foundation',
    message_content: 'Aurevia Admission Alert: Welcome to Barista Skills Foundation! Reg: AUR/NBO/2026/001. Class starts Mon 08:30 AM at Nairobi Roastery Lab 1.',
    purpose: 'admissions',
    delivery_status: 'delivered',
    gateway_reference: 'AT-SMS-892104-NBO',
    sent_at: '2026-08-20T10:05:00Z',
    branch_id: 'b1000000-0000-0000-0000-000000000001',
    audience_segment: 'Admitted Trainees',
  },
  {
    id: 'sms20000-0000-0000-0000-000000000002',
    channel: 'sms',
    recipient_phone: '0714767240',
    recipient_email: 'faith.cherono@aureviacoffeeinstitute.co.ke',
    recipient_name: 'Faith Cherono',
    subject: 'Payment Receipt: INV-AUR-2026-0001',
    message_content: 'Confirmed KES 15,000 received for Invoice INV-AUR-2026-0001. M-Pesa Ref: TCH71LKM24. Aurevia Institute of Coffee.',
    purpose: 'fee_receipt',
    delivery_status: 'delivered',
    gateway_reference: 'AT-SMS-892105-NBO',
    sent_at: '2026-08-20T11:15:00Z',
    branch_id: 'b1000000-0000-0000-0000-000000000001',
    audience_segment: 'Paid Student',
  },
];

export const INITIAL_LESSONS: TimetableLesson[] = [
  {
    id: 'les10000-0000-0000-0000-000000000001',
    branch_id: 'b1000000-0000-0000-0000-000000000001',
    cohort_id: 'a1000000-0000-0000-0000-000000000001',
    course_id: 'c1000000-0000-0000-0000-000000000001',
    instructor_id: '00000000-0000-0000-0000-000000000004',
    topic_title: 'Barista Skills Foundation & Latte Art',
    day_of_week: 'Monday',
    start_time: '08:30',
    end_time: '12:30',
    lesson_mode: 'physical_lab',
    lab_location: 'Lab 1',
    equipment_needed: 'Scales, Portafilters, Tampers, Specialty Beans',
    sms_reminder_enabled: true,
    is_recurring: true,
    created_at: '2026-08-20T00:00:00Z',
  },
  {
    id: 'les20000-0000-0000-0000-000000000002',
    branch_id: 'b1000000-0000-0000-0000-000000000001',
    cohort_id: 'a1000000-0000-0000-0000-000000000001',
    course_id: 'c1000000-0000-0000-0000-000000000001',
    instructor_id: '00000000-0000-0000-0000-000000000004',
    topic_title: 'Milk Chemistry & Microfoam Pouring',
    day_of_week: 'Wednesday',
    start_time: '08:30',
    end_time: '12:30',
    lesson_mode: 'physical_lab',
    lab_location: 'Lab 1',
    equipment_needed: 'Nuova Simonelli Aurelia, Fresh Whole Milk',
    sms_reminder_enabled: true,
    is_recurring: true,
    created_at: '2026-08-20T00:00:00Z',
  },
];

export const INITIAL_LIVE_SESSIONS: LiveClassSession[] = [
  {
    id: 'live-sess-001',
    cohort_id: 'a1000000-0000-0000-0000-000000000001',
    course_id: 'c1000000-0000-0000-0000-000000000001',
    instructor_id: '00000000-0000-0000-0000-000000000004',
    branch_id: 'b1000000-0000-0000-0000-000000000001',
    title: 'SCA Espresso Extraction Chemistry & Calibration Theory',
    description: 'Deep dive into extraction yields, total dissolved solids (TDS), grind distribution dynamics, and water temperature variables before practical lab.',
    scheduled_start: new Date().toISOString(),
    duration_minutes: 60,
    status: 'scheduled',
    room_type: 'aurevia_embedded',
    room_name: 'aurevia-barista-extraction-lab',
    meeting_url: 'https://meet.jit.si/aurevia-barista-extraction-lab',
    attendees_count: 0,
    created_at: new Date().toISOString(),
  },
];
