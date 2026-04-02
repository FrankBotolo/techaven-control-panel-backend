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

/**
 * Unique Malipo order / merchant id per collect attempt.
 * Malipo returns "This order id already exists" if you reuse the same `order_id` — retries must use a new ref.
 * Webhook still resolves the shop subscription via the numeric id prefix: SUB-{id} or SUB-{id}-{suffix}.
 */
export function subscriptionMalipoMerchantRef(subscriptionId) {
  const sid = parseInt(subscriptionId, 10);
  if (!sid || Number.isNaN(sid)) {
    throw new Error('Invalid subscription id for Malipo ref');
  }
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `SUB-${sid}-${suffix}`;
}

/** Extract shop_subscription id from SUB-42 or SUB-42-{suffix} (case-insensitive SUB prefix). */
export function parseSubscriptionMerchantRef(merchantTxnId) {
  const m = String(merchantTxnId || '').match(/^SUB-(\d+)(?:-.+)?$/i);
  if (!m) return null;
  return parseInt(m[1], 10);
}
