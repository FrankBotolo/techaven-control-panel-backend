import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
  let connection;
  
  try {
    console.log('🔄 Starting escrow migration...');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'chiwaya_db',
      multipleStatements: true
    });

    console.log('✅ Database connection established.');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, '../database/migrations/add_escrow_to_orders.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    console.log('📝 Executing migration SQL...');
    await connection.query(migrationSQL);
    
    console.log('✅ Escrow migration completed successfully!');
    console.log('   - Added escrow columns to orders table');
    console.log('   - Created escrows table');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Check if columns already exist (non-fatal error)
    if (error.message.includes('Duplicate column name')) {
      console.log('⚠️  Some columns may already exist. Migration may have been run before.');
      console.log('   This is usually safe to ignore.');
      process.exit(0);
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

runMigration();

