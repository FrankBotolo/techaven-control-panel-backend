import { settleManualOrder } from '../services/manual-payment-settlement.js';
import db from '../models/index.js';
import { Op } from 'sequelize';
import { sendNotificationEmail } from './notificationHelper.js';
import { logAudit } from './audit.js';

const { Order, Wallet, WalletTransaction, Escrow, User, Notification } = db;

/**
 * Mark order paid, create escrow, credit admin wallet, notify — shared by all payment webhooks' success path.
 * @param {import('sequelize').Model} order - Sequelize Order with seller + items if needed for email
 * @param {{ paymentMethod: string, paymentReference: string | null, source: string, req: import('express').Request }} opts
 */
export async function completeOrderPaidWithEscrow(order, opts) {
  return db.sequelize.transaction(async transaction => {
    const current = await Order.findByPk(order.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!current) throw new Error('Order not found');
    if (current.payment_status === 'paid') return;
    await settleManualOrder(current, opts.paymentReference || `${opts.source}_${current.id}`, transaction);
    await current.update({ payment_method: opts.paymentMethod }, { transaction });
    await db.AuditLog.create({ action: 'order.payment.complete', actor_user_id: null, target_type: 'order', target_id: String(current.id), metadata: { source: opts.source }, ip_address: opts.req?.ip }, { transaction });
    Object.assign(order.dataValues, current.dataValues);
  });
}

/**
 * Load order for Pay Changu / Airtel-style reference (order_number or numeric id).
 * @param {string} ref
 */
export async function findOrderByPaymentRef(ref) {
  const s = String(ref ?? '').trim();
  if (!s) return null;
  const numeric = parseInt(s, 10);
  return Order.findOne({
    where: {
      [Op.or]: [{ order_number: s }, ...(Number.isFinite(numeric) && numeric > 0 ? [{ id: numeric }] : [])]
    },
    include: [
      { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
      { model: db.OrderItem, as: 'items', required: false }
    ]
  });
}
