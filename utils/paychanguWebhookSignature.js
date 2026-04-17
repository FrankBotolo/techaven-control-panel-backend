import crypto from 'crypto';

/**
 * Pay Changu dashboard webhooks: SHA-256 HMAC of raw body, compared to `Signature` header (hex).
 * @param {Buffer} rawBody
 * @param {string|undefined} signatureHeader
 * @param {string} webhookSecret
 */
export function verifyPayChanguWebhookSignature(rawBody, signatureHeader, webhookSecret) {
  if (!webhookSecret || !signatureHeader || !rawBody || !Buffer.isBuffer(rawBody)) {
    return false;
  }
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const got = String(signatureHeader).trim().toLowerCase();
  const exp = expected.toLowerCase();
  if (exp.length !== got.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(exp, 'utf8'), Buffer.from(got, 'utf8'));
  } catch {
    return false;
  }
}
