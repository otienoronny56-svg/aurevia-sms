export type UserRole = 'super_admin' | 'branch_manager' | 'instructor' | 'student';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  manager_name?: string;
  paybill_number?: string;
  paybill_account_name?: string;
  bank_name?: string;
  bank_account_number?: string;
  payment_instructions?: string;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  branch_id?: string | null;
  full_name: string;
  email: string;
  phone?: string;
  national_id?: string;
  reg_number?: string;
  staff_id?: string;
  system_access?: boolean;
  department?: 'Academic & Training' | 'Campus Operations' | 'Hygiene & Facilities' | 'Marketing & Outreach' | 'Roastery & Logistics' | 'Security & Front Office';
  job_title?: string;
  password?: string;
  password_hash?: string;
  initial_password?: string;
  password_changed?: boolean;
  assigned_courses?: string[];
  assigned_cohorts?: string[];
  avatar_url?: string;
  specialty?: string;
  is_active: boolean;
  created_at: string;
  branch?: Branch;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  category: 'Barista Skills' | 'Roasting' | 'Sensory & Cupping' | 'Green Coffee';
  duration_weeks: number;
  fee_amount: number;
  description: string;
  modules: string[];
  certification_title: string;
  is_active: boolean;
  created_at: string;
}

export type LessonMode = 'physical_lab' | 'virtual_theory' | 'field_trip';

export interface LabVenue {
  id: string;
  name: string;
  code: string;
  branch_id?: string;
  capacity?: number;
  equipment_summary?: string;
  is_active: boolean;
  created_at: string;
}

export interface TimetableLesson {
  id: string;
  branch_id: string;
  cohort_id: string;
  course_id: string;
  instructor_id: string;
  topic_title: string;
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  start_time: string; // "08:30"
  end_time: string;   // "12:30"
  lesson_mode?: LessonMode;
  lab_location: string; // "Espresso Lab 1 (La Marzocco Station)"
  equipment_needed?: string;
  google_meet_url?: string;
  sms_reminder_enabled?: boolean;
  is_recurring?: boolean;
  created_at: string;
  course?: Course;
  cohort?: Cohort;
  instructor?: Profile;
}

export interface Cohort {
  id: string;
  course_id: string;
  branch_id: string;
  instructor_id?: string;
  name: string;
  start_date: string;
  end_date: string;
  schedule_timing: string;
  google_meet_url: string;
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  max_capacity: number;
  created_at: string;
  course?: Course;
  branch?: Branch;
  instructor?: Profile;
  enrolled_count?: number;
}

export interface StudentKYC {
  id: string;
  profile_id: string;
  branch_id: string;
  national_id_or_passport: string;
  dob?: string;
  nationality?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  medical_conditions?: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  id_doc_url?: string;
  id_back_url?: string;
  media_consent?: boolean;
  terms_accepted?: boolean;
  terms_accepted_at?: string;
  kyc_verified: boolean;
  coffee_experience_level: string;
  created_at: string;
  profile?: Profile;
  branch?: Branch;
}

export interface Enrollment {
  id: string;
  student_id: string;
  cohort_id: string;
  branch_id: string;
  status: 'enrolled' | 'active' | 'completed' | 'graduated' | 'dropped';
  enrolled_at: string;
  completion_date?: string;
  certificate_serial_no?: string;
  certificate_pdf_url?: string;
  cohort?: Cohort;
  student?: StudentKYC;
  invoices?: Invoice[];
  assessments?: Assessment[];
}

export interface Invoice {
  id: string;
  invoice_number: string;
  enrollment_id: string;
  student_id: string;
  branch_id: string;
  total_fee: number;
  amount_paid: number;
  balance_due: number;
  status: 'unpaid' | 'partial' | 'paid' | 'pending' | 'partially_paid' | 'overdue';
  due_date: string;
  created_at: string;
  enrollment?: Enrollment;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  invoice_id: string;
  student_id: string;
  branch_id: string;
  amount: number;
  payment_method: 'mpesa' | 'cash' | 'bank_transfer' | 'card';
  mpesa_receipt_number?: string;
  mpesa_phone_number?: string;
  daraja_checkout_request_id?: string;
  raw_mpesa_text?: string;
  submitted_by_student_id?: string;
  verified_by_profile_id?: string;
  verified_at?: string;
  verification_remarks?: string;
  status: 'pending' | 'completed' | 'failed' | 'pending_verification' | 'reversed' | 'rejected';
  receipt_url?: string;
  created_at: string;
}

export interface Assessment {
  id: string;
  enrollment_id: string;
  student_id: string;
  cohort_id: string;
  module_name: string;
  practical_score: number;
  theory_score: number;
  sensory_score: number;
  final_score: number;
  grade: string;
  instructor_remarks: string;
  status?: 'draft' | 'published';
  graded_by?: string;
  graded_at: string;
}

export interface LiveClassSession {
  id: string;
  cohort_id: string;
  course_id: string;
  instructor_id: string;
  branch_id: string;
  title: string;
  description?: string;
  scheduled_start: string; // ISO date-time string
  duration_minutes: number;
  status: 'scheduled' | 'live' | 'ended';
  room_type: 'aurevia_embedded' | 'google_meet' | 'zoom';
  room_name: string;
  meeting_url?: string;
  started_at?: string;
  ended_at?: string;
  attendees_count?: number;
  created_at: string;
  cohort?: Cohort;
  instructor?: Profile;
  course?: Course;
}

export interface AttendanceRecord {
  id: string;
  cohort_id: string;
  student_id: string;
  session_date: string;
  session_title: string;
  session_id?: string;
  method?: 'in_person' | 'online_lecture';
  join_time?: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  created_at?: string;
  student?: StudentKYC;
}

export interface StaffClockIn {
  id: string;
  profile_id: string;
  branch_id: string;
  clock_in: string;
  clock_out?: string;
  work_date: string;
  location_notes?: string;
  profile?: Profile;
}

export interface LeaveRequest {
  id: string;
  profile_id: string;
  branch_id: string;
  leave_type: 'annual' | 'sick' | 'short' | 'compassionate' | 'off_day' | 'maternity_paternity' | 'study';
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  review_notes?: string;
  created_at: string;
  profile?: Profile;
}

export interface SMSLog {
  id: string;
  channel?: 'sms' | 'email' | 'dual';
  recipient_phone: string;
  recipient_email?: string;
  recipient_name: string;
  subject?: string;
  message_content: string;
  purpose: 'fee_receipt' | 'intake_notice' | 'schedule_change' | 'admissions' | 'fee_reminder' | 'attendance_alert' | 'exam_notice' | 'announcement' | 'general';
  delivery_status: 'sent' | 'delivered' | 'failed' | 'queued';
  gateway_reference?: string;
  sent_at: string;
  branch_id?: string;
  audience_segment?: string;
}

export interface Alumni {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  branch_id: string;
  course_id: string;
  cohort_name: string;
  graduation_year: number;
  graduation_month: string;
  certification_name: string;
  certificate_serial_no: string;
  current_employer: string;
  job_title: string;
  employment_status: 'Employed' | 'Self-Employed / Cafe Owner' | 'Freelance Barista' | 'Seeking Placement' | string;
  final_grade?: string;
  score_percentage?: number;
  attendance_rate?: number;
  student_id?: string;
  profile_id?: string;
  created_at: string;
}
