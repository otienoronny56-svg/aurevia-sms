import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import {
  Smartphone,
  CreditCard,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

interface ConfigureBranchPaybillModalProps {
  branchId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ConfigureBranchPaybillModal: React.FC<ConfigureBranchPaybillModalProps> = ({
  branchId,
  onClose,
  onSuccess,
}) => {
  const { currentProfile, branches, updateBranchPaymentConfig } = useApp();
  const isSuperAdmin = currentProfile?.role === 'super_admin';
  const branch = branches.find((b) => b.id === branchId) || branches[0];

  const initialPaybill = branch?.paybill_number || '174379';
  const initialAccount = branch?.paybill_account_name || (branch?.code ? `AUREVIA-${branch.code}` : 'AUREVIA-HQ');

  const getDefaultInstructions = (pb: string, acc: string) =>
    `Pay via Paybill ${pb} and Account Number ${acc}, then paste your M-Pesa message in your trainee portal.`;

  const [paybillNumber, setPaybillNumber] = useState(initialPaybill);
  const [paybillAccountNumber, setPaybillAccountNumber] = useState(initialAccount);
  const [isCustomDirty, setIsCustomDirty] = useState(false);
  const [paymentInstructions, setPaymentInstructions] = useState(
    branch?.payment_instructions || getDefaultInstructions(initialPaybill, initialAccount)
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // When paybill number changes, auto-sync instructions if user hasn't customized
  const handlePaybillChange = (val: string) => {
    setPaybillNumber(val);
    if (!isCustomDirty) {
      setPaymentInstructions(getDefaultInstructions(val, paybillAccountNumber));
    }
  };

  // When account number changes, auto-sync instructions if user hasn't customized
  const handleAccountChange = (val: string) => {
    const upper = val.toUpperCase();
    setPaybillAccountNumber(upper);
    if (!isCustomDirty) {
      setPaymentInstructions(getDefaultInstructions(paybillNumber, upper));
    }
  };

  const handleResetInstructions = () => {
    setIsCustomDirty(false);
    setPaymentInstructions(getDefaultInstructions(paybillNumber, paybillAccountNumber));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch) return;

    if (!paybillNumber.trim()) {
      setErrorMessage('Please provide a valid Safaricom M-Pesa Paybill Number.');
      return;
    }
    if (!paybillAccountNumber.trim()) {
      setErrorMessage('Please provide the M-Pesa Account Number that trainees must use.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      await updateBranchPaymentConfig(branch.id, {
        paybill_number: paybillNumber.trim(),
        paybill_account_name: paybillAccountNumber.trim(),
        payment_instructions: paymentInstructions.trim(),
      });

      setSuccessMessage('Paybill and Account Number published in real time.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save campus paybill configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
        }}
      >
        <div
          className="glass-card"
          style={{
            width: '100%',
            maxWidth: '440px',
            padding: '28px',
            textAlign: 'center',
            borderRadius: '16px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
              margin: '0 auto 16px auto',
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>
            Super Administrator Authorization Required
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
            Institutional banking credentials and Safaricom M-Pesa Paybill numbers are centralized and may only be altered by the Head Office Super Administrator.
          </p>
          <button className="btn btn-secondary" onClick={onClose} style={{ width: '100%' }}>
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          border: '1px solid rgba(212, 154, 91, 0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(212, 154, 91, 0.15) 0%, rgba(24, 19, 16, 0.4) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#00A651',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Smartphone size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                Configure Campus M-Pesa Paybill
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {branch?.name || 'Selected Campus'} • Live Trainee Portal Sync
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #EF4444',
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

          {successMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10B981',
                color: '#6EE7B7',
                fontSize: '0.8rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Paybill Number and Account Number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={14} color="#00A651" />
                Paybill Number
              </label>
              <input
                type="text"
                className="form-input"
                value={paybillNumber}
                onChange={(e) => handlePaybillChange(e.target.value)}
                placeholder="e.g. 174379"
                required
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Safaricom Business Number
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CreditCard size={14} color="var(--crema-gold)" />
                Account Number
              </label>
              <input
                type="text"
                className="form-input"
                value={paybillAccountNumber}
                onChange={(e) => handleAccountChange(e.target.value)}
                placeholder="e.g. AUREVIA-NBO"
                required
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Account reference for trainees
              </span>
            </div>
          </div>

          {/* Custom Trainee Instructions */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <HelpCircle size={14} color="var(--crema-gold)" />
                Custom Instructions Shown to Trainees
              </label>
              <button
                type="button"
                onClick={handleResetInstructions}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--crema-gold)',
                  fontSize: '0.72rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
                title="Reset to real-time Paybill & Account Number format"
              >
                <RotateCcw size={12} />
                <span>Auto-sync text</span>
              </button>
            </div>
            <textarea
              className="form-input"
              rows={3}
              value={paymentInstructions}
              onChange={(e) => {
                setIsCustomDirty(true);
                setPaymentInstructions(e.target.value);
              }}
              placeholder="e.g. Pay via Paybill 174379 and Account Number AUREVIA-NBO, then paste your M-Pesa message in your trainee portal."
              style={{ fontSize: '0.82rem', lineHeight: 1.45 }}
            />
          </div>

          {/* Real-time Trainee View Preview */}
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(0, 166, 81, 0.06)',
              border: '1px solid rgba(0, 166, 81, 0.2)',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Live Trainee Screen Preview
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, fontStyle: 'italic' }}>
              "{paymentInstructions}"
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSaving}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
              style={{
                padding: '8px 18px',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#00A651',
                borderColor: '#00A651',
                color: '#fff',
              }}
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving...' : 'Save & Publish in Real Time'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
