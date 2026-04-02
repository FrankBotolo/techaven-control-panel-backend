import { Op } from 'sequelize';
import db from '../models/index.js';
import { logAudit, auditContext } from '../utils/audit.js';
import { toPackageDto, toShopSubscriptionDto } from '../utils/subscriptionDto.js';
import {
  computePeriodEnd,
  whereActiveSubscriptions
} from '../utils/subscriptionHelpers.js';
import {
  getMalipoCredentials,
  postMalipoCollect,
  subscriptionMalipoMerchantRef
} from '../utils/malipoCollect.js';
import {
  finalizePendingShopSubscriptionFromMalipo,
  malipoCollectResponseIndicatesPaid
} from '../utils/subscriptionMalipoActivate.js';
import { getMalipoPaymentOptions, resolveMalipoPspId } from '../utils/malipoProviders.js';

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

    const malipo_payment_options = await getMalipoPaymentOptions();

    return res.json({
      success: true,
      message: 'Subscription retrieved',
      data: {
        subscription: latest ? toShopSubscriptionDto(latest) : null,
        recent_subscriptions: (history || []).map((s) => toShopSubscriptionDto(s)),
        malipo_payment_options
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
 * - Default: pending_payment until Malipo (or admin). Active+paid only if SUBSCRIPTION_AUTO_ACTIVATE=true (dev) or payment_reference is non-empty.
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

    const malipo_payment_options = await getMalipoPaymentOptions();

    return res.status(201).json({
      success: true,
      message: autoActivate
        ? 'Subscription activated'
        : 'Subscription created — complete payment to activate',
      data: {
        subscription: toShopSubscriptionDto(full),
        ...(!autoActivate ? { malipo_payment_options } : {})
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

/**
 * POST /api/sellers/:shopId/subscription/pay/malipo
 * Pay for a pending subscription via Malipo (Airtel / TNM). Webhook activates the row.
 * Body: { subscription_id, msisdn, and one of: psp_id | payment_method_id | provider_slug } — same as order pay/malipo.
 */
export const payWithMalipo = async (req, res) => {
  try {
    const { shopId } = req.params;
    const check = await assertShop(shopId, req.user);
    if (check.error) {
      return res.status(check.error.status).json({ success: false, message: check.error.message });
    }

    const { subscription_id, msisdn } = req.body;
    const malipo_payment_options = await getMalipoPaymentOptions();

    if (!subscription_id) {
      return res.status(400).json({
        success: false,
        message: 'subscription_id is required',
        data: { malipo_payment_options }
      });
    }

    if (!msisdn) {
      return res.status(400).json({
        success: false,
        message:
          'msisdn is required (mobile number for Airtel Money or TNM Mpamba). Pick a network using psp_id, payment_method_id, or provider_slug.',
        data: { malipo_payment_options }
      });
    }

    const { pspId, error: pspErr } = await resolveMalipoPspId(req.body);
    if (pspErr) {
      return res.status(400).json({
        success: false,
        message: pspErr,
        data: { malipo_payment_options }
      });
    }
    if (pspId === null) {
      return res.status(400).json({
        success: false,
        message:
          'Choose mobile money network: psp_id (1=Airtel, 2=TNM), payment_method_id from GET /api/payment-methods, or provider_slug (e.g. airtel, tnm).',
        data: { malipo_payment_options }
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

    if (sub.status !== 'pending_payment' || sub.payment_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This subscription is not awaiting Malipo payment'
      });
    }

    const { apiKey, appId } = getMalipoCredentials();
    if (!apiKey || !appId) {
      return res.status(500).json({
        success: false,
        message: 'Malipo payment is not configured. Set MALIPO_API_KEY and MALIPO_APP_ID in .env'
      });
    }

    const amount = Math.round(parseFloat(sub.package?.price_mwk) || 0);
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Package price must be greater than zero for Malipo payment'
      });
    }

    const merchantRef = subscriptionMalipoMerchantRef(sub.id);
    const { response, data } = await postMalipoCollect({
      order_id: merchantRef,
      merchant_txn_id: merchantRef,
      msisdn,
      amount,
      psp_id: pspId
    });

    if (response.ok) {
      await logAudit({
        ...auditContext(req),
        action: 'seller.subscription.pay_malipo_initiate',
        actor_user_id: req.user.id,
        target_type: 'shop_subscription',
        target_id: sub.id,
        metadata: { shop_id: check.shop.id, amount, psp_id: pspId, merchant_txn_id: merchantRef },
        ip_address: req.ip
      });
    }

    if (!response.ok) {
      console.error('Malipo subscription collect error:', response.status, data);
      return res.status(response.status >= 400 && response.status < 500 ? response.status : 500).json({
        success: false,
        message: data?.message || data?.error || 'Malipo payment request failed',
        data: null,
        error: data?.message || data?.error
      });
    }

    if (malipoCollectResponseIndicatesPaid(data)) {
      const payBody = {
        transaction_id: data?.transaction_id ?? data?.keys?.transaction_id,
        amount: data?.amount,
        psp_id: data?.psp_id ?? pspId
      };
      await finalizePendingShopSubscriptionFromMalipo(sub, payBody, {
        orderRef: merchantRef,
        source: 'malipo_collect_response',
        ip_address: req.ip,
        actor_user_id: req.user.id
      });
    }

    const full = await ShopSubscription.findByPk(sub.id, {
      include: [{ model: SubscriptionPackage, as: 'package' }]
    });
    const activatedNow = full?.status === 'active' && full?.payment_status === 'paid';

    return res.json({
      success: true,
      message: activatedNow
        ? 'Payment successful. Your subscription is now active.'
        : 'Payment request sent. Confirm on your phone; your subscription activates when Malipo confirms payment.',
      data: {
        subscription_id: sub.id,
        merchant_txn_id: merchantRef,
        amount,
        psp_id: pspId,
        provider: pspId === 1 ? 'airtel' : 'tnm',
        ...(data?.transaction_id && { transaction_id: data.transaction_id }),
        ...data,
        subscription: toShopSubscriptionDto(full)
      }
    });
  } catch (error) {
    console.error('Subscription pay with Malipo error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment initiation failed',
      error: error.message
    });
  }
};
