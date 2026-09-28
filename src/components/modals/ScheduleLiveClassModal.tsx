import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { LiveClassSession } from '../../types/database.types';
import {
  X, Video, Calendar, Clock, Sparkles, AlertCircle,
  ExternalLink, Layers, Check, ShieldCheck, Flame, Radio
} from 'lucide-react';

interface ScheduleLiveClassModalProps {
  onClose: () => void;
  onSuccess?: (session: LiveClassSession) => void;
  initialCohortId?: string;
}

const TOPIC_SUGGESTIONS = [
  'SCA Espresso Extraction Chemistry & Calibration Theory',
  'Specialty Green Bean Origin & Processing Cupping Protocols',
  'Sensory Coffee Flavor Wheel & Acidity Evaluation',
  'Milk Steaming Micro-Foam Thermodynamics & Texturing',
  'Latte Art Pattern Geometry: Rosetta, Tulip & Swan Calibration',
  'Commercial Grinder Burr Alignment & Particle Distribution',
  'Cafe Workflow Speed, Hygiene Standards & Station Ergonomics',
  'Brew Ratio Calculations & Refractometer TDS Optimization',
];

export const ScheduleLiveClassModal: React.FC<ScheduleLiveClassModalProps> = ({
  onClose,
  onSuccess,
  initialCohortId,
}) => {
  const { currentProfile, cohorts, courses, branches, createLiveSession } = useApp();

  // Filter cohorts based on user's role/instructor assignment
  const availableCohorts = cohorts.filter((c) => {
    if (currentProfile.role === 'super_admin') return true;
    if (currentProfile.role === 'branch_manager') return c.branch_id === currentProfile.branch_id;
    return c.instructor_id === currentProfile.id || c.branch_id === currentProfile.branch_id;
  });

  const [cohortId, setCohortId] = useState(
    initialCohortId || availableCohorts[0]?.id || cohorts[0]?.id || 'a1000000-0000-0000-0000-000000000001'
  );

  const selectedCohort = cohorts.find((c) => c.id === cohortId) || cohorts[0];
  const selectedCourse = courses.find((c) => c.id === selectedCohort?.course_id) || courses[0];

  const [title, setTitle] = useState(TOPIC_SUGGESTIONS[0]);
  const [description, setDescription] = useState(
    'Interactive theory lecture covering core sensory science, extraction chemistry, and practical prep before physical bar station labs.'
  );

  // Default to today and next hour
  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultHour = String(now.getHours() + 1).padStart(2, '0');
  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  const [scheduledTime, setScheduledTime] = useState(`${defaultHour}:00`);
  const [durationMinutes, setDurationMinutes] = useState(60);

  const [roomType, setRoomType] = useState<'aurevia_embedded' | 'google_meet'>('aurevia_embedded');
  const [googleMeetUrl, setGoogleMeetUrl] = useState(
    selectedCohort?.google_meet_url || 'https://meet.google.com/aur-theory-live'
  );

  const [goLiveNow, setGoLiveNow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const scheduledIso = goLiveNow
        ? new Date().toISOString()
        : new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

      const created = await createLiveSession({
        cohort_id: cohortId,
        course_id: selectedCourse?.id,
        instructor_id: currentProfile.id,
        branch_id: selectedCohort?.branch_id || currentProfile.branch_id || branches[0].id,
        title: title.trim(),
        description: description.trim(),
        scheduled_start: scheduledIso,
        duration_minutes: durationMinutes,
        status: goLiveNow ? 'live' : 'scheduled',
        room_type: roomType,
        meeting_url: roomType === 'google_meet' ? googleMeetUrl : undefined,
      });

      if (onSuccess) {
        onSuccess(created);
      }
      onClose();
    } catch (err) {
      console.error('Error creating live session:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: 'clamp(18px, 4vw, 26px)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                background: goLiveNow ? 'rgba(239, 68, 68, 0.15)' : 'rgba(197, 160, 89, 0.15)',
                border: goLiveNow ? '1px solid #EF4444' : '1px solid var(--crema-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: goLiveNow ? '#EF4444' : 'var(--crema-gold)',
              }}
            >
              <Video size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                {goLiveNow ? 'Go Live Right Now' : 'Schedule Online Theory Class'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Students join with 1 click • Attendance captured digitally in Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Go Live Immediate Toggle */}
          <div
            onClick={() => setGoLiveNow(!goLiveNow)}
            style={{
              background: goLiveNow ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface-elevated)',
              border: goLiveNow ? '1.5px solid #EF4444' : '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: goLiveNow ? '#EF4444' : 'transparent',
                  border: goLiveNow ? 'none' : '2px solid var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {goLiveNow && <Check size={12} color="#FFF" />}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: goLiveNow ? '#EF4444' : 'var(--text-primary)' }}>
                  🔴 Broadcast Live Immediately
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Pushes an active live banner to enrolled students' dashboard instantly.
                </div>
              </div>
            </div>
            <span className={`badge ${goLiveNow ? 'badge-danger' : 'badge-gold'}`} style={{ fontSize: '0.72rem' }}>
              {goLiveNow ? 'Active Now' : 'Schedule Mode'}
            </span>
          </div>

          {/* Select Cohort */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Target Cohort (Only enrolled students will see this class)
            </label>
            <select
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
              className="input-field"
              style={{ width: '100%' }}
              required
            >
              {availableCohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} • {courses.find((cr) => cr.id === c.course_id)?.title || 'Course'}
                </option>
              ))}
            </select>
          </div>

          {/* Lesson Title */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Lesson Topic Title
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--crema-gold)' }}>Coffee Syllabus Standard</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="e.g. SCA Espresso Calibration & Extraction Theory"
              style={{ width: '100%' }}
              required
            />

            {/* Quick Topic Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {TOPIC_SUGGESTIONS.slice(0, 3).map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setTitle(sug)}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '999px',
                    padding: '3px 8px',
                    fontSize: '0.68rem',
                    color: title === sug ? 'var(--crema-gold)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  + {sug.split('&')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Date, Time & Duration (If not go live now) */}
          {!goLiveNow && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Start Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Duration
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes (1 Hr)</option>
                  <option value={90}>90 Minutes</option>
                  <option value={120}>2 Hours</option>
                </select>
              </div>
            </div>
          )}

          {/* Delivery Platform / Room Mode */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Classroom Engine
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div
                onClick={() => setRoomType('aurevia_embedded')}
                style={{
                  border: roomType === 'aurevia_embedded' ? '1.5px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
                  background: roomType === 'aurevia_embedded' ? 'rgba(197, 160, 89, 0.12)' : 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.82rem', color: roomType === 'aurevia_embedded' ? 'var(--crema-gold)' : 'var(--text-primary)' }}>
                  <Sparkles size={14} />
                  <span>Aurevia Studio (Jitsi)</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  1-Click, zero accounts needed, names pre-injected.
                </div>
              </div>

              <div
                onClick={() => setRoomType('google_meet')}
                style={{
                  border: roomType === 'google_meet' ? '1.5px solid #3B82F6' : '1px solid var(--border-subtle)',
                  background: roomType === 'google_meet' ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.82rem', color: roomType === 'google_meet' ? '#3B82F6' : 'var(--text-primary)' }}>
                  <ExternalLink size={14} />
                  <span>Google Meet</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  External link • Attendance logged on 1-click.
                </div>
              </div>
            </div>

            {roomType === 'google_meet' && (
              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  Google Meet Link
                </label>
                <input
                  type="url"
                  value={googleMeetUrl}
                  onChange={(e) => setGoogleMeetUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://meet.google.com/xxx-yyyy-zzz"
                  style={{ width: '100%' }}
                  required
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Lesson Notes & Objectives (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="input-field"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.84rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn ${goLiveNow ? 'btn-danger' : 'btn-primary'}`}
              style={{ padding: '8px 20px', fontSize: '0.86rem', gap: '8px' }}
            >
              <Video size={16} />
              <span>
                {isSubmitting
                  ? 'Publishing Class...'
                  : goLiveNow
                  ? 'Launch Live Studio Now'
                  : 'Confirm & Schedule Class'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
