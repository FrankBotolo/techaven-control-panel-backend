/**
 * Browser `callback_url` (GET, query params). For Flutter, prefer dashboard webhook → POST /api/webhooks/paychangu.
 * Set PUBLIC_API_BASE_URL or API_BASE_URL (no trailing slash), e.g. https://api.techaven.mw
 */
export function getPayChanguBackendCallbackUrl() {
  const base = (process.env.PUBLIC_API_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '');
  if (!base) {
    return '/api/webhooks/paychangu/callback';
  }
  return `${base}/api/webhooks/paychangu/callback`;
}

/** Pay Changu dashboard → Settings → API & Webhooks (POST JSON + Signature). */
export function getPayChanguWebhookUrl() {
  const base = (process.env.PUBLIC_API_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '');
  if (!base) {
    return '/api/webhooks/paychangu';
  }
  return `${base}/api/webhooks/paychangu`;
}
