# TecHaven API Documentation

API reference for **Mobile App (Customer)** and **Admin** endpoints. Grouping matches the Postman collection.

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

**Mobile App**
- [0. Onboarding](#0-onboarding)
- [1. Authentication](#1-authentication)
- [2. User Management](#2-user-management)
- [2b. Loyalty points & redemption](#2b-loyalty-points--redemption)
- [3. Products](#3-products)
- [4. Categories](#4-categories)
- [5. Cart](#5-cart)
- [6. Orders](#6-orders)
- [7. Wishlist](#7-wishlist)
- [8. Shipping Addresses](#8-shipping-addresses)
- [9. Wallet](#9-wallet)
- [10. Payment Methods](#10-payment-methods)
- [11. Notifications](#11-notifications)
- [12. Shops](#12-shops)
- [12b. Banners](#12b-banners)
- [13. Search](#13-search)
- [14. Help & Support](#14-help--support)
- [15. App Info](#15-app-info)
- [15b. Platform settings (public)](#15b-platform-settings-public)
- [16. SMS](#16-sms)
- [17. Webhooks](#17-webhooks)
- [User subscription access (per user)](#user-subscription-access-per-user)
- [Seller — Shop subscription](#seller--shop-subscription)
- [Seller — Shop storefront](#seller--shop-storefront)

**Admin APIs**
- [Admin - Onboarding Slides](#admin---onboarding-slides)
- [Admin - Banners](#admin---banners)
- [Admin - Platform settings](#admin---platform-settings)
- [Admin - Audit Logs](#admin---audit-logs)

---

## Mobile App (Customer APIs)

### 0. Onboarding

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/onboarding/slides` | No | Get onboarding carousel slides. Returns active slides ordered by order_index. |

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Welcome",
      "description": "Discover amazing products...",
      "image_url": "https://...",
      "order_index": 0,
      "is_active": true,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

---

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
| POST | `/api/auth/refresh-token` | No | New access + refresh tokens. **`data`** includes **`shop_id`** (null for non-sellers). |
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

**Response (200):** `data` contains `access_token`, `token_type` ("Bearer"), and `user` object with: id, name, email, phone_number, avatar, is_verified, **role** (customer | seller | admin), **`shop_id`** (integer or `null` — set for assigned sellers), member_since, created_at. The same **`user`** shape (including **`shop_id`**) is returned for **`verify-otp`** when `type` is `signup` or `login`.

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
| GET | `/api/user/profile` | 🔒 | Get profile. Data: id, name, email, phone_number, avatar, is_verified, role, **`shop_id`**, **`points`** (total loyalty points), member_since, created_at. |
| PUT | `/api/user/profile` | 🔒 | Update profile. Body: name, email, phone_number (all optional). Response includes **`points`** (total loyalty points), same shape as GET. |
| POST | `/api/user/avatar` | 🔒 | Upload avatar (multipart/form-data, field `avatar`). |
| PUT | `/api/user/password` | 🔒 | Change password. |
| POST | `/api/user/change-password` | 🔒 | Change password (same as above). |
| DELETE | `/api/user/account` | 🔒 | Delete account. Body: password, reason. |
| GET | `/api/user/points/balances` | 🔒 | Loyalty point balances **per shop** (and general bucket). See [2b. Loyalty points](#2b-loyalty-points--redemption). |
| POST | `/api/user/points/redeem` | 🔒 | Redeem points → credit **MWK** to wallet. Body: `shop_id`, `points`. See [2b. Loyalty points](#2b-loyalty-points--redemption). |

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
    "points": 120,
    "member_since": "January 2025",
    "created_at": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### 2b. Loyalty points & redemption

Customers earn points when orders are completed (from each product’s optional `points` field × quantity). Points are stored **per shop** (`shop_id` from the product) so each seller can set their own **MWK per point** redemption rate. Older balances that only existed on `users.points` are synced into a **general** bucket: **`shop_id` `0`**.

**Seller rate (MWK per 1 point)** — `PATCH /api/sellers/:shopId/shop` with body field **`points_mwk_per_point`** (non-negative number). Send **`null`** to disable redemption for that shop’s bucket. See [Seller — Shop storefront](#seller--shop-storefront).

**General / legacy bucket (`shop_id` 0)** — redemption uses **`default_points_mwk_per_point`** from [platform settings](#admin---platform-settings) (admin) and [public platform settings](#15b-platform-settings-public).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/points/balances` | 🔒 | `data.total_points`, `data.currency` (`MWK`), `data.balances[]`: `shop_id`, `shop_name`, `points`, `points_mwk_per_point` (null if not configured), `redeemable_mwk_estimate`. |
| POST | `/api/user/points/redeem` | 🔒 | Body: **`shop_id`** (integer; use **`0`** for the general/legacy bucket), **`points`** (positive integer). Deducts points and credits the user’s wallet in MWK. Creates a completed wallet transaction. |

**Redeem**  
`POST /api/user/points/redeem`
```json
{ "shop_id": 3, "points": 100 }
```

**Redeem response (example)**
```json
{
  "success": true,
  "message": "Points redeemed to wallet",
  "data": {
    "points_redeemed": 100,
    "mwk_credited": 2500,
    "currency": "MWK",
    "wallet_balance": 502500,
    "remaining_points": 20
  }
}
```

**Errors (examples)** — `400` if insufficient points for that bucket, if the shop has not set **`points_mwk_per_point`**, or if **`shop_id` 0** is used but **`default_points_mwk_per_point`** is not set.

---

### 3. Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products` | No | List products. Query: page, limit (or per_page), category_id, min_price, max_price, sort (price_asc \| price_desc \| newest \| rating). Client filters featured/hot/new/special from the list. |
| GET | `/api/products/:id` | No | Single product (same product object shape as list items). |
| GET | `/api/products/search` | No | Search products. Query: **q** (required), page, limit, category_id. Same paginated response as `GET /api/products`. |
| GET | `/api/products/:product_id/reviews` | No | Product reviews. |
| POST | `/api/products/:product_id/reviews` | 🔒 | Add review. Body: rating, title, comment, images. |

**Response format (GET)**

`GET /api/products` returns paginated products with `data.products` (array) and `data.pagination`:

```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [
      {
        "id": 1,
        "name": "MacBook Pro M3",
        "description": "Powerful laptop...",
        "price": 1500000,
        "original_price": 1800000,
        "discount_percentage": 17,
        "currency": "MWK",
        "images": ["https://..."],
        "rating": 4.8,
        "total_reviews": 124,
        "stock": 15,
        "is_featured": true,
        "is_new_arrival": false,
        "is_hot_sale": true,
        "is_special_offer": false,
        "category_id": 1,
        "category_name": "Laptops",
        "shop_id": 1,
        "shop_name": "Tech Haven",
        "vendor_name": "TechShop Lilongwe",
        "variants": [],
        "created_at": "2025-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 30,
      "total_items": 450,
      "total_pages": 15,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

`GET /api/products/category/:id`, `GET /api/categories/:id/products`, `GET /api/shops/:id/products`, and `GET /api/products/search` use the same paginated shape: `data.products` + `data.pagination`.

**Seller create/update product (POST/PATCH `/api/sellers/:shopId/products`)** — optional **`points`** (loyalty points the buyer earns per unit sold; see [2b. Loyalty points](#2b-loyalty-points--redemption)); optional `variants` array, each group: `type`, `name`, `options[]` with `value`, `label`, `price_modifier`, `stock`, optional `image`. Use `is_hot_sale` / `is_special_offer` (or legacy `is_hot` / `is_special`), optional `is_new_arrival`.

Single product (`GET /api/products/:id`) returns one product object in `data`.

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
| `GET /api/products/category/:id` | Paginated products (`data.products` + `data.pagination`) |

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
| GET | `/api/orders/mine/paid` | 🔒 | List my orders with **payment_status = paid** (mobile). |
| GET | `/api/orders/:order_id` | 🔒 | Single order. |
| POST | `/api/orders/:id/pay/wallet` | 🔒 | Pay with wallet. No body. Returns order + wallet_balance. |
| POST | `/api/orders/:id/pay/airtel` | 🔒 | Initiate a direct Airtel Money Collection push. Body: **`msisdn`**. Customer confirms on their phone → **`POST /api/webhooks/airtel`** marks the order paid (see `docs/AIRTEL_WEBHOOK.md`). |
| POST | `/api/orders/:id/pay/paychangu` | 🔒 | Confirm Pay Changu after checkout. Body: **`tx_ref`** (server verifies with Pay Changu, then marks paid + escrow). |
| POST | `/api/orders/:id/cancel` | 🔒 | Cancel order (only when status is pending). No body. |
| POST | `/api/orders/:id/payment/complete` | 🔒 | Mark payment complete (escrow). Body: payment_reference, payment_proof. |
| POST | `/api/orders/:id/delivery/confirm` | 🔒 | Customer confirm delivery (order must already be **delivered**). Optional body: **`file_url`** / **`proof_url`** / **`delivery_proof_url`** — URL of uploaded proof (photo/PDF). |
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

Response data shape: id, order_number, status, payment_status (unpaid/paid), payment_method, subtotal, shipping_fee, total, shipping_address_id, items[], created_at, plus **paid_at**, **escrow_status**, **courier_tracking_number**, **delivery_confirmed_at**, **delivery_confirmation_proof_url** when present.

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
| GET | `/api/wallet/transactions` | 🔒 | Transactions. Data: array of { id, type, amount, description, status, created_at }. Credits may include **loyalty point redemptions** (see [2b. Loyalty points](#2b-loyalty-points--redemption)). |
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
| GET | `/api/payment-methods` | 🔒 | Lists mobile-money options in **`data.available_providers`** (`id`, `name`, `slug`, `psp_id`, `provider`, …) — Airtel Money only. **Customer orders** use **`POST .../orders/:id/pay/airtel`** (direct Airtel push) or Pay Changu checkout + **`POST .../orders/:id/pay/paychangu`** with **`tx_ref`**. **Seller subscriptions** use **`POST .../subscription/pay/paychangu`**. |
| POST | `/api/payment-methods` | 🔒 | Add payment method (stub). |
| DELETE | `/api/payment-methods/:id` | 🔒 | Delete payment method (stub). |

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/payment-methods` | `{ payment_methods: [], available_providers: [{ id, name, slug, psp_id, provider, icon }, ...] }` |

```json
{
  "success": true,
  "message": "Payment methods retrieved",
  "data": {
    "payment_methods": [],
    "available_providers": [
      { "id": 1, "name": "Airtel Money", "slug": "airtel", "psp_id": 1, "provider": "airtel", "icon": "airtel" }
    ]
  }
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
| GET | `/api/shops/:id` | No | Shop details. Includes **`points_mwk_per_point`** (MWK per loyalty point when redeeming that shop’s bucket; `null` if disabled). |
| GET | `/api/shops/:id/products` | No | Shop products. |

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/shops` | Array of shop objects |
| `GET /api/shops/:id` | Single shop object |
| `GET /api/shops/:id/products` | Paginated products (`data.products` + `data.pagination`) |

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
      "is_verified": true,
      "points_mwk_per_point": 25
    }
  ]
}
```

`GET /api/shops/:id` returns the same fields as list items where applicable, plus **`followers_count`**, optional **`is_following`** (when authenticated), and **`points_mwk_per_point`**.

---

### 12b. Banners

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/banners` | No | Get homepage banner carousel. |

**Response**
```json
{
  "success": true,
  "message": "Banners retrieved",
  "data": [
    {
      "id": 1,
      "title": "Summer Sale",
      "image": "https://...",
      "link": null,
      "is_active": true
    }
  ]
}
```

---

### 13. Search

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products/search?q=...&category_id=...&page=...&limit=...` | No | Search products. `q` required. Paginated: `data.products` + `data.pagination`. |
| GET | `/api/search?q=...` | No | Search (alternate). |
| GET | `/api/search/suggestions?q=...` | No | Search suggestions. |

**Response format (GET)**

| Endpoint | `data` shape |
|----------|----------------|
| `GET /api/products/search?q=...` | Paginated products (same shape as `GET /api/products`) |
| `GET /api/search?q=...` | Search results (products/list depending on implementation) |
| `GET /api/search/suggestions?q=...` | Array of suggestion strings or objects |

Same response as `GET /api/products` (see section 3).

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

### 15b. Platform settings (public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/platform-settings` | No | **`data.seller_commission_percent`**, **`data.default_points_mwk_per_point`** (MWK per point for the **general** loyalty bucket `shop_id` 0; `null` if not set). |

```json
{
  "success": true,
  "data": {
    "seller_commission_percent": 5,
    "default_points_mwk_per_point": 10
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
| POST | `/api/webhooks/paychangu` | No | Pay Changu **dashboard** webhook (JSON body + **`Signature`** HMAC). Uses **`tx_ref`** / **`charge_id`**, verifies via Pay Changu API, then marks **order** or **subscription** paid when **`meta`** matches. Returns **200**. |
| GET | `/api/webhooks/paychangu/callback` | No | Pay Changu **browser return** URL (query: **`status`**, **`tx_ref`**, …). Same verify + finalize logic as POST webhook. |
| POST | `/api/webhooks/airtel` | No | Direct Airtel Money Collection callback (see `docs/AIRTEL_WEBHOOK.md`). Resolves **`reference`** to an **order** or an encoded **`SUB-{subscription_id}`** shop-subscription ref; on success (`status_code: "TS"`) marks the order/subscription **paid**. Verified via **`x-airtel-signature`** HMAC when **`AIRTEL_WEBHOOK_SECRET`** is set. Every call is logged to `airtel_transactions` regardless of outcome. **`WEBHOOK_CAPTURE_ONLY=true`** skips processing. |

**Airtel webhook — order payment (example)**  
After `POST /api/orders/:id/pay/airtel`, Airtel echoes the reference sent as `reference` (the order's `order_number`):
```json
{
  "transaction": { "id": "CI250722.1344.B0AE1B", "status_code": "TS", "message": "Paid MWK 5000" },
  "reference": "ORD-000123",
  "amount": "5000"
}
```

After this, **`GET /api/sellers/:shopId/subscription`** (or pay response **`data.subscription`**) shows **`subscribed: true`** only when **`status: active`**, **`payment_status: paid`**, and **`current_period_end`** is still in the future (`effective_status` becomes **`expired`** when the period date has passed).

---

## User subscription access (per user)

Separate from **shop subscription** (seller plans) below. Plans still come from **`subscription_packages`**, but access is stored per **`users.id`** in **`user_subscriptions`** with payments in **`subscription_payments`**. See **`SUBSCRIPTION_API.md`** and **`docs/SUBSCRIPTION_ACCESS_ARCHITECTURE.md`**.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/plans` | No | Active plans as **`data.plans`**: `{ id, name, price, duration, features }` (`price` MWK, `duration` days). |
| POST | `/api/subscribe` | 🔒 Seller or admin | Body: **`planId`**, **`method`** (e.g. `simulated`). **User id from JWT only** — do not rely on body `userId` for access control. Flow: **`pending`** payment → provider (simulated; configurable failure via env) → on success **extend or create** **`active`** subscription with **`end_date`**. **402** if payment **`failed`**. |
| GET | `/api/subscription/transactions` | 🔒 Seller or admin | **`data.transactions`** + **`data.pagination`**. Sellers see only their rows; admins see all, with optional **`?user_id=`**, **`status=`**, **`plan_id=`**, **`from=`**, **`to=`**, **`page=`**, **`limit=`** (max 100). |
| GET | `/api/subscription/status/:userId` | 🔒 | **`data.has_access`** + **`data.subscription`** if **`active`** and **`end_date` > now. Only **`userId`** = self or **admin**. |
| GET | `/api/subscription/ping` | 🔒 + active user subscription | Example gated endpoint; **403** without valid subscription. |

**Environment:** `SUBSCRIPTION_PAYMENT_SIMULATE_FAILURE=true` forces simulated decline; `SUBSCRIPTION_EXPIRY_CRON` sets cron for daily expiry updates.

---

## Seller — Shop subscription

Seller **JWT**, **approved shop**. `:shopId` must equal the authenticated user’s **`shop_id`**. Full detail: `docs/SUBSCRIPTION_PACKAGES.md`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/subscription-packages` | No | Public catalog of plans (MWK, features). |
| GET | `/api/sellers/:shopId/subscription` | 🔒 Seller | **`data.subscription`** + **`recent_subscriptions`** + **`paychangu_payment_options`**. See **Subscription object** below. |
| POST | `/api/sellers/:shopId/subscription/subscribe` | 🔒 Seller | Body: `package_id`, optional `replace_existing`, `payment_reference`, `auto_renew`. New row is **pending** until Pay Changu confirms unless **`SUBSCRIPTION_AUTO_ACTIVATE=true`** (dev only) or non-empty **`payment_reference`**; response includes **`paychangu_payment_options`** when awaiting payment. |
| POST | `/api/sellers/:shopId/subscription/pay/paychangu` | 🔒 Seller | Body: **`subscription_id`**, **`package_id`**, **`tx_ref`**. Server re-verifies **`tx_ref`** with Pay Changu, checks it matches this subscription/amount, then activates on success. On **HTTP 200**, **`data`** includes the latest **`subscription`** object. |
| POST | `/api/sellers/:shopId/subscription/cancel` | 🔒 Seller | Body: optional `immediately`. |
| POST | `/api/sellers/:shopId/subscription/resume` | 🔒 Seller | Undo cancel-at-period-end. |

**Subscription object** (`data.subscription` and items in `recent_subscriptions`)

| Field | Meaning |
|-------|---------|
| `status` | Stored status (`pending_payment`, `active`, `canceled`, …). |
| `effective_status` | May become `expired` when past `current_period_end` even if DB `status` is still `active`. |
| `payment_status` | `pending` \| `paid` \| `failed` \| `refunded`. |
| **`subscribed`** | **`true`** only when **`status`** is **`active`**, **`payment_status`** is **`paid`**, and the period end date has not passed. |
| `package` | Plan details (`price_mwk`, features, …). |

**Typical Pay Changu flow (seller subscription)**

1. Do not set **`SUBSCRIPTION_AUTO_ACTIVATE=true`** in production (leave unset so subscribe stays pending until payment).
2. Subscribe → **`subscription.id`** + **`pending_payment`** + **`paychangu_payment_options`**.
3. Client completes payment with the Pay Changu SDK, then calls **`pay/paychangu`** with the resulting **`tx_ref`** → server verifies with Pay Changu and, on success, sets **`active`** + **`paid`** and returns **`data.subscription.subscribed: true`**.

---

### Seller — Shop storefront

Seller **JWT**, **approved shop**. `:shopId` must equal the authenticated user’s **`shop_id`**.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PATCH | `/api/sellers/:shopId/shop` | 🔒 Seller | Update storefront: **`name`** / **`shop_name`**, **`description`**, **`location`**, **`address`**, **`phone`**, **`email`**, **`logo`** / **`logo_url`**, **`images`**, **`points_mwk_per_point`**. The last is **MWK credited per 1 loyalty point** when a customer redeems points from **this shop’s** balance; send **`null`** or **`""`** to disable. Does **not** change `status`, `application_status`, or verification fields (admin only). |

**Example — set redemption rate**
```json
{ "points_mwk_per_point": 50 }
```

---

## Admin APIs

All admin endpoints require `Authorization: Bearer <access_token>` and user role `admin`.

### Admin - Onboarding Slides

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/onboarding-slides` | List all slides |
| GET | `/api/admin/onboarding-slides/:id` | Get one slide |
| POST | `/api/admin/onboarding-slides` | Create slide. Body: title, image_url (required); description, order_index, is_active |
| PATCH | `/api/admin/onboarding-slides/:id` | Update slide |
| DELETE | `/api/admin/onboarding-slides/:id` | Delete slide |

---

### Admin - Banners

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/banners` | List all banners |
| GET | `/api/admin/banners/:id` | Get one banner |
| POST | `/api/admin/banners` | Create banner. Body: image (required); title, product_id |
| PATCH | `/api/admin/banners/:id` | Update banner |
| DELETE | `/api/admin/banners/:id` | Delete banner |

---

### Admin - Platform settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/platform-settings` | Current row: **`seller_commission_percent`**, **`default_points_mwk_per_point`** (MWK per loyalty point for **general** bucket `shop_id` 0; `null` if disabled), **`updated_at`**. |
| PATCH | `/api/admin/platform-settings` | Partial update. Send **`seller_commission_percent`** (0–100) and/or **`default_points_mwk_per_point`** (non-negative number, or **`null`** to disable general-bucket redemption). At least one field required. |

**PATCH example (general loyalty rate only)**
```json
{ "default_points_mwk_per_point": 15 }
```

---

### Admin - Audit Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/audit-logs` | List logs. Query: page, limit, action, actor_user_id, target_type, ip_address, date_from, date_to, sort |
| GET | `/api/admin/audit-logs/stats` | Statistics (total, actions by type, activity by target). Query: date_from, date_to |
| GET | `/api/admin/audit-logs/:id` | Get single log |
| DELETE | `/api/admin/audit-logs` | Clear logs. Query: date_before (optional, delete logs older than date) |
| DELETE | `/api/admin/audit-logs/:id` | Delete single log |

**List response** includes: action, actor (user), target_type, target_id, metadata, ip_address, user_agent, created_at.

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
