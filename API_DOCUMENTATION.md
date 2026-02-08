# Techaven API Documentation

**Base URL:** `https://api.techaven.mw`

**Content-Type:** `application/json`

---

## API Organization

This API is organized into two main categories:

1. **Mobile App (Customer APIs)** - All customer-facing endpoints for mobile application
2. **Web (Admin & Seller APIs)** - Admin dashboard and seller dashboard endpoints for web application

---

## Table of Contents

### Mobile App (Customer APIs)
1. [Authentication](#1-authentication-mobile)
2. [User Management](#2-user-management-mobile)
3. [Products](#3-products-mobile)
4. [Categories](#4-categories-mobile)
5. [Cart](#5-cart-mobile)
6. [Orders](#6-orders-mobile)
7. [Wishlist / Liked Items](#7-wishlist--liked-items-mobile)
8. [Wallet](#8-wallet-mobile)
9. [Shipping Addresses](#9-shipping-addresses-mobile)
10. [Payment Methods](#10-payment-methods-mobile)
11. [Notifications](#11-notifications-mobile)
12. [Shops / Vendors](#12-shops--vendors-mobile)
13. [Search](#13-search-mobile)
14. [Help & Support](#14-help--support-mobile)
15. [App Info](#15-app-info-mobile)

### Web (Admin & Seller APIs)
16. [Admin APIs](#16-admin-apis-web)
17. [Seller APIs](#17-seller-apis-web)

---

## Mobile App (Customer APIs)

### 1. Authentication (Mobile)

All authentication endpoints are for customer mobile app registration and login.

#### 1.1 Register (Sign Up)
**Endpoint:** `POST /api/auth/register`

**Request Body (Raw JSON):**
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone_number": "+265991234567",
  "password": "securePassword123"
}
```

#### 1.2 Login (Sign In)
**Endpoint:** `POST /api/auth/login`

**Request Body (Raw JSON):**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### 1.3 Verify OTP
**Endpoint:** `POST /api/auth/verify-otp`

**Request Body (Raw JSON):**
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "type": "signup"
}
```

#### 1.4 Resend OTP
**Endpoint:** `POST /api/auth/resend-otp`

**Request Body (Raw JSON):**
```json
{
  "email": "john@example.com",
  "type": "signup"
}
```

#### 1.5 Forgot Password
**Endpoint:** `POST /api/auth/forgot-password`

**Request Body (Raw JSON):**
```json
{
  "email": "john@example.com"
}
```

#### 1.6 Reset Password
**Endpoint:** `POST /api/auth/reset-password`

**Request Body (Raw JSON):**
```json
{
  "email": "john@example.com",
  "reset_token": "rst_abc123xyz",
  "new_password": "newSecurePassword456"
}
```

#### 1.7 Refresh Token
**Endpoint:** `POST /api/auth/refresh-token`

**Request Body (Raw JSON):**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 1.8 Logout
**Endpoint:** `POST /api/auth/logout`

**Request Body:** None (empty raw JSON: `{}`)

---

### 2. User Management (Mobile)

#### 2.1 Get User Profile
**Endpoint:** `GET /api/user/profile`

#### 2.2 Update User Profile
**Endpoint:** `PUT /api/user/profile`

**Request Body (Raw JSON):**
```json
{
  "full_name": "John Smith",
  "phone": "+265991234567",
  "date_of_birth": "1990-05-15",
  "gender": "male"
}
```

#### 2.3 Upload Avatar
**Endpoint:** `POST /api/user/avatar`

**Request Body:** Form-data with `avatar` file

#### 2.4 Change Password
**Endpoint:** `PUT /api/user/password`

**Request Body (Raw JSON):**
```json
{
  "current_password": "oldPassword123",
  "new_password": "newPassword456"
}
```

#### 2.5 Delete Account
**Endpoint:** `DELETE /api/user/account`

**Request Body (Raw JSON):**
```json
{
  "password": "currentPassword123",
  "reason": "No longer using the app"
}
```

---

### 3. Products (Mobile)

All product browsing endpoints for mobile app.

#### 3.1 Get All Products
**Endpoint:** `GET /api/products?page=1&limit=20&sort=name&order=asc`

#### 3.2 Get Single Product
**Endpoint:** `GET /api/products/{product_id}`

#### 3.3 Get Featured Products
**Endpoint:** `GET /api/products/featured?limit=10`

#### 3.4 Get Hot Sales
**Endpoint:** `GET /api/products/hot-sales?limit=10`

#### 3.5 Get Special Offers
**Endpoint:** `GET /api/products/special-offers?limit=10`

#### 3.6 Get New Arrivals
**Endpoint:** `GET /api/products/new-arrivals?limit=10`

#### 3.7 Get Product Reviews
**Endpoint:** `GET /api/products/{product_id}/reviews?page=1&limit=10`

#### 3.8 Add Product Review
**Endpoint:** `POST /api/products/{product_id}/reviews`

**Request Body (Raw JSON):**
```json
{
  "rating": 5,
  "title": "Amazing phone!",
  "comment": "Best phone I've ever owned.",
  "images": ["base64_encoded_image_1", "base64_encoded_image_2"]
}
```

---

### 4. Categories (Mobile)

#### 4.1 Get All Categories
**Endpoint:** `GET /api/categories`

#### 4.2 Get Category Products
**Endpoint:** `GET /api/categories/{category_id}/products`

---

### 5. Cart (Mobile)

#### 5.1 Get Cart
**Endpoint:** `GET /api/cart`

#### 5.2 Add to Cart
**Endpoint:** `POST /api/cart/items`

**Request Body (Raw JSON):**
```json
{
  "product_id": 1,
  "quantity": 1
}
```

#### 5.3 Update Cart Item
**Endpoint:** `PUT /api/cart/items/{item_id}`

**Request Body (Raw JSON):**
```json
{
  "quantity": 2
}
```

#### 5.4 Remove from Cart
**Endpoint:** `DELETE /api/cart/items/{item_id}`

#### 5.5 Clear Cart
**Endpoint:** `DELETE /api/cart`

---

### 6. Orders (Mobile)

#### 6.1 Create Order
**Endpoint:** `POST /api/orders`

**Request Body (Raw JSON):**
```json
{
  "shipping_address_id": "addr_123",
  "payment_method_id": "pm_456",
  "notes": "Please call before delivery",
  "coupon_code": "SAVE10"
}
```

#### 6.2 Get Orders
**Endpoint:** `GET /api/orders?page=1&limit=20&status=pending`

#### 6.3 Get Single Order
**Endpoint:** `GET /api/orders/{order_id}`

#### 6.4 Cancel Order
**Endpoint:** `POST /api/orders/{order_id}/cancel`

**Request Body (Raw JSON):**
```json
{
  "reason": "Changed my mind"
}
```

---

### 7. Wishlist / Liked Items (Mobile)

#### 7.1 Get Wishlist
**Endpoint:** `GET /api/wishlist`

#### 7.2 Add to Wishlist
**Endpoint:** `POST /api/wishlist`

**Request Body (Raw JSON):**
```json
{
  "product_id": 1
}
```

#### 7.3 Remove from Wishlist
**Endpoint:** `DELETE /api/wishlist/{product_id}`

---

### 8. Wallet (Mobile)

#### 8.1 Get Wallet Balance
**Endpoint:** `GET /api/wallet`

#### 8.2 Get Wallet Transactions
**Endpoint:** `GET /api/wallet/transactions?page=1&limit=20&type=credit`

#### 8.3 Top Up Wallet
**Endpoint:** `POST /api/wallet/topup`

**Request Body (Raw JSON):**
```json
{
  "amount": 10000,
  "payment_method": "mobile_money",
  "phone_number": "+265991234567"
}
```

---

### 9. Shipping Addresses (Mobile)

#### 9.1 Get Addresses
**Endpoint:** `GET /api/addresses`

#### 9.2 Add Address
**Endpoint:** `POST /api/addresses`

**Request Body (Raw JSON):**
```json
{
  "label": "Office",
  "full_name": "John Doe",
  "phone": "+265991234567",
  "address_line_1": "456 Business Park",
  "address_line_2": "City Center",
  "city": "Blantyre",
  "state": "Southern Region",
  "postal_code": "",
  "country": "Malawi",
  "is_default": false
}
```

#### 9.3 Update Address
**Endpoint:** `PUT /api/addresses/{address_id}`

**Request Body (Raw JSON):**
```json
{
  "label": "Home",
  "full_name": "John Doe",
  "phone": "+265991234567",
  "address_line_1": "123 Main Street",
  "address_line_2": "Area 47",
  "city": "Lilongwe",
  "state": "Central Region",
  "postal_code": "",
  "country": "Malawi",
  "is_default": true
}
```

#### 9.4 Delete Address
**Endpoint:** `DELETE /api/addresses/{address_id}`

#### 9.5 Set Default Address
**Endpoint:** `POST /api/addresses/{address_id}/default`

**Request Body:** None (empty raw JSON: `{}`)

---

### 10. Payment Methods (Mobile)

#### 10.1 Get Payment Methods
**Endpoint:** `GET /api/payment-methods`

#### 10.2 Add Payment Method
**Endpoint:** `POST /api/payment-methods`

**Request Body (Raw JSON):**
```json
{
  "type": "mobile_money",
  "provider": "Airtel Money",
  "phone_number": "+265991234567",
  "is_default": true
}
```

#### 10.3 Delete Payment Method
**Endpoint:** `DELETE /api/payment-methods/{payment_method_id}`

---

### 11. Notifications (Mobile)

#### 11.1 Get Notifications
**Endpoint:** `GET /api/notifications?page=1&limit=20&unread_only=false`

#### 11.2 Mark Notification as Read
**Endpoint:** `POST /api/notifications/{notification_id}/read`

**Request Body:** None (empty raw JSON: `{}`)

#### 11.3 Mark All as Read
**Endpoint:** `POST /api/notifications/read-all`

**Request Body:** None (empty raw JSON: `{}`)

#### 11.4 Register Device for Push Notifications
**Endpoint:** `POST /api/notifications/register-device`

**Request Body (Raw JSON):**
```json
{
  "device_token": "fcm_token_abc123",
  "platform": "android"
}
```

---

### 12. Shops / Vendors (Mobile)

#### 12.1 Get All Shops
**Endpoint:** `GET /api/shops?page=1&limit=20`

#### 12.2 Get Shop Details
**Endpoint:** `GET /api/shops/{shop_id}`

#### 12.3 Get Shop Products
**Endpoint:** `GET /api/shops/{shop_id}/products`

---

### 13. Search (Mobile)

#### 13.1 Search Products
**Endpoint:** `GET /api/search?q=iphone&page=1&limit=20&sort=relevance`

#### 13.2 Search Suggestions (Autocomplete)
**Endpoint:** `GET /api/search/suggestions?q=iph`

---

### 14. Help & Support (Mobile)

#### 14.1 Get Help Topics
**Endpoint:** `GET /api/help/topics`

#### 14.2 Get FAQs
**Endpoint:** `GET /api/help/faqs`

#### 14.3 Submit Support Ticket
**Endpoint:** `POST /api/help/tickets`

**Request Body (Raw JSON):**
```json
{
  "subject": "Issue with my order",
  "category": "orders",
  "message": "I received a damaged product...",
  "order_id": "ord_789",
  "attachments": ["base64_image_1"]
}
```

---

### 15. App Info (Mobile)

#### 15.1 Get App Info
**Endpoint:** `GET /api/app/info`

---

## Web (Admin & Seller APIs)

### 16. Admin APIs (Web)

All admin endpoints require admin role authentication.

#### 16.1 Dashboard
**Endpoint:** `GET /api/admin/dashboard`

#### 16.2 Shops Management

##### List All Shops
**Endpoint:** `GET /api/admin/shops`

##### Create Shop
**Endpoint:** `POST /api/admin/shops`

**Request Body (Raw JSON):**
```json
{
  "shop_name": "New Shop",
  "location": "Lilongwe",
  "address": "123 Main Street",
  "phone": "+265 999 123 456",
  "email": "shop@example.com",
  "logo_url": "https://example.com/logo.png"
}
```

##### Update Shop
**Endpoint:** `PATCH /api/admin/shops/{shopId}`

**Request Body (Raw JSON):**
```json
{
  "shop_name": "Updated Shop Name",
  "location": "Blantyre",
  "address": "456 New Street",
  "phone": "+265 999 999 999",
  "email": "newemail@example.com",
  "status": "active",
  "logo_url": "https://example.com/new-logo.png"
}
```

##### Delete Shop
**Endpoint:** `DELETE /api/admin/shops/{shopId}`

##### Invite Shop Owner
**Endpoint:** `POST /api/admin/shops/{shopId}/invite-owner`

**Request Body (Raw JSON):**
```json
{
  "owner_name": "John Doe",
  "owner_email": "john.doe@example.com",
  "owner_phone": "+265 999 123 456"
}
```

#### 16.3 Categories Management

##### List Pending Categories
**Endpoint:** `GET /api/admin/categories/pending`

##### List Rejected Categories
**Endpoint:** `GET /api/admin/categories/rejected`

##### List Approved Categories
**Endpoint:** `GET /api/admin/categories/approved`

##### Approve Category
**Endpoint:** `POST /api/admin/categories/{categoryId}/approve`

**Request Body:** None (empty raw JSON: `{}`)

---

### 17. Seller APIs (Web)

All seller endpoints require seller role authentication and shop ownership.

#### 17.1 Dashboard
**Endpoint:** `GET /api/sellers/dashboard`

#### 17.2 Categories

##### List Shop Categories
**Endpoint:** `GET /api/sellers/{shopId}/categories`

##### Create Category
**Endpoint:** `POST /api/sellers/{shopId}/categories`

**Request Body (Raw JSON):**
```json
{
  "name": "New Category",
  "image": "https://example.com/category-image.jpg"
}
```

#### 17.3 Products

##### List Shop Products
**Endpoint:** `GET /api/sellers/{shopId}/products`

##### Create Product
**Endpoint:** `POST /api/sellers/{shopId}/products`

**Request Body (Raw JSON):**
```json
{
  "name": "New Product",
  "category_id": 1,
  "price": 50000,
  "image_url": "https://example.com/product-image.jpg",
  "images_urls": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "description": "Product description",
  "stock": 100,
  "original_price": 60000,
  "discount": 17,
  "vendor": "Shop Name",
  "is_featured": false,
  "is_hot": false,
  "is_special": false
}
```

##### Update Product
**Endpoint:** `PATCH /api/sellers/{shopId}/products/{productId}`

**Request Body (Raw JSON):**
```json
{
  "name": "Updated Product Name",
  "category_id": 2,
  "price": 55000,
  "image_url": "https://example.com/new-image.jpg",
  "images_urls": ["https://example.com/new-image1.jpg"],
  "description": "Updated description",
  "stock": 150,
  "original_price": 65000,
  "discount": 15,
  "vendor": "Updated Shop Name",
  "is_featured": true,
  "is_hot": false,
  "is_special": true
}
```

##### Delete Product
**Endpoint:** `DELETE /api/sellers/{shopId}/products/{productId}`

---

## Response Format

All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message describing what went wrong",
  "errors": {
    "field_name": ["Validation error 1", "Validation error 2"]
  }
}
```

---

## Authentication

1. **Access Token** - Short-lived (1 hour), used for API requests
2. **Refresh Token** - Long-lived (30 days), used to get new access tokens
3. All authenticated endpoints require: `Authorization: Bearer <access_token>`
4. When access token expires, use refresh token to get a new one
5. If refresh token is invalid, user must login again

---

## Important Notes

1. **All POST requests must include `Content-Type: application/json` header**
2. **All POST request bodies must be in Raw JSON format** (as shown in examples above)
3. **Mobile App APIs** are for customer-facing mobile application
4. **Web APIs** are for admin dashboard and seller dashboard web applications
5. All monetary values are in **Malawian Kwacha (MWK)** and represented as integers (no decimals)
6. Example: `1299000` = MK 1,299,000

---

## Postman Collection

Import the `Techaven_API.postman_collection.json` file into Postman to access all endpoints with pre-configured requests and examples.

The collection is organized into:
- **Mobile App (Customer APIs)** folder - Contains all customer-facing endpoints
- **Web (Admin & Seller APIs)** folder - Contains all admin and seller dashboard endpoints
