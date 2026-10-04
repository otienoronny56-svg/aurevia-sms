import React from 'react';
import { useApp } from '../lib/store';
import { isPortalMode, switchDomainMode, getTargetDomainUrl } from '../lib/domainConfig';
import { GraduationCap, ArrowRight, LogOut, ShieldAlert, Coffee, ExternalLink } from 'lucide-react';

interface DomainGatekeeperPageProps {}

export const DomainGatekeeperPage: React.FC<DomainGatekeeperPageProps> = () => {
  const { currentProfile, currentRole, logout } = useApp();
  const onPortal = isPortalMode();

  const isLearnerOrTeacher = currentRole === 'student' || currentRole === 'instructor';

  const handleGoToPortal = () => {
    switchDomainMode('portal');
  };

  const handleGoToSms = () => {
    switchDomainMode('sms');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, rgba(212, 154, 91, 0.08) 0%, var(--bg-app) 100%)',
        padding: '24px',
        boxSizing: 'border-box',
        color: 'var(--text-primary)',
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: 'clamp(24px, 5vw, 36px)',
          textAlign: 'center',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          borderRadius: '16px',
        }}
      >
        {/* Top Icon Badge */}
        <div
          style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(212, 154, 91, 0.2) 0%, rgba(212, 154, 91, 0.05) 100%)',
            border: '1px solid var(--crema-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--crema-gold)',
          }}
        >
          {isLearnerOrTeacher ? <GraduationCap size={32} /> : <Coffee size={32} />}
        </div>

        {/* Title */}
        <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', background: 'rgba(212, 154, 91, 0.12)', color: 'var(--crema-gold)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '12px' }}>
          {onPortal ? 'Academy Portal' : 'Tripple T SMS'}
        </div>

        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>
          Welcome, {currentProfile.full_name}!
        </h1>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 24px 0' }}>
          {isLearnerOrTeacher ? (
            <>
              Please proceed to the <strong>Academy Portal</strong> to access your coursework, schedule, marks, and attendance.
            </>
          ) : (
            <>
              Please proceed to <strong>Tripple T SMS</strong> to access administration, operations, and management controls.
            </>
          )}
        </p>

        {/* Primary Redirect Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          {isLearnerOrTeacher ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGoToPortal}
              style={{
                width: '100%',
                padding: '13px 20px',
                fontSize: '0.92rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '10px',
              }}
            >
              <GraduationCap size={18} />
              <span>Continue to Academy Portal</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGoToSms}
              style={{
                width: '100%',
                padding: '13px 20px',
                fontSize: '0.92rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '10px',
              }}
            >
              <Coffee size={18} />
              <span>Continue to Tripple T SMS</span>
              <ArrowRight size={16} />
            </button>
          )}

          {/* Secondary Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={logout}
              style={{ padding: '8px 18px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
          Tripple T Systems • Multi-Branch Institutional Platform
        </div>
      </div>
    </div>
  );
};
