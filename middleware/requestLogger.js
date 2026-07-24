/**
 * Request/response logging middleware for every API call, on by default so it shows up in
 * `pm2 logs` for both success and failure. Logs the request up front (method, path, query,
 * body — sensitive fields redacted), then logs the outcome once a response is actually sent
 * (status code, OK/FAIL, duration) — this covers every route regardless of whether it responds
 * via a controller's own try/catch, a thrown error, or the global error handler, since it hooks
 * the response itself rather than any one failure path.
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
  const start = Date.now();
  const method = req.method;
  const path = req.originalUrl || req.url;
  const hasAuth = Boolean(req.headers.authorization);

  console.log(`[${new Date().toISOString()}] --> ${method} ${path} ${hasAuth ? '(auth)' : '(no auth)'}`);

  if (Object.keys(req.query || {}).length > 0) {
    console.log('  query:', JSON.stringify(req.query));
  }

  if (req.body && Object.keys(req.body).length > 0) {
    console.log('  body:', JSON.stringify(redact(req.body)));
  }

  res.on('finish', () => {
    const status = res.statusCode;
    const outcome = status >= 400 ? 'FAIL' : 'OK';
    const duration = Date.now() - start;
    const line = `[${new Date().toISOString()}] <-- ${method} ${path} ${status} ${outcome} (${duration}ms)`;
    if (status >= 400) {
      console.error(line);
    } else {
      console.log(line);
    }
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      console.error(`[${new Date().toISOString()}] <-- ${method} ${path} CONNECTION CLOSED (no response sent, ${Date.now() - start}ms)`);
    }
  });

  next();
}
