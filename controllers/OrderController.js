import db from '../models/index.js';
import { Op } from 'sequelize';
import { logAudit } from '../utils/audit.js';
import { sendNotificationEmail } from '../utils/notificationHelper.js';

const { Order, OrderItem, Cart, Product, User, Notification, Shop, Escrow, Wallet, WalletTransaction, ShippingAddress } = db;

const generateOrderNumber = () => {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${ymd}-${seq}`;
};

/** Format order for API doc response */
const formatOrderForApi = (order) => {
  const items = (order.items || []).map((i) => ({
    id: i.id,
    product_id: i.product_id,
    product_name: i.product_name,
    quantity: i.quantity,
    price: parseFloat(i.price),
    subtotal: parseFloat(i.subtotal)
  }));
  return {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    payment_status: order.payment_status === 'pending' ? 'unpaid' : order.payment_status,
    payment_method: order.payment_method || null,
    subtotal: order.subtotal != null ? parseFloat(order.subtotal) : parseFloat(order.total_amount) || 0,
    shipping_fee: order.shipping_fee != null ? parseFloat(order.shipping_fee) : 0,
    total: parseFloat(order.total_amount) || 0,
    shipping_address_id: order.shipping_address_id || null,
    items,
    created_at: order.createdAt || order.created_at
  };
};

export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      shipping_address_id,
      items: bodyItems,
      payment_method_id,
      payment_method,
      courier_service,
      notes,
      coupon_code
    } = req.body;

    // API doc path: create from items array + shipping_address_id
    if (bodyItems && Array.isArray(bodyItems) && bodyItems.length > 0) {
      if (!shipping_address_id) {
        return res.status(400).json({
          success: false,
          message: 'Shipping address ID is required',
          data: null
        });
      }
      const addr = await ShippingAddress.findOne({
        where: { id: shipping_address_id, user_id: userId }
      });
      if (!addr) {
        return res.status(400).json({
          success: false,
          message: 'Shipping address not found',
          data: null
        });
      }
      let subtotal = 0;
      const orderItems = [];
      let firstShopId = null;
      let sellerId = null;
      let sellerAmount = 0;

      for (const row of bodyItems) {
        const productId = row.product_id;
        const qty = parseInt(row.quantity, 10) || 1;
        if (!productId || qty < 1) continue;
        const product = await Product.findByPk(productId, { include: [{ model: Shop, as: 'shop' }] });
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product not found: ${productId}`,
            data: null
          });
        }
        if (product.stock < qty) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}. Only ${product.stock} available`,
            data: null
          });
        }
        const price = parseFloat(product.price);
        const itemSubtotal = price * qty;
        subtotal += itemSubtotal;
        if (product.shop_id) {
          if (!firstShopId) {
            firstShopId = product.shop_id;
            const seller = await User.findOne({ where: { shop_id: product.shop_id, role: 'seller' } });
            sellerId = seller ? seller.id : null;
          }
          if (product.shop_id === firstShopId) sellerAmount += itemSubtotal;
        }
        orderItems.push({
          product_id: product.id,
          product_name: product.name,
          product_image: product.image,
          quantity: qty,
          price,
          subtotal: itemSubtotal
        });
      }

      if (orderItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid items to order',
          data: null
        });
      }

      const shippingFee = 0;
      const total = subtotal + shippingFee;
      const orderNumber = generateOrderNumber();
      const order = await Order.create({
        user_id: userId,
        order_number: orderNumber,
        status: 'pending',
        payment_status: 'pending',
        payment_method: null,
        subtotal,
        shipping_fee: shippingFee,
        total_amount: total,
        shipping_address_id: addr.id,
        shipping_address: [addr.address, addr.city, addr.region].filter(Boolean).join(', '),
        shipping_city: addr.city,
        shipping_phone: addr.phone,
        seller_id: sellerId,
        escrow_status: 'pending',
        escrow_amount: sellerAmount || total,
        notes: notes || null
      });

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
        const product = await Product.findByPk(item.product_id);
        if (product) {
          product.stock -= item.quantity;
          await product.save();
        }
      }

      const orderWithItems = await Order.findByPk(order.id, { include: [{ model: OrderItem, as: 'items' }] });
      return res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: formatOrderForApi(orderWithItems)
      });
    }

    // Legacy: create from cart
    if (!shipping_address_id) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address ID is required',
        data: null
      });
    }

    const validPaymentMethods = ['cash_on_delivery', 'mobile_money', 'bank_transfer', 'card', 'wallet', 'onekhusa'];
    let paymentMethodValue = payment_method || payment_method_id || 'mobile_money';
    if (payment_method_id && !validPaymentMethods.includes(payment_method_id)) {
      if (payment_method_id.startsWith('pm_')) paymentMethodValue = 'mobile_money';
      else if (validPaymentMethods.includes(payment_method_id)) paymentMethodValue = payment_method_id;
      else paymentMethodValue = 'mobile_money';
    }
    if (!validPaymentMethods.includes(paymentMethodValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`,
        data: null
      });
    }

    let shippingAddress = { address_line: '', city: '', phone: '' };
    const addr = await ShippingAddress.findOne({
      where: { id: shipping_address_id, user_id: userId }
    });
    if (addr) {
      shippingAddress = {
        address_line: addr.address,
        city: addr.city,
        phone: addr.phone
      };
    }

    if (courier_service) {
      // optional when using items flow
    }

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

    const orderNumber = generateOrderNumber();
    const order = await Order.create({
      user_id: userId,
      order_number: orderNumber,
      status: 'pending',
      subtotal: totalAmount,
      shipping_fee: shipping,
      total_amount: finalTotal,
      shipping_address_id: addr ? addr.id : null,
      shipping_address: shippingAddress.address_line || '',
      shipping_city: shippingAddress.city || '',
      shipping_phone: shippingAddress.phone || '',
      payment_method: paymentMethodValue,
      payment_status: 'pending',
      courier_service: courier_service || null,
      seller_id: sellerId,
      escrow_status: 'pending',
      escrow_amount: sellerAmount,
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

    // Create pending wallet transaction for seller (shows in seller's transaction list)
    let sellerWallet = await Wallet.findOne({ where: { user_id: sellerId } });
    if (!sellerWallet) {
      sellerWallet = await Wallet.create({
        user_id: sellerId,
        balance: 0.00,
        currency: 'MWK'
      });
    }

    // Create pending transaction for seller - shows order amount as pending
    await WalletTransaction.create({
      wallet_id: sellerWallet.id,
      user_id: sellerId,
      type: 'credit',
      amount: sellerAmount,
      currency: 'MWK',
      description: `Order ${orderNumber} - Payment pending`,
      reference: `order_${order.id}`,
      status: 'pending', // Will be updated to 'completed' when admin marks as delivered
      balance_after: parseFloat(sellerWallet.balance) // Current balance (no change yet)
    });

    // Get order with items (needed for notifications)
    const orderWithItems = await Order.findByPk(order.id, {
      include: [
        {
          model: OrderItem,
          as: 'items'
        }
      ]
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

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: formatOrderForApi(orderWithItems)
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

    const formatted = orders.map((o) => formatOrderForApi(o));
    return res.json({
      success: true,
      message: 'Orders retrieved',
      data: formatted
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
      message: 'Order retrieved',
      data: formatOrderForApi(order)
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

    // When admin marks order as 'delivered', automatically release escrow to seller wallet
    if (order.status === 'delivered' && order.escrow_status === 'held' && !order.delivery_confirmed_at) {
      // Update order escrow status
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

      // Update the pending/processing transaction to completed
      const pendingTransaction = await WalletTransaction.findOne({
        where: {
          user_id: order.seller_id,
          reference: `order_${order.id}`,
          status: { [Op.in]: ['pending', 'processing'] } // Can be either pending or processing
        }
      });

      if (pendingTransaction) {
        pendingTransaction.status = 'completed';
        pendingTransaction.balance_after = sellerNewBalance;
        pendingTransaction.description = `Payment received for order ${order.order_number}`;
        await pendingTransaction.save();
      } else {
        // If pending transaction not found, create completed one
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
      }

      // Notify seller
      const sellerReleaseNotification = await Notification.create({
        user_id: order.seller_id,
        title: 'Payment Released',
        message: `MWK ${order.escrow_amount} has been released to your wallet for order ${order.order_number}.`,
        type: 'payment',
        order_id: order.id,
        read: false
      });
      sendNotificationEmail(sellerReleaseNotification, order);

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
    }

    // Create notification for customer
    if (order.status === 'delivered') {
      const deliveredNotification = await Notification.create({
        user_id: order.user_id,
        title: 'Order Delivered',
        message: `Your order ${order.order_number} has been delivered. Payment has been released to the seller.`,
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

    // Update seller's pending transaction to "processing" (payment received, held in escrow)
    const pendingTransaction = await WalletTransaction.findOne({
      where: {
        user_id: order.seller_id,
        reference: `order_${order.id}`,
        status: 'pending'
      }
    });

    if (pendingTransaction) {
      pendingTransaction.status = 'processing'; // Changed from pending to processing (held in escrow)
      pendingTransaction.description = `Order ${order.order_number} - Payment received, held in escrow`;
      await pendingTransaction.save();
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

    // API doc: can only cancel orders with status = 'pending'
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}. Only pending orders can be cancelled.`,
        data: null
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

    const orderWithItems = await Order.findByPk(order.id, { include: [{ model: OrderItem, as: 'items' }] });
    return res.json({
      success: true,
      message: 'Order cancelled',
      data: formatOrderForApi(orderWithItems)
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      data: null,
      error: error.message
    });
  }
};

/** Resolve order id from route param (supports :id or :order_id) */
const resolveOrderId = (req) => {
  const raw = req.params.order_id || req.params.id;
  return raw ? String(raw).replace(/^ord_/, '') : null;
};

/** POST /api/orders/:id/pay/wallet — deduct order total from user wallet */
export const payWithWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = resolveOrderId(req);

    const order = await Order.findByPk(id, { include: [{ model: OrderItem, as: 'items' }] });
    if (!order || order.user_id !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        data: null
      });
    }
    if (order.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid',
        data: null
      });
    }

    const total = parseFloat(order.total_amount) || 0;
    let wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0, currency: 'MWK' });
    }
    const balance = parseFloat(wallet.balance) || 0;
    if (balance < total) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
        data: null
      });
    }

    wallet.balance = balance - total;
    await wallet.save();

    order.payment_status = 'paid';
    order.payment_method = 'wallet';
    if (order.escrow_amount != null) order.escrow_status = 'held';
    await order.save();

    await WalletTransaction.create({
      wallet_id: wallet.id,
      user_id: userId,
      type: 'debit',
      amount: total,
      currency: 'MWK',
      description: `Order ${order.order_number}`,
      reference: `order_${order.id}`,
      status: 'completed',
      balance_after: wallet.balance
    });

    const orderWithItems = await Order.findByPk(order.id, { include: [{ model: OrderItem, as: 'items' }] });
    return res.json({
      success: true,
      message: 'Payment successful',
      data: {
        order: formatOrderForApi(orderWithItems),
        wallet_balance: parseFloat(wallet.balance)
      }
    });
  } catch (error) {
    console.error('Pay with wallet error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment failed',
      data: null,
      error: error.message
    });
  }
};

/** POST /api/orders/:id/pay/onekhusa — initiate OneKhusa payment */
export const payWithOnekhusa = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = resolveOrderId(req);

    const order = await Order.findByPk(id);
    if (!order || order.user_id !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        data: null
      });
    }
    if (order.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid',
        data: null
      });
    }

    const amount = parseFloat(order.total_amount) || 0;
    const transactionId = `TXN-${Date.now()}-${order.id}`;
    const baseUrl = process.env.ONEKHUSA_BASE_URL || 'https://api.onekhusa.com';
    const paymentUrl = `${baseUrl}/pay?ref=ORDER-${order.id}&amount=${amount}&txn=${transactionId}`;

    return res.json({
      success: true,
      message: 'Payment initiated',
      data: {
        payment_url: paymentUrl,
        transaction_id: transactionId,
        amount
      }
    });
  } catch (error) {
    console.error('Pay with OneKhusa error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment initiation failed',
      data: null,
      error: error.message
    });
  }
};

