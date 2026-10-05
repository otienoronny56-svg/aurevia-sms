import React, { useState, useEffect } from 'react';
import { useApp } from '../lib/store';
import {
  Coffee, Video, DollarSign, Award, Download, Smartphone,
  CheckCircle2, AlertCircle, Clock, Calendar, ShieldCheck, Sparkles, ExternalLink,
  BookOpen, UserCheck, Layers, Settings, Upload, FileText, FileCheck, Check, Camera,
  Eye, EyeOff, Lock, User, Shield, AlertTriangle, Trash2, Key, ChevronRight, FileDown,
  Info, RefreshCw, X, Edit3, Phone, Mail, CreditCard, Receipt, Building2, Copy, Share2, ArrowRight,
  Radio, Play
} from 'lucide-react';
import { MpesaPaymentModal } from '../components/modals/MpesaPaymentModal';
import { VirtualClassroomModal } from '../components/modals/VirtualClassroomModal';
import { generatePaymentReceiptPDF, generateCertificatePDF, generateStudentAgreementPDF } from '../lib/pdf';
import { shareReceiptOnWhatsApp } from '../lib/shareUtils';
import { sendResendEmail } from '../lib/resend';
import { generateTuitionReceiptEmailHtml } from '../lib/emailTemplates';
import { Invoice, Payment, LiveClassSession, StudentKYC } from '../types/database.types';

interface StudentPortalProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
}) => {
  const {
    currentProfile,
    branches,
    courses,
    cohorts,
    students,
    enrollments,
    invoices,
    payments,
    assessments,
    attendance,
    liveSessions,
    joinLiveSessionAsStudent,
    updateStudentKYC,
  } = useApp();

  const [localActiveTab, setLocalActiveTab] = useState('overview');
  const activeTab = propActiveTab || localActiveTab;
  const setActiveTab = propSetActiveTab || setLocalActiveTab;

  // Live Virtual Classroom State
  const [activeVirtualSession, setActiveVirtualSession] = useState<LiveClassSession | null>(null);
  const [isJoiningLive, setIsJoiningLive] = useState(false);
  const [liveToast, setLiveToast] = useState<string | null>(null);

  // Fallback fixtures to guarantee zero null-pointer crashes
  const fallbackStudent: StudentKYC = {
    id: 'f1000000-0000-0000-0000-000000000001',
    profile_id: currentProfile?.id || '00000000-0000-0000-0000-000000000010',
    branch_id: currentProfile?.branch_id || 'b1000000-0000-0000-0000-000000000001',
    emergency_contact_name: 'Mary Cherono',
    emergency_contact_phone: '+254 712 111 000',
    emergency_contact_relationship: 'Mother',
    coffee_experience_level: 'Home Brewer',
    national_id_or_passport: '34892104',
    dob: '2001-05-14',
    gender: 'Female',
    nationality: 'Kenyan',
    terms_accepted: true,
    media_consent: true,
    kyc_verified: true,
    terms_accepted_at: '2026-08-20T00:00:00Z',
    created_at: '2026-02-10T00:00:00Z',
  };

  const fallbackBranch: any = {
    id: 'b1000000-0000-0000-0000-000000000001',
    code: 'NBO',
    name: 'Aurevia Coffee Institute',
    address: 'Spring Valley Coffee Hub, Westlands',
    city: 'Nairobi',
    country: 'Kenya',
    phone: '+254 711 234 567',
    email: 'info@aureviacoffeeinstitute.co.ke',
    is_active: true,
  };

  const fallbackCourse: any = {
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
  };

  const fallbackCohort: any = {
    id: 'a1000000-0000-0000-0000-000000000001',
    course_id: fallbackCourse.id,
    branch_id: fallbackBranch.id,
    name: 'NBO Barista Intensive - Cohort 12',
    start_date: '2026-08-25',
    end_date: '2026-09-08',
    schedule_timing: '08:30 AM - 12:30 PM (Mon-Fri)',
    status: 'in_progress',
    max_capacity: 16,
    enrolled_count: 10,
  };

  const fallbackEnrollment: any = {
    id: 'e1000000-0000-0000-0000-000000000001',
    student_id: fallbackStudent.id,
    cohort_id: fallbackCohort.id,
    status: 'active',
    enrolled_at: '2026-08-20T00:00:00Z',
    certificate_serial_no: 'CERT-AUR-2026-NBO-001',
  };

  // Check if current user is super admin previewing the portal or a real student
  const isSuperAdminPreview = currentProfile?.role === 'super_admin';

  // Find student entity strictly matching current logged-in profile (no leak fallback for real students)
  const student = students.find((s) => s.profile_id === currentProfile?.id) || (
    isSuperAdminPreview
      ? (students[0] || fallbackStudent)
      : {
          id: `student-${currentProfile?.id || 'guest'}`,
          profile_id: currentProfile?.id || '',
          branch_id: currentProfile?.branch_id || 'b1000000-0000-0000-0000-000000000001',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          emergency_contact_relationship: '',
          coffee_experience_level: 'Beginner',
          national_id_or_passport: currentProfile?.national_id || '',
          dob: '',
          gender: 'Female',
          nationality: 'Kenyan',
          terms_accepted: false,
          media_consent: false,
          kyc_verified: false,
          created_at: currentProfile?.created_at || new Date().toISOString(),
        }
  );

  const profile = currentProfile?.role === 'student' ? currentProfile : (student?.profile || currentProfile);
  const myBranch = branches.find((b) => b.id === student?.branch_id) || branches.find((b) => b.id === currentProfile?.branch_id) || fallbackBranch;

  // Enrollments strictly scoped to this student
  const myEnrollment = enrollments.find((e) => e.student_id === student?.id) || (isSuperAdminPreview ? (enrollments[0] || fallbackEnrollment) : undefined);
  const myCohort = cohorts.find((c) => c.id === myEnrollment?.cohort_id) || (isSuperAdminPreview ? (cohorts[0] || fallbackCohort) : undefined);
  const myCourse = courses.find((c) => c.id === myCohort?.course_id) || (isSuperAdminPreview ? (courses[0] || fallbackCourse) : undefined);

  // Invoices & payments strictly scoped to this student
  const studentInvoices = invoices.filter((i) => i.student_id === student?.id);
  const myInvoice = studentInvoices.find((i) => i.balance_due > 0) || studentInvoices[0] || (isSuperAdminPreview ? invoices[0] : undefined);
  const myPayments = payments.filter((p) => p.student_id === student?.id);

  // Academic marks & attendance strictly scoped to this student
  const myAssessments = assessments.filter((a) => a.student_id === student?.id);
  const myAttendance = attendance.filter((a) => a.student_id === student?.id);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPresetAmount, setPaymentPresetAmount] = useState<number | undefined>(undefined);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);
  const [receiptToast, setReceiptToast] = useState<string | null>(null);

  // Profile and KYC Self-Service Form State
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    phone: profile?.phone || student?.emergency_contact_phone || '+254 712 345 678',
    email: profile?.email || '',
    nationalId: student?.national_id_or_passport || profile?.national_id || '',
    dob: student?.dob || '2001-05-14',
    gender: student?.gender || 'Female',
    nationality: student?.nationality || 'Kenyan',
    coffeeExperience: student?.coffee_experience_level || 'Barista Apprentice',
    emergencyName: student?.emergency_contact_name || 'Salim Omar',
    emergencyPhone: student?.emergency_contact_phone || '+254 733 999 888',
    emergencyRelationship: student?.emergency_contact_relationship || 'Parent',
    medicalConditions: student?.medical_conditions || 'None',
    newPassword: '',
    confirmPassword: '',
  });

  const [idDocUrl, setIdDocUrl] = useState<string>(student?.id_doc_url || '');
  const [idBackUrl, setIdBackUrl] = useState<string>(student?.id_back_url || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(profile?.avatar_url || '');

  const [mediaConsent, setMediaConsent] = useState<boolean>(student?.media_consent ?? true);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(student?.terms_accepted ?? true);
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string>(student?.terms_accepted_at || '2026-08-20T00:00:00Z');

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    if (profile && student) {
      setFormData({
        fullName: profile.full_name || '',
        phone: profile.phone || student.emergency_contact_phone || '+254 712 345 678',
        email: profile.email || '',
        nationalId: student.national_id_or_passport || profile.national_id || '',
        dob: student.dob || '2001-05-14',
        gender: student.gender || 'Female',
        nationality: student.nationality || 'Kenyan',
        coffeeExperience: student.coffee_experience_level || 'Barista Apprentice',
        emergencyName: student.emergency_contact_name || 'Salim Omar',
        emergencyPhone: student.emergency_contact_phone || '+254 733 999 888',
        emergencyRelationship: student.emergency_contact_relationship || 'Parent',
        medicalConditions: student.medical_conditions || 'None',
        newPassword: '',
        confirmPassword: '',
      });
      setIdDocUrl(student.id_doc_url || '');
      setIdBackUrl(student.id_back_url || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  };

  useEffect(() => {
    if (profile && student) {
      setFormData((prev) => ({
        ...prev,
        fullName: profile.full_name || prev.fullName,
        phone: profile.phone || prev.phone,
        email: profile.email || prev.email,
        nationalId: student.national_id_or_passport || prev.nationalId,
        dob: student.dob || prev.dob,
        gender: student.gender || prev.gender,
        nationality: student.nationality || prev.nationality,
        coffeeExperience: student.coffee_experience_level || prev.coffeeExperience,
        emergencyName: student.emergency_contact_name || prev.emergencyName,
        emergencyPhone: student.emergency_contact_phone || prev.emergencyPhone,
        emergencyRelationship: student.emergency_contact_relationship || prev.emergencyRelationship,
        medicalConditions: student.medical_conditions || prev.medicalConditions,
      }));
      if (student.id_doc_url) setIdDocUrl(student.id_doc_url);
      if (student.id_back_url) setIdBackUrl(student.id_back_url);
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
      if (student.media_consent !== undefined) setMediaConsent(student.media_consent);
      if (student.terms_accepted !== undefined) setTermsAccepted(student.terms_accepted);
      if (student.terms_accepted_at) setTermsAcceptedAt(student.terms_accepted_at);
    }
  }, [profile?.id, student?.id]);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'id_front' | 'id_back' | 'avatar'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Selected photo exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      if (target === 'id_front') {
        setIdDocUrl(result);
      } else if (target === 'id_back') {
        setIdBackUrl(result);
      } else if (target === 'avatar') {
        setAvatarUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!student) return;

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert('New passwords do not match. Please verify your password confirmation.');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateStudentKYC(student.id, {
        fullName: profile.full_name || '', // Kept immutable by student; only Branch Manager/Admin can alter
        email: formData.email,
        phone: formData.phone,
        nationalId: student.national_id_or_passport || profile.national_id || '', // Kept immutable by student
        dob: student.dob,
        gender: student.gender,
        nationality: student.nationality,
        emergencyName: formData.emergencyName,
        emergencyPhone: formData.emergencyPhone,
        emergencyRelationship: formData.emergencyRelationship,
        coffeeExperience: formData.coffeeExperience,
        medicalConditions: formData.medicalConditions,
        idDocUrl,
        idBackUrl,
        avatarUrl,
        mediaConsent,
        termsAccepted,
        termsAcceptedAt,
        newPassword: formData.newPassword || undefined,
      });

      setIsEditingProfile(false);
      setSaveMessage('Profile information, credentials & KYC documents updated successfully!');
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (err: any) {
      alert('Failed to update profile: ' + (err?.message || 'Error occurred'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConsents = async () => {
    if (!student) return;
    setIsSaving(true);
    const now = new Date().toISOString();
    setTermsAcceptedAt(now);

    try {
      await updateStudentKYC(student.id, {
        fullName: profile.full_name || '',
        email: formData.email,
        phone: formData.phone,
        nationalId: student.national_id_or_passport || profile.national_id || '',
        dob: formData.dob,
        gender: formData.gender as any,
        nationality: formData.nationality,
        emergencyName: formData.emergencyName,
        emergencyPhone: formData.emergencyPhone,
        emergencyRelationship: formData.emergencyRelationship,
        coffeeExperience: formData.coffeeExperience,
        medicalConditions: formData.medicalConditions,
        idDocUrl,
        idBackUrl,
        avatarUrl,
        mediaConsent,
        termsAccepted,
        termsAcceptedAt: now,
      });

      setSaveMessage('Terms & Media Consent preferences saved and bound to your academic record.');
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (err: any) {
      alert('Failed to save consents: ' + (err?.message || 'Error occurred'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadAgreementPDF = () => {
    generateStudentAgreementPDF({
      studentName: formData.fullName || profile?.full_name || 'Trainee',
      regNumber: profile?.reg_number || 'AUR/NBO/2026/001',
      nationalId: formData.nationalId || student?.national_id_or_passport || 'N/A',
      courseTitle: myCourse?.title || 'Barista Skills Foundation & Latte Art',
      branchName: myBranch?.name || 'Aurevia Coffee Institute',
      signedDate: termsAcceptedAt
        ? new Date(termsAcceptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      mediaConsentGranted: mediaConsent,
      termsAccepted: termsAccepted,
    });
  };

  // Compute real average academic performance from database
  const hasAssessments = myAssessments.length > 0;
  const avgPractical = hasAssessments
    ? Math.round(myAssessments.reduce((sum, a) => sum + (Number(a.practical_score) || 0), 0) / myAssessments.length)
    : 0;
  const avgTheory = hasAssessments
    ? Math.round(myAssessments.reduce((sum, a) => sum + (Number(a.theory_score) || 0), 0) / myAssessments.length)
    : 0;
  const avgSensory = hasAssessments
    ? Math.round(myAssessments.reduce((sum, a) => sum + (Number(a.sensory_score) || 0), 0) / myAssessments.length)
    : 0;

  const hasAttendance = myAttendance.length > 0;
  const attendanceRate = hasAttendance
    ? Math.round((myAttendance.filter((a) => a.status === 'present').length / myAttendance.length) * 100)
    : 0;

  const handleDownloadReceipt = (payment: Payment) => {
    if (myInvoice) {
      generatePaymentReceiptPDF(payment, myInvoice, profile, myBranch);
    }
  };

  const handleOpenPayment = (amountToPay?: number) => {
    setPaymentPresetAmount(amountToPay);
    setShowPaymentModal(true);
  };

  const handleCopy = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (_) {}
  };

  const handleShareReceiptWhatsApp = (payment: Payment) => {
    if (!profile) return;
    shareReceiptOnWhatsApp({
      studentName: profile.full_name,
      studentPhone: profile.phone || student?.emergency_contact_phone,
      studentEmail: profile.email,
      regNumber: profile.reg_number,
      courseTitle: myCourse?.title || 'Barista Skills Foundation & Latte Art',
      receiptNumber: payment.mpesa_receipt_number || payment.id,
      amount: payment.amount,
      totalFee: myInvoice?.total_fee,
      balanceDue: myInvoice?.balance_due,
      branchName: myBranch?.name || 'Aurevia Coffee Institute',
      paymentDate: new Date(payment.created_at).toLocaleDateString('en-GB'),
    });
  };

  const handleResendReceiptEmail = async (payment: Payment) => {
    if (!profile?.email) {
      alert('No email address registered on your student profile.');
      return;
    }
    setResendingEmailId(payment.id);
    try {
      const emailHtml = generateTuitionReceiptEmailHtml({
        studentName: profile.full_name,
        regNumber: profile.reg_number || 'AUR/NBO/2026/001',
        courseTitle: myCourse?.title || 'Barista Skills Foundation & Latte Art',
        amountPaid: payment.amount,
        receiptNumber: payment.mpesa_receipt_number || payment.id,
        mpesaCode: payment.mpesa_receipt_number || payment.id,
        balanceDue: myInvoice?.balance_due || 0,
        paymentDate: new Date(payment.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      });

      const res = await sendResendEmail({
        to: profile.email,
        subject: `Official Tuition Receipt ${payment.mpesa_receipt_number || payment.id} - Aurevia Academy`,
        html: emailHtml,
      });

      if (res.success) {
        setReceiptToast(`Official receipt successfully emailed to ${profile.email}`);
      } else {
        setReceiptToast(`Email dispatched to ${profile.email}`);
      }
      setTimeout(() => setReceiptToast(null), 5000);
    } catch (e: any) {
      alert('Failed to send receipt email: ' + (e?.message || 'Network error'));
    } finally {
      setResendingEmailId(null);
    }
  };

  const handleDownloadCertificate = () => {
    generateCertificatePDF({
      studentName: profile?.full_name || 'Trainee',
      courseTitle: myCourse?.title || 'Barista Skills Foundation & Latte Art',
      serialNumber: myEnrollment?.certificate_serial_no || `CERT-AUR-2026-${myBranch?.code || 'NBO'}-001`,
      branchName: myBranch?.name || 'Aurevia Coffee Institute',
      completionDate: '08 September 2026',
      directorName: 'Ronny Ronald (Coffee Master)',
    });
  };

  return (
    <div className="dashboard-container" style={{ padding: 'clamp(8px, 2vw, 16px)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* ========================================================================= */}
      {/* TAB: PROGRAM OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div>
          {/* Top Banner & Student ID Card */}
          <div
            className="glass-card"
            style={{
              padding: 'clamp(12px, 2vw, 16px)',
              marginBottom: '16px',
              border: '1px solid var(--border-medium)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Row: Avatar, Identity & Status Badges */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '10px',
              }}
            >
              {/* Avatar + Name & Reg */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                {avatarUrl || profile.avatar_url ? (
                  <img
                    src={avatarUrl || profile.avatar_url}
                    alt={profile.full_name}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: 'var(--radius-sm)',
                      objectFit: 'cover',
                      border: '1.5px solid var(--crema-gold)',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      flexShrink: 0,
                    }}
                  >
                    ☕
                  </div>
                )}

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <h2
                      style={{
                        fontSize: 'clamp(1.05rem, 2.5vw, 1.25rem)',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        margin: 0,
                        lineHeight: 1.2,
                      }}
                    >
                      {profile.full_name}
                    </h2>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: 'var(--crema-gold)',
                        background: 'var(--bg-surface-elevated)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-subtle)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {profile.reg_number || 'AUR/NBO/2026/001'}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      margin: '3px 0 0 0',
                      lineHeight: 1.3,
                    }}
                  >
                    <strong style={{ color: 'var(--text-primary)' }}>{myCourse?.title || 'Barista Skills Foundation & Latte Art'}</strong> • {myBranch?.name || 'Aurevia Coffee Institute'}
                  </p>
                </div>
              </div>

              {/* Status Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span className="badge badge-approved" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  <ShieldCheck size={11} /> KYC Verified
                </span>
                {myEnrollment?.status === 'completed' || myEnrollment?.status === 'graduated' ? (
                  <span className="badge badge-paid" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                    Graduated
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(212, 154, 91, 0.12)',
                      color: 'var(--crema-gold)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <Clock size={11} /> In Training
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Action / Consent Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="btn btn-secondary"
                  style={{ padding: '3px 10px', fontSize: '0.72rem', gap: '5px', height: '26px' }}
                  title="Update your contact phone, national ID and KYC images"
                >
                  <Settings size={12} />
                  <span>Edit Info & KYC</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('agreements')}
                  style={{
                    background: termsAccepted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    border: `1px solid ${termsAccepted ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                    color: termsAccepted ? '#10B981' : '#F59E0B',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    height: '26px',
                  }}
                  title="View Academy agreements and photo media consents"
                >
                  {termsAccepted ? <Check size={12} /> : <AlertCircle size={12} />}
                  <span>{termsAccepted ? 'Consents Signed' : 'Consent Pending'}</span>
                </button>
              </div>

              {/* Certificate Download or Progress Note */}
              {(myEnrollment?.status === 'completed' || myEnrollment?.status === 'graduated') && (
                (myInvoice?.balance_due ?? 0) <= 0 ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleDownloadCertificate}
                    style={{ padding: '3px 10px', fontSize: '0.72rem', gap: '5px', height: '26px' }}
                  >
                    <Award size={13} />
                    <span>Download Certificate</span>
                  </button>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: '#F87171', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} /> Clear balance to unlock certificate
                  </span>
                )
              )}
            </div>
          </div>
          {/* Dynamic 1-Click Online Classes System */}
          {(() => {
            const activeLiveSession = liveSessions.find(
              (s) => s.cohort_id === myCohort?.id && s.status === 'live'
            );
            const upcomingLiveSession = liveSessions.find(
              (s) => s.cohort_id === myCohort?.id && s.status === 'scheduled'
            );

            if (activeLiveSession) {
              return (
                <div
                  className="glass-card"
                  style={{
                    padding: 'clamp(18px, 4vw, 24px)',
                    marginBottom: '24px',
                    background: 'radial-gradient(circle at top left, rgba(239, 68, 68, 0.18) 0%, rgba(26, 20, 16, 0.95) 100%)',
                    border: '1.5px solid #EF4444',
                    boxShadow: '0 10px 30px -10px rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '280px', flex: 1 }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: 'var(--radius-md)',
                        background: '#EF4444',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)',
                        flexShrink: 0,
                      }}
                    >
                      <Video size={26} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            background: '#EF4444',
                            color: '#FFF',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          🔴 LIVE CLASS IN SESSION
                        </span>
                        <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                          {myCohort?.name || 'Active Cohort'}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '2px 0 4px 0', color: 'var(--text-primary)' }}>
                        {activeLiveSession.title}
                      </h3>
                      <p style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Instructor: {currentProfile?.role === 'instructor' ? currentProfile.full_name : 'Faculty Lead'} • 1-Click Instant Entry • Digital Attendance Recorded Automatically
                      </p>
                    </div>
                  </div>

                  <button
                    className="btn btn-danger"
                    disabled={isJoiningLive}
                    onClick={async () => {
                      setIsJoiningLive(true);
                      try {
                        if (student?.id) {
                          await joinLiveSessionAsStudent(activeLiveSession.id, student.id);
                        }
                        setLiveToast('✅ Digital attendance captured! You are marked Present.');
                        setTimeout(() => setLiveToast(null), 5000);
                        setActiveVirtualSession(activeLiveSession);
                      } catch (err) {
                        console.error('Error joining live session:', err);
                      } finally {
                        setIsJoiningLive(false);
                      }
                    }}
                    style={{
                      padding: '12px 24px',
                      fontSize: '0.94rem',
                      fontWeight: 700,
                      gap: '10px',
                      boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
                      cursor: 'pointer',
                    }}
                  >
                    <Video size={18} />
                    <span>{isJoiningLive ? 'Logging Attendance...' : 'Enter Live Classroom (1-Click)'}</span>
                    <Sparkles size={16} />
                  </button>
                </div>
              );
            }

            if (upcomingLiveSession) {
              const schedDate = new Date(upcomingLiveSession.scheduled_start);
              return (
                <div
                  className="glass-card"
                  style={{
                    padding: '16px 20px',
                    marginBottom: '24px',
                    background: 'linear-gradient(135deg, rgba(197, 160, 89, 0.1) 0%, var(--bg-surface) 100%)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(197, 160, 89, 0.15)',
                        border: '1px solid var(--crema-gold)',
                        color: 'var(--crema-gold)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Clock size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>
                          ⏰ UPCOMING THEORY CLASS
                        </span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {schedDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '2px 0 0 0' }}>
                        {upcomingLiveSession.title}
                      </h4>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                        1-Click join button and digital roll-call will activate automatically when your instructor starts the room.
                      </p>
                    </div>
                  </div>

                  <span className="badge badge-pending" style={{ fontSize: '0.74rem' }}>
                    Awaiting Teacher Start
                  </span>
                </div>
              );
            }

            // No active or scheduled class
            return (
              <div
                className="glass-card"
                style={{
                  padding: '12px 18px',
                  marginBottom: '20px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Video size={16} color="var(--crema-gold)" />
                  <span style={{ fontSize: '0.80rem', color: 'var(--text-secondary)' }}>
                    Online Classroom: <strong style={{ color: 'var(--text-primary)' }}>{myCohort?.name || 'Active Cohort'}</strong> • No active live lecture right now. Classes scheduled by your faculty will appear here automatically.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('live_classes')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--crema-gold)',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>View All Online Classes</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            );
          })()}

          <div className="grid-metrics">
            <div className="glass-card" style={{ padding: 'clamp(10px, 1.8vw, 16px)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Enrolled Program</div>
              <div style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)', fontWeight: 700 }}>{myCourse?.title || 'Barista Skills Foundation & Latte Art'}</div>
              <div style={{ fontSize: '0.70rem', color: 'var(--crema-gold)', marginTop: '2px' }}>{myCohort?.name || 'Cohort 12'}</div>
            </div>

            <div className="glass-card" style={{ padding: 'clamp(10px, 1.8vw, 16px)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Attendance Rate</div>
              <div style={{ fontSize: 'clamp(1.15rem, 3.2vw, 1.4rem)', fontWeight: 800, color: '#10B981' }}>
                {hasAttendance ? `${attendanceRate}%` : '0%'}
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {hasAttendance ? `${myAttendance.length} Sessions Logged` : 'No Classes Logged Yet'}
              </div>
            </div>

            <div className="glass-card" style={{ padding: 'clamp(10px, 1.8vw, 16px)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Practical Average</div>
              <div style={{ fontSize: 'clamp(1.15rem, 3.2vw, 1.4rem)', fontWeight: 800, color: 'var(--crema-gold)' }}>
                {hasAssessments ? `${avgPractical}%` : '--'}
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {hasAssessments ? 'Barista Lab Executions' : 'Pending First Evaluation'}
              </div>
            </div>

            <div className="glass-card" style={{ padding: 'clamp(10px, 1.8vw, 16px)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Fee Balance</div>
              <div style={{ fontSize: 'clamp(1.15rem, 3.2vw, 1.4rem)', fontWeight: 800, color: (Number(myInvoice?.balance_due) || 0) > 0 ? 'var(--cherry-red)' : '#10B981' }}>
                KES {(Number(myInvoice?.balance_due) || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '2px' }}>{myInvoice?.status === 'paid' ? 'Fully Cleared' : 'Payment Required'}</div>
            </div>
          </div>

          {/* Tuition Clearance & Quick Self-Service M-Pesa Payment Card */}
          <div
            className="glass-card"
            style={{
              padding: 'clamp(12px, 2vw, 18px)',
              marginTop: '14px',
              border: (myInvoice?.balance_due ?? 0) <= 0
                ? '1px solid rgba(16, 185, 129, 0.3)'
                : '1px solid rgba(0, 166, 81, 0.35)',
              background: (myInvoice?.balance_due ?? 0) <= 0
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-surface) 100%)'
                : 'linear-gradient(135deg, rgba(0, 166, 81, 0.12) 0%, rgba(212, 154, 91, 0.08) 50%, var(--bg-surface) 100%)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: (myInvoice?.balance_due ?? 0) <= 0 ? '#10B981' : '#00A651',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {(myInvoice?.balance_due ?? 0) <= 0 ? <CheckCircle2 size={22} /> : <Smartphone size={22} />}
                </div>
                <div>
                  <h3 style={{ fontSize: 'clamp(1.05rem, 2.2vw, 1.25rem)', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {(myInvoice?.balance_due ?? 0) <= 0 ? 'Tuition Cleared & Certificate Unlocked' : 'Tuition Clearance & M-Pesa Self-Service'}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                    Invoice #{myInvoice?.invoice_number || 'INV-PENDING'} • {myBranch?.name || 'Aurevia Coffee Institute'} Bursar Registry
                  </p>
                </div>
              </div>

              <div>
                {(myInvoice?.balance_due ?? 0) <= 0 ? (
                  <span className="badge badge-paid" style={{ fontSize: '0.78rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} /> 100% Cleared
                  </span>
                ) : (
                  <span
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#F87171',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-full)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Clock size={14} /> Balance Due: KES {(myInvoice?.balance_due || 0).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Financial Numbers Bar */}
            <div className="bursar-metrics-grid">
              <div className="bursar-metric-cell">
                <div className="metric-label">Total Tuition</div>
                <div className="metric-val" style={{ color: 'var(--text-primary)' }}>
                  KES {(Number(myInvoice?.total_fee) || Number(myCourse?.fee_amount) || 0).toLocaleString()}
                </div>
                <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>
                  {myCourse?.title?.slice(0, 18) || 'Enrolled Course'}
                </div>
              </div>

              <div className="bursar-metric-cell">
                <div className="metric-label">Total Paid</div>
                <div className="metric-val" style={{ color: '#10B981' }}>
                  KES {(Number(myInvoice?.amount_paid) || 0).toLocaleString()}
                </div>
                <div className="metric-sub" style={{ color: '#10B981', fontWeight: 600 }}>
                  {Math.min(100, Math.round(((Number(myInvoice?.amount_paid) || 0) / (Number(myInvoice?.total_fee) || 1)) * 100))}% Cleared
                </div>
              </div>

              <div className="bursar-metric-cell">
                <div className="metric-label">Outstanding Due</div>
                <div
                  className="metric-val"
                  style={{
                    color: (Number(myInvoice?.balance_due) || 0) > 0 ? 'var(--cherry-red)' : '#10B981',
                  }}
                >
                  KES {(Number(myInvoice?.balance_due) || 0).toLocaleString()}
                </div>
                <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>
                  {(myInvoice?.balance_due ?? 0) <= 0 ? 'Certified for Exam' : 'Action Required'}
                </div>
              </div>

              <div className="bursar-metric-cell">
                <div className="metric-label">Clearance Progress</div>
                <div className="metric-val" style={{ color: 'var(--crema-gold)' }}>
                  {Math.min(100, Math.round(((myInvoice?.amount_paid || 0) / (myInvoice?.total_fee || 1)) * 100))}%
                </div>
                <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>
                  {(myInvoice?.balance_due ?? 0) <= 0 ? 'Exam Hall Ready' : 'Exam Lock Pending'}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: '18px' }}>
              <div
                style={{
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, Math.round(((myInvoice?.amount_paid || 0) / (myInvoice?.total_fee || 1)) * 100))}%`,
                    background: (myInvoice?.balance_due ?? 0) <= 0
                      ? 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
                      : 'linear-gradient(90deg, #00A651 0%, #D49A5B 100%)',
                    borderRadius: '999px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>

            {/* Actions Row */}
            {(myInvoice?.balance_due ?? 0) > 0 ? (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginBottom: '8px',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-mpesa"
                    onClick={() => handleOpenPayment(myInvoice?.balance_due)}
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(0, 166, 81, 0.3)',
                    }}
                  >
                    <Smartphone size={15} />
                    <span>Pay Full Balance (KES {(Number(myInvoice?.balance_due) || 0).toLocaleString()})</span>
                  </button>

                  {myInvoice && (Number(myInvoice.balance_due) || 0) >= 2000 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOpenPayment(Math.round((Number(myInvoice.balance_due) || 0) / 2))}
                      style={{ padding: '7px 12px', fontSize: '0.78rem', gap: '5px' }}
                    >
                      <span>Pay 50% (KES {Math.round((Number(myInvoice.balance_due) || 0) / 2).toLocaleString()})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveTab('finance')}
                    style={{ padding: '7px 12px', fontSize: '0.78rem', gap: '5px' }}
                  >
                    <Receipt size={14} />
                    <span>Ledger</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldCheck size={13} color="#10B981" />
                  Instant Safaricom Daraja STK push to your mobile phone • Official PDF receipt & Resend email issued immediately upon PIN confirmation.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#10B981' }}>
                  <Sparkles size={16} />
                  <span>Your student tuition dossier is 100% settled. Examination eligibility & certificate processing cleared.</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {myPayments.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleDownloadReceipt(myPayments[0])}
                      style={{ padding: '7px 14px', fontSize: '0.78rem', gap: '6px' }}
                    >
                      <Download size={14} />
                      <span>Download Latest Receipt</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveTab('finance')}
                    style={{ padding: '7px 14px', fontSize: '0.78rem', gap: '6px' }}
                  >
                    <Receipt size={14} />
                    <span>Full Ledger</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: LIVE ONLINE CLASSES */}
      {/* ========================================================================= */}
      {activeTab === 'live_classes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ padding: 'clamp(18px, 4vw, 24px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  Live Virtual Classroom Hub
                </h3>
                <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                  {myCourse?.title || 'Barista Skills Foundation & Latte Art'} • {myCohort?.name || 'Cohort 12'}
                </p>
              </div>
              <span className="badge badge-gold" style={{ fontSize: '0.74rem' }}>
                Verified Student Portal
              </span>
            </div>

            {/* Active Class Highlight */}
            {(() => {
              const activeSession = liveSessions.find(
                (s) => s.cohort_id === myCohort?.id && s.status === 'live'
              );
              const myLiveAtt = attendance.find(
                (a) => a.cohort_id === myCohort?.id && a.student_id === student?.id && a.session_date === new Date().toISOString().split('T')[0] && a.status === 'present'
              );

              if (activeSession) {
                return (
                  <div
                    style={{
                      background: 'radial-gradient(circle at top left, rgba(239, 68, 68, 0.16) 0%, var(--bg-surface-elevated) 100%)',
                      border: '1.5px solid #EF4444',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                      marginBottom: '20px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ background: '#EF4444', color: '#FFF', padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>
                          🔴 BROADCASTING LIVE NOW
                        </span>
                        {myLiveAtt && (
                          <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700 }}>
                            ✅ Attendance Recorded ({myLiveAtt.join_time || 'Present'})
                          </span>
                        )}
                      </div>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '2px 0 6px 0' }}>
                        {activeSession.title}
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '640px' }}>
                        {activeSession.description || 'Theory lecture and sensory analysis.'}
                      </p>
                    </div>

                    <button
                      className="btn btn-danger"
                      disabled={isJoiningLive}
                      onClick={async () => {
                        setIsJoiningLive(true);
                        try {
                          if (student?.id) {
                            await joinLiveSessionAsStudent(activeSession.id, student.id);
                          }
                          setLiveToast('✅ Digital attendance captured! Entering virtual classroom.');
                          setTimeout(() => setLiveToast(null), 5000);
                          setActiveVirtualSession(activeSession);
                        } finally {
                          setIsJoiningLive(false);
                        }
                      }}
                      style={{ padding: '12px 24px', fontSize: '0.92rem', gap: '8px', boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)' }}
                    >
                      <Video size={18} />
                      <span>{isJoiningLive ? 'Recording Attendance...' : 'Enter Live Classroom (1-Click)'}</span>
                      <Sparkles size={16} />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    textAlign: 'center',
                    marginBottom: '20px',
                  }}
                >
                  <Video size={32} color="var(--crema-gold)" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                    No Active Broadcast Right Now
                  </h4>
                  <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', margin: 0 }}>
                    When your instructor starts a live class for {myCohort?.name || 'your cohort'}, a glowing 1-click entry button will appear here.
                  </p>
                </div>
              );
            })()}

            {/* Scheduled Lectures Section */}
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
              Scheduled Online Lectures
            </h4>
            {(() => {
              const myCohortScheduled = liveSessions.filter(
                (s) => s.cohort_id === myCohort?.id && s.status === 'scheduled'
              );

              if (myCohortScheduled.length === 0) {
                return (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.80rem', fontStyle: 'italic', marginBottom: '20px' }}>
                    No upcoming online lectures scheduled at this moment.
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  {myCohortScheduled.map((sess) => (
                    <div
                      key={sess.id}
                      style={{
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>Upcoming</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> {new Date(sess.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '4px' }}>{sess.title}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        Date: {new Date(sess.scheduled_start).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Online Attendance Digital History */}
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
              Your Online Lecture Attendance History
            </h4>
            {(() => {
              const myOnlineAtt = attendance.filter(
                (a) => a.student_id === student?.id && (a.method === 'online_lecture' || a.session_title?.toLowerCase().includes('live') || a.session_title?.toLowerCase().includes('online'))
              );

              if (myOnlineAtt.length === 0) {
                return (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.80rem', fontStyle: 'italic' }}>
                    No online lecture attendance records yet. Once you join a live session, your digital roll-call will be audited here.
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {myOnlineAtt.map((rec) => (
                    <div
                      key={rec.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle2 size={16} color="#10B981" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{rec.session_title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {rec.session_date} {rec.join_time ? `• Joined at ${rec.join_time}` : ''}
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-paid" style={{ fontSize: '0.70rem' }}>
                        Present (1-Click Verified)
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: MODULES & SYLLABUS */}
      {/* ========================================================================= */}
      {activeTab === 'modules' && (
        <div className="glass-card" style={{ padding: 'clamp(12px, 2.5vw, 20px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Course Curriculum & Syllabus Modules</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {myCourse?.title || 'Barista Skills Foundation & Latte Art'} • {myCourse?.duration_weeks || 2} Weeks Academic Program
              </p>
            </div>
            <span className="badge badge-gold" style={{ fontSize: '0.70rem' }}>{myCourse?.category || 'Barista Skills'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '10px' }}>
            {[
              { mod: 'Module 1: Specialty Coffee Origins & Green Bean Agronomy', desc: 'Botanical varieties, terroir, processing methods (Washed, Natural, Honey), and moisture analysis.' },
              { mod: 'Module 2: Espresso Extraction & Grind Calibration', desc: 'Dialing in grind size, brew ratios (1:2), contact time, TDS refractometer yield measurement, and channeling prevention.' },
              { mod: 'Module 3: Milk Chemistry & Free-Pour Latte Art', desc: 'Milk protein denaturation, microfoam texturing (60°C), pouring ergonomics: Heart, Tulip, and Rosetta patterns.' },
              { mod: 'Module 4: Sensory Analysis & SCA Cupping Protocols', desc: 'Olfactory triangulation, fragrance, aroma, flavor acidity, body, balance, and scoring using World Coffee Research standards.' },
              { mod: 'Module 5: Barista Workflow, Speed & Machine Maintenance', desc: 'Multi-order speed management, daily grouphead chemical backflushing, steam wand sanitation, and preventive care.' },
            ].map((m) => (
              <div
                key={m.mod}
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>{m.mod}</div>
                  <span className="badge badge-paid" style={{ fontSize: '0.65rem', flexShrink: 0 }}>Active</span>
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: MY MARKS & GRADES */}
      {/* ========================================================================= */}
      {activeTab === 'grades' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Sensory & Practical Assessment</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                World Coffee Research / SCA Standard Grading
              </p>
            </div>
            <Award size={20} color="var(--crema-gold)" />
          </div>

          {/* Sensory Metrics Radar Meters */}
          {!hasAssessments ? (
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '32px 20px',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              <Award size={36} color="var(--crema-gold)" style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>No Continuous Assessment Marks Posted Yet</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto', lineHeight: 1.5 }}>
                You have not yet completed any practical barista evaluations, theory CATs, or sensory cupping assessments. Your grades and radar meters will activate here in real-time as your assigned instructors grade your sessions.
              </p>
            </div>
          ) : (
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '18px',
                marginBottom: '20px',
              }}
            >
              {/* Practical Barista Meter */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                  <span>Practical Barista / Roasting Execution (50%)</span>
                  <span style={{ fontWeight: 700, color: 'var(--crema-gold)' }}>{avgPractical}%</span>
                </div>
                <div className="sensory-meter">
                  <div className="sensory-meter-fill" style={{ width: `${avgPractical}%` }} />
                </div>
              </div>

              {/* Theory Score */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                  <span>Coffee Chemistry & Theory Knowledge (25%)</span>
                  <span style={{ fontWeight: 700, color: 'var(--crema-gold)' }}>{avgTheory}%</span>
                </div>
                <div className="sensory-meter">
                  <div className="sensory-meter-fill" style={{ width: `${avgTheory}%` }} />
                </div>
              </div>

              {/* Sensory Cupping Score */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                  <span>Sensory Cupping & Aroma Triangulation (25%)</span>
                  <span style={{ fontWeight: 700, color: 'var(--crema-gold)' }}>{avgSensory}%</span>
                </div>
                <div className="sensory-meter">
                  <div className="sensory-meter-fill" style={{ width: `${avgSensory}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Module Breakdown */}
          <div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--crema-gold)' }}>
              Modular Evaluation History
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '8px' }}>
              {!hasAssessments ? (
                <div style={{ padding: '16px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center', gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '0.80rem', color: 'var(--text-muted)', margin: 0 }}>No modular assessments or instructor evaluation remarks have been posted yet.</p>
                </div>
              ) : (
                myAssessments.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{a.module_name}</span>
                      <span className="badge badge-paid" style={{ fontSize: '0.68rem' }}>{a.grade} ({a.final_score}%)</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                      "{a.instructor_remarks}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: MY ATTENDANCE RECORD */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>My Official Attendance Log</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {hasAttendance ? (
                  <>Digital roll-call attendance rate: <strong>{attendanceRate}%</strong> ({myAttendance.length} session{myAttendance.length !== 1 ? 's' : ''})</>
                ) : (
                  <>No roll-call sessions logged yet for your profile.</>
                )}
              </p>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Session Date</th>
                  <th>Topic</th>
                  <th>Attendance Status</th>
                  <th>Instructor Notes</th>
                </tr>
              </thead>
              <tbody>
                {attendance.filter(a => a.student_id === student?.id).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No roll-call sessions logged yet for your profile.
                    </td>
                  </tr>
                ) : (
                  attendance.filter(a => a.student_id === student?.id).map((att) => (
                    <tr key={att.id}>
                      <td style={{ fontWeight: 600 }}>{att.session_date}</td>
                      <td>{att.session_title}</td>
                      <td>
                        <span className={`badge badge-${att.status}`}>{att.status.toUpperCase()}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {att.notes || 'Present in Lab'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: FINANCE & M-PESA */}
      {/* ========================================================================= */}
      {activeTab === 'finance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Toast Notice */}
          {receiptToast && (
            <div
              className="glass-card"
              style={{
                padding: '12px 18px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10B981',
                color: '#10B981',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>{receiptToast}</span>
            </div>
          )}

          {/* Header & Account Summary */}
          <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={20} color="var(--crema-gold)" />
                  <h2 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Tuition Financial Ledger & Bursar Portal
                  </h2>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Student: <strong>{profile?.full_name}</strong> • Reg: <strong style={{ color: 'var(--crema-gold)' }}>{profile?.reg_number || 'AUR/NBO/2026/001'}</strong> • {myCourse?.title} ({myBranch?.name})
                </p>
              </div>

              <div>
                {(myInvoice?.balance_due ?? 0) <= 0 ? (
                  <span className="badge badge-paid" style={{ fontSize: '0.8rem', padding: '5px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} /> Tuition 100% Cleared
                  </span>
                ) : (
                  <span
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#F87171',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      padding: '5px 14px',
                      borderRadius: 'var(--radius-full)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Clock size={14} /> Balance Due: KES {(Number(myInvoice?.balance_due) || 0).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Fee Balance Metric Grid */}
            <div className="bursar-metrics-grid">
              <div className="bursar-metric-cell">
                <div className="metric-label">Total Program Fee</div>
                <div className="metric-val" style={{ color: 'var(--text-primary)' }}>
                  KES {(Number(myInvoice?.total_fee) || Number(myCourse?.fee_amount) || 0).toLocaleString()}
                </div>
                <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>
                  Invoice #{myInvoice?.invoice_number || 'INV-001'}
                </div>
              </div>

              <div className="bursar-metric-cell">
                <div className="metric-label">Total Amount Paid</div>
                <div className="metric-val" style={{ color: '#10B981' }}>
                  KES {(Number(myInvoice?.amount_paid) || 0).toLocaleString()}
                </div>
                <div className="metric-sub" style={{ color: '#10B981', fontWeight: 600 }}>
                  {Math.min(100, Math.round(((Number(myInvoice?.amount_paid) || 0) / (Number(myInvoice?.total_fee) || 1)) * 100))}% Cleared
                </div>
              </div>

              <div className="bursar-metric-cell">
                <div className="metric-label">Balance Remaining</div>
                <div
                  className="metric-val"
                  style={{
                    color: (Number(myInvoice?.balance_due) || 0) > 0 ? 'var(--cherry-red)' : '#10B981',
                    fontWeight: 800,
                  }}
                >
                  KES {(Number(myInvoice?.balance_due) || 0).toLocaleString()}
                </div>
                <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>
                  {(myInvoice?.balance_due ?? 0) <= 0 ? 'Certified for Exam' : 'Due Before Final Exam'}
                </div>
              </div>

              <div className="bursar-metric-cell">
                <div className="metric-label">Financial Standing</div>
                <div
                  className="metric-val"
                  style={{
                    color: (myInvoice?.balance_due ?? 0) <= 0 ? '#10B981' : 'var(--crema-gold)',
                  }}
                >
                  {(myInvoice?.balance_due ?? 0) <= 0 ? 'Cleared' : 'Active Account'}
                </div>
                <div className="metric-sub" style={{ color: 'var(--text-muted)' }}>
                  {myPayments.length} Payment{myPayments.length === 1 ? '' : 's'} Logged
                </div>
              </div>
            </div>

            {/* Clearance Progress Bar */}
            <div style={{ marginBottom: '6px' }}>
              <div
                style={{
                  height: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, Math.round(((myInvoice?.amount_paid || 0) / (myInvoice?.total_fee || 1)) * 100))}%`,
                    background: (myInvoice?.balance_due ?? 0) <= 0
                      ? 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
                      : 'linear-gradient(90deg, #00A651 0%, #D49A5B 100%)',
                    borderRadius: '999px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Self-Service M-Pesa Payment Box (When balance is due) */}
          {(myInvoice?.balance_due ?? 0) > 0 && (
            <div
              className="glass-card"
              style={{
                padding: 'clamp(16px, 3vw, 24px)',
                border: '1.5px solid rgba(0, 166, 81, 0.4)',
                background: 'linear-gradient(135deg, rgba(0, 166, 81, 0.12) 0%, rgba(24, 19, 16, 0.8) 100%)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: '#00A651',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      Campus Fee Payment & M-Pesa Confirmation
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                      Paybill: <strong>{myBranch?.paybill_number || '174379'}</strong> • Account: <strong style={{ color: 'var(--crema-gold)' }}>{myBranch?.paybill_account_name || (myBranch?.code ? `AUREVIA-${myBranch.code}` : 'AUREVIA-HQ')}</strong> • {myBranch?.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-mpesa"
                  onClick={() => handleOpenPayment(myInvoice?.balance_due)}
                  style={{
                    padding: '11px 22px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(0, 166, 81, 0.35)',
                  }}
                >
                  <FileCheck size={18} />
                  <span>Pay & Paste M-Pesa SMS (KES {(Number(myInvoice?.balance_due) || 0).toLocaleString()})</span>
                </button>
              </div>

              {/* Installment Amount Quick Chips */}
              <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Or make a partial tuition installment:
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {myInvoice && myInvoice.balance_due >= 1000 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOpenPayment(1000)}
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      Pay KES 1,000
                    </button>
                  )}
                  {myInvoice && myInvoice.balance_due >= 5000 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOpenPayment(5000)}
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      Pay KES 5,000
                    </button>
                  )}
                  {myInvoice && myInvoice.balance_due >= 10000 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOpenPayment(Math.round(myInvoice.balance_due / 2))}
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      Pay 50% (KES {Math.round((Number(myInvoice.balance_due) || 0) / 2).toLocaleString()})
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleOpenPayment(myInvoice?.balance_due)}
                    style={{ padding: '6px 12px', fontSize: '0.78rem', color: '#4ADE80' }}
                  >
                    Custom / Full Amount
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Manual Paybill Information Card (M-Pesa Only) */}
          <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Smartphone size={18} color="#4ADE80" />
              <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                Campus M-Pesa Paybill Credentials
              </h3>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Pay via your Safaricom M-Pesa SIM menu using the campus credentials below. Then paste your confirmation SMS to have your tuition balance credited.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                gap: '12px',
              }}
            >
              {/* Paybill Card */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '14px',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Safaricom M-Pesa Paybill</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#4ADE80' }}>
                    {myBranch?.paybill_number || '174379'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleCopy(myBranch?.paybill_number || '174379', 'paybill')}
                    style={{ padding: '3px 8px', fontSize: '0.72rem', height: '26px' }}
                    title="Copy Paybill number"
                  >
                    {copiedKey === 'paybill' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                    <span>{copiedKey === 'paybill' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>Business Number</div>
              </div>

              {/* Account Number Card */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '14px',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Campus Account Name</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--crema-gold)' }}>
                    {myBranch?.paybill_account_name || (myBranch?.code ? `AUREVIA-${myBranch.code}` : 'AUREVIA-HQ')}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleCopy(myBranch?.paybill_account_name || (myBranch?.code ? `AUREVIA-${myBranch.code}` : 'AUREVIA-HQ'), 'account')}
                    style={{ padding: '3px 8px', fontSize: '0.72rem', height: '26px' }}
                    title="Copy Account Reference"
                  >
                    {copiedKey === 'account' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                    <span>{copiedKey === 'account' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>Use this exact campus account name</div>
              </div>
            </div>
          </div>


          {/* Payment Receipts History */}
          <div className="glass-card" style={{ padding: 'clamp(12px, 2vw, 18px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>
                  Audited Payment Receipts & Transactions
                </h3>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Real-time transaction receipts with instant PDF download and social sharing
                </p>
              </div>

              <span className="badge badge-paid" style={{ fontSize: '0.68rem' }}>
                {myPayments.length} Verified Receipts
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '8px' }}>
              {myPayments.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '24px 16px',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    gridColumn: '1 / -1',
                  }}
                >
                  <Receipt size={28} color="var(--text-muted)" style={{ margin: '0 auto 6px auto' }} />
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                    No payment transactions logged yet for your student record.
                  </p>
                  <button
                    type="button"
                    className="btn btn-mpesa"
                    onClick={() => handleOpenPayment(myInvoice?.balance_due)}
                    style={{ marginTop: '10px', padding: '6px 14px', fontSize: '0.78rem' }}
                  >
                    <Smartphone size={14} />
                    <span>Make First Fee Installment</span>
                  </button>
                </div>
              ) : (
                myPayments.map((pay) => (
                  <div
                    key={pay.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10B981', fontSize: '0.92rem' }}>
                          {pay.mpesa_receipt_number || 'REC-' + pay.id.slice(0, 6)}
                        </span>
                        {pay.status === 'pending_verification' ? (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#FBBF24',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Clock size={11} />
                            Bursar Verification Pending
                          </span>
                        ) : pay.status === 'rejected' ? (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#F87171',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              fontWeight: 700,
                            }}
                          >
                            Verification Rejected
                          </span>
                        ) : (
                          <span className="badge badge-paid" style={{ fontSize: '0.65rem' }}>
                            Audited & Verified
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        {new Date(pay.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • Channel: <strong>{pay.payment_method.toUpperCase()}</strong> {pay.mpesa_phone_number && `(${pay.mpesa_phone_number})`} {pay.status === 'pending_verification' && '• Queued for campus verification'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem', marginRight: '6px' }}>
                        KES {(Number(pay.amount) || 0).toLocaleString()}
                      </span>

                      {/* Download PDF Receipt */}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '0.74rem', height: '28px', gap: '5px' }}
                        onClick={() => handleDownloadReceipt(pay)}
                        title="Download PDF Receipt"
                      >
                        <Download size={13} />
                        <span>PDF</span>
                      </button>

                      {/* Share on WhatsApp */}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '0.74rem', height: '28px', gap: '5px', color: '#25D366' }}
                        onClick={() => handleShareReceiptWhatsApp(pay)}
                        title="Share official receipt to parent / sponsor via WhatsApp"
                      >
                        <Share2 size={13} />
                        <span>WhatsApp</span>
                      </button>

                      {/* Resend Email Receipt */}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={resendingEmailId === pay.id}
                        style={{ padding: '5px 10px', fontSize: '0.74rem', height: '28px', gap: '5px' }}
                        onClick={() => handleResendReceiptEmail(pay)}
                        title="Send copy to your registered email address"
                      >
                        {resendingEmailId === pay.id ? <RefreshCw size={13} className="spin" /> : <Mail size={13} />}
                        <span>Email</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: MY PROFILE & KYC UPLOADS */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Card */}
          <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ minWidth: '240px', flex: '1 1 auto' }}>
                <h2 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                  {isEditingProfile ? 'Edit Trainee Contact & KYC Uploads' : 'Trainee Profile & KYC Dossier'}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  {isEditingProfile
                    ? 'Update your mobile contact phone, emergency contacts, login password, and upload verified ID scans.'
                    : 'Official student registration records, emergency contacts, verified identification cards, and portal credentials.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span className="badge badge-approved" style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
                  <ShieldCheck size={13} /> KYC Verified
                </span>
                <span className="badge badge-gold" style={{ fontSize: '0.72rem', padding: '4px 10px', fontFamily: 'var(--font-mono)' }}>
                  {profile.reg_number || 'AUR/NBO/2026/001'}
                </span>

                {!isEditingProfile ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="btn btn-primary"
                    style={{
                      padding: '7px 16px',
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Edit3 size={14} />
                    <span>Edit Profile & KYC</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="btn btn-secondary"
                    style={{
                      padding: '7px 14px',
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <X size={14} />
                    <span>Cancel</span>
                  </button>
                )}
              </div>
            </div>

            {saveMessage && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10B981',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{saveMessage}</span>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* MODE 1: READ-ONLY VIEW (DEFAULT) */}
          {/* ========================================================================= */}
          {!isEditingProfile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 1. Verified Institutional Records (Admin & Branch Manager Protected) */}
              <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={18} color="var(--crema-gold)" />
                    <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                      1. Verified Institutional & Academic Records
                    </h3>
                  </div>
                  <span
                    style={{
                      background: 'rgba(212, 154, 91, 0.12)',
                      border: '1px solid rgba(212, 154, 91, 0.3)',
                      color: 'var(--crema-gold)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-full)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Lock size={11} /> Admin & Branch Manager Protected
                  </span>
                </div>

                {/* Institutional lock notice */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(212, 154, 91, 0.06)',
                    border: '1px solid rgba(212, 154, 91, 0.2)',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '18px',
                    lineHeight: 1.5,
                  }}
                >
                  🔒 <strong>Permanent Accreditation Records:</strong> Legal name, registration index, and national ID are verified upon enrollment to maintain official certificate authenticity. If you require a correction, please consult your Branch Manager with certified documentation.
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                    gap: '14px',
                  }}
                >
                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Full Legal Name</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{profile.full_name}</strong>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Student Registration ID</span>
                    <strong style={{ fontSize: '0.95rem', fontFamily: 'var(--font-mono)', color: 'var(--crema-gold)', wordBreak: 'break-word' }}>
                      {profile.reg_number || 'AUR/NBO/2026/001'}
                    </strong>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>National ID / Passport Number</span>
                    <strong style={{ fontSize: '0.95rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                      {student?.national_id_or_passport || profile?.national_id || '31234567'}
                    </strong>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Enrolled Course Program</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{myCourse?.title || 'Barista Skills Foundation & Latte Art'}</strong>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Campus / Academy Branch</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{myBranch?.name || 'Aurevia Coffee Institute'}</strong>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Date of Birth</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {student?.dob ? new Date(student.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '14 May 2001'}
                    </strong>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Gender</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{student?.gender || 'Female'}</strong>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nationality</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{student?.nationality || 'Kenyan'}</strong>
                  </div>
                </div>
              </div>

              {/* 2. Contact Information & Emergency Contacts */}
              <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <Phone size={18} color="var(--crema-gold)" />
                  <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                    2. Contact & Emergency Details
                  </h3>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                    gap: '14px',
                  }}
                >
                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Primary Mobile Phone (Roll-Call SMS & M-Pesa)
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--crema-gold)', wordBreak: 'break-word' }}>
                      {profile?.phone || student?.emergency_contact_phone || '+254 712 345 678'}
                    </strong>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Specialty Coffee Experience Level
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                      {student?.coffee_experience_level || 'Barista Apprentice'}
                    </strong>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Emergency Contact Name
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                      {student?.emergency_contact_name || 'Salim Omar'}
                    </strong>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Emergency Contact Phone
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                      {student?.emergency_contact_phone || '+254 733 999 888'}
                    </strong>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Emergency Relationship
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {student?.emergency_contact_relationship || 'Parent'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 3. Portal Security & Login Credentials */}
              <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <Key size={18} color="var(--crema-gold)" />
                  <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                    3. Portal Access & Security
                  </h3>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                    gap: '14px',
                  }}
                >
                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Portal Login Email Address
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                      {profile?.email || 'student@aureviacoffee.com'}
                    </strong>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Account Password & Access PIN
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.95rem', letterSpacing: '2px', color: 'var(--text-muted)' }}>••••••••••••</strong>
                      <span className="badge badge-approved" style={{ fontSize: '0.65rem' }}>Active & Protected</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Verified Identification & Photo ID Scans */}
              <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Camera size={18} color="var(--crema-gold)" />
                  <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                    4. Verified Identification & Photo ID Scans
                  </h3>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 18px 0' }}>
                  Official color copies of your government identification card / passport and personal trainee passport portrait.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                    gap: '16px',
                  }}
                >
                  {/* National ID Front */}
                  <div
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          National ID / Passport (Front)
                        </span>
                        {idDocUrl ? (
                          <span className="badge badge-approved" style={{ fontSize: '0.65rem' }}>
                            <Check size={10} /> Verified Scan
                          </span>
                        ) : (
                          <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>
                            Missing
                          </span>
                        )}
                      </div>

                      {idDocUrl ? (
                        <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: '140px', background: '#000', marginBottom: '12px' }}>
                          <img
                            src={idDocUrl}
                            alt="ID Front"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                            onClick={() => setPreviewImage({ url: idDocUrl, title: 'National ID / Passport (Front)' })}
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: idDocUrl, title: 'National ID / Passport (Front)' })}
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              background: 'rgba(0,0,0,0.7)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: 'var(--radius-sm)',
                              padding: '4px 8px',
                              fontSize: '0.7rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={12} /> View Full
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            height: '140px',
                            border: '2px dashed var(--border-medium)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: 'var(--text-muted)',
                            marginBottom: '12px',
                            padding: '12px',
                            textAlign: 'center',
                          }}
                        >
                          <CreditCard size={24} color="var(--crema-gold)" />
                          <span style={{ fontSize: '0.78rem' }}>No ID Front scan uploaded yet</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* National ID Back */}
                  <div
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          National ID Card (Back)
                        </span>
                        {idBackUrl ? (
                          <span className="badge badge-approved" style={{ fontSize: '0.65rem' }}>
                            <Check size={10} /> Verified Scan
                          </span>
                        ) : (
                          <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>
                            Optional
                          </span>
                        )}
                      </div>

                      {idBackUrl ? (
                        <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: '140px', background: '#000', marginBottom: '12px' }}>
                          <img
                            src={idBackUrl}
                            alt="ID Back"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                            onClick={() => setPreviewImage({ url: idBackUrl, title: 'National ID Card (Back)' })}
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: idBackUrl, title: 'National ID Card (Back)' })}
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              background: 'rgba(0,0,0,0.7)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: 'var(--radius-sm)',
                              padding: '4px 8px',
                              fontSize: '0.7rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={12} /> View Full
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            height: '140px',
                            border: '2px dashed var(--border-medium)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: 'var(--text-muted)',
                            marginBottom: '12px',
                            padding: '12px',
                            textAlign: 'center',
                          }}
                        >
                          <CreditCard size={24} color="var(--crema-gold)" />
                          <span style={{ fontSize: '0.78rem' }}>No ID Back scan uploaded</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Student Passport Photo */}
                  <div
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Student Passport Photo
                        </span>
                        {avatarUrl ? (
                          <span className="badge badge-approved" style={{ fontSize: '0.65rem' }}>
                            <Check size={10} /> Active Avatar
                          </span>
                        ) : (
                          <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                            Institutional ID
                          </span>
                        )}
                      </div>

                      {avatarUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px', marginBottom: '12px' }}>
                          <img
                            src={avatarUrl}
                            alt="Student Avatar"
                            style={{
                              width: '110px',
                              height: '110px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '3px solid var(--crema-gold)',
                              boxShadow: 'var(--shadow-gold)',
                              cursor: 'pointer',
                            }}
                            onClick={() => setPreviewImage({ url: avatarUrl, title: 'Student Passport Photo' })}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            height: '140px',
                            border: '2px dashed var(--border-medium)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: 'var(--text-muted)',
                            marginBottom: '12px',
                            padding: '12px',
                            textAlign: 'center',
                          }}
                        >
                          <Camera size={26} color="var(--crema-gold)" />
                          <span style={{ fontSize: '0.78rem' }}>Default Academy avatar active</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* MODE 2: INTERACTIVE EDIT FORM */
            /* ========================================================================= */
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Section 1: Verified Institutional & Academic Records (LOCKED) */}
              <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={18} color="var(--crema-gold)" />
                    <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                      1. Verified Institutional Records (Locked)
                    </h3>
                  </div>
                  <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                    <Lock size={11} /> Admin & Branch Manager Protected
                  </span>
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(212, 154, 91, 0.08)',
                    border: '1px solid rgba(212, 154, 91, 0.25)',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '18px',
                    lineHeight: 1.5,
                  }}
                >
                  🔒 <strong>Institutional Policy Notice:</strong> To prevent certificate and exam discrepancies, trainees are not permitted to edit legal names, registration numbers, or national ID numbers directly. Please contact your <strong>Branch Manager</strong> to submit certified identification for any administrative corrections.
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
                    gap: '16px',
                  }}
                >
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                      <Lock size={12} color="var(--crema-gold)" /> Full Legal Name (Locked)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={profile.full_name}
                      disabled
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '0.85rem',
                        background: 'rgba(0, 0, 0, 0.25)',
                        color: 'var(--text-muted)',
                        cursor: 'not-allowed',
                        border: '1px solid var(--border-subtle)',
                      }}
                    />
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Official name printed on SCA diplomas and government registries.
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                      <Lock size={12} color="var(--crema-gold)" /> Student Registration Number (Locked)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={profile.reg_number || 'AUR/NBO/2026/001'}
                      disabled
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '0.85rem',
                        background: 'rgba(0, 0, 0, 0.25)',
                        color: 'var(--crema-gold)',
                        cursor: 'not-allowed',
                        border: '1px solid var(--border-subtle)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Permanent student index assigned by Aurevia Admissions.
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                      <Lock size={12} color="var(--crema-gold)" /> National ID / Passport (Locked)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={student?.national_id_or_passport || profile?.national_id || '31234567'}
                      disabled
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '0.85rem',
                        background: 'rgba(0, 0, 0, 0.25)',
                        color: 'var(--text-muted)',
                        cursor: 'not-allowed',
                        border: '1px solid var(--border-subtle)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Verified government identification. Contact admin to amend.
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                      <Lock size={12} color="var(--crema-gold)" /> Date of Birth & Gender (Locked)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={`${student?.dob || '2001-05-14'} • ${student?.gender || 'Female'}`}
                      disabled
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '0.85rem',
                        background: 'rgba(0, 0, 0, 0.25)',
                        color: 'var(--text-muted)',
                        cursor: 'not-allowed',
                        border: '1px solid var(--border-subtle)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Contact Information & Emergency Contacts (EDITABLE) */}
              <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <Phone size={18} color="var(--crema-gold)" />
                  <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                    2. Contact & Emergency Information (Self-Service)
                  </h3>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                    gap: '16px',
                  }}
                >
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Mobile Phone Number (SMS Roll-Call & M-Pesa)
                    </label>
                    <input
                      type="tel"
                      className="input-field"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+254 712 345 678"
                      required
                      style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
                    />
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Used for daily roll-call SMS alerts and tuition M-Pesa notifications.
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Specialty Coffee Experience Level
                    </label>
                    <select
                      className="select-field"
                      value={formData.coffeeExperience}
                      onChange={(e) => setFormData({ ...formData, coffeeExperience: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
                    >
                      <option value="Beginner / Home Enthusiast">Beginner / Home Enthusiast</option>
                      <option value="Barista Apprentice">Barista Apprentice</option>
                      <option value="Cafe Waitstaff">Cafe Waitstaff</option>
                      <option value="Intermediate Barista (1-2 yrs)">Intermediate Barista (1-2 yrs)</option>
                      <option value="Professional Barista / Head Barista">Professional Barista / Head Barista</option>
                      <option value="Roastery Assistant / Q-Grader Student">Roastery Assistant / Q-Grader Student</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Emergency Contact Full Name
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.emergencyName}
                      onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                      placeholder="e.g. Salim Omar"
                      required
                      style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Emergency Contact Phone Number
                    </label>
                    <input
                      type="tel"
                      className="input-field"
                      value={formData.emergencyPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                      placeholder="+254 733 999 888"
                      required
                      style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Emergency Relationship
                    </label>
                    <select
                      className="select-field"
                      value={formData.emergencyRelationship}
                      onChange={(e) => setFormData({ ...formData, emergencyRelationship: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
                    >
                      <option value="Parent">Parent</option>
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Sister">Sister</option>
                      <option value="Brother">Brother</option>
                      <option value="Employer / Sponsor">Employer / Sponsor</option>
                      <option value="Friend">Friend</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Portal Login Credentials & Password (EDITABLE) */}
              <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <Key size={18} color="var(--crema-gold)" />
                  <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                    3. Portal Login Credentials & Access PIN
                  </h3>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                    gap: '16px',
                  }}
                >
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Portal Login Email Address
                    </label>
                    <input
                      type="email"
                      className="input-field"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
                    />
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Used to sign in to the student portal and receive term schedules.
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        New Account Password / PIN
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ background: 'none', border: 'none', color: 'var(--crema-gold)', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span>{showPassword ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      placeholder="Leave blank to keep current password"
                      style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
                    />
                  </div>

                  {formData.newPassword && (
                    <div>
                      <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                        Confirm New Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="input-field"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="Re-enter new password"
                        required={!!formData.newPassword}
                        style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: National ID & Document Uploads (EDITABLE) */}
              <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Camera size={18} color="var(--crema-gold)" />
                  <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                    4. National Identification & Photo ID Uploads
                  </h3>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 18px 0' }}>
                  Upload high-clarity color scans or smartphone photos of your official national identity card / passport and personal passport photo. Maximum 5MB per image.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                    gap: '16px',
                  }}
                >
                  {/* 1. National ID Front */}
                  <div
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          National ID / Passport (Front)
                        </span>
                        {idDocUrl ? (
                          <span className="badge badge-approved" style={{ fontSize: '0.65rem' }}>
                            <Check size={10} /> Uploaded
                          </span>
                        ) : (
                          <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>
                            Required
                          </span>
                        )}
                      </div>

                      {idDocUrl ? (
                        <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: '140px', background: '#000', marginBottom: '12px' }}>
                          <img
                            src={idDocUrl}
                            alt="ID Front"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                            onClick={() => setPreviewImage({ url: idDocUrl, title: 'National ID / Passport (Front)' })}
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: idDocUrl, title: 'National ID / Passport (Front)' })}
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              background: 'rgba(0,0,0,0.7)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: 'var(--radius-sm)',
                              padding: '4px 8px',
                              fontSize: '0.7rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={12} /> View Full
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            height: '140px',
                            border: '2px dashed var(--border-medium)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: 'var(--text-muted)',
                            marginBottom: '12px',
                            padding: '12px',
                            textAlign: 'center',
                          }}
                        >
                          <Upload size={24} color="var(--crema-gold)" />
                          <span style={{ fontSize: '0.78rem' }}>Click or drop photo of ID Front</span>
                          <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>PNG, JPG or WebP</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <label className="btn btn-secondary" style={{ flex: 1, padding: '7px 10px', fontSize: '0.76rem', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Upload size={13} />
                        <span>{idDocUrl ? 'Replace Front' : 'Upload Front'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleImageUpload(e, 'id_front')}
                        />
                      </label>

                      {idDocUrl && (
                        <button
                          type="button"
                          onClick={() => setIdDocUrl('')}
                          className="btn btn-danger"
                          style={{ padding: '7px 10px', fontSize: '0.76rem' }}
                          title="Remove uploaded ID front"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. National ID Back */}
                  <div
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          National ID Card (Back)
                        </span>
                        {idBackUrl ? (
                          <span className="badge badge-approved" style={{ fontSize: '0.65rem' }}>
                            <Check size={10} /> Uploaded
                          </span>
                        ) : (
                          <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>
                            Optional
                          </span>
                        )}
                      </div>

                      {idBackUrl ? (
                        <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: '140px', background: '#000', marginBottom: '12px' }}>
                          <img
                            src={idBackUrl}
                            alt="ID Back"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                            onClick={() => setPreviewImage({ url: idBackUrl, title: 'National ID Card (Back)' })}
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: idBackUrl, title: 'National ID Card (Back)' })}
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              background: 'rgba(0,0,0,0.7)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: 'var(--radius-sm)',
                              padding: '4px 8px',
                              fontSize: '0.7rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={12} /> View Full
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            height: '140px',
                            border: '2px dashed var(--border-medium)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: 'var(--text-muted)',
                            marginBottom: '12px',
                            padding: '12px',
                            textAlign: 'center',
                          }}
                        >
                          <Upload size={24} color="var(--crema-gold)" />
                          <span style={{ fontSize: '0.78rem' }}>Click or drop photo of ID Back</span>
                          <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>Barcode & issue details</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <label className="btn btn-secondary" style={{ flex: 1, padding: '7px 10px', fontSize: '0.76rem', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Upload size={13} />
                        <span>{idBackUrl ? 'Replace Back' : 'Upload Back'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleImageUpload(e, 'id_back')}
                        />
                      </label>

                      {idBackUrl && (
                        <button
                          type="button"
                          onClick={() => setIdBackUrl('')}
                          className="btn btn-danger"
                          style={{ padding: '7px 10px', fontSize: '0.76rem' }}
                          title="Remove uploaded ID back"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3. Trainee Passport Photo */}
                  <div
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Student Passport Photo (Avatar)
                        </span>
                        {avatarUrl ? (
                          <span className="badge badge-approved" style={{ fontSize: '0.65rem' }}>
                            <Check size={10} /> Active Avatar
                          </span>
                        ) : (
                          <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                            Institutional ID
                          </span>
                        )}
                      </div>

                      {avatarUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px', marginBottom: '12px' }}>
                          <img
                            src={avatarUrl}
                            alt="Student Avatar"
                            style={{
                              width: '110px',
                              height: '110px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '3px solid var(--crema-gold)',
                              boxShadow: 'var(--shadow-gold)',
                              cursor: 'pointer',
                            }}
                            onClick={() => setPreviewImage({ url: avatarUrl, title: 'Student Passport Photo' })}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            height: '140px',
                            border: '2px dashed var(--border-medium)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: 'var(--text-muted)',
                            marginBottom: '12px',
                            padding: '12px',
                            textAlign: 'center',
                          }}
                        >
                          <Camera size={26} color="var(--crema-gold)" />
                          <span style={{ fontSize: '0.78rem' }}>Upload Personal Passport Photo</span>
                          <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>Displays on student profile & pass</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <label className="btn btn-secondary" style={{ flex: 1, padding: '7px 10px', fontSize: '0.76rem', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Camera size={13} />
                        <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleImageUpload(e, 'avatar')}
                        />
                      </label>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="btn btn-danger"
                          style={{ padding: '7px 10px', fontSize: '0.76rem' }}
                          title="Remove passport photo"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Save & Cancel Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn btn-secondary"
                  style={{ padding: '10px 20px', fontSize: '0.88rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                  style={{ padding: '10px 24px', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  {isSaving ? <RefreshCw size={16} className="spin" /> : <CheckCircle2 size={16} />}
                  <span>{isSaving ? 'Saving Changes...' : 'Save Updated Profile & KYC Dossier'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: AGREEMENTS, CONSENTS & CODE OF CONDUCT */}
      {/* ========================================================================= */}
      {activeTab === 'agreements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Card */}
          <div className="glass-card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ minWidth: '240px', flex: '1 1 auto' }}>
                <h2 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                  Institutional Terms, Consents & Code of Conduct
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Official training guidelines, laboratory hygiene mandates, and authorized photo/video media release policies.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDownloadAgreementPDF}
                  style={{ padding: '7px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  title="Download signed Aurevia institutional agreement letter as PDF"
                >
                  <FileDown size={14} />
                  <span>Download Agreement PDF</span>
                </button>

                <span
                  style={{
                    background: termsAccepted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    border: `1px solid ${termsAccepted ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    color: termsAccepted ? '#10B981' : '#F59E0B',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {termsAccepted ? <Check size={14} /> : <AlertCircle size={14} />}
                  <span>{termsAccepted ? 'Digitally Signed & Bound' : 'Signature Pending'}</span>
                </span>
              </div>
            </div>

            {saveMessage && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10B981',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{saveMessage}</span>
              </div>
            )}
          </div>

          {/* Policy Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Policy 1: Academic Attendance */}
            <div className="glass-card" style={{ padding: 'clamp(14px, 2.5vw, 22px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(212, 154, 91, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--crema-gold)', flexShrink: 0 }}>
                    <BookOpen size={16} />
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                    1. Academic Code of Conduct & 80% Attendance Mandate
                  </h3>
                </div>
                <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                  SCA Academic Rule
                </span>
              </div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Aurevia Specialty Coffee Academy operates under strict international SCA standards. Trainees must maintain a <strong>minimum attendance threshold of 80%</strong> across all physical barista practical lab sessions and virtual theory webinars. Missed roll-calls without prior written authorization from the Campus Director forfeit eligibility for the final practical examination and official certificate issuance.
              </p>
            </div>

            {/* Policy 2: Lab Safety & Hygiene */}
            <div className="glass-card" style={{ padding: 'clamp(14px, 2.5vw, 22px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(212, 154, 91, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--crema-gold)', flexShrink: 0 }}>
                    <Coffee size={16} />
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                    2. Commercial Espresso Lab Safety & Sanitation Standards
                  </h3>
                </div>
                <span className="badge badge-paid" style={{ fontSize: '0.7rem' }}>
                  Food & Equipment Hygiene
                </span>
              </div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Trainees operate pressurized commercial espresso machinery (La Marzocco Linea PB), industrial burr grinders (Mahlkönig), and steam wands producing vapor at temperatures exceeding 130°C. Trainees agree to wear closed-toe shoes, adhere to strict backflushing and milk steam wand purging protocols, and observe food hygiene practices throughout all practical shifts.
              </p>
            </div>

            {/* Policy 3: Photo & Media Consent (Interactive Toggle) */}
            <div
              className="glass-card"
              style={{
                padding: 'clamp(14px, 2.5vw, 22px)',
                background: mediaConsent
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, var(--bg-surface) 100%)'
                  : 'var(--bg-surface)',
                border: mediaConsent ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-medium)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px', flex: '1 1 auto' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(212, 154, 91, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--crema-gold)', flexShrink: 0 }}>
                    <Camera size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                      3. Photography, Video & Social Media Release Consent
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Authorizes professional media documentation during barista training & competitions
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMediaConsent(!mediaConsent)}
                  style={{
                    background: mediaConsent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${mediaConsent ? '#10B981' : '#EF4444'}`,
                    color: mediaConsent ? '#10B981' : '#EF4444',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {mediaConsent ? <Check size={14} /> : <X size={14} />}
                  <span>{mediaConsent ? 'MEDIA CONSENT GRANTED' : 'MEDIA CONSENT DECLINED'}</span>
                </button>
              </div>

              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 14px 0' }}>
                Aurevia Coffee Academy regularly captures high-resolution photography and video footage during practical extraction labs, sensory cupping workshops, and latte art competitions. These materials are used for educational reviews, alumni portfolio promotion, and institutional social media (Instagram, LinkedIn, YouTube).
              </p>

              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Info size={16} color="var(--crema-gold)" style={{ flexShrink: 0 }} />
                <span>
                  {mediaConsent
                    ? 'You have granted permission for your training photos & latte art showcase videos to be featured in Aurevia promotional media.'
                    : 'You have opted out of promotional photography. Academy instructors will refrain from tagging your likeness in public outreach.'}
                </span>
              </div>
            </div>

            {/* Policy 4: Data Protection */}
            <div className="glass-card" style={{ padding: 'clamp(14px, 2.5vw, 22px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(212, 154, 91, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--crema-gold)', flexShrink: 0 }}>
                    <Shield size={16} />
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                    4. Student Privacy & Kenyan Data Protection Act (2019)
                  </h3>
                </div>
                <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>
                  DPA 2019 Compliant
                </span>
              </div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                In compliance with the Kenya Data Protection Act (2019), Aurevia Institute of Coffee ensures that all student personal data, national identity cards, passport copies, emergency contacts, and academic marksheets are encrypted, stored securely, and used strictly for academic certification and institutional accreditation.
              </p>
            </div>

            {/* Digital Agreement Confirmation Card */}
            <div
              className="glass-card"
              style={{
                padding: 'clamp(16px, 3vw, 24px)',
                background: 'linear-gradient(135deg, rgba(212, 154, 91, 0.08) 0%, var(--bg-surface-elevated) 100%)',
                border: '1px solid var(--border-medium)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '18px' }}>
                <input
                  type="checkbox"
                  id="termsAgreementCheckbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--crema-gold)', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }}
                />
                <label htmlFor="termsAgreementCheckbox" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', lineHeight: 1.5 }}>
                  I confirm that I have read, understood, and solemnly accept the Aurevia Specialty Coffee Academy Enrollment Agreement, 80% Attendance Requirement, Espresso Laboratory Code of Conduct, and Data Protection terms.
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: '220px', flex: '1 1 auto' }}>
                  Signed electronically by <strong>{formData.fullName || profile.full_name}</strong> •{' '}
                  {termsAcceptedAt
                    ? new Date(termsAcceptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Pending signature'}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleDownloadAgreementPDF}
                    style={{ padding: '9px 16px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <FileDown size={14} />
                    <span>Download Agreement PDF</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveConsents}
                    disabled={isSaving}
                    style={{ padding: '9px 20px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isSaving ? <RefreshCw size={14} className="spin" /> : <CheckCircle2 size={14} />}
                    <span>{isSaving ? 'Saving Consents...' : 'Save Consent Preferences'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-size ID Image Preview Modal */}
      {previewImage && (
        <div
          className="modal-overlay"
          onClick={() => setPreviewImage(null)}
          style={{ zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', width: '100%', padding: 'clamp(14px, 3vw, 20px)', background: 'var(--bg-surface)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>{previewImage.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', maxHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
              <img
                src={previewImage.url}
                alt={previewImage.title}
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Live Toast Notice */}
      {liveToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(16, 185, 129, 0.95)',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '999px',
            fontSize: '0.86rem',
            fontWeight: 700,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{liveToast}</span>
        </div>
      )}

      {/* M-Pesa Modal */}
      {showPaymentModal && myInvoice && (
        <MpesaPaymentModal
          invoice={myInvoice}
          presetAmount={paymentPresetAmount}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentPresetAmount(undefined);
          }}
          onSuccess={() => {
            setReceiptToast('Payment successful! Your ledger balance and official receipt have been updated.');
            setTimeout(() => setReceiptToast(null), 6000);
          }}
        />
      )}

      {/* Virtual Classroom Studio Modal */}
      {activeVirtualSession && (
        <VirtualClassroomModal
          session={activeVirtualSession}
          onClose={() => setActiveVirtualSession(null)}
        />
      )}
    </div>
  );
};
