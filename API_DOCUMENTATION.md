# TecHaven API Documentation — Mobile App Only

API reference for **Mobile App (Customer)** endpoints only. Grouping matches the Postman collection.

---

## Base URL & conventions

| Item | Value |
|------|--------|
| **Base URL** | `http://localhost:8000` (dev) / `https://api.techaven.mw` (prod) |
| **Prefix** | All endpoints under `/api` |
| **Content-Type** | `application/json` |
| **Auth** | Protected routes: `Authorization: Bearer <access_token>` |

### Response envelope

Every response is JSON:

```json
{
  "success": true,
  "message": "Human-readable description",
  "data": { ... }
}
```

- **success** — `true` or `false`
- **message** — string
- **data** — object, array, or `null` (e.g. on error)

---

## Table of contents

1. [Authentication](#1-authentication)
2. [User Management](#2-user-management)
3. [Products](#3-products)
4. [Categories](#4-categories)
5. [Cart](#5-cart)
6. [Orders](#6-orders)
7. [Wishlist](#7-wishlist)
8. [Shipping Addresses](#8-shipping-addresses)
9. [Wallet](#9-wallet)
10. [Payment Methods](#10-payment-methods)
11. [Notifications](#11-notifications)
12. [Shops](#12-shops)
13. [Search](#13-search)
14. [Help & Support](#14-help--support)
15. [App Info](#15-app-info)
16. [SMS](#16-sms)
17. [Webhooks](#17-webhooks)

---

## Mobile App (Customer APIs)

### 1. Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register customer (or seller with `invite_token`). Sends 4-digit OTP. |
| POST | `/api/auth/register-seller` | No | Self signup seller + shop (pending approval). Sends OTP. |
| POST | `/api/auth/login` | No | Login with email+password or phone_number+password. Returns `access_token`, `token_type`, `user` (includes `role`: customer \| seller \| admin). |
| POST | `/api/auth/send-login-otp` | No | Send 4-digit OTP for OTP login (verified users only). |
| POST | `/api/auth/verify-otp` | No | Verify OTP. `type`: `signup` \| `login` \| `password_reset`. Signup/login return token + user (includes `role`). |
| POST | `/api/auth/resend-otp` | No | Resend OTP. Body: `email` or `phone_number`, `type`. |
| POST | `/api/auth/forgot-password` | No | Send password-reset OTP. |
| POST | `/api/auth/reset-password` | No | Reset password. Body: `email` or `phone_number`, `otp`, `new_password`. |
| POST | `/api/auth/refresh-token` | No | New access token using `refresh_token`. |
| POST | `/api/auth/logout` | 🔒 | Logout (invalidate token). |

**Register (customer)**  
`POST /api/auth/register`
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone_number": "+265991234567",
  "password": "securePassword123"
}
```

**Login**  
`POST /api/auth/login`
```json
{ "email": "john@example.com", "password": "securePassword123" }
```
Or: `{ "phone_number": "+265991234567", "password": "securePassword123" }`

**Response (200):** `data` contains `access_token`, `token_type` ("Bearer"), and `user` object with: id, name, email, phone_number, avatar, is_verified, **role** (customer | seller | admin), member_since, created_at.

**Verify OTP** (4-digit)  
`POST /api/auth/verify-otp`
```json
{ "email": "john@example.com", "otp": "1234", "type": "signup" }
```

**Reset Password**  
`POST /api/auth/reset-password`
```json
{ "email": "john@example.com", "otp": "1234", "new_password": "newSecurePassword456" }
```

---

### 2. User Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/profile` | 🔒 | Get profile. Data: id, name, email, phone_number, avatar, is_verified, role, member_since, created_at. |
| PUT | `/api/user/profile` | 🔒 | Update profile. Body: name, email, phone_number (all optional). |
| POST | `/api/user/avatar` | 🔒 | Upload avatar (multipart/form-data, field `avatar`). |
| PUT | `/api/user/password` | 🔒 | Change password. |
| POST | `/api/user/change-password` | 🔒 | Change password (same as above). |
| DELETE | `/api/user/account` | 🔒 | Delete account. Body: password, reason. |

**Update Profile**  
`PUT /api/user/profile`
```json
{ "name": "John Smith", "email": "john@example.com", "phone_number": "+265991234567" }
```

**Change Password**  
`POST /api/user/change-password`
```json
{
  "current_password": "oldPassword123",
  "new_password": "newPassword456",
  "new_password_confirmation": "newPassword456"
}
```

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/user/profile` | User object |

```json
{
  "success": true,
  "message": "Profile retrieved",
  "data": {
    "id": 1,
    "name": "John Banda",
    "email": "john@example.com",
    "phone_number": "+265991234567",
    "avatar": "https://example.com/avatar.jpg",
    "is_verified": true,
    "role": "customer",
    "member_since": "January 2025",
    "created_at": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### 3. Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products` | No | List products. Query: category_id, min_price, max_price, sort (price_asc \| price_desc \| newest \| rating), per_page. |
| GET | `/api/products/:id` | No | Single product. |
| GET | `/api/products/featured` | No | Featured products. |
| GET | `/api/products/hot-sales` | No | Hot sales. |
| GET | `/api/products/special-offers` | No | Special offers. |
| GET | `/api/products/new-arrivals` | No | New arrivals. |
| GET | `/api/products/:product_id/reviews` | No | Product reviews. |
| POST | `/api/products/:product_id/reviews` | 🔒 | Add review. Body: rating, title, comment, images. |

**Response format (GET)**

All product list endpoints (`/api/products`, `/api/products/featured`, `/api/products/hot-sales`, `/api/products/special-offers`, `/api/products/new-arrivals`, `/api/products/category/:id`, `/api/shops/:id/products`, `/api/products/search`) return the same `data` shape: **array of product objects**.

Single product (`GET /api/products/:id`) returns one product object in `data`.

```json
{
  "success": true,
  "message": "Products retrieved",
  "data": [
    {
      "id": 1,
      "name": "MacBook Pro M3",
      "description": "Powerful laptop...",
      "price": 1500000,
      "original_price": 1800000,
      "discount": 17,
      "image": "https://...",
      "rating": 4.8,
      "total_reviews": 124,
      "stock": 15,
      "is_featured": true,
      "is_hot": true,
      "is_special": false,
      "category_id": 1,
      "shop_id": 1,
      "vendor": "TechShop Lilongwe",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

Product reviews (`GET /api/products/:product_id/reviews`): `data` is an array of review objects (e.g. `id`, `rating`, `title`, `comment`, `user`, `created_at`).

---

### 4. Categories

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/categories` | No | All categories. Data includes product_count. |
| GET | `/api/products/category/:id` | No | Products by category. |
| GET | `/api/categories/:id/products` | No | Products by category (alternate). |

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/categories` | Array of category objects |
| `GET /api/products/category/:id` | Array of product objects (same as Products) |

```json
{
  "success": true,
  "message": "Categories retrieved",
  "data": [
    {
      "id": 1,
      "name": "Laptops",
      "icon": "laptop",
      "color": "#4F46E5",
      "image": "https://...",
      "product_count": 12
    }
  ]
}
```

---

### 5. Cart

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cart` | 🔒 | Get cart. |
| POST | `/api/cart/items` | 🔒 | Add item. Body: product_id, quantity. |
| PUT | `/api/cart/items/:item_id` | 🔒 | Update quantity. |
| DELETE | `/api/cart/items/:item_id` | 🔒 | Remove item. |
| POST | `/api/cart/clear` | 🔒 | Clear cart. |

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/cart` | Cart object with items array (e.g. items with product_id, quantity, product details) |

```json
{
  "success": true,
  "message": "Cart retrieved",
  "data": {
    "items": [
      {
        "id": 1,
        "product_id": 3,
        "quantity": 2,
        "product": { "id": 3, "name": "...", "price": 150000, "image": "..." }
      }
    ],
    "total": 300000
  }
}
```

---

### 6. Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/orders` | 🔒 | Create order. Body: shipping_address_id, items[{ product_id, quantity }], notes. Or from cart (legacy). |
| GET | `/api/orders` | 🔒 | List my orders. |
| GET | `/api/orders/:order_id` | 🔒 | Single order. |
| POST | `/api/orders/:id/pay/wallet` | 🔒 | Pay with wallet. No body. Returns order + wallet_balance. |
| POST | `/api/orders/:id/pay/onekhusa` | 🔒 | Initiate OneKhusa payment. Returns payment_url, transaction_id, amount. |
| POST | `/api/orders/:id/cancel` | 🔒 | Cancel order (only when status is pending). No body. |
| POST | `/api/orders/:id/payment/complete` | 🔒 | Mark payment complete (escrow). Body: payment_reference, payment_proof. |
| POST | `/api/orders/:id/delivery/confirm` | 🔒 | Customer confirm delivery. |
| PATCH | `/api/orders/:id/status` | 🔒 Admin/Seller | Update status, payment_status, courier_tracking_number. |

**Create Order (API doc format)**  
`POST /api/orders`
```json
{
  "shipping_address_id": 1,
  "items": [
    { "product_id": 3, "quantity": 2 },
    { "product_id": 5, "quantity": 1 }
  ],
  "notes": "Please call before delivery"
}
```

Response data shape: id, order_number, status, payment_status (unpaid/paid), payment_method, subtotal, shipping_fee, total, shipping_address_id, items[], created_at.

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/orders` | Array of order objects |
| `GET /api/orders/:order_id` | Single order object |

```json
{
  "success": true,
  "message": "Orders retrieved",
  "data": [
    {
      "id": 1,
      "order_number": "ORD-20250115-0001",
      "status": "pending",
      "payment_status": "unpaid",
      "payment_method": null,
      "subtotal": 150000,
      "shipping_fee": 5000,
      "total": 155000,
      "shipping_address_id": 1,
      "items": [
        {
          "id": 1,
          "product_id": 3,
          "product_name": "Samsung Galaxy S24",
          "quantity": 1,
          "price": 150000,
          "subtotal": 150000
        }
      ],
      "created_at": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### 7. Wishlist

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/wishlist` | 🔒 | Get wishlist. |
| POST | `/api/wishlist` | 🔒 | Add product. Body: product_id. |
| DELETE | `/api/wishlist/:product_id` | 🔒 | Remove from wishlist. |

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/wishlist` | Array of wishlist/favorite items (e.g. product objects or { product_id, product } ) |

```json
{
  "success": true,
  "message": "Wishlist retrieved",
  "data": [
    {
      "id": 1,
      "product_id": 5,
      "product": { "id": 5, "name": "...", "price": 80000, "image": "..." }
    }
  ]
}
```

---

### 8. Shipping Addresses

All under `/api/shipping-addresses` (or `/api/addresses`). Data: id, label, name, phone, address, city, region, is_default.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/shipping-addresses` | 🔒 | List addresses (data = array). |
| POST | `/api/shipping-addresses` | 🔒 | Add address. |
| PUT | `/api/shipping-addresses/:id` | 🔒 | Update address. |
| DELETE | `/api/shipping-addresses/:id` | 🔒 | Delete address. |
| POST | `/api/shipping-addresses/:id/set-default` | 🔒 | Set as default. |

**Add Address**  
`POST /api/shipping-addresses`
```json
{
  "label": "Office",
  "name": "John Banda",
  "phone": "+265991234567",
  "address": "Kamuzu Procession Road",
  "city": "Blantyre",
  "region": "Southern Region",
  "is_default": false
}
```

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/shipping-addresses` | Array of address objects (direct array, not paginated) |

```json
{
  "success": true,
  "message": "Addresses retrieved",
  "data": [
    {
      "id": 1,
      "label": "Home",
      "name": "John Banda",
      "phone": "+265991234567",
      "address": "Plot 23, Area 49",
      "city": "Lilongwe",
      "region": "Central Region",
      "is_default": true
    }
  ]
}
```

---

### 9. Wallet

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/wallet` | 🔒 | Wallet summary (balance, etc.). |
| GET | `/api/wallet/balance` | 🔒 | Balance only. Data: { balance, currency }. |
| GET | `/api/wallet/transactions` | 🔒 | Transactions. Data: array of { id, type, amount, description, status, created_at }. |
| POST | `/api/wallet/topup` | 🔒 | Initiate top-up. Body: { amount }. Returns payment_url, transaction_id, amount. |

**Top Up**  
`POST /api/wallet/topup`
```json
{ "amount": 100000 }
```

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/wallet` | Wallet object (balance, currency, optional available_balance, pending_escrow for sellers) |
| `GET /api/wallet/balance` | `{ balance, currency }` |
| `GET /api/wallet/transactions` | Array of transaction objects |

```json
{
  "success": true,
  "message": "Balance retrieved",
  "data": {
    "balance": 500000,
    "currency": "MWK"
  }
}
```

```json
{
  "success": true,
  "message": "Transactions retrieved",
  "data": [
    {
      "id": 1,
      "type": "credit",
      "amount": 100000,
      "description": "Wallet top-up",
      "status": "completed",
      "created_at": "2025-01-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "type": "debit",
      "amount": 155000,
      "description": "Order ORD-20250115-0001",
      "status": "completed",
      "created_at": "2025-01-15T11:00:00.000Z"
    }
  ]
}
```

---

### 10. Payment Methods

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payment-methods` | 🔒 | List payment methods. |
| POST | `/api/payment-methods` | 🔒 | Add payment method. |
| DELETE | `/api/payment-methods/:id` | 🔒 | Delete payment method. |

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/payment-methods` | Array of payment method objects (e.g. id, type, provider, phone_number, is_default) |

```json
{
  "success": true,
  "message": "Payment methods retrieved",
  "data": [
    {
      "id": 1,
      "type": "mobile_money",
      "provider": "Airtel Money",
      "phone_number": "+265991234567",
      "is_default": true
    }
  ]
}
```

---

### 11. Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | 🔒 | List notifications. Each: id, title, body, type, is_read, time_ago, created_at. |
| GET | `/api/notifications/unread-count` | 🔒 | Unread count. Data: { count }. |
| POST | `/api/notifications/:id/read` | 🔒 | Mark one as read. |
| POST | `/api/notifications/mark-all-read` | 🔒 | Mark all as read. (Also: /read-all) |
| DELETE | `/api/notifications/:id` | 🔒 | Delete notification. |
| POST | `/api/notifications/register-device` | 🔒 | Register device for push. Body: device_token, platform. |

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/notifications` | Array of notification objects |
| `GET /api/notifications/unread-count` | `{ count }` |

```json
{
  "success": true,
  "message": "Notifications retrieved",
  "data": [
    {
      "id": 1,
      "title": "Order Confirmed",
      "body": "Your order ORD-001 has been confirmed.",
      "type": "order",
      "is_read": false,
      "time_ago": "2 hours ago",
      "created_at": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

```json
{
  "success": true,
  "message": "Unread count retrieved",
  "data": { "count": 3 }
}
```

---

### 12. Shops

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/shops` | No | List shops. |
| GET | `/api/shops/:id` | No | Shop details. |
| GET | `/api/shops/:id/products` | No | Shop products. |

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/shops` | Array of shop objects |
| `GET /api/shops/:id` | Single shop object |
| `GET /api/shops/:id/products` | Array of product objects (same as Products) |

```json
{
  "success": true,
  "message": "Shops retrieved",
  "data": [
    {
      "id": 1,
      "name": "TechShop Lilongwe",
      "description": "Best tech store...",
      "logo": "https://...",
      "banner": "https://...",
      "rating": 4.7,
      "total_reviews": 89,
      "location": "Area 3, Lilongwe",
      "phone": "+265991234567",
      "email": "techshop@example.com",
      "is_verified": true
    }
  ]
}
```

---

### 13. Search

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products/search?q=...&category_id=...` | No | Search products. `q` required. |
| GET | `/api/search?q=...` | No | Search (alternate). |
| GET | `/api/search/suggestions?q=...` | No | Search suggestions. |

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/products/search?q=...` | Array of product objects (same as Products) |
| `GET /api/search?q=...` | Search results (products/list depending on implementation) |
| `GET /api/search/suggestions?q=...` | Array of suggestion strings or objects |

```json
{
  "success": true,
  "message": "Products retrieved",
  "data": [ /* product objects */ ]
}
```

---

### 14. Help & Support

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/help/topics` | No | Help topics. |
| GET | `/api/help/faqs` | No | FAQs. |
| POST | `/api/help/tickets` | 🔒 | Submit ticket. Body: subject, category, message, order_id, attachments. |

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/help/topics` | Array of help topic objects (e.g. id, title, slug, articles) |
| `GET /api/help/faqs` | Array of FAQ objects (e.g. id, question, answer, category) |

```json
{
  "success": true,
  "message": "Help topics retrieved",
  "data": [
    { "id": 1, "title": "Orders", "slug": "orders", "articles": [] }
  ]
}
```

---

### 15. App Info

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/app/info` | No | App info (version, terms, privacy, support). |

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/app/info` | App info object (version, terms_url, privacy_url, support_email, support_phone, etc.) |

```json
{
  "success": true,
  "message": "App info retrieved",
  "data": {
    "version": "1.0.0",
    "terms_url": "https://...",
    "privacy_url": "https://...",
    "support_email": "support@techaven.mw",
    "support_phone": "+265..."
  }
}
```

---

### 16. SMS

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/sms/send` | 🔒 | Send SMS. Body: phone, message. |
| GET | `/api/sms/balance` | 🔒 | SMS gateway balance. |

**Send SMS**  
`POST /api/sms/send`
```json
{ "phone": "+265991234567", "message": "Your OTP is 1234" }
```

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/sms/balance` | `{ balance, currency }` (SMS gateway credits) |

```json
{
  "success": true,
  "message": "SMS balance retrieved",
  "data": { "balance": 150, "currency": "credits" }
}
```

---

### 17. Webhooks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/webhooks/onekhusa` | No | OneKhusa payment callback. Body: transaction_id, status, amount, reference (ORDER-{id} or TOPUP-{userId}). |

**OneKhusa webhook payload**
```json
{
  "transaction_id": "TXN-12345",
  "status": "success",
  "amount": 155000,
  "reference": "ORDER-1"
}
```

---

## HTTP status codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation / invalid OTP |
| 401 | Unauthenticated |
| 403 | Forbidden / account not verified |
| 404 | Not found |
| 422 | Validation error |
| 500 | Server error |

---

## Postman collection

Import **Techaven_API.postman_collection.json** for the same grouping and example requests. Set `base_url` (e.g. `http://localhost:8000`) and `access_token` for protected routes.
