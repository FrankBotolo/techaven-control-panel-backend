# API Changes Summary - Techaven Mobile Customer API

This document summarizes all the changes made to align the API with the Techaven API documentation specification.

## Base URL
- Updated from `http://localhost:8000` to `https://api.techaven.mw`

## Authentication Endpoints

### Added Endpoints
1. **POST /api/auth/refresh-token** - Refresh access token using refresh token
2. **POST /api/auth/logout** - Logout and invalidate tokens

### Updated Endpoints
1. **POST /api/auth/login** - Now returns `accessToken`, `refreshToken`, and `sessionId`
2. **POST /api/auth/verify-otp** - Updated response format for password_reset type to return `reset_token`
3. **POST /api/auth/reset-password** - Now uses `reset_token` instead of OTP directly

## User Management Endpoints

### Added Endpoints
1. **DELETE /api/user/account** - Delete user account (requires password)

### Updated Endpoints
1. **PUT /api/user/password** - Changed from POST to PUT
2. **GET /api/user/profile** - Updated response format with `usr_` prefixed IDs
3. **PUT /api/user/profile** - Updated request/response format (uses `full_name` and `phone`)

## Cart Endpoints

### Updated Routes
1. **POST /api/cart/items** - Changed from POST /api/cart
2. **PUT /api/cart/items/:item_id** - Changed from PUT /api/cart/:id
3. **DELETE /api/cart/items/:item_id** - Changed from DELETE /api/cart/:id

### Updated Response Format
- Cart items now use `item_` prefixed IDs
- Response includes `cart_id`, `summary` with `subtotal`, `discount`, `shipping`, `tax`, `total`, `currency`
- Items include `is_available` field

## Orders Endpoints

### Updated Routes
1. **POST /api/orders** - Changed from POST /api/orders/checkout
2. **GET /api/orders/:order_id** - Changed from GET /api/orders/:id
3. **POST /api/orders/:order_id/cancel** - Changed from POST /api/orders/:id/cancel

### Updated Request Format
- Now uses `shipping_address_id` and `payment_method_id` instead of direct address fields
- Supports `coupon_code` parameter

### Updated Response Format
- Order IDs use `ord_` prefix
- Order numbers use `TH-YYYY-####` format
- Includes `payment_url` in response

## Wishlist Endpoints

### Route Changes
1. **GET /api/wishlist** - Changed from /api/favorites
2. **POST /api/wishlist** - Changed from /api/favorites
3. **DELETE /api/wishlist/:product_id** - Changed from /api/favorites/:productId

### Updated Response Format
- Wishlist items use `wish_` prefixed IDs
- Response structure matches documentation format

## New Endpoints Added

### Wallet
- **GET /api/wallet** - Get wallet balance
- **GET /api/wallet/transactions** - Get wallet transactions
- **POST /api/wallet/topup** - Top up wallet

### Shipping Addresses
- **GET /api/addresses** - Get all addresses
- **POST /api/addresses** - Add new address
- **PUT /api/addresses/:address_id** - Update address
- **DELETE /api/addresses/:address_id** - Delete address
- **POST /api/addresses/:address_id/default** - Set default address

### Payment Methods
- **GET /api/payment-methods** - Get payment methods
- **POST /api/payment-methods** - Add payment method
- **DELETE /api/payment-methods/:payment_method_id** - Delete payment method

### Search
- **GET /api/search** - Search products (moved from /api/products/search)
- **GET /api/search/suggestions** - Get search suggestions

### Help & Support
- **GET /api/help/topics** - Get help topics
- **GET /api/help/faqs** - Get FAQs
- **POST /api/help/tickets** - Submit support ticket

### App Info
- **GET /api/app/info** - Get app information

### Products
- **GET /api/products/new-arrivals** - Get new arrival products
- **GET /api/products/:product_id/reviews** - Get product reviews
- **POST /api/products/:product_id/reviews** - Add product review

### Notifications
- **POST /api/notifications/register-device** - Register device for push notifications
- **POST /api/notifications/read-all** - Changed from /api/notifications/mark-all-read
- **POST /api/notifications/:notification_id/read** - Changed parameter name

## Response Format Standardization

All endpoints now follow the standard response format:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error message",
  "errors": { ... }
}
```

## ID Format Changes

- User IDs: `usr_123456`
- Order IDs: `ord_789`
- Cart Item IDs: `item_456`
- Wishlist IDs: `wish_123`
- Address IDs: `addr_123`
- Payment Method IDs: `pm_456`
- Transaction IDs: `txn_123`
- Ticket IDs: `tkt_123`
- Review IDs: `rev_123`

## Currency

All monetary values are in **Malawian Kwacha (MWK)** and represented as integers (no decimals).

## Notes

1. Some endpoints (wallet, addresses, payment methods) have basic implementations and need database models/tables to be fully functional.
2. Product reviews functionality needs a Review model to be implemented.
3. Shipping address integration in orders needs to be completed.
4. Payment integration URLs are placeholders and need actual payment gateway integration.

## Next Steps

1. Create database models for:
   - Wallet/Transactions
   - Shipping Addresses
   - Payment Methods
   - Product Reviews
   - Device Tokens (for push notifications)

2. Implement full functionality for:
   - Wallet transactions
   - Address management
   - Payment method management
   - Product reviews and ratings
   - Search suggestions and filters
   - Help topics and FAQs

3. Update Postman collection with all new endpoints and examples

