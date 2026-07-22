# Techaven Mobile App API Documentation

A clear, frontend-friendly API reference for integrating the Techaven mobile app (Flutter).

---

## Quick Reference

| Base URL | `http:72.62.154.44:8000/api` |
|----------|-----------------------------------|
| Auth     | `Authorization: Bearer <access_token>` |
| Content  | `Content-Type: application/json`   |

---

## Response Format

All responses use this structure:

### Success
```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "data": null,
  "error": "Detailed error (dev only)"
}
```

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (e.g. not verified) |
| 404 | Not found |
| 409 | Conflict (e.g. already in cart) |
| 500 | Server error |

---

## 1. Authentication

### 1.1 Register
**POST** `/auth/register`

**Payload:**
```json
{
  "full_name": "John Banda",
  "email": "john@example.com",
  "phone_number": "+265991234567",
  "password": "securePassword123"
}
```
- **Required:** `full_name`, `password`, and either `email` or `phone_number`

**Response (200):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify OTP.",
  "data": {
    "user_id": 1,
    "email": "john@example.com",
    "phone_number": "+265991234567",
    "otp": "1234"
  }
}
```
- `otp` is only returned when using phone (no email). In dev it may be returned for testing.

---

### 1.2 Verify OTP (Signup)
**POST** `/auth/verify-otp`

**Payload:**
```json
{
  "identifier": "john@example.com",
  "otp": "1234",
  "type": "signup"
}
```
- `identifier`: email or phone used at registration
- `type`: `"signup"` | `"login"` | `"password_reset"`

**Response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Banda",
      "email": "john@example.com",
      "phone_number": "+265991234567",
      "avatar": null,
      "is_verified": true,
      "role": "customer",
      "member_since": "March 2025",
      "created_at": "2025-03-16T10:00:00.000Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer"
  }
}
```

---

### 1.3 Send Login OTP
**POST** `/auth/send-login-otp`

**Payload:**
```json
{
  "identifier": "john@example.com"
}
```
- Or use `email` or `phone_number` instead of `identifier`

**Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "identifier": "john@example.com",
    "expires_at": "2025-03-17T10:00:00.000Z",
    "email": "john@example.com",
    "phone_number": null,
    "otp": "1234"
  }
}
```
- `otp` only in development

---

### 1.4 Verify OTP (Login)
**POST** `/auth/verify-otp`

**Payload:**
```json
{
  "identifier": "john@example.com",
  "otp": "1234",
  "type": "login"
}
```

**Response (200):** Same as 1.2 (user + access_token)

---

### 1.5 Login (Password)
**POST** `/auth/login`

**Payload:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```
- Or use `phone_number` instead of `email`

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "user": {
      "id": 1,
      "name": "John Banda",
      "email": "john@example.com",
      "phone_number": "+265991234567",
      "avatar": null,
      "is_verified": true,
      "role": "customer",
      "member_since": "March 2025",
      "created_at": "2025-03-16T10:00:00.000Z"
    }
  }
}
```

---

### 1.6 Refresh Token
**POST** `/auth/refresh-token`

**Payload:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer"
  }
}
```

---

### 1.7 Logout
**POST** `/auth/logout`

**Payload:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 2. User Profile

All require `Authorization: Bearer <access_token>`.

### 2.1 Get Profile
**GET** `/user/profile`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Banda",
    "email": "john@example.com",
    "phone_number": "+265991234567",
    "avatar_url": "https://...",
    "role": "customer",
    "points": 0,
    "created_at": "2025-03-16T10:00:00.000Z"
  }
}
```

---

### 2.2 Update Profile
**PUT** `/user/profile`

**Payload:**
```json
{
  "name": "John Banda",
  "email": "john@example.com",
  "phone_number": "+265991234567"
}
```

---

## 3. Products

### 3.1 List Products
**GET** `/products?page=1&limit=30&category_id=1&sort=price_asc`

**Query params:**
| Param        | Type   | Description                          |
|--------------|--------|--------------------------------------|
| page         | number | Page (default 1)                     |
| limit / per_page | number | Page size (default 30, max 100) |
| category_id  | number | Filter by category                   |
| min_price    | number | Min price (MWK)                      |
| max_price    | number | Max price (MWK)                      |
| sort         | string | `price_asc`, `price_desc`, `newest`, `rating` |

Use `is_featured`, `is_hot_sale`, `is_new_arrival`, `is_special_offer` on each product to build UI sections (no separate featured/hot/new APIs).

**Response (200):** `data.products` + `data.pagination`

---

### 3.2 Product Detail
**GET** `/products/:id`

**Response (200):** Single product object (same shape as list item)

---

### 3.3 Search
**GET** `/products/search?q=samsung&per_page=20`

---

### 3.4 Products by Category
**GET** `/products/category/:id`

---

## 4. Categories

### 4.1 List Categories
**GET** `/categories`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Smartphones",
      "description": "Latest phones",
      "status": "approved",
      "icon": "https://..."
    }
  ]
}
```

---

### 4.2 Products by Category
**GET** `/categories/:id/products`

---

## 5. Cart

All require authentication.

### 5.1 Get Cart
**GET** `/cart`

**Response (200):**
```json
{
  "success": true,
  "message": "Cart retrieved",
  "data": {
    "id": "cart_1",
    "items": [
      {
        "id": "item_1",
        "product_id": 5,
        "product_name": "Samsung Galaxy S24",
        "product_image": "https://...",
        "unit_price": 150000,
        "quantity": 2,
        "subtotal": 300000,
        "is_available": true
      }
    ],
    "summary": {
      "subtotal": 300000,
      "discount": 0,
      "shipping": 0,
      "tax": 0,
      "total": 300000,
      "currency": "MWK",
      "item_count": 2
    }
  }
}
```

---

### 5.2 Add to Cart
**POST** `/cart/items`

**Payload:**
```json
{
  "product_id": 5,
  "quantity": 2
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "item_id": "item_1",
    "cart_item_count": 1
  }
}
```

---

### 5.3 Update Cart Item
**PUT** `/cart/items/:item_id`

**Payload:**
```json
{
  "quantity": 3
}
```

**Note:** Use `items[].id` from cart (e.g. `item_1`) or just the number: `PUT /cart/items/1` or `PUT /cart/items/item_1`

---

### 5.4 Remove from Cart
**DELETE** `/cart/items/:item_id`

---

### 5.5 Clear Cart
**DELETE** `/cart`

---

## 6. Shipping Addresses

All require authentication.

### 6.1 List Addresses
**GET** `/shipping-addresses`

**Response (200):**
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

### 6.2 Add Address
**POST** `/shipping-addresses`

**Payload:**
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
- **Required:** `name`, `phone`, `address`, `city`

---

### 6.3 Update Address
**PUT** `/shipping-addresses/:id`

**Payload:** Same as add (partial update supported)

---

### 6.4 Delete Address
**DELETE** `/shipping-addresses/:id`

---

### 6.5 Set Default Address
**POST** `/shipping-addresses/:id/set-default`

---

## 7. Payment Methods

**GET** `/payment-methods` (auth required)

**Response (200):**
```json
{
  "success": true,
  "message": "Payment methods retrieved",
  "data": {
    "payment_methods": [],
    "available_providers": [
      {
        "id": 1,
        "name": "Airtel Money",
        "slug": "airtel",
        "psp_id": 1,
        "provider": "airtel",
        "icon": "airtel"
      }
    ]
  }
}
```
- Customer orders can pay directly via `POST /orders/:id/pay/airtel` (body: `msisdn`) or Pay Changu.

---

## 8. Orders

All require authentication.

### 8.1 Create Order
**POST** `/orders`

**Payload (from items):**
```json
{
  "shipping_address_id": 1,
  "items": [
    { "product_id": 3, "quantity": 2 },
    { "product_id": 5, "quantity": 1 }
  ],
  "payment_method_id": "airtel",
  "courier_service_id": 1,
  "notes": "Please call before delivery"
}
```
- **Required:** `shipping_address_id`, `items`
- **payment_method_id:** `"airtel"`

**Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 1,
    "order_number": "ORD-20250316-1234",
    "status": "pending",
    "payment_status": "unpaid",
    "payment_method": null,
    "subtotal": 300000,
    "shipping_fee": 0,
    "total": 300000,
    "shipping_address_id": 1,
    "items": [
      {
        "id": 1,
        "product_id": 3,
        "product_name": "Samsung Galaxy S24",
        "quantity": 2,
        "price": 150000,
        "subtotal": 300000
      }
    ],
    "created_at": "2025-03-16T10:00:00.000Z"
  }
}
```

---

### 8.2 List Orders
**GET** `/orders`

**Response (200):**
```json
{
  "success": true,
  "message": "Orders retrieved",
  "data": [
    {
      "id": 1,
      "order_number": "ORD-20250316-1234",
      "status": "pending",
      "payment_status": "unpaid",
      "payment_method": null,
      "subtotal": 300000,
      "shipping_fee": 0,
      "total": 300000,
      "shipping_address_id": 1,
      "items": [...],
      "created_at": "2025-03-16T10:00:00.000Z"
    }
  ]
}
```

---

### 8.3 Get Order
**GET** `/orders/:order_id`

- `order_id` can be numeric (`1`) or `ord_1`

---

### 8.4 Confirm Pay Changu payment
**POST** `/orders/:order_id/pay/paychangu`

After Pay Changu checkout succeeds, call with **`tx_ref`** (or **`txRef`**). Server verifies with Pay Changu and sets **payment_status** to **paid** (+ escrow).

**Payload:**
```json
{
  "tx_ref": "YOUR_PAYCHANGU_TX_REF"
}
```

**Response (200):** `data.order` (formatted order, **paid**).

**Also:** **`GET /orders/mine/paid`** — list orders already paid.

---

### 8.5 Cancel Order
**POST** `/orders/:order_id/cancel`

- Only when `status === "pending"`.

---

### 8.6 Confirm Delivery
**POST** `/orders/:order_id/delivery/confirm`

- Customer confirms receipt (order **status** must be **delivered**); releases escrow to seller.
- **Optional JSON body:** `file_url`, `proof_url`, or `delivery_proof_url` — URL of proof image/PDF.

---

### 8.7 Complete Payment (Manual Fallback)
**POST** `/orders/:order_id/payment/complete`

**Payload:**
```json
{
  "payment_reference": "TXN-123456",
  "payment_proof": "https://example.com/receipt.jpg"
}
```
- Manual fallback when payment did not update automatically.

---

## 9. Courier Services

**GET** `/courier-services` (no auth)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Airtel Money Express",
      "description": "Fast delivery",
      "is_active": true,
      "sort_order": 1
    }
  ]
}
```

---

## 10. Notifications

All require authentication.

### 10.1 List Notifications
**GET** `/notifications`

**Response (200):**
```json
{
  "success": true,
  "message": "Notifications retrieved",
  "data": [
    {
      "id": 1,
      "title": "Order Shipped",
      "body": "Your order ORD-20250316-1234 has been shipped.",
      "type": "order",
      "is_read": false,
      "time_ago": "2 hours ago",
      "created_at": "2025-03-16T12:00:00.000Z"
    }
  ]
}
```

---

### 10.2 Unread Count
**GET** `/notifications/unread-count`

---

### 10.3 Mark as Read
**POST** `/notifications/:id/read`

---

### 10.4 Mark All as Read
**POST** `/notifications/mark-all-read`

---

## 11. Wallet

All require authentication.

### 11.1 Get Balance
**GET** `/wallet/balance`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "balance": 150000,
    "currency": "MWK"
  }
}
```

---

### 11.2 Get Transactions
**GET** `/wallet/transactions?page=1&limit=20`

---

## 12. Favorites (Wishlist)

All require authentication.

### 12.1 List Favorites
**GET** `/wishlist`

---

### 12.2 Add to Favorites
**POST** `/wishlist`

**Payload:**
```json
{
  "product_id": 5
}
```

---

### 12.3 Check Favorite
**GET** `/wishlist/:productId`

---

### 12.4 Remove from Favorites
**DELETE** `/wishlist/:productId`

---

## 13. Banners

**GET** `/banners` (no auth)

---

## 14. App Info

**GET** `/app/info` (no auth)

---

## 15. Search

**GET** `/search?q=samsung&per_page=20`

---

## Integration Checklist

- [ ] Store `access_token` securely after login/verify-otp
- [ ] Add `Authorization: Bearer <token>` to all protected requests
- [ ] Handle 401 by redirecting to login or refreshing token
- [ ] After Pay Changu: call `POST /orders/:id/pay/paychangu` with `tx_ref` (or rely on `POST /webhooks/paychangu`)
- [ ] Use `GET /orders/mine/paid` for paid-order list; `psp_id` from `GET /payment-methods` is for `POST /orders/:id/pay/airtel`
- [ ] Use `items[].id` from cart for update/delete (e.g. `item_1` or `1`)
