import db from '../models/index.js';
import { Op } from 'sequelize';

const { Order, Wallet, WithdrawalRequest } = db;

/**
 * Get seller earnings summary: available balance, pending escrow, total released, and pending orders in escrow.
 * Money reflects in seller's "account" as soon as payment is held in escrow; they can only withdraw after release.
 */
export const getEarnings = async (req, res) => {
  try {
    const sellerId = req.user.id;

    let wallet = await Wallet.findOne({ where: { user_id: sellerId } });
    if (!wallet) {
      wallet = await Wallet.create({
        user_id: sellerId,
        balance: 0.00,
        currency: 'MWK'
      });
    }

    const availableBalance = parseFloat(wallet.balance) || 0;

    // Pending in escrow (held, not yet released)
    const pendingEscrowSum = await Order.sum('escrow_amount', {
      where: {
        seller_id: sellerId,
        escrow_status: 'held',
        payment_status: 'paid'
      }
    });
    const pending_escrow = parseFloat(pendingEscrowSum) || 0;

    // Total ever released to seller (from orders)
    const totalReleasedSum = await Order.sum('escrow_amount', {
      where: {
        seller_id: sellerId,
        escrow_status: 'released'
      }
    });
    const total_released = parseFloat(totalReleasedSum) || 0;

    // Orders currently in escrow (for transparency)
    const ordersInEscrow = await Order.findAll({
      where: {
        seller_id: sellerId,
        escrow_status: 'held',
        payment_status: 'paid'
      },
      attributes: ['id', 'order_number', 'escrow_amount', 'status', 'createdAt'],
      order: [['id', 'DESC']],
      limit: 20
    });

    const currency = wallet.currency || 'MWK';

    return res.json({
      success: true,
      message: 'Seller earnings retrieved successfully',
      data: {
        available_balance: availableBalance,
        pending_escrow,
        total_released,
        currency,
        formatted: {
          available_balance: `MK ${availableBalance.toLocaleString()}`,
          pending_escrow: `MK ${pending_escrow.toLocaleString()}`,
          total_released: `MK ${total_released.toLocaleString()}`
        },
        can_withdraw: availableBalance > 0,
        orders_in_escrow: ordersInEscrow.map(o => ({
          order_id: o.id,
          order_number: o.order_number,
          escrow_amount: parseFloat(o.escrow_amount) || 0,
          order_status: o.status,
          paid_at: o.updatedAt || o.updated_at
        }))
      }
    });
  } catch (error) {
    console.error('Get seller earnings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve seller earnings',
      error: error.message
    });
  }
};

/**
 * Request withdrawal. Only available balance can be withdrawn (post-escrow funds).
 */
export const requestWithdrawal = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { amount, withdrawal_method, account_number, account_name } = req.body;

    const MIN_WITHDRAWAL = 1000;
    const validMethods = ['mobile_money', 'bank_transfer'];

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < MIN_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal is MK ${MIN_WITHDRAWAL.toLocaleString()}`
      });
    }

    const method = withdrawal_method || 'mobile_money';
    if (!validMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: `withdrawal_method must be one of: ${validMethods.join(', ')}`
      });
    }

    let wallet = await Wallet.findOne({ where: { user_id: sellerId } });
    if (!wallet) {
      wallet = await Wallet.create({
        user_id: sellerId,
        balance: 0.00,
        currency: 'MWK'
      });
    }

    const availableBalance = parseFloat(wallet.balance) || 0;
    if (withdrawAmount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient available balance. Available: MK ${availableBalance.toLocaleString()}. You can only withdraw funds that have been released from escrow after delivery confirmation.`
      });
    }

    const request = await WithdrawalRequest.create({
      user_id: sellerId,
      amount: withdrawAmount,
      currency: wallet.currency || 'MWK',
      status: 'pending',
      withdrawal_method: method,
      account_number: account_number || null,
      account_name: account_name || null
    });

    return res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted. Funds will be sent after admin approval.',
      data: {
        withdrawal_id: request.id,
        amount: withdrawAmount,
        currency: request.currency,
        status: 'pending',
        withdrawal_method: request.withdrawal_method,
        created_at: request.createdAt || request.created_at
      }
    });
  } catch (error) {
    console.error('Request withdrawal error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit withdrawal request',
      error: error.message
    });
  }
};

/**
 * List seller's withdrawal requests
 */
export const getWithdrawals = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const where = { user_id: sellerId };
    if (status && ['pending', 'processing', 'completed', 'rejected'].includes(status)) {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await WithdrawalRequest.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    return res.json({
      success: true,
      message: 'Withdrawal requests retrieved',
      data: {
        withdrawals: rows.map(w => ({
          id: w.id,
          amount: parseFloat(w.amount),
          currency: w.currency,
          status: w.status,
          withdrawal_method: w.withdrawal_method,
          account_number: w.account_number,
          account_name: w.account_name,
          admin_notes: w.admin_notes,
          processed_at: w.processed_at,
          created_at: w.createdAt || w.created_at
        })),
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / parseInt(limit)),
          total_items: count
        }
      }
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve withdrawal requests',
      error: error.message
    });
  }
};
