import React, { useState, useEffect } from 'react';
import { useApp } from '../../lib/store';
import { LiveClassSession } from '../../types/database.types';
import {
  X, Maximize2, Minimize2, Video, CheckCircle2, Users, Clock,
  ExternalLink, Sparkles, Shield, AlertCircle, PhoneOff, Award
} from 'lucide-react';

interface VirtualClassroomModalProps {
  session: LiveClassSession;
  onClose: () => void;
}

export const VirtualClassroomModal: React.FC<VirtualClassroomModalProps> = ({
  session,
  onClose,
}) => {
  const { currentProfile, courses, cohorts, endLiveSession } = useApp();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isEnding, setIsEnding] = useState(false);

  const cohort = cohorts.find((c) => c.id === session.cohort_id);
  const course = courses.find((c) => c.id === session.course_id);
  const isInstructor = currentProfile.role === 'instructor' || currentProfile.role === 'super_admin' || currentProfile.id === session.instructor_id;

  // Format participant label with Reg Number for verified digital identity
  const participantDisplayName = currentProfile.role === 'student'
    ? `${currentProfile.full_name} [${currentProfile.reg_number || 'Trainee'}]`
    : `Instructor ${currentProfile.full_name}`;

  const participantEmail = currentProfile.email || 'student@aurevia.academy';

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEndClass = async () => {
    if (!window.confirm('Are you sure you want to end this live session for all students?')) return;
    setIsEnding(true);
    await endLiveSession(session.id);
    setIsEnding(false);
    onClose();
  };

  // Build clean Jitsi embed URL with pre-injected identity and dark crema parameters
  const jitsiEmbedUrl = `https://meet.jit.si/${session.room_name}#userInfo.displayName="${encodeURIComponent(participantDisplayName)}"&userInfo.email="${encodeURIComponent(participantEmail)}"&config.prejoinPageEnabled=false&config.disableDeepLinking=true&config.defaultRemoteDisplayName="Aurevia Academy Student"`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 5, 8, 0.94)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        padding: isFullscreen ? 0 : 'clamp(8px, 2vw, 16px)',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          border: isFullscreen ? 'none' : '1px solid var(--border-subtle)',
          borderRadius: isFullscreen ? 0 : 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Top Classroom Bar */}
        <div
          style={{
            padding: '12px 18px',
            background: 'var(--bg-surface-elevated)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Left: Class Information & Live Pulse */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1.5px solid #EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
                position: 'relative',
              }}
            >
              <Video size={18} />
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#EF4444',
                  boxShadow: '0 0 8px #EF4444',
                  animation: 'pulse 1.5s infinite',
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#EF4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  LIVE CLASSROOM
                </span>
                <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                  {cohort?.name || 'Academy Cohort'}
                </span>
                {course && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    • {course.title}
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '3px 0 0 0', color: 'var(--text-primary)' }}>
                {session.title}
              </h2>
            </div>
          </div>

          {/* Center / Right Telemetry: Timer, Attendance status, and Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Digital Attendance Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                color: '#10B981',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={15} />
              <span>Digital Roll-Call Recorded</span>
            </div>

            {/* Session Timer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--crema-gold)',
              }}
            >
              <Clock size={14} />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            {/* Identity Badge */}
            <div
              style={{
                display: 'none',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
              }}
              className="identity-badge-desktop"
            >
              <Shield size={13} color="var(--crema-gold)" />
              <span style={{ color: 'var(--text-secondary)' }}>{participantDisplayName}</span>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Studio'}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            {/* Instructor End Class Action */}
            {isInstructor && (
              <button
                onClick={handleEndClass}
                disabled={isEnding}
                className="btn btn-danger"
                style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '6px' }}
              >
                <PhoneOff size={14} />
                <span>End Class for All</span>
              </button>
            )}

            {/* Close / Leave Button */}
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              <X size={15} />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {/* Video Stage Frame */}
        <div style={{ flex: 1, position: 'relative', background: '#000000' }}>
          {session.room_type === 'google_meet' ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
                background: 'radial-gradient(circle at center, rgba(197, 160, 89, 0.08) 0%, #000 80%)',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '2px solid #3B82F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3B82F6',
                  marginBottom: '16px',
                }}
              >
                <Video size={30} />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 8px 0' }}>
                Google Meet Virtual Lecture Gateway
              </h3>
              <p style={{ maxWidth: '520px', color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 20px 0' }}>
                Your digital roll-call and attendance timestamp have been recorded into the Aurevia Supabase ledger. Click below to launch your Google Meet room.
              </p>
              <a
                href={session.meeting_url || cohort?.google_meet_url || 'https://meet.google.com'}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ padding: '12px 24px', fontSize: '0.95rem', gap: '8px' }}
              >
                <Video size={18} />
                <span>Launch Google Meet Room</span>
                <ExternalLink size={16} />
              </a>
            </div>
          ) : (
            <iframe
              src={jitsiEmbedUrl}
              title={`Aurevia Virtual Classroom: ${session.title}`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            />
          )}
        </div>

        {/* Bottom Banner Status Bar */}
        <div
          style={{
            padding: '8px 16px',
            background: 'var(--bg-surface-elevated)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={14} color="var(--crema-gold)" />
            <span>Aurevia Specialty Coffee Education • Verified Digital Accreditation Classroom</span>
          </div>
          <div>
            Signed in as: <strong style={{ color: 'var(--crema-gold)' }}>{participantDisplayName}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
