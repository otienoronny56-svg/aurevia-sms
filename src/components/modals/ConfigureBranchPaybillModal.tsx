import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import {
  Building2,
  CreditCard,
  Smartphone,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Landmark,
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
  const { branches, updateBranchPaymentConfig } = useApp();
  const branch = branches.find((b) => b.id === branchId) || branches[0];

  const [paybillNumber, setPaybillNumber] = useState(branch?.paybill_number || '174379');
  const [paybillAccountName, setPaybillAccountName] = useState(branch?.paybill_account_name || (branch?.code ? `AUREVIA-${branch.code}` : 'AUREVIA-HQ'));
  const [bankName, setBankName] = useState(branch?.bank_name || 'KCB Bank Kenya');
  const [bankAccountNumber, setBankAccountNumber] = useState(branch?.bank_account_number || '1289456780');
  const [paymentInstructions, setPaymentInstructions] = useState(
    branch?.payment_instructions ||
      `Pay via Safaricom M-Pesa Paybill ${branch?.paybill_number || '174379'} using Account Name ${branch?.paybill_account_name || 'AUREVIA'}. Paste your confirmation SMS in your trainee portal for automatic bursar reconciliation.`
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch) return;

    if (!paybillNumber.trim()) {
      setErrorMessage('Please provide a valid Safaricom M-Pesa Paybill Number.');
      return;
    }
    if (!paybillAccountName.trim()) {
      setErrorMessage('Please provide the Paybill Account Name that students must use.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      await updateBranchPaymentConfig(branch.id, {
        paybill_number: paybillNumber.trim(),
        paybill_account_name: paybillAccountName.trim(),
        bank_name: bankName.trim(),
        bank_account_number: bankAccountNumber.trim(),
        payment_instructions: paymentInstructions.trim(),
      });

      setSuccessMessage('Campus Paybill & Banking configuration saved securely.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save campus paybill configuration.');
    } finally {
      setIsSaving(false);
    }
  };

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
          maxWidth: '560px',
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
                background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
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
                Configure Campus Paybill & Bank Accounts
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {branch?.name || 'Selected Campus'} • Live Student Dashboard Sync
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
          {/* Security Notice */}
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.78rem',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <ShieldCheck size={18} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#10B981' }}>Secure Backend Verification</strong>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                These banking credentials are saved in PostgreSQL with Row-Level Security. All trainees enrolled at <strong>{branch?.name}</strong> will see this exact Paybill and Account Name in their trainee portal.
              </div>
            </div>
          </div>

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

          {/* Paybill Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={14} color="#00A651" />
                Safaricom Paybill Number
              </label>
              <input
                type="text"
                className="form-input"
                value={paybillNumber}
                onChange={(e) => setPaybillNumber(e.target.value)}
                placeholder="e.g. 174379 or 522522"
                required
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Business Shortcode for M-Pesa payments.
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CreditCard size={14} color="var(--crema-gold)" />
                Campus Paybill Account Name
              </label>
              <input
                type="text"
                className="form-input"
                value={paybillAccountName}
                onChange={(e) => setPaybillAccountName(e.target.value.toUpperCase())}
                placeholder="e.g. AUREVIA-NBO"
                required
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Account string shown on student screens.
              </span>
            </div>
          </div>

          {/* Bank Wire Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Landmark size={14} color="#3B82F6" />
                Bank Name
              </label>
              <input
                type="text"
                className="form-input"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. KCB Bank Kenya"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Bank institution for EFT / Wire / Cheques.
              </span>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CreditCard size={14} color="#3B82F6" />
                Bank Account Number
              </label>
              <input
                type="text"
                className="form-input"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="e.g. 1289456780"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Official branch bank account number.
              </span>
            </div>
          </div>

          {/* Student Guidance / Instructions */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HelpCircle size={14} color="var(--crema-gold)" />
              Custom Instructions Shown to Trainees
            </label>
            <textarea
              className="form-input"
              rows={3}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              placeholder="Instructions displayed to students before and after paying fees..."
              style={{ fontSize: '0.78rem', lineHeight: 1.4 }}
            />
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
              }}
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving...' : 'Save & Publish to Students'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
