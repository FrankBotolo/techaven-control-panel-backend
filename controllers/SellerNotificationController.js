import db from '../models/index.js';
import moment from 'moment';
import { Op } from 'sequelize';

const { Notification, Order, OrderItem, Product, User, Shop, Escrow } = db;

/**
 * Get seller notifications with advanced filtering
 */
export const getSellerNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can access this endpoint'
      });
    }

    const {
      type,
      read,
      page = 1,
      limit = 20,
      start_date,
      end_date,
      priority
    } = req.query;

    // Get seller's shop
    const seller = await User.findByPk(userId, {
      include: [{ model: Shop, as: 'shop' }]
    });

    if (!seller || !seller.shop_id) {
      return res.status(404).json({
        success: false,
        message: 'Seller shop not found'
      });
    }

    // Build where clause - sellers should only see seller-relevant notifications
    // Exclude customer-facing notifications (like "Order Delivered", "Delivery Confirmed", "Order Placed")
    const whereClause = { 
      user_id: userId,
      // Exclude customer-facing notification titles
      title: { 
        [Op.notIn]: [
          'Order Delivered',
          'Delivery Confirmed',
          'Order Shipped',
          'Order Placed'
        ]
      }
    };

    // If type is specified, use it
    if (type) {
      whereClause.type = type;
    }

    if (read !== undefined) {
      whereClause.read = read === 'true';
    }

    if (start_date || end_date) {
      whereClause.created_at = {};
      if (start_date) {
        whereClause.created_at[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        whereClause.created_at[Op.lte] = new Date(end_date);
      }
    }

    // Get notifications
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const notifications = await Notification.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Order,
          as: 'order',
          required: false,
          include: [
            {
              model: OrderItem,
              as: 'items',
              required: false,
              include: [
                {
                  model: Product,
                  as: 'product',
                  where: { shop_id: seller.shop_id },
                  required: false
                }
              ]
            },
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'phone_number'],
              required: false
            },
            {
              model: Escrow,
              as: 'escrows',
              required: false
            }
          ]
        }
      ],
      order: priority === 'high' 
        ? [['read', 'ASC'], ['created_at', 'DESC']]
        : [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // Format notifications with additional data
    const formattedNotifications = notifications.rows.map(notification => {
      const data = notification.toJSON();
      data.time_ago = moment(data.created_at).fromNow();
      data.is_urgent = data.type === 'payment' || data.type === 'order' && !data.read;
      
      // Add order summary if available
      if (data.order) {
        data.order_summary = {
          order_number: data.order.order_number,
          total_amount: data.order.total_amount,
          status: data.order.status,
          escrow_status: data.order.escrow_status,
          escrow_amount: data.order.escrow_amount,
          customer_name: data.order.user?.name
        };
      }

      return data;
    });

    return res.json({
      success: true,
      message: 'Seller notifications retrieved successfully',
      data: {
        notifications: formattedNotifications,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: notifications.count,
          total_pages: Math.ceil(notifications.count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get seller notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve seller notifications',
      error: error.message
    });
  }
};

/**
 * Get seller notification statistics
 */
export const getSellerNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can access this endpoint'
      });
    }

    const stats = {
      total: await Notification.count({ where: { user_id: userId } }),
      unread: await Notification.count({ where: { user_id: userId, read: false } }),
      by_type: {
        order: await Notification.count({ where: { user_id: userId, type: 'order' } }),
        payment: await Notification.count({ where: { user_id: userId, type: 'payment' } }),
        product: await Notification.count({ where: { user_id: userId, type: 'product' } }),
        review: await Notification.count({ where: { user_id: userId, type: 'review' } }),
        system: await Notification.count({ where: { user_id: userId, type: 'system' } })
      },
      urgent: await Notification.count({
        where: {
          user_id: userId,
          read: false,
          type: { [Op.in]: ['payment', 'order'] }
        }
      }),
      today: await Notification.count({
        where: {
          user_id: userId,
          created_at: {
            [Op.gte]: moment().startOf('day').toDate()
          }
        }
      })
    };

    return res.json({
      success: true,
      message: 'Seller notification statistics retrieved',
      data: stats
    });
  } catch (error) {
    console.error('Get seller notification stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification statistics',
      error: error.message
    });
  }
};

/**
 * Get seller's order-related notifications
 */
export const getSellerOrderNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can access this endpoint'
      });
    }

    const notifications = await Notification.findAll({
      where: {
        user_id: userId,
        type: 'order',
        read: false
      },
      include: [
        {
          model: Order,
          as: 'order',
          required: true,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'phone_number']
            },
            {
              model: Escrow,
              as: 'escrows',
              required: false
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 50
    });

    const formatted = notifications.map(notif => {
      const data = notif.toJSON();
      data.time_ago = moment(data.created_at).fromNow();
      return data;
    });

    return res.json({
      success: true,
      message: 'Order notifications retrieved',
      data: formatted
    });
  } catch (error) {
    console.error('Get seller order notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve order notifications',
      error: error.message
    });
  }
};

/**
 * Get seller's payment notifications (escrow related)
 */
export const getSellerPaymentNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can access this endpoint'
      });
    }

    const notifications = await Notification.findAll({
      where: {
        user_id: userId,
        type: 'payment'
      },
      include: [
        {
          model: Order,
          as: 'order',
          required: true,
          include: [
            {
              model: Escrow,
              as: 'escrows',
              required: false
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 50
    });

    const formatted = notifications.map(notif => {
      const data = notif.toJSON();
      data.time_ago = moment(data.created_at).fromNow();
      data.escrow_info = data.order?.escrows?.[0] || null;
      return data;
    });

    return res.json({
      success: true,
      message: 'Payment notifications retrieved',
      data: formatted
    });
  } catch (error) {
    console.error('Get seller payment notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment notifications',
      error: error.message
    });
  }
};

