import crypto from 'crypto';

/**
 * Verify an Airtel Money webhook signature.
 * Airtel signs payloads with HMAC-SHA256 over the raw request body,
 * sending the hex digest in the `x-airtel-signature` header.
 *
 * @param {Buffer} rawBody - Raw request body buffer
 * @param {string|undefined} signature - Value of x-airtel-signature header
 * @param {string} secret - AIRTEL_WEBHOOK_SECRET from env
 * @returns {boolean}
 */
export function verifyAirtelWebhookSignature(rawBody, signature, secret) {
  if (!signature || !secret || !rawBody) return false;
  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature.toLowerCase(), 'hex'));
  } catch {
    return false;
  }
}
