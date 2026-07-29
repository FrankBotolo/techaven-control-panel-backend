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
  const body = {
    reference: payload.reference,
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
    success,
    message: success ? (data?.status?.message || 'SUCCESS') : getAirtelCollectErrorMessage(data)
  };
}
