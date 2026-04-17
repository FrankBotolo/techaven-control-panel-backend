/**
 * Unique PayChangu charge_id per subscription payment attempt (retries must not reuse).
 * Webhook resolves shop_subscription id via SUB-{id} prefix.
 */
export function subscriptionPayChanguChargeId(subscriptionId) {
  const sid = parseInt(subscriptionId, 10);
  if (!sid || Number.isNaN(sid)) {
    throw new Error('Invalid subscription id for PayChangu charge_id');
  }
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `SUB-${sid}-${suffix}`;
}

/** Extract shop_subscription id from SUB-42 or SUB-42-{suffix} (case-insensitive SUB prefix). */
export function parseSubscriptionMerchantRef(merchantTxnId) {
  let s = String(merchantTxnId ?? '').trim();
  if (s.charCodeAt(0) === 0xfeff) {
    s = s.slice(1);
  }
  const m = s.match(/^SUB-(\d+)/i);
  if (!m) return null;
  const id = parseInt(m[1], 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}
