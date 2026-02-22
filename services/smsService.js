import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const apiUrl = process.env.SMS_API_URL || 'http://206.225.81.36:8989/api/messaging/sendsms';
const balanceUrl = process.env.SMS_BALANCE_URL || 'http://206.225.81.36/BalanceChecker/GetBalance.php';
const bearerToken = process.env.SMS_BEARER_TOKEN || '';
const senderId = process.env.SMS_SENDER_ID || 'TECHAVEN';
const orgId = process.env.SMS_ORG_ID || '657';

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
 * Check if SMS is configured and enabled
 */
export function isSmsConfigured() {
  return !!(apiUrl && bearerToken && senderId);
}

/**
 * Send raw SMS via Click Mobile API
 * @param {string} phoneNumber - Recipient (will be formatted to 265XXXXXXXXX)
 * @param {string} message - SMS content (max 160 chars for single SMS)
 * @param {string} [refId] - Optional reference ID
 * @returns {{ success: boolean, message?: string, data?: object }}
 */
export async function sendSms(phoneNumber, message, refId = null) {
  if (!isSmsConfigured()) {
    console.warn('SMS not configured (missing SMS_API_URL, SMS_BEARER_TOKEN, or SMS_SENDER_ID). Skipping SMS.');
    return { success: false, message: 'SMS not configured' };
  }

  const to = formatPhoneNumber(phoneNumber);
  if (!to) {
    console.error('Invalid phone number for SMS:', phoneNumber);
    return { success: false, message: 'Invalid phone number' };
  }

  try {
    const payload = {
      from: senderId,
      to,
      message: message.substring(0, 160) // single SMS limit
    };
    if (refId) payload.refId = refId;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (data.status === 'SUCCESS') {
      console.log('SMS sent successfully to', to, 'msgId:', data.msgId);
      return { success: true, message: 'SMS sent successfully', data };
    }

    console.error('SMS failed:', data.desc || data.statusCode, data);
    return {
      success: false,
      message: data.desc || 'Failed to send SMS',
      data
    };
  } catch (error) {
    console.error('SMS service error:', error.message);
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

/**
 * Check SMS balance (credits)
 * @returns {{ success: boolean, balance?: string, message?: string }}
 */
export async function getSmsBalance() {
  if (!balanceUrl || !orgId) {
    return { success: false, message: 'SMS balance URL or ORG_ID not configured' };
  }

  try {
    const url = `${balanceUrl}?org_id=${orgId}`;
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));

    if (data.balance !== undefined) {
      return { success: true, balance: data.balance, data };
    }
    return { success: false, message: 'Invalid balance response', data };
  } catch (error) {
    console.error('SMS balance check failed:', error.message);
    return { success: false, message: 'Balance check error: ' + error.message, data: null };
  }
}
