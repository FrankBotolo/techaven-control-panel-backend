import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// FDI Biz Messaging API configuration
const fdiApiUrl = process.env.FDI_SMS_API_URL || 'https://messaging.efashe.com/mw/api/v1/mt/single';
const fdiAuthUrl = process.env.FDI_SMS_AUTH_URL || 'https://messaging.efashe.com/mw/api/v1/auth';
const fdiRefreshUrl = process.env.FDI_SMS_REFRESH_URL || 'https://messaging.efashe.com/mw/api/v1/auth/refresh';
const fdiApiUsername = process.env.FDI_SMS_API_USERNAME || process.env.FDI_SMS_API_KEY || '';
const fdiApiPassword = process.env.FDI_SMS_API_PASSWORD || process.env.FDI_SMS_API_SECRET || '';
const senderId = process.env.FDI_SMS_SENDER_ID || process.env.SMS_SENDER_ID || 'TECHAVEN';

// In-memory cached tokens
let fdiAccessToken = null;
let fdiAccessTokenExpiresAt = 0; // ms timestamp
let fdiRefreshToken = null;

/**
 * Format phone number to international format (265XXXXXXXXX)
 */
export function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') return null;
  let normalized = phoneNumber.replace(/\D/g, '');
  if (normalized.startsWith('0')) {
    normalized = '265' + normalized.substring(1);
  }
  if (!normalized.startsWith('265')) {
    normalized = '265' + normalized;
  }
  return normalized;
}

/**
 * Check if SMS is configured and enabled (FDI API credentials present)
 */
export function isSmsConfigured() {
  return !!(fdiApiUrl && fdiAuthUrl && fdiApiUsername && fdiApiPassword && senderId);
}

/**
 * Get or refresh FDI access token.
 * - Uses cached access_token until nearly expired
 * - If expired and we have a refresh_token, call refresh endpoint
 * - Otherwise fall back to full login with api_username/api_password
 */
async function getFdiAccessToken() {
  const now = Date.now();
  if (fdiAccessToken && fdiAccessTokenExpiresAt && now < fdiAccessTokenExpiresAt - 60_000) {
    return { success: true, token: fdiAccessToken };
  }

  // Try refresh with refresh_token if available
  if (fdiRefreshToken && fdiRefreshUrl) {
    try {
      const response = await fetch(fdiRefreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: fdiRefreshToken
        })
      });

      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (response.ok && data.access_token) {
        fdiAccessToken = data.access_token;
        if (data.refresh_token) {
          fdiRefreshToken = data.refresh_token;
        }
        if (data.expires_at) {
          const exp = Date.parse(data.expires_at);
          fdiAccessTokenExpiresAt = Number.isNaN(exp) ? now + 50 * 60_000 : exp;
        } else {
          fdiAccessTokenExpiresAt = now + 50 * 60_000;
        }
        return { success: true, token: fdiAccessToken };
      }

      console.error('FDI token refresh failed:', response.status, data);
      // fall through to full login
    } catch (error) {
      console.error('FDI token refresh error:', error.message);
      // fall through to full login
    }
  }

  // Full login with username/password
  try {
    const response = await fetch(fdiAuthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_username: fdiApiUsername,
        api_password: fdiApiPassword
      })
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok || !data.access_token) {
      console.error('FDI auth failed:', response.status, data);
      return {
        success: false,
        message: data.message || data.error || 'FDI auth failed',
        data
      };
    }

    fdiAccessToken = data.access_token;
    if (data.refresh_token) {
      fdiRefreshToken = data.refresh_token;
    }

    // expires_at: e.g. '2019-01-01T15:00:00Z'
    if (data.expires_at) {
      const exp = Date.parse(data.expires_at);
      fdiAccessTokenExpiresAt = Number.isNaN(exp) ? now + 50 * 60_000 : exp;
    } else {
      // fallback: 50 minutes from now
      fdiAccessTokenExpiresAt = now + 50 * 60_000;
    }

    return { success: true, token: fdiAccessToken };
  } catch (error) {
    console.error('FDI auth error:', error.message);
    return {
      success: false,
      message: 'FDI auth error: ' + error.message,
      data: null
    };
  }
}

/**
 * Send raw SMS via FDI Biz Messaging API
 * @param {string} phoneNumber - Recipient (will be formatted to +265XXXXXXXXX)
 * @param {string} message - SMS content (max 160 chars for single SMS)
 * @param {string} [refId] - Optional reference ID
 * @returns {{ success: boolean, message?: string, data?: object }}
 */
export async function sendSms(phoneNumber, message, refId = null) {
  if (!isSmsConfigured()) {
    console.warn('SMS not configured (missing FDI SMS API URL/auth URL/credentials or sender ID). Skipping SMS.');
    return { success: false, message: 'SMS not configured' };
  }

  const to = formatPhoneNumber(phoneNumber);
  if (!to) {
    console.error('Invalid phone number for SMS:', phoneNumber);
    return { success: false, message: 'Invalid phone number' };
  }

  // FDI expects MSISDN, we send in international format with leading +
  const msisdn = to.startsWith('+') ? to : `+${to}`;

  const msgRef = refId || `techaven-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  const authResult = await getFdiAccessToken();
  if (!authResult.success || !authResult.token) {
    return {
      success: false,
      message: authResult.message || 'Failed to authenticate with FDI SMS API',
      data: authResult.data || null
    };
  }

  try {
    const payload = {
      msisdn,
      message: message.substring(0, 160),
      sender_id: senderId,
      msgRef
    };

    const response = await fetch(fdiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // FDI expects a Bearer token in the Authorization header.
        Authorization: `Bearer ${authResult.token}`
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (response.ok) {
      console.log('FDI SMS sent successfully to', msisdn, 'ref:', msgRef);
      return { success: true, message: 'SMS sent successfully', data };
    }

    console.error('FDI SMS failed:', response.status, data);
    return {
      success: false,
      message: data.message || data.error || 'Failed to send SMS',
      data
    };
  } catch (error) {
    console.error('FDI SMS service error:', error.message);
    return {
      success: false,
      message: 'SMS service error: ' + error.message,
      data: null
    };
  }
}

/**
 * Send OTP for verification (signup / login)
 */
export async function sendOtpSms(phoneNumber, otp) {
  const message = `Your verification code is: ${otp}. This code expires in 12 hours. Do not share this code.`;
  return sendSms(phoneNumber, message);
}

/**
 * Send OTP for password reset
 */
export async function sendPasswordResetOtpSms(phoneNumber, otp) {
  const message = `Your password reset code is: ${otp}. This code expires in 12 hours. If you didn't request this, ignore.`;
  return sendSms(phoneNumber, message);
}

/**
 * Send short notification SMS (order/payment alerts). Keeps within 160 chars.
 */
export async function sendNotificationSms(phoneNumber, title, orderNumber = '') {
  const short = orderNumber ? ` ${orderNumber}` : '';
  const message = `Techaven: ${title}${short}. Check the app for details.`;
  return sendSms(phoneNumber, message.substring(0, 160));
}
