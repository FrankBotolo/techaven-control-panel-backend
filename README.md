# Chiwaya Server - Node.js/Express API

This is the Node.js/Express version of the Chiwaya server, converted from Laravel PHP.

## Repository Navigation

- [`AGENTS.md`](AGENTS.md) — working protocol for coding agents and contributors using agents.
- [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) — current handoff, known risks, and next actions.
- [`docs/COMPONENT_MAP.md`](docs/COMPONENT_MAP.md) — navigation map for routes, controllers, services, models, infrastructure, and deeper documentation.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — durable decisions, including documentation authority and unresolved naming.
- [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md) — primary approved backend API contract.
- [`docs/CATALOGUE_API_V2.md`](docs/CATALOGUE_API_V2.md) — catalogue marketplace v2 API, migrations, import, and compatibility guide.

The repository currently uses Chiwaya, Techaven, and TecHaven names in different places. The canonical name has not been established; see the decisions record before undertaking naming changes.

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
- `GET /api/user/profile` - Get user profile (includes `points`)
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/points/balances` - Loyalty points per shop + general bucket (`shop_id` 0)
- `POST /api/user/points/redeem` - Redeem points to wallet (MWK); body: `shop_id`, `points`
- `POST /api/user/avatar` - Upload avatar
- `POST /api/user/change-password` - Change password

### Subscriptions (admin + seller)
- **User access (per JWT):** `GET /api/plans`, `POST /api/subscribe`, `GET /api/subscription/transactions`, `GET /api/subscription/status/:userId`, `GET /api/subscription/ping` (gated). See the user-subscription sections of `API_DOCUMENTATION.md`; the previously referenced dedicated subscription documents are not present in this checkout.
- **Shop subscriptions:** public `GET /api/subscription-packages`; admin `GET|POST|PATCH|DELETE /api/admin/subscription-packages`, `GET|PATCH /api/admin/shop-subscriptions`; seller `GET …/subscription`, `POST …/subscription/subscribe`, `POST …/subscription/pay/paychangu`, cancel, resume.
- **Loyalty (MWK per point):** seller `PATCH /api/sellers/:shopId/shop` body `points_mwk_per_point`; admin `GET|PATCH /api/admin/platform-settings` field `default_points_mwk_per_point` (general bucket `shop_id` 0). See `API_DOCUMENTATION.md` (sections 2b, 15b, Admin Platform settings).
- See `docs/SUBSCRIPTION_PACKAGES.md`

### Products
- `GET /api/products?page=&limit=` - Paginated list (filter featured/hot/new/special on the client)
- `GET /api/products/search?q=` - Search (paginated)
- `GET /api/products/category/:id` - Products by category (paginated)
- `GET /api/products/:id` - Product by ID

### Categories
- `GET /api/categories` - Get all categories

### Shops
- `GET /api/shops` - Get all shops
- `GET /api/shops/:id` - Get shop by ID (includes `points_mwk_per_point` when set)
- `GET /api/shops/:id/products` - Get shop products

### Platform (public)
- `GET /api/platform-settings` - `seller_commission_percent`, `default_points_mwk_per_point` (general loyalty bucket rate)

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
