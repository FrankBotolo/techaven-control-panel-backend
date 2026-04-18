const MALIPO_COLLECT_URL = 'https://gateway.malipo.mw/api/v2/transactions/collect';

export function getMalipoCredentials() {
  return {
    apiKey: process.env.MALIPO_API_KEY,
    appId: process.env.MALIPO_APP_ID
  };
}

export function normalizeMalipoMsisdn(msisdn) {
  return String(msisdn).replace(/^\+265/, '0').replace(/^265/, '0');
}

/**
 * Initiate Malipo /collect. Malipo echoes merchant_txn_id in the webhook.
 * @param {{ order_id: string, merchant_txn_id: string, msisdn: string, amount: number, psp_id: number }} payload
 */
export async function postMalipoCollect(payload) {
  const { apiKey, appId } = getMalipoCredentials();
  if (!apiKey || !appId) {
    return { configured: false, response: null, data: {} };
  }
  const body = {
    order_id: payload.order_id,
    merchant_txn_id: payload.merchant_txn_id,
    msisdn: normalizeMalipoMsisdn(payload.msisdn),
    amount: Math.round(Number(payload.amount) || 0),
    psp_id: payload.psp_id
  };
  const response = await fetch(MALIPO_COLLECT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'x-app-id': appId
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  return { configured: true, response, data };
}

/** @see ../utils/paychanguRefs.js — shared SUB-{id}-{suffix} refs for Malipo collect & Pay Changu */
export {
  parseSubscriptionMerchantRef,
  subscriptionPayChanguChargeId as subscriptionMalipoMerchantRef
} from './paychanguRefs.js';
