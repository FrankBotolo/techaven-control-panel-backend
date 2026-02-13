import { sendOtpEmail, sendOrderNotificationEmail } from '../services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

const testEmails = async () => {
  console.log('🧪 Testing email functionality...\n');

  try {
    // Test OTP email
    console.log('1. Testing OTP email...');
    const otpResult = await sendOtpEmail('frank78botolo@gmail.com', '123456', 'signup');
    console.log(otpResult ? '✅ OTP email sent successfully' : '❌ OTP email failed');
    console.log('');

    // Test order notification email
    console.log('2. Testing order notification email...');
    const orderData = {
      order_number: 'TH-2026-0001',
      total_amount: '50000.00',
      payment_method: 'mobile_money',
      courier_service: 'DHL Express',
      shipping_address: '123 Test Street',
      shipping_city: 'Lilongwe'
    };
    
    const orderNotification = {
      title: 'Order Placed',
      message: 'Your order has been placed successfully.',
      order: orderData
    };
    
    const orderResult = await sendOrderNotificationEmail('frank78botolo@gmail.com', orderNotification);
    console.log(orderResult ? '✅ Order notification email sent successfully' : '❌ Order notification email failed');
    console.log('');

    console.log('✅ Email testing completed!');
    console.log('📧 Emails have been sent via Brevo SMTP');
    console.log('   Check the recipient inbox (including spam folder)');
    console.log('   Monitor delivery status at https://app.brevo.com');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Email test failed:', error);
    process.exit(1);
  }
};

testEmails();

