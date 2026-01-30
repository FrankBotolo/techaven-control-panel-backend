import db from '../models/index.js';
import { logAudit } from '../utils/audit.js';

const { Order, OrderItem, Cart, Product, User, Notification } = db;

const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
};

export const checkout = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      shipping_address,
      shipping_city,
      shipping_phone,
      payment_method = 'cash_on_delivery',
      notes
    } = req.body;

    if (!shipping_address || !shipping_phone) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address and phone are required'
      });
    }

    // Get cart items
    const cartItems = await Cart.findAll({
      where: { user_id: userId },
      include: [{ model: Product, as: 'product' }]
    });

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Validate stock and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const cartItem of cartItems) {
      const product = cartItem.product;

      if (product.stock < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Only ${product.stock} available`
        });
      }

      const itemPrice = parseFloat(product.price);
      const subtotal = itemPrice * cartItem.quantity;
      totalAmount += subtotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_image: product.image,
        quantity: cartItem.quantity,
        price: itemPrice,
        subtotal: subtotal
      });
    }

    // Create order
    const orderNumber = generateOrderNumber();
    const order = await Order.create({
      user_id: userId,
      order_number: orderNumber,
      status: 'pending',
      total_amount: totalAmount,
      shipping_address,
      shipping_city: shipping_city || null,
      shipping_phone,
      payment_method,
      payment_status: payment_method === 'cash_on_delivery' ? 'pending' : 'pending',
      notes: notes || null
    });

    // Create order items and update product stock
    for (const item of orderItems) {
      await OrderItem.create({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      });

      // Update product stock
      const product = await Product.findByPk(item.product_id);
      product.stock -= item.quantity;
      await product.save();
    }

    // Clear cart
    await Cart.destroy({
      where: { user_id: userId }
    });

    // Create notification
    await Notification.create({
      user_id: userId,
      title: 'Order Placed',
      message: `Your order ${orderNumber} has been placed successfully.`,
      type: 'order',
      order_id: order.id,
      read: false
    });

    await logAudit({
      action: 'customer.order.create',
      actor_user_id: userId,
      target_type: 'order',
      target_id: order.id,
      metadata: { order_number: orderNumber, total_amount: totalAmount },
      ip_address: req.ip
    });

    // Get order with items
    const orderWithItems = await Order.findByPk(order.id, {
      include: [
        {
          model: OrderItem,
          as: 'items'
        }
      ]
    });

    return res.json({
      success: true,
      message: 'Order placed successfully',
      data: orderWithItems
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process checkout',
      error: error.message
    });
  }
};

export const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let whereClause = {};
    if (userRole === 'customer') {
      whereClause.user_id = userId;
    }

    const orders = await Order.findAll({
      where: whereClause,
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product'
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone_number']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.json({
      success: true,
      message: 'Orders retrieved successfully',
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders',
      error: error.message
    });
  }
};

export const getOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id } = req.params;

    let whereClause = { id };
    if (userRole === 'customer') {
      whereClause.user_id = userId;
    }

    const order = await Order.findOne({
      where: whereClause,
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              include: [
                { model: db.Category, as: 'category' },
                { model: db.Shop, as: 'shop' }
              ]
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone_number']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    return res.json({
      success: true,
      message: 'Order retrieved successfully',
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve order',
      error: error.message
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    if (userRole !== 'admin' && userRole !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only admin and sellers can update order status'
      });
    }

    const { id } = req.params;
    const { status, payment_status } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (status) {
      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }
      order.status = status;
    }

    if (payment_status) {
      const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
      if (!validPaymentStatuses.includes(payment_status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment status'
        });
      }
      order.payment_status = payment_status;
    }

    await order.save();

    // Create notification for customer
    if (order.status === 'delivered') {
      await Notification.create({
        user_id: order.user_id,
        title: 'Order Delivered',
        message: `Your order ${order.order_number} has been delivered.`,
        type: 'order',
        order_id: order.id,
        read: false
      });
    }

    await logAudit({
      action: 'order.update_status',
      actor_user_id: req.user.id,
      target_type: 'order',
      target_id: order.id,
      metadata: { status: order.status, payment_status: order.payment_status },
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const order = await Order.findOne({
      where: {
        id: id,
        user_id: userId
      },
      include: [{ model: OrderItem, as: 'items' }]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}`
      });
    }

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findByPk(item.product_id);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    order.status = 'cancelled';
    await order.save();

    await logAudit({
      action: 'customer.order.cancel',
      actor_user_id: userId,
      target_type: 'order',
      target_id: order.id,
      metadata: { order_number: order.order_number },
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

