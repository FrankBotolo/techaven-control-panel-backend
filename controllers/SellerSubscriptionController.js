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
import { finalizePendingShopSubscriptionPayment } from '../utils/subscriptionPaymentActivate.js';
import {
  getAirtelCredentials,
  normalizeAirtelMsisdn,
  normalizeAirtelReference,
  postAirtelCollect
} from '../utils/airtelCollect.js';
import { getAirtelTransactionSummary } from '../utils/airtelTransactions.js';

const { ShopSubscription, SubscriptionPackage, Shop, AirtelTransaction } = db;

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
      status: data?.status
    };

    const result = await finalizePendingShopSubscriptionPayment(sub, payBody, {
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


/* ───────────────────────── Airtel Money (direct Collection API) ───────────────────────── */

const subscriptionInclude = [{ model: SubscriptionPackage, as: 'package' }];

/** Airtel Malawi subscriber numbers are 9 digits starting with 9 (099x / 098x …) once 0/265 is stripped. */
function airtelMsisdnOrNull(value) {
  const local = normalizeAirtelMsisdn(String(value ?? '').replace(/[\s-]/g, ''));
  return /^9\d{8}$/.test(local) ? local : null;
}

/** Airtel enquiry: data.transaction.status is TS (success), TF (failed), TA/TIP (in progress). */
function airtelEnquiryState(payload) {
  const code = String(
    payload?.data?.transaction?.status ?? payload?.transaction?.status ?? payload?.data?.status ?? ''
  ).toUpperCase();
  if (code === 'TS' || code === 'SUCCESS') return { state: 'paid', code };
  if (code === 'TF' || code === 'FAILED' || code === 'TE') return { state: 'failed', code };
  return { state: 'pending', code: code || null };
}

async function findSellerSubscription(req, res, subscriptionId) {
  const check = await assertShop(req.params.shopId, req.user);
  if (check.error) {
    res.status(check.error.status).json({ success: false, message: check.error.message });
    return null;
  }
  const sid = parseInt(subscriptionId, 10);
  if (!sid || Number.isNaN(sid)) {
    res.status(400).json({ success: false, message: 'subscription_id is required' });
    return null;
  }
  const sub = await ShopSubscription.findOne({ where: { id: sid, shop_id: check.shop.id }, include: subscriptionInclude });
  if (!sub) {
    res.status(404).json({ success: false, message: 'Subscription not found' });
    return null;
  }
  return { shop: check.shop, sub };
}

/**
 * POST /api/sellers/:shopId/subscription/pay/airtel
 * Body: { subscription_id, msisdn } — sends an Airtel Money USSD prompt for the package price.
 * transaction.id = SUB{id}{suffix} (alphanumeric); the stored reference SUB-{id}-{suffix} lets the
 * Airtel webhook (POST /api/webhooks/airtel) resolve and activate the subscription. Sellers can also
 * poll GET …/pay/airtel/status, which activates on Airtel's TS status.
 */
export const payWithAirtel = async (req, res) => {
  try {
    const found = await findSellerSubscription(req, res, req.body?.subscription_id);
    if (!found) return;
    const { shop, sub } = found;

    if (sub.status === 'active' && sub.payment_status === 'paid') {
      return res.json({ success: true, message: 'Subscription is already active and paid', data: { state: 'paid', subscription: toShopSubscriptionDto(sub) } });
    }
    if (sub.status !== 'pending_payment') {
      return res.status(400).json({ success: false, message: 'This subscription is not awaiting payment' });
    }

    const msisdn = airtelMsisdnOrNull(req.body?.msisdn);
    if (!msisdn) {
      return res.status(400).json({ success: false, message: 'Enter a valid Airtel Money number, e.g. 0991 234 567' });
    }

    const { clientId, clientSecret } = getAirtelCredentials();
    if (!clientId || !clientSecret) {
      return res.status(503).json({ success: false, message: 'Airtel Money is not configured on the server (AIRTEL_CLIENT_ID / AIRTEL_CLIENT_SECRET)' });
    }

    const amount = Math.round(parseFloat(sub.package?.price_mwk) || 0);
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Package price must be greater than zero for payment' });
    }

    const reference = subscriptionPayChanguChargeId(sub.id); // SUB-{id}-{unique suffix}; unique per attempt
    const transactionId = normalizeAirtelReference(reference);
    const { response, data, success, message } = await postAirtelCollect({ transactionId, msisdn, amount });

    if (!success) {
      console.error('Subscription Airtel collect error:', response?.status, data);
      const status = response?.status >= 400 && response?.status < 500 ? response.status : 502;
      return res.status(status).json({ success: false, message: message || 'Airtel Money request failed', data: null });
    }

    await AirtelTransaction.create({
      transaction_id: transactionId,
      reference,
      shop_subscription_id: sub.id,
      msisdn,
      amount,
      currency: 'MWK',
      status: data?.data?.transaction?.status || null,
      status_code: data?.status?.response_code || data?.status?.result_code || null,
      message,
      processing_state: 'push_initiated',
      raw_payload: data
    });

    sub.payment_status = 'pending';
    sub.metadata = { ...(sub.metadata && typeof sub.metadata === 'object' ? sub.metadata : {}), airtel_pending: { transaction_id: transactionId, reference, msisdn, amount, initiated_at: new Date().toISOString() } };
    await sub.save();

    await logAudit({
      ...auditContext(req),
      action: 'seller.subscription.pay_airtel_initiate',
      actor_user_id: req.user.id,
      target_type: 'shop_subscription',
      target_id: sub.id,
      metadata: { shop_id: shop.id, amount_mwk: amount, transaction_id: transactionId },
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'Payment prompt sent. Approve it on your phone with your Airtel Money PIN.',
      data: { state: 'pending', provider: 'airtel', transaction_id: transactionId, amount_mwk: amount, msisdn, subscription: toShopSubscriptionDto(sub) }
    });
  } catch (error) {
    console.error('Subscription pay with Airtel error:', error);
    return res.status(500).json({ success: false, message: 'Payment initiation failed', error: error.message });
  }
};

/**
 * GET /api/sellers/:shopId/subscription/pay/airtel/status?subscription_id=
 * Enquires Airtel for the latest push on this subscription and activates it on success (TS),
 * so payment completes even where Airtel's webhook cannot reach the server.
 */
export const getAirtelPaymentStatus = async (req, res) => {
  try {
    const found = await findSellerSubscription(req, res, req.query?.subscription_id);
    if (!found) return;
    const { sub } = found;

    if (sub.status === 'active' && sub.payment_status === 'paid') {
      return res.json({ success: true, message: 'Subscription is active', data: { state: 'paid', subscription: toShopSubscriptionDto(sub) } });
    }

    const txRow = await AirtelTransaction.findOne({ where: { shop_subscription_id: sub.id }, order: [['id', 'DESC']] });
    if (!txRow?.transaction_id) {
      return res.json({ success: true, message: 'No Airtel payment started yet', data: { state: 'not_started', subscription: toShopSubscriptionDto(sub) } });
    }

    const summary = await getAirtelTransactionSummary({ transactionId: txRow.transaction_id });
    if (!summary.configured) {
      return res.status(503).json({ success: false, message: summary.message });
    }
    const { state, code } = airtelEnquiryState(summary.data);

    if (state === 'paid') {
      const result = await finalizePendingShopSubscriptionPayment(
        sub,
        { amount: txRow.amount, transaction_id: summary.data?.data?.transaction?.airtel_money_id || txRow.transaction_id, status: code },
        { source: 'airtel_status_enquiry', ip_address: req.ip, actor_user_id: req.user.id }
      );
      txRow.status_code = code;
      txRow.processing_state = result.ok ? 'subscription_activated' : (result.reason || 'subscription_not_finalized');
      await txRow.save();
      const fresh = await ShopSubscription.findByPk(sub.id, { include: subscriptionInclude });
      return res.json({
        success: result.ok,
        message: result.ok ? 'Payment received. Your subscription is active.' : 'Payment received but the subscription could not be activated',
        data: { state: result.ok ? 'paid' : 'error', reason: result.reason || null, subscription: toShopSubscriptionDto(fresh) }
      });
    }

    if (state === 'failed' && txRow.processing_state === 'push_initiated') {
      txRow.status_code = code;
      txRow.processing_state = 'non_success';
      await txRow.save();
    }

    return res.json({
      success: true,
      message: state === 'failed' ? 'The Airtel Money payment was declined or cancelled' : 'Waiting for approval on the phone',
      data: { state, airtel_status: code, transaction_id: txRow.transaction_id, subscription: toShopSubscriptionDto(sub) }
    });
  } catch (error) {
    console.error('Subscription Airtel status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to check Airtel payment status', error: error.message });
  }
};
