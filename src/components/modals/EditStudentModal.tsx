import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { StudentKYC, Profile } from '../../types/database.types';
import { X, Edit, CheckCircle2, User, Globe, Heart, Phone, ShieldCheck } from 'lucide-react';

interface EditStudentModalProps {
  student: StudentKYC;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({ student, onClose, onSuccess }) => {
  const { profiles, updateStudentKYC } = useApp();
  const profile = profiles.find((p) => p.id === student?.profile_id) || student?.profile;

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [dob, setDob] = useState(student?.dob || '2001-05-14');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>(
    student?.gender || 'Female'
  );
  const [nationality, setNationality] = useState(student?.nationality || 'Kenyan');
  const [nationalId, setNationalId] = useState(student?.national_id_or_passport || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [coffeeExperience, setCoffeeExperience] = useState(student?.coffee_experience_level || 'Beginner');
  const [medicalConditions, setMedicalConditions] = useState(student?.medical_conditions || 'None');
  const [emergencyName, setEmergencyName] = useState(student?.emergency_contact_name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(student?.emergency_contact_phone || '');
  const [emergencyRelationship, setEmergencyRelationship] = useState(
    student?.emergency_contact_relationship || 'Parent'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateStudentKYC(student.id, {
        fullName,
        email,
        phone,
        nationalId,
        dob,
        gender,
        nationality,
        medicalConditions,
        emergencyName,
        emergencyPhone,
        emergencyRelationship,
        coffeeExperience,
      });
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      alert('Error updating trainee: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div
          style={{
            padding: '20px 24px',
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
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(212, 154, 91, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--crema-gold)',
              }}
            >
              <Edit size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Edit Trainee KYC Record</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {profile?.reg_number || 'Trainee ID'}: {profile?.full_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {isSaved ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <CheckCircle2 size={48} color="#6EE7B7" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '1.2rem', color: '#6EE7B7' }}>Changes Saved Successfully!</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Trainee profile updated.</p>
            </div>
          ) : (
            <>
              {/* SECTION 1: Personal & Identity */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.88rem', color: 'var(--crema-gold)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} />
                  <span>Personal Details</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input
                      type="date"
                      className="form-input"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      className="form-select"
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nationality</label>
                    <input
                      type="text"
                      className="form-input"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">National ID / Passport</label>
                    <input
                      type="text"
                      className="form-input"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Coffee Experience</label>
                    <select
                      className="form-select"
                      value={coffeeExperience}
                      onChange={(e) => setCoffeeExperience(e.target.value)}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Home Barista">Home Barista</option>
                      <option value="Working Professional">Working Professional</option>
                      <option value="Café Owner / Manager">Café Owner / Manager</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Medical Conditions */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.88rem', color: 'var(--crema-gold)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Heart size={14} />
                  <span>Medical Conditions & Lab Allergies</span>
                </h4>
                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    value={medicalConditions}
                    onChange={(e) => setMedicalConditions(e.target.value)}
                    placeholder="e.g. None, Caffeine sensitivity, Lactose intolerance, Asthma"
                  />
                </div>
              </div>

              {/* SECTION 3: Emergency Contact */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.88rem', color: 'var(--crema-gold)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} />
                  <span>Emergency Contact</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Contact Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Relationship</label>
                    <select
                      className="form-select"
                      value={emergencyRelationship}
                      onChange={(e) => setEmergencyRelationship(e.target.value)}
                    >
                      <option value="Parent">Parent</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Employer">Employer</option>
                      <option value="Friend">Friend</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Trainee Changes'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
