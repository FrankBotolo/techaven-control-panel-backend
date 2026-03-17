import db from '../models/index.js';
import { Op } from 'sequelize';

const { MalipoTransaction, Order, User } = db;

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
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone_number'] }]
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
