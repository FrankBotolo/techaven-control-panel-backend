/**
 * Beautiful HTML Email Templates for Techaven
 */

export const getEmailStyles = () => `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f4;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .email-header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .email-header p {
      font-size: 14px;
      opacity: 0.9;
    }
    .email-body {
      padding: 40px 30px;
    }
    .email-footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #e9ecef;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .otp-code {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      font-size: 36px;
      font-weight: 700;
      padding: 20px 40px;
      border-radius: 8px;
      text-align: center;
      letter-spacing: 8px;
      margin: 30px 0;
      display: inline-block;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .order-details {
      background-color: #ffffff;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .order-details h3 {
      color: #667eea;
      margin-bottom: 15px;
      font-size: 18px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #6c757d;
    }
    .detail-value {
      color: #333333;
    }
    .amount {
      font-size: 24px;
      font-weight: 700;
      color: #28a745;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-pending { background-color: #ffc107; color: #000; }
    .status-paid { background-color: #28a745; color: #fff; }
    .status-delivered { background-color: #17a2b8; color: #fff; }
    .status-released { background-color: #28a745; color: #fff; }
    .divider {
      height: 1px;
      background-color: #e9ecef;
      margin: 30px 0;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 20px;
    }
  </style>
`;

export const getOTPEmailTemplate = (otpCode, type = 'verification') => {
  const typeMessages = {
    signup: 'Welcome to Techaven! Please verify your email address to complete your registration.',
    login: 'Please use this code to complete your login.',
    password_reset: 'You requested to reset your password. Use this code to proceed.',
    verification: 'Please verify your email address.'
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>🔐 Verification Code</h1>
          <p>Techaven Security</p>
        </div>
        <div class="email-body">
          <div style="text-align: center;">
            <div class="icon">🔒</div>
            <h2 style="color: #333; margin-bottom: 15px;">Your Verification Code</h2>
            <p style="color: #6c757d; margin-bottom: 30px;">${typeMessages[type] || typeMessages.verification}</p>
            
            <div class="otp-code">${otpCode}</div>
            
            <div class="info-box">
              <p style="margin: 0; color: #6c757d;">
                <strong>⚠️ Security Notice:</strong><br>
                This code will expire in 12 hours. Never share this code with anyone. 
                Techaven staff will never ask for your verification code.
              </p>
            </div>
            
            <p style="color: #6c757d; margin-top: 30px; font-size: 14px;">
              If you didn't request this code, please ignore this email or contact our support team.
            </p>
          </div>
        </div>
        <div class="email-footer">
          <p>© ${new Date().getFullYear()} Techaven. All rights reserved.</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getOrderPlacedEmailTemplate = (orderData) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>✅ Order Confirmed!</h1>
          <p>Order #${orderData.order_number}</p>
        </div>
        <div class="email-body">
          <h2 style="color: #333; margin-bottom: 15px;">Thank you for your order!</h2>
          <p style="color: #6c757d; margin-bottom: 30px;">
            We've received your order and are preparing it for shipment. 
            You'll receive another email when your order ships.
          </p>
          
          <div class="order-details">
            <h3>Order Details</h3>
            <div class="detail-row">
              <span class="detail-label">Order Number:</span>
              <span class="detail-value"><strong>${orderData.order_number}</strong></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Amount:</span>
              <span class="detail-value amount">MWK ${parseFloat(orderData.total_amount).toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment Method:</span>
              <span class="detail-value">${orderData.payment_method.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Courier Service:</span>
              <span class="detail-value">${orderData.courier_service}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Shipping Address:</span>
              <span class="detail-value">${orderData.shipping_address}, ${orderData.shipping_city}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value">
                <span class="status-badge status-pending">Pending</span>
              </span>
            </div>
          </div>
          
          <div class="info-box">
            <p style="margin: 0; color: #6c757d;">
              <strong>📦 What's Next?</strong><br>
              Your order is being processed. We'll notify you once it's shipped with tracking information.
            </p>
          </div>
        </div>
        <div class="email-footer">
          <p>© ${new Date().getFullYear()} Techaven. All rights reserved.</p>
          <p>Questions? Contact us at support@techaven.mw</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getOrderShippedEmailTemplate = (orderData) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>🚚 Your Order Has Shipped!</h1>
          <p>Order #${orderData.order_number}</p>
        </div>
        <div class="email-body">
          <div style="text-align: center;">
            <div class="icon">📦</div>
            <h2 style="color: #333; margin-bottom: 15px;">Great news! Your order is on the way</h2>
            <p style="color: #6c757d; margin-bottom: 30px;">
              Your order has been shipped and is on its way to you.
            </p>
          </div>
          
          <div class="order-details">
            <h3>Shipping Information</h3>
            <div class="detail-row">
              <span class="detail-label">Order Number:</span>
              <span class="detail-value"><strong>${orderData.order_number}</strong></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Tracking Number:</span>
              <span class="detail-value"><strong>${orderData.courier_tracking_number || 'Pending'}</strong></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Courier Service:</span>
              <span class="detail-value">${orderData.courier_service}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Shipping Address:</span>
              <span class="detail-value">${orderData.shipping_address}, ${orderData.shipping_city}</span>
            </div>
          </div>
          
          <div class="info-box">
            <p style="margin: 0; color: #6c757d;">
              <strong>📱 Track Your Order:</strong><br>
              Use the tracking number above to track your package on the courier's website.
            </p>
          </div>
        </div>
        <div class="email-footer">
          <p>© ${new Date().getFullYear()} Techaven. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getOrderDeliveredEmailTemplate = (orderData) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>🎉 Order Delivered!</h1>
          <p>Order #${orderData.order_number}</p>
        </div>
        <div class="email-body">
          <div style="text-align: center;">
            <div class="icon">✅</div>
            <h2 style="color: #333; margin-bottom: 15px;">Your order has been delivered</h2>
            <p style="color: #6c757d; margin-bottom: 30px;">
              We hope you love your purchase! Please confirm delivery to release payment to the seller.
            </p>
          </div>
          
          <div class="order-details">
            <h3>Order Summary</h3>
            <div class="detail-row">
              <span class="detail-label">Order Number:</span>
              <span class="detail-value"><strong>${orderData.order_number}</strong></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Amount:</span>
              <span class="detail-value amount">MWK ${parseFloat(orderData.total_amount).toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Delivery Address:</span>
              <span class="detail-value">${orderData.shipping_address}, ${orderData.shipping_city}</span>
            </div>
          </div>
          
          <div class="info-box" style="background-color: #e7f3ff; border-left-color: #2196F3;">
            <p style="margin: 0; color: #1976D2;">
              <strong>💡 Important:</strong><br>
              Please confirm delivery in the app to release payment to the seller. 
              This helps ensure a smooth transaction for everyone.
            </p>
          </div>
        </div>
        <div class="email-footer">
          <p>© ${new Date().getFullYear()} Techaven. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getPaymentReceivedEmailTemplate = (orderData, recipientType = 'customer') => {
  const isSeller = recipientType === 'seller';
  const title = isSeller ? '💰 Payment Received (Held in Escrow)' : '💳 Payment Confirmed';
  const message = isSeller 
    ? `Payment of MWK ${parseFloat(orderData.escrow_amount).toLocaleString()} has been received for order ${orderData.order_number}. Funds are held in escrow and will be released after delivery confirmation.`
    : `Your payment of MWK ${parseFloat(orderData.total_amount).toLocaleString()} for order ${orderData.order_number} has been received. Funds are held in escrow until delivery confirmation.`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>${title}</h1>
          <p>Order #${orderData.order_number}</p>
        </div>
        <div class="email-body">
          <div style="text-align: center;">
            <div class="icon">${isSeller ? '💰' : '💳'}</div>
            <h2 style="color: #333; margin-bottom: 15px;">${isSeller ? 'Payment Received' : 'Payment Confirmed'}</h2>
            <p style="color: #6c757d; margin-bottom: 30px;">${message}</p>
          </div>
          
          <div class="order-details">
            <h3>Payment Details</h3>
            <div class="detail-row">
              <span class="detail-label">Order Number:</span>
              <span class="detail-value"><strong>${orderData.order_number}</strong></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">${isSeller ? 'Escrow Amount:' : 'Total Amount:'}</span>
              <span class="detail-value amount">MWK ${parseFloat(isSeller ? orderData.escrow_amount : orderData.total_amount).toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment Method:</span>
              <span class="detail-value">${orderData.payment_method.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Escrow Status:</span>
              <span class="detail-value">
                <span class="status-badge status-paid">Held</span>
              </span>
            </div>
          </div>
          
          ${isSeller ? `
          <div class="info-box">
            <p style="margin: 0; color: #6c757d;">
              <strong>🔒 Escrow Protection:</strong><br>
              Your payment is safely held in escrow. It will be released to your wallet once the customer confirms delivery.
            </p>
          </div>
          ` : `
          <div class="info-box">
            <p style="margin: 0; color: #6c757d;">
              <strong>🔒 Secure Payment:</strong><br>
              Your payment is held in escrow for your protection. It will be released to the seller after you confirm delivery.
            </p>
          </div>
          `}
        </div>
        <div class="email-footer">
          <p>© ${new Date().getFullYear()} Techaven. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getPaymentReleasedEmailTemplate = (orderData, recipientType = 'seller') => {
  const isSeller = recipientType === 'seller';
  const title = isSeller ? '🎉 Payment Released to Your Wallet!' : '✅ Delivery Confirmed';
  const message = isSeller
    ? `Great news! MWK ${parseFloat(orderData.escrow_amount).toLocaleString()} has been released to your wallet for order ${orderData.order_number}.`
    : `Thank you for confirming delivery! Payment has been released to the seller for order ${orderData.order_number}.`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>${title}</h1>
          <p>Order #${orderData.order_number}</p>
        </div>
        <div class="email-body">
          <div style="text-align: center;">
            <div class="icon">${isSeller ? '💰' : '✅'}</div>
            <h2 style="color: #333; margin-bottom: 15px;">${isSeller ? 'Funds Released!' : 'Delivery Confirmed'}</h2>
            <p style="color: #6c757d; margin-bottom: 30px;">${message}</p>
          </div>
          
          <div class="order-details">
            <h3>Transaction Details</h3>
            <div class="detail-row">
              <span class="detail-label">Order Number:</span>
              <span class="detail-value"><strong>${orderData.order_number}</strong></span>
            </div>
            ${isSeller ? `
            <div class="detail-row">
              <span class="detail-label">Amount Released:</span>
              <span class="detail-value amount">MWK ${parseFloat(orderData.escrow_amount).toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value">
                <span class="status-badge status-released">Released</span>
              </span>
            </div>
            ` : `
            <div class="detail-row">
              <span class="detail-label">Total Amount:</span>
              <span class="detail-value amount">MWK ${parseFloat(orderData.total_amount).toLocaleString()}</span>
            </div>
            `}
            <div class="detail-row">
              <span class="detail-label">Released At:</span>
              <span class="detail-value">${new Date(orderData.funds_released_at || new Date()).toLocaleString()}</span>
            </div>
          </div>
          
          ${isSeller ? `
          <div class="info-box" style="background-color: #d4edda; border-left-color: #28a745;">
            <p style="margin: 0; color: #155724;">
              <strong>💼 Next Steps:</strong><br>
              The funds are now available in your wallet. You can withdraw them anytime from your account dashboard.
            </p>
          </div>
          ` : ''}
        </div>
        <div class="email-footer">
          <p>© ${new Date().getFullYear()} Techaven. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getNewOrderSellerEmailTemplate = (orderData) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>🛍️ New Order Received!</h1>
          <p>Order #${orderData.order_number}</p>
        </div>
        <div class="email-body">
          <div style="text-align: center;">
            <div class="icon">🎉</div>
            <h2 style="color: #333; margin-bottom: 15px;">Congratulations! You have a new order</h2>
            <p style="color: #6c757d; margin-bottom: 30px;">
              A customer has placed an order for your products. Please prepare the items for shipment.
            </p>
          </div>
          
          <div class="order-details">
            <h3>Order Information</h3>
            <div class="detail-row">
              <span class="detail-label">Order Number:</span>
              <span class="detail-value"><strong>${orderData.order_number}</strong></span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Amount:</span>
              <span class="detail-value amount">MWK ${parseFloat(orderData.total_amount).toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Customer:</span>
              <span class="detail-value">${orderData.customer_name || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Shipping Address:</span>
              <span class="detail-value">${orderData.shipping_address}, ${orderData.shipping_city}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Courier Service:</span>
              <span class="detail-value">${orderData.courier_service}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value">
                <span class="status-badge status-pending">Pending</span>
              </span>
            </div>
          </div>
          
          <div class="info-box">
            <p style="margin: 0; color: #6c757d;">
              <strong>📦 Action Required:</strong><br>
              Please prepare the order items and update the order status to "shipped" once you've dispatched the package.
            </p>
          </div>
        </div>
        <div class="email-footer">
          <p>© ${new Date().getFullYear()} Techaven. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getInvitationEmailTemplate = ({ owner_name, shop_name, registration_link }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${getEmailStyles()}
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>🎁 Shop Invitation</h1>
          <p>You're Invited!</p>
        </div>
        <div class="email-body">
          <div style="text-align: center;">
            <div class="icon">🏪</div>
            <h2 style="color: #333; margin-bottom: 15px;">Hello ${owner_name}!</h2>
            <p style="color: #6c757d; margin-bottom: 30px;">
              You have been invited to manage the shop <strong>"${shop_name}"</strong> on Techaven.
            </p>
          </div>
          
          <div class="info-box">
            <p style="margin: 0; color: #6c757d; text-align: center;">
              <strong>What's Next?</strong><br>
              Click the button below to accept the invitation and create your account.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${registration_link}" class="button">Accept Invitation & Register</a>
          </div>
          
          <p style="color: #6c757d; font-size: 14px; text-align: center; margin-top: 30px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
        <div class="email-footer">
          <p>© ${new Date().getFullYear()} Techaven. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

