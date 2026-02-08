# Wallet Setup Guide

## Issue Fixed
The wallet was showing zero balance because it was just a placeholder implementation. Now it's fully functional with database persistence.

## What Was Added

1. **Wallet Model** (`models/Wallet.js`) - Stores user wallet balance
2. **WalletTransaction Model** (`models/WalletTransaction.js`) - Stores all wallet transactions
3. **Database Migration** (`database/migrations/add_wallet_tables.sql`) - Creates wallet tables
4. **Updated WalletController** - Now saves and retrieves actual wallet data

## Setup Steps

### 1. Run the Migration
You need to create the wallet tables in your database. Run this SQL script:

```bash
mysql -u root -p chiwaya_db < database/migrations/add_wallet_tables.sql
```

Or manually run the SQL in `database/migrations/add_wallet_tables.sql`

### 2. Restart Your Server
After running the migration, restart your Node.js server:

```bash
npm run dev
```

## How It Works Now

1. **Get Wallet Balance** (`GET /api/wallet`)
   - Automatically creates a wallet for the user if it doesn't exist
   - Returns the actual balance from the database

2. **Top Up Wallet** (`POST /api/wallet/topup`)
   - Creates a transaction record
   - Updates the wallet balance immediately
   - Returns the new balance

3. **Get Transactions** (`GET /api/wallet/transactions`)
   - Shows all wallet transactions (credits and debits)
   - Supports pagination and filtering by type

## Testing

After running the migration, test the wallet:

1. **Top up:**
```bash
POST /api/wallet/topup
{
  "amount": 10000,
  "payment_method": "mobile_money",
  "phone_number": "+265991234567"
}
```

2. **Check balance:**
```bash
GET /api/wallet
```

You should now see the balance you topped up!

## Notes

- The wallet is automatically created when a user first accesses it
- All amounts are stored in MWK (Malawian Kwacha)
- Transactions are recorded with status, description, and reference
- The top-up currently completes immediately (in production, you'd wait for payment gateway confirmation)

