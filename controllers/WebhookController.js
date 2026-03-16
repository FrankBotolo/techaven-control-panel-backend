import db from '../models/index.js';
import { Op } from 'sequelize';
import { sendNotificationEmail } from '../utils/notificationHelper.js';
import { logAudit } from '../utils/audit.js';

const { Order, Wallet, WalletTransaction, Escrow, User, Notification } = db;

/**
 * POST /api/webhooks/malipo
 * Called by Malipo after payment success. Configure callback URL in Malipo dashboard.
 * Payload may include: order_id (order_number), status, transaction_id, amount, etc.
 */
export const malipo = async (req, res) => {
  try {
    const body = req.body || {};
    const orderRef = body.order_id || body.order_number || body.reference;
    const status = (body.status || '').toLowerCase();

    if (!orderRef) {
      return res.status(400).json({ success: false, message: 'Missing order_id or reference' });
    }

    if (status !== 'success' && status !== 'completed' && status !== 'paid') {
      return res.status(200).json({ success: true, message: 'Webhook received (non-success)' });
    }

    const order = await Order.findOne({
      where: { [Op.or]: [{ order_number: orderRef }, { id: parseInt(orderRef, 10) || 0 }] },
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
        { model: db.OrderItem, as: 'items', required: false }
      ]
    });

    if (!order || order.payment_status === 'paid') {
      return res.status(200).json({ success: true, message: 'Webhook received' });
    }

    order.payment_status = 'paid';
    order.payment_method = body.psp_id === 2 ? 'mpamba' : 'airtel_money';
    order.escrow_status = 'held';
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
        reference: body.transaction_id || `malipo_${order.id}`,
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

    // Notify customer
    await Notification.create({
      user_id: order.user_id,
      title: 'Payment Received',
      message: `Payment for order ${order.order_number} has been received. Funds are held in escrow until delivery confirmation.`,
      type: 'payment',
      order_id: order.id,
      read: false
    }).then((n) => sendNotificationEmail(n, order));

    // Notify admin
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

    // Notify seller
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
        source: 'malipo_webhook',
        transaction_id: body.transaction_id
      },
      ip_address: req.ip
    });

    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Malipo webhook error:', error);
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};
