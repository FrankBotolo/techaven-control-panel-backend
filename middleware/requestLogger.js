/**
 * Request logging middleware for debugging.
 * Logs method, path, query, and body (sensitive fields redacted).
 */

const SENSITIVE_KEYS = ['password', 'new_password', 'new_password_confirmation', 'otp', 'access_token', 'refresh_token'];

function redact(obj) {
  if (obj == null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.some((k) => lower.includes(k.toLowerCase()))) {
      out[key] = '[REDACTED]';
    } else {
      out[key] = typeof value === 'object' && value !== null ? redact(value) : value;
    }
  }
  return out;
}

export function requestLogger(req, res, next) {
  const ts = new Date().toISOString();
  const method = req.method;
  const path = req.originalUrl || req.url;
  const hasAuth = Boolean(req.headers.authorization);

  const logLine = [
    `[${ts}]`,
    method,
    path,
    hasAuth ? '(auth)' : '(no auth)'
  ].join(' ');

  console.log(logLine);

  if (Object.keys(req.query || {}).length > 0) {
    console.log('  query:', JSON.stringify(req.query));
  }

  if (req.body && Object.keys(req.body).length > 0) {
    console.log('  body:', JSON.stringify(redact(req.body)));
  }

  next();
}
