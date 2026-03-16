import db from '../models/index.js';
import { Op } from 'sequelize';

const { User, Wallet, WalletTransaction, Order } = db;

/** GET /api/wallet/balance — API doc shape */
export const getBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0, currency: 'MWK' });
    }
    return res.json({
      success: true,
      message: 'Balance retrieved',
      data: {
        balance: parseFloat(wallet.balance) || 0,
        currency: wallet.currency || 'MWK'
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve balance',
      data: null,
      error: error.message
    });
  }
};

export const getWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get or create wallet for user (sellers only - enforced by route)
    let wallet = await Wallet.findOne({ where: { user_id: userId } });

    if (!wallet) {
      wallet = await Wallet.create({
        user_id: userId,
        balance: 0.00,
        currency: 'MWK'
      });
    }

    const balance = parseFloat(wallet.balance) || 0;
    const currency = wallet.currency || 'MWK';

    const data = {
      balance,
      currency,
      formatted_balance: `MK ${balance.toLocaleString()}`
    };

    // Sellers: show available (withdrawable) vs pending in escrow
    if (userRole === 'seller') {
      const pendingEscrowResult = await Order.sum('escrow_amount', {
        where: {
          seller_id: userId,
          escrow_status: 'held',
          payment_status: 'paid'
        }
      });
      const pending_escrow = parseFloat(pendingEscrowResult) || 0;
      data.available_balance = balance;
      data.pending_escrow = pending_escrow;
      data.formatted_available = `MK ${balance.toLocaleString()}`;
      data.formatted_pending_escrow = `MK ${pending_escrow.toLocaleString()}`;
      data.can_withdraw = balance > 0;
    }

    return res.json({
      success: true,
      message: 'Wallet retrieved',
      data
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve wallet',
      error: error.message
    });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type } = req.query;
    
    // Get user's wallet
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await Wallet.create({
        user_id: userId,
        balance: 0.00,
        currency: 'MWK'
      });
    }
    
    const whereClause = { user_id: userId };
    if (type && (type === 'credit' || type === 'debit')) {
      whereClause.type = type;
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: transactions } = await WalletTransaction.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      order: [['id', 'DESC']]
    });
    
    // API doc: data is direct array of { id, type, amount, description, status, created_at }
    const formattedTransactions = transactions.map(txn => ({
      id: txn.id,
      type: txn.type,
      amount: parseFloat(txn.amount) || 0,
      description: txn.description || '',
      status: txn.status,
      created_at: txn.createdAt || txn.created_at || new Date()
    }));
    
    return res.json({
      success: true,
      message: 'Transactions retrieved',
      data: formattedTransactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve transactions',
      error: error.message
    });
  }
};
