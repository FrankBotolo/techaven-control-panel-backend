# Setup Guide - After npm install

Follow these steps to get your server running:

## Step 1: Create Environment File

Create a `.env` file in the root directory. You can copy from `.env.example`:

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On Linux/Mac:**
```bash
cp .env.example .env
```

## Step 2: Configure Environment Variables

Edit the `.env` file and update these important values:

### Required Configuration:

1. **Database Settings:**
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=chiwaya_db
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   ```

2. **JWT Secret (IMPORTANT - Change this!):**
   ```
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```
   Generate a strong random string for production.

3. **Email Settings (for OTP and notifications):**
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```
   For Gmail, you'll need to use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

## Step 3: Create MySQL Database

You have two options:

### Option A: Use the automated script (Recommended)
```bash
npm run create-db
```

### Option B: Create manually
Connect to MySQL and run:
```sql
CREATE DATABASE chiwaya_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Step 4: Run Database Migrations

This will create all the necessary tables:
```bash
npm run migrate
```

## Step 5: (Optional) Seed the Database

To populate the database with sample data:
```bash
npm run seed
```

## Step 6: Start the Server

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on `http://localhost:8000` (or the port specified in `.env`).

## Verify Installation

1. **Check server health:**
   ```bash
   curl http://localhost:8000/health
   ```
   Or visit in browser: `http://localhost:8000/health`

2. **Test API endpoint:**
   ```bash
   curl http://localhost:8000/api/products
   ```

## Quick Setup (All-in-One)

If you want to do everything at once:
```bash
npm run setup
```
This will:
- Create the database
- Run migrations
- Seed the database

## Troubleshooting

### Database Connection Error
- ✅ Make sure MySQL is running
- ✅ Verify database credentials in `.env`
- ✅ Ensure the database exists
- ✅ Check user has proper permissions

### Port Already in Use
- Change `PORT` in `.env` file
- Or stop the process using port 8000

### Email Not Sending
- Configure SMTP settings in `.env`
- For Gmail, use an App Password (not your regular password)
- Test email with: `npm run test-email`

### File Upload Issues
- Ensure `uploads/` directory exists
- Check `MAX_FILE_SIZE` in `.env` (default: 5MB)

## Next Steps

1. ✅ Test the API endpoints using Postman (collection available: `Techaven_API.postman_collection.json`)
2. ✅ Review API documentation in `API_DOCUMENTATION.md`
3. ✅ Configure production environment variables
4. ✅ Set up proper logging and monitoring

## Additional Scripts Available

- `npm run create-db` - Create database
- `npm run migrate` - Run migrations
- `npm run seed` - Seed database with sample data
- `npm run setup` - Complete setup (create-db + migrate + seed)
- `npm run test-email` - Test email configuration
- `npm run add-escrow` - Add escrow columns to orders table
- `npm run add-specifications` - Add specifications column to products

