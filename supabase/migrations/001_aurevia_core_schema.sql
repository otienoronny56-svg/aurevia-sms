-- ==============================================================================
-- AUREVIA NUCLEAR MIGRATION SCRIPT (CLEAN SLATE FOR aur_* ONLY)
-- GUARANTEE: Does NOT touch employees, payment_logs, or production_logs
-- ZERO HARDCODED UUIDs: Fully automated with gen_random_uuid()
-- ==============================================================================

-- 1. Clean up any previous partial aur_* tables
DROP TABLE IF EXISTS public.aur_sms_logs CASCADE;
DROP TABLE IF EXISTS public.aur_leave_requests CASCADE;
DROP TABLE IF EXISTS public.aur_staff_clockin CASCADE;
DROP TABLE IF EXISTS public.aur_attendance CASCADE;
DROP TABLE IF EXISTS public.aur_assessments CASCADE;
DROP TABLE IF EXISTS public.aur_payments CASCADE;
DROP TABLE IF EXISTS public.aur_invoices CASCADE;
DROP TABLE IF EXISTS public.aur_enrollments CASCADE;
DROP TABLE IF EXISTS public.aur_students CASCADE;
DROP TABLE IF EXISTS public.aur_cohorts CASCADE;
DROP TABLE IF EXISTS public.aur_courses CASCADE;
DROP TABLE IF EXISTS public.aur_reg_sequences CASCADE;
DROP TABLE IF EXISTS public.aur_profiles CASCADE;
DROP TABLE IF EXISTS public.aur_branches CASCADE;

-- 2. Branches Table
CREATE TABLE public.aur_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    country VARCHAR(50) DEFAULT 'Kenya',
    phone VARCHAR(30),
    email VARCHAR(100),
    manager_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Profiles Table (RBAC)
CREATE TABLE public.aur_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(30) NOT NULL CHECK (role IN ('super_admin', 'branch_manager', 'instructor', 'student')),
    branch_id UUID REFERENCES public.aur_branches(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30),
    national_id VARCHAR(50),
    reg_number VARCHAR(50) UNIQUE,
    avatar_url TEXT,
    specialty VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Registration Sequence Tracker
CREATE TABLE public.aur_reg_sequences (
    branch_code VARCHAR(10) NOT NULL,
    reg_year INT NOT NULL,
    current_val INT DEFAULT 0,
    PRIMARY KEY (branch_code, reg_year)
);

-- 5. Courses Catalog
CREATE TABLE public.aur_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    duration_weeks INT NOT NULL CHECK (duration_weeks BETWEEN 1 AND 12),
    fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    modules JSONB DEFAULT '[]'::jsonb,
    certification_title VARCHAR(150),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Cohorts
CREATE TABLE public.aur_cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.aur_courses(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.aur_branches(id) ON DELETE RESTRICT,
    instructor_id UUID REFERENCES public.aur_profiles(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    schedule_timing VARCHAR(100) DEFAULT '08:30 AM - 12:30 PM (Mon-Fri)',
    google_meet_url TEXT DEFAULT 'https://meet.google.com/aur-coff-edu',
    status VARCHAR(30) DEFAULT 'in_progress' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled')),
    max_capacity INT DEFAULT 16,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Student Digital KYC
CREATE TABLE public.aur_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE NOT NULL REFERENCES public.aur_profiles(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.aur_branches(id) ON DELETE RESTRICT,
    national_id_or_passport VARCHAR(50) NOT NULL,
    emergency_contact_name VARCHAR(100) NOT NULL,
    emergency_contact_phone VARCHAR(30) NOT NULL,
    emergency_contact_relationship VARCHAR(50),
    id_doc_url TEXT,
    kyc_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES public.aur_profiles(id),
    verified_at TIMESTAMPTZ,
    coffee_experience_level VARCHAR(50) DEFAULT 'Beginner',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Enrollments
CREATE TABLE public.aur_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.aur_students(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES public.aur_cohorts(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.aur_branches(id) ON DELETE RESTRICT,
    status VARCHAR(30) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'active', 'completed', 'graduated', 'dropped')),
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    completion_date DATE,
    certificate_serial_no VARCHAR(50) UNIQUE,
    certificate_pdf_url TEXT,
    UNIQUE(student_id, cohort_id)
);

-- 9. Invoices
CREATE TABLE public.aur_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    enrollment_id UUID NOT NULL REFERENCES public.aur_enrollments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.aur_students(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.aur_branches(id) ON DELETE RESTRICT,
    total_fee NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) DEFAULT 0.00,
    balance_due NUMERIC(12, 2) GENERATED ALWAYS AS (total_fee - amount_paid) STORED,
    status VARCHAR(30) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Payments Ledger
CREATE TABLE public.aur_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.aur_invoices(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.aur_students(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.aur_branches(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) DEFAULT 'mpesa' CHECK (payment_method IN ('mpesa', 'cash', 'bank_transfer', 'card')),
    mpesa_receipt_number VARCHAR(50) UNIQUE,
    mpesa_phone_number VARCHAR(30),
    daraja_checkout_request_id VARCHAR(100),
    daraja_raw_payload JSONB,
    status VARCHAR(30) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Assessments
CREATE TABLE public.aur_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.aur_enrollments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.aur_students(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES public.aur_cohorts(id) ON DELETE RESTRICT,
    module_name VARCHAR(100) NOT NULL,
    practical_score NUMERIC(5, 2) DEFAULT 0 CHECK (practical_score BETWEEN 0 AND 100),
    theory_score NUMERIC(5, 2) DEFAULT 0 CHECK (theory_score BETWEEN 0 AND 100),
    sensory_score NUMERIC(5, 2) DEFAULT 0 CHECK (sensory_score BETWEEN 0 AND 100),
    final_score NUMERIC(5, 2) GENERATED ALWAYS AS ((practical_score * 0.5) + (theory_score * 0.25) + (sensory_score * 0.25)) STORED,
    grade VARCHAR(5),
    instructor_remarks TEXT,
    graded_by UUID REFERENCES public.aur_profiles(id),
    graded_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(enrollment_id, module_name)
);

-- 12. Attendance
CREATE TABLE public.aur_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id UUID NOT NULL REFERENCES public.aur_cohorts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.aur_students(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    session_title VARCHAR(100),
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    notes TEXT,
    recorded_by UUID REFERENCES public.aur_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(cohort_id, student_id, session_date)
);

-- 13. Staff Daily Clock-In
CREATE TABLE public.aur_staff_clockin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.aur_profiles(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.aur_branches(id) ON DELETE RESTRICT,
    clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
    clock_out TIMESTAMPTZ,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    location_notes TEXT,
    UNIQUE(profile_id, work_date)
);

-- 14. Leave Requests
CREATE TABLE public.aur_leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.aur_profiles(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.aur_branches(id) ON DELETE RESTRICT,
    leave_type VARCHAR(30) NOT NULL CHECK (leave_type IN ('annual', 'sick', 'short', 'compassionate')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INT NOT NULL DEFAULT 1,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.aur_profiles(id),
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. SMS Communications Log
CREATE TABLE public.aur_sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone VARCHAR(30) NOT NULL,
    recipient_name VARCHAR(100),
    message_content TEXT NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    delivery_status VARCHAR(30) DEFAULT 'sent',
    gateway_reference VARCHAR(100),
    sent_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- TRIGGERS & PROCEDURES
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_aur_update_invoice_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC(12, 2);
    v_total_fee NUMERIC(12, 2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM public.aur_payments
    WHERE invoice_id = NEW.invoice_id AND status = 'completed';

    SELECT total_fee INTO v_total_fee
    FROM public.aur_invoices
    WHERE id = NEW.invoice_id;

    UPDATE public.aur_invoices
    SET amount_paid = v_total_paid,
        status = CASE 
            WHEN v_total_paid >= v_total_fee THEN 'paid'
            WHEN v_total_paid > 0 THEN 'partial'
            ELSE 'unpaid'
        END
    WHERE id = NEW.invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_aur_payment_received
AFTER INSERT OR UPDATE ON public.aur_payments
FOR EACH ROW
EXECUTE FUNCTION public.fn_aur_update_invoice_payment();

-- Atomic Reg Number generator
CREATE OR REPLACE FUNCTION public.fn_aur_generate_reg_number(p_branch_code VARCHAR, p_year INT)
RETURNS VARCHAR AS $$
DECLARE
    v_next_val INT;
    v_reg_no VARCHAR;
BEGIN
    INSERT INTO public.aur_reg_sequences (branch_code, reg_year, current_val)
    VALUES (UPPER(p_branch_code), p_year, 1)
    ON CONFLICT (branch_code, reg_year)
    DO UPDATE SET current_val = public.aur_reg_sequences.current_val + 1
    RETURNING current_val INTO v_next_val;

    v_reg_no := 'AUR/' || UPPER(p_branch_code) || '/' || p_year || '/' || LPAD(v_next_val::TEXT, 3, '0');
    RETURN v_reg_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.aur_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aur_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aur_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aur_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aur_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aur_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aur_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aur_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aur_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aur_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aur_staff_clockin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aur_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aur_sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aur_branches_policy" ON public.aur_branches FOR ALL USING (true);
CREATE POLICY "aur_profiles_policy" ON public.aur_profiles FOR ALL USING (true);
CREATE POLICY "aur_courses_policy" ON public.aur_courses FOR ALL USING (true);
CREATE POLICY "aur_cohorts_policy" ON public.aur_cohorts FOR ALL USING (true);
CREATE POLICY "aur_students_policy" ON public.aur_students FOR ALL USING (true);
CREATE POLICY "aur_enrollments_policy" ON public.aur_enrollments FOR ALL USING (true);
CREATE POLICY "aur_invoices_policy" ON public.aur_invoices FOR ALL USING (true);
CREATE POLICY "aur_payments_policy" ON public.aur_payments FOR ALL USING (true);
CREATE POLICY "aur_assessments_policy" ON public.aur_assessments FOR ALL USING (true);
CREATE POLICY "aur_attendance_policy" ON public.aur_attendance FOR ALL USING (true);
CREATE POLICY "aur_staff_clockin_policy" ON public.aur_staff_clockin FOR ALL USING (true);
CREATE POLICY "aur_leave_requests_policy" ON public.aur_leave_requests FOR ALL USING (true);
CREATE POLICY "aur_sms_logs_policy" ON public.aur_sms_logs FOR ALL USING (true);

-- ==============================================================================
-- SEED DATA (ZERO MANUAL UUIDs - 100% POSTGRES AUTOMATION)
-- ==============================================================================

-- 1. Insert Branches
INSERT INTO public.aur_branches (code, name, address, city, country, phone, email, manager_name)
VALUES
('NBO', 'Aurevia Nairobi Roastery & Academy', 'Spring Valley Coffee Hub, Westlands', 'Nairobi', 'Kenya', '+254 711 234 567', 'nairobi@aureviacoffee.com', 'David Mutua'),
('MSA', 'Aurevia Coastal Barista Center', 'Nyali Links Plaza, 2nd Floor', 'Mombasa', 'Kenya', '+254 722 345 678', 'mombasa@aureviacoffee.com', 'Amina Swaleh'),
('KGL', 'Aurevia Kigali Specialty Lab', 'KG 674 St, Kimihurura', 'Kigali', 'Rwanda', '+250 788 123 456', 'kigali@aureviacoffee.com', 'Jean-Paul Habimana');

-- 2. Insert Courses
INSERT INTO public.aur_courses (code, title, category, duration_weeks, fee_amount, description, certification_title, modules)
VALUES
('BAR-101', 'Barista Skills Foundation & Latte Art', 'Barista Skills', 2, 35000.00, 
 'Commercial espresso extraction, milk steaming & latte art.', 'Certified Barista Foundation (CBF)', 
 '["Espresso Calibration & Extraction", "Milk Chemistry & Microfoam", "Speed & Service Workflow", "Preventative Maintenance"]'::jsonb),
('ROAST-201', 'Roasting Mastery & Drum Dynamics', 'Roasting', 3, 55000.00,
 'Drum roaster profiling, RoR curves, and agtron QC.', 'Certified Coffee Roaster Intermediate',
 '["Green Coffee Moisture", "Thermodynamics & RoR Profiling", "Defect Roasts", "Roast Degassing & Cupping QC"]'::jsonb),
('SENS-301', 'Sensory Analysis & SCA Cupping Protocol', 'Sensory & Cupping', 2, 45000.00,
 'SCA cupping, aroma triangulation, and palate calibration.', 'Certified Coffee Cupper & Sensory Specialist',
 '["Sensory Calibration", "Aroma Recognition", "Triangulation & Acids", "SCA Cupping Protocol"]'::jsonb);

-- 3. Insert Profiles (Staff & 10 Test Trainees)
INSERT INTO public.aur_profiles (role, full_name, email, phone, reg_number, specialty)
VALUES
('super_admin', 'Ronny Ronald (Director)', 'admin@aureviacoffee.com', '+254 700 000 001', 'AUR/DIR/001', 'Executive Director'),
('branch_manager', 'David Mutua', 'david.mutua@aureviacoffee.com', '+254 711 234 567', 'AUR/MGR/NBO', 'Head of Nairobi Operations'),
('instructor', 'Wanjiku Kamau (Q-Grader)', 'wanjiku.kamau@aureviacoffee.com', '+254 720 111 222', 'AUR/INS/001', 'Licensed Q-Grader & Sensory Lead'),
('student', 'Faith Cherono', 'faith.cherono@student.aurevia.ac.ke', '+254 712 998 877', 'AUR/NBO/2026/001', NULL),
('student', 'Brian Mwangi', 'brian.mwangi@student.aurevia.ac.ke', '+254 723 445 566', 'AUR/NBO/2026/002', NULL),
('student', 'Mercy Achieng', 'mercy.achieng@student.aurevia.ac.ke', '+254 714 556 789', 'AUR/NBO/2026/003', NULL),
('student', 'Dennis Kiprop', 'dennis.kiprop@student.aurevia.ac.ke', '+254 725 667 890', 'AUR/NBO/2026/004', NULL),
('student', 'Esther Njeri', 'esther.njeri@student.aurevia.ac.ke', '+254 716 778 901', 'AUR/NBO/2026/005', NULL),
('student', 'Emmanuel Otieno', 'emmanuel.otieno@student.aurevia.ac.ke', '+254 727 889 012', 'AUR/NBO/2026/006', NULL),
('student', 'Brenda Wambui', 'brenda.wambui@student.aurevia.ac.ke', '+254 718 990 123', 'AUR/NBO/2026/007', NULL),
('student', 'Kelvin Mutiso', 'kelvin.mutiso@student.aurevia.ac.ke', '+254 729 001 234', 'AUR/NBO/2026/008', NULL),
('student', 'Gladys Chebet', 'gladys.chebet@student.aurevia.ac.ke', '+254 710 112 345', 'AUR/NBO/2026/009', NULL),
('student', 'Samuel Karanja', 'samuel.karanja@student.aurevia.ac.ke', '+254 721 223 456', 'AUR/NBO/2026/010', NULL);

-- 4. Associate Nairobi Branch ID to profiles
UPDATE public.aur_profiles 
SET branch_id = (SELECT id FROM public.aur_branches WHERE code = 'NBO');

-- 5. Insert Cohort dynamically
INSERT INTO public.aur_cohorts (course_id, branch_id, instructor_id, name, start_date, end_date, schedule_timing, google_meet_url, status, enrolled_count)
VALUES (
    (SELECT id FROM public.aur_courses WHERE code = 'BAR-101'),
    (SELECT id FROM public.aur_branches WHERE code = 'NBO'),
    (SELECT id FROM public.aur_profiles WHERE email = 'wanjiku.kamau@aureviacoffee.com'),
    'NBO Barista Intensive - Cohort 12',
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '9 days',
    '08:30 AM - 12:30 PM (Mon-Fri)',
    'https://meet.google.com/aur-bar-nbo12',
    'in_progress',
    10
);

-- 6. Insert Students & Enrollments into Cohort 12
DO $$
DECLARE
    r RECORD;
    v_cohort_id UUID;
    v_branch_id UUID;
    v_student_id UUID;
    v_enr_id UUID;
BEGIN
    SELECT id INTO v_cohort_id FROM public.aur_cohorts WHERE name = 'NBO Barista Intensive - Cohort 12' LIMIT 1;
    SELECT id INTO v_branch_id FROM public.aur_branches WHERE code = 'NBO' LIMIT 1;

    FOR r IN SELECT * FROM public.aur_profiles WHERE role = 'student' LOOP
        INSERT INTO public.aur_students (profile_id, branch_id, national_id_or_passport, kyc_verified, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship)
        VALUES (r.id, v_branch_id, '3' || LPAD(ROUND(RANDOM() * 9999999)::text, 7, '0'), true, 'Next of Kin', '+254 700 111 222', 'Parent')
        RETURNING id INTO v_student_id;

        INSERT INTO public.aur_enrollments (student_id, cohort_id, branch_id, status)
        VALUES (v_student_id, v_cohort_id, v_branch_id, 'active')
        RETURNING id INTO v_enr_id;

        INSERT INTO public.aur_invoices (invoice_number, enrollment_id, student_id, branch_id, total_fee, amount_paid, balance_due, status, due_date)
        VALUES ('INV-AUR-2026-' || LPAD(ROUND(RANDOM() * 9999)::text, 4, '0'), v_enr_id, v_student_id, v_branch_id, 35000, 35000, 0, 'paid', CURRENT_DATE + INTERVAL '7 days');
    END LOOP;
END $$;

-- 7. Insert Sequence
INSERT INTO public.aur_reg_sequences (branch_code, reg_year, current_val)
VALUES ('NBO', 2026, 10), ('MSA', 2026, 1);

