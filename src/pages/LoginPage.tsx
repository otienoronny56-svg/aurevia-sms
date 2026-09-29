import React, { useState } from 'react';
import { useApp } from '../lib/store';
import { UserRole, Profile } from '../types/database.types';
import {
  Coffee, Lock, Mail, Key, Eye, EyeOff, ArrowRight,
  Sparkles, Building2, Award, GraduationCap, CheckCircle2,
  AlertCircle, LogIn, ShieldCheck, HelpCircle
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, loginWithProfile, profiles, students } = useApp();

  const [portalType, setPortalType] = useState<'staff' | 'student'>('staff');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Handle standard Email / ID / Reg No + Password login
  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!identifier.trim()) {
      setErrorMessage(
        portalType === 'staff'
          ? 'Please enter your staff email or staff login ID.'
          : 'Please enter your Student Registration Number or email.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await login({ identifier: identifier.trim(), password });
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google OAuth login
  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsGoogleLoading(true);

    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setErrorMessage(
          res.error?.includes('provider') || res.error?.includes('disabled')
            ? 'Google OAuth is pending activation in your Supabase Auth settings. You can sign in using your staff/student credentials or instant demo profiles below.'
            : res.error || 'Unable to connect with Google OAuth.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google sign-in encountered an error.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Instant Quick Demo Sign-in
  const handleQuickDemoLogin = (role: UserRole) => {
    setErrorMessage(null);
    const targetProfile = profiles.find((p) => p.role === role);
    if (targetProfile) {
      loginWithProfile(targetProfile);
    } else {
      // Fallback student profile if student role selected and not in faculty profiles
      const studentProfile = profiles.find((p) => p.role === 'student') || {
        id: 'f1000000-0000-0000-0000-000000000001',
        role: 'student' as UserRole,
        full_name: 'Faith Cherono',
        email: 'faith.cherono@gmail.com',
        phone: '0714767240',
        branch_id: 'b1000000-0000-0000-0000-000000000001',
        reg_number: 'AUR/NBO/2026/001',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      loginWithProfile(studentProfile);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 20%, #2A1D17 0%, #150F0D 60%, #0A0706 100%)',
        color: 'var(--text-primary, #F5F1EE)',
        position: 'relative',
        overflow: 'hidden',
        padding: '24px 16px',
        boxSizing: 'border-box',
        fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
      }}
    >
      {/* Background Ambience / Subtle Golden Glow Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '15%',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 154, 91, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(140, 90, 40, 0.12) 0%, rgba(0, 0, 0, 0) 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Glassmorphism Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(28, 20, 17, 0.78)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(212, 154, 91, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65), 0 0 40px rgba(212, 154, 91, 0.08)',
          padding: 'clamp(24px, 5vw, 36px)',
          zIndex: 10,
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #D49A5B 0%, #8C5A28 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(212, 154, 91, 0.35)',
              marginBottom: '14px',
            }}
          >
            <Coffee size={28} color="#150F0D" strokeWidth={2.4} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#FDFBF7' }}>
              Tripple T
            </h1>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                background: 'rgba(212, 154, 91, 0.2)',
                color: '#D49A5B',
                border: '1px solid rgba(212, 154, 91, 0.35)',
                padding: '2px 6px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Institutional
            </span>
          </div>

          <div style={{ fontSize: '0.82rem', color: '#D49A5B', fontWeight: 600, marginBottom: '4px' }}>
            Aurevia Coffee Institute
          </div>

          <p style={{ fontSize: '0.74rem', color: 'rgba(245, 241, 238, 0.65)', margin: 0 }}>
            Specialty Academy & Multi-Campus Enterprise Portal
          </p>
        </div>

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isLoading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '11px 16px',
            background: '#FFFFFF',
            color: '#1F2937',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '0.86rem',
            fontWeight: 600,
            cursor: isGoogleLoading ? 'wait' : 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
            marginBottom: '18px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
        >
          {isGoogleLoading ? (
            <div
              style={{
                width: '18px',
                height: '18px',
                border: '2px solid #E5E7EB',
                borderTopColor: '#4285F4',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
        </button>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '18px',
            color: 'rgba(245, 241, 238, 0.45)',
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'rgba(212, 154, 91, 0.18)' }} />
          <span>or sign in with credentials</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(212, 154, 91, 0.18)' }} />
        </div>

        {/* Portal Type Switcher Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'rgba(15, 10, 8, 0.65)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid rgba(212, 154, 91, 0.2)',
            marginBottom: '18px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setPortalType('staff');
              setErrorMessage(null);
            }}
            style={{
              padding: '7px 12px',
              fontSize: '0.76rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: portalType === 'staff' ? 'rgba(212, 154, 91, 0.2)' : 'transparent',
              color: portalType === 'staff' ? '#D49A5B' : 'rgba(245, 241, 238, 0.6)',
              transition: 'all 0.15s ease',
            }}
          >
            <Building2 size={13} />
            <span>Staff & Faculty</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPortalType('student');
              setErrorMessage(null);
            }}
            style={{
              padding: '7px 12px',
              fontSize: '0.76rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: portalType === 'student' ? 'rgba(212, 154, 91, 0.2)' : 'transparent',
              color: portalType === 'student' ? '#D49A5B' : 'rgba(245, 241, 238, 0.6)',
              transition: 'all 0.15s ease',
            }}
          >
            <GraduationCap size={13} />
            <span>Trainee Portal</span>
          </button>
        </div>

        {/* Error Alert Message */}
        {errorMessage && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              color: '#FCA5A5',
              fontSize: '0.76rem',
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleFormLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'rgba(245, 241, 238, 0.8)',
                marginBottom: '6px',
              }}
            >
              {portalType === 'staff' ? 'Work Email or Staff Login ID' : 'Registration Number or Email'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  portalType === 'staff'
                    ? 'e.g. ronny@aurevia.ac.ke or admin'
                    : 'e.g. AUR/NBO/2026/001 or trainee email'
                }
                autoFocus
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  background: 'rgba(15, 10, 8, 0.6)',
                  border: '1px solid rgba(212, 154, 91, 0.3)',
                  borderRadius: '6px',
                  color: '#FDFBF7',
                  fontSize: '0.82rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(212, 154, 91, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {portalType === 'staff' ? <Mail size={15} /> : <GraduationCap size={15} />}
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'rgba(245, 241, 238, 0.8)',
                }}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() =>
                  setInfoMessage(
                    portalType === 'staff'
                      ? 'Staff initial password defaults to Aurevia@2026! or your customized password reset by the Super Admin.'
                      : 'Students can sign in using their admission password or use the 1-click Trainee demo button below.'
                  )
                }
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.7rem',
                  color: '#D49A5B',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <HelpCircle size={11} />
                <span>Forgot?</span>
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password..."
                style={{
                  width: '100%',
                  padding: '9px 36px 9px 36px',
                  background: 'rgba(15, 10, 8, 0.6)',
                  border: '1px solid rgba(212, 154, 91, 0.3)',
                  borderRadius: '6px',
                  color: '#FDFBF7',
                  fontSize: '0.82rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(212, 154, 91, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Lock size={15} />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(245, 241, 238, 0.5)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {infoMessage && (
            <div
              style={{
                fontSize: '0.72rem',
                color: '#E5D5C5',
                background: 'rgba(212, 154, 91, 0.12)',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(212, 154, 91, 0.25)',
              }}
            >
              {infoMessage}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.74rem', color: 'rgba(245, 241, 238, 0.7)' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#D49A5B', cursor: 'pointer' }}
              />
              <span>Remember this workstation</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #D49A5B 0%, #B87D3B 100%)',
              color: '#150F0D',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: isLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(212, 154, 91, 0.35)',
              transition: 'all 0.15s ease',
              marginTop: '4px',
            }}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <LogIn size={15} strokeWidth={2.4} />
                <span>Sign In to {portalType === 'staff' ? 'Faculty Hub' : 'Trainee Portal'}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Roles */}
        <div style={{ marginTop: '22px', borderTop: '1px solid rgba(212, 154, 91, 0.18)', paddingTop: '16px' }}>
          <div
            style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              color: 'rgba(212, 154, 91, 0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Sparkles size={11} />
            <span>Instant Role Redirection (1-Click Test)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('super_admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 10px',
                background: 'rgba(212, 154, 91, 0.08)',
                border: '1px solid rgba(212, 154, 91, 0.22)',
                borderRadius: '6px',
                color: '#F5F1EE',
                fontSize: '0.74rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212, 154, 91, 0.18)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(212, 154, 91, 0.08)')}
            >
              <span style={{ fontSize: '1rem' }}>👑</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#D49A5B' }}>Super Admin</div>
                <div style={{ fontSize: '0.64rem', color: 'rgba(245, 241, 238, 0.5)' }}>Director Dashboard</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('branch_manager')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 10px',
                background: 'rgba(212, 154, 91, 0.08)',
                border: '1px solid rgba(212, 154, 91, 0.22)',
                borderRadius: '6px',
                color: '#F5F1EE',
                fontSize: '0.74rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212, 154, 91, 0.18)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(212, 154, 91, 0.08)')}
            >
              <span style={{ fontSize: '1rem' }}>🏢</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#6EE7B7' }}>Branch Manager</div>
                <div style={{ fontSize: '0.64rem', color: 'rgba(245, 241, 238, 0.5)' }}>Campus Operations</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('instructor')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 10px',
                background: 'rgba(212, 154, 91, 0.08)',
                border: '1px solid rgba(212, 154, 91, 0.22)',
                borderRadius: '6px',
                color: '#F5F1EE',
                fontSize: '0.74rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212, 154, 91, 0.18)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(212, 154, 91, 0.08)')}
            >
              <span style={{ fontSize: '1rem' }}>☕</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#38BDF8' }}>Instructor</div>
                <div style={{ fontSize: '0.64rem', color: 'rgba(245, 241, 238, 0.5)' }}>Lab & Timetable</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('student')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 10px',
                background: 'rgba(212, 154, 91, 0.08)',
                border: '1px solid rgba(212, 154, 91, 0.22)',
                borderRadius: '6px',
                color: '#F5F1EE',
                fontSize: '0.74rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212, 154, 91, 0.18)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(212, 154, 91, 0.08)')}
            >
              <span style={{ fontSize: '1rem' }}>🎓</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#F472B6' }}>Trainee Portal</div>
                <div style={{ fontSize: '0.64rem', color: 'rgba(245, 241, 238, 0.5)' }}>Student Dashboard</div>
              </div>
            </button>
          </div>
        </div>

        {/* Security / SSL Footer */}
        <div
          style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '0.68rem',
            color: 'rgba(245, 241, 238, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <ShieldCheck size={13} color="#10B981" />
          <span>256-bit Encrypted Session • Supabase Multi-Branch Cloud Auth</span>
        </div>
      </div>
    </div>
  );
};
