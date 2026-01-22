# Chiwaya Server - Node.js/Express API

This is the Node.js/Express version of the Chiwaya server, converted from Laravel PHP.

## Features

- ✅ User Authentication (Register, Login, OTP Verification)
- ✅ User Profile Management
- ✅ Products Management
- ✅ Categories, Shops, Banners
- ✅ Notifications System
- ✅ File Upload (Avatars)
- ✅ JWT Authentication
- ✅ MySQL Database Support

## Prerequisites

- Node.js (v18 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - Database credentials (MySQL)
   - JWT secret key
   - Email settings (for OTP)
   - Server port

3. **Create MySQL database:**
   ```sql
   CREATE DATABASE chiwaya_db;
   ```

4. **Run database migrations:**
   ```bash
   npm run migrate
   ```

## Running the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:8000` (or the port specified in `.env`).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with OTP

### User (Requires Authentication)
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/avatar` - Upload avatar
- `POST /api/user/change-password` - Change password

### Products
- `GET /api/products` - Get all products
- `GET /api/products/featured` - Get featured products
- `GET /api/products/hot-sales` - Get hot products
- `GET /api/products/special-offers` - Get special offers
- `GET /api/products/search?q=query` - Search products
- `GET /api/products/category/:id` - Get products by category
- `GET /api/products/:id` - Get product by ID

### Categories
- `GET /api/categories` - Get all categories

### Shops
- `GET /api/shops` - Get all shops
- `GET /api/shops/:id` - Get shop by ID
- `GET /api/shops/:id/products` - Get shop products

### Banners
- `GET /api/banners` - Get all banners

### Notifications (Requires Authentication)
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `POST /api/notifications/mark-all-read` - Mark all as read
- `POST /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## Project Structure

```
├── config/
│   └── database.js          # Database configuration
├── controllers/             # Route controllers
│   ├── AuthController.js
│   ├── UserController.js
│   ├── ProductController.js
│   └── ...
├── middleware/              # Express middleware
│   ├── auth.js             # JWT authentication
│   ├── cors.js             # CORS configuration
│   └── upload.js           # File upload handling
├── models/                  # Sequelize models
│   ├── User.js
│   ├── Product.js
│   └── ...
├── routes/                  # Route definitions
│   ├── auth.js
│   ├── user.js
│   └── ...
├── services/                # Business logic services
│   └── emailService.js     # Email service
├── scripts/                 # Utility scripts
│   └── migrate.js          # Database migration
├── uploads/                 # Uploaded files directory
├── server.js                # Main server file
└── package.json
```

## Environment Variables

See `.env.example` for all available environment variables.

## Notes

- The database will be automatically synced in development mode
- In production, use proper migrations instead of `sync()`
- Make sure to set a strong `JWT_SECRET` in production
- Configure email settings for OTP functionality
- File uploads are stored in the `uploads/` directory

## License

MIT
