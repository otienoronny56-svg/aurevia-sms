import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { X, Lock, Key, CheckCircle2, AlertCircle, ArrowRight, Smartphone, Mail, Eye, EyeOff } from 'lucide-react';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (identifier: string, newPass: string) => void;
  initialIdentifier?: string;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialIdentifier = '',
}) => {
  const { requestPasswordResetOTP, verifyOTPAndResetPassword } = useApp();

  const [step, setStep] = useState<'request' | 'verify' | 'done'>('request');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneMask, setPhoneMask] = useState('');
  const [emailMask, setEmailMask] = useState('');
  const [testOtp, setTestOtp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Please enter your email, staff ID, or student registration number.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestPasswordResetOTP(identifier.trim());
      if (!res.success) {
        setErrorMsg(res.error || 'Account not found. Check your details and try again.');
        return;
      }

      setPhoneMask(res.phoneMask || '');
      setEmailMask(res.emailMask || '');
      if (res.testOtp) setTestOtp(res.testOtp);
      setStep('verify');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to request reset OTP. Please check your network.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!otp.trim()) {
      setErrorMsg('Enter the 6-digit verification code sent to your phone/email.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Your new password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyOTPAndResetPassword(identifier.trim(), otp.trim(), newPassword);
      if (!res.success) {
        setErrorMsg(res.error || 'Verification failed. Please check the code and try again.');
        return;
      }

      setStep('done');
      if (onSuccess) {
        onSuccess(identifier.trim(), newPassword);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error updating password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1400 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          width: '92%',
          padding: 'clamp(20px, 3vw, 28px)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
          animation: 'slideUp 0.2s ease-out',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Lock size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Reset Portal Password
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Aurevia Multi-Factor Verification
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
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F87171',
              padding: '10px 12px',
              borderRadius: '6px',
              fontSize: '0.80rem',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Request OTP */}
        {step === 'request' && (
          <form onSubmit={handleRequestOTP}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Enter your registered login email, staff ID, or student registration number. We will send a secure 6-digit one-time password (OTP) to your phone & email.
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Account Identifier
              </label>
              <input
                type="text"
                className="input-field"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. name@aureviacoffeeinstitute.co.ke or AUR/NBO/..."
                required
                autoFocus
                style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>{isLoading ? 'Verifying...' : 'Send Verification OTP'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Verify OTP & Enter New Password */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyAndReset}>
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontWeight: 600, marginBottom: '4px' }}>
                <CheckCircle2 size={14} />
                <span>Verification code sent successfully</span>
              </div>
              <div>Sent to: <strong>{phoneMask}</strong> & <strong>{emailMask}</strong></div>
              {testOtp && (
                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-subtle)', fontSize: '0.72rem', color: 'var(--crema-gold)' }}>
                  Dev Preview OTP: <strong style={{ letterSpacing: '2px', fontFamily: 'monospace' }}>{testOtp}</strong>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                6-Digit Verification Code *
              </label>
              <input
                type="text"
                className="input-field"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="123456"
                required
                maxLength={6}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '1.15rem',
                  letterSpacing: '6px',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  New Secure Password *
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
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Confirm New Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep('request')}
                disabled={isLoading}
                style={{ fontSize: '0.78rem' }}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span>{isLoading ? 'Updating...' : 'Set New Password'}</span>
                <CheckCircle2 size={14} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
              Password Reset Complete!
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Your account password has been updated and cryptographically hashed with SHA-256. You can now log in with your new credentials.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
              style={{ width: '100%', padding: '11px', fontWeight: 700 }}
            >
              Proceed to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
