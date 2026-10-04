import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import {
  Coffee, Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle,
  Info, ShieldCheck, MapPin, CheckCircle2, GraduationCap,
} from 'lucide-react';
import { PasswordResetModal } from '../components/modals/PasswordResetModal';
import { isPortalMode, switchDomainMode } from '../lib/domainConfig';
import './LoginPage.css';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;
const LOCK_KEY = 'aur_login_lock';
const SUPPORT_EMAIL = 'info@aureviacoffeeinstitute.co.ke';

const GoogleLogo: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const Brand: React.FC = () => (
  <div className="auth-brand">
    <span className="auth-brand__mark">
      <Coffee size={22} strokeWidth={2.4} aria-hidden="true" />
    </span>
    <span>
      <span className="auth-brand__name">Tripple T</span>
      <span className="auth-brand__sub">Institutional Management Platform</span>
    </span>
  </div>
);

/** Read & clear any OAuth error Supabase appended to the redirect URL. */
const consumeOAuthUrlError = (): string | null => {
  if (typeof window === 'undefined') return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const code = hash.get('error') || query.get('error');
  if (!code) return null;
  const desc = hash.get('error_description') || query.get('error_description') || '';
  window.history.replaceState(null, '', window.location.pathname);
  if (code === 'access_denied') return 'Google sign-in was cancelled.';
  return `Google sign-in failed${desc ? `: ${desc.replace(/\+/g, ' ')}` : '.'}`;
};

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle } = useApp();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSuccessToast, setResetSuccessToast] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number>(() => Number(localStorage.getItem(LOCK_KEY)) || 0);
  const [now, setNow] = useState(Date.now());

  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const lockRemaining = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const isLocked = lockRemaining > 0;
  const busy = isLoading || isGoogleLoading;

  const onPortal = isPortalMode();

  useEffect(() => {
    document.title = onPortal
      ? 'Sign In | Academy Portal'
      : 'Sign In | Tripple T SMS';
  }, [onPortal]);

  // OAuth errors: from the redirect URL, or a rejected (unregistered) Google account
  useEffect(() => {
    const urlError = consumeOAuthUrlError();
    if (urlError) setError(urlError);

    const showOAuthError = () => {
      const msg = sessionStorage.getItem('aur_oauth_error');
      if (msg) {
        setError(msg);
        setIsGoogleLoading(false);
        sessionStorage.removeItem('aur_oauth_error');
      }
    };
    showOAuthError();
    window.addEventListener('aur-oauth-error', showOAuthError);
    return () => window.removeEventListener('aur-oauth-error', showOAuthError);
  }, []);

  // Lockout countdown
  useEffect(() => {
    if (!isLocked) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [isLocked]);

  useEffect(() => {
    if (lockedUntil && !isLocked) {
      localStorage.removeItem(LOCK_KEY);
      setLockedUntil(0);
      setFailedAttempts(0);
      setError(null);
    }
  }, [isLocked, lockedUntil]);

  const handleCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState?.('CapsLock') ?? false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || isLocked) return;
    setError(null);

    if (!identifier.trim()) {
      setError('Please enter your account identifier.');
      identifierRef.current?.focus();
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      passwordRef.current?.focus();
      return;
    }

    setIsLoading(true);
    try {
      const res = await login({ identifier: identifier.trim(), password });
      if (!res.success) {
        const attempts = failedAttempts + 1;
        setFailedAttempts(attempts);
        setPassword('');
        if (attempts >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_SECONDS * 1000;
          localStorage.setItem(LOCK_KEY, String(until));
          setLockedUntil(until);
          setNow(Date.now());
          setError('Too many failed attempts. For your security, sign-in is temporarily paused.');
        } else {
          const left = MAX_ATTEMPTS - attempts;
          setError(`${res.error || 'Invalid credentials.'}${left <= 2 ? ` ${left} attempt${left === 1 ? '' : 's'} remaining.` : ''}`);
          passwordRef.current?.focus();
        }
      }
    } catch {
      setError('Connection error. Please check your network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (busy) return;
    setError(null);
    setIsGoogleLoading(true);
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setError(
          res.notConfigured
            ? 'Google sign-in is temporarily unavailable. Please enter your credentials.'
            : res.error || 'Google sign-in failed. Please try again.'
        );
        setIsGoogleLoading(false);
      }
    } catch {
      setError('Google sign-in failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="auth">
      {/* ---------------- Brand / hero panel ---------------- */}
      <aside className="auth-hero" aria-hidden="true">
        <img className="auth-hero__img" src="/login-hero.jpg" alt="" />
        <Brand />
        <div className="auth-hero__copy">
          <span className="auth-hero__eyebrow">
            <Coffee size={13} /> Tripple T Systems
          </span>
          <p className="auth-hero__title">
            Empowering institutions with precision management and learning excellence.
          </p>
          <p className="auth-hero__lead">
            Centralized platform for admissions, curriculum, payments, and multi-campus governance.
          </p>
          <ul className="auth-campuses">
            <li><MapPin size={13} /> Nairobi</li>
            <li><MapPin size={13} /> Mombasa</li>
            <li><MapPin size={13} /> Kigali</li>
          </ul>
        </div>
      </aside>

      {/* ---------------- Sign-in panel ---------------- */}
      <main className="auth-panel">
        <div className="auth-card">
          <Brand />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '16px', background: onPortal ? 'rgba(16, 185, 129, 0.12)' : 'rgba(212, 154, 91, 0.12)', color: onPortal ? '#10B981' : 'var(--crema-gold)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '8px 0 10px 0' }}>
            {onPortal ? <GraduationCap size={13} /> : <Coffee size={13} />}
            <span>{onPortal ? 'Academy Portal' : 'Tripple T SMS'}</span>
          </div>

          <h1 className="auth-card__title">
            {onPortal ? 'Sign In to Academy Portal' : 'Sign In to Management'}
          </h1>
          <p className="auth-card__subtitle">
            Enter your credentials below to access your account.
          </p>

          <button
            type="button"
            id="google-signin-btn"
            className="auth-google"
            onClick={handleGoogle}
            disabled={busy}
          >
            {isGoogleLoading ? <span className="auth-spinner auth-spinner--google" aria-hidden="true" /> : <GoogleLogo />}
            <span>{isGoogleLoading ? 'Connecting…' : 'Continue with Google'}</span>
          </button>

          <div className="auth-divider">or sign in with credentials</div>

          <div aria-live="assertive">
            {error && (
              <div className="auth-alert auth-alert--error" role="alert" id="login-error" key={error}>
                <AlertCircle size={17} aria-hidden="true" />
                <p>
                  {error}
                  {isLocked && <> Try again in <strong>{lockRemaining}s</strong>.</>}
                </p>
              </div>
            )}
          </div>

          {resetSuccessToast && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10B981',
                color: '#10B981',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '16px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>{resetSuccessToast}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="login-identifier">
                Username or Email
              </label>
              <div className="auth-input">
                <span className="auth-input__icon">
                  <Mail size={17} aria-hidden="true" />
                </span>
                <input
                  ref={identifierRef}
                  id="login-identifier"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  required
                  placeholder="Enter your ID or email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  aria-invalid={!!error && !identifier.trim()}
                  aria-describedby={error ? 'login-error' : undefined}
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-field__row">
                <label htmlFor="login-password" style={{ margin: 0 }}>Password</label>
                <button
                  type="button"
                  id="forgot-password-btn"
                  className="auth-link"
                  onClick={() => setShowResetModal(true)}
                  aria-haspopup="dialog"
                >
                  Forgot password?
                </button>
              </div>
              <div className="auth-input">
                <span className="auth-input__icon"><Lock size={17} aria-hidden="true" /></span>
                <input
                  ref={passwordRef}
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={handleCapsLock}
                  onKeyDown={handleCapsLock}
                  onBlur={() => setCapsLock(false)}
                  aria-invalid={!!error && !password}
                  aria-describedby={capsLock ? 'caps-lock-hint' : error ? 'login-error' : undefined}
                  disabled={isLocked}
                />
                <button
                  type="button"
                  className="auth-input__toggle"
                  id="toggle-password-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {capsLock && (
                <div className="auth-hint" id="caps-lock-hint">
                  <AlertCircle size={13} aria-hidden="true" /> Caps Lock is on
                </div>
              )}
            </div>

            <button type="submit" id="login-submit-btn" className="auth-submit" disabled={busy || isLocked}>
              {isLoading ? (
                <>
                  <span className="auth-spinner" aria-hidden="true" />
                  <span>Signing in…</span>
                </>
              ) : isLocked ? (
                <span>Try again in {lockRemaining}s</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} className="auth-submit__arrow" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Clean Portal / SMS Link */}
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {onPortal ? 'Management login?' : 'Student or teacher login?'}
            </div>
            <button
              type="button"
              onClick={() => switchDomainMode(onPortal ? 'sms' : 'portal')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--crema-gold)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '2px 4px',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{onPortal ? 'Go to SMS' : 'Go to Academy Portal'}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <footer className="auth-footer">
            <span className="auth-footer__secure">
              <ShieldCheck size={14} aria-hidden="true" /> Encrypted connection · Authorized access only
            </span>
            <div className="auth-footer__row">
              <span>© {new Date().getFullYear()} Tripple T Systems</span>
              <a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>
            </div>
          </footer>
        </div>
      </main>

      <PasswordResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        initialIdentifier={identifier}
        onSuccess={(id, newPass) => {
          setIdentifier(id);
          setPassword(newPass);
          setError(null);
          setResetSuccessToast('Password successfully reset! Your new credentials have been filled below.');
          setTimeout(() => setResetSuccessToast(null), 8000);
        }}
      />
    </div>
  );
};
