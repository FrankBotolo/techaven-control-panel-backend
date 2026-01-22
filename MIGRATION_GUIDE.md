# Migration Guide: Laravel to Node.js/Express

This document outlines the conversion from Laravel PHP to Node.js/Express.

## Key Changes

### 1. Framework
- **Laravel PHP** → **Express.js (Node.js)**
- **Laravel Sanctum** → **JWT (jsonwebtoken)**
- **Eloquent ORM** → **Sequelize ORM**

### 2. Authentication
- Laravel Sanctum tokens → JWT tokens
- Same authentication flow (register → OTP → verify → login)
- Token format: `Bearer <token>` (same as before)

### 3. Database
- **SQLite/MySQL** → **MySQL** (configured)
- Migrations converted to Sequelize models
- Same database schema maintained

### 4. File Structure

**Laravel Structure:**
```
app/Http/Controllers/
app/Models/
routes/api.php
```

**Node.js Structure:**
```
controllers/
models/
routes/
```

### 5. API Endpoints

All endpoints remain the same:
- `/api/auth/*` - Authentication routes
- `/api/user/*` - User management (requires auth)
- `/api/products/*` - Products
- `/api/categories` - Categories
- `/api/shops/*` - Shops
- `/api/banners` - Banners
- `/api/notifications/*` - Notifications (requires auth)

### 6. Response Format

Response format remains consistent:
```json
{
  "success": true,
  "message": "...",
  "data": {...}
}
```

### 7. Environment Variables

**Laravel (.env):**
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=chiwaya_db
DB_USERNAME=root
DB_PASSWORD=
```

**Node.js (.env):**
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=chiwaya_db
DB_USER=root
DB_PASSWORD=
JWT_SECRET=your-secret-key
```

### 8. Key Differences

1. **Password Hashing**: Laravel Hash → bcryptjs
2. **Validation**: Laravel Validator → express-validator (can be added)
3. **File Upload**: Laravel Storage → multer
4. **Email**: Laravel Mail → nodemailer
5. **CORS**: Laravel CORS middleware → custom CORS middleware

### 9. Database Migration

**Option 1: Use Sequelize Sync (Development)**
```bash
npm run migrate
```

**Option 2: Use SQL Schema (Production)**
```bash
mysql -u root -p < database/schema.sql
```

### 10. Testing the Migration

1. Start the Node.js server:
   ```bash
   npm install
   npm run dev
   ```

2. Test endpoints:
   ```bash
   # Register
   curl -X POST http://localhost:8000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"full_name":"Test User","email":"test@example.com","password":"password123"}'
   
   # Login
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

## Notes

- The API contract remains the same, so frontend applications should work without changes
- Make sure to configure email settings in `.env` for OTP functionality
- File uploads are stored in `uploads/` directory
- In production, disable Sequelize sync and use proper migrations

