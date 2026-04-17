/**
 * URL to configure as Pay Changu `callback_url` (browser redirect with query params).
 * Set PUBLIC_API_BASE_URL or API_BASE_URL (no trailing slash), e.g. https://api.techaven.mw
 */
export function getPayChanguBackendCallbackUrl() {
  const base = (process.env.PUBLIC_API_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '');
  if (!base) {
    return '/api/webhooks/paychangu/callback';
  }
  return `${base}/api/webhooks/paychangu/callback`;
}
