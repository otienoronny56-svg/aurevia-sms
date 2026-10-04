import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Branch } from '../../types/database.types';
import { Building2, X, Save, ShieldCheck } from 'lucide-react';

interface EditBranchModalProps {
  branch: Branch;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditBranchModal: React.FC<EditBranchModalProps> = ({
  branch,
  onClose,
  onSuccess,
}) => {
  const { updateBranch } = useApp();

  const [name, setName] = useState(branch.name || '');
  const [code, setCode] = useState(branch.code || '');
  const [city, setCity] = useState(branch.city || '');
  const [address, setAddress] = useState(branch.address || '');
  const [country, setCountry] = useState(branch.country || 'Kenya');
  const [phone, setPhone] = useState(branch.phone || '');
  const [email, setEmail] = useState(branch.email || '');
  const [managerName, setManagerName] = useState(branch.manager_name || '');
  const [isActive, setIsActive] = useState<boolean>(branch.is_active ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setErrorMsg('Campus Name and Branch Code are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await updateBranch(branch.id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        city: city.trim(),
        address: address.trim(),
        country: country.trim(),
        phone: phone.trim(),
        email: email.trim(),
        manager_name: managerName.trim() || undefined,
        is_active: isActive,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Update branch error:', err);
      setErrorMsg(err?.message || 'Failed to update campus facility.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 1300,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="modal-content glass-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: 0,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(212, 154, 91, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--crema-gold)',
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Edit Campus Facility
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Update regional details, director assignment, and contact parameters
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {errorMsg && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#FCA5A5',
                fontSize: '0.82rem',
              }}
            >
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Campus Code & Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                  Code *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. NBO"
                  maxLength={6}
                  required
                  style={{ width: '100%', textTransform: 'uppercase', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                  Campus Facility Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aurevia Coffee Institute"
                  required
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* City & Address */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                  City *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Nairobi"
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                  Country
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Kenya"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                Physical Address / Premises *
              </label>
              <input
                type="text"
                className="input-field"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Spring Valley Coffee Hub, Westlands"
                required
                style={{ width: '100%' }}
              />
            </div>

            {/* Phone & Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                  Official Phone
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 711 234 567"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                  Contact Email
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="campus@aureviacoffee.com"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Manager Name & Active Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                  Designated Campus Director
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="e.g. Campus Manager Name"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                  Operating Status
                </label>
                <select
                  className="input-field"
                  value={isActive ? 'active' : 'inactive'}
                  onChange={(e) => setIsActive(e.target.value === 'active')}
                  style={{ width: '100%' }}
                >
                  <option value="active">Active Center</option>
                  <option value="inactive">Temporarily Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isSubmitting ? (
                <span>Saving Changes...</span>
              ) : (
                <>
                  <Save size={16} />
                  <span>Update Campus</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
