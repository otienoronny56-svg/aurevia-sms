-- =========================================================================
-- MIGRATION 002: Master Seed for Aurevia Institute of Coffee
-- Official Domain: aureviacoffeeinstitute.co.ke
-- Fully Self-Contained with all foreign keys (Branches -> Courses -> Cohorts -> Profiles -> Trainees)
-- =========================================================================

-- 1. Ensure Regional Campus Branches Exist
INSERT INTO aur_branches (id, code, name, address, city, country, phone, email, manager_name, is_active)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'NBO', 'Aurevia Nairobi Roastery & Academy', 'Spring Valley Coffee Hub, Westlands', 'Nairobi', 'Kenya', '+254 711 234 567', 'nairobi@aureviacoffeeinstitute.co.ke', 'David Mutua', true),
  ('b2000000-0000-0000-0000-000000000002', 'MSA', 'Aurevia Coastal Barista Center', 'Nyali Links Plaza, 2nd Floor', 'Mombasa', 'Kenya', '+254 722 345 678', 'mombasa@aureviacoffeeinstitute.co.ke', 'Amina Swaleh', true),
  ('b3000000-0000-0000-0000-000000000003', 'KGL', 'Aurevia Kigali Specialty Lab', 'KG 674 St, Kimihurura', 'Kigali', 'Rwanda', '+250 788 123 456', 'kigali@aureviacoffeeinstitute.co.ke', 'Jean-Paul Habimana', true)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  manager_name = EXCLUDED.manager_name,
  email = EXCLUDED.email;

-- 2. Ensure Core SCA Academic Courses Exist
INSERT INTO aur_courses (id, code, title, category, duration_weeks, fee_amount, description, modules, certification_title, is_active)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'BAR-101', 'Barista Skills Foundation & Latte Art', 'Barista Skills', 2, 35000, 'Comprehensive espresso extraction, grinder calibration, milk texturing mechanics, latte art patterning (Heart, Tulip, Rosetta), and fast-paced commercial cafe workflow.', ARRAY['Espresso Grinding & Calibration', 'Milk Texturing & Chemistry', 'Latte Art Fundamentals', 'Customer Service & Speed', 'Machine Maintenance & Sanitization'], 'Aurevia Certified Professional Barista (Level 1)', true),
  ('c2000000-0000-0000-0000-000000000002', 'ROAST-201', 'Specialty Coffee Roasting Mastery', 'Roasting', 3, 55000, 'Thermodynamics of drum roasting, charge temperature profiling, Rate of Rise (RoR) monitoring, first crack management, degassing protocols, and defect identification.', ARRAY['Green Coffee Physical Analysis', 'Drum Roaster Thermodynamics', 'Profile Development & RoR', 'Sample Roasting & Agtron Scale', 'Roastery Safety & Exhaust Systems'], 'Aurevia Certified Artisan Roaster', true),
  ('c3000000-0000-0000-0000-000000000003', 'SENS-301', 'Sensory Skills & SCA Cupping Protocol', 'Sensory & Cupping', 2, 45000, 'Physiology of taste, olfactory identification using Le Nez du Cafe kits, standard SCA cupping scorecards, triangulation testing, and green coffee flaw detection.', ARRAY['Physiology of Taste & Aroma', 'Olfactory Triangulation Testing', 'SCA Standard Cupping Protocol', 'Coffee Chemistry & Acids', 'Q-Grader Prep Fundamentals'], 'Aurevia Certified Coffee Taster', true),
  ('c4000000-0000-0000-0000-000000000004', 'GREEN-101', 'Green Coffee Sourcing & Processing', 'Green Coffee', 1, 30000, 'Agronomy of Arabica and Robusta, post-harvest processing methods (Washed, Natural, Honey, Anaerobic Fermentation), moisture analysis, screen sizing, and defect sorting.', ARRAY['Botany & Varietal Taxonomy', 'Harvest & Processing Methods', 'Physical Grading & Defects', 'Moisture & Water Activity', 'Direct Trade Logistics'], 'Aurevia Certificate in Green Coffee Agronomy', true)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  fee_amount = EXCLUDED.fee_amount;

-- 3. Ensure Active Cohorts Exist
INSERT INTO aur_cohorts (id, course_id, branch_id, name, start_date, end_date, schedule_timing, google_meet_url, status, max_capacity, enrolled_count)
VALUES
  ('h1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'NBO Barista Intensive - Cohort 12', '2026-08-25', '2026-09-08', '08:30 AM - 12:30 PM (Mon-Fri)', 'https://meet.google.com/aur-bar-nbo12', 'in_progress', 16, 10),
  ('h2000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'NBO Roasting Mastery - Cohort 04', '2026-08-18', '2026-09-12', '02:00 PM - 05:30 PM (Mon-Fri)', 'https://meet.google.com/aur-roast-nbo04', 'in_progress', 10, 9),
  ('h3000000-0000-0000-0000-000000000003', 'c3000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000002', 'MSA Sensory Cupping - Cohort 06', '2026-09-15', '2026-09-29', '09:00 AM - 01:00 PM (Mon-Fri)', 'https://meet.google.com/aur-sens-msa06', 'upcoming', 12, 7)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  enrolled_count = EXCLUDED.enrolled_count;

-- 4. Seed Faculty Directors, Managers, and Instructors
INSERT INTO aur_profiles (id, role, branch_id, full_name, email, phone, reg_number, specialty, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'branch_manager', 'b1000000-0000-0000-0000-000000000001', 'David Mutua', 'david.mutua@aureviacoffeeinstitute.co.ke', '+254 711 234 567', 'AUR/MGR/NBO', 'Head of Nairobi Operations', true),
  ('00000000-0000-0000-0000-000000000003', 'branch_manager', 'b2000000-0000-0000-0000-000000000002', 'Amina Swaleh', 'amina.swaleh@aureviacoffeeinstitute.co.ke', '+254 722 345 678', 'AUR/MGR/MSA', 'Coastal Center Director', true),
  ('00000000-0000-0000-0000-000000000006', 'branch_manager', 'b3000000-0000-0000-0000-000000000003', 'Jean-Paul Habimana', 'jeanpaul.habimana@aureviacoffeeinstitute.co.ke', '+250 788 123 456', 'AUR/MGR/KGL', 'Kigali Campus Director', true),
  ('00000000-0000-0000-0000-000000000004', 'instructor', 'b1000000-0000-0000-0000-000000000001', 'Wanjiku Kamau', 'wanjiku.kamau@aureviacoffeeinstitute.co.ke', '+254 720 111 222', 'AUR/INS/001', 'Licensed Q-Grader & Sensory Lead', true),
  ('00000000-0000-0000-0000-000000000005', 'instructor', 'b1000000-0000-0000-0000-000000000001', 'Kevin Ochieng', 'kevin.ochieng@aureviacoffeeinstitute.co.ke', '+254 721 333 444', 'AUR/INS/002', 'Master Roaster & Roastery Lead', true)
ON CONFLICT (reg_number) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  branch_id = EXCLUDED.branch_id,
  specialty = EXCLUDED.specialty,
  role = EXCLUDED.role;

-- 5. Seed 10 Test Trainee User Profiles (Cohort 12)
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
  ('00000000-0000-0000-0000-000000000020', 'student', 'b1000000-0000-0000-0000-000000000001', 'Samuel Karanja', 'samuel.karanja@aureviacoffeeinstitute.co.ke', '+254 721 234 567', 'AUR/NBO/2026/010', true)
ON CONFLICT (reg_number) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  branch_id = EXCLUDED.branch_id;

-- 6. Seed 10 Student KYC Dossiers
INSERT INTO aur_students (id, profile_id, branch_id, national_id_or_passport, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, kyc_verified, coffee_experience_level)
VALUES
  ('s1000000-0000-0000-0000-000000000001', (SELECT id FROM aur_profiles WHERE reg_number = 'AUR/NBO/2026/001' LIMIT 1), 'b1000000-0000-0000-0000-000000000001', '34892104', 'Mary Cherono', '+254 712 111 000', 'Mother', true, 'Home Brewer'),
  ('s2000000-0000-0000-0000-000000000002', (SELECT id FROM aur_profiles WHERE reg_number = 'AUR/NBO/2026/002' LIMIT 1), 'b1000000-0000-0000-0000-000000000001', '29481023', 'John Mwangi', '+254 722 888 111', 'Father', true, 'Beginner'),
  ('s4000000-0000-0000-0000-000000000004', (SELECT id FROM aur_profiles WHERE reg_number = 'AUR/NBO/2026/003' LIMIT 1), 'b1000000-0000-0000-0000-000000000001', '35891204', 'Alice Achieng', '+254 714 111 222', 'Sister', true, 'Cafe Assistant'),
  ('s5000000-0000-0000-0000-000000000005', (SELECT id FROM aur_profiles WHERE reg_number = 'AUR/NBO/2026/004' LIMIT 1), 'b1000000-0000-0000-0000-000000000001', '36892305', 'Peter Kiprop', '+254 725 222 333', 'Brother', true, 'Home Brewer'),
  ('s6000000-0000-0000-0000-000000000006', (SELECT id FROM aur_profiles WHERE reg_number = 'AUR/NBO/2026/005' LIMIT 1), 'b1000000-0000-0000-0000-000000000001', '37893406', 'Grace Njeri', '+254 716 333 444', 'Mother', true, 'Barista Enthusiast'),
  ('s7000000-0000-0000-0000-000000000007', (SELECT id FROM aur_profiles WHERE reg_number = 'AUR/NBO/2026/006' LIMIT 1), 'b1000000-0000-0000-0000-000000000001', '38894507', 'George Otieno', '+254 727 444 555', 'Father', true, 'Beginner'),
  ('s8000000-0000-0000-0000-000000000008', (SELECT id FROM aur_profiles WHERE reg_number = 'AUR/NBO/2026/007' LIMIT 1), 'b1000000-0000-0000-0000-000000000001', '39895608', 'Sarah Wambui', '+254 718 555 666', 'Sister', true, 'Cafe Waitstaff'),
  ('s9000000-0000-0000-0000-000000000009', (SELECT id FROM aur_profiles WHERE reg_number = 'AUR/NBO/2026/008' LIMIT 1), 'b1000000-0000-0000-0000-000000000001', '40896709', 'James Mutiso', '+254 729 666 777', 'Uncle', true, 'Barista Level 1'),
  ('s1000000-0000-0000-0000-000000000010', (SELECT id FROM aur_profiles WHERE reg_number = 'AUR/NBO/2026/009' LIMIT 1), 'b1000000-0000-0000-0000-000000000001', '41897810', 'Rose Chebet', '+254 710 777 888', 'Mother', true, 'Beginner'),
  ('s1100000-0000-0000-0000-000000000011', (SELECT id FROM aur_profiles WHERE reg_number = 'AUR/NBO/2026/010' LIMIT 1), 'b1000000-0000-0000-0000-000000000001', '42898911', 'David Karanja', '+254 721 888 999', 'Brother', true, 'Cafe Owner')
ON CONFLICT (id) DO UPDATE SET
  national_id_or_passport = EXCLUDED.national_id_or_passport,
  emergency_contact_name = EXCLUDED.emergency_contact_name,
  emergency_contact_phone = EXCLUDED.emergency_contact_phone,
  kyc_verified = EXCLUDED.kyc_verified;

-- 7. Seed Course Enrollments into Cohort 12 (Nairobi Barista Intensive)
INSERT INTO aur_enrollments (id, student_id, cohort_id, status)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 's1000000-0000-0000-0000-000000000001', 'h1000000-0000-0000-0000-000000000001', 'active'),
  ('e2000000-0000-0000-0000-000000000002', 's2000000-0000-0000-0000-000000000002', 'h1000000-0000-0000-0000-000000000001', 'active'),
  ('e4000000-0000-0000-0000-000000000004', 's4000000-0000-0000-0000-000000000004', 'h1000000-0000-0000-0000-000000000001', 'active'),
  ('e5000000-0000-0000-0000-000000000005', 's5000000-0000-0000-0000-000000000005', 'h1000000-0000-0000-0000-000000000001', 'active'),
  ('e6000000-0000-0000-0000-000000000006', 's6000000-0000-0000-0000-000000000006', 'h1000000-0000-0000-0000-000000000001', 'active'),
  ('e7000000-0000-0000-0000-000000000007', 's7000000-0000-0000-0000-000000000007', 'h1000000-0000-0000-0000-000000000001', 'active'),
  ('e8000000-0000-0000-0000-000000000008', 's8000000-0000-0000-0000-000000000008', 'h1000000-0000-0000-0000-000000000001', 'active'),
  ('e9000000-0000-0000-0000-000000000009', 's9000000-0000-0000-0000-000000000009', 'h1000000-0000-0000-0000-000000000001', 'active'),
  ('e1000000-0000-0000-0000-000000000010', 's1000000-0000-0000-0000-000000000010', 'h1000000-0000-0000-0000-000000000001', 'active'),
  ('e1100000-0000-0000-0000-000000000011', 's1100000-0000-0000-0000-000000000011', 'h1000000-0000-0000-0000-000000000001', 'active')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status;

-- 8. Seed Tuition Billing Invoices
INSERT INTO aur_invoices (id, student_id, cohort_id, total_fee, amount_paid, balance_due, status, due_date)
VALUES
  ('i1000000-0000-0000-0000-000000000001', 's1000000-0000-0000-0000-000000000001', 'h1000000-0000-0000-0000-000000000001', 35000, 35000, 0, 'paid', '2026-09-08'),
  ('i2000000-0000-0000-0000-000000000002', 's2000000-0000-0000-0000-000000000002', 'h1000000-0000-0000-0000-000000000001', 35000, 20000, 15000, 'partially_paid', '2026-09-08'),
  ('i4000000-0000-0000-0000-000000000004', 's4000000-0000-0000-0000-000000000004', 'h1000000-0000-0000-0000-000000000001', 35000, 35000, 0, 'paid', '2026-09-08'),
  ('i5000000-0000-0000-0000-000000000005', 's5000000-0000-0000-0000-000000000005', 'h1000000-0000-0000-0000-000000000001', 35000, 35000, 0, 'paid', '2026-09-08'),
  ('i6000000-0000-0000-0000-000000000006', 's6000000-0000-0000-0000-000000000006', 'h1000000-0000-0000-0000-000000000001', 35000, 15000, 20000, 'partially_paid', '2026-09-08'),
  ('i7000000-0000-0000-0000-000000000007', 's7000000-0000-0000-0000-000000000007', 'h1000000-0000-0000-0000-000000000001', 35000, 35000, 0, 'paid', '2026-09-08'),
  ('i8000000-0000-0000-0000-000000000008', 's8000000-0000-0000-0000-000000000008', 'h1000000-0000-0000-0000-000000000001', 35000, 35000, 0, 'paid', '2026-09-08'),
  ('i9000000-0000-0000-0000-000000000009', 's9000000-0000-0000-0000-000000000009', 'h1000000-0000-0000-0000-000000000001', 35000, 25000, 10000, 'partially_paid', '2026-09-08'),
  ('i1000000-0000-0000-0000-000000000010', 's1000000-0000-0000-0000-000000000010', 'h1000000-0000-0000-0000-000000000001', 35000, 35000, 0, 'paid', '2026-09-08'),
  ('i1100000-0000-0000-0000-000000000011', 's1100000-0000-0000-0000-000000000011', 'h1000000-0000-0000-0000-000000000001', 35000, 35000, 0, 'paid', '2026-09-08')
ON CONFLICT (id) DO UPDATE SET
  total_fee = EXCLUDED.total_fee,
  amount_paid = EXCLUDED.amount_paid,
  balance_due = EXCLUDED.balance_due,
  status = EXCLUDED.status;
