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

/** Fixed merchant reference on every Airtel Collection push (spaces stripped → alphanumeric). */
export const AIRTEL_COLLECT_REFERENCE = 'Testing transaction';

export function getAirtelCollectReference() {
  return normalizeAirtelReference( 'Techaven transaction');
}

/** Unique random id (legacy / manual test flows). Order pay uses order_number as transaction.id. */
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

/** Ensure value is alphanumeric, max 64 (legacy order numbers may contain hyphens). */
export function normalizeAirtelReference(ref) {
  const s = String(ref ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 64);
  return s || null;
}

/** Reverse ORD202608041234 → ORD-20260804-1234 for DB lookup when webhook echoes normalized id. */
export function denormalizeOrdOrderNumber(normalizedRef) {
  const m = String(normalizedRef ?? '').match(/^ORD(\d{8})(\d{4})$/i);
  if (!m) return null;
  return `ORD-${m[1]}-${m[2]}`;
}

/** Build order_number lookup candidates from Airtel callback transaction.id (order number). */
export function orderNumberLookupCandidates(transactionId) {
  const s = String(transactionId ?? '').trim();
  if (!s) return [];
  const out = new Set([s]);
  const normalized = normalizeAirtelReference(s);
  if (normalized) out.add(normalized);
  const denorm = denormalizeOrdOrderNumber(s);
  if (denorm) out.add(denorm);
  if (normalized) {
    const denormFromNorm = denormalizeOrdOrderNumber(normalized);
    if (denormFromNorm) out.add(denormFromNorm);
  }
  return [...out];
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
 * @param {{ msisdn: string, amount: number, transactionId: string }} payload — transactionId = order_number (alphanumeric)
 */
export async function postAirtelCollect(payload) {
  const { clientId, clientSecret } = getAirtelCredentials();
  if (!clientId || !clientSecret) {
    return { configured: false, response: null, data: {}, transactionId: null, success: false };
  }

  const reference = getAirtelCollectReference();
  const transactionId = normalizeAirtelReference(payload.transactionId);
  if (!transactionId) {
    return {
      configured: true,
      response: null,
      data: {},
      transactionId: null,
      airtelReference: reference,
      success: false,
      message: 'transactionId (order number) is required and must be alphanumeric, max 64 chars'
    };
  }

  const token = await getAirtelAccessToken();
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

  const url = `${getAirtelBaseUrl()}/merchant/v1/payments/`;
  console.log('[Airtel collect] POST', url);
  console.log('[Airtel collect] Request payload:', JSON.stringify(body, null, 2));

  const response = await fetch(url, {
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
  console.log('[Airtel collect] Response:', response.status, JSON.stringify(data, null, 2));
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
