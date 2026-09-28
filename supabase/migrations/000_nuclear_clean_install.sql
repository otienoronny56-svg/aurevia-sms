-- =========================================================================
-- NUCLEAR FRESH INSTALL & SEED FOR AUREVIA INSTITUTE OF COFFEE
-- Official Institutional Domain: aureviacoffeeinstitute.co.ke
-- 100% Valid UUID Hex Formats (0-9, a-f only)
-- =========================================================================

-- STEP 1: Nuclear Cleanup
DROP TABLE IF EXISTS aur_sms_logs CASCADE;
DROP TABLE IF EXISTS aur_leave_requests CASCADE;
DROP TABLE IF EXISTS aur_staff_clockin CASCADE;
DROP TABLE IF EXISTS aur_assessments CASCADE;
DROP TABLE IF EXISTS aur_attendance CASCADE;
DROP TABLE IF EXISTS aur_timetable_lessons CASCADE;
DROP TABLE IF EXISTS aur_payments CASCADE;
DROP TABLE IF EXISTS aur_invoices CASCADE;
DROP TABLE IF EXISTS aur_enrollments CASCADE;
DROP TABLE IF EXISTS aur_students CASCADE;
DROP TABLE IF EXISTS aur_cohorts CASCADE;
DROP TABLE IF EXISTS aur_courses CASCADE;
DROP TABLE IF EXISTS aur_profiles CASCADE;
DROP TABLE IF EXISTS aur_branches CASCADE;

-- STEP 2: Create Core Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Branches (Campus Facilities)
CREATE TABLE aur_branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(80) NOT NULL,
  country VARCHAR(80) NOT NULL DEFAULT 'Kenya',
  phone VARCHAR(40),
  email VARCHAR(120),
  manager_name VARCHAR(120),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Profiles (Staff, Managers, Instructors, Trainees)
CREATE TABLE aur_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role VARCHAR(30) NOT NULL CHECK (role IN ('super_admin', 'branch_manager', 'instructor', 'student')),
  branch_id UUID REFERENCES aur_branches(id) ON DELETE SET NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  phone VARCHAR(40),
  avatar_url TEXT,
  reg_number VARCHAR(60) UNIQUE,
  specialty VARCHAR(120),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Academic Courses
CREATE TABLE aur_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Barista Skills', 'Roasting', 'Sensory & Cupping', 'Green Coffee')),
  duration_weeks INT NOT NULL DEFAULT 2,
  fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 35000,
  description TEXT,
  modules TEXT[] NOT NULL DEFAULT '{}',
  certification_title VARCHAR(150),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Cohorts (Class Intakes)
CREATE TABLE aur_cohorts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES aur_courses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES aur_branches(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES aur_profiles(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  schedule_timing VARCHAR(100) NOT NULL DEFAULT '08:30 AM - 12:30 PM (Mon-Fri)',
  google_meet_url TEXT NOT NULL DEFAULT 'https://meet.google.com/aur-bar-nbo12',
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled')),
  max_capacity INT NOT NULL DEFAULT 16,
  enrolled_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Student KYC Dossiers
CREATE TABLE aur_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES aur_profiles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES aur_branches(id) ON DELETE CASCADE,
  national_id_or_passport VARCHAR(50) NOT NULL,
  dob DATE,
  nationality VARCHAR(60) DEFAULT 'Kenyan',
  gender VARCHAR(30) DEFAULT 'Male',
  medical_conditions TEXT,
  emergency_contact_name VARCHAR(120) NOT NULL,
  emergency_contact_phone VARCHAR(40) NOT NULL,
  emergency_contact_relationship VARCHAR(60) NOT NULL,
  id_doc_url TEXT,
  kyc_verified BOOLEAN NOT NULL DEFAULT true,
  coffee_experience_level VARCHAR(60) DEFAULT 'Home Brewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Cohort Enrollments
CREATE TABLE aur_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES aur_students(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES aur_cohorts(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('enrolled', 'active', 'completed', 'graduated', 'dropped')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completion_date DATE,
  certificate_serial_no VARCHAR(100),
  certificate_pdf_url TEXT,
  UNIQUE(student_id, cohort_id)
);

-- 7. Tuition Invoices
CREATE TABLE aur_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(60) UNIQUE NOT NULL DEFAULT ('INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(uuid_generate_v4()::text, 1, 4)),
  enrollment_id UUID REFERENCES aur_enrollments(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES aur_students(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES aur_cohorts(id) ON DELETE CASCADE,
  total_fee NUMERIC(12, 2) NOT NULL DEFAULT 35000,
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12, 2) NOT NULL DEFAULT 35000,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Payments & M-Pesa Receipts
CREATE TABLE aur_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES aur_invoices(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES aur_students(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES aur_branches(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL DEFAULT 'mpesa' CHECK (payment_method IN ('mpesa', 'cash', 'bank_transfer', 'credit_card')),
  mpesa_receipt_number VARCHAR(60),
  payer_phone VARCHAR(40),
  cashier_profile_id UUID REFERENCES aur_profiles(id),
  status VARCHAR(30) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Digital Roll-Call Attendance
CREATE TABLE aur_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cohort_id UUID NOT NULL REFERENCES aur_cohorts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES aur_students(id) ON DELETE CASCADE,
  session_title VARCHAR(150) NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  instructor_id UUID REFERENCES aur_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cohort_id, student_id, session_date)
);

-- 10. SCA Exam & Modular Marks
CREATE TABLE aur_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES aur_students(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES aur_cohorts(id) ON DELETE CASCADE,
  module_name VARCHAR(150) NOT NULL,
  theory_score NUMERIC(5, 2) NOT NULL DEFAULT 85,
  practical_score NUMERIC(5, 2) NOT NULL DEFAULT 90,
  sensory_score NUMERIC(5, 2) NOT NULL DEFAULT 88,
  final_score NUMERIC(5, 2) NOT NULL DEFAULT 88.5,
  grade VARCHAR(10) NOT NULL DEFAULT 'A',
  instructor_remarks TEXT,
  assessed_by UUID REFERENCES aur_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Faculty Clock-ins
CREATE TABLE aur_staff_clockin (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES aur_profiles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES aur_branches(id) ON DELETE CASCADE,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  location_notes VARCHAR(150) DEFAULT 'HQ Main Lab Terminal',
  status VARCHAR(20) NOT NULL DEFAULT 'on_duty' CHECK (status IN ('on_duty', 'completed', 'excused', 'absent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, work_date)
);

-- 12. Staff Leave Requests
CREATE TABLE aur_leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES aur_profiles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES aur_branches(id) ON DELETE CASCADE,
  leave_type VARCHAR(30) NOT NULL CHECK (leave_type IN ('annual', 'sick', 'short', 'compassionate')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INT NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES aur_profiles(id),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. SMS Logs
CREATE TABLE aur_sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_phone VARCHAR(40) NOT NULL,
  recipient_name VARCHAR(120) NOT NULL,
  message_content TEXT NOT NULL,
  message_type VARCHAR(40) NOT NULL DEFAULT 'system_alert',
  status VARCHAR(20) NOT NULL DEFAULT 'delivered',
  branch_id UUID REFERENCES aur_branches(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- STEP 3: SEED MASTER INSTITUTIONAL DATA
-- =========================================================================

-- A. 3 Regional Campuses (UUIDs prefixed with 'b' - valid hex)
INSERT INTO aur_branches (id, code, name, address, city, country, phone, email, manager_name, is_active)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'NBO', 'Aurevia Nairobi Roastery & Academy', 'Spring Valley Coffee Hub, Westlands', 'Nairobi', 'Kenya', '+254 711 234 567', 'nairobi@aureviacoffeeinstitute.co.ke', 'David Mutua', true),
  ('b2000000-0000-0000-0000-000000000002', 'MSA', 'Aurevia Coastal Barista Center', 'Nyali Links Plaza, 2nd Floor', 'Mombasa', 'Kenya', '+254 722 345 678', 'mombasa@aureviacoffeeinstitute.co.ke', 'Amina Swaleh', true),
  ('b3000000-0000-0000-0000-000000000003', 'KGL', 'Aurevia Kigali Specialty Lab', 'KG 674 St, Kimihurura', 'Kigali', 'Rwanda', '+250 788 123 456', 'kigali@aureviacoffeeinstitute.co.ke', 'Jean-Paul Habimana', true);

-- B. 4 Core Courses (UUIDs prefixed with 'c' - valid hex)
INSERT INTO aur_courses (id, code, title, category, duration_weeks, fee_amount, description, modules, certification_title, is_active)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'BAR-101', 'Barista Skills Foundation & Latte Art', 'Barista Skills', 2, 35000, 'Comprehensive espresso extraction, grinder calibration, milk texturing mechanics, latte art patterning, and cafe workflow.', ARRAY['Espresso Grinding & Calibration', 'Milk Texturing & Chemistry', 'Latte Art Fundamentals', 'Customer Service & Speed', 'Machine Maintenance & Sanitization'], 'Aurevia Certified Professional Barista (Level 1)', true),
  ('c2000000-0000-0000-0000-000000000002', 'ROAST-201', 'Specialty Coffee Roasting Mastery', 'Roasting', 3, 55000, 'Thermodynamics of drum roasting, charge temperature profiling, Rate of Rise (RoR), and degassing protocols.', ARRAY['Green Coffee Physical Analysis', 'Drum Roaster Thermodynamics', 'Profile Development & RoR', 'Sample Roasting & Agtron Scale', 'Roastery Safety'], 'Aurevia Certified Artisan Roaster', true),
  ('c3000000-0000-0000-0000-000000000003', 'SENS-301', 'Sensory Skills & SCA Cupping Protocol', 'Sensory & Cupping', 2, 45000, 'Physiology of taste, olfactory identification, standard SCA cupping scorecards, and triangulation testing.', ARRAY['Physiology of Taste & Aroma', 'Olfactory Triangulation Testing', 'SCA Standard Cupping Protocol', 'Coffee Chemistry & Acids', 'Q-Grader Prep'], 'Aurevia Certified Coffee Taster', true),
  ('c4000000-0000-0000-0000-000000000004', 'GREEN-101', 'Green Coffee Sourcing & Processing', 'Green Coffee', 1, 30000, 'Agronomy of Arabica and Robusta, post-harvest processing methods (Washed, Natural, Honey, Anaerobic), moisture analysis.', ARRAY['Botany & Varietal Taxonomy', 'Harvest & Processing Methods', 'Physical Grading & Defects', 'Moisture & Water Activity', 'Direct Trade Logistics'], 'Aurevia Certificate in Green Coffee Agronomy', true);

-- C. Super Admin & Campus Leaders
INSERT INTO aur_profiles (id, role, branch_id, full_name, email, phone, reg_number, specialty, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'super_admin', 'b1000000-0000-0000-0000-000000000001', 'Ronny Ronald', 'admin@aureviacoffeeinstitute.co.ke', '+254 700 000 001', 'AUR/DIR/001', 'Executive Director & Master Roaster', true),
  ('00000000-0000-0000-0000-000000000002', 'branch_manager', 'b1000000-0000-0000-0000-000000000001', 'David Mutua', 'david.mutua@aureviacoffeeinstitute.co.ke', '+254 711 234 567', 'AUR/MGR/NBO', 'Head of Nairobi Operations', true),
  ('00000000-0000-0000-0000-000000000003', 'branch_manager', 'b2000000-0000-0000-0000-000000000002', 'Amina Swaleh', 'amina.swaleh@aureviacoffeeinstitute.co.ke', '+254 722 345 678', 'AUR/MGR/MSA', 'Coastal Center Director', true),
  ('00000000-0000-0000-0000-000000000006', 'branch_manager', 'b3000000-0000-0000-0000-000000000003', 'Jean-Paul Habimana', 'jeanpaul.habimana@aureviacoffeeinstitute.co.ke', '+250 788 123 456', 'AUR/MGR/KGL', 'Kigali Campus Director', true),
  ('00000000-0000-0000-0000-000000000004', 'instructor', 'b1000000-0000-0000-0000-000000000001', 'Wanjiku Kamau', 'wanjiku.kamau@aureviacoffeeinstitute.co.ke', '+254 720 111 222', 'AUR/INS/001', 'Licensed Q-Grader & Sensory Lead', true),
  ('00000000-0000-0000-0000-000000000005', 'instructor', 'b1000000-0000-0000-0000-000000000001', 'Kevin Ochieng', 'kevin.ochieng@aureviacoffeeinstitute.co.ke', '+254 721 333 444', 'AUR/INS/002', 'Master Roaster & Roastery Lead', true);

-- D. 3 Cohorts (UUIDs prefixed with 'a' - valid hex)
INSERT INTO aur_cohorts (id, course_id, branch_id, instructor_id, name, start_date, end_date, schedule_timing, google_meet_url, status, max_capacity, enrolled_count)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'NBO Barista Intensive - Cohort 12', '2026-08-25', '2026-09-08', '08:30 AM - 12:30 PM (Mon-Fri)', 'https://meet.google.com/aur-bar-nbo12', 'in_progress', 16, 10),
  ('a2000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'NBO Roasting Mastery - Cohort 04', '2026-08-18', '2026-09-12', '02:00 PM - 05:30 PM (Mon-Fri)', 'https://meet.google.com/aur-roast-nbo04', 'in_progress', 10, 9),
  ('a3000000-0000-0000-0000-000000000003', 'c3000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'MSA Sensory Cupping - Cohort 06', '2026-09-15', '2026-09-29', '09:00 AM - 01:00 PM (Mon-Fri)', 'https://meet.google.com/aur-sens-msa06', 'upcoming', 12, 7);

-- E. 10 Trainee User Profiles (Cohort 12)
INSERT INTO aur_profiles (id, role, branch_id, full_name, email, phone, reg_number, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'student', 'b1000000-0000-0000-0000-000000000001', 'Faith Cherono', 'faith.cherono@aureviacoffeeinstitute.co.ke', '+254 712 345 678', 'AUR/NBO/2026/001', true),
  ('00000000-0000-0000-0000-000000000011', 'student', 'b1000000-0000-0000-0000-000000000001', 'Brian Mwangi', 'brian.mwangi@aureviacoffeeinstitute.co.ke', '+254 723 456 789', 'AUR/NBO/2026/002', true),
  ('00000000-0000-0000-0000-000000000013', 'student', 'b1000000-0000-0000-0000-000000000001', 'Mercy Achieng', 'mercy.achieng@aureviacoffeeinstitute.co.ke', '+254 714 567 890', 'AUR/NBO/2026/003', true),
  ('00000000-0000-0000-0000-000000000014', 'student', 'b1000000-0000-0000-0000-000000000001', 'Dennis Kiprop', 'dennis.kiprop@aureviacoffeeinstitute.co.ke', '+254 725 678 901', 'AUR/NBO/2026/004', true),
  ('00000000-0000-0000-0000-000000000015', 'student', 'b1000000-0000-0000-0000-000000000001', 'Esther Njeri', 'esther.njeri@aureviacoffeeinstitute.co.ke', '+254 716 789 012', 'AUR/NBO/2026/005', true),
  ('00000000-0000-0000-0000-000000000016', 'student', 'b1000000-0000-0000-0000-000000000001', 'Emmanuel Otieno', 'emmanuel.otieno@aureviacoffeeinstitute.co.ke', '+254 727 890 123', 'AUR/NBO/2026/006', true),
  ('00000000-0000-0000-0000-000000000017', 'student', 'b1000000-0000-0000-0000-000000000001', 'Brenda Wambui', 'brenda.wambui@aureviacoffeeinstitute.co.ke', '+254 718 901 234', 'AUR/NBO/2026/007', true),
  ('00000000-0000-0000-0000-000000000018', 'student', 'b1000000-0000-0000-0000-000000000001', 'Kelvin Mutiso', 'kelvin.mutiso@aureviacoffeeinstitute.co.ke', '+254 729 012 345', 'AUR/NBO/2026/008', true),
  ('00000000-0000-0000-0000-000000000019', 'student', 'b1000000-0000-0000-0000-000000000001', 'Gladys Chebet', 'gladys.chebet@aureviacoffeeinstitute.co.ke', '+254 710 123 456', 'AUR/NBO/2026/009', true),
  ('00000000-0000-0000-0000-000000000020', 'student', 'b1000000-0000-0000-0000-000000000001', 'Samuel Karanja', 'samuel.karanja@aureviacoffeeinstitute.co.ke', '+254 721 234 567', 'AUR/NBO/2026/010', true);

-- F. 10 Student KYC Dossiers (UUIDs prefixed with 'f' - valid hex)
INSERT INTO aur_students (id, profile_id, branch_id, national_id_or_passport, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, kyc_verified, coffee_experience_level)
VALUES
  ('f1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000001', '34892104', 'Mary Cherono', '+254 712 111 000', 'Mother', true, 'Home Brewer'),
  ('f1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000001', '29481023', 'John Mwangi', '+254 722 888 111', 'Father', true, 'Beginner'),
  ('f1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000013', 'b1000000-0000-0000-0000-000000000001', '35891204', 'Alice Achieng', '+254 714 111 222', 'Sister', true, 'Cafe Assistant'),
  ('f1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000014', 'b1000000-0000-0000-0000-000000000001', '36892305', 'Peter Kiprop', '+254 725 222 333', 'Brother', true, 'Home Brewer'),
  ('f1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000015', 'b1000000-0000-0000-0000-000000000001', '37893406', 'Grace Njeri', '+254 716 333 444', 'Mother', true, 'Barista Enthusiast'),
  ('f1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000016', 'b1000000-0000-0000-0000-000000000001', '38894507', 'George Otieno', '+254 727 444 555', 'Father', true, 'Beginner'),
  ('f1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000017', 'b1000000-0000-0000-0000-000000000001', '39895608', 'Sarah Wambui', '+254 718 555 666', 'Sister', true, 'Cafe Waitstaff'),
  ('f1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000018', 'b1000000-0000-0000-0000-000000000001', '40896709', 'James Mutiso', '+254 729 666 777', 'Uncle', true, 'Barista Level 1'),
  ('f1000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000019', 'b1000000-0000-0000-0000-000000000001', '41897810', 'Rose Chebet', '+254 710 777 888', 'Mother', true, 'Beginner'),
  ('f1000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', 'b1000000-0000-0000-0000-000000000001', '42898911', 'David Karanja', '+254 721 888 999', 'Brother', true, 'Cafe Owner');

-- G. 10 Enrollments into Cohort 12 (UUIDs prefixed with 'e' - valid hex)
INSERT INTO aur_enrollments (id, student_id, cohort_id, status)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'active'),
  ('e1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'active'),
  ('e1000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'active'),
  ('e1000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'active'),
  ('e1000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'active'),
  ('e1000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001', 'active'),
  ('e1000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000001', 'active'),
  ('e1000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001', 'active'),
  ('e1000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000001', 'active'),
  ('e1000000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000001', 'active');

-- H. 10 Tuition Invoices (UUIDs prefixed with 'd' - valid hex)
INSERT INTO aur_invoices (id, student_id, cohort_id, total_fee, amount_paid, balance_due, status, due_date)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 35000, 35000, 0, 'paid', '2026-09-08'),
  ('d1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 35000, 20000, 15000, 'partially_paid', '2026-09-08'),
  ('d1000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 35000, 35000, 0, 'paid', '2026-09-08'),
  ('d1000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 35000, 35000, 0, 'paid', '2026-09-08'),
  ('d1000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 35000, 15000, 20000, 'partially_paid', '2026-09-08'),
  ('d1000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001', 35000, 35000, 0, 'paid', '2026-09-08'),
  ('d1000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000001', 35000, 35000, 0, 'paid', '2026-09-08'),
  ('d1000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001', 35000, 35000, 0, 'paid', '2026-09-08'),
  ('d1000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000001', 35000, 25000, 10000, 'partially_paid', '2026-09-08'),
  ('d1000000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000001', 35000, 35000, 0, 'paid', '2026-09-08');

-- I. 10 Payment Receipts (Matching Invoices)
INSERT INTO aur_payments (id, invoice_id, student_id, branch_id, amount, payment_method, mpesa_receipt_number, payer_phone, status)
VALUES
  ('b5000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 35000, 'mpesa', 'TCH71LKM24', '+254712345678', 'completed'),
  ('b5000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 20000, 'mpesa', 'TDK89MNP12', '+254723456789', 'completed'),
  ('b5000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 35000, 'mpesa', 'QRS34BVC78', '+254714567890', 'completed'),
  ('b5000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 35000, 'mpesa', 'WER67TRD21', '+254725678901', 'completed'),
  ('b5000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 15000, 'mpesa', 'TYU90MKL45', '+254716789012', 'completed'),
  ('b5000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001', 35000, 'mpesa', 'POI12MNB89', '+254727890123', 'completed'),
  ('b5000000-0000-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000001', 35000, 'mpesa', 'LKJ45VCX67', '+254718901234', 'completed'),
  ('b5000000-0000-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000001', 35000, 'mpesa', 'MNB99LKJ32', '+254729012345', 'completed'),
  ('b5000000-0000-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000001', 25000, 'mpesa', 'ZXS67QWE11', '+254710123456', 'completed'),
  ('b5000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000001', 35000, 'mpesa', 'CVB88NMO99', '+254721234567', 'completed');

-- STEP 4: Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE aur_branches, aur_profiles, aur_courses, aur_cohorts, aur_students, aur_enrollments, aur_invoices, aur_payments, aur_attendance, aur_assessments, aur_staff_clockin, aur_leave_requests, aur_sms_logs;
