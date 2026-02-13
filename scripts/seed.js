import db from '../models/index.js';
import dotenv from 'dotenv';

dotenv.config();

const { User } = db;

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Test database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Sync database first
    await db.sequelize.sync({ alter: false });
    console.log('✅ Database synchronized.');

    // Seed Admin User
    console.log('👤 Seeding admin user...');
    await User.findOrCreate({
      where: { email: 'admin@techaven.mw' },
      defaults: {
        name: 'System Admin',
        email: 'admin@techaven.mw',
        password: 'admin12345',
        role: 'admin',
        is_verified: true,
        email_verified_at: new Date()
      }
    });
    console.log('✅ Admin created (email: admin@techaven.mw, password: admin12345).');

    // Seed Regular User
    console.log('👤 Seeding user...');
    await User.findOrCreate({
      where: { email: 'john.banda@email.com' },
      defaults: {
        name: 'John Banda',
        email: 'john.banda@email.com',
        phone_number: '+265 999 123 456',
        password: 'password',
        role: 'customer',
        is_verified: true,
        email_verified_at: new Date()
      }
    });
    console.log('✅ User created (email: john.banda@email.com, password: password).');

    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
