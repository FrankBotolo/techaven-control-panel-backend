import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CAPTURE_DIR = path.join(__dirname, '..', 'logs', 'webhook-captures');

/**
 * Captures everything a webhook sends for inspection.
 * Writes to logs/webhook-captures/{webhookName}-{timestamp}.json
 *
 * @param {string} webhookName - e.g. 'malipo'
 * @param {object} req - Express request
 */
export function captureWebhook(webhookName, req) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${webhookName}-${timestamp}.json`;

  const payload = {
    captured_at: new Date().toISOString(),
    webhook: webhookName,
    method: req.method,
    path: req.path,
    url: req.originalUrl,
    query: req.query || {},
    headers: sanitizeHeaders(req.headers),
    body: req.body ?? null,
    ip: req.ip
  };

  try {
    if (!fs.existsSync(CAPTURE_DIR)) {
      fs.mkdirSync(CAPTURE_DIR, { recursive: true });
    }
    const filepath = path.join(CAPTURE_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`[Webhook] Captured ${webhookName} → ${filepath}`);
  } catch (err) {
    console.error('[Webhook] Capture failed:', err);
  }
}

/** Remove sensitive headers, keep structure readable */
function sanitizeHeaders(headers) {
  const out = {};
  const skip = ['authorization', 'cookie'];
  for (const [k, v] of Object.entries(headers || {})) {
    const key = k.toLowerCase();
    if (skip.includes(key)) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = v;
    }
  }
  return out;
}
