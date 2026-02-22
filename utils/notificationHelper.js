import {
  sendOrderNotificationEmail,
  sendPaymentNotificationEmail,
  sendSellerNotificationEmail,
  sendAdminNotificationEmail
} from '../services/emailService.js';
import { sendNotificationSms } from '../services/smsService.js';
import db from '../models/index.js';

const { User, Order, OrderItem } = db;

/**
 * Helper function to send email when notification is created
 */
export const sendNotificationEmail = async (notification, orderData = null) => {
  try {
    // Get user to send email and/or SMS
    const user = await User.findByPk(notification.user_id);
    if (!user) return;

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

    const userRole = user.role;
    const title = notificationData.title;
    const orderNumber = notificationData.order?.order_number || '';

    // Send email when user has email
    if (user.email) {
      if (userRole === 'seller') {
        if (title === 'New Order Received' || title === 'Order Payment Received' || title === 'Payment Released') {
          await sendSellerNotificationEmail(user.email, notificationData);
        } else if (title.includes('Payment')) {
          await sendPaymentNotificationEmail(user.email, notificationData, 'seller');
        }
      } else if (userRole === 'admin') {
        await sendAdminNotificationEmail(user.email, notificationData);
      } else {
        if (title === 'Order Placed' || title === 'Order Shipped' || title === 'Order Delivered' || title === 'Delivery Confirmed') {
          await sendOrderNotificationEmail(user.email, notificationData);
        } else if (title.includes('Payment')) {
          await sendPaymentNotificationEmail(user.email, notificationData, 'customer');
        }
      }
    }

    // Send SMS when user has phone number (same notification types)
    if (user.phone_number) {
      const smsTitles = [
        'Order Placed', 'Order Shipped', 'Order Delivered', 'Delivery Confirmed',
        'New Order Received', 'Order Payment Received', 'Payment Received for Order', 'Payment Released'
      ];
      if (smsTitles.includes(title) || title.includes('Payment')) {
        try {
          await sendNotificationSms(user.phone_number, title, orderNumber);
        } catch (smsErr) {
          console.error('Failed to send notification SMS:', smsErr.message);
        }
      }
    }
  } catch (error) {
    console.error('Failed to send notification email:', error);
    // Don't throw - email failure shouldn't break the notification creation
  }
};

