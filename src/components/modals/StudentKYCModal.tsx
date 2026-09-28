import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import {
  X, UserPlus, Sparkles, CheckCircle2, ShieldCheck, Coffee,
  Calendar, Phone, Mail, FileText, Heart, AlertTriangle, User, Globe
} from 'lucide-react';

interface StudentKYCModalProps {
  onClose: () => void;
  onSuccess?: (regNumber: string) => void;
}

export const StudentKYCModal: React.FC<StudentKYCModalProps> = ({ onClose, onSuccess }) => {
  const { currentProfile, branches, courses, cohorts, registerStudentKYC } = useApp();

  const isBranchManager = currentProfile?.role === 'branch_manager';
  const initialBranchId = isBranchManager && currentProfile.branch_id ? currentProfile.branch_id : (branches[0]?.id || '');

  // Personal & Identity
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Female');
  const [nationality, setNationality] = useState('Kenyan');
  const [nationalId, setNationalId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Course & Campus
  const [branchId, setBranchId] = useState(initialBranchId);
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [cohortId, setCohortId] = useState('');
  const [coffeeExperience, setCoffeeExperience] = useState('Beginner');

  // Medical & Health Lab Safety
  const [medicalConditions, setMedicalConditions] = useState('None');

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('Parent');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRegNo, setCreatedRegNo] = useState<string | null>(null);

  // Filter cohorts matching selected branch & course
  const availableCohorts = cohorts.filter(
    (c) => c.branch_id === branchId && c.course_id === courseId
  );

  // Set default cohort when course/branch changes
  React.useEffect(() => {
    if (availableCohorts.length > 0) {
      setCohortId(availableCohorts[0].id);
    } else {
      setCohortId('');
    }
  }, [branchId, courseId, cohorts]);

  const selectedBranch = branches.find((b) => b.id === branchId) || branches[0];
  const selectedCourse = courses.find((c) => c.id === courseId) || courses[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await registerStudentKYC({
        fullName,
        email,
        phone,
        nationalId,
        branchId,
        courseId,
        cohortId: cohortId || cohorts[0]?.id || '',
        dob,
        nationality,
        gender,
        medicalConditions,
        emergencyName,
        emergencyPhone,
        emergencyRelationship,
        coffeeExperience,
      });

      setCreatedRegNo(result.regNumber);
      if (onSuccess) onSuccess(result.regNumber);
    } catch (err: any) {
      alert('Error registering student: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#181310',
              }}
            >
              <UserPlus size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Student KYC & Digital Admission</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Official intake application & automatic Reg No generator (AUR/{selectedBranch?.code || 'NBO'}/2026/XXX)
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

        <div style={{ padding: '24px' }}>
          {createdRegNo ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(62, 114, 86, 0.2)',
                  border: '2px solid #6EE7B7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={36} color="#6EE7B7" />
              </div>
              <h4 style={{ fontSize: '1.35rem', marginBottom: '8px' }}>Trainee Admission Confirmed!</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Institutional student profile registered and welcoming SMS dispatched.
              </p>

              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--crema-gold)',
                  padding: '20px',
                  maxWidth: '420px',
                  margin: '0 auto 24px',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Assigned Registration Number
                </div>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--crema-gold)',
                    margin: '6px 0',
                  }}
                >
                  {createdRegNo}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {selectedCourse?.title} • {selectedBranch?.name}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={onClose}>
                  Complete & View in Directory
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* SECTION 1: PERSONAL & IDENTITY */}
              <div style={{ marginBottom: '24px' }}>
                <h4
                  style={{
                    fontSize: '0.92rem',
                    color: 'var(--crema-gold)',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '6px',
                  }}
                >
                  <User size={15} />
                  <span>1. Personal & Identity Details</span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Full Legal Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Faith Cherono"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Date of Birth *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Gender *</label>
                    <select
                      className="form-select"
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      required
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nationality *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      placeholder="e.g. Kenyan"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">National ID or Passport No *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="e.g. 34892104"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className="form-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="faith.cherono@gmail.com"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number (M-Pesa & SMS) *</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0712 998 877"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Coffee Experience Level</label>
                    <select
                      className="form-select"
                      value={coffeeExperience}
                      onChange={(e) => setCoffeeExperience(e.target.value)}
                    >
                      <option value="Beginner">Beginner (No Prior Experience)</option>
                      <option value="Home Barista">Home Barista / Coffee Enthusiast</option>
                      <option value="Working Professional">Working Café Barista / Roaster</option>
                      <option value="Café Owner / Manager">Café Owner / Hospitality Manager</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PROGRAM & CAMPUS */}
              <div style={{ marginBottom: '24px' }}>
                <h4
                  style={{
                    fontSize: '0.92rem',
                    color: 'var(--crema-gold)',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '6px',
                  }}
                >
                  <Coffee size={15} />
                  <span>2. Program & Campus Enrollment</span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Campus Branch *</label>
                    {isBranchManager ? (
                      <input
                        type="text"
                        className="form-input"
                        value={`${selectedBranch?.name} (${selectedBranch?.city})`}
                        disabled
                        style={{
                          background: 'var(--bg-surface-elevated)',
                          color: 'var(--crema-gold)',
                          fontWeight: 600,
                          cursor: 'not-allowed',
                          border: '1px solid var(--border-medium)',
                        }}
                      />
                    ) : (
                      <select
                        className="form-select"
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                        required
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.city})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Course Applying For *</label>
                    <select
                      className="form-select"
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      required
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} — KES {c.fee_amount.toLocaleString()} ({c.duration_weeks} Wks)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Intake Cohort & Timing *</label>
                    <select
                      className="form-select"
                      value={cohortId}
                      onChange={(e) => setCohortId(e.target.value)}
                      required
                    >
                      {availableCohorts.length > 0 ? (
                        availableCohorts.map((coh) => (
                          <option key={coh.id} value={coh.id}>
                            {coh.name} ({coh.schedule_timing})
                          </option>
                        ))
                      ) : (
                        <option value="">No Active Cohort — Auto Assign Next Batch</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: HEALTH & MEDICAL LAB SAFETY */}
              <div style={{ marginBottom: '24px' }}>
                <h4
                  style={{
                    fontSize: '0.92rem',
                    color: 'var(--crema-gold)',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '6px',
                  }}
                >
                  <Heart size={15} />
                  <span>3. Medical Conditions & Lab Safety</span>
                </h4>

                <div className="form-group">
                  <label className="form-label">
                    Medical Conditions, Sensory Allergies or Dietary Restrictions
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={medicalConditions}
                    onChange={(e) => setMedicalConditions(e.target.value)}
                    placeholder="e.g. None, Caffeine sensitivity, Lactose intolerance, Asthma in roasting areas"
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Instructors use this for safe cupping protocols, dairy handling, and roasting ventilation.
                  </span>
                </div>
              </div>

              {/* SECTION 4: EMERGENCY CONTACT */}
              <div style={{ marginBottom: '24px' }}>
                <h4
                  style={{
                    fontSize: '0.92rem',
                    color: 'var(--crema-gold)',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '6px',
                  }}
                >
                  <Phone size={15} />
                  <span>4. Emergency Contact Details</span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Contact Person Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="e.g. John Cherono"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Phone Number *</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="0722 123 456"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Relationship *</label>
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

              {/* Tuition & Invoice Overview */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 18px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Program Tuition Fee</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--crema-gold)' }}>
                    KES {selectedCourse?.fee_amount.toLocaleString() || '35,000'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Automatic Invoice & Sequence</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6EE7B7' }}>
                    AUR/{selectedBranch?.code || 'NBO'}/2026/XXX
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span>Registering...</span>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Admit Trainee & Generate Reg No</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
