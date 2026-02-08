import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const runMigration = async () => {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'chiwaya_db',
      multipleStatements: true
    });

    console.log('✅ Database connection established.');

    // Read and execute migration SQL
    const migrationPath = join(__dirname, '../database/migrations/add_specifications_to_products.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running migration: add_specifications_to_products.sql');
    
    await connection.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ The specifications column has been added to the products table.');
    
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  The specifications column already exists. Skipping migration.');
      process.exit(0);
    } else {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

runMigration();

