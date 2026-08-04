export {
  parseSubscriptionMerchantRef,
  subscriptionPayChanguChargeId as subscriptionAirtelMerchantRef
} from './paychanguRefs.js';

export {
  getAirtelBaseUrl,
  getAirtelCredentials,
  getAirtelAccessToken,
  refreshAirtelAccessToken,
  getAirtelTokenCacheStatus,
  startAirtelTokenWarmup
} from './airtelToken.js';

import { getAirtelAccessToken, getAirtelBaseUrl, getAirtelCredentials } from './airtelToken.js';
import crypto from 'crypto';

const TXN_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** Unique id for Airtel `transaction.id` (e.g. RFYYGhuhSerrIhUY) — not the order id. */
export function generateAirtelTransactionId() {
  const bytes = crypto.randomBytes(16);
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += TXN_ID_ALPHABET[bytes[i] % TXN_ID_ALPHABET.length];
  }
  return id;
}

export function normalizeAirtelMsisdn(msisdn) {
  const local = String(msisdn).replace(/^\+265/, '0').replace(/^265/, '0');
  return local.replace(/^0/, '');
}

/** Airtel `reference` must be alphanumeric, max 64 chars (hyphens in order_number are stripped). */
export function normalizeAirtelReference(ref) {
  const s = String(ref ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 64);
  return s || null;
}

/** Reverse ORD202608041234 → ORD-20260804-1234 for DB lookup when webhook echoes normalized ref. */
export function denormalizeOrdOrderNumber(normalizedRef) {
  const m = String(normalizedRef ?? '').match(/^ORD(\d{8})(\d{4})$/i);
  if (!m) return null;
  return `ORD-${m[1]}-${m[2]}`;
}

/** @param {unknown} data */
export function isAirtelCollectSuccess(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const status = /** @type {{ status?: { success?: boolean, code?: string|number } }} */ (data).status;
  if (status?.success === true) {
    return true;
  }
  return String(status?.code) === '200';
}

/** @param {unknown} data */
export function getAirtelCollectErrorMessage(data) {
  if (!data || typeof data !== 'object') {
    return 'Airtel payment request failed';
  }
  const body = /** @type {{ status?: { message?: string }, message?: string, error?: string }} */ (data);
  return body.status?.message || body.message || body.error || 'Airtel payment request failed';
}

/**
 * Initiate an Airtel Money Collection push (USSD prompt on the customer's phone).
 * Malawi API: POST {base}/merchant/v1/payments/
 * @param {{ reference: string, msisdn: string, amount: number, transactionId?: string }} payload
 */
export async function postAirtelCollect(payload) {
  const { clientId, clientSecret } = getAirtelCredentials();
  if (!clientId || !clientSecret) {
    return { configured: false, response: null, data: {}, transactionId: null, success: false };
  }

  const token = await getAirtelAccessToken();
  const transactionId = payload.transactionId || generateAirtelTransactionId();
  const reference = normalizeAirtelReference(payload.reference);
  if (!reference) {
    return {
      configured: true,
      response: null,
      data: {},
      transactionId: null,
      airtelReference: null,
      success: false,
      message: 'Invalid payment reference (must be alphanumeric after normalization, max 64 chars)'
    };
  }
  const body = {
    reference,
    subscriber: {
      country: 'MW',
      currency: 'MWK',
      msisdn: normalizeAirtelMsisdn(payload.msisdn)
    },
    transaction: {
      amount: String(Math.round(Number(payload.amount) || 0)),
      country: 'MW',
      currency: 'MWK',
      id: transactionId
    }
  };

  const response = await fetch(`${getAirtelBaseUrl()}/merchant/v1/payments/`, {
    method: 'POST',
    headers: {
      Accept: '*/*',
      'Content-Type': 'application/json',
      'X-Country': 'MW',
      'X-Currency': 'MWK',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  const success = response.ok && isAirtelCollectSuccess(data);
  return {
    configured: true,
    response,
    data,
    transactionId,
    airtelReference: reference,
    success,
    message: success ? (data?.status?.message || 'SUCCESS') : getAirtelCollectErrorMessage(data)
  };
}
