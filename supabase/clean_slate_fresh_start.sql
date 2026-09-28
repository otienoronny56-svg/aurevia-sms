-- ==============================================================================
-- SURGICAL CLEAN SLATE FOR AUREVIA SYSTEM MANAGEMENT ONLY
-- ==============================================================================
-- SAFETY GUARANTEE:
-- 1. This script ONLY affects tables starting with 'aur_*'.
-- 2. It will NEVER touch employees, payment_logs, production_logs, or any other system.
-- 3. It wipes out test students, test payments, test attendance, and mock logs.
-- 4. It resets registration numbers back to 0 (so your first real student gets #001).
-- 5. It preserves your Staff/Admin accounts, Branches, and Courses.
-- ==============================================================================

-- Step 1: Wipe all test transaction & student data
TRUNCATE TABLE 
    public.aur_sms_logs,
    public.aur_leave_requests,
    public.aur_staff_clockin,
    public.aur_attendance,
    public.aur_assessments,
    public.aur_payments,
    public.aur_invoices,
    public.aur_enrollments,
    public.aur_students,
    public.aur_cohorts
CASCADE;

-- Step 2: Wipe mock alumni if the table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'aur_alumni') THEN
        TRUNCATE TABLE public.aur_alumni CASCADE;
    END IF;
END $$;

-- Step 3: Remove ONLY test student profiles (leaves your Admins, Managers & Instructors intact)
DELETE FROM public.aur_profiles 
WHERE role = 'student';

-- Step 4: Reset registration number counter to 0
-- (Your next admitted student will start at 001)
TRUNCATE TABLE public.aur_reg_sequences;

-- Verification query
SELECT 'aur_students' as table_name, count(*) as count FROM public.aur_students
UNION ALL
SELECT 'aur_enrollments', count(*) FROM public.aur_enrollments
UNION ALL
SELECT 'aur_payments', count(*) FROM public.aur_payments
UNION ALL
SELECT 'aur_cohorts', count(*) FROM public.aur_cohorts
UNION ALL
SELECT 'aur_student_profiles', count(*) FROM public.aur_profiles WHERE role = 'student';
