import db from '../models/index.js';
import { Op, literal } from 'sequelize';

const { Order, User, Shop } = db;

function buildOrderWhere(query) {
  const where = {
    seller_id: { [Op.ne]: null }
  };
  const { date_from, date_to, payment_status, only_with_fee } = query;

  if (date_from || date_to) {
    where.createdAt = {};
    if (date_from) where.createdAt[Op.gte] = new Date(date_from);
    if (date_to) where.createdAt[Op.lte] = new Date(date_to);
  }

  if (payment_status && ['pending', 'paid', 'failed', 'refunded'].includes(payment_status)) {
    where.payment_status = payment_status;
  }

  if (only_with_fee === 'true' || only_with_fee === '1') {
    where.platform_fee_amount = { [Op.gt]: 0 };
  }

  return where;
}

/** GET /api/admin/platform-deductions/summary */
export const getSummary = async (req, res) => {
  try {
    const where = buildOrderWhere(req.query);

    const row = await Order.findOne({
      attributes: [
        [literal('SUM(COALESCE(platform_fee_amount, 0))'), 'total_deductions_mwk'],
        [literal('COUNT(*)'), 'orders_count'],
        [literal('SUM(COALESCE(seller_gross_subtotal, 0))'), 'total_gross_subtotal_mwk'],
        [literal('COUNT(DISTINCT seller_id)'), 'sellers_with_orders_count']
      ],
      where,
      raw: true
    });

    return res.json({
      success: true,
      message: 'Platform deduction summary',
      data: {
        total_deductions_mwk: parseFloat(row?.total_deductions_mwk) || 0,
        orders_count: parseInt(row?.orders_count, 10) || 0,
        total_gross_subtotal_mwk: parseFloat(row?.total_gross_subtotal_mwk) || 0,
        sellers_with_orders_count: parseInt(row?.sellers_with_orders_count, 10) || 0,
        currency: 'MWK',
        filters_applied: {
          date_from: req.query.date_from || null,
          date_to: req.query.date_to || null,
          payment_status: req.query.payment_status || null,
          only_with_fee: req.query.only_with_fee === 'true' || req.query.only_with_fee === '1'
        }
      }
    });
  } catch (error) {
    console.error('Admin platform deductions summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load deduction summary',
      error: error.message
    });
  }
};

/** GET /api/admin/platform-deductions/by-seller */
export const listBySeller = async (req, res) => {
  try {
    const where = buildOrderWhere(req.query);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const countRow = await Order.findOne({
      attributes: [[literal('COUNT(DISTINCT seller_id)'), 'cnt']],
      where,
      raw: true
    });
    const totalSellers = parseInt(countRow?.cnt, 10) || 0;

    const rows = await Order.findAll({
      attributes: [
        'seller_id',
        [literal('SUM(COALESCE(platform_fee_amount, 0))'), 'total_deductions_mwk'],
        [literal('COUNT(*)'), 'orders_count'],
        [literal('SUM(COALESCE(seller_gross_subtotal, 0))'), 'total_gross_subtotal_mwk']
      ],
      where,
      group: ['seller_id'],
      order: [[literal('SUM(COALESCE(platform_fee_amount, 0))'), 'DESC']],
      limit,
      offset,
      subQuery: false,
      raw: true
    });

    const sellerIds = rows.map((r) => r.seller_id).filter(Boolean);
    const sellers = await User.findAll({
      where: { id: sellerIds },
      attributes: ['id', 'name', 'email', 'phone_number', 'shop_id'],
      include: [{ model: Shop, as: 'shop', attributes: ['id', 'name'] }]
    });
    const byId = new Map(sellers.map((u) => [u.id, u]));

    const sellers_out = rows.map((r) => {
      const u = byId.get(r.seller_id);
      return {
        seller_id: r.seller_id,
        total_deductions_mwk: parseFloat(r.total_deductions_mwk) || 0,
        orders_count: parseInt(r.orders_count, 10) || 0,
        total_gross_subtotal_mwk: parseFloat(r.total_gross_subtotal_mwk) || 0,
        currency: 'MWK',
        seller: u
          ? {
              id: u.id,
              name: u.name,
              email: u.email,
              phone_number: u.phone_number,
              shop: u.shop ? { id: u.shop.id, name: u.shop.name } : null
            }
          : null
      };
    });

    return res.json({
      success: true,
      message: 'Deductions by seller',
      data: {
        sellers: sellers_out,
        pagination: {
          current_page: page,
          total_pages: totalSellers ? Math.ceil(totalSellers / limit) : 0,
          total_items: totalSellers,
          limit
        },
        filters_applied: {
          date_from: req.query.date_from || null,
          date_to: req.query.date_to || null,
          payment_status: req.query.payment_status || null,
          only_with_fee: req.query.only_with_fee === 'true' || req.query.only_with_fee === '1'
        }
      }
    });
  } catch (error) {
    console.error('Admin platform deductions by seller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load deductions by seller',
      error: error.message
    });
  }
};
