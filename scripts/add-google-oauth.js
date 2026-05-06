import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const runMigration = async () => {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'chiwaya_db'
    });

    console.log('✅ Database connection established.');

    const [rows] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'google_id'`,
      [process.env.DB_NAME || 'chiwaya_db']
    );

    if (rows.length > 0) {
      console.log('ℹ️  google_id column already exists. Skipping.');
    } else {
      await connection.query(
        `ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER remember_token`
      );
      console.log('✅ Added google_id column to users table.');
    }

    const [passwordRows] = await connection.query(
      `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password'`,
      [process.env.DB_NAME || 'chiwaya_db']
    );

    if (passwordRows.length > 0 && passwordRows[0].IS_NULLABLE === 'NO') {
      await connection.query(
        `ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL`
      );
      console.log('✅ Made password column nullable (required for Google OAuth users).');
    } else {
      console.log('ℹ️  password column is already nullable. Skipping.');
    }

    console.log('✅ Google OAuth migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
};

runMigration();
