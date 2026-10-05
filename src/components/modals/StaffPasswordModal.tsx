import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Profile } from '../../types/database.types';
import { X, Key, ShieldCheck, CheckCircle2, Copy, Check, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface StaffPasswordModalProps {
  staff: Profile;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StaffPasswordModal: React.FC<StaffPasswordModalProps> = ({ staff, onClose, onSuccess }) => {
  const { resetStaffPassword } = useApp();

  const [newPassword, setNewPassword] = useState('Aurevia@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = 'Aur@';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(res + '!');
  };

  const handleCopy = () => {
    const text = `Staff Member: ${staff.full_name}\nStaff ID / Login: ${staff.staff_id || staff.email}\nNew Password: ${newPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);

    try {
      await resetStaffPassword(staff.id, newPassword);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      alert('Error updating password: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(212, 154, 91, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--crema-gold)',
              }}
            >
              <Key size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Manage Staff Password</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {staff.full_name} ({staff.staff_id || staff.email})
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
            <h4 style={{ fontSize: '1.2rem', color: '#6EE7B7' }}>Password Updated!</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              New password has been saved for {staff.full_name}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
                fontSize: '0.82rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Staff Login ID</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--crema-gold)' }}>
                  {staff.staff_id || staff.reg_number || 'AUR/NBO/STF-001'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Password Status</div>
                <span className="badge badge-paid" style={{ fontSize: '0.65rem' }}>
                  {staff.password_changed ? 'Custom Password Set' : 'Initial Password Active'}
                </span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Set New Temporary Password *
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--crema-gold)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RefreshCw size={11} /> Generate Random
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', paddingRight: '75px' }}
                  required
                />
                <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    title="Copy Password"
                  >
                    {copied ? <Check size={14} color="#6EE7B7" /> : <Copy size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    title="Toggle Visibility"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              * Resetting the password allows the staff member to log into their instructor or manager portal immediately.
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isResetting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isResetting}>
                {isResetting ? 'Saving Password...' : 'Save & Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
