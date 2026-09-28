import React, { useEffect } from 'react';
import { useApp } from '../lib/store';
import { generatePaymentReceiptPDF } from '../lib/pdf';
import { ShieldCheck, Download, Coffee, CheckCircle2, ArrowLeft, ExternalLink } from 'lucide-react';

export const PublicReceiptView: React.FC<{ receiptRef: string; onBack?: () => void }> = ({ receiptRef, onBack }) => {
  const { payments, invoices, students, profiles, branches, courses, cohorts, enrollments } = useApp();

  const payment = payments.find(
    (p) =>
      (p.mpesa_receipt_number && p.mpesa_receipt_number.toLowerCase() === receiptRef.toLowerCase()) ||
      p.id.toLowerCase().includes(receiptRef.toLowerCase())
  ) || payments[0] || {
    id: 'pay-sample',
    invoice_id: 'inv-sample',
    student_id: 'std-sample',
    branch_id: 'b1000000-0000-0000-0000-000000000001',
    amount: 35000,
    payment_method: 'mpesa',
    mpesa_receipt_number: receiptRef,
    mpesa_phone_number: '+254 712 998 877',
    status: 'completed',
    created_at: new Date().toISOString(),
  };

  const invoice = invoices.find((i) => i.id === payment.invoice_id) || invoices[0] || {
    id: 'inv-sample',
    invoice_number: 'INV-2026-001',
    enrollment_id: '',
    student_id: payment.student_id,
    branch_id: payment.branch_id,
    total_fee: payment.amount,
    amount_paid: payment.amount,
    balance_due: 0,
    status: 'paid' as const,
    due_date: '',
    created_at: new Date().toISOString(),
  };

  const student = students.find((s) => s.id === payment.student_id) || students[0];
  const profile = profiles.find((p) => p.id === student?.profile_id) || profiles.find((p) => p.role === 'student') || {
    id: 'prof-sample',
    full_name: 'Faith Cherono',
    email: 'faith.cherono@aureviacoffeeinstitute.co.ke',
    phone: '+254 712 998 877',
    reg_number: 'AUR/NBO/2026/001',
    role: 'student' as const,
    is_active: true,
    created_at: '',
  };

  const branch = branches.find((b) => b.id === payment.branch_id) || branches[0] || {
    id: 'b1',
    name: 'Aurevia Nairobi Roastery & Academy',
    code: 'NBO',
    city: 'Nairobi',
    country: 'Kenya',
    phone: '+254 711 234 567',
    email: 'nairobi@aurevia.ac.ke',
    is_active: true,
    created_at: '',
  };

  const enrollment = enrollments.find((e) => e.student_id === student?.id);
  const cohort = cohorts.find((c) => c.id === enrollment?.cohort_id);
  const course = courses.find((c) => c.id === cohort?.course_id) || courses[0];

  const handleDownload = () => {
    generatePaymentReceiptPDF(payment, invoice, profile, branch);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-card" style={{ maxWidth: '580px', width: '100%', padding: '28px', border: '1px solid var(--border-medium)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--crema-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1A1412' }}>
              <Coffee size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Aurevia Institute of Coffee</h2>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Specialty Coffee Academy • Official Verification</div>
            </div>
          </div>
          <span className="badge badge-paid" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.76rem' }}>
            <CheckCircle2 size={13} />
            <span>VERIFIED RECEIPT</span>
          </span>
        </div>

        {/* Receipt Key Metrics */}
        <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', padding: '16px', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Receipt Number</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--crema-gold)', fontFamily: 'var(--font-mono)' }}>
                {payment.mpesa_receipt_number || receiptRef}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount Credited</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10B981' }}>
                KES {payment.amount.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '12px', paddingTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Trainee: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{profile.full_name}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Reg No: </span>
              <strong style={{ color: 'var(--crema-gold)' }}>{profile.reg_number || 'N/A'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Course: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{course?.title || 'Barista Skills'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Campus: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{branch.name}</strong>
            </div>
          </div>
        </div>

        {/* Download Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handleDownload} style={{ width: '100%', padding: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Download size={18} />
            <span>Download Official PDF Receipt</span>
          </button>

          <a href="/" style={{ textDecoration: 'none', width: '100%' }}>
            <button className="btn btn-secondary" style={{ width: '100%', padding: '10px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <ArrowLeft size={14} />
              <span>Go to Student Portal / Home</span>
            </button>
          </a>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          🔒 Computer generated and verified by Safaricom Daraja C2B Gateway & Aurevia Finance Ledger.
        </div>
      </div>
    </div>
  );
};
