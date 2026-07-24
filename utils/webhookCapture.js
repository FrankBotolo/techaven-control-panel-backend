import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRIMARY_CAPTURE_DIR = path.join(__dirname, '..', 'logs', 'webhook-captures');
const FALLBACK_CAPTURE_DIR = path.join(os.tmpdir(), 'webhook-captures');

// Set once the primary dir proves unwritable (e.g. deploy user lacks permission on the app's
// logs/ folder) so every subsequent call skips straight to the fallback instead of re-failing.
let useFallbackDir = false;

/**
 * Captures everything a webhook sends for inspection.
 * Writes to logs/webhook-captures/{webhookName}-{timestamp}.json, falling back to the OS temp
 * dir if that location isn't writable (e.g. permission issues on the deployed app directory).
 *
 * @param {string} webhookName - e.g. 'airtel'
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

  const dirsToTry = useFallbackDir ? [FALLBACK_CAPTURE_DIR] : [PRIMARY_CAPTURE_DIR, FALLBACK_CAPTURE_DIR];

  for (const dir of dirsToTry) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const filepath = path.join(dir, filename);
      fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), 'utf8');
      console.log(`[Webhook] Captured ${webhookName} → ${filepath}`);
      if (dir === FALLBACK_CAPTURE_DIR) useFallbackDir = true;
      return;
    } catch (err) {
      console.error(`[Webhook] Capture failed writing to ${dir}:`, err.message);
    }
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
