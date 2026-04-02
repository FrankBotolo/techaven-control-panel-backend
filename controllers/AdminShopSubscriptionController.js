import db from '../models/index.js';
import { logAudit, auditContext } from '../utils/audit.js';
import { toShopSubscriptionDto } from '../utils/subscriptionDto.js';
import { computePeriodEnd } from '../utils/subscriptionHelpers.js';

const { ShopSubscription, Shop, SubscriptionPackage, User } = db;

export const list = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      shop_id,
      status,
      payment_status
    } = req.query;

    const perPage = Math.min(parseInt(limit, 10) || 20, 100);
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (currentPage - 1) * perPage;

    const where = {};
    if (shop_id) where.shop_id = shop_id;
    if (status) where.status = status;
    if (payment_status) where.payment_status = payment_status;

    const { count, rows } = await ShopSubscription.findAndCountAll({
      where,
      include: [
        { model: SubscriptionPackage, as: 'package' },
        {
          model: Shop,
          as: 'shop',
          attributes: ['id', 'name', 'status', 'application_status', 'email', 'phone'],
          include: [
            {
              model: User,
              as: 'users',
              attributes: ['id', 'name', 'email', 'phone_number', 'role'],
              where: { role: 'seller' },
              required: false
            }
          ]
        }
      ],
      order: [['id', 'DESC']],
      limit: perPage,
      offset
    });

    const totalPages = Math.ceil(count / perPage) || 0;

    return res.json({
      success: true,
      message: 'Shop subscriptions retrieved',
      data: {
        subscriptions: (rows || []).map((s) => toShopSubscriptionDto(s)),
        pagination: {
          current_page: currentPage,
          per_page: perPage,
          total_items: count,
          total_pages: totalPages,
          has_next: currentPage < totalPages,
          has_prev: currentPage > 1
        }
      }
    });
  } catch (error) {
    console.error('Admin list shop subscriptions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
      error: error.message
    });
  }
};

export const getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await ShopSubscription.findByPk(id, {
      include: [
        { model: SubscriptionPackage, as: 'package' },
        {
          model: Shop,
          as: 'shop',
          attributes: ['id', 'name', 'status', 'application_status', 'email', 'phone'],
          include: [
            {
              model: User,
              as: 'users',
              attributes: ['id', 'name', 'email', 'phone_number', 'role'],
              where: { role: 'seller' },
              required: false
            }
          ]
        }
      ]
    });
    if (!row) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }
    return res.json({
      success: true,
      data: { subscription: toShopSubscriptionDto(row) }
    });
  } catch (error) {
    console.error('Admin get shop subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription',
      error: error.message
    });
  }
};

/**
 * Mark payment received, extend period, or fix status (admin).
 */
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await ShopSubscription.findByPk(id, {
      include: [{ model: SubscriptionPackage, as: 'package' }]
    });
    if (!row) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const {
      status,
      payment_status,
      payment_reference,
      notes,
      current_period_start,
      current_period_end,
      cancel_at_period_end
    } = req.body;

    if (status != null) row.status = status;
    if (payment_status != null) row.payment_status = payment_status;
    if (payment_reference !== undefined) row.payment_reference = payment_reference;
    if (notes !== undefined) row.notes = notes;
    if (cancel_at_period_end !== undefined) row.cancel_at_period_end = !!cancel_at_period_end;

    if (payment_status === 'paid' && row.status === 'pending_payment') {
      const start = new Date();
      row.current_period_start = current_period_start ? new Date(current_period_start) : start;
      const pkg = row.package;
      row.current_period_end = current_period_end
        ? new Date(current_period_end)
        : computePeriodEnd(row.current_period_start, pkg);
      row.status = 'active';
    } else {
      if (current_period_start != null) row.current_period_start = new Date(current_period_start);
      if (current_period_end != null) row.current_period_end = new Date(current_period_end);
    }

    await row.save();

    await logAudit({
      ...auditContext(req),
      action: 'admin.shop_subscription.update',
      actor_user_id: req.user.id,
      target_type: 'shop_subscription',
      target_id: row.id,
      metadata: { shop_id: row.shop_id, payment_status: row.payment_status }
    });

    const fresh = await ShopSubscription.findByPk(row.id, {
      include: [
        { model: SubscriptionPackage, as: 'package' },
        {
          model: Shop,
          as: 'shop',
          attributes: ['id', 'name', 'status', 'application_status', 'email', 'phone'],
          include: [
            {
              model: User,
              as: 'users',
              attributes: ['id', 'name', 'email', 'phone_number', 'role'],
              where: { role: 'seller' },
              required: false
            }
          ]
        }
      ]
    });

    return res.json({
      success: true,
      message: 'Subscription updated',
      data: { subscription: toShopSubscriptionDto(fresh) }
    });
  } catch (error) {
    console.error('Admin update shop subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update subscription',
      error: error.message
    });
  }
};
