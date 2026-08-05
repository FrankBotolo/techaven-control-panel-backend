import db from '../models/index.js';
import { getAirtelCredentials, normalizeAirtelReference } from '../utils/airtelCollect.js';
import { getAirtelTransactionSummary, getAirtelAllTransactions } from '../utils/airtelTransactions.js';

const { AirtelTransaction, Order } = db;

function ensureAirtelConfigured(res) {
  const { clientId, clientSecret } = getAirtelCredentials();
  if (!clientId || !clientSecret) {
    res.status(500).json({
      success: false,
      message: 'Airtel is not configured. Set AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET in .env',
      data: null
    });
    return false;
  }
  return true;
}

function formatLocalTransaction(row) {
  return {
    id: row.id,
    transaction_id: row.transaction_id,
    airtel_money_id: row.airtel_money_id,
    reference: row.reference,
    order_id: row.order_id,
    shop_subscription_id: row.shop_subscription_id,
    msisdn: row.msisdn,
    amount: row.amount != null ? parseFloat(row.amount) : null,
    currency: row.currency,
    status: row.status,
    status_code: row.status_code,
    message: row.message,
    processing_state: row.processing_state,
    raw_payload: row.raw_payload,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    order: row.order
      ? {
          id: row.order.id,
          order_number: row.order.order_number,
          payment_status: row.order.payment_status,
          total_amount: parseFloat(row.order.total_amount)
        }
      : null
  };
}

/** GET /api/admin/airtel/transactions — local log. Use ?all=true for every row (no pagination). */
export const listTransactions = async (req, res) => {
  try {
    const fetchAll = req.query.all === 'true' || req.query.all === '1';
    const { page = 1, limit = 20, processing_state, order_id } = req.query;
    const where = {};
    if (processing_state) where.processing_state = processing_state;
    if (order_id) where.order_id = parseInt(order_id, 10) || 0;

    const include = [
      {
        model: Order,
        as: 'order',
        attributes: ['id', 'order_number', 'payment_status', 'total_amount'],
        required: false
      }
    ];

    if (fetchAll) {
      const rows = await AirtelTransaction.findAll({
        where,
        include,
        order: [['id', 'DESC']]
      });
      return res.json({
        success: true,
        message: 'All Airtel transactions retrieved',
        data: {
          transactions: rows.map(formatLocalTransaction),
          total_items: rows.length
        }
      });
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await AirtelTransaction.findAndCountAll({
      where,
      include,
      order: [['id', 'DESC']],
      limit: parseInt(limit, 10),
      offset
    });

    return res.json({
      success: true,
      message: 'Airtel transactions retrieved',
      data: {
        transactions: rows.map(formatLocalTransaction),
        pagination: {
          current_page: parseInt(page, 10),
          total_pages: Math.ceil(count / parseInt(limit, 10)),
          total_items: count
        }
      }
    });
  } catch (error) {
    console.error('Admin list Airtel transactions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list Airtel transactions',
      data: null,
      error: error.message
    });
  }
};

/** GET /api/admin/airtel/transactions/:id — single local log row. */
export const getTransaction = async (req, res) => {
  try {
    const row = await AirtelTransaction.findByPk(req.params.id, {
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'order_number', 'payment_status', 'total_amount'],
          required: false
        }
      ]
    });
    if (!row) {
      return res.status(404).json({ success: false, message: 'Transaction not found', data: null });
    }
    return res.json({
      success: true,
      message: 'Airtel transaction retrieved',
      data: formatLocalTransaction(row)
    });
  } catch (error) {
    console.error('Admin get Airtel transaction error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get Airtel transaction',
      data: null,
      error: error.message
    });
  }
};

/**
 * GET /api/admin/airtel/transactions/live — all transactions from Airtel API (no id).
 * GET /api/admin/airtel/transactions/live/summary — same; optional ?transaction_id= for one txn
 */
export const getLiveAllTransactions = async (req, res) => {
  try {
    if (!ensureAirtelConfigured(res)) return;

    const result = await getAirtelAllTransactions();

    return res.status(result.response?.ok ? 200 : result.response?.status || 502).json({
      success: result.success,
      message: result.message,
      data: {
        count: result.data?.data?.count ?? null,
        airtel: result.data
      }
    });
  } catch (error) {
    console.error('Admin Airtel live all transactions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch all Airtel transactions',
      data: null,
      error: error.message
    });
  }
};

export const getLiveTransactionSummary = async (req, res) => {
  try {
    if (!ensureAirtelConfigured(res)) return;

    const transactionId = String(req.query.transaction_id || req.query.transactionId || '').trim() || null;
    const result = await getAirtelTransactionSummary(
      transactionId ? { transactionId } : {}
    );

    return res.status(result.response?.ok ? 200 : result.response?.status || 502).json({
      success: result.success,
      message: result.message,
      data: {
        transaction_id: result.transactionId,
        airtel: result.data
      }
    });
  } catch (error) {
    console.error('Admin Airtel live summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch live Airtel transaction summary',
      data: null,
      error: error.message
    });
  }
};

/** GET /api/admin/airtel/orders/:orderId/status — live Airtel status for an order. */
export const getOrderPaymentStatus = async (req, res) => {
  try {
    if (!ensureAirtelConfigured(res)) return;

    const orderId = parseInt(String(req.params.orderId).replace(/^ord_/, ''), 10);
    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found', data: null });
    }

    const airtelTransactionId = normalizeAirtelReference(order.order_number);
    if (!airtelTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Order number is not a valid Airtel transaction id (must be alphanumeric, max 64 chars)',
        data: null
      });
    }

    const result = await getAirtelTransactionSummary({ transactionId: airtelTransactionId });
    const localRow = await AirtelTransaction.findOne({
      where: { order_id: order.id },
      order: [['createdAt', 'DESC']]
    });

    return res.status(result.response?.ok ? 200 : result.response?.status || 502).json({
      success: result.success,
      message: result.message,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        payment_status: order.payment_status,
        transaction_id: airtelTransactionId,
        local_transaction: localRow ? formatLocalTransaction(localRow) : null,
        airtel: result.data
      }
    });
  } catch (error) {
    console.error('Admin Airtel order status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch Airtel order payment status',
      data: null,
      error: error.message
    });
  }
};
