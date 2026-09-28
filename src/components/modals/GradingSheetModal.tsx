import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Enrollment, StudentKYC, Profile, Course, Cohort } from '../../types/database.types';
import {
  Award, CheckCircle2, X, Sparkles, Save, FileText, Check,
  BookOpen, Calculator, UserCheck, AlertCircle, Zap, Beaker,
  GraduationCap, Coffee, Edit3
} from 'lucide-react';

interface GradingSheetModalProps {
  cohort: Cohort;
  onClose: () => void;
}

type AssessmentCategory = 'test' | 'practical' | 'exam' | 'sensory';

interface StudentGradeRow {
  studentId: string;
  enrollmentId: string;
  fullName: string;
  regNumber: string;
  score: number;          // Main score for single-type assessments (Test, Practical, Sensory)
  practicalScore: number; // For comprehensive exams
  theoryScore: number;
  sensoryScore: number;
  remarks: string;
}

export const GradingSheetModal: React.FC<GradingSheetModalProps> = ({ cohort, onClose }) => {
  const { students, profiles, enrollments, courses, assessments, recordAssessment } = useApp();

  const course = courses.find((c) => c.id === cohort.course_id) || courses[0];
  const cohortEnrollments = enrollments.filter((e) => e.cohort_id === cohort.id);

  // Category: test, practical, exam, sensory
  const [category, setCategory] = useState<AssessmentCategory>('test');

  // Custom Assessment Title / Name (e.g. "Test 1", "Practical on Milk Steaming", "Exam 2")
  const [assessmentTitle, setAssessmentTitle] = useState('Test 1: Espresso Extraction');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<'draft' | 'published' | null>(null);

  // Suggested Quick Presets based on Category
  const SUGGESTIONS: Record<AssessmentCategory, string[]> = {
    test: [
      'Test 1: Espresso Extraction & Calibration',
      'Test 2: Milk Chemistry & Texturing',
      'CAT 1: Grinder Dynamics',
      'CAT 2: Green Bean Processing',
    ],
    practical: [
      'Practical on Espresso Dialing & Channeling',
      'Practical on Milk Steaming & Latte Art',
      'Practical on Roasting Drum & RoR Profiles',
      'Practical on Manual Brewing (V60 & Chemex)',
    ],
    exam: [
      'Exam 1: Mid-Term Practical Evaluation',
      'Exam 2: Final Theory & Operations',
      'Final SCA Certification Examination',
    ],
    sensory: [
      'Sensory Test 1: Acid & Sweetness Identification',
      'Sensory Test 2: Aroma Kit Triangulation',
      'SCA Official Cupping Protocol Exam',
    ],
  };

  // Initialize roster rows
  const [gradeRows, setGradeRows] = useState<StudentGradeRow[]>(() => {
    return cohortEnrollments.map((enr) => {
      const st = students.find((s) => s.id === enr.student_id);
      const pr = profiles.find((p) => p.id === st?.profile_id);
      const existing = assessments.find((a) => a.student_id === enr.student_id && a.cohort_id === cohort.id);

      return {
        studentId: enr.student_id,
        enrollmentId: enr.id,
        fullName: pr?.full_name || 'Trainee',
        regNumber: pr?.reg_number || 'AUR/REG/2026',
        score: existing ? existing.practical_score : 80,
        practicalScore: existing ? existing.practical_score : 80,
        theoryScore: existing ? existing.theory_score : 75,
        sensoryScore: existing ? existing.sensory_score : 80,
        remarks: existing?.instructor_remarks || 'Satisfactory execution',
      };
    });
  });

  // Calculate final grade badge
  const calculateGradeBadge = (scoreValue: number) => {
    let grade = 'Pass (C)';
    let badgeClass = 'badge-pending';

    if (scoreValue >= 85) {
      grade = 'Distinction (A)';
      badgeClass = 'badge-approved';
    } else if (scoreValue >= 75) {
      grade = 'Credit (B)';
      badgeClass = 'badge-paid';
    } else if (scoreValue >= 60) {
      grade = 'Pass (C)';
      badgeClass = 'badge-pending';
    } else {
      grade = 'Referral';
      badgeClass = 'badge-danger';
    }

    return { grade, badgeClass };
  };

  const handleUpdateField = (index: number, field: keyof StudentGradeRow, value: any) => {
    setGradeRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Bulk quick fill
  const handleBulkSet = (scoreValue: number) => {
    setGradeRows((prev) =>
      prev.map((row) => ({
        ...row,
        score: scoreValue,
        practicalScore: scoreValue,
        theoryScore: scoreValue,
        sensoryScore: scoreValue,
      }))
    );
  };

  const handleSaveAll = async (status: 'draft' | 'published' = 'published') => {
    setIsSaving(true);
    try {
      for (const row of gradeRows) {
        const practicalVal = category === 'practical' ? Number(row.score) : Number(row.practicalScore);
        const theoryVal = category === 'test' ? Number(row.score) : Number(row.theoryScore);
        const sensoryVal = category === 'sensory' ? Number(row.score) : Number(row.sensoryScore);

        await recordAssessment({
          enrollment_id: row.enrollmentId,
          student_id: row.studentId,
          cohort_id: cohort.id,
          module_name: assessmentTitle,
          practical_score: practicalVal,
          theory_score: theoryVal,
          sensory_score: sensoryVal,
          status: status,
          instructor_remarks: row.remarks || `${assessmentTitle} (${status}).`,
        });
      }

      setSaveSuccess(status);
      setTimeout(() => {
        setSaveSuccess(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      alert('Error saving marks: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '920px', maxHeight: '92vh', overflowY: 'auto' }}
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
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#181310',
              }}
            >
              <Award size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Enter Assessment & Examination Marks</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {cohort.name} • {course.title} ({gradeRows.length} Enrolled Trainees)
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

        {/* 1. ASSESSMENT CATEGORY SELECTOR */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)' }}>
          <label className="form-label" style={{ marginBottom: '8px', fontSize: '0.78rem' }}>
            1. Select Assessment Category *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '8px' }}>
            {/* Written Test / CAT */}
            <button
              type="button"
              onClick={() => {
                setCategory('test');
                setAssessmentTitle('Test 1: Espresso Extraction & Calibration');
              }}
              style={{
                background: category === 'test' ? 'rgba(212, 154, 91, 0.2)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${category === 'test' ? 'var(--crema-gold)' : 'var(--border-subtle)'}`,
                color: category === 'test' ? 'var(--crema-gold)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left',
              }}
            >
              <FileText size={16} />
              <span>📝 Test / CAT</span>
            </button>

            {/* Practical Lab */}
            <button
              type="button"
              onClick={() => {
                setCategory('practical');
                setAssessmentTitle('Practical on Milk Steaming & Latte Art');
              }}
              style={{
                background: category === 'practical' ? 'rgba(110, 231, 183, 0.15)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${category === 'practical' ? '#6EE7B7' : 'var(--border-subtle)'}`,
                color: category === 'practical' ? '#6EE7B7' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left',
              }}
            >
              <Beaker size={16} />
              <span>🔬 Practical Lab</span>
            </button>

            {/* Examination */}
            <button
              type="button"
              onClick={() => {
                setCategory('exam');
                setAssessmentTitle('Exam 1: Mid-Term Evaluation');
              }}
              style={{
                background: category === 'exam' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${category === 'exam' ? '#EAB308' : 'var(--border-subtle)'}`,
                color: category === 'exam' ? '#EAB308' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left',
              }}
            >
              <GraduationCap size={16} />
              <span>🎓 Examination</span>
            </button>

            {/* Sensory Cupping */}
            <button
              type="button"
              onClick={() => {
                setCategory('sensory');
                setAssessmentTitle('Sensory Test: Triangulation & Acids');
              }}
              style={{
                background: category === 'sensory' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${category === 'sensory' ? '#EC4899' : 'var(--border-subtle)'}`,
                color: category === 'sensory' ? '#EC4899' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left',
              }}
            >
              <Coffee size={16} />
              <span>☕ Sensory Cupping</span>
            </button>
          </div>
        </div>

        {/* 2. CUSTOM ASSESSMENT TITLE / NAME */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>2. Name this Assessment / Test *</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                e.g. "Test 1", "Exam 2", "Practical on Espresso Dialing"
              </span>
            </label>
            <input
              type="text"
              className="form-input"
              value={assessmentTitle}
              onChange={(e) => setAssessmentTitle(e.target.value)}
              placeholder="e.g. Test 1, Exam 2, Practical on Milk Steaming"
              style={{ fontSize: '0.92rem', padding: '10px 14px', fontWeight: 600 }}
              required
            />
          </div>

          {/* Quick Name Suggestions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>💡 Quick Presets:</span>
            {SUGGESTIONS[category].map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setAssessmentTitle(sug)}
                style={{
                  background: assessmentTitle === sug ? 'rgba(212, 154, 91, 0.25)' : 'var(--bg-surface-elevated)',
                  border: `1px solid ${assessmentTitle === sug ? 'var(--crema-gold)' : 'var(--border-subtle)'}`,
                  color: assessmentTitle === sug ? 'var(--crema-gold-light)' : 'var(--text-secondary)',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* 3. ROSTER SPEED TABLE */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--crema-gold)' }}>
              3. Enter Marks for {gradeRows.length} Enrolled Trainees
            </div>

            {/* Quick Bulk Fill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>⚡ Set Baseline:</span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                onClick={() => handleBulkSet(85)}
              >
                85% (Distinction)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                onClick={() => handleBulkSet(75)}
              >
                75% (Credit)
              </button>
            </div>
          </div>

          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th style={{ minWidth: '180px' }}>Trainee Name & Reg No</th>
                  {category !== 'exam' ? (
                    <th style={{ width: '130px' }}>
                      {category === 'test' ? 'Test Score (/100)' : category === 'practical' ? 'Practical (/100)' : 'Sensory (/100)'}
                    </th>
                  ) : (
                    <>
                      <th style={{ width: '90px' }}>Practical</th>
                      <th style={{ width: '90px' }}>Theory</th>
                      <th style={{ width: '90px' }}>Sensory</th>
                    </>
                  )}
                  <th style={{ width: '130px' }}>Grade Awarded</th>
                  <th style={{ minWidth: '160px' }}>Instructor Remarks</th>
                </tr>
              </thead>
              <tbody>
                {gradeRows.map((row, idx) => {
                  const scoreVal = category === 'exam'
                    ? Number(((row.practicalScore * 0.5) + (row.theoryScore * 0.25) + (row.sensoryScore * 0.25)).toFixed(1))
                    : Number(row.score) || 0;

                  const { grade, badgeClass } = calculateGradeBadge(scoreVal);

                  return (
                    <tr key={row.studentId}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem' }}>
                        #{idx + 1}
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{row.fullName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--crema-gold)', fontFamily: 'var(--font-mono)' }}>
                          {row.regNumber}
                        </div>
                      </td>

                      {/* Score Input(s) */}
                      {category !== 'exam' ? (
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row.score}
                              onChange={(e) => handleUpdateField(idx, 'score', Number(e.target.value))}
                              className="form-input"
                              style={{
                                width: '72px',
                                padding: '6px 8px',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                color: scoreVal >= 75 ? '#6EE7B7' : undefined,
                              }}
                            />
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>%</span>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row.practicalScore}
                              onChange={(e) => handleUpdateField(idx, 'practicalScore', Number(e.target.value))}
                              className="form-input"
                              style={{ width: '60px', padding: '5px', textAlign: 'center', fontWeight: 600 }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row.theoryScore}
                              onChange={(e) => handleUpdateField(idx, 'theoryScore', Number(e.target.value))}
                              className="form-input"
                              style={{ width: '60px', padding: '5px', textAlign: 'center', fontWeight: 600 }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row.sensoryScore}
                              onChange={(e) => handleUpdateField(idx, 'sensoryScore', Number(e.target.value))}
                              className="form-input"
                              style={{ width: '60px', padding: '5px', textAlign: 'center', fontWeight: 600 }}
                            />
                          </td>
                        </>
                      )}

                      {/* Grade Badge */}
                      <td>
                        <span className={`badge ${badgeClass}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                          {scoreVal}% • {grade.split(' ')[0]}
                        </span>
                      </td>

                      {/* Remarks */}
                      <td>
                        <input
                          type="text"
                          value={row.remarks}
                          onChange={(e) => handleUpdateField(idx, 'remarks', e.target.value)}
                          className="form-input"
                          placeholder="e.g. Good consistency"
                          style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Publishing marks for <strong>"{assessmentTitle}"</strong>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
                Cancel
              </button>
              
              {/* Save as Draft (Unpublished) */}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleSaveAll('draft')}
                disabled={isSaving || gradeRows.length === 0}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: '1px solid var(--border-medium)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Save your marks progress without publishing to the student portal yet"
              >
                {saveSuccess === 'draft' ? (
                  <>
                    <Check size={15} color="#6EE7B7" />
                    <span style={{ color: '#6EE7B7' }}>Draft Saved!</span>
                  </>
                ) : (
                  <>
                    <FileText size={15} color="var(--crema-gold)" />
                    <span>Save as Draft</span>
                  </>
                )}
              </button>

              {/* Save & Publish Official Marks */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSaveAll('published')}
                disabled={isSaving || gradeRows.length === 0}
                style={{ padding: '8px 20px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Commit and publish official grades to student portals and transcripts"
              >
                {saveSuccess === 'published' ? (
                  <>
                    <Check size={16} />
                    <span>Marks Published!</span>
                  </>
                ) : isSaving ? (
                  <span>Saving Ledger...</span>
                ) : (
                  <>
                    <Save size={15} />
                    <span>💾 Save & Publish Marks</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
