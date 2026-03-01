import db from '../models/index.js';
import { Op } from 'sequelize';

const { Order, Wallet, WalletTransaction } = db;

/**
 * POST /api/webhooks/onekhusa
 * Called by OneKhusa after payment success/failure. No auth.
 * Payload: { transaction_id, status, amount, reference }
 * reference can be ORDER-{orderId} or TOPUP-{userId}
 */
export const onekhusa = async (req, res) => {
  try {
    const { transaction_id, status, amount, reference } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Missing reference' });
    }

    if (status === 'success') {
      if (reference.startsWith('ORDER-')) {
        const orderId = parseInt(reference.replace('ORDER-', ''), 10);
        const order = await Order.findByPk(orderId);
        if (order && order.payment_status !== 'paid') {
          order.payment_status = 'paid';
          order.payment_method = 'onekhusa';
          await order.save();
        }
      } else if (reference.startsWith('TOPUP-')) {
        const userId = parseInt(reference.replace('TOPUP-', ''), 10);
        const topUpAmount = parseFloat(amount) || 0;
        if (topUpAmount > 0) {
          let wallet = await Wallet.findOne({ where: { user_id: userId } });
          if (!wallet) {
            wallet = await Wallet.create({ user_id: userId, balance: 0, currency: 'MWK' });
          }
          const newBalance = parseFloat(wallet.balance) + topUpAmount;
          wallet.balance = newBalance;
          await wallet.save();
          await WalletTransaction.create({
            wallet_id: wallet.id,
            user_id: userId,
            type: 'credit',
            amount: topUpAmount,
            currency: 'MWK',
            description: 'Wallet top-up',
            reference: transaction_id || `onekhusa_${Date.now()}`,
            status: 'completed',
            balance_after: newBalance
          });
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('OneKhusa webhook error:', error);
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};
