import db from '../models/index.js';
import moment from 'moment';
import { Op } from 'sequelize';

const { Notification, Order, User, Shop, Category, Escrow } = db;

/**
 * Get admin notifications with advanced filtering
 */
export const getAdminNotifications = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access this endpoint'
      });
    }

    const {
      category,
      type,
      read,
      priority,
      page = 1,
      limit = 20,
      start_date,
      end_date
    } = req.query;

    // Build where clause
    const whereClause = {};

    // Admin notifications are for admin users
    const adminUsers = await User.findAll({ where: { role: 'admin' } });
    const adminUserIds = adminUsers.map(admin => admin.id);
    whereClause.user_id = { [Op.in]: adminUserIds };

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
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'phone_number'],
              required: false
            },
            {
              model: User,
              as: 'seller',
              attributes: ['id', 'name', 'email'],
              required: false
            },
            {
              model: Escrow,
              as: 'escrows',
              required: false
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role'],
          required: false
        }
      ],
      order: priority === 'high'
        ? [['read', 'ASC'], ['created_at', 'DESC']]
        : [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // Format notifications
    const formattedNotifications = notifications.rows.map(notification => {
      const data = notification.toJSON();
      data.time_ago = moment(data.created_at).fromNow();
      data.is_urgent = ['payment', 'order', 'system_alert'].includes(data.type) && !data.read;
      
      // Categorize notifications
      if (data.type === 'order' || data.type === 'payment') {
        data.category = 'orders';
      } else if (data.type === 'shop') {
        data.category = 'shops';
      } else if (data.type === 'category') {
        data.category = 'categories';
      } else {
        data.category = 'system';
      }

      // Add order summary if available
      if (data.order) {
        data.order_summary = {
          order_number: data.order.order_number,
          total_amount: data.order.total_amount,
          status: data.order.status,
          escrow_status: data.order.escrow_status,
          customer_name: data.order.user?.name,
          seller_name: data.order.seller?.name
        };
      }

      return data;
    });

    // Filter by category if provided
    let filteredNotifications = formattedNotifications;
    if (category) {
      filteredNotifications = formattedNotifications.filter(n => n.category === category);
    }

    return res.json({
      success: true,
      message: 'Admin notifications retrieved successfully',
      data: {
        notifications: filteredNotifications,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: notifications.count,
          total_pages: Math.ceil(notifications.count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get admin notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin notifications',
      error: error.message
    });
  }
};

/**
 * Get admin notification statistics dashboard
 */
export const getAdminNotificationStats = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access this endpoint'
      });
    }

    const adminUsers = await User.findAll({ where: { role: 'admin' } });
    const adminUserIds = adminUsers.map(admin => admin.id);

    const stats = {
      total: await Notification.count({ where: { user_id: { [Op.in]: adminUserIds } } }),
      unread: await Notification.count({
        where: {
          user_id: { [Op.in]: adminUserIds },
          read: false
        }
      }),
      by_type: {
        order: await Notification.count({
          where: { user_id: { [Op.in]: adminUserIds }, type: 'order' }
        }),
        payment: await Notification.count({
          where: { user_id: { [Op.in]: adminUserIds }, type: 'payment' }
        }),
        shop: await Notification.count({
          where: { user_id: { [Op.in]: adminUserIds }, type: 'shop' }
        }),
        category: await Notification.count({
          where: { user_id: { [Op.in]: adminUserIds }, type: 'category' }
        }),
        system: await Notification.count({
          where: { user_id: { [Op.in]: adminUserIds }, type: 'system' }
        })
      },
      by_category: {
        orders: await Notification.count({
          where: {
            user_id: { [Op.in]: adminUserIds },
            type: { [Op.in]: ['order', 'payment'] }
          }
        }),
        shops: await Notification.count({
          where: {
            user_id: { [Op.in]: adminUserIds },
            type: 'shop'
          }
        }),
        categories: await Notification.count({
          where: {
            user_id: { [Op.in]: adminUserIds },
            type: 'category'
          }
        }),
        system: await Notification.count({
          where: {
            user_id: { [Op.in]: adminUserIds },
            type: 'system'
          }
        })
      },
      urgent: await Notification.count({
        where: {
          user_id: { [Op.in]: adminUserIds },
          read: false,
          type: { [Op.in]: ['payment', 'order', 'system_alert'] }
        }
      }),
      today: await Notification.count({
        where: {
          user_id: { [Op.in]: adminUserIds },
          created_at: {
            [Op.gte]: moment().startOf('day').toDate()
          }
        }
      }),
      pending_actions: {
        pending_orders: await Order.count({ where: { status: 'pending' } }),
        pending_categories: await Category.count({ where: { status: 'pending' } }),
        held_escrows: await Escrow.count({ where: { status: 'held' } })
      }
    };

    return res.json({
      success: true,
      message: 'Admin notification statistics retrieved',
      data: stats
    });
  } catch (error) {
    console.error('Get admin notification stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification statistics',
      error: error.message
    });
  }
};

/**
 * Get admin notifications by category
 */
export const getAdminNotificationsByCategory = async (req, res) => {
  try {
    const userRole = req.user.role;
    const { category } = req.params;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access this endpoint'
      });
    }

    const validCategories = ['orders', 'shops', 'categories', 'system'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      });
    }

    const adminUsers = await User.findAll({ where: { role: 'admin' } });
    const adminUserIds = adminUsers.map(admin => admin.id);

    let typeFilter = [];
    switch (category) {
      case 'orders':
        typeFilter = ['order', 'payment'];
        break;
      case 'shops':
        typeFilter = ['shop'];
        break;
      case 'categories':
        typeFilter = ['category'];
        break;
      case 'system':
        typeFilter = ['system', 'system_alert'];
        break;
    }

    const notifications = await Notification.findAll({
      where: {
        user_id: { [Op.in]: adminUserIds },
        type: { [Op.in]: typeFilter },
        read: false
      },
      include: [
        {
          model: Order,
          as: 'order',
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email'],
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
      message: `${category} notifications retrieved`,
      data: formatted
    });
  } catch (error) {
    console.error('Get admin notifications by category error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications by category',
      error: error.message
    });
  }
};

/**
 * Get urgent/admin priority notifications
 */
export const getUrgentNotifications = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access this endpoint'
      });
    }

    const adminUsers = await User.findAll({ where: { role: 'admin' } });
    const adminUserIds = adminUsers.map(admin => admin.id);

    const notifications = await Notification.findAll({
      where: {
        user_id: { [Op.in]: adminUserIds },
        read: false,
        type: { [Op.in]: ['payment', 'order', 'system_alert'] }
      },
      include: [
        {
          model: Order,
          as: 'order',
          required: false,
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
      limit: 20
    });

    const formatted = notifications.map(notif => {
      const data = notif.toJSON();
      data.time_ago = moment(data.created_at).fromNow();
      data.priority = 'high';
      return data;
    });

    return res.json({
      success: true,
      message: 'Urgent notifications retrieved',
      data: formatted
    });
  } catch (error) {
    console.error('Get urgent notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve urgent notifications',
      error: error.message
    });
  }
};

