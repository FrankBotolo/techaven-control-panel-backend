import db from '../models/index.js';
import { Op } from 'sequelize';
import { captureWebhook } from '../utils/webhookCapture.js';
import { parseSubscriptionMerchantRef } from '../utils/malipoCollect.js';
import { finalizePendingShopSubscriptionFromMalipo } from '../utils/subscriptionMalipoActivate.js';
import { completeOrderPaidWithEscrow } from '../utils/orderEscrowFinalize.js';

const { Order, User, MalipoTransaction, ShopSubscription } = db;

/**
 * POST /api/webhooks/malipo
 * Called by Malipo after payment success. Configure callback URL in Malipo dashboard.
 * Malipo payload: status, merchant_txn_id (order_number), transaction_id, amount, narration, customer_ref
 *
 * Capture mode: Set WEBHOOK_CAPTURE_ONLY=true in .env to only capture payloads
 * without processing. Inspect logs/webhook-captures/ then add logic later.
 */
export const malipo = async (req, res) => {
  // Always capture everything the webhook sends for inspection
  captureWebhook('malipo', req);

  // Store every Malipo webhook for admin transaction list
  const body = req.body || {};
  const orderRef = body.merchant_txn_id || body.order_id || body.order_number || body.reference;
  const malipoStatus = (body.status || '').toString();
  const txId = body.transaction_id;
  try {
    const existing = txId ? await MalipoTransaction.findOne({ where: { transaction_id: txId } }) : null;
    if (existing) {
      existing.status = malipoStatus;
      existing.amount = body.amount != null ? parseFloat(body.amount) : existing.amount;
      existing.narration = body.narration ?? existing.narration;
      existing.raw_payload = body;
      await existing.save();
    } else {
      await MalipoTransaction.create({
        transaction_id: txId,
        merchant_txn_id: orderRef,
        amount: body.amount != null ? parseFloat(body.amount) : null,
        status: malipoStatus,
        customer_ref: body.customer_ref,
        narration: body.narration,
        psp_id: body.psp_id,
        raw_payload: body
      });
    }
  } catch (storeErr) {
    console.error('[Malipo webhook] Failed to store transaction:', storeErr);
  }

  if (process.env.WEBHOOK_CAPTURE_ONLY === 'true') {
    return res.status(200).json({ success: true, message: 'Webhook captured (capture-only mode)' });
  }

  try {
    const status = (body.status || '').toLowerCase();

    console.log('[Malipo webhook] Received:', { orderRef, status, body: JSON.stringify(body) });

    if (!orderRef) {
      console.log('[Malipo webhook] Rejected: missing order reference');
      return res.status(400).json({ success: false, message: 'Missing merchant_txn_id or order reference' });
    }

    const isPaidStatus =
      status === 'success' ||
      status === 'successful' ||
      status === 'succeeded' ||
      status === 'completed' ||
      status === 'complete' ||
      status === 'paid';
    if (!isPaidStatus) {
      console.log('[Malipo webhook] Ignored: status is not a success paid state:', status);
      return res.status(200).json({ success: true, message: 'Webhook received (non-success)' });
    }

    const subscriptionId = parseSubscriptionMerchantRef(orderRef);
    if (subscriptionId != null) {
      const sub = await ShopSubscription.findByPk(subscriptionId, {
        include: [{ model: db.SubscriptionPackage, as: 'package' }]
      });
      if (!sub) {
        console.log('[Malipo webhook] Shop subscription not found for:', orderRef);
        return res.status(200).json({ success: true, message: 'Webhook received (subscription not found)' });
      }

      const expected = Math.round(parseFloat(sub.package?.price_mwk) || 0);
      const rawAmount = body.amount;
      const hasAmount =
        rawAmount != null &&
        rawAmount !== '' &&
        !Number.isNaN(parseFloat(String(rawAmount).replace(/,/g, '')));
      if (expected > 0 && !hasAmount) {
        console.log(
          '[Malipo webhook] Subscription activating without amount in payload (trust Malipo success):',
          orderRef
        );
      }

      const result = await finalizePendingShopSubscriptionFromMalipo(sub, body, {
        orderRef,
        source: 'malipo_webhook',
        ip_address: req.ip,
        actor_user_id: null
      });

      if (result.alreadyActive) {
        console.log('[Malipo webhook] Subscription already subscribed (active + paid):', orderRef);
        return res.status(200).json({ success: true, message: 'Webhook received' });
      }
      if (!result.ok) {
        if (result.reason === 'not_pending_payment') {
          console.log(
            '[Malipo webhook] Subscription not pending_payment:',
            orderRef,
            sub.status,
            sub.payment_status
          );
          return res.status(200).json({ success: true, message: 'Webhook received (subscription state)' });
        }
        if (result.reason === 'payment_state') {
          console.log(
            '[Malipo webhook] Subscription payment state not payable:',
            orderRef,
            sub.payment_status
          );
          return res.status(200).json({ success: true, message: 'Webhook received (subscription state)' });
        }
        if (result.reason === 'amount_mismatch') {
          console.log('[Malipo webhook] Subscription amount mismatch:', {
            orderRef,
            expected: result.expected,
            paid: result.paid
          });
          return res.status(200).json({ success: true, message: 'Webhook received (amount mismatch)' });
        }
        console.log('[Malipo webhook] Subscription finalize skipped:', orderRef, result);
        return res.status(200).json({ success: true, message: 'Webhook received (subscription state)' });
      }

      console.log('[Malipo webhook] Subscription activated:', orderRef, 'id:', sub.id);
      return res.status(200).json({ success: true, message: 'Webhook processed (subscription)' });
    }

    const order = await Order.findOne({
      where: { [Op.or]: [{ order_number: orderRef }, { id: parseInt(orderRef, 10) || 0 }] },
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
        { model: db.OrderItem, as: 'items', required: false }
      ]
    });

    if (!order) {
      console.log('[Malipo webhook] Order not found for:', orderRef);
      return res.status(200).json({ success: true, message: 'Webhook received (order not found)' });
    }
    if (order.payment_status === 'paid') {
      console.log('[Malipo webhook] Order already paid:', order.order_number);
      return res.status(200).json({ success: true, message: 'Webhook received' });
    }

    const paymentMethod = body.psp_id === 2 ? 'tnm' : body.psp_id === 1 ? 'airtel' : 'malipo';
    await completeOrderPaidWithEscrow(order, {
      paymentMethod,
      paymentReference: body.transaction_id || null,
      source: 'malipo_webhook',
      req
    });
    console.log('[Malipo webhook] Order marked paid:', order.order_number, 'id:', order.id);

    const mt = await MalipoTransaction.findOne({
      where: { [Op.or]: [{ transaction_id: body.transaction_id }, { merchant_txn_id: orderRef }] },
      order: [['createdAt', 'DESC']]
    });
    if (mt && !mt.order_id) {
      mt.order_id = order.id;
      await mt.save();
    }

    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Malipo webhook error:', error);
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};
