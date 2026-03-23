import { Op } from 'sequelize';
import db from '../models/index.js';
import { logAudit, auditContext } from '../utils/audit.js';
import { toPackageDto, toShopSubscriptionDto } from '../utils/subscriptionDto.js';
import {
  computePeriodEnd,
  whereActiveSubscriptions
} from '../utils/subscriptionHelpers.js';

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

    return res.json({
      success: true,
      message: 'Subscription retrieved',
      data: {
        subscription: latest ? toShopSubscriptionDto(latest) : null,
        recent_subscriptions: (history || []).map((s) => toShopSubscriptionDto(s))
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
 * - Auto-activates when SUBSCRIPTION_AUTO_ACTIVATE is not 'false' or payment_reference is sent.
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
      process.env.SUBSCRIPTION_AUTO_ACTIVATE !== 'false' ||
      !!payment_reference ||
      req.body.confirm_payment === true;

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

    return res.status(201).json({
      success: true,
      message: autoActivate
        ? 'Subscription activated'
        : 'Subscription created — complete payment to activate',
      data: {
        subscription: toShopSubscriptionDto(full)
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
