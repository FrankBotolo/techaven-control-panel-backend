# Chiwaya API Documentation

## Overview
This document provides comprehensive API documentation for the Chiwaya e-commerce platform.

## Base URL
```
http://localhost:8000/api
```

## Authentication
Most endpoints require authentication using Bearer tokens. After logging in, you'll receive an `access_token` that should be included in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Importing to Postman

1. Open Postman
2. Click **Import** button (top left)
3. Select the `Chiwaya_API.postman_collection.json` file
4. The collection will be imported with all endpoints organized by category

## Environment Variables

Set up environment variables in Postman:
- `base_url`: `http://localhost:8000` (or your server URL)
- `access_token`: Your JWT token (will be set automatically after login)

## API Endpoints

### Authentication (`/api/auth`)
All authentication endpoints are public (no auth required).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user (customer self-registration or seller with invite) |
| POST | `/api/auth/login` | Login and get access token |
| POST | `/api/auth/verify-otp` | Verify OTP code |
| POST | `/api/auth/resend-otp` | Resend OTP code |
| POST | `/api/auth/forgot-password` | Request password reset OTP |
| POST | `/api/auth/reset-password` | Reset password with OTP |

**Customer Self-Registration Request Body:**
```json
{
  "full_name": "John Doe",
  "email": "john.doe@example.com",
  "phone_number": "+265 999 123 456",
  "password": "password123"
}
```
*Note: Do NOT include `invite_token` for customer registration. User will be registered with role 'customer'.*

**Seller Registration Request Body (with invite token):**
```json
{
  "full_name": "Jane Seller",
  "email": "jane.seller@example.com",
  "phone_number": "+265 999 123 456",
  "password": "password123",
  "invite_token": "your_invite_token_here"
}
```
*Note: Include `invite_token` to register as seller. Email/phone must match the invitation.*

**Login Request Body:**
```json
{
  "email": "john.doe@example.com",
  "phone_number": "+265 999 123 456",
  "password": "password123"
}
```

**Login Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "user": { ... }
  }
}
```

### User (`/api/user`)
All user endpoints require authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get user profile |
| PUT | `/api/user/profile` | Update user profile |
| POST | `/api/user/avatar` | Upload avatar (multipart/form-data) |
| POST | `/api/user/change-password` | Change password |

**Update Profile Request Body:**
```json
{
  "name": "John Doe Updated",
  "email": "newemail@example.com",
  "phone_number": "+265 999 999 999",
  "date_of_birth": "1990-01-01",
  "gender": "male"
}
```

### Products (`/api/products`)
Product endpoints are mostly public (no auth required).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| GET | `/api/products/featured` | Get featured products |
| GET | `/api/products/hot-sales` | Get hot sale products |
| GET | `/api/products/special-offers` | Get special offer products |
| GET | `/api/products/search?q=query` | Search products |
| GET | `/api/products/category/:id` | Get products by category |
| GET | `/api/products/:id` | Get product by ID |
| GET | `/api/products/:id/images` | Get product images |
| POST | `/api/products/:id/images` | Add product images |
| PUT | `/api/products/:id/images` | Replace product images |
| DELETE | `/api/products/:id/images` | Delete all product images |
| PUT | `/api/products/:id/images/:index` | Update product image |
| DELETE | `/api/products/:id/images/:index` | Delete product image |

### Categories (`/api/categories`)
Category endpoints are public.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | Get all categories |
| GET | `/api/categories/:id/products` | Get products by category |

### Shops (`/api/shops`)
Most shop endpoints are public.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shops` | Get all shops |
| GET | `/api/shops/owner/:ownerId` | Get shop by owner ID |
| GET | `/api/shops/:id` | Get shop by ID |
| GET | `/api/shops/:id/products` | Get shop products |
| PATCH | `/api/shops/:id` | Update shop (auth required) |

### Banners (`/api/banners`)
Banner endpoints are public.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/banners` | Get all banners |

### Notifications (`/api/notifications`)
All notification endpoints require authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get all notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| POST | `/api/notifications/mark-all-read` | Mark all as read |
| POST | `/api/notifications/:id/read` | Mark as read |
| DELETE | `/api/notifications/:id` | Delete notification |

### Admin (`/api/admin`)
All admin endpoints require admin role.

#### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Get admin dashboard |

#### Shops Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/shops` | List all shops |
| POST | `/api/admin/shops` | Create shop |
| PATCH | `/api/admin/shops/:shopId` | Update shop |
| DELETE | `/api/admin/shops/:shopId` | Delete shop |
| POST | `/api/admin/shops/:shopId/invite-owner` | Invite shop owner |

**Create Shop Request Body:**
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

#### Categories Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/categories/pending` | List pending categories |
| GET | `/api/admin/categories/rejected` | List rejected categories |
| GET | `/api/admin/categories/approved` | List approved categories |
| POST | `/api/admin/categories/:categoryId/approve` | Approve category |

### Sellers (`/api/sellers`)
All seller endpoints require seller role and shop ownership.

#### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sellers/dashboard` | Get seller dashboard |

#### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sellers/:shopId/categories` | List shop categories |
| POST | `/api/sellers/:shopId/categories` | Create category |

**Create Category Request Body:**
```json
{
  "name": "New Category",
  "image": "https://example.com/category-image.jpg"
}
```

#### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sellers/:shopId/products` | List shop products |
| POST | `/api/sellers/:shopId/products` | Create product |
| PATCH | `/api/sellers/:shopId/products/:productId` | Update product |
| DELETE | `/api/sellers/:shopId/products/:productId` | Delete product |

**Create Product Request Body:**
```json
{
  "name": "New Product",
  "category_id": 1,
  "price": 50000,
  "image_url": "https://example.com/product-image.jpg",
  "images_urls": ["https://example.com/image1.jpg"],
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

### Invitations (`/api/invitations`)
All invitation endpoints require authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invitations` | Get all invitations |
| GET | `/api/invitations/:id` | Get invitation by ID |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Check server status |

## Response Format

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
  "message": "Error message",
  "error": "Detailed error message"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## User Roles

- `customer` - Regular customer
- `seller` - Shop owner/seller
- `admin` - System administrator

## Testing Workflow

1. **Register/Login**: Start by registering a new user or logging in
2. **Save Token**: Copy the `access_token` from login response and set it as `access_token` variable in Postman
3. **Test Endpoints**: Use the imported collection to test various endpoints
4. **Admin Endpoints**: Use admin credentials to test admin endpoints
5. **Seller Endpoints**: Register as seller (using invite token) to test seller endpoints

## Notes

- All prices are in the local currency (Malawian Kwacha)
- Phone numbers should follow the format: `+265 XXX XXX XXX`
- Dates should be in ISO format: `YYYY-MM-DD`
- Image URLs should be publicly accessible URLs
- OTP codes expire after 12 hours
- JWT tokens expire after 7 days (configurable)

