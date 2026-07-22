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
  const { paymentMethod, paymentReference, source, req } = opts;

  order.payment_status = 'paid';
  order.payment_method = paymentMethod;
  order.escrow_status = 'held';
  order.paid_at = new Date();
  await order.save();

  const escrowAmount = parseFloat(order.escrow_amount ?? order.total_amount) || 0;

  await Escrow.findOrCreate({
    where: { order_id: order.id },
    defaults: {
      order_id: order.id,
      seller_id: order.seller_id,
      amount: escrowAmount,
      currency: 'MWK',
      status: 'held',
      held_at: new Date()
    }
  });

  const allAdmins = await User.findAll({ where: { role: 'admin' } });
  if (allAdmins.length > 0) {
    let adminWallet = await Wallet.findOne({ where: { user_id: allAdmins[0].id } });
    if (!adminWallet) {
      adminWallet = await Wallet.create({ user_id: allAdmins[0].id, balance: 0, currency: 'MWK' });
    }
    const newBalance = parseFloat(adminWallet.balance) + escrowAmount;
    adminWallet.balance = newBalance;
    await adminWallet.save();
    await WalletTransaction.create({
      wallet_id: adminWallet.id,
      user_id: allAdmins[0].id,
      type: 'credit',
      amount: escrowAmount,
      currency: 'MWK',
      description: `Escrow hold for order ${order.order_number}`,
      reference: paymentReference || `paychangu_${order.id}`,
      status: 'completed',
      balance_after: newBalance
    });
  }

  const pendingTx = await WalletTransaction.findOne({
    where: { user_id: order.seller_id, reference: `order_${order.id}`, status: 'pending' }
  });
  if (pendingTx) {
    pendingTx.status = 'processing';
    pendingTx.description = `Order ${order.order_number} - Payment received, held in escrow`;
    await pendingTx.save();
  }

  await Notification.create({
    user_id: order.user_id,
    title: 'Payment Received',
    message: `Payment for order ${order.order_number} has been received. Funds are held in escrow until delivery confirmation.`,
    type: 'payment',
    order_id: order.id,
    read: false
  }).then((n) => sendNotificationEmail(n, order));

  for (const admin of allAdmins) {
    const adminNotif = await Notification.create({
      user_id: admin.id,
      title: 'Payment Received for Order',
      message: `Payment of MWK ${order.total_amount} received for order ${order.order_number}. Funds held in escrow.`,
      type: 'payment',
      order_id: order.id,
      read: false
    });
    sendNotificationEmail(adminNotif, order);
  }

  if (order.seller_id) {
    const sellerNotif = await Notification.create({
      user_id: order.seller_id,
      title: 'Order Payment Received',
      message: `Payment of MWK ${escrowAmount} received for order ${order.order_number}. Funds are held in escrow and will be released after delivery confirmation.`,
      type: 'payment',
      order_id: order.id,
      read: false
    });
    sendNotificationEmail(sellerNotif, order);
  }

  await logAudit({
    action: 'order.payment.complete',
    actor_user_id: null,
    target_type: 'order',
    target_id: order.id,
    metadata: {
      order_number: order.order_number,
      amount: order.total_amount,
      escrow_amount: escrowAmount,
      payment_method: order.payment_method,
      source,
      transaction_id: paymentReference
    },
    ip_address: req?.ip
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
