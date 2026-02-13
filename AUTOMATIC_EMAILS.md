# Automatic Email System

## ✅ Yes, Emails Are Sent Automatically!

The Techaven platform automatically sends emails in the following scenarios:

## 1. Registration & Authentication

### User Registration
- **When**: User registers a new account
- **Email Sent**: OTP verification code
- **Template**: Beautiful OTP email with gradient design
- **Location**: `controllers/AuthController.js` → `register()` function
- **Code**: 
  ```javascript
  const otpCode = await sendOtp(user, 'signup');
  // Automatically sends email if user has email address
  ```

### User Login (if OTP required)
- **When**: User logs in and OTP verification is needed
- **Email Sent**: OTP verification code
- **Template**: Login verification email
- **Location**: `controllers/AuthController.js` → `login()` function

### Password Reset
- **When**: User requests password reset
- **Email Sent**: OTP for password reset
- **Template**: Password reset OTP email
- **Location**: `controllers/AuthController.js` → `forgotPassword()` function

### Resend OTP
- **When**: User requests OTP resend
- **Email Sent**: New OTP code
- **Template**: OTP email based on type (signup/login/password_reset)
- **Location**: `controllers/AuthController.js` → `resendOtp()` function

## 2. Order Notifications

### Order Placed
- **When**: Customer places an order
- **Recipients**: 
  - ✅ Customer (order confirmation)
  - ✅ Seller (new order notification)
  - ✅ Admin (new order alert)
- **Email Sent**: Automatically after order creation
- **Template**: Order confirmation with full details
- **Location**: `controllers/OrderController.js` → `createOrder()` function

### Order Shipped
- **When**: Admin/Seller updates order status to "shipped"
- **Recipients**: Customer
- **Email Sent**: Automatically when status changes
- **Template**: Shipping confirmation with tracking number
- **Location**: `controllers/OrderController.js` → `updateOrderStatus()` function

### Order Delivered
- **When**: Admin marks order as "delivered"
- **Recipients**: Customer
- **Email Sent**: Automatically when status changes
- **Template**: Delivery confirmation
- **Location**: `controllers/OrderController.js` → `updateOrderStatus()` function

## 3. Payment Notifications

### Payment Received (Escrow Held)
- **When**: Customer completes payment
- **Recipients**: 
  - ✅ Customer (payment confirmation)
  - ✅ Seller (payment received notification)
  - ✅ Admin (payment alert)
- **Email Sent**: Automatically after payment completion
- **Template**: Payment confirmation with escrow details
- **Location**: `controllers/OrderController.js` → `completePayment()` function

### Payment Released
- **When**: Customer confirms delivery
- **Recipients**: 
  - ✅ Customer (delivery confirmed)
  - ✅ Seller (funds released)
  - ✅ Admin (escrow released)
- **Email Sent**: Automatically after delivery confirmation
- **Template**: Payment release confirmation
- **Location**: `controllers/OrderController.js` → `confirmDelivery()` function

## 4. Shop Invitations

### Shop Owner Invitation
- **When**: Admin invites a shop owner
- **Recipients**: Shop owner (via email)
- **Email Sent**: Automatically when invitation is created
- **Template**: Beautiful invitation email with registration link
- **Location**: `controllers/AdminShopController.js` → `inviteOwner()` function

## How It Works

### Automatic Email Sending Flow

1. **Event Occurs** (e.g., user registers, order placed, payment completed)
2. **Notification Created** in database
3. **Email Automatically Sent** via `sendNotificationEmail()` helper
4. **Email Sent Asynchronously** (doesn't block API response)
5. **User Receives Email** in their inbox

### Email Helper Function

All notification emails are sent through the `sendNotificationEmail()` helper function located in `utils/notificationHelper.js`. This function:

- ✅ Automatically detects user role (customer/seller/admin)
- ✅ Selects appropriate email template
- ✅ Includes order details if available
- ✅ Handles errors gracefully (doesn't break notification creation)
- ✅ Only sends if user has an email address

### Code Example

```javascript
// In OrderController.js
const customerNotification = await Notification.create({
  user_id: userId,
  title: 'Order Placed',
  message: 'Your order has been placed...',
  type: 'order',
  order_id: order.id,
  read: false
});
// Email automatically sent here
sendNotificationEmail(customerNotification, orderWithItems);
```

## Email Templates

All emails use beautiful, responsive HTML templates:

- ✅ **OTP Emails**: Gradient design with large OTP code
- ✅ **Order Emails**: Professional order confirmations
- ✅ **Payment Emails**: Escrow information and transaction details
- ✅ **Seller Emails**: Order and payment notifications
- ✅ **Admin Emails**: System alerts and notifications
- ✅ **Invitation Emails**: Registration links and shop details

## Configuration

### Brevo SMTP (Production)
The system uses Brevo (formerly Sendinblue) SMTP for email delivery. Update your `.env` file:
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=a2310c001@smtp-brevo.com
SMTP_PASS=xsmtpsib-7c14744dd50ba0c16b9e510924f2c44bd56b70641d3245c8ad0e6c39fad43997-xaCb2MbERjRZZuDz
SMTP_FROM_EMAIL=noreply@techaven.mw
```

### Alternative SMTP Providers
If you need to use a different SMTP provider, update `.env` with your SMTP settings:
```env
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@techaven.mw
SMTP_PASS=your-password
SMTP_FROM_EMAIL=noreply@techaven.mw
```

## Testing

### Test Registration Email
1. Register a new user with an email address
2. Check the recipient's email inbox for OTP email
3. Check console logs for email sending confirmation

### Test Order Notifications
1. Place an order
2. Check recipient email inboxes for:
   - Order confirmation (customer)
   - New order notification (seller)
   - Order alert (admin)
3. Check console logs for email sending confirmations

### Test Payment Notifications
1. Complete payment for an order
2. Check recipient email inboxes for payment emails
3. Confirm delivery
4. Check recipient email inboxes for payment release emails
5. Monitor Brevo dashboard for delivery status

## Important Notes

- ✅ **Emails are sent automatically** - No manual action required
- ✅ **Asynchronous sending** - Emails don't slow down API responses
- ✅ **Error handling** - Email failures don't break notifications
- ✅ **User must have email** - Only sends if user.email exists
- ✅ **Role-based templates** - Different templates for customer/seller/admin
- ✅ **Beautiful HTML** - All emails use responsive, professional templates

## Viewing Emails

### Email Delivery
- Emails are sent to actual recipient email addresses
- Check recipient inboxes (including spam/junk folders)
- Monitor email delivery through Brevo dashboard at https://app.brevo.com
- Check console logs for email sending confirmations and errors

### Email Testing Scripts
- Run `npm run test-email` to test OTP and order emails
- Run `npm run test-notification-email` to test all notification types
- Run `npm run test-single-notification` to test a specific notification

## Summary

**YES, emails are sent automatically for:**
- ✅ User registration (OTP)
- ✅ User login (OTP if required)
- ✅ Password reset (OTP)
- ✅ Order placed
- ✅ Order shipped
- ✅ Order delivered
- ✅ Payment received
- ✅ Payment released
- ✅ Shop invitations

**No manual intervention required!** 🎉

