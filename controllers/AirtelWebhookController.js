import db from '../models/index.js';
import { Op } from 'sequelize';
import { captureWebhook } from '../utils/webhookCapture.js';
import { verifyAirtelWebhookSignature } from '../utils/airtelWebhookSignature.js';
import { parseSubscriptionMerchantRef } from '../utils/paychanguRefs.js';
import { finalizePendingShopSubscriptionPayment } from '../utils/subscriptionPaymentActivate.js';
import { completeOrderPaidWithEscrow } from '../utils/orderEscrowFinalize.js';

const { Order, User, AirtelTransaction, AirtelWebhookLog, ShopSubscription } = db;

/**
 * Normalise the many shapes Airtel Money uses for a transaction reference.
 * Handles both nested `{ transaction: { id, ... }, reference }` and flat payloads.
 */
function parseAirtelPayload(body) {
  const txn = body.transaction && typeof body.transaction === 'object' ? body.transaction : null;

  const transactionId =
    (txn?.id) ||
    (txn?.airtel_money_id) ||
    body.transaction_id ||
    body.id ||
    null;

  const airtelMoneyId =
    (txn?.airtel_money_id) ||
    body.airtel_money_id ||
    transactionId ||
    null;

  const reference =
    body.reference ||
    body.merchant_txn_id ||
    body.order_id ||
    body.order_number ||
    null;

  const msisdn =
    body.msisdn ||
    body.phone ||
    body.mobile ||
    null;

  const amount =
    body.amount != null ? parseFloat(String(body.amount).replace(/,/g, '')) : null;

  // Airtel uses status_code "TS" for success; also accept plain status strings
  const statusCode =
    (txn?.status_code) ||
    body.status_code ||
    null;

  // Short status keyword only (flat-shape integrations send e.g. "SUCCESS"/"FAILED" here).
  // The nested/Malawi shape has no separate short status string, only `status_code` (TS/TF/...)
  // and a long human-readable `message` — don't fall back to that here, it overflows the
  // `status` column and belongs in `message` instead.
  const statusRaw =
    body.status ||
    body.Status ||
    null;

  const message =
    (txn?.message) ||
    body.message ||
    null;

  const isSuccess =
    statusCode === 'TS' ||
    ['success', 'successful', 'succeeded', 'completed', 'complete', 'paid']
      .includes(String(statusRaw || '').toLowerCase());

  return { transactionId, airtelMoneyId, reference, msisdn, amount, statusCode, statusRaw, message, isSuccess };
}

/**
 * POST /api/webhooks/airtel
 * Called by Airtel Money after a payment event. Configure the callback URL in the
 * Airtel Money developer portal. Signature verification uses AIRTEL_WEBHOOK_SECRET.
 *
 * Payload shapes handled:
 *   Nested:  { transaction: { id, status_code, airtel_money_id, message }, reference, msisdn, amount }
 *   Flat:    { transaction_id, status_code, reference, msisdn, amount, message }
 *
 * Capture mode: Set WEBHOOK_CAPTURE_ONLY=true in .env to log payloads without processing.
 */
export const webhook = async (req, res) => {
  captureWebhook('airtel', req);

  const rawBody = req.rawBody;
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  // Unconditional capture — must never fail to record exactly what Airtel sent,
  // independent of whether the payload matches any expected shape.
  try {
    await AirtelWebhookLog.create({
      method: req.method,
      headers: req.headers,
      body,
      raw_body: rawBody ? rawBody.toString('utf8') : null,
      ip: req.ip
    });
  } catch (logErr) {
    console.error('[Airtel webhook] Failed to write airtel_webhook_logs row:', logErr);
  }

  // Signature verification — logged only. Airtel's callback contract expects a 200 ack
  // regardless; an unsigned/invalid payload just means we won't trust it for order/subscription
  // state changes below (isSignatureValid gates that), but we still record and ack it.
  const webhookSecret = (process.env.AIRTEL_WEBHOOK_SECRET || '').trim() || null;
  const sig = req.get('x-airtel-signature') || req.get('X-Airtel-Signature');
  let isSignatureValid = true;
  if (webhookSecret) {
    isSignatureValid = Boolean(rawBody) && Buffer.isBuffer(rawBody) && verifyAirtelWebhookSignature(rawBody, sig, webhookSecret);
    if (!isSignatureValid) {
      console.warn('[Airtel webhook] Invalid or missing x-airtel-signature — payload logged, not applied to order/subscription state');
    }
  }
  const parsed = parseAirtelPayload(body);
  const { transactionId, airtelMoneyId, msisdn, amount, statusCode, statusRaw, message, isSuccess } = parsed;
  let reference = parsed.reference;

  // Always persist the raw webhook for the admin transaction log. Airtel's callback only ever
  // echoes back `transaction.id` — never `reference` — so if a row already exists for this
  // transaction_id (created when the push was initiated, see payWithAirtel), fall back to its
  // stored `reference` to know which order/subscription this callback belongs to.
  let txRow = null;
  try {
    txRow = transactionId
      ? await AirtelTransaction.findOne({ where: { transaction_id: transactionId } })
      : null;

    if (txRow) {
      if (!reference) reference = txRow.reference;
      txRow.status = statusRaw ?? txRow.status;
      txRow.status_code = statusCode ?? txRow.status_code;
      txRow.message = message ?? txRow.message;
      txRow.amount = amount != null ? amount : txRow.amount;
      txRow.raw_payload = body;
      await txRow.save();
    } else {
      txRow = await AirtelTransaction.create({
        transaction_id: transactionId,
        airtel_money_id: airtelMoneyId,
        reference,
        msisdn,
        amount: amount != null ? amount : null,
        currency: 'MWK',
        status: statusRaw,
        status_code: statusCode,
        message,
        processing_state: 'received',
        raw_payload: body
      });
    }
  } catch (storeErr) {
    console.error('[Airtel webhook] Failed to store transaction:', storeErr);
  }

  if (process.env.WEBHOOK_CAPTURE_ONLY === 'true') {
    return res.status(200).json({ success: true, message: 'Webhook captured (capture-only mode)' });
  }

  try {
    console.log('[Airtel webhook] Received:', { reference, statusCode, statusRaw, body: JSON.stringify(body) });

    if (!isSuccess) {
      console.log('[Airtel webhook] Ignored: non-success status:', statusRaw, statusCode);
      return res.status(200).json({ success: true, message: 'Webhook received (non-success)' });
    }

    if (!reference) {
      // Airtel's callback never includes `reference` (confirmed by their own sample payload —
      // only `transaction.{id, message, status_code, airtel_money_id}`), and no push-time row
      // was found for this transaction.id to resolve one from either. Nothing to reconcile —
      // could be a connectivity/test callback with a synthetic id, or a transaction we never
      // initiated push-side.
      console.log('[Airtel webhook] No reference resolvable (test ping or unknown transaction):', transactionId);
      if (txRow) {
        txRow.processing_state = 'no_reference';
        await txRow.save();
      }
      return res.status(200).json({ success: true, message: 'Webhook received (no reference)' });
    }

    if (!isSignatureValid) {
      console.log('[Airtel webhook] Skipping order/subscription update — unverified signature:', reference);
      return res.status(200).json({ success: true, message: 'Webhook received (unverified signature)' });
    }

    // Check if this is a shop subscription payment
    const subscriptionId = parseSubscriptionMerchantRef(reference);
    if (subscriptionId != null) {
      const sub = await ShopSubscription.findByPk(subscriptionId, {
        include: [{ model: db.SubscriptionPackage, as: 'package' }]
      });
      if (!sub) {
        console.log('[Airtel webhook] Shop subscription not found for:', reference);
        return res.status(200).json({ success: true, message: 'Webhook received (subscription not found)' });
      }

      const paymentBody = {
        amount,
        transaction_id: transactionId,
        status: statusRaw
      };

      const result = await finalizePendingShopSubscriptionPayment(sub, paymentBody, {
        source: 'airtel_webhook',
        ip_address: req.ip,
        actor_user_id: null
      });

      const txRow = await AirtelTransaction.findOne({
        where: { [Op.or]: [{ transaction_id: transactionId }, { reference }].filter(Boolean) },
        order: [['createdAt', 'DESC']]
      });

      if (result.alreadyActive) {
        if (txRow) { txRow.processing_state = 'already_active'; await txRow.save(); }
        return res.status(200).json({ success: true, message: 'Webhook received' });
      }
      if (!result.ok) {
        const state = result.reason === 'amount_mismatch' ? 'amount_mismatch' : 'subscription_not_finalized';
        if (txRow) { txRow.processing_state = state; await txRow.save(); }
        return res.status(200).json({ success: true, message: 'Webhook received (subscription state)' });
      }

      if (txRow) {
        txRow.processing_state = 'subscription_activated';
        txRow.shop_subscription_id = sub.id;
        await txRow.save();
      }
      console.log('[Airtel webhook] Subscription activated:', reference, 'id:', sub.id);
      return res.status(200).json({ success: true, message: 'Webhook processed (subscription)' });
    }

    // Order payment
    const order = await Order.findOne({
      where: { [Op.or]: [{ order_number: reference }, { id: parseInt(reference, 10) || 0 }] },
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
        { model: db.OrderItem, as: 'items', required: false }
      ]
    });

    if (!order) {
      console.log('[Airtel webhook] Order not found for:', reference);
      const txRow = await AirtelTransaction.findOne({
        where: { reference },
        order: [['createdAt', 'DESC']]
      });
      if (txRow) { txRow.processing_state = 'order_not_found'; await txRow.save(); }
      return res.status(200).json({ success: true, message: 'Webhook received (order not found)' });
    }

    if (order.payment_status === 'paid') {
      console.log('[Airtel webhook] Order already paid:', order.order_number);
      return res.status(200).json({ success: true, message: 'Webhook received' });
    }

    await completeOrderPaidWithEscrow(order, {
      paymentMethod: 'airtel',
      paymentReference: transactionId || airtelMoneyId || null,
      source: 'airtel_webhook',
      req
    });

    const txRow = await AirtelTransaction.findOne({
      where: {
        [Op.or]: [
          transactionId ? { transaction_id: transactionId } : null,
          { reference }
        ].filter(Boolean)
      },
      order: [['createdAt', 'DESC']]
    });
    if (txRow) {
      txRow.order_id = order.id;
      txRow.processing_state = 'order_paid';
      await txRow.save();
    }

    console.log('[Airtel webhook] Order marked paid:', order.order_number, 'id:', order.id);
    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    // Payload is already captured in airtel_webhook_logs (and, if parseable, airtel_transactions)
    // above — a processing error here is our problem to fix, not Airtel's. Still ack 200 so the
    // callback URL isn't flagged as broken and retried/disabled.
    console.error('[Airtel webhook] Processing error (payload already logged):', error);
    return res.status(200).json({ success: true, message: 'Webhook received' });
  }
};
