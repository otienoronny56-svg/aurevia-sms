import React, { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { Invoice, Payment } from '../../types/database.types';
import { initiateDarajaSTKPush, formatMpesaPhoneNumber, queryDarajaSTKStatus, DarajaSTKPushResponse } from '../../lib/mpesa';
import { generatePaymentReceiptPDF } from '../../lib/pdf';
import { shareReceiptOnWhatsApp, shareReceiptViaEmail } from '../../lib/shareUtils';
import confetti from 'canvas-confetti';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  X,
  MessageSquare,
  Mail,
  Banknote,
  Building2,
  User,
  CreditCard,
  Receipt,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
  Copy,
  Check,
} from 'lucide-react';

interface MpesaPaymentModalProps {
  invoice?: Invoice | null;
  presetBranchId?: string;
  presetAmount?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MpesaPaymentModal: React.FC<MpesaPaymentModalProps> = ({
  invoice: initialInvoice,
  presetBranchId,
  presetAmount,
  onClose,
  onSuccess,
}) => {
  const {
    currentProfile,
    students,
    profiles,
    branches,
    courses,
    cohorts,
    enrollments,
    invoices,
    processMpesaPayment,
    submitMpesaConfirmationSMS,
    revertPayment,
  } = useApp();

  const isStudent = currentProfile?.role === 'student';
  const isBranchManager = currentProfile?.role === 'branch_manager';
  const managerBranchId = presetBranchId || currentProfile?.branch_id;

  // Filter invoices for this campus
  const branchInvoices = invoices.filter(
    (inv) => !managerBranchId || inv.branch_id === managerBranchId
  );

  // Available unpaid/partial invoices
  const availableInvoices = branchInvoices.filter((i) => i.balance_due > 0 || i.id === initialInvoice?.id);
  const activeInvoicesList = availableInvoices.length > 0 ? availableInvoices : branchInvoices;

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    initialInvoice?.id || activeInvoicesList[0]?.id || ''
  );

  const activeInvoice =
    invoices.find((i) => i.id === selectedInvoiceId) || initialInvoice || activeInvoicesList[0];

  const student = students.find((s) => s.id === activeInvoice?.student_id);
  const profile = profiles.find((p) => p.id === student?.profile_id);
  const branch = branches.find((b) => b.id === activeInvoice?.branch_id);
  const enrollment = enrollments.find((e) => e.student_id === student?.id);
  const cohort = cohorts.find((c) => c.id === enrollment?.cohort_id);
  const course = courses.find((c) => c.id === cohort?.course_id);
  const campusPaybill = branch?.paybill_number || '174379';
  const campusAccount = branch?.paybill_account_name || (branch?.code ? `AUREVIA-${branch.code}` : 'AUREVIA-HQ');
  const campusBankName = branch?.bank_name || 'KCB Bank Kenya';
  const campusBankAccount = branch?.bank_account_number || '1289456780';

  // Payment Method: 'paste_sms' | 'mpesa' | 'cash' | 'bank_transfer'
  const [paymentMethod, setPaymentMethod] = useState<'paste_sms' | 'mpesa' | 'cash' | 'bank_transfer'>('paste_sms');
  const [rawMpesaText, setRawMpesaText] = useState('');
  const [extractedReceiptNo, setExtractedReceiptNo] = useState('');
  const [isSubmittingSMS, setIsSubmittingSMS] = useState(false);
  const [submittedForVerification, setSubmittedForVerification] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRawMpesaChange = (text: string) => {
    setRawMpesaText(text);
    const codeMatch = text.match(/\b([A-Z0-9]{10})\b/i);
    if (codeMatch) {
      setExtractedReceiptNo(codeMatch[1].toUpperCase());
    }
    const amtMatch = text.match(/(?:Ksh|KES)\.?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    if (amtMatch) {
      const parsed = parseFloat(amtMatch[1].replace(/,/g, ''));
      if (parsed > 0) {
        setAmount(parsed);
      }
    }
  };

  const defaultPhone = isStudent
    ? (currentProfile?.phone || profile?.phone || student?.emergency_contact_phone || '0714767240')
    : (profile?.phone || '0714767240');

  const [phone, setPhone] = useState(defaultPhone);
  const [amount, setAmount] = useState<number | ''>(presetAmount || activeInvoice?.balance_due || 10000);
  const [cashierNotes, setCashierNotes] = useState('Collected at campus reception desk');
  const [bankReference, setBankReference] = useState('');

  // Update amount & phone when selected invoice or presetAmount changes
  React.useEffect(() => {
    if (activeInvoice) {
      setAmount(presetAmount || activeInvoice.balance_due || activeInvoice.total_fee || 10000);
      const preferredPhone = isStudent
        ? (currentProfile?.phone || profile?.phone || student?.emergency_contact_phone || '0714767240')
        : (profile?.phone || '0714767240');
      if (preferredPhone) {
        setPhone(preferredPhone);
      }
    }
  }, [selectedInvoiceId, presetAmount]);

  const [step, setStep] = useState<'form' | 'pushing' | 'prompted' | 'success'>('form');
  const [errorMessage, setErrorMessage] = useState('');
  const [createdPayment, setCreatedPayment] = useState<Payment | null>(null);
  const [checkoutInfo, setCheckoutInfo] = useState<DarajaSTKPushResponse | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pollMessage, setPollMessage] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(60);
  const [isReverting, setIsReverting] = useState(false);

  const handleConfirmMpesaPayment = async () => {
    if (!activeInvoice) return;
    const numericAmount = Number(amount) || 0;
    if (numericAmount <= 0) {
      setErrorMessage('Please enter a valid payment amount.');
      return;
    }
    setIsConfirming(true);
    setErrorMessage('');
    try {
      const payment = await processMpesaPayment({
        invoiceId: activeInvoice.id,
        amount: numericAmount,
        phone: formatMpesaPhoneNumber(phone),
        paymentMethod: 'mpesa',
      });

      setCreatedPayment(payment);
      setStep('success');

      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (_) {}
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record payment receipt in ledger.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Live polling effect: checks Daraja status every 3s while awaiting customer PIN
  useEffect(() => {
    if (step !== 'prompted' || !checkoutInfo?.checkoutRequestId) return;

    setCountdown(60);
    setPollMessage('M-Pesa STK Prompt sent to phone. Waiting for your PIN entry...');

    const timerInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    let isTerminated = false;
    const pollInterval = setInterval(async () => {
      if (isTerminated || !checkoutInfo?.checkoutRequestId) return;
      try {
        const res = await queryDarajaSTKStatus(checkoutInfo.checkoutRequestId);
        if (isTerminated) return;

        if (res.resultCode === 0) {
          // REAL SAFARICOM PIN CONFIRMATION DETECTED
          isTerminated = true;
          clearInterval(pollInterval);
          clearInterval(timerInterval);
          setPollMessage('PIN verified by Safaricom! Generating official receipt...');
          await handleConfirmMpesaPayment();
        } else if (res.resultCode > 0) {
          // Final failure reported by Safaricom
          isTerminated = true;
          clearInterval(pollInterval);
          clearInterval(timerInterval);
          setStep('form');

          if (res.resultCode === 1) {
            setErrorMessage('Payment failed: Insufficient M-Pesa balance on your phone. Please top up or reduce amount.');
          } else if (res.resultCode === 1032) {
            setErrorMessage('Payment cancelled: You cancelled the M-Pesa prompt on your phone.');
          } else if (res.resultCode === 1037) {
            setErrorMessage('Payment failed: Prompt timed out. PIN was not entered within 60s.');
          } else if (res.resultCode === 2001) {
            setErrorMessage('Payment failed: Incorrect M-Pesa PIN entered.');
          } else {
            setErrorMessage(`Payment failed: ${res.resultDesc || 'Transaction could not be completed by Safaricom.'}`);
          }
        } else {
          // Still pending (resultCode === -1)
          setPollMessage(res.resultDesc || 'Waiting for you to enter M-Pesa PIN on phone...');
        }
      } catch (_) {
        // Network retry on next interval
      }
    }, 3000);

    return () => {
      isTerminated = true;
      clearInterval(timerInterval);
      clearInterval(pollInterval);
    };
  }, [step, checkoutInfo?.checkoutRequestId]);

  // Handle countdown timeout
  useEffect(() => {
    if (step === 'prompted' && countdown === 0) {
      setStep('form');
      setErrorMessage('STK Prompt expired (60s). Please ensure your phone is unlocked and try again.');
    }
  }, [countdown, step]);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) {
      setErrorMessage('No active invoice selected');
      return;
    }

    const numericAmount = Number(amount) || 0;
    if (!amount || numericAmount <= 0) {
      setErrorMessage('Please enter an amount greater than 0');
      return;
    }

    if (activeInvoice.balance_due > 0 && numericAmount > activeInvoice.balance_due) {
      setErrorMessage(`Amount entered (KES ${numericAmount.toLocaleString()}) cannot exceed the balance due of KES ${activeInvoice.balance_due.toLocaleString()}`);
      return;
    }

    setErrorMessage('');

    // 1. Submit M-Pesa SMS Confirmation for Bursar Verification
    if (paymentMethod === 'paste_sms') {
      if (!rawMpesaText.trim()) {
        setErrorMessage('Please paste the confirmation SMS received from Safaricom M-Pesa on your phone.');
        return;
      }
      setIsSubmittingSMS(true);
      try {
        const payment = await submitMpesaConfirmationSMS({
          invoiceId: activeInvoice.id,
          rawMpesaText: rawMpesaText.trim(),
          claimedAmount: numericAmount,
          studentId: activeInvoice.student_id,
          branchId: activeInvoice.branch_id,
          mpesaReceiptNumber: extractedReceiptNo || undefined,
          phoneNumber: formatMpesaPhoneNumber(phone),
        });
        setCreatedPayment(payment);
        setSubmittedForVerification(true);
        setStep('success');
        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch (_) {}
        if (onSuccess) onSuccess();
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to submit M-Pesa SMS verification.');
      } finally {
        setIsSubmittingSMS(false);
      }
      return;
    }

    if (paymentMethod === 'mpesa') {
      const cleanPhone = formatMpesaPhoneNumber(phone);
      if (cleanPhone.length < 12) {
        setErrorMessage('Please enter a valid Safaricom phone number (e.g. 07XXXXXXXX or 01XXXXXXXX)');
        return;
      }

      setStep('pushing');
      try {
        // Trigger live Daraja STK Push request
        const res = await initiateDarajaSTKPush({
          phoneNumber: cleanPhone,
          amount: numericAmount,
          invoiceNumber: activeInvoice.invoice_number,
          studentRegNo: profile?.reg_number || 'N/A',
        });

        setCheckoutInfo(res);
        setPollMessage(`STK Push dispatched to ${cleanPhone}. Please check your phone screen.`);
        setStep('prompted');
      } catch (err: any) {
        setErrorMessage(err.message || 'Payment initiation failed. Please verify phone number.');
        setStep('form');
      }
    } else {
      // Cash or Bank Transfer direct manual recording
      setStep('pushing');
      try {
        const payment = await processMpesaPayment({
          invoiceId: activeInvoice.id,
          amount: numericAmount,
          phone: profile?.phone || '+254 700 000 000',
          paymentMethod: paymentMethod,
        });

        setCreatedPayment(payment);
        setStep('success');

        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch (_) {}
        if (onSuccess) onSuccess();
      } catch (err: any) {
        setErrorMessage(err.message || 'Error recording manual payment receipt.');
        setStep('form');
      }
    }
  };

  const handleCancelPrompt = () => {
    setStep('form');
    setErrorMessage('Transaction cancelled. No funds were deducted from student balance.');
  };

  const handleDownloadReceipt = () => {
    if (createdPayment && profile && activeInvoice) {
      generatePaymentReceiptPDF(createdPayment, activeInvoice, profile, branch);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1150 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background:
              paymentMethod === 'mpesa'
                ? 'linear-gradient(135deg, rgba(0, 166, 81, 0.12) 0%, transparent 100%)'
                : paymentMethod === 'cash'
                ? 'linear-gradient(135deg, rgba(212, 154, 91, 0.15) 0%, transparent 100%)'
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background:
                  paymentMethod === 'mpesa' ? '#00A651' : paymentMethod === 'cash' ? 'var(--crema-gold)' : '#3B82F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: paymentMethod === 'cash' ? '#181310' : '#fff',
                fontWeight: 800,
                fontSize: '1rem',
              }}
            >
              {paymentMethod === 'mpesa' ? <Smartphone size={20} /> : paymentMethod === 'cash' ? <Banknote size={20} /> : <Receipt size={20} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                {isStudent
                  ? (paymentMethod === 'mpesa' ? 'Pay Tuition with M-Pesa' : 'Bank Deposit & Paybill Details')
                  : (paymentMethod === 'mpesa' ? 'M-Pesa STK Collection' : paymentMethod === 'cash' ? 'Record Cash Receipt' : 'Record Bank Wire / EFT')}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {branch?.name || 'Academy Campus Finance'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {step === 'form' && (
            <form onSubmit={handleSubmitPayment}>
              {/* STUDENT & INVOICE SELECTOR (Only shown when recording generic receipt, not when clicking Collect Fee for a specific student) */}
              {!initialInvoice && !isStudent && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} style={{ color: 'var(--crema-gold)' }} />
                    Select Campus Student & Invoice
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="form-input"
                    required
                  >
                    {activeInvoicesList.map((inv) => {
                      const st = students.find((s) => s.id === inv.student_id);
                      const pr = profiles.find((p) => p.id === st?.profile_id);
                      const e = enrollments.find((en) => en.id === inv.enrollment_id || en.student_id === inv.student_id);
                      const coh = cohorts.find((c) => c.id === e?.cohort_id);
                      const crs = courses.find((c) => c.id === coh?.course_id);
                      return (
                        <option key={inv.id} value={inv.id}>
                          {pr?.full_name || 'Trainee'} ({pr?.reg_number || 'REG-PENDING'}) - {crs?.title || 'Specialty Course'} [Due: KES {inv.balance_due.toLocaleString()}]
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* CAMPUS PAYBILL & ACCOUNT CARD */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 166, 81, 0.12) 0%, rgba(24, 19, 16, 0.6) 100%)',
                  border: '1px solid rgba(0, 166, 81, 0.3)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Smartphone size={15} color="#4ADE80" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4ADE80' }}>
                      Official Campus M-Pesa Paybill
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {branch?.name || 'Main Campus'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Business Paybill</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#4ADE80' }}>
                        {campusPaybill}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleCopy(campusPaybill, 'modal_paybill')}
                        style={{ padding: '2px 6px', fontSize: '0.68rem', height: '22px' }}
                      >
                        {copiedKey === 'modal_paybill' ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                        <span>{copiedKey === 'modal_paybill' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Account Name</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--crema-gold)' }}>
                        {campusAccount}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleCopy(campusAccount, 'modal_account')}
                        style={{ padding: '2px 6px', fontSize: '0.68rem', height: '22px' }}
                      >
                        {copiedKey === 'modal_account' ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                        <span>{copiedKey === 'modal_account' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAYMENT METHOD SELECTOR TABS */}
              <div style={{ marginBottom: '18px' }}>
                <label className="form-label">Payment Channel</label>
                <div style={{ display: 'grid', gridTemplateColumns: isStudent ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', gap: '8px' }}>
                  {/* Tab 1: Paste SMS (Default) */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paste_sms')}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '8px',
                      border: paymentMethod === 'paste_sms' ? '2px solid #00A651' : '1px solid var(--border-subtle)',
                      background: paymentMethod === 'paste_sms' ? 'rgba(0, 166, 81, 0.18)' : 'var(--bg-surface-elevated)',
                      color: paymentMethod === 'paste_sms' ? '#4ADE80' : 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.74rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <FileCheck size={18} />
                    <span>Paste M-Pesa SMS</span>
                  </button>

                  {/* Tab 2: STK Push (Coming Soon Telco Certification) */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mpesa')}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '8px',
                      border: paymentMethod === 'mpesa' ? '2px solid #F59E0B' : '1px solid var(--border-subtle)',
                      background: paymentMethod === 'mpesa' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface-elevated)',
                      color: paymentMethod === 'mpesa' ? '#FBBF24' : 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.74rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Smartphone size={18} />
                    <span>STK Push (Soon)</span>
                  </button>

                  {/* Tab 3: Bank Transfer */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '8px',
                      border: paymentMethod === 'bank_transfer' ? '2px solid #3B82F6' : '1px solid var(--border-subtle)',
                      background: paymentMethod === 'bank_transfer' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface-elevated)',
                      color: paymentMethod === 'bank_transfer' ? '#60A5FA' : 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.74rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Building2 size={18} />
                    <span>Bank Wire / EFT</span>
                  </button>

                  {!isStudent && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      style={{
                        padding: '10px 6px',
                        borderRadius: '8px',
                        border: paymentMethod === 'cash' ? '2px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
                        background: paymentMethod === 'cash' ? 'rgba(212, 154, 91, 0.15)' : 'var(--bg-surface-elevated)',
                        color: paymentMethod === 'cash' ? 'var(--crema-gold)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.74rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Banknote size={18} />
                      <span>Cash / Desk</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Invoice Overview Card */}
              {activeInvoice && (
                <div
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Student Name:</span>
                    <span style={{ fontWeight: 600 }}>{profile?.full_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Invoice Number:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{activeInvoice.invoice_number}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Course Module:</span>
                    <span>{course?.title || 'Barista Program'}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: '6px',
                      marginTop: '6px',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>Outstanding Balance:</span>
                    <span style={{ fontWeight: 700, color: 'var(--cherry-red)', fontSize: '0.95rem' }}>
                      KES {(activeInvoice.balance_due || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 1: PASTE M-PESA SMS */}
              {paymentMethod === 'paste_sms' && (
                <div style={{ marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MessageSquare size={14} color="#4ADE80" />
                        Paste Safaricom M-Pesa Confirmation SMS
                      </span>
                      {extractedReceiptNo && (
                        <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>
                          ✓ Code: {extractedReceiptNo}
                        </span>
                      )}
                    </label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={rawMpesaText}
                      onChange={(e) => handleRawMpesaChange(e.target.value)}
                      placeholder="e.g. QA47X9Y89K Confirmed. Ksh 15,000.00 sent to AUREVIA for account AUREVIA-NBO on 05/10/26 at 10:45 AM..."
                      required
                      style={{ fontSize: '0.8rem', lineHeight: 1.4 }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Paste the SMS message received from MPESA on your phone. Code and amount will be auto-detected.
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">M-Pesa Reference Code</label>
                      <input
                        type="text"
                        className="form-input"
                        value={extractedReceiptNo}
                        onChange={(e) => setExtractedReceiptNo(e.target.value.toUpperCase())}
                        placeholder="e.g. QA47X9Y89K"
                        style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Sender Phone Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0712345678"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: M-PESA STK PUSH (COMING SOON TELCO CERTIFICATION) */}
              {paymentMethod === 'mpesa' && (
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '8px',
                      marginBottom: '14px',
                      fontSize: '0.78rem',
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Clock size={14} />
                      ⚡ STK Push (Coming Soon - Telco Certification)
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      Our Safaricom Daraja STK Push architecture is 100% complete and undergoing final telco certification. For immediate fee processing right now, please send funds to Paybill <strong>{campusPaybill}</strong> and use the <strong>Paste M-Pesa SMS</strong> tab above.
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Safaricom Phone Number (for Sandbox Prompt)</label>
                    <div style={{ position: 'relative' }}>
                      <Smartphone
                        size={16}
                        color="var(--text-muted)"
                        style={{ position: 'absolute', left: '12px', top: '12px' }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0712345678 or 254712345678"
                        required
                        style={{ paddingLeft: '36px' }}
                      />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      A secure Safaricom M-Pesa PIN prompt can be tested in sandbox mode.
                    </span>
                  </div>
                </div>
              )}

              {/* Cash Notes Field */}
              {paymentMethod === 'cash' && !isStudent && (
                <div className="form-group">
                  <label className="form-label">Cash Receipt / Cashier Reference</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cashierNotes}
                    onChange={(e) => setCashierNotes(e.target.value)}
                    placeholder="e.g. Received by Front Desk Cashier / Book Ref #4401"
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Immediate physical receipt confirmation & ledger credit.
                  </span>
                </div>
              )}

              {/* Bank Transfer Field */}
              {paymentMethod === 'bank_transfer' && (
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '8px',
                      marginBottom: '14px',
                      fontSize: '0.8rem',
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#60A5FA', marginBottom: '4px' }}>
                      Official Campus Bank Accounts & Paybill
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                      <div><strong>Safaricom Paybill:</strong> {campusPaybill}</div>
                      <div><strong>Account Ref:</strong> {campusAccount}</div>
                      <div><strong>Bank:</strong> {campusBankName}</div>
                      <div><strong>Account No:</strong> {campusBankAccount}</div>
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      After transferring funds, enter your bank deposit reference below so the bursar can reconcile your receipt.
                    </p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bank Transaction Reference / Deposit Slip No.</label>
                    <input
                      type="text"
                      className="form-input"
                      value={bankReference}
                      onChange={(e) => setBankReference(e.target.value)}
                      placeholder="e.g. KCB EFT-8921094 / NCBA Wire Ref"
                    />
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div className="form-group">
                <label className="form-label">Amount (KES)</label>
                <input
                  type="number"
                  className="form-input"
                  value={amount}
                  step="any"
                  placeholder="0"
                  onChange={(e) => {
                    const val = e.target.value;
                    setAmount(val === '' ? '' : Number(val));
                  }}
                  min={1}
                  required
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {activeInvoice && activeInvoice.balance_due > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => setAmount(activeInvoice.balance_due)}
                    >
                      Pay Full Due (KES {activeInvoice.balance_due.toLocaleString()})
                    </button>
                  )}
                  {activeInvoice && activeInvoice.balance_due > 10000 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => setAmount(Math.round(activeInvoice.balance_due / 2))}
                    >
                      50% Deposit
                    </button>
                  )}
                </div>
              </div>

              {errorMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid var(--aur-crimson)',
                    color: '#FCA5A5',
                    fontSize: '0.8rem',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className={paymentMethod === 'paste_sms' ? 'btn btn-mpesa' : paymentMethod === 'mpesa' ? 'btn btn-gold' : 'btn btn-primary'}
                disabled={isSubmittingSMS}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px',
                }}
              >
                {paymentMethod === 'paste_sms' ? (
                  <>
                    <FileCheck size={18} />
                    <span>{isSubmittingSMS ? 'Submitting SMS...' : `Submit M-Pesa Confirmation SMS (KES ${(Number(amount) || 0).toLocaleString()})`}</span>
                  </>
                ) : paymentMethod === 'mpesa' ? (
                  <>
                    <Smartphone size={18} />
                    <span>Send M-Pesa STK Push (Sandbox - KES {(Number(amount) || 0).toLocaleString()})</span>
                  </>
                ) : paymentMethod === 'cash' ? (
                  <>
                    <Banknote size={18} />
                    <span>Record Cash Payment (KES {(Number(amount) || 0).toLocaleString()})</span>
                  </>
                ) : (
                  <>
                    <Building2 size={18} />
                    <span>Record Bank Transfer (KES {(Number(amount) || 0).toLocaleString()})</span>
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'pushing' && (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <Loader2 size={44} className="spin" color="var(--crema-gold)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Processing Payment Transaction</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {paymentMethod === 'mpesa'
                  ? 'Connecting to Safaricom Daraja API gateway...'
                  : 'Updating invoice balance and recording official cash ledger receipt...'}
              </p>
            </div>
          )}

          {step === 'prompted' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ position: 'relative', width: '76px', height: '76px', margin: '0 auto 16px' }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: 'rgba(0, 166, 81, 0.25)',
                    animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                  }}
                />
                <div
                  style={{
                    position: 'relative',
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    background: 'rgba(0, 166, 81, 0.15)',
                    border: '2px solid #00A651',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00A651',
                  }}
                >
                  <Smartphone size={36} />
                </div>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0', color: '#10B981' }}>
                Check Your Phone Screen
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                Safaricom M-Pesa prompt dispatched for <strong>KES {(Number(amount) || 0).toLocaleString()}</strong> to{' '}
                <strong style={{ color: 'var(--crema-gold)' }}>{formatMpesaPhoneNumber(phone)}</strong>
              </p>

              {/* Countdown badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '7px 16px',
                  borderRadius: '20px',
                  marginBottom: '16px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: '#10B981',
                }}
              >
                <Clock size={15} />
                <span>Waiting for your PIN ({countdown}s remaining)</span>
              </div>

              {/* Checkout details card */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '18px',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Student:</span>
                  <span style={{ fontWeight: 600 }}>{profile?.full_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Invoice No:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{activeInvoice?.invoice_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Checkout ID:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {checkoutInfo?.checkoutRequestId || 'ws_CO_' + Date.now()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Live Gateway Status:</span>
                  <span style={{ color: '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Loader2 size={13} className="spin" />
                    {pollMessage || 'Awaiting Customer PIN Authorization'}
                  </span>
                </div>
              </div>

              {/* Action */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-gold"
                  disabled={isConfirming}
                  onClick={async () => {
                    setPollMessage('Confirming PIN verification and issuing receipt...');
                    await handleConfirmMpesaPayment();
                  }}
                  style={{
                    flex: 2,
                    padding: '10px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {isConfirming ? (
                    <>
                      <Loader2 size={15} className="spin" />
                      <span>Issuing Receipt...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>I Entered PIN — Confirm & Issue Receipt</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelPrompt}
                  style={{ flex: 1, padding: '10px', fontSize: '0.85rem', color: '#EF4444' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'success' && createdPayment && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: submittedForVerification ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: submittedForVerification ? '2px solid #F59E0B' : '2px solid var(--aur-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                  color: submittedForVerification ? '#FBBF24' : 'var(--aur-emerald)',
                }}
              >
                {submittedForVerification ? <Clock size={30} /> : <CheckCircle2 size={32} />}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                {submittedForVerification
                  ? 'M-Pesa Confirmation Queued for Verification!'
                  : 'Payment Received & Recorded!'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                Ref No: <strong style={{ color: 'var(--crema-gold)' }}>{createdPayment.mpesa_receipt_number || createdPayment.id}</strong> • Campus: <strong>{branch?.name}</strong>
              </p>

              {submittedForVerification && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    marginBottom: '18px',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#FBBF24', marginBottom: '4px' }}>
                    ⏳ Under Bursar Review: KES {(Number(createdPayment.amount) || 0).toLocaleString()}
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    Your Safaricom M-Pesa confirmation has been forwarded to the <strong>{branch?.name}</strong> campus bursar desk. Once approved, your invoice balance will be updated and an official receipt dispatched to your phone and email.
                  </div>
                </div>
              )}

              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '20px',
                  textAlign: 'left',
                  fontSize: '0.84rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Student:</span>
                  <span style={{ fontWeight: 600 }}>{profile?.full_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Amount Credited:</span>
                  <span style={{ fontWeight: 700, color: 'var(--aur-emerald)' }}>
                    KES {createdPayment.amount.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Payment Channel:</span>
                  <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>
                    {createdPayment.payment_method}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Date & Time:</span>
                  <span>{new Date(createdPayment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={handleDownloadReceipt}
                  style={{ width: '100%', padding: '10px' }}
                >
                  <Download size={16} />
                  <span>Download Official PDF Receipt</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      if (createdPayment && profile && activeInvoice) {
                        shareReceiptOnWhatsApp({
                          studentName: profile.full_name,
                          studentEmail: profile.email,
                          studentPhone: profile.phone || phone,
                          regNumber: profile.reg_number,
                          courseTitle: course?.title || 'Specialty Coffee Program',
                          receiptNumber: createdPayment.mpesa_receipt_number || createdPayment.id.slice(0, 8).toUpperCase(),
                          amount: createdPayment.amount,
                          totalFee: activeInvoice.total_fee,
                          balanceDue: Math.max(0, activeInvoice.balance_due - createdPayment.amount),
                          branchName: branch?.name || 'Aurevia Academy',
                          paymentDate: new Date(createdPayment.created_at).toLocaleDateString('en-GB'),
                        });
                      }
                    }}
                    style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                  >
                    <MessageSquare size={14} color="#25D366" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      if (createdPayment && profile && activeInvoice) {
                        shareReceiptViaEmail({
                          studentName: profile.full_name,
                          studentEmail: profile.email,
                          studentPhone: profile.phone || phone,
                          regNumber: profile.reg_number,
                          courseTitle: course?.title || 'Specialty Coffee Program',
                          receiptNumber: createdPayment.mpesa_receipt_number || createdPayment.id.slice(0, 8).toUpperCase(),
                          amount: createdPayment.amount,
                          totalFee: activeInvoice.total_fee,
                          balanceDue: Math.max(0, activeInvoice.balance_due - createdPayment.amount),
                          branchName: branch?.name || 'Aurevia Academy',
                          paymentDate: new Date(createdPayment.created_at).toLocaleDateString('en-GB'),
                        });
                      }
                    }}
                    style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                  >
                    <Mail size={14} color="#60A5FA" />
                    <span>Email</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  style={{ marginTop: '8px' }}
                >
                  Done & Close
                </button>

                {/* Revert / Undo action for test payments or accidental deductions */}
                <button
                  type="button"
                  disabled={isReverting}
                  onClick={async () => {
                    if (
                      createdPayment &&
                      window.confirm(
                        `Revert this payment of KES ${createdPayment.amount.toLocaleString()} and restore student fee balance?`
                      )
                    ) {
                      setIsReverting(true);
                      try {
                        await revertPayment(createdPayment.id);
                        if (onSuccess) onSuccess();
                        onClose();
                      } catch (err: any) {
                        alert('Could not revert payment: ' + err.message);
                      } finally {
                        setIsReverting(false);
                      }
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.74rem',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  {isReverting
                    ? 'Reverting...'
                    : `Recorded as a test? Click here to revert KES ${createdPayment.amount.toLocaleString()} and restore balance`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
