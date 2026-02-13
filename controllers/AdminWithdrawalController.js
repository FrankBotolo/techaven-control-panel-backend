import db from '../models/index.js';
import { logAudit } from '../utils/audit.js';

const { WithdrawalRequest, User, Wallet, WalletTransaction, Notification } = db;

/**
 * List all withdrawal requests (admin). Filter by status.
 */
export const listWithdrawals = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status && ['pending', 'processing', 'completed', 'rejected'].includes(status)) {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await WithdrawalRequest.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone_number', 'role'] }
      ],
      order: [['id', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const withdrawals = rows.map(w => ({
      id: w.id,
      user_id: w.user_id,
      user: w.user ? {
        id: w.user.id,
        name: w.user.name,
        email: w.user.email,
        phone_number: w.user.phone_number
      } : null,
      amount: parseFloat(w.amount),
      currency: w.currency,
      status: w.status,
      withdrawal_method: w.withdrawal_method,
      account_number: w.account_number,
      account_name: w.account_name,
      admin_notes: w.admin_notes,
      processed_by: w.processed_by,
      processed_at: w.processed_at,
      created_at: w.createdAt || w.created_at
    }));

    return res.json({
      success: true,
      message: 'Withdrawal requests retrieved',
      data: {
        withdrawals,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / parseInt(limit)),
          total_items: count
        }
      }
    });
  } catch (error) {
    console.error('List withdrawals error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve withdrawal requests',
      error: error.message
    });
  }
};

/**
 * Process withdrawal: approve (complete) or reject. On approve, debit seller wallet.
 */
export const processWithdrawal = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    if (!['completed', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'status must be "completed" or "rejected"'
      });
    }

    const request = await WithdrawalRequest.findByPk(id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    if (request.status !== 'pending' && request.status !== 'processing') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal is already ${request.status}`
      });
    }

    if (status === 'completed') {
      const sellerId = request.user_id;
      let wallet = await Wallet.findOne({ where: { user_id: sellerId } });
      if (!wallet) {
        return res.status(400).json({
          success: false,
          message: 'Seller wallet not found'
        });
      }
      const availableBalance = parseFloat(wallet.balance) || 0;
      const amount = parseFloat(request.amount);
      if (amount > availableBalance) {
        return res.status(400).json({
          success: false,
          message: `Seller has insufficient balance. Available: MK ${availableBalance.toLocaleString()}`
        });
      }

      const newBalance = availableBalance - amount;
      wallet.balance = newBalance;
      await wallet.save();

      await WalletTransaction.create({
        wallet_id: wallet.id,
        user_id: sellerId,
        type: 'debit',
        amount: request.amount,
        currency: request.currency,
        description: `Withdrawal to ${request.withdrawal_method}${request.account_number ? ` (${request.account_number})` : ''}`,
        reference: `withdrawal_${request.id}`,
        status: 'completed',
        balance_after: newBalance
      });
    }

    request.status = status === 'completed' ? 'completed' : 'rejected';
    request.admin_notes = admin_notes || request.admin_notes;
    request.processed_by = adminId;
    request.processed_at = new Date();
    await request.save();

    await logAudit({
      action: 'admin.withdrawal.process',
      actor_user_id: adminId,
      target_type: 'withdrawal_request',
      target_id: request.id,
      metadata: { status: request.status, amount: request.amount, user_id: request.user_id },
      ip_address: req.ip
    });

    const amountStr = `MK ${parseFloat(request.amount).toLocaleString()}`;
    await Notification.create({
      user_id: request.user_id,
      title: request.status === 'completed' ? 'Withdrawal Completed' : 'Withdrawal Rejected',
      message: request.status === 'completed'
        ? `Your withdrawal of ${amountStr} has been processed and sent to your ${request.withdrawal_method} account.`
        : `Your withdrawal request of ${amountStr} was not approved.${request.admin_notes ? ` Reason: ${request.admin_notes}` : ''}`,
      type: 'payment',
      read: false
    });

    return res.json({
      success: true,
      message: status === 'completed'
        ? 'Withdrawal completed. Funds have been debited from seller wallet.'
        : 'Withdrawal rejected.',
      data: {
        id: request.id,
        status: request.status,
        processed_at: request.processed_at,
        admin_notes: request.admin_notes
      }
    });
  } catch (error) {
    console.error('Process withdrawal error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal',
      error: error.message
    });
  }
};

/**
 * Get a single withdrawal request (admin)
 */
export const getWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await WithdrawalRequest.findByPk(id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone_number'] }]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }

    return res.json({
      success: true,
      message: 'Withdrawal request retrieved',
      data: {
        id: request.id,
        user_id: request.user_id,
        user: request.user,
        amount: parseFloat(request.amount),
        currency: request.currency,
        status: request.status,
        withdrawal_method: request.withdrawal_method,
        account_number: request.account_number,
        account_name: request.account_name,
        admin_notes: request.admin_notes,
        processed_by: request.processed_by,
        processed_at: request.processed_at,
        created_at: request.createdAt || request.created_at
      }
    });
  } catch (error) {
    console.error('Get withdrawal error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve withdrawal request',
      error: error.message
    });
  }
};
