import db from '../models/index.js';
import moment from 'moment';

const { Notification } = db;

export const index = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1; // Fallback to 1 if no auth middleware

    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [['id', 'DESC']]
    });

    const notificationsWithTime = notifications.map(notification => {
      const n = notification.toJSON ? notification.toJSON() : notification;
      return {
        id: n.id,
        title: n.title,
        body: n.message,
        type: n.type,
        is_read: !!n.read,
        time_ago: moment(n.createdAt || n.created_at || new Date()).fromNow(),
        created_at: n.createdAt || n.created_at
      };
    });

    return res.json({
      success: true,
      message: 'Notifications retrieved',
      data: notificationsWithTime
    });
  } catch (error) {
    console.error('Notifications index error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      data: null,
      error: error.message
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.notification_id || req.params.id;
    const userId = req.user ? req.user.id : 1;

    const notification = await Notification.findOne({
      where: { id: notificationId, user_id: userId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
        data: null
      });
    }

    notification.read = true;
    await notification.save();

    const unreadCount = await Notification.count({
      where: { user_id: userId, read: false }
    });

    return res.json({
      success: true,
      message: 'Notification marked as read',
      data: null
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1;

    await Notification.update(
      { read: true },
      { where: { user_id: userId } }
    );

    const unreadCount = await Notification.count({
      where: { user_id: userId, read: false }
    });

    return res.json({
      success: true,
      message: 'All notifications marked as read',
      data: null
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      data: null,
      error: error.message
    });
  }
};

export const destroy = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : 1;

    const notification = await Notification.findOne({
      where: { id, user_id: userId }
    });

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Not found'
      });
    }

    await notification.destroy({ force: true });

    return res.json({
      status: 'success',
      message: 'Deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      data: null,
      error: error.message
    });
  }
};

export const unreadCount = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1;

    const count = await Notification.count({
      where: {
        user_id: userId,
        read: false
      }
    });

    return res.json({
      success: true,
      message: 'Unread count retrieved',
      data: { count }
    });
  } catch (error) {
    console.error('Unread count error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
};

export const registerDevice = async (req, res) => {
  try {
    const userId = req.user.id;
    const { device_token, platform } = req.body;
    
    if (!device_token || !platform) {
      return res.status(400).json({
        success: false,
        message: 'Device token and platform are required'
      });
    }
    
    // TODO: Store device token in database for push notifications
    
    return res.json({
      success: true,
      message: 'Device registered for notifications',
      data: null
    });
  } catch (error) {
    console.error('Register device error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register device',
      error: error.message
    });
  }
};

