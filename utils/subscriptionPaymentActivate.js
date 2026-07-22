import { logAudit } from './audit.js';

function normalizeTxId(body) {
  return body?.transaction_id ?? body?.transactionId ?? body?.keys?.transaction_id ?? null;
}

function validateAmountAgainstPackage(sub, body) {
  const expected = Math.round(parseFloat(sub.package?.price_mwk) || 0);
  const rawAmount = body.amount;
  const hasAmount =
    rawAmount != null &&
    rawAmount !== '' &&
    !Number.isNaN(parseFloat(String(rawAmount).replace(/,/g, '')));
  const paidAmt = hasAmount ? Math.round(parseFloat(String(rawAmount).replace(/,/g, ''))) : null;
  if (expected > 0 && hasAmount && paidAmt !== null && Math.abs(paidAmt - expected) > 1) {
    return { ok: false, reason: 'amount_mismatch', expected, paid: paidAmt };
  }
  return { ok: true, expected, hasAmount, paidAmt };
}

/**
 * Activate or sync a shop subscription after a payment provider confirms payment (webhook or collect).
 * Mirrors order flow: webhook success → payment_status = paid.
 *
 * - pending_payment + payable → active + paid
 * - active but payment_status not paid → paid only (stuck row repair)
 * - already active + paid → idempotent
 */
export async function finalizePendingShopSubscriptionPayment(sub, body, options) {
  const { source, ip_address = null, actor_user_id = null } = options;

  if (sub.status === 'active' && sub.payment_status === 'paid') {
    return { ok: true, alreadyActive: true };
  }

  const isPendingPaymentFlow = sub.status === 'pending_payment';
  const isPaidStateRepair = sub.status === 'active' && sub.payment_status !== 'paid';

  if (!isPendingPaymentFlow && !isPaidStateRepair) {
    return { ok: false, reason: 'not_pending_payment', status: sub.status };
  }

  if (isPendingPaymentFlow) {
    const payableStates = ['pending', 'failed', 'paid'];
    if (!payableStates.includes(sub.payment_status)) {
      return {
        ok: false,
        reason: 'payment_state',
        payment_status: sub.payment_status
      };
    }
  }

  const amt = validateAmountAgainstPackage(sub, body);
  if (!amt.ok) {
    return amt;
  }

  const txId = normalizeTxId(body);

  sub.status = 'active';
  sub.payment_status = 'paid';
  sub.payment_reference = txId || sub.payment_reference;
  const meta = sub.metadata && typeof sub.metadata === 'object' ? { ...sub.metadata } : {};
  meta.payment_webhook = {
    transaction_id: txId,
    received_at: new Date().toISOString(),
    amount_reported: amt.hasAmount ? amt.paidAmt : null
  };
  meta.subscribed_via = source;
  sub.metadata = meta;
  await sub.save();

  await logAudit({
    action: 'shop_subscription.payment.complete',
    actor_user_id,
    target_type: 'shop_subscription',
    target_id: sub.id,
    metadata: {
      shop_id: sub.shop_id,
      package_id: sub.package_id,
      source,
      transaction_id: txId,
      amount_reported: amt.paidAmt,
      package_price_mwk: amt.expected,
      repair_only: isPaidStateRepair
    },
    ip_address
  });

  return { ok: true, alreadyActive: isPaidStateRepair };
}
