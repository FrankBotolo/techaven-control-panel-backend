import db from '../models/index.js';
import { Op } from 'sequelize';

const { User, Wallet, WalletTransaction } = db;

export const getWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get or create wallet for user
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await Wallet.create({
        user_id: userId,
        balance: 0.00,
        currency: 'MWK'
      });
    }
    
    const balance = parseFloat(wallet.balance) || 0;
    
    return res.json({
      success: true,
      message: 'Wallet retrieved',
      data: {
        balance: balance,
        currency: wallet.currency || 'MWK',
        formatted_balance: `MK ${balance.toLocaleString()}`
      }
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
    
    const formattedTransactions = transactions.map(txn => ({
      id: `txn_${txn.id}`,
      type: txn.type,
      amount: parseFloat(txn.amount) || 0,
      currency: txn.currency || 'MWK',
      description: txn.description,
      reference: txn.reference,
      balance_after: txn.balance_after ? parseFloat(txn.balance_after) : null,
      created_at: txn.createdAt || txn.created_at || new Date()
    }));
    
    return res.json({
      success: true,
      message: 'Transactions retrieved',
      data: {
        transactions: formattedTransactions,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / parseInt(limit)),
          total_items: count
        }
      }
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

export const topUpWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, payment_method, phone_number } = req.body;
    
    if (!amount || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Amount and payment method are required'
      });
    }
    
    const topUpAmount = parseFloat(amount);
    if (isNaN(topUpAmount) || topUpAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }
    
    // Get or create wallet for user
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    
    if (!wallet) {
      wallet = await Wallet.create({
        user_id: userId,
        balance: 0.00,
        currency: 'MWK'
      });
    }
    
    // Create transaction record
    const transaction = await WalletTransaction.create({
      wallet_id: wallet.id,
      user_id: userId,
      type: 'credit',
      amount: topUpAmount,
      currency: 'MWK',
      description: `Top up via ${payment_method}`,
      reference: `topup_${Date.now()}`,
      status: 'pending' // Will be updated to 'completed' after payment confirmation
    });
    
    // For now, we'll mark it as completed immediately (in production, wait for payment gateway confirmation)
    // Update wallet balance
    const newBalance = parseFloat(wallet.balance) + topUpAmount;
    wallet.balance = newBalance;
    await wallet.save();
    
    // Update transaction status and balance_after
    transaction.status = 'completed';
    transaction.balance_after = newBalance;
    await transaction.save();
    
    return res.json({
      success: true,
      message: 'Top up completed successfully',
      data: {
        transaction_id: `txn_${transaction.id}`,
        amount: topUpAmount,
        status: 'completed',
        balance_after: newBalance,
        currency: 'MWK'
      }
    });
  } catch (error) {
    console.error('Top up error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process top up',
      error: error.message
    });
  }
};

