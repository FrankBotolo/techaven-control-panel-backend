import db from '../models/index.js';
import dotenv from 'dotenv';

dotenv.config();

const { User, Category } = db;

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

    // Seed Categories
    console.log('🗂  Seeding categories...');

    const categoriesData = [
      {
        name: 'Accessories',
        description: 'chargers, cables and more',
        status: 'approved',
        image: null,
        icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397320/techaven/categories/borz33xwf36rytawambp.png',
        shop_id: null
      },
      {
        name: 'Gaming',
        description: 'Consoles and controllers',
        status: 'approved',
        image: null,
        icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397272/techaven/categories/erunrzg5kph0vu8dm4vo.png',
        shop_id: null
      },
      {
        name: 'Wearables',
        description: 'watches and fitness trackers',
        status: 'approved',
        image: null,
        icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397233/techaven/categories/p84plz1xxupif3wczqyf.png',
        shop_id: null
      },
      {
        name: 'Audio Devices',
        description: 'Premium sound experience',
        status: 'approved',
        image: null,
        icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397157/techaven/categories/gxgqycgsxyzvexigxcrq.png',
        shop_id: null
      },
      {
        name: 'Laptops',
        description: 'Powerful machines for work and play',
        status: 'approved',
        image: null,
        icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397116/techaven/categories/bi9mbxwrf1uxzgi8exvy.png',
        shop_id: null
      },
      {
        name: 'Smartphones',
        description: 'Latest phones from top brands',
        status: 'approved',
        image: null,
        icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397092/techaven/categories/pl8ujarm4kerotmk5dch.png',
        shop_id: null
      }
    ];

    for (const category of categoriesData) {
      await Category.findOrCreate({
        where: { name: category.name },
        defaults: category
      });
    }

    console.log('✅ Categories seeded.');

    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
