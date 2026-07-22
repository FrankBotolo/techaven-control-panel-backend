export {
  parseSubscriptionMerchantRef,
  subscriptionPayChanguChargeId as subscriptionAirtelMerchantRef
} from './paychanguRefs.js';

function getAirtelBaseUrl() {
  return process.env.AIRTEL_ENV === 'production'
    ? 'https://openapi.airtel.africa'
    : 'https://openapiuat.airtel.africa';
}

export function getAirtelCredentials() {
  return {
    clientId: process.env.AIRTEL_CLIENT_ID,
    clientSecret: process.env.AIRTEL_CLIENT_SECRET
  };
}

export function normalizeAirtelMsisdn(msisdn) {
  const local = String(msisdn).replace(/^\+265/, '0').replace(/^265/, '0');
  return local.replace(/^0/, '');
}

export function generateAirtelTransactionRef() {
  return `AT${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
}

let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAirtelAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) {
    return cachedToken;
  }

  const { clientId, clientSecret } = getAirtelCredentials();
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

  cachedToken = data.access_token;
  cachedTokenExpiresAt = Date.now() + (Number(data.expires_in || 3600) - 60) * 1000;
  return cachedToken;
}

/**
 * Initiate an Airtel Money Collection push (USSD prompt on the customer's phone).
 * Airtel echoes `reference` and `transaction.id` back in the /api/webhooks/airtel callback.
 * @param {{ reference: string, msisdn: string, amount: number }} payload
 */
export async function postAirtelCollect(payload) {
  const { clientId, clientSecret } = getAirtelCredentials();
  if (!clientId || !clientSecret) {
    return { configured: false, response: null, data: {} };
  }

  const token = await getAirtelAccessToken();
  const transactionId = generateAirtelTransactionRef();
  const body = {
    reference: payload.reference,
    subscriber: {
      country: 'MW',
      currency: 'MWK',
      msisdn: normalizeAirtelMsisdn(payload.msisdn)
    },
    transaction: {
      amount: Math.round(Number(payload.amount) || 0),
      country: 'MW',
      currency: 'MWK',
      id: transactionId
    }
  };

  const response = await fetch(`${getAirtelBaseUrl()}/merchant/v1/payments/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: '*/*',
      'X-Country': 'MW',
      'X-Currency': 'MWK',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  return { configured: true, response, data, transactionId };
}
