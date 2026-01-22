import db from '../models/index.js';
import moment from 'moment';

const { Notification } = db;

export const index = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1; // Fallback to 1 if no auth middleware

    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });

    const notificationsWithTime = notifications.map(notification => {
      const notificationData = notification.toJSON();
      notificationData.time = moment(notification.created_at).fromNow();
      return notificationData;
    });

    return res.json({
      status: 'success',
      data: notificationsWithTime
    });
  } catch (error) {
    console.error('Notifications index error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

export const markAsRead = async (req, res) => {
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

    notification.read = true;
    await notification.save();

    return res.json({
      status: 'success',
      message: 'Marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({
      status: 'error',
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

    return res.json({
      status: 'success',
      message: 'All marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to mark all notifications as read',
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
      status: 'error',
      message: 'Failed to delete notification',
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
      status: 'success',
      data: { count }
    });
  } catch (error) {
    console.error('Unread count error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get unread count',
      error: error.message
    });
  }
};

