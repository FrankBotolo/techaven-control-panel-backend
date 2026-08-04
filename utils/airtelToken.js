import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/** Seconds before expiry to refresh (Airtel MW tokens last 180s). */
const TOKEN_REFRESH_BUFFER_SEC = Number(process.env.AIRTEL_TOKEN_REFRESH_BUFFER_SEC || 30);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');
let envLoaded = false;

/** Load server/.env on demand. override:true fixes PM2/systemd empty env vars blocking .env values. */
function ensureEnvLoaded() {
  if (envLoaded) return;
  dotenv.config({ path: ENV_PATH, override: true });
  envLoaded = true;
}

function trimEnv(value) {
  const v = value == null ? '' : String(value).trim();
  return v || null;
}

/** Last-resort: read a key straight from the .env file (when process.env is blank/stale). */
function readEnvFileKey(key) {
  try {
    if (!fs.existsSync(ENV_PATH)) return null;
    const content = fs.readFileSync(ENV_PATH, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const k = trimmed.slice(0, eq).trim();
      if (k !== key) continue;
      let v = trimmed.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      return v || null;
    }
  } catch {
    // ignore read/parse errors
  }
  return null;
}

export function getAirtelCredentials() {
  ensureEnvLoaded();

  let clientId = trimEnv(process.env.AIRTEL_CLIENT_ID);
  let clientSecret = trimEnv(process.env.AIRTEL_CLIENT_SECRET);

  if (!clientId) clientId = trimEnv(readEnvFileKey('AIRTEL_CLIENT_ID'));
  if (!clientSecret) clientSecret = trimEnv(readEnvFileKey('AIRTEL_CLIENT_SECRET'));

  return { clientId, clientSecret };
}

let cachedToken = null;
let cachedTokenExpiresAt = 0;
let refreshTimer = null;
let refreshPromise = null;

export function getAirtelBaseUrl() {
  ensureEnvLoaded();
  let airtelEnv = trimEnv(process.env.AIRTEL_ENV) || trimEnv(readEnvFileKey('AIRTEL_ENV'));
  const override = (process.env.AIRTEL_API_BASE_URL || readEnvFileKey('AIRTEL_API_BASE_URL') || '').trim();
  if (override) {
    return override.replace(/\/$/, '');
  }
  return airtelEnv === 'production'
    ? 'https://openapi.airtel.mw'
    : 'https://openapiuat.airtel.mw';
}

function scheduleProactiveRefresh(expiresInSec) {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const refreshInMs = Math.max((expiresInSec - TOKEN_REFRESH_BUFFER_SEC) * 1000, 5000);
  refreshTimer = setTimeout(() => {
    refreshAirtelAccessToken().catch((err) => {
      console.error('[Airtel] Proactive token refresh failed:', err.message);
    });
  }, refreshInMs);

  if (typeof refreshTimer.unref === 'function') {
    refreshTimer.unref();
  }
}

async function requestAirtelAccessToken() {
  const { clientId, clientSecret } = getAirtelCredentials();
  if (!clientId || !clientSecret) {
    throw new Error('Airtel credentials not configured (AIRTEL_CLIENT_ID / AIRTEL_CLIENT_SECRET)');
  }

  const response = await fetch(`${getAirtelBaseUrl()}/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: '*/*' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(`Airtel token request failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Fetch a new access token and update the in-memory cache + proactive refresh timer.
 * @returns {Promise<string>}
 */
export async function refreshAirtelAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const data = await requestAirtelAccessToken();
    const expiresIn = Number(data.expires_in || 180);

    cachedToken = data.access_token;
    cachedTokenExpiresAt = Date.now() + Math.max(expiresIn - TOKEN_REFRESH_BUFFER_SEC, 1) * 1000;
    scheduleProactiveRefresh(expiresIn);

    return cachedToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Return a valid bearer token, refreshing automatically when near expiry (default: 30s before 180s TTL).
 * @returns {Promise<string>}
 */
export async function getAirtelAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken;
  }
  return refreshAirtelAccessToken();
}

/** @returns {{ hasToken: boolean, expiresAt: number|null, expiresInSec: number|null }} */
export function getAirtelTokenCacheStatus() {
  if (!cachedToken || !cachedTokenExpiresAt) {
    return { hasToken: false, expiresAt: null, expiresInSec: null };
  }
  const expiresInSec = Math.max(0, Math.round((cachedTokenExpiresAt - Date.now()) / 1000));
  return { hasToken: true, expiresAt: cachedTokenExpiresAt, expiresInSec };
}

/**
 * Fetch an initial token on server boot when credentials are configured,
 * then keep refreshing via the proactive timer.
 */
export function startAirtelTokenWarmup() {
  const { clientId, clientSecret } = getAirtelCredentials();
  if (!clientId || !clientSecret) {
    const envExists = fs.existsSync(ENV_PATH);
    console.warn(
      '[Airtel] Credentials missing — set AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET in',
      ENV_PATH,
      envExists ? '(file exists)' : '(file NOT found)',
      'cwd:',
      process.cwd()
    );
    return;
  }

  void refreshAirtelAccessToken()
    .then(() => {
      const status = getAirtelTokenCacheStatus();
      console.log(`[Airtel] Access token warmed up (valid ~${status.expiresInSec}s, auto-refresh enabled)`);
    })
    .catch((err) => {
      console.error('[Airtel] Startup token warmup failed:', err.message);
    });
}
