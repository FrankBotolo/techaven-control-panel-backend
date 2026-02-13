import { sendOrderNotificationEmail } from '../services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

const testSingleNotification = async () => {
  console.log('🧪 Testing single notification email...\n');

  const testEmail = 'frank78botolo@gmail.com'; // Change this to your email

  try {
    // Test Order Placed Notification with full details
    console.log('Sending Order Placed notification email...');
    const notification = {
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
        status: 'pending',
        payment_status: 'pending'
      }
    };
    
    const result = await sendOrderNotificationEmail(testEmail, notification);
    
    if (result) {
      console.log('✅ Notification email sent successfully!');
      console.log('📧 Email sent via Brevo SMTP');
      console.log('   Check the recipient inbox (including spam folder)');
      console.log('   You should see a beautiful HTML email with:');
      console.log('   - Gradient header');
      console.log('   - Order details');
      console.log('   - Payment information');
      console.log('   - Shipping address');
      console.log('   - Status badges');
    } else {
      console.log('❌ Failed to send notification email');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Notification email test failed:', error.message);
    if (error.responseCode === 550) {
      console.error('   Rate limit reached. Please wait a moment and try again.');
    }
    process.exit(1);
  }
};

testSingleNotification();

