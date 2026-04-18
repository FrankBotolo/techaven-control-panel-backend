import { Op } from 'sequelize';
import db from '../models/index.js';
import { logAudit, auditContext } from '../utils/audit.js';
import { toPackageDto, toShopSubscriptionDto } from '../utils/subscriptionDto.js';
import {
  computePeriodEnd,
  whereActiveSubscriptions
} from '../utils/subscriptionHelpers.js';
import { verifyPayChanguTxRef, paychanguVerifyDataIndicatesPaid } from '../utils/paychanguVerify.js';
import { subscriptionPayChanguChargeId, parseSubscriptionMerchantRef } from '../utils/paychanguRefs.js';
import { getPayChanguBackendCallbackUrl, getPayChanguWebhookUrl } from '../utils/paychanguUrls.js';
import { getPayChanguPaymentOptions } from '../utils/paychanguProviders.js';
import { finalizePendingShopSubscriptionFromMalipo } from '../utils/subscriptionMalipoActivate.js';

const { ShopSubscription, SubscriptionPackage, Shop } = db;

async function assertShop(shopId, user) {
  const sid = parseInt(shopId, 10);
  if (!sid || Number.isNaN(sid)) return { error: { status: 400, message: 'Invalid shop id' } };
  if (!user.shop_id || user.shop_id !== sid) {
    return { error: { status: 403, message: 'You are not assigned to this shop' } };
  }
  const shop = await Shop.findByPk(sid);
  if (!shop) return { error: { status: 404, message: 'Shop not found' } };
  return { shop };
}

/** Current subscription (latest row) + optional history */
export const getCurrent = async (req, res) => {
  try {
    const { shopId } = req.params;
    const check = await assertShop(shopId, req.user);
    if (check.error) {
      return res.status(check.error.status).json({ success: false, message: check.error.message });
    }

    const latest = await ShopSubscription.findOne({
      where: { shop_id: check.shop.id },
      include: [{ model: SubscriptionPackage, as: 'package' }],
      order: [['id', 'DESC']]
    });

    const history = await ShopSubscription.findAll({
      where: { shop_id: check.shop.id },
      include: [{ model: SubscriptionPackage, as: 'package' }],
      order: [['id', 'DESC']],
      limit: 10,
      offset: 0
    });

    const paychangu_payment_options = await getPayChanguPaymentOptions();

    return res.json({
      success: true,
      message: 'Subscription retrieved',
      data: {
        subscription: latest ? toShopSubscriptionDto(latest) : null,
        recent_subscriptions: (history || []).map((s) => toShopSubscriptionDto(s)),
        paychangu_payment_options
      }
    });
  } catch (error) {
    console.error('Seller get subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription',
      error: error.message
    });
  }
};

/**
 * Subscribe shop to a package.
 * - Replaces any current active-like subscription (canceled immediately).
 * - Default: pending_payment until Pay Changu (or admin). Active+paid only if SUBSCRIPTION_AUTO_ACTIVATE=true (dev) or payment_reference is non-empty.
 */
export const subscribe = async (req, res) => {
  try {
    const { shopId } = req.params;
    const check = await assertShop(shopId, req.user);
    if (check.error) {
      return res.status(check.error.status).json({ success: false, message: check.error.message });
    }

    const { package_id, payment_reference, auto_renew, replace_existing } = req.body;
    if (!package_id) {
      return res.status(400).json({ success: false, message: 'package_id is required' });
    }

    const pkg = await SubscriptionPackage.findByPk(parseInt(package_id, 10));
    if (!pkg || !pkg.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Subscription package not found or inactive'
      });
    }

    const existingActive = await ShopSubscription.findOne({
      where: whereActiveSubscriptions(check.shop.id)
    });

    if (existingActive && !replace_existing) {
      return res.status(409).json({
        success: false,
        message:
          'This shop already has an active subscription. Pass replace_existing: true to switch plans.',
        data: { current_subscription_id: existingActive.id }
      });
    }

    if (existingActive) {
      existingActive.status = 'canceled';
      existingActive.canceled_at = new Date();
      existingActive.cancel_at_period_end = false;
      await existingActive.save();
    }

    const autoActivate =
      process.env.SUBSCRIPTION_AUTO_ACTIVATE === 'true' ||
      !!String(payment_reference || '').trim();

    const start = new Date();
    const periodEnd = computePeriodEnd(start, pkg);

    const sub = await ShopSubscription.create({
      shop_id: check.shop.id,
      package_id: pkg.id,
      status: autoActivate ? 'active' : 'pending_payment',
      payment_status: autoActivate ? 'paid' : 'pending',
      trial_ends_at: null,
      current_period_start: start,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      canceled_at: null,
      auto_renew: auto_renew !== false && auto_renew !== 'false',
      payment_reference: payment_reference || null,
      metadata: { created_via: 'seller_portal' }
    });

    const full = await ShopSubscription.findByPk(sub.id, {
      include: [{ model: SubscriptionPackage, as: 'package' }]
    });

    await logAudit({
      ...auditContext(req),
      action: 'seller.subscription.create',
      actor_user_id: req.user.id,
      target_type: 'shop_subscription',
      target_id: sub.id,
      metadata: { shop_id: check.shop.id, package_id: pkg.id, package_slug: pkg.slug }
    });

    const paychangu_payment_options = await getPayChanguPaymentOptions();

    return res.status(201).json({
      success: true,
      message: autoActivate
        ? 'Subscription activated'
        : 'Subscription created — complete payment to activate',
      data: {
        subscription: toShopSubscriptionDto(full),
        ...(!autoActivate ? { paychangu_payment_options } : {})
      }
    });
  } catch (error) {
    console.error('Seller subscribe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to subscribe',
      error: error.message
    });
  }
};

/** Cancel at end of current period (default) or immediately */
export const cancel = async (req, res) => {
  try {
    const { shopId } = req.params;
    const check = await assertShop(shopId, req.user);
    if (check.error) {
      return res.status(check.error.status).json({ success: false, message: check.error.message });
    }

    const { immediately } = req.body;
    const sub = await ShopSubscription.findOne({
      where: {
        shop_id: check.shop.id,
        status: { [Op.in]: ['active', 'trialing', 'past_due', 'pending_payment'] }
      },
      order: [['id', 'DESC']],
      include: [{ model: SubscriptionPackage, as: 'package' }]
    });

    if (!sub) {
      return res.status(404).json({ success: false, message: 'No active subscription to cancel' });
    }

    if (immediately === true || immediately === 'true') {
      sub.status = 'canceled';
      sub.canceled_at = new Date();
      sub.cancel_at_period_end = false;
    } else {
      sub.cancel_at_period_end = true;
    }

    await sub.save();

    await logAudit({
      ...auditContext(req),
      action: 'seller.subscription.cancel',
      actor_user_id: req.user.id,
      target_type: 'shop_subscription',
      target_id: sub.id,
      metadata: { immediately: !!immediately }
    });

    const full = await ShopSubscription.findByPk(sub.id, {
      include: [{ model: SubscriptionPackage, as: 'package' }]
    });

    return res.json({
      success: true,
      message:
        immediately === true || immediately === 'true'
          ? 'Subscription canceled'
          : 'Subscription will cancel at the end of the billing period',
      data: { subscription: toShopSubscriptionDto(full) }
    });
  } catch (error) {
    console.error('Seller cancel subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message
    });
  }
};

/** Undo cancel_at_period_end before period ends */
export const resume = async (req, res) => {
  try {
    const { shopId } = req.params;
    const check = await assertShop(shopId, req.user);
    if (check.error) {
      return res.status(check.error.status).json({ success: false, message: check.error.message });
    }

    const sub = await ShopSubscription.findOne({
      where: {
        shop_id: check.shop.id,
        cancel_at_period_end: true,
        status: { [Op.in]: ['active', 'trialing', 'past_due'] }
      },
      order: [['id', 'DESC']],
      include: [{ model: SubscriptionPackage, as: 'package' }]
    });

    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'No subscription scheduled for cancellation'
      });
    }

    sub.cancel_at_period_end = false;
    await sub.save();

    const full = await ShopSubscription.findByPk(sub.id, {
      include: [{ model: SubscriptionPackage, as: 'package' }]
    });

    return res.json({
      success: true,
      message: 'Subscription renewal resumed',
      data: { subscription: toShopSubscriptionDto(full) }
    });
  } catch (error) {
    console.error('Seller resume subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resume subscription',
      error: error.message
    });
  }
};

function payChanguVerifyMatchesSubscription(sub, data, clientTxRef) {
  const m = data?.meta;
  if (m && typeof m === 'object') {
    if (m.shop_subscription_id != null && parseInt(String(m.shop_subscription_id), 10) !== sub.id) {
      return {
        ok: false,
        message: 'This Pay Changu payment is linked to a different subscription (meta.shop_subscription_id).'
      };
    }
    if (m.shopSubscriptionId != null && parseInt(String(m.shopSubscriptionId), 10) !== sub.id) {
      return {
        ok: false,
        message: 'This Pay Changu payment is linked to a different subscription (meta.shopSubscriptionId).'
      };
    }
    if (m.package_id != null && parseInt(String(m.package_id), 10) !== sub.package_id) {
      return {
        ok: false,
        message: 'This Pay Changu payment is linked to a different package (meta.package_id).'
      };
    }
  }
  const apiTxRef = data?.tx_ref != null ? String(data.tx_ref).trim() : '';
  const fromApi = parseSubscriptionMerchantRef(apiTxRef);
  if (fromApi != null && fromApi === sub.id) return { ok: true };
  if (clientTxRef) {
    const fromClient = parseSubscriptionMerchantRef(clientTxRef);
    if (fromClient != null && fromClient === sub.id) return { ok: true };
  }
  const hasMetaSubId =
    m &&
    typeof m === 'object' &&
    (m.shop_subscription_id != null || m.shopSubscriptionId != null);
  if (hasMetaSubId) return { ok: true };
  return {
    ok: false,
    message:
      'Pay Changu payment is not linked to this subscription. Pass meta.shop_subscription_id when starting checkout, or use charge_id SUB-{subscription_id}-… as tx_ref.'
  };
}

function payChanguAmountMatchesSubscription(sub, data) {
  const expected = Math.round(parseFloat(sub.package?.price_mwk) || 0);
  const raw = data?.amount;
  const hasAmount =
    raw != null && raw !== '' && !Number.isNaN(parseFloat(String(raw).replace(/,/g, '')));
  const paid = hasAmount ? Math.round(parseFloat(String(raw).replace(/,/g, ''))) : null;
  const currency = String(data?.currency || '').toUpperCase();
  if (currency && currency !== 'MWK') {
    return { ok: false, message: `Expected currency MWK, verify returned ${data?.currency}` };
  }
  if (expected > 0 && paid != null && Math.abs(paid - expected) > 1) {
    return {
      ok: false,
      message: `Amount mismatch: package price ${expected} MWK, payment ${paid} MWK`
    };
  }
  if (expected > 0 && paid == null) {
    return { ok: false, message: 'Verify response did not include an amount' };
  }
  return { ok: true };
}

/**
 * POST /api/sellers/:shopId/subscription/pay/paychangu
 * Body: { subscription_id, package_id } — returns Pay Changu checkout params (charge_id, meta, amounts).
 * Optional: { tx_ref } after client checkout — server verifies with Pay Changu and activates the subscription (same as POST /api/orders/:id/pay/paychangu).
 */
export const payWithPayChangu = async (req, res) => {
  try {
    const { shopId } = req.params;
    const check = await assertShop(shopId, req.user);
    if (check.error) {
      return res.status(check.error.status).json({ success: false, message: check.error.message });
    }

    const subscription_id = req.body?.subscription_id;
    const package_id = req.body?.package_id;
    const tx_ref = String(req.body?.tx_ref ?? req.body?.txRef ?? '').trim();

    if (subscription_id == null || subscription_id === '' || package_id == null || package_id === '') {
      return res.status(400).json({
        success: false,
        message: 'subscription_id and package_id are required'
      });
    }

    const sub = await ShopSubscription.findOne({
      where: {
        id: parseInt(subscription_id, 10),
        shop_id: check.shop.id
      },
      include: [{ model: SubscriptionPackage, as: 'package' }]
    });

    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    const pkgId = parseInt(package_id, 10);
    if (Number.isNaN(pkgId) || sub.package_id !== pkgId) {
      return res.status(400).json({
        success: false,
        message: 'package_id does not match this subscription'
      });
    }

    if (sub.status === 'active' && sub.payment_status === 'paid') {
      const full = await ShopSubscription.findByPk(sub.id, {
        include: [{ model: SubscriptionPackage, as: 'package' }]
      });
      return res.json({
        success: true,
        message: 'Subscription is already active and paid',
        data: { subscription: toShopSubscriptionDto(full) }
      });
    }

    if (sub.status !== 'pending_payment' || sub.payment_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This subscription is not awaiting Pay Changu payment'
      });
    }

    const amount = Math.round(parseFloat(sub.package?.price_mwk) || 0);
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Package price must be greater than zero for payment'
      });
    }

    if (!tx_ref) {
      const charge_id = subscriptionPayChanguChargeId(sub.id);
      const meta = {
        shop_subscription_id: sub.id,
        package_id: sub.package_id
      };
      const full = await ShopSubscription.findByPk(sub.id, {
        include: [{ model: SubscriptionPackage, as: 'package' }]
      });

      await logAudit({
        ...auditContext(req),
        action: 'seller.subscription.pay_paychangu_init',
        actor_user_id: req.user.id,
        target_type: 'shop_subscription',
        target_id: sub.id,
        metadata: { shop_id: check.shop.id, amount_mwk: amount, charge_id },
        ip_address: req.ip
      });

      return res.json({
        success: true,
        message:
          'Start Pay Changu checkout with charge_id and meta; after payment send tx_ref here or rely on POST /api/webhooks/paychangu',
        data: {
          charge_id,
          tx_ref: charge_id,
          amount_mwk: amount,
          currency: 'MWK',
          meta,
          callback_url: getPayChanguBackendCallbackUrl(),
          webhook_url: getPayChanguWebhookUrl(),
          subscription: toShopSubscriptionDto(full)
        }
      });
    }

    const verify = await verifyPayChanguTxRef(tx_ref);
    if (!verify.ok || !verify.json) {
      return res.status(502).json({
        success: false,
        message: verify.error || 'Could not verify payment with Pay Changu',
        data: { http_status: verify.httpStatus }
      });
    }

    if (!paychanguVerifyDataIndicatesPaid(verify.json)) {
      return res.status(400).json({
        success: false,
        message: 'Pay Changu reports this transaction is not paid',
        data: null
      });
    }

    const data = verify.json.data;
    const link = payChanguVerifyMatchesSubscription(sub, data, tx_ref);
    if (!link.ok) {
      return res.status(400).json({
        success: false,
        message: link.message,
        data: null
      });
    }

    const amt = payChanguAmountMatchesSubscription(sub, data);
    if (!amt.ok) {
      return res.status(400).json({
        success: false,
        message: amt.message,
        data: null
      });
    }

    const payBody = {
      amount: data?.amount,
      transaction_id: data?.reference,
      status: data?.status,
      psp_id: undefined
    };

    const result = await finalizePendingShopSubscriptionFromMalipo(sub, payBody, {
      orderRef: tx_ref,
      source: 'paychangu_app_confirm',
      ip_address: req.ip,
      actor_user_id: req.user.id
    });

    if (!result.ok && !result.alreadyActive) {
      return res.status(400).json({
        success: false,
        message: 'Subscription could not be activated',
        data: { reason: result.reason }
      });
    }

    await logAudit({
      ...auditContext(req),
      action: 'seller.subscription.pay_paychangu_confirm',
      actor_user_id: req.user.id,
      target_type: 'shop_subscription',
      target_id: sub.id,
      metadata: {
        shop_id: check.shop.id,
        tx_ref,
        reference: data?.reference
      },
      ip_address: req.ip
    });

    const full = await ShopSubscription.findByPk(sub.id, {
      include: [{ model: SubscriptionPackage, as: 'package' }]
    });

    return res.json({
      success: true,
      message: result.alreadyActive
        ? 'Subscription was already active and paid'
        : 'Payment successful. Your subscription is now active.',
      data: {
        subscription_id: sub.id,
        tx_ref,
        subscription: toShopSubscriptionDto(full)
      }
    });
  } catch (error) {
    console.error('Subscription pay with Pay Changu error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment failed',
      error: error.message
    });
  }
};
