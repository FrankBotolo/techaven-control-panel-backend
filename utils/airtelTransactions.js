import { getAirtelAccessToken, getAirtelBaseUrl, getAirtelCredentials } from './airtelToken.js';
import { normalizeAirtelReference } from './airtelCollect.js';

function airtelMerchantHeaders(token) {
  return {
    Accept: '*/*',
    Authorization: `Bearer ${token}`,
    'X-Country': 'MW',
    'X-Currency': 'MWK'
  };
}

/** @param {unknown} data */
export function isAirtelTransactionSummarySuccess(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const body = /** @type {{ transaction?: { status?: { success?: boolean, code?: string|number } }, status?: { success?: boolean, code?: string|number } }} */ (data);
  const txnStatus = body.transaction?.status;
  if (txnStatus?.success === true) {
    return true;
  }
  if (String(txnStatus?.code) === '200') {
    return true;
  }
  const topStatus = body.status;
  if (topStatus?.success === true) {
    return true;
  }
  return String(topStatus?.code) === '200';
}

/**
 * GET {base}/merchant/v1/transactions — transaction summary from Airtel Malawi.
 * @param {{ transactionId?: string }} [options] — when set, appended as /{id} (normalized alphanumeric)
 */
export async function getAirtelTransactionSummary({ transactionId } = {}) {
  const { clientId, clientSecret } = getAirtelCredentials();
  if (!clientId || !clientSecret) {
    return {
      configured: false,
      response: null,
      data: {},
      transactionId: null,
      success: false,
      message: 'Airtel is not configured (AIRTEL_CLIENT_ID / AIRTEL_CLIENT_SECRET)'
    };
  }

  const normalizedId = transactionId ? normalizeAirtelReference(transactionId) : null;
  if (transactionId && !normalizedId) {
    return {
      configured: true,
      response: null,
      data: {},
      transactionId: null,
      success: false,
      message: 'transactionId must be alphanumeric, max 64 chars'
    };
  }

  let url = `${getAirtelBaseUrl()}/merchant/v1/transactions`;
  if (normalizedId) {
    url += `/${encodeURIComponent(normalizedId)}`;
  }

  const token = await getAirtelAccessToken();
  console.log('[Airtel transactions] GET', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: airtelMerchantHeaders(token)
  });
  const data = await response.json().catch(() => ({}));
  console.log('[Airtel transactions] Response:', response.status, JSON.stringify(data, null, 2));

  const success = response.ok && isAirtelTransactionSummarySuccess(data);
  const txnStatus = data?.transaction?.status;
  const message =
    txnStatus?.message ||
    data?.status?.message ||
    (response.ok ? 'OK' : 'Airtel transaction enquiry failed');

  return {
    configured: true,
    response,
    data,
    transactionId: normalizedId,
    success,
    message
  };
}
