import db from '../models/index.js';
import { logAudit } from '../utils/audit.js';
import { sendNotificationEmail } from '../utils/notificationHelper.js';

const { Order, OrderItem, Cart, Product, User, Notification, Shop, Escrow, Wallet, WalletTransaction } = db;

const generateOrderNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TH-${year}-${random}`;
};

export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      shipping_address_id,
      payment_method_id,
      payment_method,
      courier_service,
      notes,
      coupon_code
    } = req.body;

    if (!shipping_address_id) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address ID is required'
      });
    }

    if (!courier_service) {
      return res.status(400).json({
        success: false,
        message: 'Courier service is required'
      });
    }

    // Validate payment method - must be one of the ENUM values
    const validPaymentMethods = ['cash_on_delivery', 'mobile_money', 'bank_transfer', 'card'];
    let paymentMethodValue = payment_method || payment_method_id || 'mobile_money';
    
    // If payment_method_id is provided but it's not a valid ENUM value, try to extract or default
    if (payment_method_id && !validPaymentMethods.includes(payment_method_id)) {
      // If it's an ID like "pm_123", use default. Otherwise, use the provided value if it's valid
      if (payment_method_id.startsWith('pm_')) {
        paymentMethodValue = 'mobile_money'; // Default for payment method IDs
      } else if (validPaymentMethods.includes(payment_method_id)) {
        paymentMethodValue = payment_method_id;
      } else {
        paymentMethodValue = 'mobile_money'; // Default fallback
      }
    }
    
    if (!validPaymentMethods.includes(paymentMethodValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`
      });
    }

    // TODO: Fetch shipping address from addresses table
    // For now, we'll use a placeholder
    const shippingAddress = {
      address_line: 'Address from DB',
      city: 'City from DB',
      phone: 'Phone from DB'
    };

    // Get cart items with products and shops
    const cartItems = await Cart.findAll({
      where: { user_id: userId },
      include: [{ 
        model: Product, 
        as: 'product',
        include: [{ model: Shop, as: 'shop' }]
      }]
    });

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Validate stock, calculate total, and determine seller
    let totalAmount = 0;
    const orderItems = [];
    const sellerMap = new Map(); // Track sellers and their amounts

    for (const cartItem of cartItems) {
      const product = cartItem.product;

      if (!product.shop_id) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} does not have an associated shop`
        });
      }

      if (product.stock < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Only ${product.stock} available`
        });
      }

      const itemPrice = parseFloat(product.price);
      const subtotal = itemPrice * cartItem.quantity;
      totalAmount += subtotal;

      // Track seller amounts (for multi-seller orders, we'll use the first seller)
      if (!sellerMap.has(product.shop_id)) {
        sellerMap.set(product.shop_id, 0);
      }
      sellerMap.set(product.shop_id, sellerMap.get(product.shop_id) + subtotal);

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_image: product.image,
        quantity: cartItem.quantity,
        price: itemPrice,
        subtotal: subtotal
      });
    }

    // Get the primary seller (first shop in the order)
    // For simplicity, we'll use the first seller. In a multi-seller scenario,
    // you might want to create separate orders or use a different approach
    const firstShopId = Array.from(sellerMap.keys())[0];
    
    // Find seller user associated with this shop
    const seller = await User.findOne({
      where: { 
        shop_id: firstShopId,
        role: 'seller'
      }
    });

    if (!seller) {
      return res.status(400).json({
        success: false,
        message: 'No seller found for the products in your cart'
      });
    }

    const sellerId = seller.id;
    const sellerAmount = sellerMap.get(firstShopId);

    // Calculate shipping (placeholder - should be calculated based on address)
    const shipping = 5000; // MWK
    const discount = 0; // TODO: Calculate from coupon_code
    const tax = 0;
    const finalTotal = totalAmount + shipping - discount + tax;

    // Create order with escrow fields
    const orderNumber = generateOrderNumber();
    const order = await Order.create({
      user_id: userId,
      order_number: orderNumber,
      status: 'pending',
      total_amount: finalTotal,
      shipping_address: shippingAddress.address_line,
      shipping_city: shippingAddress.city,
      shipping_phone: shippingAddress.phone,
      payment_method: paymentMethodValue,
      payment_status: 'pending',
      courier_service: courier_service,
      seller_id: sellerId,
      escrow_status: 'pending',
      escrow_amount: sellerAmount, // Amount to be held for seller
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

    // Create notifications
    // Customer notification
    const customerNotification = await Notification.create({
      user_id: userId,
      title: 'Order Placed',
      message: `Your order ${orderNumber} has been placed successfully. Shipping details have been shared with ${courier_service}.`,
      type: 'order',
      order_id: order.id,
      read: false
    });
    // Send email to customer
    sendNotificationEmail(customerNotification, orderWithItems);

    // Seller notification - only if seller is different from customer
    if (sellerId !== userId) {
      const sellerNotification = await Notification.create({
        user_id: sellerId,
        title: 'New Order Received',
        message: `New order ${orderNumber} has been placed for your products. Total: MWK ${finalTotal}. Customer: ${shippingAddress.address_line}, ${shippingAddress.city}. Courier: ${courier_service}`,
        type: 'order',
        order_id: order.id,
        read: false
      });
      // Send email to seller
      sendNotificationEmail(sellerNotification, orderWithItems);
    }

    // Notify admin about new order
    const adminUsers = await User.findAll({ where: { role: 'admin' } });
    for (const admin of adminUsers) {
      const adminNotification = await Notification.create({
        user_id: admin.id,
        title: 'New Order Received',
        message: `New order ${orderNumber} has been placed. Shipping address: ${shippingAddress.address_line}, ${shippingAddress.city}. Courier: ${courier_service}`,
        type: 'order',
        order_id: order.id,
        read: false
      });
      // Send email to admin
      sendNotificationEmail(adminNotification, orderWithItems);
    }

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

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        order_id: `ord_${order.id}`,
        order_number: orderNumber,
        status: 'pending',
        total: finalTotal,
        currency: 'MWK',
        payment_url: `https://payment.techaven.mw/pay/ord_${order.id}`,
        created_at: order.createdAt || order.created_at || new Date()
      }
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
        },
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'name', 'email', 'phone_number'],
          required: false
        },
        {
          model: Escrow,
          as: 'escrows',
          required: false
        }
      ],
      order: [['id', 'DESC']]
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
    const { order_id } = req.params;
    const id = order_id.replace('ord_', '');

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
        },
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'name', 'email', 'phone_number'],
          required: false
        },
        {
          model: Escrow,
          as: 'escrows',
          required: false
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

    // Handle both :id and :order_id route parameters
    const orderId = req.params.id || req.params.order_id;
    const id = orderId?.toString().startsWith('ord_') 
      ? orderId.replace('ord_', '') 
      : orderId;
    
    const { status, payment_status, courier_tracking_number } = req.body;

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

    if (courier_tracking_number) {
      order.courier_tracking_number = courier_tracking_number;
    }

    await order.save();

    // Create notification for customer
    if (order.status === 'delivered') {
      const deliveredNotification = await Notification.create({
        user_id: order.user_id,
        title: 'Order Delivered',
        message: `Your order ${order.order_number} has been delivered. Please confirm delivery to release payment to the seller.`,
        type: 'order',
        order_id: order.id,
        read: false
      });
      sendNotificationEmail(deliveredNotification, order);
    } else if (order.status === 'shipped' && courier_tracking_number) {
      const shippedNotification = await Notification.create({
        user_id: order.user_id,
        title: 'Order Shipped',
        message: `Your order ${order.order_number} has been shipped. Tracking number: ${courier_tracking_number}`,
        type: 'order',
        order_id: order.id,
        read: false
      });
      sendNotificationEmail(shippedNotification, order);
    }

    await logAudit({
      action: 'order.update_status',
      actor_user_id: req.user.id,
      target_type: 'order',
      target_id: order.id,
      metadata: { 
        status: order.status, 
        payment_status: order.payment_status,
        courier_tracking_number: order.courier_tracking_number
      },
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

// Payment completion endpoint - holds funds in escrow
export const completePayment = async (req, res) => {
  try {
    const { order_id } = req.params;
    const { payment_reference, payment_proof } = req.body;
    const id = order_id.replace('ord_', '');

    const order = await Order.findByPk(id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid'
      });
    }

    // Update payment status
    order.payment_status = 'paid';
    order.escrow_status = 'held';
    await order.save();

    // Create escrow record
    const escrow = await Escrow.create({
      order_id: order.id,
      seller_id: order.seller_id,
      amount: order.escrow_amount,
      currency: 'MWK',
      status: 'held',
      held_at: new Date()
    });

    // Get or create admin wallet (for holding escrow funds)
    // In a real system, you might have a dedicated escrow account
    const adminUsersForWallet = await User.findAll({ where: { role: 'admin' }, limit: 1 });
    if (adminUsersForWallet.length > 0) {
      let adminWallet = await Wallet.findOne({ where: { user_id: adminUsersForWallet[0].id } });
      if (!adminWallet) {
        adminWallet = await Wallet.create({
          user_id: adminUsersForWallet[0].id,
          balance: 0.00,
          currency: 'MWK'
        });
      }

      // Add funds to admin wallet (escrow account)
      const newBalance = parseFloat(adminWallet.balance) + parseFloat(order.escrow_amount);
      adminWallet.balance = newBalance;
      await adminWallet.save();

      // Create transaction record
      await WalletTransaction.create({
        wallet_id: adminWallet.id,
        user_id: adminUsersForWallet[0].id,
        type: 'credit',
        amount: order.escrow_amount,
        currency: 'MWK',
        description: `Escrow hold for order ${order.order_number}`,
        reference: payment_reference || `escrow_${order.id}`,
        status: 'completed',
        balance_after: newBalance
      });
    }

    // Notify customer
    const customerPaymentNotification = await Notification.create({
      user_id: order.user_id,
      title: 'Payment Received',
      message: `Payment for order ${order.order_number} has been received. Funds are held in escrow until delivery confirmation.`,
      type: 'payment',
      order_id: order.id,
      read: false
    });
    sendNotificationEmail(customerPaymentNotification, order);

    // Notify admin
    const adminUsers = await User.findAll({ where: { role: 'admin' } });
    for (const admin of adminUsers) {
      const adminPaymentNotification = await Notification.create({
        user_id: admin.id,
        title: 'Payment Received for Order',
        message: `Payment of MWK ${order.total_amount} received for order ${order.order_number}. Funds held in escrow.`,
        type: 'payment',
        order_id: order.id,
        read: false
      });
      sendNotificationEmail(adminPaymentNotification, order);
    }

    // Notify seller
    if (order.seller) {
      const sellerPaymentNotification = await Notification.create({
        user_id: order.seller_id,
        title: 'Order Payment Received',
        message: `Payment of MWK ${order.escrow_amount} received for order ${order.order_number}. Funds are held in escrow and will be released after delivery confirmation.`,
        type: 'payment',
        order_id: order.id,
        read: false
      });
      sendNotificationEmail(sellerPaymentNotification, order);
    }

    await logAudit({
      action: 'order.payment.complete',
      actor_user_id: req.user?.id || null,
      target_type: 'order',
      target_id: order.id,
      metadata: { 
        order_number: order.order_number, 
        amount: order.total_amount,
        escrow_amount: order.escrow_amount,
        payment_reference
      },
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'Payment completed successfully. Funds held in escrow.',
      data: {
        order_id: `ord_${order.id}`,
        order_number: order.order_number,
        payment_status: 'paid',
        escrow_status: 'held',
        escrow_amount: order.escrow_amount,
        escrow_id: escrow.id
      }
    });
  } catch (error) {
    console.error('Complete payment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete payment',
      error: error.message
    });
  }
};

// Delivery confirmation endpoint - releases escrow funds to seller
export const confirmDelivery = async (req, res) => {
  try {
    const userId = req.user.id;
    const { order_id } = req.params;
    const id = order_id.replace('ord_', '');

    const order = await Order.findOne({
      where: {
        id: id,
        user_id: userId
      },
      include: [
        { model: User, as: 'seller', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Order must be marked as delivered before confirming delivery'
      });
    }

    if (order.delivery_confirmed_at) {
      return res.status(400).json({
        success: false,
        message: 'Delivery already confirmed'
      });
    }

    if (order.escrow_status !== 'held') {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm delivery. Escrow status is: ${order.escrow_status}`
      });
    }

    // Update order
    order.delivery_confirmed_at = new Date();
    order.escrow_status = 'released';
    order.funds_released_at = new Date();
    await order.save();

    // Update escrow record
    const escrow = await Escrow.findOne({ where: { order_id: order.id } });
    if (escrow) {
      escrow.status = 'released';
      escrow.released_at = new Date();
      await escrow.save();
    }

    // Get or create seller wallet
    let sellerWallet = await Wallet.findOne({ where: { user_id: order.seller_id } });
    if (!sellerWallet) {
      sellerWallet = await Wallet.create({
        user_id: order.seller_id,
        balance: 0.00,
        currency: 'MWK'
      });
    }

    // Transfer funds from admin escrow to seller
    const adminUsersForWallet = await User.findAll({ where: { role: 'admin' }, limit: 1 });
    if (adminUsersForWallet.length > 0) {
      const adminWallet = await Wallet.findOne({ where: { user_id: adminUsersForWallet[0].id } });
      if (adminWallet) {
        // Deduct from admin wallet
        const adminNewBalance = parseFloat(adminWallet.balance) - parseFloat(order.escrow_amount);
        adminWallet.balance = adminNewBalance;
        await adminWallet.save();

        // Create debit transaction for admin
        await WalletTransaction.create({
          wallet_id: adminWallet.id,
          user_id: adminUsersForWallet[0].id,
          type: 'debit',
          amount: order.escrow_amount,
          currency: 'MWK',
          description: `Escrow release for order ${order.order_number} to seller`,
          reference: `escrow_release_${order.id}`,
          status: 'completed',
          balance_after: adminNewBalance
        });
      }
    }

    // Add to seller wallet
    const sellerNewBalance = parseFloat(sellerWallet.balance) + parseFloat(order.escrow_amount);
    sellerWallet.balance = sellerNewBalance;
    await sellerWallet.save();

    // Create credit transaction for seller
    await WalletTransaction.create({
      wallet_id: sellerWallet.id,
      user_id: order.seller_id,
      type: 'credit',
      amount: order.escrow_amount,
      currency: 'MWK',
      description: `Payment received for order ${order.order_number}`,
      reference: `order_payment_${order.id}`,
      status: 'completed',
      balance_after: sellerNewBalance
    });

    // Notify customer
    const customerDeliveryNotification = await Notification.create({
      user_id: order.user_id,
      title: 'Delivery Confirmed',
      message: `Thank you for confirming delivery of order ${order.order_number}. Payment has been released to the seller.`,
      type: 'order',
      order_id: order.id,
      read: false
    });
    sendNotificationEmail(customerDeliveryNotification, order);

    // Notify seller
    if (order.seller) {
      const sellerReleaseNotification = await Notification.create({
        user_id: order.seller_id,
        title: 'Payment Released',
        message: `MWK ${order.escrow_amount} has been released to your wallet for order ${order.order_number}.`,
        type: 'payment',
        order_id: order.id,
        read: false
      });
      sendNotificationEmail(sellerReleaseNotification, order);
    }

    // Notify admin
    const allAdminUsers = await User.findAll({ where: { role: 'admin' } });
    for (const admin of allAdminUsers) {
      const adminReleaseNotification = await Notification.create({
        user_id: admin.id,
        title: 'Escrow Released',
        message: `Escrow funds of MWK ${order.escrow_amount} have been released to seller for order ${order.order_number}.`,
        type: 'payment',
        order_id: order.id,
        read: false
      });
      sendNotificationEmail(adminReleaseNotification, order);
    }

    await logAudit({
      action: 'order.delivery.confirm',
      actor_user_id: userId,
      target_type: 'order',
      target_id: order.id,
      metadata: { 
        order_number: order.order_number, 
        escrow_amount: order.escrow_amount,
        seller_id: order.seller_id
      },
      ip_address: req.ip
    });

    return res.json({
      success: true,
      message: 'Delivery confirmed. Funds released to seller.',
      data: {
        order_id: `ord_${order.id}`,
        order_number: order.order_number,
        escrow_status: 'released',
        amount_released: order.escrow_amount,
        released_at: order.funds_released_at
      }
    });
  } catch (error) {
    console.error('Confirm delivery error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to confirm delivery',
      error: error.message
    });
  }
};

// Admin: Get all orders with full details including courier and escrow info
export const getAllOrdersAdmin = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can access all orders'
      });
    }

    const orders = await Order.findAll({
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              include: [
                { model: db.Shop, as: 'shop' }
              ]
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone_number']
        },
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'name', 'email', 'phone_number'],
          required: false
        },
        {
          model: Escrow,
          as: 'escrows',
          required: false
        }
      ],
      order: [['id', 'DESC']]
    });

    return res.json({
      success: true,
      message: 'All orders retrieved successfully',
      data: orders
    });
  } catch (error) {
    console.error('Get all orders admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders',
      error: error.message
    });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { order_id } = req.params;
    const { reason } = req.body;
    const id = order_id.replace('ord_', '');

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
      data: {
        order_id: `ord_${order.id}`,
        status: 'cancelled',
        refund_status: 'processing'
      }
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

