import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { BookOpen, X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CreateCourseModalProps {
  onClose: () => void;
}

export const CreateCourseModal: React.FC<CreateCourseModalProps> = ({ onClose }) => {
  const { courses, branches, currentProfile, refreshFromSupabase, createCourse } = useApp();
  const isBranchManager = currentProfile?.role === 'branch_manager';
  const defaultBranchId = isBranchManager && currentProfile?.branch_id ? currentProfile.branch_id : 'all';

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [targetBranchId, setTargetBranchId] = useState<string>(defaultBranchId);
  const [category, setCategory] = useState<'Barista Skills' | 'Coffee Roasting' | 'Sensory & Cupping' | 'Green Coffee' | 'Brewing & Water'>('Barista Skills');
  const [durationWeeks, setDurationWeeks] = useState<number | ''>(2);
  const [feeAmount, setFeeAmount] = useState<number | ''>(35000);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !code) return;

    setIsSubmitting(true);
    const finalBranchId = targetBranchId === 'all' ? undefined : targetBranchId;
    let finalCode = code.trim().toUpperCase();
    if (finalBranchId === '470b5cb5-59e2-4be0-b19b-182d9795e12b' && !finalCode.startsWith('LH-')) {
      finalCode = `LH-${finalCode}`;
    }

    const newCourse = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'c' + Date.now(),
      title: title.trim(),
      code: finalCode,
      category,
      duration_weeks: Number(durationWeeks) || 1,
      fee_amount: Number(feeAmount) || 0,
      description: description.trim() || 'Specialty Coffee Association curriculum module.',
      modules: [],
      certification_title: `${title.trim()} Certification`,
      is_active: true,
      created_at: new Date().toISOString(),
      branch_id: finalBranchId,
    };

    try {
      if (createCourse) {
        await createCourse(newCourse as any);
      } else if (supabase) {
        const dbCourse = {
          id: newCourse.id,
          title: newCourse.title,
          code: newCourse.code,
          category: newCourse.category,
          duration_weeks: newCourse.duration_weeks,
          fee_amount: newCourse.fee_amount,
          description: newCourse.description,
          certification_title: newCourse.certification_title,
          is_active: newCourse.is_active,
        };
        await supabase.from('aur_courses').insert([dbCourse]);
      }
      await refreshFromSupabase();
      onClose();
    } catch (err: any) {
      console.warn('Course creation note:', err);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '560px', width: '95%', margin: 'auto', padding: 0, overflow: 'hidden' }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
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
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#181310',
              }}
            >
              <BookOpen size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Add New Academic Course</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
                Specialty Coffee Association (SCA) curriculum module
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Target Campus */}
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Offering Campus / School *
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>{branches.find((b) => b.id === targetBranchId)?.name || 'My Campus'}</span>
                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>(Locked to your school)</span>
              </div>
            ) : (
              <select
                className="form-select"
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

          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Course Title *
            </label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Advanced Espresso Extraction & Dialing"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', fontSize: '0.82rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Course Code *
              </label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. BAR-301"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                SCA Discipline Category
              </label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                style={{ width: '100%', fontSize: '0.82rem' }}
              >
                <option value="Barista Skills">Barista Skills</option>
                <option value="Coffee Roasting">Coffee Roasting</option>
                <option value="Sensory & Cupping">Sensory & Cupping</option>
                <option value="Green Coffee">Green Coffee</option>
                <option value="Brewing & Water">Brewing & Water</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Duration (Weeks)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                required
                className="form-input"
                value={durationWeeks}
                placeholder="2"
                onChange={(e) => {
                  const val = e.target.value;
                  setDurationWeeks(val === '' ? '' : Number(val));
                }}
                style={{ width: '100%', fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Tuition Fee (KES) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                className="form-input"
                value={feeAmount}
                placeholder="35000"
                onChange={(e) => {
                  const val = e.target.value;
                  setFeeAmount(val === '' ? '' : Number(val));
                }}
                style={{ width: '100%', fontSize: '0.82rem', fontWeight: 700 }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Curriculum Summary / Description
            </label>
            <textarea
              rows={3}
              className="form-input"
              placeholder="Key practical competencies, cupping protocols, exam requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', fontSize: '0.82rem', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
              <Plus size={14} />
              <span>{isSubmitting ? 'Saving Course...' : 'Publish Course'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
