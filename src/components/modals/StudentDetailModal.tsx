import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { StudentKYC } from '../../types/database.types';
import {
  ArrowLeft, X, ShieldCheck, Coffee, Calendar, Clock, Phone, Mail, Award,
  DollarSign, Download, CheckCircle2, Video, UserCheck,
  Edit, Trash2, Heart, User, AlertTriangle,
  Copy, Check, MapPin, MessageSquare, Share2, Tag, Percent, Save
} from 'lucide-react';
import { generatePaymentReceiptPDF, generateCertificatePDF } from '../../lib/pdf';
import { shareReceiptOnWhatsApp, shareReceiptViaEmail } from '../../lib/shareUtils';
import { EditStudentModal } from './EditStudentModal';

interface StudentDetailModalProps {
  student: StudentKYC;
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, onClose }) => {
  const {
    profiles,
    branches,
    courses,
    cohorts,
    enrollments,
    invoices,
    payments,
    assessments,
    attendance,
    deleteStudent,
    graduateStudent,
    updateInvoiceFeeAndDiscount,
  } = useApp();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedReg, setCopiedReg] = useState(false);

  // Fee Adjustment & Discount modal states
  const [showFeeAdjustmentModal, setShowFeeAdjustmentModal] = useState(false);
  const [editDiscountType, setEditDiscountType] = useState<'none' | 'percentage' | 'fixed' | 'custom'>('none');
  const [editDiscountValue, setEditDiscountValue] = useState<number | ''>('');
  const [editDiscountReason, setEditDiscountReason] = useState('Early Bird Intake');
  const [editCustomTotalFee, setEditCustomTotalFee] = useState<number | ''>('');
  const [editDiscountNote, setEditDiscountNote] = useState('');
  const [isSavingFeeAdjustment, setIsSavingFeeAdjustment] = useState(false);
  const [feeAdjustError, setFeeAdjustError] = useState<string | null>(null);

  // Find linked entities with safe defaults
  const profile = profiles.find((p) => p.id === student?.profile_id) || student?.profile || {
    id: student?.profile_id || 'unknown',
    role: 'student' as const,
    full_name: 'Trainee',
    email: 'student@aurevia.ac.ke',
    phone: 'N/A',
    reg_number: 'AUR/NBO/2026/001',
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const branch = branches.find((b) => b.id === student?.branch_id) || branches[0] || {
    id: 'b-default',
    code: 'NBO',
    name: 'Aurevia Nairobi Roastery & Academy',
    address: 'Spring Valley Coffee Hub, Westlands',
    city: 'Nairobi',
    country: 'Kenya',
    phone: '+254 711 234 567',
    email: 'nairobi@aurevia.ac.ke',
    is_active: true,
    created_at: '',
  };

  const enrollment = enrollments.find((e) => e.student_id === student?.id) || enrollments[0];
  const cohort = cohorts.find((c) => c.id === enrollment?.cohort_id) || cohorts[0];
  const course = courses.find((c) => c.id === cohort?.course_id) || courses[0];
  const invoice = invoices.find((i) => i.student_id === student?.id);
  const studentPayments = payments.filter((p) => p.student_id === student?.id || (invoice && p.invoice_id === invoice.id));
  const studentAssessments = assessments.filter((a) => a.student_id === student?.id);
  const studentAttendance = attendance.filter((a) => a.student_id === student?.id);

  // Dynamic live calculations from transaction log
  const totalFee = invoice?.total_fee ?? course?.fee_amount ?? 35000;
  const totalPaidAmount = studentPayments.length > 0
    ? studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : (invoice?.amount_paid ?? 35000);
  const balanceDue = invoice?.balance_due !== undefined
    ? invoice.balance_due
    : Math.max(0, totalFee - totalPaidAmount);
  const feeStatus = balanceDue === 0 ? 'paid' : totalPaidAmount > 0 ? 'partial' : 'unpaid';

  // Formatted Dates
  const admissionDate = enrollment?.enrolled_at
    ? new Date(enrollment.enrolled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '20 Aug 2026';

  const completionDate = cohort?.end_date
    ? new Date(cohort.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '08 Sep 2026';

  // Attendance stats
  const presentCount = studentAttendance.filter((a) => a.status === 'present').length;
  const totalSessions = studentAttendance.length || 1;
  const attendancePercent = Math.round((presentCount / totalSessions) * 100);

  const initialLetter = (profile?.full_name || 'T').charAt(0).toUpperCase();

  const handleCopyReg = () => {
    if (profile?.reg_number) {
      navigator.clipboard.writeText(profile.reg_number);
      setCopiedReg(true);
      setTimeout(() => setCopiedReg(false), 2000);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteStudent(student.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      alert('Error deleting trainee: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const initFeeAdjustmentModal = () => {
    const standardBase = Number(course?.fee_amount) || Number(invoice?.standard_fee) || Number(invoice?.total_fee) || 35000;
    if (invoice?.discount_amount && invoice.discount_amount > 0) {
      setEditDiscountType(invoice.discount_type || 'fixed');
      setEditDiscountValue(invoice.discount_type === 'percentage'
        ? Math.round((invoice.discount_amount / standardBase) * 100)
        : invoice.discount_amount
      );
      setEditDiscountReason(invoice.discount_reason || 'Special Bursar Approval');
      setEditDiscountNote(invoice.discount_note || '');
      setEditCustomTotalFee(invoice.total_fee);
    } else {
      setEditDiscountType('none');
      setEditDiscountValue('');
      setEditDiscountReason('Early Bird Intake');
      setEditDiscountNote('');
      setEditCustomTotalFee(invoice?.total_fee || standardBase);
    }
    setFeeAdjustError(null);
  };

  const handleSaveFeeAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice?.id) {
      alert('Invoice record not found for this trainee.');
      return;
    }

    setIsSavingFeeAdjustment(true);
    setFeeAdjustError(null);

    const standardBase = Number(course?.fee_amount) || Number(invoice?.standard_fee) || Number(invoice?.total_fee) || 35000;
    let computedDiscount = 0;
    let finalFee = standardBase;

    if (editDiscountType === 'percentage' && editDiscountValue !== '') {
      const pct = Math.min(100, Math.max(0, Number(editDiscountValue)));
      computedDiscount = Math.round((standardBase * pct) / 100);
      finalFee = Math.max(0, standardBase - computedDiscount);
    } else if (editDiscountType === 'fixed' && editDiscountValue !== '') {
      computedDiscount = Math.min(standardBase, Math.max(0, Number(editDiscountValue)));
      finalFee = Math.max(0, standardBase - computedDiscount);
    } else if (editDiscountType === 'custom' && editCustomTotalFee !== '') {
      finalFee = Math.max(0, Number(editCustomTotalFee));
      computedDiscount = Math.max(0, standardBase - finalFee);
    }

    try {
      await updateInvoiceFeeAndDiscount(invoice.id, {
        totalFee: finalFee,
        standardFee: standardBase,
        discountAmount: computedDiscount,
        discountType: editDiscountType !== 'none' ? editDiscountType : undefined,
        discountReason: computedDiscount > 0 ? editDiscountReason : undefined,
        discountNote: editDiscountNote.trim() || undefined,
      });
      setShowFeeAdjustmentModal(false);
    } catch (err: any) {
      setFeeAdjustError(err?.message || 'Failed to update tuition fee adjustment');
    } finally {
      setIsSavingFeeAdjustment(false);
    }
  };

  return (
    <>
      {/* FULL SCREEN DOSSIER PAGE CONTAINER */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1050,
          backgroundColor: 'var(--bg-app)',
          overflowY: 'auto',
          color: 'var(--text-primary)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* TOP INSTITUTIONAL NAVIGATION BAR */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: 'var(--bg-header)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={onClose}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                fontSize: '0.78rem',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Directory</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>Trainees</span>
              <span>/</span>
              <span style={{ color: 'var(--crema-gold)', fontWeight: 600 }}>{profile.full_name}</span>
              <span>/</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{profile.reg_number}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowEditModal(true)}
              style={{ padding: '5px 10px', fontSize: '0.76rem' }}
            >
              <Edit size={13} />
              <span>Edit Details</span>
            </button>

            <button
              className="btn btn-danger"
              onClick={() => setShowDeleteConfirm(true)}
              style={{ padding: '5px 10px', fontSize: '0.76rem' }}
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>

            {enrollment?.status === 'completed' || enrollment?.status === 'graduated' ? (
              <button
                className="btn btn-primary"
                onClick={() => {
                  generateCertificatePDF({
                    studentName: profile.full_name,
                    courseTitle: course?.title || 'Barista Skills',
                    serialNumber: enrollment.certificate_serial_no || `CERT-AUR-2026-${branch.code || 'NBO'}-001`,
                    branchName: branch.name,
                    completionDate: completionDate,
                    directorName: 'Ronny Ronald (Coffee Master)',
                  });
                }}
                style={{ padding: '5px 12px', fontSize: '0.76rem' }}
                title="Download Official Certified Graduate Diploma"
              >
                <Award size={14} />
                <span>Certificate</span>
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  if (enrollment) {
                    await graduateStudent(enrollment.id);
                  }
                }}
                style={{ padding: '5px 10px', fontSize: '0.76rem', borderColor: 'var(--crema-gold)', color: 'var(--crema-gold)' }}
                title="Officially graduate trainee & issue certificate"
              >
                <Award size={13} />
                <span>Graduate Trainee</span>
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
              title="Close Dossier"
            >
              <X size={15} />
            </button>
          </div>
        </header>

        {/* MAIN CONTENT CONTAINER */}
        <main style={{ maxWidth: '1360px', width: '100%', margin: '0 auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* HERO IDENTITY HEADER CARD */}
          <div
            className="glass-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#181310',
                  fontWeight: 800,
                  fontSize: '1.4rem',
                  boxShadow: 'var(--shadow-gold)',
                  flexShrink: 0,
                }}
              >
                {initialLetter}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleCopyReg}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      color: 'var(--crema-gold)',
                      background: 'rgba(212, 154, 91, 0.12)',
                      border: '1px solid rgba(212, 154, 91, 0.3)',
                      padding: '2px 7px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Click to copy Reg Number"
                  >
                    <span>{profile.reg_number || 'AUR/NBO/2026/001'}</span>
                    {copiedReg ? <Check size={12} color="#6EE7B7" /> : <Copy size={12} />}
                  </button>

                  <span className="badge badge-approved" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                    <ShieldCheck size={11} /> KYC Verified
                  </span>
                  <span className="badge badge-paid" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                    {enrollment?.status?.toUpperCase() || 'ENROLLED'}
                  </span>
                </div>

                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '2px 0', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                  {profile.full_name}
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color="var(--crema-gold)" /> {branch.name} ({branch.city})
                  </span>
                  <span>•</span>
                  <span>National ID: <strong style={{ color: 'var(--text-primary)' }}>{student?.national_id_or_passport || 'N/A'}</strong></span>
                  <span>•</span>
                  <span>Email: <strong style={{ color: 'var(--text-primary)' }}>{profile.email}</strong></span>
                  <span>•</span>
                  <span>Phone: <strong style={{ color: '#10B981' }}>{profile.phone || 'N/A'}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Campus Tag */}
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 14px',
                textAlign: 'right',
              }}
            >
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Assigned Campus
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--crema-gold)', marginTop: '1px' }}>
                {branch.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {branch.address}
              </div>
            </div>
          </div>

          {/* FOUR METRIC EXECUTIVE TIMELINE RIBBON */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
            }}
          >
            <div
              className="glass-card"
              style={{
                padding: '12px 14px',
                borderLeft: '3px solid var(--crema-gold)',
              }}
            >
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Date of Admission
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: '3px 0 1px' }}>
                <Calendar size={15} color="var(--crema-gold)" />
                <span>{admissionDate}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Cohort Enrollment Intake
              </div>
            </div>

            <div
              className="glass-card"
              style={{
                padding: '12px 14px',
                borderLeft: '3px solid #10B981',
              }}
            >
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Expected Completion
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px', margin: '3px 0 1px' }}>
                <CheckCircle2 size={15} color="#10B981" />
                <span>{completionDate}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Practical & Sensory Exam Day
              </div>
            </div>

            <div
              className="glass-card"
              style={{
                padding: '12px 14px',
                borderLeft: '3px solid var(--crema-gold-light)',
              }}
            >
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Course Duration
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--crema-gold-light)', display: 'flex', alignItems: 'center', gap: '6px', margin: '3px 0 1px' }}>
                <Clock size={15} color="var(--crema-gold-light)" />
                <span>{course?.duration_weeks || 2} Weeks Intensive</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Hands-on Roastery & Bar Lab
              </div>
            </div>

            <div
              className="glass-card"
              style={{
                padding: '12px 14px',
                borderLeft: '3px solid #38BDF8',
              }}
            >
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Lab Attendance Rate
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '6px', margin: '3px 0 1px' }}>
                <UserCheck size={15} color="#38BDF8" />
                <span>{attendancePercent}% Present</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Digital Roll-Call Logged
              </div>
            </div>
          </div>

          {/* TWO-COLUMN EXECUTIVE DOSSIER GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(460px, 1.6fr)', gap: '14px', alignItems: 'start' }}>
            
            {/* LEFT COLUMN: IDENTITY, HEALTH, EMERGENCY */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* CARD 1: Personal Demographic & Identity */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--crema-gold)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <User size={15} />
                    <span>Personal KYC & Identity Dossier</span>
                  </h3>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowEditModal(true)}
                    style={{ padding: '3px 7px', fontSize: '0.7rem' }}
                  >
                    <Edit size={11} /> Edit
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Date of Birth:</span>
                    <span style={{ fontWeight: 600 }}>{student?.dob || '14 May 2001 (25 Yrs)'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Gender:</span>
                    <span style={{ fontWeight: 600 }}>{student?.gender || 'Female'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Nationality:</span>
                    <span style={{ fontWeight: 600 }}>{student?.nationality || 'Kenyan'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>National ID / Passport:</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--crema-gold)' }}>
                      {student?.national_id_or_passport || 'N/A'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Email Address:</span>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{profile.email}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Phone Number:</span>
                    <span style={{ fontWeight: 600, color: '#10B981' }}>{profile.phone || 'N/A'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Coffee Experience:</span>
                    <span className="badge badge-gold" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                      {student?.coffee_experience_level || 'Beginner'}
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD 2: Health & Safety Protocols */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--crema-gold)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', margin: 0 }}>
                  <Heart size={15} color="var(--cherry-red)" />
                  <span>Medical Conditions & Lab Allergies</span>
                </h3>

                <div
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    marginTop: '8px',
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Reported Health / Dietary Alerts
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: student?.medical_conditions && student.medical_conditions !== 'None' ? 'var(--cherry-red)' : '#10B981' }}>
                    {student?.medical_conditions || 'None Reported (Safe for standard cupping, dairy & roasting labs)'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Instructors review notes prior to sensory tasting, espresso consumption, and roasting lab ventilation.
                  </div>
                </div>
              </div>

              {/* CARD 3: Emergency Contact */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--crema-gold)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', margin: 0 }}>
                  <Phone size={15} />
                  <span>Emergency Contact Details</span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Contact Name:</span>
                    <span style={{ fontWeight: 700 }}>{student?.emergency_contact_name || 'Designated Contact'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Relationship:</span>
                    <span style={{ color: 'var(--crema-gold)', fontWeight: 600 }}>({student?.emergency_contact_relationship || 'Parent'})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Contact Phone:</span>
                    <span style={{ fontWeight: 700, color: '#10B981' }}>{student?.emergency_contact_phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: CURRICULUM, FEE LEDGER, ASSESSMENTS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* CARD 4: Course Curriculum & Cohort Schedule */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--crema-gold)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', margin: 0 }}>
                  <Coffee size={15} />
                  <span>Academic Curriculum & Cohort Class</span>
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', margin: '10px 0' }}>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Enrolled Program</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--crema-gold-light)', marginTop: '2px' }}>
                      {course?.title || 'Barista Skills Foundation & Latte Art'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Assigned Cohort Batch</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '2px' }}>
                      {cohort?.name || 'NBO Barista Intensive - Cohort 12'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Daily Schedule Timing</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '2px' }}>
                      {cohort?.schedule_timing || '08:30 AM - 12:30 PM (Mon-Fri)'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Training Delivery Mode</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10B981', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} color="#10B981" />
                      <span>On-Campus Practical & Sensory Lab</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(212, 154, 91, 0.08)', border: '1px solid rgba(212, 154, 91, 0.2)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Institutional Certification Award
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--crema-gold)', fontSize: '0.85rem', marginTop: '1px' }}>
                    {course?.certification_title || 'Certified Barista Foundation (CBF)'}
                  </div>
                </div>
              </div>

              {/* CARD 5: Fee Ledger, Invoicing & M-Pesa Receipts */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--crema-gold)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <DollarSign size={15} />
                    <span>Fee Ledger & M-Pesa Receipts</span>
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {invoice && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          initFeeAdjustmentModal();
                          setShowFeeAdjustmentModal(true);
                        }}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: 'var(--crema-gold)',
                          borderColor: 'rgba(212, 154, 91, 0.3)',
                          background: 'rgba(212, 154, 91, 0.08)',
                        }}
                      >
                        <Tag size={13} />
                        <span>Adjust Fee / Discount</span>
                      </button>
                    )}
                    <span className={`badge badge-${feeStatus}`} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                      {feeStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Active Discount / Concession Banner */}
                {invoice && invoice.discount_amount !== undefined && invoice.discount_amount > 0 && (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      marginBottom: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.76rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={13} color="#10B981" />
                      <span style={{ fontWeight: 600, color: '#6EE7B7' }}>
                        Active Discount: -KES {invoice.discount_amount.toLocaleString()} ({invoice.discount_reason || 'Approved Discount'})
                      </span>
                      {invoice.discount_note && (
                        <span style={{ color: 'var(--text-muted)' }}>• {invoice.discount_note}</span>
                      )}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      Standard Base: KES {(invoice.standard_fee || (invoice.total_fee + invoice.discount_amount)).toLocaleString()}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Net Tuition Fee</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '2px' }}>
                      KES {totalFee.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total Amount Paid</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                      KES {totalPaidAmount.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Remaining Balance</div>
                    <div
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: balanceDue > 0 ? 'var(--cherry-red)' : '#10B981',
                        marginTop: '2px',
                      }}
                    >
                      KES {balanceDue.toLocaleString()}
                    </div>
                  </div>
                </div>

                {studentPayments.length > 0 ? (
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Verified Payment Transactions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {studentPayments.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.78rem',
                            padding: '8px 12px',
                            background: 'var(--bg-surface-elevated)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--crema-gold)', fontWeight: 700 }}>
                              {p.mpesa_receipt_number || 'REC-' + p.id.slice(0, 6)}
                            </span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.72rem' }}>
                              {new Date(p.created_at).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: '#10B981', fontSize: '0.84rem', marginRight: '4px' }}>
                              KES {p.amount.toLocaleString()}
                            </span>

                            <button
                              className="btn btn-secondary"
                              style={{ padding: '3px 7px', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              title="Download PDF Receipt"
                              onClick={() => {
                                const invObj = invoice || {
                                  id: 'inv-temp',
                                  invoice_number: 'INV-2026-001',
                                  enrollment_id: '',
                                  student_id: student.id,
                                  branch_id: branch.id,
                                  total_fee: p.amount,
                                  amount_paid: p.amount,
                                  balance_due: 0,
                                  status: 'paid' as const,
                                  due_date: '',
                                  created_at: new Date().toISOString(),
                                };
                                generatePaymentReceiptPDF(p, invObj, profile, branch);
                              }}
                            >
                              <Download size={11} /> PDF
                            </button>

                            <button
                              className="btn btn-secondary"
                              style={{
                                padding: '3px 8px',
                                fontSize: '0.68rem',
                                color: '#10B981',
                                borderColor: 'rgba(16, 185, 129, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Share receipt directly to student's WhatsApp"
                              onClick={() => {
                                shareReceiptOnWhatsApp({
                                  studentName: profile.full_name,
                                  studentPhone: profile.phone || student.emergency_contact_phone,
                                  regNumber: profile.reg_number,
                                  courseTitle: course?.title || 'Barista Skills',
                                  receiptNumber: p.mpesa_receipt_number || 'REC-' + p.id.slice(0, 6),
                                  amount: p.amount,
                                  balanceDue: balanceDue,
                                  branchName: branch.name,
                                  paymentDate: new Date(p.created_at).toLocaleDateString('en-GB'),
                                });
                              }}
                            >
                              <MessageSquare size={11} color="#10B981" /> WhatsApp
                            </button>

                            <button
                              className="btn btn-secondary"
                              style={{
                                padding: '3px 8px',
                                fontSize: '0.68rem',
                                color: '#38BDF8',
                                borderColor: 'rgba(56, 189, 248, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Email formal receipt letter to student"
                              onClick={() => {
                                shareReceiptViaEmail({
                                  studentName: profile.full_name,
                                  studentEmail: profile.email,
                                  regNumber: profile.reg_number,
                                  courseTitle: course?.title || 'Barista Skills',
                                  receiptNumber: p.mpesa_receipt_number || 'REC-' + p.id.slice(0, 6),
                                  amount: p.amount,
                                  balanceDue: balanceDue,
                                  branchName: branch.name,
                                  paymentDate: new Date(p.created_at).toLocaleDateString('en-GB'),
                                });
                              }}
                            >
                              <Mail size={11} color="#38BDF8" /> Email
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', padding: '4px 0' }}>
                    No payment logs recorded yet.
                  </div>
                )}
              </div>

              {/* CARD 6: Modular Evaluations & Sensory Scores */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--crema-gold)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', margin: 0 }}>
                  <Award size={15} />
                  <span>Modular Evaluations & Sensory Cupping Performance</span>
                </h3>

                {studentAssessments.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', marginTop: '8px' }}>
                    Practical assessments are currently underway. Instructor marks populate in real time.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                    {studentAssessments.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          background: 'var(--bg-surface-elevated)',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{a.module_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                            "{a.instructor_remarks}"
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.76rem', color: 'var(--crema-gold)' }}>
                            Practical: <strong>{a.practical_score}%</strong> | Sensory: <strong>{a.sensory_score}%</strong>
                          </span>
                          <span className="badge badge-paid" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                            {a.grade} ({a.final_score}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)} style={{ zIndex: 1200 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', color: 'var(--cherry-red)' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>Delete Trainee Record?</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>{profile.full_name}</strong> ({profile.reg_number})? This will permanently remove their enrollment, invoices, and KYC file.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} style={{ padding: '5px 12px', fontSize: '0.78rem' }}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={isDeleting} style={{ padding: '5px 12px', fontSize: '0.78rem' }}>
                {isDeleting ? 'Deleting...' : 'Yes, Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <EditStudentModal
          student={student}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Fee Adjustment & Discount Modal */}
      {showFeeAdjustmentModal && (
        <div className="modal-overlay" onClick={() => setShowFeeAdjustmentModal(false)} style={{ zIndex: 1250 }}>
          <div
            className="modal-content glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '540px', width: '95%', padding: '24px', borderRadius: 'var(--radius-lg)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(212, 154, 91, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--crema-gold)',
                  }}
                >
                  <Tag size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Adjust Tuition Fee & Discount</h3>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Invoice {invoice?.invoice_number || 'INV-CURRENT'} • {profile.full_name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFeeAdjustmentModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {feeAdjustError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', marginBottom: '16px' }}>
                {feeAdjustError}
              </div>
            )}

            <form onSubmit={handleSaveFeeAdjustment}>
              {/* Mode Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '6px' }}>
                  Fee Adjustment Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'none', label: 'Standard Rate' },
                    { id: 'percentage', label: 'Percentage (%) Off' },
                    { id: 'fixed', label: 'Fixed (KES) Off' },
                    { id: 'custom', label: 'Direct Override' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        const standardBase = Number(course?.fee_amount) || Number(invoice?.standard_fee) || Number(invoice?.total_fee) || 35000;
                        setEditDiscountType(m.id as any);
                        if (m.id === 'percentage' && (editDiscountValue === '' || editDiscountValue === 0)) setEditDiscountValue(10);
                        if (m.id === 'fixed' && (editDiscountValue === '' || editDiscountValue === 0)) setEditDiscountValue(5000);
                        if (m.id === 'custom' && editCustomTotalFee === '') setEditCustomTotalFee(standardBase);
                      }}
                      style={{
                        padding: '6px 8px',
                        fontSize: '0.72rem',
                        fontWeight: editDiscountType === m.id ? 700 : 500,
                        borderRadius: 'var(--radius-sm)',
                        border: editDiscountType === m.id ? '1px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
                        background: editDiscountType === m.id ? 'rgba(212, 154, 91, 0.15)' : 'var(--bg-surface-elevated)',
                        color: editDiscountType === m.id ? 'var(--crema-gold)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode-specific Inputs */}
              {editDiscountType === 'percentage' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Discount Percentage (%) *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          className="form-input"
                          value={editDiscountValue}
                          onChange={(e) => setEditDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="10"
                          required
                          style={{ paddingRight: '28px' }}
                        />
                        <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>%</span>
                      </div>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Discount Category *</label>
                      <select
                        className="form-select"
                        value={editDiscountReason}
                        onChange={(e) => setEditDiscountReason(e.target.value)}
                      >
                        <option value="Early Bird Intake">Early Bird Intake</option>
                        <option value="Scholarship / Institutional Bursary">Scholarship / Bursary</option>
                        <option value="Staff & Family Privilege">Staff & Family Privilege</option>
                        <option value="Corporate / Group Enrollment">Corporate / Group Enrollment</option>
                        <option value="Referral Incentive">Referral Incentive</option>
                        <option value="Financial Hardship Concession">Financial Hardship Concession</option>
                        <option value="Special Bursar Approval">Special Bursar Approval</option>
                        <option value="Administrative Correction">Administrative Correction</option>
                      </select>
                    </div>
                  </div>

                  {/* Quick percentage chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Quick Select:</span>
                    {[5, 10, 15, 20, 25, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setEditDiscountValue(pct)}
                        style={{
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          borderRadius: '4px',
                          border: editDiscountValue === pct ? '1px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
                          background: editDiscountValue === pct ? 'rgba(212, 154, 91, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          color: editDiscountValue === pct ? 'var(--crema-gold)' : 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {editDiscountType === 'fixed' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Discount Amount (KES) *</label>
                    <input
                      type="number"
                      min="100"
                      step="500"
                      className="form-input"
                      value={editDiscountValue}
                      onChange={(e) => setEditDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 5000"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Discount Category *</label>
                    <select
                      className="form-select"
                      value={editDiscountReason}
                      onChange={(e) => setEditDiscountReason(e.target.value)}
                    >
                      <option value="Early Bird Intake">Early Bird Intake</option>
                      <option value="Scholarship / Institutional Bursary">Scholarship / Bursary</option>
                      <option value="Staff & Family Privilege">Staff & Family Privilege</option>
                      <option value="Corporate / Group Enrollment">Corporate / Group Enrollment</option>
                      <option value="Referral Incentive">Referral Incentive</option>
                      <option value="Financial Hardship Concession">Financial Hardship Concession</option>
                      <option value="Special Bursar Approval">Special Bursar Approval</option>
                      <option value="Administrative Correction">Administrative Correction</option>
                    </select>
                  </div>
                </div>
              )}

              {editDiscountType === 'custom' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Agreed Total Tuition (KES) *</label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      className="form-input"
                      value={editCustomTotalFee}
                      onChange={(e) => setEditCustomTotalFee(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 30000"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Reason / Authorization *</label>
                    <select
                      className="form-select"
                      value={editDiscountReason}
                      onChange={(e) => setEditDiscountReason(e.target.value)}
                    >
                      <option value="Special Bursar Approval">Special Bursar Approval</option>
                      <option value="Custom Negotiated Rate">Custom Negotiated Rate</option>
                      <option value="Scholarship Grant">Scholarship Grant</option>
                      <option value="Executive Management Waiver">Executive Management Waiver</option>
                      <option value="Administrative Correction">Administrative Correction</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Note / Memo */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  Audit Note / Memo (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={editDiscountNote}
                  onChange={(e) => setEditDiscountNote(e.target.value)}
                  placeholder="e.g. Authorized by Campus Manager / Principal"
                />
              </div>

              {/* Live Preview Box */}
              {(() => {
                const standardBase = Number(course?.fee_amount) || Number(invoice?.standard_fee) || Number(invoice?.total_fee) || 35000;
                let previewDiscount = 0;
                let previewTotal = standardBase;

                if (editDiscountType === 'percentage' && editDiscountValue !== '') {
                  const pct = Math.min(100, Math.max(0, Number(editDiscountValue)));
                  previewDiscount = Math.round((standardBase * pct) / 100);
                  previewTotal = Math.max(0, standardBase - previewDiscount);
                } else if (editDiscountType === 'fixed' && editDiscountValue !== '') {
                  previewDiscount = Math.min(standardBase, Math.max(0, Number(editDiscountValue)));
                  previewTotal = Math.max(0, standardBase - previewDiscount);
                } else if (editDiscountType === 'custom' && editCustomTotalFee !== '') {
                  previewTotal = Math.max(0, Number(editCustomTotalFee));
                  previewDiscount = Math.max(0, standardBase - previewTotal);
                }

                const previewBalance = Math.max(0, previewTotal - totalPaidAmount);

                return (
                  <div
                    style={{
                      background: 'rgba(212, 154, 91, 0.08)',
                      border: '1px solid rgba(212, 154, 91, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      marginBottom: '20px',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Standard Base Fee:</span>{' '}
                        <strong>KES {standardBase.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Discount:</span>{' '}
                        <strong style={{ color: previewDiscount > 0 ? '#10B981' : 'inherit' }}>
                          {previewDiscount > 0 ? `- KES ${previewDiscount.toLocaleString()}` : 'None'}
                        </strong>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(212, 154, 91, 0.2)' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>New Net Tuition:</span>{' '}
                        <strong style={{ color: 'var(--crema-gold)' }}>KES {previewTotal.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Projected Balance:</span>{' '}
                        <strong style={{ color: previewBalance > 0 ? 'var(--cherry-red)' : '#10B981' }}>
                          KES {previewBalance.toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowFeeAdjustmentModal(false)}
                  disabled={isSavingFeeAdjustment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingFeeAdjustment}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={15} />
                  <span>{isSavingFeeAdjustment ? 'Saving Adjustment...' : 'Save & Update Fee'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
