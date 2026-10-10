import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Course } from '../../types/database.types';
import { BookOpen, X, Save } from 'lucide-react';

interface EditCourseModalProps {
  course: Course;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditCourseModal: React.FC<EditCourseModalProps> = ({
  course,
  onClose,
  onSuccess,
}) => {
  const { updateCourse, branches, currentProfile } = useApp();
  const isBranchManager = currentProfile?.role === 'branch_manager';
  const initialBranchId = course.branch_id || (course.code?.startsWith('LH-') ? '470b5cb5-59e2-4be0-b19b-182d9795e12b' : 'b1000000-0000-0000-0000-000000000001');

  const [title, setTitle] = useState(course.title || '');
  const [code, setCode] = useState(course.code || '');
  const [targetBranchId, setTargetBranchId] = useState<string>(initialBranchId);
  const [category, setCategory] = useState<any>(course.category || 'Barista Skills');
  const [durationWeeks, setDurationWeeks] = useState<number | ''>(course.duration_weeks ?? 2);
  const [feeAmount, setFeeAmount] = useState<number | ''>(course.fee_amount ?? 35000);
  const [description, setDescription] = useState(course.description || '');
  const [certificationTitle, setCertificationTitle] = useState(course.certification_title || '');
  const [isActive, setIsActive] = useState<boolean>(course.is_active ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) {
      setErrorMsg('Course Title and Course Code are required.');
      return;
    }

    if (feeAmount === '' || Number(feeAmount) < 0) {
      setErrorMsg('Please enter a valid tuition fee.');
      return;
    }

    if (durationWeeks === '' || Number(durationWeeks) < 1) {
      setErrorMsg('Please enter a valid duration (minimum 1 week).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await updateCourse(course.id, {
        title: title.trim(),
        code: code.trim().toUpperCase(),
        category,
        duration_weeks: Number(durationWeeks),
        fee_amount: Number(feeAmount),
        description: description.trim(),
        certification_title: certificationTitle.trim() || `${title.trim()} Certification`,
        is_active: isActive,
        branch_id: targetBranchId === 'all' ? undefined : targetBranchId,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Update course error:', err);
      setErrorMsg(err?.message || 'Failed to update academic course.');
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
              <BookOpen size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Edit Academic Course
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Update curriculum specifications, fee structure, and duration
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
            {/* Campus Allocation */}
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                Offering Campus / School
              </label>
              {isBranchManager ? (
                <div
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--crema-gold)',
                  }}
                >
                  {branches.find((b) => b.id === targetBranchId)?.name || 'Campus Course'}
                </div>
              ) : (
                <select
                  className="input-field"
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                >
                  <option value="all">🌐 All Campuses (Universal Standard)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code === 'ELD' ? '🦁 ' : '🏛️ '}{b.name} ({b.city})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Title & Code */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                  Course Code *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BAR-101"
                  required
                  style={{ width: '100%', textTransform: 'uppercase', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                  Course Title *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Professional Barista & Sensory Foundation"
                  required
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Category & Duration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                  Track Category
                </label>
                <select
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="Barista Skills">Barista Skills</option>
                  <option value="Coffee Roasting">Coffee Roasting</option>
                  <option value="Sensory & Cupping">Sensory & Cupping</option>
                  <option value="Green Coffee">Green Coffee</option>
                  <option value="Brewing & Water">Brewing & Water</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                  Duration (Weeks) *
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={durationWeeks}
                  min={1}
                  max={24}
                  placeholder="2"
                  onChange={(e) => {
                    const val = e.target.value;
                    setDurationWeeks(val === '' ? '' : Number(val));
                  }}
                  required
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Tuition Fee & Active Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                  Tuition Fee (KES) *
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={feeAmount}
                  min={0}
                  step="any"
                  placeholder="e.g. 35000"
                  onChange={(e) => {
                    const val = e.target.value;
                    setFeeAmount(val === '' ? '' : Number(val));
                  }}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                  Catalog Status
                </label>
                <select
                  className="input-field"
                  value={isActive ? 'active' : 'inactive'}
                  onChange={(e) => setIsActive(e.target.value === 'active')}
                  style={{ width: '100%' }}
                >
                  <option value="active">Active & Open</option>
                  <option value="inactive">Archived / Closed</option>
                </select>
              </div>
            </div>

            {/* Certification Title */}
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                Certification Award Title
              </label>
              <input
                type="text"
                className="input-field"
                value={certificationTitle}
                onChange={(e) => setCertificationTitle(e.target.value)}
                placeholder="e.g. SCA Certified Professional Barista"
                style={{ width: '100%' }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                Course Description & Syllabus Summary
              </label>
              <textarea
                className="input-field"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Provide details about theoretical concepts, sensory calibration, and practical espresso lab modules..."
                style={{ width: '100%', resize: 'vertical' }}
              />
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
                <span>Saving Course...</span>
              ) : (
                <>
                  <Save size={16} />
                  <span>Update Course</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
