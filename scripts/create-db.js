import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const createDatabase = async () => {
  try {
    console.log('🔄 Creating database...');

    // Connect to MySQL server (without specifying database)
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    const dbName = process.env.DB_NAME || 'chiwaya_db';

    // Check if database exists
    const [databases] = await connection.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [dbName]
    );

    if (databases.length > 0) {
      console.log(`✅ Database '${dbName}' already exists.`);
      await connection.end();
      process.exit(0);
    }

    // Create database
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database '${dbName}' created successfully!`);

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create database:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. MySQL server is running');
    console.error('   2. Database credentials in .env are correct');
    console.error('   3. User has CREATE DATABASE privileges');
    console.error('\n📝 You can also create it manually:');
    console.error(`   CREATE DATABASE ${process.env.DB_NAME || 'chiwaya_db'};`);
    process.exit(1);
  }
};

createDatabase();

