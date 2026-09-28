import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { X, Key, CheckCircle2, ShieldCheck, Eye, EyeOff, Lock } from 'lucide-react';

interface ChangeMyPasswordModalProps {
  onClose: () => void;
}

export const ChangeMyPasswordModal: React.FC<ChangeMyPasswordModalProps> = ({ onClose }) => {
  const { currentProfile, resetStaffPassword } = useApp();

  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    setIsSaving(true);
    try {
      await resetStaffPassword(currentProfile.id, newPassword);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1300 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#181310',
              }}
            >
              <Lock size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Change Account Password</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {currentProfile.full_name} ({currentProfile.staff_id || currentProfile.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle2 size={44} color="#6EE7B7" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '1.2rem', color: '#6EE7B7' }}>Password Changed Successfully!</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Your new password is now active for future logins.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {errorMsg && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--cherry-red)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  marginBottom: '16px',
                }}
              >
                {errorMsg}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Current / Initial Password *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={currentPasswordInput}
                onChange={(e) => setCurrentPasswordInput(e.target.value)}
                placeholder="Enter current or default password"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">New Password *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Confirm New Password *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                />
                <span>Show passwords</span>
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Default was: <code>Aurevia@2026!</code>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Updating...' : 'Update My Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
