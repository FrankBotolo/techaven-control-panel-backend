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

### Mailtrap (Development/Testing)
```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=9530d3ec9a5b92
SMTP_PASS=823e2e606002eb
```

### Production
Update `.env` with your production SMTP settings:
```env
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@techaven.mw
SMTP_PASS=your-password
```

## Testing

### Test Registration Email
1. Register a new user with an email address
2. Check Mailtrap inbox for OTP email

### Test Order Notifications
1. Place an order
2. Check Mailtrap inbox for:
   - Order confirmation (customer)
   - New order notification (seller)
   - Order alert (admin)

### Test Payment Notifications
1. Complete payment for an order
2. Check Mailtrap inbox for payment emails
3. Confirm delivery
4. Check Mailtrap inbox for payment release emails

## Important Notes

- ✅ **Emails are sent automatically** - No manual action required
- ✅ **Asynchronous sending** - Emails don't slow down API responses
- ✅ **Error handling** - Email failures don't break notifications
- ✅ **User must have email** - Only sends if user.email exists
- ✅ **Role-based templates** - Different templates for customer/seller/admin
- ✅ **Beautiful HTML** - All emails use responsive, professional templates

## Viewing Emails

### Development/Testing
- Go to https://mailtrap.io
- Log in to your account
- Check your inbox for all sent emails

### Production
- Emails will be sent to actual user email addresses
- Monitor email delivery through your SMTP provider dashboard

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

