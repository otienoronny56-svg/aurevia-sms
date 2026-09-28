-- ==============================================================================
-- FIX ROW LEVEL SECURITY (RLS) FOR TRIPPLE T / AUREVIA PORTAL
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR TO GRANT ANON / PUBLIC READ & WRITE ACCESS
-- ==============================================================================

-- 1. Ensure Aurevia Coffee Institute is Branch #1
UPDATE public.aur_branches
SET name = 'Aurevia Coffee Institute'
WHERE id = 'b1000000-0000-0000-0000-000000000001' OR code = 'NBO';

-- 2. Enable RLS and grant public access so browser anon key can read & write
DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'aur_branches',
        'aur_courses',
        'aur_profiles',
        'aur_cohorts',
        'aur_students',
        'aur_enrollments',
        'aur_invoices',
        'aur_payments',
        'aur_assessments',
        'aur_attendance',
        'aur_staff_clockin',
        'aur_leave_requests',
        'aur_sms_logs',
        'aur_reg_sequences'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        -- Drop existing policy if present
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_public_policy', tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_policy', tbl);
        -- Create open policy for public/anon
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);', tbl || '_public_policy', tbl);
    END LOOP;
END $$;

-- 3. Verify that anon can read branches
SELECT code, name, city FROM public.aur_branches;
