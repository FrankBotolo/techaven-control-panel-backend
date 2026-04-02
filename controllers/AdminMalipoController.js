import db from '../models/index.js';
import { Op } from 'sequelize';

const { MalipoTransaction, Order, User, ShopSubscription } = db;

/**
 * GET /api/admin/malipo-transactions
 * List all Malipo transactions with status. Admin only.
 * Query: status, page, limit, merchant_txn_id (search)
 */
export const listMalipoTransactions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, merchant_txn_id } = req.query;

    const where = {};
    if (status && status.trim()) {
      where.status = { [Op.like]: `%${status.trim()}%` };
    }
    if (merchant_txn_id && merchant_txn_id.trim()) {
      where.merchant_txn_id = { [Op.like]: `%${merchant_txn_id.trim()}%` };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await MalipoTransaction.findAndCountAll({
      where,
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'order_number', 'total_amount', 'payment_status', 'status', 'user_id'],
          required: false,
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone_number'] }]
        },
        {
          model: ShopSubscription,
          as: 'shop_subscription',
          attributes: ['id', 'shop_id', 'status', 'payment_status', 'package_id'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Math.min(parseInt(limit) || 20, 100),
      offset
    });

    const transactions = rows.map(t => ({
      id: t.id,
      transaction_id: t.transaction_id,
      merchant_txn_id: t.merchant_txn_id,
      order_id: t.order_id,
      shop_subscription_id: t.shop_subscription_id,
      shop_subscription: t.shop_subscription
        ? {
            id: t.shop_subscription.id,
            shop_id: t.shop_subscription.shop_id,
            status: t.shop_subscription.status,
            payment_status: t.shop_subscription.payment_status,
            package_id: t.shop_subscription.package_id
          }
        : null,
      order: t.order ? {
        id: t.order.id,
        order_number: t.order.order_number,
        total_amount: parseFloat(t.order.total_amount),
        payment_status: t.order.payment_status,
        status: t.order.status
      } : null,
      customer_name: t.order?.user?.name ?? null,
      customer_email: t.order?.user?.email ?? null,
      customer_phone: t.order?.user?.phone_number ?? null,
      amount: t.amount != null ? parseFloat(t.amount) : null,
      currency: t.currency,
      status: t.status,
      customer_ref: t.customer_ref,
      narration: t.narration,
      psp_id: t.psp_id,
      created_at: t.createdAt
    }));

    return res.json({
      success: true,
      message: 'Malipo transactions retrieved',
      data: {
        transactions,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / parseInt(limit)) || 1,
          total_items: count
        }
      }
    });
  } catch (error) {
    console.error('List Malipo transactions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve Malipo transactions',
      error: error.message
    });
  }
};
