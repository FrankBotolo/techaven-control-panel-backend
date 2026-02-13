import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import {
  getOTPEmailTemplate,
  getOrderPlacedEmailTemplate,
  getOrderShippedEmailTemplate,
  getOrderDeliveredEmailTemplate,
  getPaymentReceivedEmailTemplate,
  getPaymentReleasedEmailTemplate,
  getNewOrderSellerEmailTemplate,
  getInvitationEmailTemplate
} from './emailTemplates.js';

dotenv.config();

// Configure Brevo (Sendinblue) SMTP transporter
const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
const smtpSecure = smtpPort === 465; // Use SSL for port 465, STARTTLS for port 587

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: smtpPort,
  secure: smtpSecure, // true for 465, false for 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER || 'a2310c001@smtp-brevo.com',
    pass: process.env.SMTP_PASS || 'xsmtpsib-7c14744dd50ba0c16b9e510924f2c44bd56b70641d3245c8ad0e6c39fad43997-xaCb2MbERjRZZuDz'
  },
  // Connection timeout settings
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000, // 30 seconds
  socketTimeout: 60000, // 60 seconds
  // Additional options for better compatibility
  tls: {
    rejectUnauthorized: false
  },
  // Debug mode (set to true for troubleshooting)
  debug: process.env.SMTP_DEBUG === 'true',
  logger: process.env.SMTP_DEBUG === 'true'
});

/**
 * Verify SMTP connection
 */
export const verifySMTPConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection verification failed:', error.message);
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      console.error('   Connection timeout - Check firewall settings and network connectivity');
      console.error('   Try using port 465 with SSL instead of port 587');
    }
    return false;
  }
};

/**
 * Send OTP email with beautiful template
 */
export const sendOtpEmail = async (email, otpCode, type = 'verification') => {
  try {
    const mailOptions = {
      from: `"Techaven" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@techaven.mw'}>`,
      to: email,
      subject: type === 'password_reset' 
        ? 'Reset Your Password - Techaven' 
        : type === 'login'
        ? 'Login Verification - Techaven'
        : 'Verify Your Email - Techaven',
      text: `Your verification code is: ${otpCode}. This code will expire in 12 hours.`,
      html: getOTPEmailTemplate(otpCode, type)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ OTP email error:', error.message);
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      console.error('   Connection timeout detected. Possible solutions:');
      console.error('   1. Check firewall settings - port 587 may be blocked');
      console.error('   2. Try port 465 with SSL: Set SMTP_PORT=465 in .env');
      console.error('   3. Check network connectivity to smtp-relay.brevo.com');
      console.error('   4. Verify SMTP credentials are correct');
    } else if (error.code === 'EAUTH') {
      console.error('   Authentication failed - Check SMTP_USER and SMTP_PASS in .env');
    }
    return false;
  }
};

/**
 * Send invitation email with beautiful template
 */
export const sendInvitationEmail = async (email, { owner_name, shop_name, registration_link }) => {
  try {
    const mailOptions = {
      from: `"Techaven" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@techaven.mw'}>`,
      to: email,
      subject: `You're invited to manage ${shop_name} - Techaven`,
      text: `Hello ${owner_name},\n\nYou have been invited to manage the shop "${shop_name}".\nRegister here: ${registration_link}\n\nIf you did not expect this, you can ignore this email.`,
      html: getInvitationEmailTemplate({ owner_name, shop_name, registration_link })
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Invitation email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Invitation email error:', error);
    return false;
  }
};

/**
 * Send order notification email
 */
export const sendOrderNotificationEmail = async (email, notification) => {
  try {
    const { title, order } = notification;
    let subject = '';
    let html = '';

    if (title === 'Order Placed') {
      subject = `Order Confirmed - ${order.order_number}`;
      html = getOrderPlacedEmailTemplate(order);
    } else if (title === 'Order Shipped') {
      subject = `Your Order Has Shipped - ${order.order_number}`;
      html = getOrderShippedEmailTemplate(order);
    } else if (title === 'Order Delivered') {
      subject = `Order Delivered - ${order.order_number}`;
      html = getOrderDeliveredEmailTemplate(order);
    } else {
      // Generic notification
      subject = notification.title;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .body { padding: 30px; background: #f9f9f9; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${notification.title}</h1>
            </div>
            <div class="body">
              <p>${notification.message}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Techaven. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const mailOptions = {
      from: `"Techaven" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@techaven.mw'}>`,
      to: email,
      subject: subject,
      text: notification.message,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Order notification email sent to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Order notification email error:', error);
    return false;
  }
};

/**
 * Send payment notification email
 */
export const sendPaymentNotificationEmail = async (email, notification, recipientType = 'customer') => {
  try {
    const { title, order } = notification;
    let subject = '';
    let html = '';

    if (title === 'Payment Received' || title === 'Order Payment Received' || title === 'Payment Received for Order') {
      subject = `Payment Received - ${order.order_number}`;
      html = getPaymentReceivedEmailTemplate(order, recipientType);
    } else if (title === 'Payment Released') {
      subject = `Payment Released - ${order.order_number}`;
      html = getPaymentReleasedEmailTemplate(order, recipientType);
    } else {
      subject = notification.title;
      html = getPaymentReceivedEmailTemplate(order, recipientType);
    }

    const mailOptions = {
      from: `"Techaven" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@techaven.mw'}>`,
      to: email,
      subject: subject,
      text: notification.message,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Payment notification email sent to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Payment notification email error:', error);
    return false;
  }
};

/**
 * Send seller notification email
 */
export const sendSellerNotificationEmail = async (email, notification) => {
  try {
    const { title, order } = notification;
    let subject = '';
    let html = '';

    if (title === 'New Order Received') {
      subject = `New Order - ${order.order_number}`;
      html = getNewOrderSellerEmailTemplate(order);
    } else if (title === 'Order Payment Received' || title === 'Payment Received for Order') {
      subject = `Payment Received - ${order.order_number}`;
      html = getPaymentReceivedEmailTemplate(order, 'seller');
    } else if (title === 'Payment Released') {
      subject = `Payment Released - ${order.order_number}`;
      html = getPaymentReleasedEmailTemplate(order, 'seller');
    } else {
      subject = notification.title;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .body { padding: 30px; background: #f9f9f9; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${notification.title}</h1>
            </div>
            <div class="body">
              <p>${notification.message}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Techaven. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const mailOptions = {
      from: `"Techaven" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@techaven.mw'}>`,
      to: email,
      subject: subject,
      text: notification.message,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Seller notification email sent to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Seller notification email error:', error);
    return false;
  }
};

/**
 * Send admin notification email
 */
export const sendAdminNotificationEmail = async (email, notification) => {
  try {
    const mailOptions = {
      from: `"Techaven" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@techaven.mw'}>`,
      to: email,
      subject: `Admin Alert: ${notification.title}`,
      text: notification.message,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .body { padding: 30px; background: #f9f9f9; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 ${notification.title}</h1>
            </div>
            <div class="body">
              <p>${notification.message}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Techaven. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Admin notification email sent to ${email}:`, info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Admin notification email error:', error);
    return false;
  }
};
