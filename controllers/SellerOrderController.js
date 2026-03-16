import db from '../models/index.js';
import { Op } from 'sequelize';
import { logAudit } from '../utils/audit.js';
import { sendNotificationEmail } from '../utils/notificationHelper.js';

const { Order, OrderItem, Product, User, Escrow, Wallet, WalletTransaction, Notification, Shop, DeliveryJob, DeliveryAgent } = db;

export const listSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { status } = req.query;

    const where = { seller_id: sellerId };
    if (status && ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      where.status = status;
    }

    const orders = await Order.findAll({
      where,
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone_number'] }
      ],
      order: [['id', 'DESC']]
    });

    const orderIds = orders.map(o => o.id);
    const deliveryJobs = orderIds.length > 0
      ? await DeliveryJob.findAll({
          where: { order_id: orderIds },
          include: [{ model: DeliveryAgent, as: 'agent', include: [{ model: User, as: 'user', attributes: ['name'] }] }]
        })
      : [];
    const agentNameByOrderId = {};
    deliveryJobs.forEach(j => {
      if (j.agent_id && j.agent?.user?.name) {
        agentNameByOrderId[j.order_id] = j.agent.user.name;
      }
    });

    const formatted = orders.map(o => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      payment_status: o.payment_status,
      total_amount: parseFloat(o.total_amount),
      escrow_status: o.escrow_status,
      seller_accepted_at: o.seller_accepted_at,
      delivery_method: o.delivery_method,
      courier_service: o.courier_service,
      delivery_agent_name: agentNameByOrderId[o.id] || null,
      shipping_address: o.shipping_address,
      shipping_phone: o.shipping_phone,
      items: o.items,
      buyer: o.user,
      created_at: o.createdAt
    }));

    return res.json({
      success: true,
      message: 'Seller orders retrieved',
      data: formatted
    });
  } catch (error) {
    console.error('List seller orders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders',
      error: error.message
    });
  }
};

export const acceptOrder = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { order_id } = req.params;
    const { delivery_method } = req.body;
    const id = order_id?.toString().replace(/^ord_/, '') || order_id;

    const order = await Order.findOne({
      where: { id, seller_id: sellerId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: OrderItem, as: 'items' }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.seller_accepted_at) {
      return res.status(400).json({
        success: false,
        message: 'Order already accepted'
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot accept a cancelled order'
      });
    }

    order.seller_accepted_at = new Date();
    order.status = 'processing';
    if (delivery_method && ['self_ship', 'platform_agent', 'third_party_courier'].includes(delivery_method)) {
      order.delivery_method = delivery_method;
    }
    await order.save();

    if (order.delivery_method === 'platform_agent') {
      const shop = await Shop.findByPk(req.user.shop_id);
      const pickupAddr = shop?.address || shop?.location || 'Seller address';
      await DeliveryJob.create({
        order_id: order.id,
        pickup_address: pickupAddr,
        dropoff_address: order.shipping_address,
        parcel_summary: order.items?.map(i => i.product_name).join(', ') || 'Order items',
        delivery_fee: 0,
        status: 'pending'
      });
    }

    const acceptedNotification = await Notification.create({
      user_id: order.user_id,
      title: 'Order Accepted',
      message: `Seller has accepted your order ${order.order_number}. Your order is being prepared for shipment.`,
      type: 'order',
      order_id: order.id,
      read: false
    });
    sendNotificationEmail(acceptedNotification, order);

    await logAudit({
      action: 'seller.order.accept',
      actor_user_id: sellerId,
      target_type: 'order',
      target_id: order.id,
      metadata: { order_number: order.order_number, delivery_method: order.delivery_method },
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'Order accepted. You can now prepare and pack the item.',
      data: {
        order_id: `ord_${order.id}`,
        order_number: order.order_number,
        seller_accepted_at: order.seller_accepted_at,
        delivery_method: order.delivery_method
      }
    });
  } catch (error) {
    console.error('Accept order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to accept order',
      error: error.message
    });
  }
};

export const rejectOrder = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { order_id } = req.params;
    const { reason } = req.body;
    const id = order_id?.toString().replace(/^ord_/, '') || order_id;

    const order = await Order.findOne({
      where: { id, seller_id: sellerId },
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.seller_accepted_at) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an order that has already been accepted'
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled'
      });
    }

    order.status = 'cancelled';
    await order.save();

    for (const item of order.items) {
      const product = await Product.findByPk(item.product_id);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    if (order.payment_status === 'paid' && (order.escrow_status === 'held' || order.escrow_status === 'pending')) {
      const escrow = await Escrow.findOne({ where: { order_id: order.id } });
      const refundAmount = parseFloat(order.escrow_amount) || parseFloat(order.total_amount) || 0;

      let buyerWallet = await Wallet.findOne({ where: { user_id: order.user_id } });
      if (!buyerWallet) {
        buyerWallet = await Wallet.create({
          user_id: order.user_id,
          balance: 0,
          currency: 'MWK'
        });
      }
      const buyerNewBalance = parseFloat(buyerWallet.balance) + refundAmount;
      buyerWallet.balance = buyerNewBalance;
      await buyerWallet.save();

      await WalletTransaction.create({
        wallet_id: buyerWallet.id,
        user_id: order.user_id,
        type: 'credit',
        amount: refundAmount,
        currency: 'MWK',
        description: `Refund: Order ${order.order_number} cancelled by seller`,
        reference: `order_refund_${order.id}`,
        status: 'completed',
        balance_after: buyerNewBalance
      });

      if (escrow) {
        escrow.status = 'refunded';
        escrow.refunded_at = new Date();
        await escrow.save();
      }
      order.escrow_status = 'refunded';
      order.payment_status = 'refunded';
      await order.save();

      const adminUsers = await User.findAll({ where: { role: 'admin' }, limit: 1 });
      if (adminUsers.length > 0) {
        const adminWallet = await Wallet.findOne({ where: { user_id: adminUsers[0].id } });
        if (adminWallet) {
          const adminNewBalance = parseFloat(adminWallet.balance) - refundAmount;
          adminWallet.balance = adminNewBalance;
          await adminWallet.save();
        }
      }
    }

    const cancelledNotification = await Notification.create({
      user_id: order.user_id,
      title: 'Order Cancelled',
      message: `Your order ${order.order_number} was cancelled by the seller.${order.payment_status === 'refunded' ? ' Funds have been refunded to your wallet.' : ''}`,
      type: 'order',
      order_id: order.id,
      read: false
    });
    sendNotificationEmail(cancelledNotification, order);

    await logAudit({
      action: 'seller.order.reject',
      actor_user_id: sellerId,
      target_type: 'order',
      target_id: order.id,
      metadata: { order_number: order.order_number, reason: reason || 'Seller declined' },
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'Order rejected. Buyer has been notified and refunded if payment was made.',
      data: {
        order_id: `ord_${order.id}`,
        order_number: order.order_number,
        status: 'cancelled'
      }
    });
  } catch (error) {
    console.error('Reject order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject order',
      error: error.message
    });
  }
};
