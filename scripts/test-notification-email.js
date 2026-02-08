import {
  sendOrderNotificationEmail,
  sendPaymentNotificationEmail,
  sendSellerNotificationEmail,
  sendAdminNotificationEmail
} from '../services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

const testNotificationEmails = async () => {
  console.log('🧪 Testing notification email functionality...\n');

  const testEmail = 'test@example.com'; // Change this to your email

  try {
    // Test 1: Order Placed Notification
    console.log('1. Testing Order Placed notification email...');
    const orderPlacedNotification = {
      title: 'Order Placed',
      message: 'Your order TH-2026-0001 has been placed successfully. Shipping details have been shared with DHL Express.',
      order: {
        order_number: 'TH-2026-0001',
        total_amount: '125000.00',
        payment_method: 'mobile_money',
        courier_service: 'DHL Express',
        shipping_address: '123 Main Street, Area 47',
        shipping_city: 'Lilongwe',
        shipping_phone: '+265991234567',
        status: 'pending'
      }
    };
    const result1 = await sendOrderNotificationEmail(testEmail, orderPlacedNotification);
    console.log(result1 ? '✅ Order Placed email sent successfully' : '❌ Order Placed email failed');
    console.log('');

    // Wait a bit to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Order Shipped Notification
    console.log('2. Testing Order Shipped notification email...');
    const orderShippedNotification = {
      title: 'Order Shipped',
      message: 'Your order TH-2026-0001 has been shipped. Tracking number: TRACK123456',
      order: {
        order_number: 'TH-2026-0001',
        courier_service: 'DHL Express',
        courier_tracking_number: 'TRACK123456',
        shipping_address: '123 Main Street, Area 47',
        shipping_city: 'Lilongwe'
      }
    };
    const result2 = await sendOrderNotificationEmail(testEmail, orderShippedNotification);
    console.log(result2 ? '✅ Order Shipped email sent successfully' : '❌ Order Shipped email failed');
    console.log('');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Payment Received (Customer)
    console.log('3. Testing Payment Received notification email (Customer)...');
    const paymentReceivedNotification = {
      title: 'Payment Received',
      message: 'Payment for order TH-2026-0001 has been received. Funds are held in escrow until delivery confirmation.',
      order: {
        order_number: 'TH-2026-0001',
        total_amount: '125000.00',
        escrow_amount: '120000.00',
        payment_method: 'mobile_money',
        escrow_status: 'held'
      }
    };
    const result3 = await sendPaymentNotificationEmail(testEmail, paymentReceivedNotification, 'customer');
    console.log(result3 ? '✅ Payment Received (Customer) email sent successfully' : '❌ Payment Received email failed');
    console.log('');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Payment Received (Seller)
    console.log('4. Testing Payment Received notification email (Seller)...');
    const sellerPaymentNotification = {
      title: 'Order Payment Received',
      message: 'Payment of MWK 120000 received for order TH-2026-0001. Funds are held in escrow and will be released after delivery confirmation.',
      order: {
        order_number: 'TH-2026-0001',
        escrow_amount: '120000.00',
        payment_method: 'mobile_money',
        escrow_status: 'held'
      }
    };
    const result4 = await sendPaymentNotificationEmail(testEmail, sellerPaymentNotification, 'seller');
    console.log(result4 ? '✅ Payment Received (Seller) email sent successfully' : '❌ Payment Received (Seller) email failed');
    console.log('');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 5: Payment Released (Seller)
    console.log('5. Testing Payment Released notification email (Seller)...');
    const paymentReleasedNotification = {
      title: 'Payment Released',
      message: 'MWK 120000 has been released to your wallet for order TH-2026-0001.',
      order: {
        order_number: 'TH-2026-0001',
        escrow_amount: '120000.00',
        total_amount: '125000.00',
        funds_released_at: new Date().toISOString()
      }
    };
    const result5 = await sendPaymentNotificationEmail(testEmail, paymentReleasedNotification, 'seller');
    console.log(result5 ? '✅ Payment Released (Seller) email sent successfully' : '❌ Payment Released email failed');
    console.log('');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 6: New Order (Seller)
    console.log('6. Testing New Order notification email (Seller)...');
    const newOrderNotification = {
      title: 'New Order Received',
      message: 'New order TH-2026-0001 has been placed for your products. Total: MWK 125000.',
      order: {
        order_number: 'TH-2026-0001',
        total_amount: '125000.00',
        customer_name: 'John Doe',
        shipping_address: '123 Main Street, Area 47',
        shipping_city: 'Lilongwe',
        courier_service: 'DHL Express',
        status: 'pending'
      }
    };
    const result6 = await sendSellerNotificationEmail(testEmail, newOrderNotification);
    console.log(result6 ? '✅ New Order (Seller) email sent successfully' : '❌ New Order (Seller) email failed');
    console.log('');

    console.log('✅ Notification email testing completed!');
    console.log('📧 Check your Mailtrap inbox at https://mailtrap.io');
    console.log('   You should see 6 beautiful HTML emails with different templates.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Notification email test failed:', error.message);
    if (error.responseCode === 550) {
      console.error('   Rate limit reached. Please wait a moment and try again.');
    }
    process.exit(1);
  }
};

testNotificationEmails();

