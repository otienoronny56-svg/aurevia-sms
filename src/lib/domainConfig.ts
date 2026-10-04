/**
 * Aurevia Subdomain & Multi-Portal Routing Configuration
 * 
 * Supports:
 * - portal.aureviacoffeeinstitute.* -> Academy Portal (Students & Faculty/Teachers)
 * - sms.aureviacoffeeinstitute.* -> System Management (Super Admin & Branch Managers)
 * - Localhost / Vercel Preview testing via ?mode=portal | ?mode=sms or localStorage
 */

export type AppDomainMode = 'portal' | 'sms';

const MODE_STORAGE_KEY = 'aur_subdomain_mode';

// Configurable production domain targets
export const PRODUCTION_PORTAL_URL = 'https://portal.aureviacoffeeinstitute.co.ke';
export const PRODUCTION_SMS_URL = 'https://sms.aureviacoffeeinstitute.co.ke';

/**
 * Detect current app domain mode:
 * 1. Checks URL query parameters (?mode=portal, ?mode=sms, ?portal=1)
 * 2. Checks window.location.hostname (starts with 'portal.' vs 'sms.' / others)
 * 3. Checks localStorage fallback
 * 4. Defaults to 'sms' for main administrative domain
 */
export function getAppDomainMode(): AppDomainMode {
  if (typeof window === 'undefined') return 'sms';

  // 1. Query param check (highest priority, enables testing on any environment/localhost)
  const params = new URLSearchParams(window.location.search);
  const paramMode = params.get('mode') || params.get('portal');
  if (paramMode === 'portal' || paramMode === 'true' || paramMode === '1') {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, 'portal');
    } catch (_) {}
    return 'portal';
  }
  if (paramMode === 'sms' || params.get('sms') === 'true') {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, 'sms');
    } catch (_) {}
    return 'sms';
  }

  // 2. Subdomain check in hostname
  const hostname = window.location.hostname.toLowerCase();
  if (hostname.startsWith('portal.') || hostname.includes('portal-')) {
    return 'portal';
  }
  if (hostname.startsWith('sms.') || hostname.includes('sms-') || hostname.startsWith('admin.')) {
    return 'sms';
  }

  // 3. LocalStorage persistence (e.g. toggled locally during dev)
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    if (saved === 'portal' || saved === 'sms') {
      return saved;
    }
  } catch (_) {}

  // 4. Default to 'sms' (operations management system)
  return 'sms';
}

/** Check if current runtime is in Student & Teacher Portal mode */
export function isPortalMode(): boolean {
  return getAppDomainMode() === 'portal';
}

/** Check if current runtime is in Management SMS mode */
export function isSmsMode(): boolean {
  return getAppDomainMode() === 'sms';
}

/**
 * Explicitly switch domain mode:
 * In production, navigates to the respective subdomain URL.
 * In localhost / staging / preview, saves to localStorage & reloads or updates query string.
 */
export function switchDomainMode(targetMode: AppDomainMode) {
  if (typeof window === 'undefined') return;

  const currentHost = window.location.hostname.toLowerCase();
  const isProductionDomain = currentHost.includes('aureviacoffeeinstitute');

  if (isProductionDomain) {
    if (targetMode === 'portal') {
      window.location.href = PRODUCTION_PORTAL_URL;
    } else {
      window.location.href = PRODUCTION_SMS_URL;
    }
    return;
  }

  // Non-production (localhost, vercel preview, IP)
  try {
    localStorage.setItem(MODE_STORAGE_KEY, targetMode);
  } catch (_) {}

  const url = new URL(window.location.href);
  url.searchParams.set('mode', targetMode);
  window.location.href = url.toString();
}

/**
 * Helper to get the cross-domain link for display in UI
 */
export function getTargetDomainUrl(targetMode: AppDomainMode): string {
  if (typeof window === 'undefined') {
    return targetMode === 'portal' ? PRODUCTION_PORTAL_URL : PRODUCTION_SMS_URL;
  }

  const currentHost = window.location.hostname.toLowerCase();
  const isProductionDomain = currentHost.includes('aureviacoffeeinstitute');

  if (isProductionDomain) {
    return targetMode === 'portal' ? PRODUCTION_PORTAL_URL : PRODUCTION_SMS_URL;
  }

  // Local/dev preview link with query parameter
  const url = new URL(window.location.href);
  url.searchParams.set('mode', targetMode);
  return url.toString();
}
