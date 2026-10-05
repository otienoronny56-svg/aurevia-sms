import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Assessment, StudentKYC, Profile } from '../../types/database.types';
import { X, Award, Save, Check, Trash2, Edit3 } from 'lucide-react';

interface EditAssessmentModalProps {
  assessment: Assessment;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditAssessmentModal: React.FC<EditAssessmentModalProps> = ({
  assessment,
  onClose,
  onSuccess,
}) => {
  const { students, profiles, updateAssessment, deleteAssessment } = useApp();

  const student = students.find((s) => s.id === assessment.student_id);
  const profile = profiles.find((p) => p.id === student?.profile_id) || profiles.find((p) => p.id === assessment.student_id);

  const [moduleName, setModuleName] = useState(assessment.module_name);
  const [practicalScore, setPracticalScore] = useState<number | ''>(assessment.practical_score ?? 85);
  const [theoryScore, setTheoryScore] = useState<number | ''>(assessment.theory_score ?? 80);
  const [sensoryScore, setSensoryScore] = useState<number | ''>(assessment.sensory_score ?? 78);
  const [remarks, setRemarks] = useState(assessment.instructor_remarks || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Live computed score & grade
  const numPractical = Number(practicalScore) || 0;
  const numTheory = Number(theoryScore) || 0;
  const numSensory = Number(sensoryScore) || 0;
  const computedFinal = Number(((numPractical * 0.5) + (numTheory * 0.25) + (numSensory * 0.25)).toFixed(1));
  let computedGrade = 'C';
  let badgeClass = 'badge-pending';
  if (computedFinal >= 85) {
    computedGrade = 'Distinction (A)';
    badgeClass = 'badge-approved';
  } else if (computedFinal >= 75) {
    computedGrade = 'Credit (B)';
    badgeClass = 'badge-paid';
  } else if (computedFinal >= 60) {
    computedGrade = 'Pass (C)';
    badgeClass = 'badge-pending';
  } else {
    computedGrade = 'Referral';
    badgeClass = 'badge-danger';
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateAssessment(assessment.id, {
        module_name: moduleName,
        practical_score: Number(practicalScore) || 0,
        theory_score: Number(theoryScore) || 0,
        sensory_score: Number(sensoryScore) || 0,
        instructor_remarks: remarks,
      });

      setSaveSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      alert('Error updating mark: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete this mark entry for "${profile?.full_name || 'this student'}"?`)) {
      return;
    }
    await deleteAssessment(assessment.id);
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '560px', maxHeight: '92vh', overflowY: 'auto' }}
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
              <Edit3 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Edit Examination / Test Marks</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Trainee: <strong>{profile?.full_name || 'Faith Cherono'}</strong> ({profile?.reg_number || 'AUR/NBO/2026/001'})
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

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ padding: '24px' }}>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Assessment / Test Title *</label>
            <input
              type="text"
              className="form-input"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' }}>
            <div className="form-group">
              <label className="form-label">Practical (50%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  placeholder="0"
                  className="form-input"
                  value={practicalScore}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPracticalScore(val === '' ? '' : Number(val));
                  }}
                  required
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Theory (25%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  placeholder="0"
                  className="form-input"
                  value={theoryScore}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTheoryScore(val === '' ? '' : Number(val));
                  }}
                  required
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Sensory (25%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  placeholder="0"
                  className="form-input"
                  value={sensoryScore}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSensoryScore(val === '' ? '' : Number(val));
                  }}
                  required
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
              </div>
            </div>
          </div>

          {/* Computed Score Preview */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Weighted Final Score</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#6EE7B7' }}>{computedFinal}%</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>Calculated Grade</div>
              <span className={`badge ${badgeClass}`} style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                {computedGrade}
              </span>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Instructor Remarks & Palate Notes</label>
            <textarea
              className="form-input"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Flawless tamping consistency and microfoam texture."
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDelete}
              style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 size={15} />
              <span>Delete Entry</span>
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {saveSuccess ? (
                  <>
                    <Check size={16} />
                    <span>Updated!</span>
                  </>
                ) : isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
