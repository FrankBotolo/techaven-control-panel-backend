import db from '../models/index.js';
import { captureWebhook } from '../utils/webhookCapture.js';
import { verifyPayChanguTxRef, paychanguVerifyDataIndicatesPaid } from '../utils/paychanguVerify.js';
import { completeOrderPaidWithEscrow, findOrderByPaymentRef } from '../utils/orderEscrowFinalize.js';
import { parseSubscriptionMerchantRef } from '../utils/malipoCollect.js';
import { finalizePendingShopSubscriptionFromMalipo } from '../utils/subscriptionMalipoActivate.js';

const { PayChanguCallback, Order, ShopSubscription, SubscriptionPackage } = db;

function normalizeCallbackStatus(q) {
  return String(q.status ?? q.Status ?? '').trim();
}

function normalizeTxRef(q) {
  return String(q.tx_ref ?? q.txRef ?? q.txref ?? '').trim();
}

function pickQueryMessage(q) {
  return q.message != null ? String(q.message) : q.Message != null ? String(q.Message) : null;
}

function pickQueryReference(q) {
  return q.reference != null ? String(q.reference) : q.Reference != null ? String(q.Reference) : null;
}

function serializeRawQuery(query) {
  try {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query || {})) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) v.forEach((x) => params.append(k, String(x)));
      else params.append(k, String(v));
    }
    return params.toString();
  } catch {
    return JSON.stringify(query || {});
  }
}

function buildRedirectUrl(baseUrl, extra) {
  try {
    const u = new URL(baseUrl);
    for (const [k, v] of Object.entries(extra)) {
      if (v != null && v !== '') u.searchParams.set(k, String(v));
    }
    return u.toString();
  } catch {
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}${new URLSearchParams(
      Object.fromEntries(Object.entries(extra).filter(([, v]) => v != null && v !== ''))
    ).toString()}`;
  }
}

function redirectOrRespond(req, res, { success, tx_ref, message, data }) {
  const successBase = process.env.PAYCHANGU_REDIRECT_SUCCESS;
  const failBase = process.env.PAYCHANGU_REDIRECT_FAILURE;
  const wantsJson = req.get('accept')?.includes('application/json') || req.query.format === 'json';

  if (!wantsJson && successBase && failBase) {
    const target = success ? successBase : failBase;
    const loc = buildRedirectUrl(target, {
      tx_ref: tx_ref || '',
      paychangu_status: success ? 'verified' : 'failed',
      message: message || ''
    });
    return res.redirect(302, loc);
  }

  return res.status(200).json({
    success,
    message: message || undefined,
    tx_ref: tx_ref || undefined,
    data: data || undefined
  });
}

function verifyBodyForSubscription(data) {
  return {
    amount: data?.amount,
    transaction_id: data?.reference,
    status: data?.status,
    psp_id: undefined
  };
}

async function resolveOrderFromVerifyData(data, txRef) {
  const meta = data?.meta;
  const m = meta && typeof meta === 'object' ? meta : null;

  if (m?.order_number) {
    const o = await findOrderByPaymentRef(m.order_number);
    if (o) return { order: o, kind: 'order' };
  }
  if (m?.orderNumber) {
    const o = await findOrderByPaymentRef(m.orderNumber);
    if (o) return { order: o, kind: 'order' };
  }
  if (m?.order_id != null) {
    const id = parseInt(String(m.order_id), 10);
    if (Number.isFinite(id) && id > 0) {
      const o = await Order.findByPk(id, {
        include: [
          { model: db.User, as: 'seller', attributes: ['id', 'name', 'email'] },
          { model: db.OrderItem, as: 'items', required: false }
        ]
      });
      if (o) return { order: o, kind: 'order' };
    }
  }
  if (m?.orderId != null) {
    const id = parseInt(String(m.orderId), 10);
    if (Number.isFinite(id) && id > 0) {
      const o = await Order.findByPk(id, {
        include: [
          { model: db.User, as: 'seller', attributes: ['id', 'name', 'email'] },
          { model: db.OrderItem, as: 'items', required: false }
        ]
      });
      if (o) return { order: o, kind: 'order' };
    }
  }

  const subIdFromMeta =
    m?.shop_subscription_id != null
      ? parseInt(String(m.shop_subscription_id), 10)
      : m?.shopSubscriptionId != null
        ? parseInt(String(m.shopSubscriptionId), 10)
        : null;
  if (subIdFromMeta && !Number.isNaN(subIdFromMeta)) {
    const sub = await ShopSubscription.findByPk(subIdFromMeta, {
      include: [{ model: SubscriptionPackage, as: 'package' }]
    });
    if (sub) return { subscription: sub, kind: 'subscription' };
  }

  const subId = parseSubscriptionMerchantRef(txRef);
  if (subId != null) {
    const sub = await ShopSubscription.findByPk(subId, {
      include: [{ model: SubscriptionPackage, as: 'package' }]
    });
    if (sub) return { subscription: sub, kind: 'subscription' };
  }

  const byRef = await findOrderByPaymentRef(txRef);
  if (byRef) return { order: byRef, kind: 'order' };

  return { order: null, subscription: null, kind: null };
}

function amountMatchesOrder(order, paidRaw) {
  const expected = Math.round(parseFloat(order.total_amount) || 0);
  const paid = Math.round(parseFloat(String(paidRaw).replace(/,/g, '')) || 0);
  if (expected <= 0) return true;
  if (paid <= 0) return false;
  return Math.abs(paid - expected) <= 1;
}

/**
 * GET /api/webhooks/paychangu/callback
 * Pay Changu redirects the customer here with query string (status, tx_ref, …).
 * Persists callback row, then verifies server-side before marking paid.
 */
export const callback = async (req, res) => {
  captureWebhook('paychangu_callback', req);

  const q = req.query || {};
  const callback_status = normalizeCallbackStatus(q);
  const tx_ref = normalizeTxRef(q);
  const callback_message = pickQueryMessage(q);
  const callback_reference = pickQueryReference(q);
  const raw_query = serializeRawQuery(q);
  const raw_url = req.originalUrl ? String(req.originalUrl).slice(0, 2048) : null;
  const received_at = new Date();

  if (!tx_ref) {
    return redirectOrRespond(req, res, {
      success: false,
      tx_ref: '',
      message: 'Missing tx_ref in callback query'
    });
  }

  let row;
  try {
    row = await PayChanguCallback.create({
      callback_status: callback_status || null,
      tx_ref,
      callback_message,
      callback_reference,
      raw_query,
      raw_url,
      received_at,
      processing_state: 'received'
    });
  } catch (e) {
    console.error('[PayChangu callback] persist failed:', e);
    return redirectOrRespond(req, res, {
      success: false,
      tx_ref,
      message: 'Could not record callback'
    });
  }

  if (process.env.WEBHOOK_CAPTURE_ONLY === 'true') {
    row.processing_state = 'capture_only';
    await row.save();
    return redirectOrRespond(req, res, {
      success: true,
      tx_ref,
      message: 'Captured (WEBHOOK_CAPTURE_ONLY)',
      data: { id: row.id }
    });
  }

  const statusLower = callback_status.toLowerCase();
  const callbackSaysSuccess =
    statusLower === 'success' ||
    statusLower === 'successful' ||
    statusLower === 'succeeded' ||
    statusLower === 'completed' ||
    statusLower === 'complete' ||
    statusLower === 'paid';

  if (!callbackSaysSuccess) {
    row.processing_state = 'callback_non_success';
    await row.save();
    return redirectOrRespond(req, res, {
      success: false,
      tx_ref,
      message: 'Callback status is not success; not verifying'
    });
  }

  const verify = await verifyPayChanguTxRef(tx_ref);
  row.verify_http_status = verify.httpStatus || null;
  row.verify_error = verify.error || null;
  row.verify_payload = verify.json || null;

  if (!verify.ok || !verify.json) {
    row.processing_state = 'verify_failed';
    await row.save();
    return redirectOrRespond(req, res, {
      success: false,
      tx_ref,
      message: verify.error || 'Verify request failed'
    });
  }

  const data = verify.json.data;
  if (!paychanguVerifyDataIndicatesPaid(verify.json)) {
    row.processing_state = 'verify_not_paid';
    row.verified_at = new Date();
    await row.save();
    return redirectOrRespond(req, res, {
      success: false,
      tx_ref,
      message: 'Verify response does not indicate paid'
    });
  }

  const auth = data?.authorization && typeof data.authorization === 'object' ? data.authorization : {};
  const cust = data?.customer && typeof data.customer === 'object' ? data.customer : {};

  row.payment_reference = data?.reference != null ? String(data.reference) : null;
  row.payment_status = data?.status != null ? String(data.status) : null;
  row.amount = data?.amount != null ? parseFloat(data.amount) : null;
  row.currency = data?.currency != null ? String(data.currency) : null;
  row.charges = data?.charges != null ? parseFloat(data.charges) : null;
  row.channel = auth.channel != null ? String(auth.channel) : null;
  row.provider = auth.provider != null ? String(auth.provider) : null;
  row.mobile_number = auth.mobile_number != null ? String(auth.mobile_number) : null;
  row.customer_email = cust.email != null ? String(cust.email) : null;
  row.customer_first_name = cust.first_name != null ? String(cust.first_name) : null;
  row.customer_last_name = cust.last_name != null ? String(cust.last_name) : null;
  row.meta_json = data?.meta ?? null;
  row.verified_at = new Date();

  const resolved = await resolveOrderFromVerifyData(data, tx_ref);

  try {
    if (resolved.kind === 'subscription' && resolved.subscription) {
      const sub = resolved.subscription;
      const body = verifyBodyForSubscription(data);
      const orderRef = tx_ref;
      const result = await finalizePendingShopSubscriptionFromMalipo(sub, body, {
        orderRef,
        source: 'paychangu_callback',
        ip_address: req.ip,
        actor_user_id: null
      });

      if (!result.ok && !result.alreadyActive) {
        row.processing_state = result.reason === 'amount_mismatch' ? 'amount_mismatch' : 'subscription_not_finalized';
        row.internal_error = JSON.stringify(result);
        row.shop_subscription_id = sub.id;
        await row.save();
        return redirectOrRespond(req, res, {
          success: false,
          tx_ref,
          message: 'Subscription could not be activated',
          data: { reason: result.reason }
        });
      }

      row.processing_state = 'subscription_activated';
      row.shop_subscription_id = sub.id;
      await row.save();
      return redirectOrRespond(req, res, {
        success: true,
        tx_ref,
        message: 'Subscription payment verified',
        data: { shop_subscription_id: sub.id }
      });
    }

    if (resolved.kind === 'order' && resolved.order) {
      const order = resolved.order;
      row.order_id = order.id;

      const currencyOk = !row.currency || String(row.currency).toUpperCase() === 'MWK';
      const amountOk = amountMatchesOrder(order, row.amount);

      if (!currencyOk || !amountOk) {
        row.processing_state = 'amount_mismatch';
        row.internal_error = JSON.stringify({
          expected_amount: order.total_amount,
          paid: row.amount,
          currency_expected: 'MWK',
          currency_got: row.currency
        });
        await row.save();
        return redirectOrRespond(req, res, {
          success: false,
          tx_ref,
          message: 'Amount or currency does not match order'
        });
      }

      if (order.payment_status === 'paid') {
        row.processing_state = 'order_already_paid';
        await row.save();
        return redirectOrRespond(req, res, {
          success: true,
          tx_ref,
          message: 'Order already paid',
          data: { order_id: order.id, order_number: order.order_number }
        });
      }

      await completeOrderPaidWithEscrow(order, {
        paymentMethod: 'paychangu',
        paymentReference: row.payment_reference,
        source: 'paychangu_callback',
        req
      });

      row.processing_state = 'order_paid';
      await row.save();
      return redirectOrRespond(req, res, {
        success: true,
        tx_ref,
        message: 'Order payment verified',
        data: { order_id: order.id, order_number: order.order_number }
      });
    }

    row.processing_state = 'order_not_found';
    await row.save();
    return redirectOrRespond(req, res, {
      success: false,
      tx_ref,
      message: 'Could not resolve order or subscription from verify payload; set meta on checkout'
    });
  } catch (err) {
    console.error('[PayChangu callback] processing error:', err);
    row.processing_state = 'error';
    row.internal_error = err instanceof Error ? err.message : String(err);
    await row.save();
    return redirectOrRespond(req, res, {
      success: false,
      tx_ref,
      message: 'Internal error processing payment'
    });
  }
};
