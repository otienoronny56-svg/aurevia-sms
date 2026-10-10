import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import {
  X, UserPlus, Sparkles, CheckCircle2, ShieldCheck, Coffee,
  Calendar, Phone, Mail, FileText, Heart, AlertTriangle, User, Globe,
  Copy, Check, Key, GraduationCap, Tag, Percent, ChevronDown, ChevronUp, DollarSign
} from 'lucide-react';
import { PRODUCTION_PORTAL_URL } from '../../lib/domainConfig';

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

  // Fee Adjustment & Discount
  const [showFeeCustomization, setShowFeeCustomization] = useState(false);
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed' | 'custom'>('none');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [discountReason, setDiscountReason] = useState('Early Bird Intake');
  const [customFeeAmount, setCustomFeeAmount] = useState<number | ''>('');
  const [discountNote, setDiscountNote] = useState('');

  // Medical & Health Lab Safety
  const [medicalConditions, setMedicalConditions] = useState('None');

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('Parent');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRegNo, setCreatedRegNo] = useState<string | null>(null);
  const [createdStudentDetails, setCreatedStudentDetails] = useState<{ regNumber: string; initialPassword?: string; studentName: string } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Campus-isolated courses: Lion Hills only sees Lion Hills courses, Nairobi only sees Nairobi courses
  const availableCourses = courses.filter((c) => {
    if (branchId === '470b5cb5-59e2-4be0-b19b-182d9795e12b') {
      return c.branch_id === branchId || c.code.startsWith('LH-');
    }
    return (!c.branch_id || c.branch_id === branchId) && !c.code.startsWith('LH-');
  });

  // Filter cohorts matching selected branch & course
  const availableCohorts = cohorts.filter(
    (c) => c.branch_id === branchId && c.course_id === courseId
  );

  // Keep courseId synchronized when campus changes
  React.useEffect(() => {
    if (availableCourses.length > 0 && !availableCourses.some((c) => c.id === courseId)) {
      setCourseId(availableCourses[0].id);
    }
  }, [branchId, courses]);

  // Set default cohort when course/branch changes
  React.useEffect(() => {
    if (availableCohorts.length > 0) {
      setCohortId(availableCohorts[0].id);
    } else {
      setCohortId('');
    }
  }, [branchId, courseId, cohorts]);

  const selectedBranch = branches.find((b) => b.id === branchId) || branches[0];
  const selectedCourse = availableCourses.find((c) => c.id === courseId) || availableCourses[0] || courses[0];

  // Dynamic fee calculations
  const standardTuition = Number(selectedCourse?.fee_amount) || 35000;
  let computedDiscount = 0;
  let finalPayableFee = standardTuition;

  if (showFeeCustomization) {
    if (discountType === 'percentage' && discountValue !== '') {
      const pct = Math.min(100, Math.max(0, Number(discountValue)));
      computedDiscount = Math.round((standardTuition * pct) / 100);
      finalPayableFee = Math.max(0, standardTuition - computedDiscount);
    } else if (discountType === 'fixed' && discountValue !== '') {
      computedDiscount = Math.min(standardTuition, Math.max(0, Number(discountValue)));
      finalPayableFee = Math.max(0, standardTuition - computedDiscount);
    } else if (discountType === 'custom' && customFeeAmount !== '') {
      finalPayableFee = Math.max(0, Number(customFeeAmount));
      computedDiscount = Math.max(0, standardTuition - finalPayableFee);
    }
  }

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
        customFee: showFeeCustomization ? finalPayableFee : undefined,
        discountAmount: showFeeCustomization && computedDiscount > 0 ? computedDiscount : 0,
        discountType: showFeeCustomization && discountType !== 'none' ? discountType : undefined,
        discountReason: showFeeCustomization && computedDiscount > 0 ? discountReason : undefined,
        discountNote: showFeeCustomization && discountNote.trim() ? discountNote.trim() : undefined,
      });

      setCreatedRegNo(result.regNumber);
      setCreatedStudentDetails({
        regNumber: result.regNumber,
        initialPassword: result.profile?.initial_password,
        studentName: fullName,
      });
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
                  maxWidth: '480px',
                  margin: '0 auto 24px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--crema-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Key size={14} />
                    <span>ACADEMY PORTAL CREDENTIALS</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      const text = `Aurevia Academy Portal Access\nStudent: ${fullName}\nPortal: ${PRODUCTION_PORTAL_URL}\nReg No / Login: ${createdRegNo}\nDefault Password: ${createdStudentDetails?.initialPassword || 'Aur@2026#Student'}\nSign in to access your course timetable, attendance register, and class resources.`;
                      navigator.clipboard.writeText(text);
                      setCopiedCreds(true);
                      setTimeout(() => setCopiedCreds(false), 2500);
                    }}
                  >
                    {copiedCreds ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                    <span>{copiedCreds ? 'Copied!' : 'Copy Login Details'}</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Student Reg Number (Login ID)</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--crema-gold)', marginTop: '2px' }}>
                      {createdRegNo}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Initial Portal Password</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '2px' }}>
                      {createdStudentDetails?.initialPassword || 'Aur@2026#Student'}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>
                    Portal: <strong style={{ color: '#10B981' }}>{PRODUCTION_PORTAL_URL}</strong>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {selectedCourse?.title}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={onClose}>
                  Done & View in Directory
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
                      {availableCourses.map((c) => (
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

              {/* Tuition, Fee Customization & Discount Engine */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: showFeeCustomization ? '1px solid rgba(212, 154, 91, 0.4)' : '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showFeeCustomization ? '16px' : '0' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Program Tuition & Invoice Setup
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--crema-gold)' }}>
                        KES {finalPayableFee.toLocaleString()}
                      </span>
                      {showFeeCustomization && computedDiscount > 0 && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                          KES {standardTuition.toLocaleString()}
                        </span>
                      )}
                      {showFeeCustomization && computedDiscount > 0 && (
                        <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          Save KES {computedDiscount.toLocaleString()} ({Math.round((computedDiscount / standardTuition) * 100)}% off)
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFeeCustomization(!showFeeCustomization);
                        if (!showFeeCustomization && discountType === 'none') {
                          setDiscountType('percentage');
                          setDiscountValue(10);
                        }
                      }}
                      className="btn btn-secondary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderColor: showFeeCustomization ? 'var(--crema-gold)' : 'var(--border-subtle)',
                        color: showFeeCustomization ? 'var(--crema-gold)' : 'var(--text-primary)',
                      }}
                    >
                      <Tag size={14} />
                      <span>{showFeeCustomization ? 'Hide Discount Controls' : 'Edit Fee / Apply Discount'}</span>
                      {showFeeCustomization ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Fee & Discount Customization Box */}
                {showFeeCustomization && (
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '6px' }}>
                        Adjustment Mode
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                        {[
                          { id: 'none', label: 'Standard Rate' },
                          { id: 'percentage', label: 'Percentage (%) Off' },
                          { id: 'fixed', label: 'Fixed Amount (KES) Off' },
                          { id: 'custom', label: 'Direct Fee Override' },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setDiscountType(m.id as any);
                              if (m.id === 'percentage' && (discountValue === '' || discountValue === 0)) setDiscountValue(10);
                              if (m.id === 'fixed' && (discountValue === '' || discountValue === 0)) setDiscountValue(5000);
                              if (m.id === 'custom' && customFeeAmount === '') setCustomFeeAmount(standardTuition);
                            }}
                            style={{
                              padding: '6px 8px',
                              fontSize: '0.74rem',
                              fontWeight: discountType === m.id ? 700 : 500,
                              borderRadius: 'var(--radius-sm)',
                              border: discountType === m.id ? '1px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
                              background: discountType === m.id ? 'rgba(212, 154, 91, 0.15)' : 'var(--bg-surface)',
                              color: discountType === m.id ? 'var(--crema-gold)' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {discountType === 'percentage' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>
                              Discount Percentage (%)
                            </label>
                            <div style={{ position: 'relative' }}>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                className="form-input"
                                value={discountValue}
                                onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="e.g. 10"
                                style={{ paddingRight: '32px' }}
                              />
                              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                %
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>
                              Discount Category / Reason
                            </label>
                            <select
                              className="form-select"
                              value={discountReason}
                              onChange={(e) => setDiscountReason(e.target.value)}
                            >
                              <option value="Early Bird Intake">Early Bird Intake</option>
                              <option value="Scholarship / Institutional Bursary">Scholarship / Bursary</option>
                              <option value="Staff & Family Privilege">Staff & Family Privilege</option>
                              <option value="Corporate / Group Enrollment">Corporate / Group Enrollment</option>
                              <option value="Referral Incentive">Referral Incentive</option>
                              <option value="Financial Hardship Concession">Financial Hardship Concession</option>
                              <option value="Executive Management Waiver">Executive Management Waiver</option>
                            </select>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Quick Presets:</span>
                          {[5, 10, 15, 20, 25, 50].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setDiscountValue(pct)}
                              style={{
                                padding: '2px 8px',
                                fontSize: '0.7rem',
                                borderRadius: '4px',
                                border: discountValue === pct ? '1px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
                                background: discountValue === pct ? 'rgba(212, 154, 91, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                color: discountValue === pct ? 'var(--crema-gold)' : 'var(--text-muted)',
                                cursor: 'pointer',
                              }}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {discountType === 'fixed' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>
                            Fixed Discount Amount (KES)
                          </label>
                          <input
                            type="number"
                            min="100"
                            max={standardTuition}
                            step="500"
                            className="form-input"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="e.g. 5000"
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>
                            Discount Category / Reason
                          </label>
                          <select
                            className="form-select"
                            value={discountReason}
                            onChange={(e) => setDiscountReason(e.target.value)}
                          >
                            <option value="Early Bird Intake">Early Bird Intake</option>
                            <option value="Scholarship / Institutional Bursary">Scholarship / Bursary</option>
                            <option value="Staff & Family Privilege">Staff & Family Privilege</option>
                            <option value="Corporate / Group Enrollment">Corporate / Group Enrollment</option>
                            <option value="Referral Incentive">Referral Incentive</option>
                            <option value="Financial Hardship Concession">Financial Hardship Concession</option>
                            <option value="Executive Management Waiver">Executive Management Waiver</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {discountType === 'custom' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>
                            Agreed Net Tuition Fee (KES)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            className="form-input"
                            value={customFeeAmount}
                            onChange={(e) => setCustomFeeAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder={`Standard: ${standardTuition}`}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>
                            Adjustment Category
                          </label>
                          <select
                            className="form-select"
                            value={discountReason}
                            onChange={(e) => setDiscountReason(e.target.value)}
                          >
                            <option value="Special Bursar Approval">Special Bursar Approval</option>
                            <option value="Custom Negotiated Rate">Custom Negotiated Rate</option>
                            <option value="Scholarship Grant">Scholarship Grant</option>
                            <option value="Executive Discretion">Executive Discretion</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {discountType !== 'none' && (
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>
                          Optional Bursar Audit Note / Approval Reference
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={discountNote}
                          onChange={(e) => setDiscountNote(e.target.value)}
                          placeholder="e.g. Authorized by Academic Dean / Promo voucher #AUR2026"
                        />
                      </div>
                    )}

                    {/* Breakdown Summary Box */}
                    <div
                      style={{
                        background: 'rgba(212, 154, 91, 0.08)',
                        border: '1px solid rgba(212, 154, 91, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Standard Tuition: </span>
                          <span style={{ fontWeight: 600 }}>KES {standardTuition.toLocaleString()}</span>
                        </div>
                        {computedDiscount > 0 && (
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Discount: </span>
                            <span style={{ fontWeight: 700, color: '#10B981' }}>- KES {computedDiscount.toLocaleString()} ({discountReason})</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Net Payable on Invoice: </span>
                        <span style={{ fontWeight: 800, color: 'var(--crema-gold)', fontSize: '0.92rem' }}>
                          KES {finalPayableFee.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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
