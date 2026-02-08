# Escrow-Based Order Management System

## Overview

This system implements an escrow-based payment flow where customer payments are held by the admin until delivery confirmation. Funds are never sent directly from customer to seller.

## Key Features

1. **Order Creation with Courier Selection**
   - Customers must select a courier service when placing an order
   - Shipping details are automatically shared with the selected courier
   - System identifies the seller(s) from the products in the cart

2. **Payment Flow**
   - When payment is completed, funds are held in escrow by the admin
   - Both admin and seller are automatically notified
   - Customer receives confirmation that payment was received

3. **Delivery Management**
   - Admin can view all orders and manage delivery
   - Admin can update order status and add courier tracking numbers
   - Shipping details are available to admin for delivery coordination

4. **Fund Release**
   - Funds are only released to seller after customer confirms delivery
   - Customer must explicitly confirm delivery to trigger fund release
   - Automatic notifications are sent to all parties when funds are released

## Database Changes

### New Migration
Run the migration file: `database/migrations/add_escrow_to_orders.sql`

This adds:
- `courier_service` - Selected courier service name
- `courier_tracking_number` - Tracking number from courier
- `seller_id` - Seller user ID
- `escrow_status` - Status of escrow funds (pending, held, released, refunded)
- `escrow_amount` - Amount held in escrow (seller portion)
- `delivery_confirmed_at` - When customer confirmed delivery
- `funds_released_at` - When funds were released to seller

### New Tables
- `escrows` - Tracks all escrow transactions

## API Endpoints

### Order Creation (Updated)
**POST** `/api/orders`

New required field:
- `courier_service` - Name of the courier service

Example:
```json
{
  "shipping_address_id": 1,
  "payment_method_id": "mobile_money",
  "courier_service": "DHL Express",
  "notes": "Please handle with care"
}
```

### Payment Completion
**POST** `/api/orders/:order_id/payment/complete`

Completes payment and holds funds in escrow. Requires authentication.

Body:
```json
{
  "payment_reference": "TXN123456",
  "payment_proof": "url_to_proof_image"
}
```

### Delivery Confirmation
**POST** `/api/orders/:order_id/delivery/confirm`

Customer confirms delivery and releases escrow funds to seller. Requires authentication (customer only).

### Admin Order Management
**GET** `/api/admin/orders` - View all orders with full details
**PATCH** `/api/admin/orders/:id/status` - Update order status and courier tracking

Body:
```json
{
  "status": "shipped",
  "courier_tracking_number": "TRACK123456"
}
```

## Workflow

1. **Customer places order**
   - Selects courier service
   - Shipping details submitted
   - Order created with `escrow_status: 'pending'`

2. **Payment completed**
   - Customer completes payment
   - System calls `/api/orders/:order_id/payment/complete`
   - Funds moved to admin escrow wallet
   - `escrow_status` changed to `'held'`
   - Admin and seller notified

3. **Admin manages delivery**
   - Admin views order with shipping details
   - Admin updates status to 'shipped' and adds tracking number
   - Admin updates status to 'delivered' when delivered

4. **Customer confirms delivery**
   - Customer calls `/api/orders/:order_id/delivery/confirm`
   - Funds released from admin wallet to seller wallet
   - `escrow_status` changed to `'released'`
   - All parties notified

## Notifications

The system automatically sends notifications for:
- Order placed (customer, admin)
- Payment received (customer, admin, seller)
- Order shipped (customer)
- Order delivered (customer)
- Delivery confirmed (customer, seller, admin)
- Funds released (seller, admin)

## Security Notes

- Payment completion endpoint currently requires authentication
- For production, consider adding a webhook endpoint with secret key validation
- All escrow transactions are logged in audit logs
- Wallet transactions track all fund movements

## Multi-Seller Orders

Currently, the system handles single-seller orders (uses first seller from cart).
For multi-seller scenarios, consider:
- Creating separate orders per seller
- Using order items to track seller-specific amounts
- Creating multiple escrow records per order

