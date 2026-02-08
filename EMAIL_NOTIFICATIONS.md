# Email Notification System

## Overview

The Techaven platform now includes a comprehensive email notification system using Mailtrap for testing and development. All notifications are sent with beautiful, responsive HTML email templates.

## Configuration

### Mailtrap Setup (Development/Testing)

The system is configured to use Mailtrap by default. Update your `.env` file:

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=9530d3ec9a5b92
SMTP_PASS=823e2e606002eb
```

### Production Setup

For production, update your `.env` file with your production SMTP settings:

```env
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@techaven.mw
SMTP_PASS=your-secure-password
```

## Email Templates

### 1. OTP Verification Email
- **Trigger**: User registration, login, password reset
- **Template**: Beautiful gradient design with large OTP code
- **Features**: 
  - Security warnings
  - Expiry information
  - Type-specific messaging (signup, login, password reset)

### 2. Order Placed Email
- **Trigger**: Customer places an order
- **Template**: Order confirmation with full details
- **Features**:
  - Order number and total amount
  - Payment method
  - Courier service
  - Shipping address
  - Status badge

### 3. Order Shipped Email
- **Trigger**: Admin/Seller updates order status to "shipped"
- **Template**: Shipping confirmation with tracking
- **Features**:
  - Tracking number
  - Courier information
  - Shipping address

### 4. Order Delivered Email
- **Trigger**: Admin marks order as "delivered"
- **Template**: Delivery confirmation
- **Features**:
  - Delivery confirmation request
  - Order summary
  - Next steps information

### 5. Payment Received Email
- **Trigger**: Payment completed (escrow held)
- **Template**: Payment confirmation
- **Features**:
  - Different templates for customer and seller
  - Escrow status information
  - Amount details

### 6. Payment Released Email
- **Trigger**: Customer confirms delivery
- **Template**: Payment release confirmation
- **Features**:
  - Seller: Funds released to wallet
  - Customer: Delivery confirmed
  - Transaction details

### 7. New Order (Seller) Email
- **Trigger**: New order placed for seller's products
- **Template**: Order notification for seller
- **Features**:
  - Customer information
  - Order details
  - Shipping address
  - Action required notice

### 8. Shop Invitation Email
- **Trigger**: Admin invites shop owner
- **Template**: Invitation with registration link
- **Features**:
  - Shop name
  - Registration button
  - Invitation details

## Email Features

### Design
- ✅ Responsive HTML templates
- ✅ Beautiful gradient headers
- ✅ Professional color scheme
- ✅ Mobile-friendly design
- ✅ Clear call-to-action buttons
- ✅ Status badges and icons

### Functionality
- ✅ Automatic email sending on notification creation
- ✅ Role-based email templates (customer, seller, admin)
- ✅ Order details included in emails
- ✅ Escrow information for payment emails
- ✅ Error handling (emails don't break notification creation)

## Email Triggers

### Customer Emails
- Order placed
- Order shipped (with tracking)
- Order delivered
- Payment received (escrow held)
- Delivery confirmed

### Seller Emails
- New order received
- Payment received (escrow held)
- Payment released to wallet

### Admin Emails
- New order placed
- Payment received
- Escrow released

### System Emails
- OTP verification (signup, login, password reset)
- Shop invitations

## Testing with Mailtrap

1. **View Emails**: Go to https://mailtrap.io and check your inbox
2. **Test Different Scenarios**:
   - Place an order (customer email)
   - Complete payment (payment emails)
   - Update order status (shipped/delivered emails)
   - Confirm delivery (payment release emails)

## Production Deployment

When moving to production:

1. **Update SMTP Settings**: Use your production email provider
2. **Update From Address**: Change the "from" email in `emailService.js`
3. **Test Email Delivery**: Test all email types before going live
4. **Monitor Email Delivery**: Set up email delivery monitoring
5. **Consider Email Service**: For high volume, consider services like:
   - SendGrid
   - AWS SES
   - Mailgun
   - Postmark

## Email Template Customization

All email templates are in `services/emailTemplates.js`. You can customize:
- Colors and gradients
- Layout and structure
- Content and messaging
- Branding elements

## Error Handling

- Email failures don't break notification creation
- Errors are logged to console
- Failed emails can be retried manually if needed

## Future Enhancements

- Email preferences (opt-in/opt-out)
- Email queue system for high volume
- Email templates in database (admin-editable)
- Multi-language email support
- Email analytics and tracking

