import React from 'react';
import { useApp } from '../lib/store';
import { isPortalMode, switchDomainMode, getTargetDomainUrl } from '../lib/domainConfig';
import { GraduationCap, ArrowRight, LogOut, ShieldAlert, Coffee, ExternalLink } from 'lucide-react';

interface DomainGatekeeperPageProps {
  onBypassDev?: () => void;
}

export const DomainGatekeeperPage: React.FC<DomainGatekeeperPageProps> = ({ onBypassDev }) => {
  const { currentProfile, currentRole, logout } = useApp();
  const onPortal = isPortalMode();

  const isLearnerOrTeacher = currentRole === 'student' || currentRole === 'instructor';
  const roleName = currentRole === 'student' ? 'Trainee / Student' : 'Faculty Instructor';

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
          maxWidth: '560px',
          width: '100%',
          padding: 'clamp(24px, 5vw, 40px)',
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
          {onPortal ? 'Academy Learning Portal' : 'Aurevia Management System (SMS)'}
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>
          Welcome, {currentProfile.full_name}!
        </h1>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 24px 0' }}>
          {isLearnerOrTeacher ? (
            <>
              You are signed in as a <strong>{roleName}</strong>. The SMS console is designated for branch operations and directors.
              Your student timetable, attendance roll-call, class assessments, and learning modules are hosted on the dedicated <strong>Aurevia Academy Portal</strong>.
            </>
          ) : (
            <>
              You are signed in as an <strong>Administrator / Campus Manager</strong>. To manage institution branches, student admissions, fee payments, and staff HR, open the <strong>Aurevia SMS Management System</strong>.
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
                padding: '14px 24px',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                borderRadius: '10px',
              }}
            >
              <GraduationCap size={20} />
              <span>Launch Academy Portal (portal.aureviacoffeeinstitute)</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGoToSms}
              style={{
                width: '100%',
                padding: '14px 24px',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                borderRadius: '10px',
              }}
            >
              <Coffee size={20} />
              <span>Launch Aurevia SMS Management System</span>
              <ArrowRight size={18} />
            </button>
          )}

          {/* Secondary Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={logout}
              style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>

            {onBypassDev && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onBypassDev}
                style={{ padding: '8px 16px', fontSize: '0.82rem', opacity: 0.8 }}
                title="Continue in this domain for testing purposes"
              >
                <span>Continue Anyway (Dev Preview)</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
          Aurevia Institute of Specialty Coffee • Nairobi • Mombasa • Kigali
        </div>
      </div>
    </div>
  );
};
