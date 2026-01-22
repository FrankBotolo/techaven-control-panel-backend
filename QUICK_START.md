# Quick Start Guide

## Prerequisites

- Node.js (v18 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file (copy from `.env.example` if it exists):
```env
PORT=8000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=chiwaya_db
DB_USER=root
DB_PASSWORD=your_password

JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
APP_URL=http://localhost:8000
```

### 3. Create MySQL Database
```sql
CREATE DATABASE chiwaya_db;
```

### 4. Run Database Migration
**Option A: Using Sequelize (Development)**
```bash
npm run migrate
```

**Option B: Using SQL Script**
```bash
mysql -u root -p chiwaya_db < database/schema.sql
```

### 5. Start the Server
**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:8000`

## Testing the API

### Register a User
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get Products (Public)
```bash
curl http://localhost:8000/api/products
```

### Get User Profile (Requires Auth)
```bash
curl http://localhost:8000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database exists: `CREATE DATABASE chiwaya_db;`

### Port Already in Use
- Change `PORT` in `.env` file
- Or stop the process using port 8000

### Email Not Sending
- Configure SMTP settings in `.env`
- For Gmail, use an App Password (not your regular password)
- Check SMTP credentials are correct

### File Upload Issues
- Ensure `uploads/` directory exists and is writable
- Check `MAX_FILE_SIZE` in `.env` (default: 5MB)

## Next Steps

1. Review the API endpoints in `README.md`
2. Test all endpoints with your frontend application
3. Configure production environment variables
4. Set up proper logging and monitoring
5. Consider adding rate limiting and additional security measures

