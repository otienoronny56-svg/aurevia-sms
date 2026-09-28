/**
 * Aurevia Specialty Coffee Academy - Resend Email Integration Client
 * Provides robust Resend API dispatch, custom sender configuration,
 * automated fallbacks, and real-time connection testing.
 */

import { supabase } from './supabase';

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  isSandboxMode: boolean;
  isConfigured: boolean;
}

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  status: 'delivered' | 'simulated' | 'failed';
  error?: string;
  provider: 'resend' | 'supabase_edge';
  timestamp: string;
}

const STORAGE_KEY = 'aur_resend_config';

export const VERIFIED_DOMAIN = 'aureviacoffeeinstitute.co.ke';
export const DEFAULT_FROM_EMAIL = 'noreply@aureviacoffeeinstitute.co.ke';
export const DEFAULT_REPLY_TO = 'info@aureviacoffeeinstitute.co.ke';

/**
 * Loads Resend configuration from environment or administrator overrides
 */
export function getResendConfig(): ResendConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Clean up legacy sandbox states from before backend Edge Function deployment
      const cleanedFrom = parsed.fromEmail && parsed.fromEmail.includes(`@${VERIFIED_DOMAIN}`) ? parsed.fromEmail : DEFAULT_FROM_EMAIL;
      return {
        apiKey: parsed.apiKey || '',
        fromEmail: cleanedFrom,
        fromName: parsed.fromName || 'Aurevia Specialty Coffee Academy',
        replyTo: parsed.replyTo || DEFAULT_REPLY_TO,
        isSandboxMode: false,
        isConfigured: true,
      };
    }
  } catch (err) {
    console.warn('Could not read saved Resend configuration:', err);
  }

  return {
    apiKey: '',
    fromEmail: DEFAULT_FROM_EMAIL,
    fromName: 'Aurevia Specialty Coffee Academy',
    replyTo: DEFAULT_REPLY_TO,
    isSandboxMode: false,
    isConfigured: true,
  };
}

/**
 * Saves administrator Resend configuration overrides
 */
export function saveResendConfig(config: Partial<ResendConfig>): ResendConfig {
  const current = getResendConfig();
  const updated: ResendConfig = {
    ...current,
    ...config,
    isSandboxMode: false,
    isConfigured: true,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save Resend config to localStorage:', err);
  }
  return updated;
}

/**
 * Sends an email using the Resend REST API (https://api.resend.com/emails)
 * Gracefully falls back to interactive simulated delivery if in sandbox or missing key.
 */
export async function sendResendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const config = getResendConfig();
  const timestamp = new Date().toISOString();
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const validRecipients = recipients.filter((r) => r && r !== 'N/A' && r.includes('@'));

  if (validRecipients.length === 0) {
    return {
      success: false,
      status: 'failed',
      error: 'No valid recipient email address provided.',
      provider: 'resend',
      timestamp,
    };
  }

  const rawSender = payload.fromEmail || config.fromEmail || DEFAULT_FROM_EMAIL;
  // Ensure the sender address belongs to our verified domain
  const senderAddress = rawSender.includes(`@${VERIFIED_DOMAIN}`) ? rawSender : DEFAULT_FROM_EMAIL;
  const senderName = payload.fromName || config.fromName || 'Aurevia Specialty Coffee Academy';
  const fromHeader = `${senderName} <${senderAddress}>`;
  const replyTo = payload.replyTo || config.replyTo || DEFAULT_REPLY_TO;

  // 1. PRIMARY DISPATCH: Secure Supabase Edge Function (Keeps API Key secret on backend)
  try {
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('send-resend-email', {
      body: {
        to: validRecipients,
        from: fromHeader,
        subject: payload.subject,
        html: payload.html,
        text: payload.text || undefined,
        replyTo,
      },
    });

    if (!edgeError && edgeData?.id) {
      console.log(`[SUPABASE EDGE FUNCTION -> RESEND] Live Email Dispatched! ID: ${edgeData.id} | To: ${validRecipients.join(', ')}`);
      return {
        success: true,
        messageId: edgeData.id,
        status: 'delivered',
        provider: 'supabase_edge',
        timestamp,
      };
    }

    if (edgeData?.error) {
      const errMsg = typeof edgeData.error === 'string' ? edgeData.error : (edgeData.error.message || JSON.stringify(edgeData.error));
      console.error('[SUPABASE EDGE FUNCTION RESEND ERROR]', errMsg);
      return {
        success: false,
        status: 'failed',
        error: errMsg,
        provider: 'supabase_edge',
        timestamp,
      };
    }

    if (edgeError) {
      console.error('[SUPABASE EDGE FUNCTION NOTICE]', edgeError);
      // If Edge function fails with an explicit error, do not silently pretend it succeeded
      return {
        success: false,
        status: 'failed',
        error: edgeError.message || 'Edge function invocation failed',
        provider: 'supabase_edge',
        timestamp,
      };
    }
  } catch (edgeCallErr: any) {
    console.error('[SUPABASE EDGE FUNCTION CALL NOTICE]', edgeCallErr);
    return {
      success: false,
      status: 'failed',
      error: edgeCallErr?.message || 'Failed to call Supabase Edge function',
      provider: 'supabase_edge',
      timestamp,
    };
  }

  // 2. SECONDARY DISPATCH: Direct API call if client environment key is provided
  if (config.apiKey && !config.apiKey.startsWith('re_demo') && config.apiKey.startsWith('re_')) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromHeader,
          to: validRecipients,
          subject: payload.subject,
          html: payload.html,
          text: payload.text || undefined,
          reply_to: replyTo,
          tags: payload.tags,
        }),
      });

      const data = await response.json();

      if (response.ok && data.id) {
        console.log(`[RESEND LIVE EMAIL DISPATCHED] ID: ${data.id} | To: ${validRecipients.join(', ')}`);
        return {
          success: true,
          messageId: data.id,
          status: 'delivered',
          provider: 'resend',
          timestamp,
        };
      }

      const errorDetail = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
      console.warn('[RESEND API ERROR]', errorDetail);

      return {
        success: false,
        status: 'failed',
        error: errorDetail,
        provider: 'resend',
        timestamp,
      };
    } catch (fetchErr: any) {
      console.warn('[RESEND DIRECT FETCH NOTICE]:', fetchErr.message);
      return {
        success: false,
        status: 'failed',
        error: fetchErr.message,
        provider: 'resend',
        timestamp,
      };
    }
  }

  // 3. Fallback for unconfigured environments
  return {
    success: false,
    status: 'failed',
    error: 'No active email provider configured. Please check Supabase Edge Function deployment.',
    provider: 'resend',
    timestamp,
  };
}

/**
 * Tests live connection to Resend by sending a test diagnostic email
 * via Supabase Edge Function first, then direct API fallback.
 */
export async function testResendConnection(
  apiKey: string,
  toEmail: string,
  fromEmail?: string
): Promise<{ success: boolean; messageId?: string; error?: string; mode: 'live' | 'sandbox'; provider?: string }> {
  const sender = fromEmail || DEFAULT_FROM_EMAIL;
  const cleanKey = apiKey ? apiKey.trim() : '';

  // 1. First test via Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('send-resend-email', {
      body: {
        to: [toEmail],
        from: `Aurevia Specialty Coffee Academy <${sender}>`,
        subject: 'Aurevia Specialty Coffee Academy: Resend Gateway Test Verification',
        html: `
          <div style="background-color: #181310; color: #F5EBE1; font-family: sans-serif; padding: 28px; border-radius: 12px; border: 1px solid #D49A5B; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #D49A5B; margin-top: 0; font-size: 20px;">✓ Resend API Connection Verified</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #E6DCD2;">
              Your connection to the Resend Email Delivery Network for <strong>Aurevia Specialty Coffee Academy</strong> is fully operational.
            </p>
            <div style="background: rgba(212, 154, 91, 0.1); border-left: 3px solid #D49A5B; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 13px; color: #D49A5B;"><strong>Verified Sender:</strong> ${sender}</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #D49A5B;"><strong>Domain:</strong> ${VERIFIED_DOMAIN}</p>
            </div>
            <p style="font-size: 12px; color: #8C827A; margin-bottom: 0;">Dispatched via Supabase Edge Function &bull; ${new Date().toUTCString()}</p>
          </div>
        `,
        replyTo: DEFAULT_REPLY_TO,
      },
    });

    if (!error && data?.id) {
      return {
        success: true,
        messageId: data.id,
        mode: 'live',
        provider: 'Supabase Edge Function',
      };
    }

    if (data?.error) {
      const msg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
      return {
        success: false,
        error: msg,
        mode: 'live',
      };
    }

    if (error && error.message) {
      return {
        success: false,
        error: error.message,
        mode: 'live',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to connect to Supabase Edge Function',
      mode: 'live',
    };
  }

  // 2. Direct API fallback if key is provided in frontend
  if (cleanKey && cleanKey.startsWith('re_') && !cleanKey.startsWith('re_demo')) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Aurevia Coffee Academy <${sender}>`,
          to: [toEmail],
          subject: 'Aurevia Specialty Coffee Academy: Resend Gateway Connection Verified',
          html: `
            <div style="background-color: #181310; color: #F5EBE1; font-family: sans-serif; padding: 24px; border-radius: 8px; border: 1px solid #D49A5B;">
              <h2 style="color: #D49A5B; margin-top: 0;">✓ Resend API Connection Verified</h2>
              <p>Your connection to the Resend Email Delivery Network for <strong>Aurevia Specialty Coffee Academy</strong> is active and operating.</p>
              <p style="font-size: 13px; color: #A89B8F;">Timestamp: ${new Date().toUTCString()}</p>
            </div>
          `,
        }),
      });

      const data = await res.json();

      if (res.ok && data.id) {
        return {
          success: true,
          messageId: data.id,
          mode: 'live',
          provider: 'Direct Resend API',
        };
      }

      return {
        success: false,
        error: data?.message || `HTTP ${res.status}: ${res.statusText}`,
        mode: 'live',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network request failed. Deploy and configure the Supabase Edge Function to avoid CORS.',
        mode: 'live',
      };
    }
  }

  // 3. Fallback
  return {
    success: false,
    error: 'Supabase Edge Function was unable to dispatch the email. Check your browser network tab for details.',
    mode: 'live',
  };
}
