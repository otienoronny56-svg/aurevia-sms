import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { BookOpen, X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CreateCourseModalProps {
  onClose: () => void;
}

export const CreateCourseModal: React.FC<CreateCourseModalProps> = ({ onClose }) => {
  const { courses, refreshFromSupabase } = useApp();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<'Barista Skills' | 'Coffee Roasting' | 'Sensory & Cupping' | 'Green Coffee' | 'Brewing & Water'>('Barista Skills');
  const [durationWeeks, setDurationWeeks] = useState(2);
  const [feeAmount, setFeeAmount] = useState(35000);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !code) return;

    setIsSubmitting(true);
    const newCourse = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'c' + Date.now(),
      title,
      code: code.toUpperCase(),
      category,
      duration_weeks: Number(durationWeeks),
      fee_amount: Number(feeAmount),
      description: description || 'Official Specialty Coffee Association certified training module.',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    try {
      if (supabase) {
        await supabase.from('aur_courses').insert([newCourse]);
      }
      const saved = localStorage.getItem('aur_courses');
      const list = saved ? JSON.parse(saved) : courses;
      localStorage.setItem('aur_courses', JSON.stringify([...list, newCourse]));
      await refreshFromSupabase();
      onClose();
    } catch (err: any) {
      console.warn('Course creation fallback:', err);
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
                onChange={(e) => setDurationWeeks(Number(e.target.value))}
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
                step="1000"
                required
                className="form-input"
                value={feeAmount}
                onChange={(e) => setFeeAmount(Number(e.target.value))}
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
