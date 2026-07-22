# Checkout & Order API – Mobile App Integration

API documentation for the checkout and order flow in the mobile app (Flutter).

**Base URL:** `http:72.62.154.44:8000/api`  
**Authentication:** All endpoints require `Authorization: Bearer <access_token>` header.

---

## Overview: Checkout Flow

```
1. Get Cart                    → GET /cart
2. Get Shipping Addresses      → GET /shipping-addresses
3. Get Payment Methods         → GET /payment-methods (Airtel Money only; customer orders can pay directly via Airtel or Pay Changu)
4. (Optional) Get Couriers     → GET /courier-services
5. Create Order                → POST /orders
6. Pay with Pay Changu         → Hosted checkout / SDK, then POST /orders/:id/pay/paychangu { "tx_ref": "..." } (and/or rely on POST /webhooks/paychangu)
7. (Optional) List paid orders → GET /orders/mine/paid
8. (Optional) Confirm Delivery → POST /orders/:id/delivery/confirm (optional body: file_url for proof)
```

---

## 1. Cart

### Get Cart
```
GET /api/cart
```

**Response:**
```json
{
  "success": true,
  "message": "Cart retrieved",
  "data": {
    "id": "cart_123",
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

### Add to Cart
```
POST /api/cart/items
Content-Type: application/json

{
  "product_id": 5,
  "quantity": 2
}
```

### Update Cart Item
```
PUT /api/cart/items/:item_id
Content-Type: application/json

{
  "quantity": 3
}
```

### Remove from Cart
```
DELETE /api/cart/items/:item_id
```

### Clear Cart
```
DELETE /api/cart
```

---

## 2. Shipping Addresses

### List Shipping Addresses
```
GET /api/shipping-addresses
```

**Response:**
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

### Add Shipping Address
```
POST /api/shipping-addresses
Content-Type: application/json

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

**Required:** `name`, `phone`, `address`, `city`

### Update Shipping Address
```
PUT /api/shipping-addresses/:id
Content-Type: application/json

{
  "label": "Home",
  "name": "John Banda",
  "phone": "+265991234567",
  "address": "Plot 23, Area 49",
  "city": "Lilongwe",
  "region": "Central Region",
  "is_default": true
}
```

### Delete Shipping Address
```
DELETE /api/shipping-addresses/:id
```

### Set Default Address
```
POST /api/shipping-addresses/:id/set-default
```

---

## 3. Courier Services (Optional)

### List Active Couriers
```
GET /api/courier-services
```

Returns list of active courier services. Use `id` when creating order if you want to specify a courier.

---

## 4. Create Order

### Create Order from Items
```
POST /api/orders
Content-Type: application/json

{
  "shipping_address_id": 1,
  "items": [
    { "product_id": 3, "quantity": 2 },
    { "product_id": 5, "quantity": 1 }
  ],
  "courier_service_id": 1,
  "notes": "Please call before delivery"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shipping_address_id` | number | Yes | ID from shipping addresses |
| `items` | array | Yes | `[{ product_id, quantity }]` |
| `courier_service_id` | number | No | Courier service ID |
| `notes` | string | No | Order notes |

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

### Create Order from Cart (Legacy)
```
POST /api/orders
Content-Type: application/json

{
  "shipping_address_id": 1,
  "payment_method_id": "airtel",
  "courier_service_id": 1,
  "notes": "Please call before delivery"
}
```

**Legacy `payment_method_id` on create (if used):**  
`airtel` — prefer **`courier_service_id`** + **`POST /orders/:id/pay/airtel`** or Pay Changu for payment.

---

## 5. Get Orders

### List My Orders
```
GET /api/orders
```

**Response:**
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

### Get Single Order
```
GET /api/orders/:order_id
```

Use numeric `id` or `ord_123` format.

**Response:**
```json
{
  "success": true,
  "message": "Order retrieved",
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
    "items": [...],
    "created_at": "2025-03-16T10:00:00.000Z"
  }
}
```

**Order status values:** `pending`, `processing`, `shipped`, `delivered`, `cancelled`  
**Payment status values:** `unpaid` (or `pending`), `paid`, `failed`, `refunded`

---

## 6. Payment (Pay Changu — customer orders)

Start checkout with Pay Changu (include **`meta.order_id`** / **`meta.order_number`** matching the order). After success, confirm on your backend:

### Confirm Pay Changu payment
```
POST /api/orders/:order_id/pay/paychangu
Content-Type: application/json

{
  "tx_ref": "YOUR_PAYCHANGU_TX_REF"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tx_ref` | string | Yes | Transaction reference from Pay Changu (also accepts `txRef`). Server verifies with Pay Changu and marks the order **paid** + escrow. |

**Success (200):** `data.order` with **`payment_status`: `paid`**.

**Alternatives:** Configure **POST `/api/webhooks/paychangu`** (and/or **GET `/api/webhooks/paychangu/callback`**) so the server marks paid without this call.

### Get Payment Methods (reference / seller flows)
```
GET /api/payment-methods
```

Returns **`available_providers`** (Airtel Money only, `psp_id`). Customer orders can pay directly via **`POST /orders/:id/pay/airtel`** or Pay Changu as above; seller subscriptions use Pay Changu.

**Response:**
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

### List my paid orders
```
GET /api/orders/mine/paid
```

Same shape as **`GET /orders`**, filtered to **`payment_status: paid`**.

---

## 7. Cancel Order
```
POST /api/orders/:order_id/cancel
```

Only allowed when `status` is `pending`. No body required.

---

## 8. Confirm Delivery
```
POST /api/orders/:order_id/delivery/confirm
Content-Type: application/json

{
  "file_url": "https://example.com/proof.jpg"
}
```

Customer confirms they received the order (order **status** must already be **delivered**). Releases escrow funds to seller. **Body optional:** omit `{}` or omit field; or send **`file_url`** / **`proof_url`** / **`delivery_proof_url`** for a proof image/PDF URL.

---

## Flutter Integration Summary

| Step | API Call |
|------|----------|
| Checkout screen load | `GET /cart`, `GET /shipping-addresses`, `GET /payment-methods` (optional) |
| Create order | `POST /orders` with `shipping_address_id`, `items`, `courier_service_id`, … |
| Pay Changu | Checkout with Pay Changu → `POST /orders/:id/pay/paychangu` with `tx_ref` (or rely on webhook) |
| Paid orders | `GET /orders/mine/paid` |
| Cancel | `POST /orders/:id/cancel` |

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "data": null,
  "error": "Detailed error (in development)"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (validation, insufficient stock, etc.) |
| 401 | Unauthorized (missing or invalid token) |
| 404 | Not found (order, address, product) |
| 500 | Server error |
