import React, { useState } from 'react';
import { Alumni } from '../../types/database.types';
import { Edit3, Trash2, X, Check, AlertTriangle, Building, Briefcase, Mail, Phone, Award } from 'lucide-react';

interface EditAlumniModalProps {
  alumni: Alumni | null;
  onClose: () => void;
  onUpdate: (alumniId: string, updates: Partial<Alumni>) => Promise<void>;
  onDelete: (alumniId: string) => Promise<void>;
}

export const EditAlumniModal: React.FC<EditAlumniModalProps> = ({
  alumni,
  onClose,
  onUpdate,
  onDelete,
}) => {
  if (!alumni) return null;

  const [fullName, setFullName] = useState(alumni.full_name || '');
  const [email, setEmail] = useState(alumni.email || '');
  const [phone, setPhone] = useState(alumni.phone || '');
  const [currentEmployer, setCurrentEmployer] = useState(alumni.current_employer || '');
  const [jobTitle, setJobTitle] = useState(alumni.job_title || '');
  const [employmentStatus, setEmploymentStatus] = useState<string>(alumni.employment_status || 'Employed');
  const [certificationName, setCertificationName] = useState(alumni.certification_name || '');
  const [certificateSerialNo, setCertificateSerialNo] = useState(alumni.certificate_serial_no || '');
  const [graduationYear, setGraduationYear] = useState<number>(alumni.graduation_year || new Date().getFullYear());
  const [graduationMonth, setGraduationMonth] = useState(alumni.graduation_month || 'October');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setIsSubmitting(true);
    try {
      await onUpdate(alumni.id, {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        current_employer: currentEmployer.trim(),
        job_title: jobTitle.trim(),
        employment_status: employmentStatus,
        certification_name: certificationName.trim(),
        certificate_serial_no: certificateSerialNo.trim(),
        graduation_year: graduationYear,
        graduation_month: graduationMonth,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update alumni:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await onDelete(alumni.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete alumni:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div
        className="modal-content glass-card"
        style={{
          maxWidth: '560px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
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
            background: 'var(--bg-surface-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(212, 154, 91, 0.15)',
                color: 'var(--crema-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Edit3 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Edit Alumni Record
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Update graduate profile, career placement & certification details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Full Name */}
            <div>
              <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                Graduate Full Name *
              </label>
              <input
                type="text"
                className="form-control"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            {/* Email & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '32px' }}
                  />
                  <Mail
                    size={14}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                  Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    className="form-control"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ paddingLeft: '32px' }}
                  />
                  <Phone
                    size={14}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>
            </div>

            {/* Career & Employer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                  Current Employer / Cafe
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Java House, Artcaffe"
                    value={currentEmployer}
                    onChange={(e) => setCurrentEmployer(e.target.value)}
                    style={{ paddingLeft: '32px' }}
                  />
                  <Building
                    size={14}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                  Job Title
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Head Barista, Roaster"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    style={{ paddingLeft: '32px' }}
                  />
                  <Briefcase
                    size={14}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>
            </div>

            {/* Employment Status */}
            <div>
              <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                Employment Status
              </label>
              <select
                className="form-control"
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
              >
                <option value="Employed Full-time">Employed Full-time</option>
                <option value="Employed">Employed</option>
                <option value="Freelance Barista">Freelance Barista</option>
                <option value="Coffee Shop Owner / Entrepreneur">Coffee Shop Owner / Entrepreneur</option>
                <option value="Head Barista / Lead Trainer">Head Barista / Lead Trainer</option>
                <option value="International Placement">International Placement</option>
                <option value="Seeking Placement">Seeking Placement</option>
              </select>
            </div>

            {/* Certification Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                  Certification Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={certificationName}
                  onChange={(e) => setCertificationName(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                  Certificate Serial No
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={certificateSerialNo}
                  onChange={(e) => setCertificateSerialNo(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>

            {/* Graduation Term */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                  Graduation Month
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={graduationMonth}
                  onChange={(e) => setGraduationMonth(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                  Graduation Year
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(parseInt(e.target.value) || 2026)}
                />
              </div>
            </div>

            {/* Delete Zone */}
            {isConfirmingDelete ? (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  marginTop: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontWeight: 600, fontSize: '0.8rem', marginBottom: '6px' }}>
                  <AlertTriangle size={16} />
                  <span>Confirm Deleting Alumni Record?</span>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                  This will remove <strong>{alumni.full_name}</strong> from the alumni registry.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ background: '#EF4444', color: '#fff', padding: '5px 12px', fontSize: '0.75rem' }}
                    onClick={handleDelete}
                    disabled={isSubmitting}
                  >
                    Yes, Delete Permanently
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                    onClick={() => setIsConfirmingDelete(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EF4444',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  <Trash2 size={13} />
                  <span>Delete this alumni record</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: 'var(--bg-surface-elevated)',
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
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Check size={14} />
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
