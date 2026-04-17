const VERIFY_BASE = 'https://api.paychangu.com/verify-payment';

export function getPayChanguSecretKey() {
  return (process.env.PAYCHANGU_SECRET_KEY || '').trim();
}

/**
 * Server-side verify — source of truth. GET /verify-payment/{tx_ref}
 * @param {string} txRef
 * @returns {Promise<{ ok: boolean, httpStatus: number, json: object | null, error?: string }>}
 */
export async function verifyPayChanguTxRef(txRef) {
  const secret = getPayChanguSecretKey();
  const ref = encodeURIComponent(String(txRef || '').trim());
  if (!ref) {
    return { ok: false, httpStatus: 0, json: null, error: 'missing_tx_ref' };
  }
  if (!secret) {
    return { ok: false, httpStatus: 0, json: null, error: 'paychangu_not_configured' };
  }

  const url = `${VERIFY_BASE}/${ref}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${secret}`
      }
    });
    const json = await response.json().catch(() => null);
    return { ok: response.ok, httpStatus: response.status, json, error: response.ok ? undefined : 'http_error' };
  } catch (e) {
    return {
      ok: false,
      httpStatus: 0,
      json: null,
      error: e instanceof Error ? e.message : 'fetch_failed'
    };
  }
}

/**
 * True when Pay Changu verify `data.status` is a successful payment.
 * @param {object} verifyJson - full body from verify endpoint
 */
export function paychanguVerifyDataIndicatesPaid(verifyJson) {
  if (!verifyJson || typeof verifyJson !== 'object') return false;
  const data = verifyJson.data;
  const s = String(
    (data && typeof data === 'object' ? data.status : null) || verifyJson.status || ''
  ).toLowerCase();
  return ['success', 'successful', 'succeeded', 'completed', 'complete', 'paid'].includes(s);
}
