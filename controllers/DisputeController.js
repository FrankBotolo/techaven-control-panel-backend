import db from '../models/index.js';
import { Op } from 'sequelize';
import { logAudit } from '../utils/audit.js';
import { sendNotificationEmail } from '../utils/notificationHelper.js';

const { Dispute, Order, OrderItem, User, Escrow, Wallet, WalletTransaction, Notification } = db;

/** Buyer: Open a dispute for an order. Freezes escrow immediately. */
export const openDispute = async (req, res) => {
  try {
    const userId = req.user.id;
    const { order_id } = req.params;
    const { reason, evidence } = req.body;
    const id = order_id?.toString().replace(/^ord_/, '') || order_id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required',
        data: null
      });
    }

    const order = await Order.findOne({
      where: { id, user_id: userId },
      include: [{ model: User, as: 'seller', attributes: ['id', 'name', 'email'] }]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        data: null
      });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Disputes can only be opened for delivered orders',
        data: null
      });
    }

    if (order.escrow_status !== 'held') {
      return res.status(400).json({
        success: false,
        message: `Cannot open dispute. Escrow status is: ${order.escrow_status}`,
        data: null
      });
    }

    const existingDispute = await Dispute.findOne({
      where: { order_id: order.id, status: { [Op.ne]: 'resolved' } }
    });

    if (existingDispute) {
      return res.status(400).json({
        success: false,
        message: 'A dispute is already open for this order',
        data: null
      });
    }

    const dispute = await Dispute.create({
      order_id: order.id,
      buyer_id: userId,
      seller_id: order.seller_id,
      reason: reason.trim(),
      status: 'open',
      evidence: evidence || null
    });

    order.escrow_status = 'frozen';
    await order.save();

    const escrow = await Escrow.findOne({ where: { order_id: order.id } });
    if (escrow) {
      escrow.status = 'frozen';
      await escrow.save();
    }

    const sellerDisputeNotification = await Notification.create({
      user_id: order.seller_id,
      title: 'Dispute Opened',
      message: `A buyer has opened a dispute for order ${order.order_number}. Funds are frozen pending admin resolution.`,
      type: 'dispute',
      order_id: order.id,
      read: false
    });
    sendNotificationEmail(sellerDisputeNotification, order);

    const adminUsers = await User.findAll({ where: { role: 'admin' } });
    for (const admin of adminUsers) {
      const adminDisputeNotification = await Notification.create({
        user_id: admin.id,
        title: 'New Dispute',
        message: `Dispute opened for order ${order.order_number}. Reason: ${reason.substring(0, 100)}...`,
        type: 'dispute',
        order_id: order.id,
        read: false
      });
      sendNotificationEmail(adminDisputeNotification, order);
    }

    await logAudit({
      action: 'buyer.dispute.open',
      actor_user_id: userId,
      target_type: 'dispute',
      target_id: dispute.id,
      metadata: { order_id: order.id, order_number: order.order_number },
      ip_address: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Dispute opened. Escrow funds are frozen pending admin resolution.',
      data: {
        id: dispute.id,
        order_id: `ord_${order.id}`,
        status: dispute.status,
        reason: dispute.reason,
        created_at: dispute.createdAt
      }
    });
  } catch (error) {
    console.error('Open dispute error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to open dispute',
      data: null,
      error: error.message
    });
  }
};

/** Buyer: Get dispute status for an order */
export const getDisputeStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { order_id } = req.params;
    const id = order_id?.toString().replace(/^ord_/, '') || order_id;

    const order = await Order.findOne({
      where: { id, user_id: userId }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        data: null
      });
    }

    const dispute = await Dispute.findOne({
      where: { order_id: order.id },
      include: [
        { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!dispute) {
      return res.json({
        success: true,
        message: 'No dispute for this order',
        data: { disputes: null }
      });
    }

    return res.json({
      success: true,
      message: 'Dispute retrieved',
      data: {
        disputes: {
          id: dispute.id,
          order_id: `ord_${order.id}`,
          status: dispute.status,
          resolution_type: dispute.resolution_type,
          reason: dispute.reason,
          admin_notes: dispute.admin_notes,
          refund_amount: dispute.refund_amount ? parseFloat(dispute.refund_amount) : null,
          resolved_at: dispute.resolved_at,
          created_at: dispute.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get dispute status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get dispute status',
      data: null,
      error: error.message
    });
  }
};

/** Admin: List disputes with filters */
export const listDisputes = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status && ['open', 'in_review', 'resolved'].includes(status)) {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Dispute.findAndCountAll({
      where,
      include: [
        { model: Order, as: 'order', attributes: ['id', 'order_number', 'total_amount', 'escrow_amount', 'status'] },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'email', 'phone_number'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'email', 'phone_number'] }
      ],
      order: [['id', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const disputes = rows.map(d => ({
      id: d.id,
      order_id: d.order_id,
      order_number: d.order?.order_number,
      buyer: d.buyer,
      seller: d.seller,
      reason: d.reason,
      status: d.status,
      resolution_type: d.resolution_type,
      refund_amount: d.refund_amount ? parseFloat(d.refund_amount) : null,
      seller_amount: d.seller_amount ? parseFloat(d.seller_amount) : null,
      escrow_amount: d.order?.escrow_amount ? parseFloat(d.order.escrow_amount) : null,
      created_at: d.createdAt,
      resolved_at: d.resolved_at
    }));

    return res.json({
      success: true,
      message: 'Disputes retrieved',
      data: {
        disputes,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / parseInt(limit)),
          total_items: count
        }
      }
    });
  } catch (error) {
    console.error('List disputes error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list disputes',
      error: error.message
    });
  }
};

/** Admin: Get dispute details */
export const getDisputeDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const dispute = await Dispute.findByPk(id, {
      include: [
        {
          model: Order,
          as: 'order',
          include: [{ model: OrderItem, as: 'items' }]
        },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'email', 'phone_number'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'email', 'phone_number'] },
        { model: User, as: 'resolver', attributes: ['id', 'name'], required: false }
      ]
    });

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    const escrow = await Escrow.findOne({ where: { order_id: dispute.order_id } });

    return res.json({
      success: true,
      message: 'Dispute details retrieved',
      data: {
        id: dispute.id,
        order_id: dispute.order_id,
        order: dispute.order,
        buyer: dispute.buyer,
        seller: dispute.seller,
        reason: dispute.reason,
        status: dispute.status,
        resolution_type: dispute.resolution_type,
        refund_amount: dispute.refund_amount ? parseFloat(dispute.refund_amount) : null,
        seller_amount: dispute.seller_amount ? parseFloat(dispute.seller_amount) : null,
        admin_notes: dispute.admin_notes,
        evidence: dispute.evidence,
        escrow: escrow ? {
          id: escrow.id,
          amount: parseFloat(escrow.amount),
          status: escrow.status
        } : null,
        resolved_by: dispute.resolver,
        resolved_at: dispute.resolved_at,
        created_at: dispute.createdAt
      }
    });
  } catch (error) {
    console.error('Get dispute details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get dispute details',
      error: error.message
    });
  }
};

/** Admin: Resolve dispute - redistribute escrow per decision */
export const resolveDispute = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { resolution_type, refund_amount, seller_amount, admin_notes } = req.body;

    const validResolutions = ['refund_buyer', 'pay_seller', 'partial', 'replacement'];
    if (!resolution_type || !validResolutions.includes(resolution_type)) {
      return res.status(400).json({
        success: false,
        message: `resolution_type must be one of: ${validResolutions.join(', ')}`
      });
    }

    const dispute = await Dispute.findByPk(id, {
      include: [
        { model: Order, as: 'order' },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    if (dispute.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Dispute is already resolved'
      });
    }

    const order = dispute.order;
    const escrowAmount = parseFloat(order.escrow_amount) || 0;

    if (resolution_type === 'partial') {
      const refund = parseFloat(refund_amount) || 0;
      const seller = parseFloat(seller_amount) || 0;
      if (refund + seller > escrowAmount || refund < 0 || seller < 0) {
        return res.status(400).json({
          success: false,
          message: 'Partial resolution: refund_amount + seller_amount must not exceed escrow and must be non-negative'
        });
      }
    }

    dispute.status = 'in_review';
    await dispute.save();

    const adminUsersForWallet = await User.findAll({ where: { role: 'admin' }, limit: 1 });
    let adminWallet = null;
    if (adminUsersForWallet.length > 0) {
      adminWallet = await Wallet.findOne({ where: { user_id: adminUsersForWallet[0].id } });
    }

    let buyerRefundAmount = 0;
    let sellerReceiveAmount = 0;

    if (resolution_type === 'refund_buyer') {
      buyerRefundAmount = escrowAmount;
      sellerReceiveAmount = 0;
    } else if (resolution_type === 'pay_seller') {
      buyerRefundAmount = 0;
      sellerReceiveAmount = escrowAmount;
    } else if (resolution_type === 'partial') {
      buyerRefundAmount = parseFloat(refund_amount) || 0;
      sellerReceiveAmount = parseFloat(seller_amount) || 0;
    } else if (resolution_type === 'replacement') {
      dispute.resolution_type = 'replacement';
      dispute.admin_notes = admin_notes || 'Seller instructed to send replacement. Escrow remains frozen until replacement confirmed.';
      dispute.resolved_by = adminId;
      dispute.resolved_at = new Date();
      dispute.status = 'resolved';
      await dispute.save();

      const buyerReplacementNotification = await Notification.create({
        user_id: dispute.buyer_id,
        title: 'Dispute Resolution',
        message: `Admin has ruled: Seller will send a replacement product for order ${order.order_number}.`,
        type: 'dispute',
        order_id: order.id,
        read: false
      });
      sendNotificationEmail(buyerReplacementNotification, order);
      const sellerReplacementNotification = await Notification.create({
        user_id: dispute.seller_id,
        title: 'Dispute Resolution',
        message: `Admin has ruled: You must send a replacement product for order ${order.order_number}.`,
        type: 'dispute',
        order_id: order.id,
        read: false
      });
      sendNotificationEmail(sellerReplacementNotification, order);

      await logAudit({
        action: 'admin.dispute.resolve',
        actor_user_id: adminId,
        target_type: 'dispute',
        target_id: dispute.id,
        metadata: { resolution_type: 'replacement', order_id: order.id },
        ip_address: req.ip
      });

      return res.json({
        success: true,
        message: 'Dispute resolved. Seller instructed to send replacement.',
        data: {
          id: dispute.id,
          status: dispute.status,
          resolution_type: dispute.resolution_type,
          admin_notes: dispute.admin_notes
        }
      });
    }

    if (adminWallet && (buyerRefundAmount > 0 || sellerReceiveAmount > 0)) {
      const currentAdminBalance = parseFloat(adminWallet.balance) || 0;

      if (buyerRefundAmount > 0) {
        let buyerWallet = await Wallet.findOne({ where: { user_id: dispute.buyer_id } });
        if (!buyerWallet) {
          buyerWallet = await Wallet.create({
            user_id: dispute.buyer_id,
            balance: 0,
            currency: 'MWK'
          });
        }
        const buyerNewBalance = parseFloat(buyerWallet.balance) + buyerRefundAmount;
        buyerWallet.balance = buyerNewBalance;
        await buyerWallet.save();

        await WalletTransaction.create({
          wallet_id: buyerWallet.id,
          user_id: dispute.buyer_id,
          type: 'credit',
          amount: buyerRefundAmount,
          currency: 'MWK',
          description: `Dispute refund for order ${order.order_number}`,
          reference: `dispute_refund_${dispute.id}`,
          status: 'completed',
          balance_after: buyerNewBalance
        });

        adminWallet.balance = currentAdminBalance - buyerRefundAmount;
        await adminWallet.save();
      }

      if (sellerReceiveAmount > 0) {
        let sellerWallet = await Wallet.findOne({ where: { user_id: dispute.seller_id } });
        if (!sellerWallet) {
          sellerWallet = await Wallet.create({
            user_id: dispute.seller_id,
            balance: 0,
            currency: 'MWK'
          });
        }
        const sellerNewBalance = parseFloat(sellerWallet.balance) + sellerReceiveAmount;
        sellerWallet.balance = sellerNewBalance;
        await sellerWallet.save();

        await WalletTransaction.create({
          wallet_id: sellerWallet.id,
          user_id: dispute.seller_id,
          type: 'credit',
          amount: sellerReceiveAmount,
          currency: 'MWK',
          description: `Dispute resolution - payment for order ${order.order_number}`,
          reference: `dispute_seller_${dispute.id}`,
          status: 'completed',
          balance_after: sellerNewBalance
        });

        const currentBalance = parseFloat(adminWallet.balance) || 0;
        adminWallet.balance = currentBalance - sellerReceiveAmount;
        await adminWallet.save();
      }
    }

    const escrow = await Escrow.findOne({ where: { order_id: order.id } });
    if (escrow) {
      escrow.status = buyerRefundAmount >= escrowAmount ? 'refunded' : 'released';
      escrow.released_at = new Date();
      if (buyerRefundAmount >= escrowAmount) escrow.refunded_at = new Date();
      await escrow.save();
    }

    order.escrow_status = buyerRefundAmount >= escrowAmount ? 'refunded' : 'released';
    order.funds_released_at = new Date();
    if (order.delivery_confirmed_at === null) {
      order.delivery_confirmed_at = new Date();
    }
    await order.save();

    dispute.resolution_type = resolution_type;
    dispute.refund_amount = buyerRefundAmount;
    dispute.seller_amount = sellerReceiveAmount;
    dispute.admin_notes = admin_notes || dispute.admin_notes;
    dispute.resolved_by = adminId;
    dispute.resolved_at = new Date();
    dispute.status = 'resolved';
    await dispute.save();

    const buyerResolvedNotification = await Notification.create({
      user_id: dispute.buyer_id,
      title: 'Dispute Resolved',
      message: buyerRefundAmount > 0
        ? `Your dispute for order ${order.order_number} has been resolved. MWK ${buyerRefundAmount.toLocaleString()} has been refunded to your wallet.`
        : `Your dispute for order ${order.order_number} has been resolved. Admin ruled in seller's favour.`,
      type: 'dispute',
      order_id: order.id,
      read: false
    });
    sendNotificationEmail(buyerResolvedNotification, order);
    const sellerResolvedNotification = await Notification.create({
      user_id: dispute.seller_id,
      title: 'Dispute Resolved',
      message: sellerReceiveAmount > 0
        ? `Dispute for order ${order.order_number} resolved. MWK ${sellerReceiveAmount.toLocaleString()} has been released to your wallet.`
        : `Dispute for order ${order.order_number} resolved. Full refund issued to buyer.`,
      type: 'dispute',
      order_id: order.id,
      read: false
    });
    sendNotificationEmail(sellerResolvedNotification, order);

    await logAudit({
      action: 'admin.dispute.resolve',
      actor_user_id: adminId,
      target_type: 'dispute',
      target_id: dispute.id,
      metadata: {
        resolution_type,
        refund_amount: buyerRefundAmount,
        seller_amount: sellerReceiveAmount,
        order_id: order.id
      },
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'Dispute resolved successfully',
      data: {
        id: dispute.id,
        status: dispute.status,
        resolution_type: dispute.resolution_type,
        refund_amount: buyerRefundAmount,
        seller_amount: sellerReceiveAmount,
        admin_notes: dispute.admin_notes
      }
    });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve dispute',
      error: error.message
    });
  }
};
