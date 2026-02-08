import {
  sendOrderNotificationEmail,
  sendPaymentNotificationEmail,
  sendSellerNotificationEmail,
  sendAdminNotificationEmail
} from '../services/emailService.js';
import db from '../models/index.js';

const { User, Order } = db;

/**
 * Helper function to send email when notification is created
 */
export const sendNotificationEmail = async (notification, orderData = null) => {
  try {
    // Get user to send email
    const user = await User.findByPk(notification.user_id);
    if (!user || !user.email) {
      return; // No email to send to
    }

    // Get order data if not provided
    let order = orderData;
    if (!order && notification.order_id) {
      order = await Order.findByPk(notification.order_id, {
        include: [
          { model: db.User, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: db.User, as: 'seller', attributes: ['id', 'name', 'email'] },
          { model: OrderItem, as: 'items', required: false }
        ]
      });
    }

    const notificationData = {
      ...notification.toJSON ? notification.toJSON() : notification,
      order: order ? (order.toJSON ? order.toJSON() : order) : null
    };

    // Determine recipient type and send appropriate email
    const userRole = user.role;
    const title = notificationData.title;

    if (userRole === 'seller') {
      // Seller notifications
      if (title === 'New Order Received' || title === 'Order Payment Received' || title === 'Payment Released') {
        await sendSellerNotificationEmail(user.email, notificationData);
      } else if (title.includes('Payment')) {
        await sendPaymentNotificationEmail(user.email, notificationData, 'seller');
      }
    } else if (userRole === 'admin') {
      // Admin notifications
      await sendAdminNotificationEmail(user.email, notificationData);
    } else {
      // Customer notifications
      if (title === 'Order Placed' || title === 'Order Shipped' || title === 'Order Delivered' || title === 'Delivery Confirmed') {
        await sendOrderNotificationEmail(user.email, notificationData);
      } else if (title.includes('Payment')) {
        await sendPaymentNotificationEmail(user.email, notificationData, 'customer');
      }
    }
  } catch (error) {
    console.error('Failed to send notification email:', error);
    // Don't throw - email failure shouldn't break the notification creation
  }
};

