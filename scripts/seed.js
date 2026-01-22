import db from '../models/index.js';
import dotenv from 'dotenv';

dotenv.config();

const { User, Category, Shop, Product, Banner, Notification } = db;

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
    const user = await User.findOrCreate({
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
    console.log('📦 Seeding categories...');
    const categories = await Category.bulkCreate([
      { name: 'Phones', image: '/cdn/images/categories/phones.jpg', status: 'approved' },
      { name: 'Laptops', image: '/cdn/images/categories/laptops.jpg', status: 'approved' },
      { name: 'TVs', image: '/cdn/images/categories/tvs.jpg', status: 'approved' },
      { name: 'Accessories', image: '/cdn/images/categories/accessories.jpg', status: 'approved' },
      { name: 'Audio', image: '/cdn/images/categories/audio.jpg', status: 'approved' },
      { name: 'Gaming', image: '/cdn/images/categories/gaming.jpg', status: 'approved' }
    ], { ignoreDuplicates: true });
    console.log(`✅ Created ${categories.length} categories.`);

    // Seed Shops
    console.log('🏪 Seeding shops...');
    const appleStore = await Shop.findOrCreate({
      where: { name: 'Apple Store Malawi' },
      defaults: {
        name: 'Apple Store Malawi',
        is_verified: true,
        status: 'active',
        logo: '/cdn/images/shops/apple.png'
      }
    });

    const samsungOfficial = await Shop.findOrCreate({
      where: { name: 'Samsung Official' },
      defaults: {
        name: 'Samsung Official',
        is_verified: true,
        status: 'active',
        logo: '/cdn/images/shops/samsung.png'
      }
    });

    const hpMalawi = await Shop.findOrCreate({
      where: { name: 'HP Malawi' },
      defaults: {
        name: 'HP Malawi',
        is_verified: true,
        status: 'active'
      }
    });

    const sonyElectronics = await Shop.findOrCreate({
      where: { name: 'Sony Electronics' },
      defaults: {
        name: 'Sony Electronics',
        is_verified: true,
        status: 'active'
      }
    });

    const lenovoMalawi = await Shop.findOrCreate({
      where: { name: 'Lenovo Malawi' },
      defaults: {
        name: 'Lenovo Malawi',
        is_verified: true,
        status: 'active'
      }
    });

    const gamingZoneMW = await Shop.findOrCreate({
      where: { name: 'Gaming Zone MW' },
      defaults: {
        name: 'Gaming Zone MW',
        is_verified: true,
        status: 'active'
      }
    });

    const shops = {
      'Apple Store Malawi': appleStore[0],
      'Samsung Official': samsungOfficial[0],
      'HP Malawi': hpMalawi[0],
      'Sony Electronics': sonyElectronics[0],
      'Lenovo Malawi': lenovoMalawi[0],
      'Gaming Zone MW': gamingZoneMW[0]
    };
    console.log(`✅ Created ${Object.keys(shops).length} shops.`);

    // Seed Products
    console.log('📱 Seeding products...');
    const products = [
      {
        name: 'iPhone 14 Pro',
        category_id: 1, // Phones
        vendor: 'Apple Store Malawi',
        price: 1200000,
        rating: 4.8,
        total_reviews: 320,
        image: '/cdn/images/products/iphone14pro_1.jpg',
        images: [
          '/cdn/images/products/iphone14pro_1.jpg',
          '/cdn/images/products/iphone14pro_2.jpg',
          '/cdn/images/products/iphone14pro_3.jpg',
          '/cdn/images/products/iphone14pro_4.jpg'
        ],
        description: 'The latest iPhone with A16 Bionic chip, Dynamic Island, and 48MP camera system.',
        is_featured: true,
        is_hot: false,
        is_special: false
      },
      {
        name: 'Samsung Galaxy S23',
        category_id: 1, // Phones
        vendor: 'Samsung Official',
        price: 950000,
        rating: 4.6,
        total_reviews: 210,
        image: '/cdn/images/products/galaxy_s23_1.jpg',
        images: [
          '/cdn/images/products/galaxy_s23_1.jpg',
          '/cdn/images/products/galaxy_s23_2.jpg',
          '/cdn/images/products/galaxy_s23_3.jpg',
          '/cdn/images/products/galaxy_s23_4.jpg'
        ],
        description: 'Flagship Samsung phone with Snapdragon 8 Gen 2, 50MP camera, and all-day battery.',
        is_featured: true,
        is_hot: false,
        is_special: false
      },
      {
        name: 'HP Pavilion 15',
        category_id: 2, // Laptops
        vendor: 'HP Malawi',
        price: 700000,
        rating: 4.3,
        total_reviews: 115,
        image: '/cdn/images/products/hp_pavilion_1.jpg',
        images: [
          '/cdn/images/products/hp_pavilion_1.jpg',
          '/cdn/images/products/hp_pavilion_2.jpg',
          '/cdn/images/products/hp_pavilion_3.jpg',
          '/cdn/images/products/hp_pavilion_4.jpg'
        ],
        description: '15.6-inch laptop with Intel Core i5, 8GB RAM, 512GB SSD. Perfect for work and entertainment.',
        is_featured: false,
        is_hot: true,
        is_special: false
      },
      {
        name: 'Sony 55" Smart TV',
        category_id: 3, // TVs
        vendor: 'Sony Electronics',
        price: 650000,
        rating: 4.5,
        total_reviews: 88,
        image: '/cdn/images/products/sony_tv_1.jpg',
        images: [
          '/cdn/images/products/sony_tv_1.jpg',
          '/cdn/images/products/sony_tv_2.jpg',
          '/cdn/images/products/sony_tv_3.jpg',
          '/cdn/images/products/sony_tv_4.jpg'
        ],
        description: '4K Ultra HD Smart TV with HDR, Android TV, and Dolby Audio.',
        is_featured: false,
        is_hot: true,
        is_special: false
      },
      {
        name: 'MacBook Air M2',
        category_id: 2, // Laptops
        vendor: 'Apple Store Malawi',
        price: 1100000,
        rating: 4.9,
        total_reviews: 245,
        image: '/cdn/images/products/macbook_air_1.jpg',
        images: [
          '/cdn/images/products/macbook_air_1.jpg',
          '/cdn/images/products/macbook_air_2.jpg',
          '/cdn/images/products/macbook_air_3.jpg',
          '/cdn/images/products/macbook_air_4.jpg'
        ],
        description: 'Apple M2 chip, 13.6-inch Liquid Retina display, up to 18 hours battery life.',
        is_featured: false,
        is_hot: true,
        is_special: false
      },
      {
        name: 'AirPods Pro 2',
        category_id: 4, // Accessories
        vendor: 'Apple Store Malawi',
        price: 249000,
        rating: 4.7,
        total_reviews: 512,
        image: '/cdn/images/products/airpods_pro_1.jpg',
        images: [
          '/cdn/images/products/airpods_pro_1.jpg',
          '/cdn/images/products/airpods_pro_2.jpg',
          '/cdn/images/products/airpods_pro_3.jpg',
          '/cdn/images/products/airpods_pro_4.jpg'
        ],
        description: 'Active Noise Cancellation, Adaptive Transparency, Personalized Spatial Audio.',
        is_featured: false,
        is_hot: true,
        is_special: false
      },
      {
        name: 'Lenovo ThinkPad E14',
        category_id: 2, // Laptops
        vendor: 'Lenovo Malawi',
        price: 500000,
        original_price: 820000,
        discount: 39,
        rating: 4.2,
        total_reviews: 64,
        image: '/cdn/images/products/thinkpad_1.jpg',
        images: [
          '/cdn/images/products/thinkpad_1.jpg',
          '/cdn/images/products/thinkpad_2.jpg',
          '/cdn/images/products/thinkpad_3.jpg',
          '/cdn/images/products/thinkpad_4.jpg'
        ],
        description: 'Business laptop with Intel Core i5, 14-inch FHD display, fingerprint reader.',
        is_featured: false,
        is_hot: false,
        is_special: true
      },
      {
        name: 'Samsung Galaxy Buds2',
        category_id: 4, // Accessories
        vendor: 'Samsung Official',
        price: 99000,
        original_price: 149000,
        discount: 33,
        rating: 4.4,
        total_reviews: 189,
        image: '/cdn/images/products/galaxy_buds_1.jpg',
        images: [
          '/cdn/images/products/galaxy_buds_1.jpg',
          '/cdn/images/products/galaxy_buds_2.jpg',
          '/cdn/images/products/galaxy_buds_3.jpg',
          '/cdn/images/products/galaxy_buds_4.jpg'
        ],
        description: 'True wireless earbuds with Active Noise Cancellation and ambient sound.',
        is_featured: false,
        is_hot: false,
        is_special: true
      },
      {
        name: 'PlayStation 5',
        category_id: 6, // Gaming
        vendor: 'Gaming Zone MW',
        price: 450000,
        original_price: 550000,
        discount: 18,
        rating: 4.9,
        total_reviews: 892,
        image: '/cdn/images/products/ps5_1.jpg',
        images: [
          '/cdn/images/products/ps5_1.jpg',
          '/cdn/images/products/ps5_2.jpg',
          '/cdn/images/products/ps5_3.jpg',
          '/cdn/images/products/ps5_4.jpg'
        ],
        description: 'Next-gen gaming console with ultra-high speed SSD and ray tracing.',
        is_featured: false,
        is_hot: false,
        is_special: true
      }
    ];

    for (const prod of products) {
      const shop = shops[prod.vendor];
      if (shop) {
        await Product.findOrCreate({
          where: { name: prod.name },
          defaults: {
            shop_id: shop.id,
            category_id: prod.category_id,
            name: prod.name,
            vendor: prod.vendor,
            price: prod.price,
            original_price: prod.original_price || null,
            discount: prod.discount || null,
            rating: prod.rating,
            total_reviews: prod.total_reviews,
            image: prod.image,
            images: prod.images,
            description: prod.description,
            is_featured: prod.is_featured || false,
            is_hot: prod.is_hot || false,
            is_special: prod.is_special || false
          }
        });
      }
    }
    console.log(`✅ Created ${products.length} products.`);

    // Seed Banners
    console.log('🎨 Seeding banners...');
    const iphoneProduct = await Product.findOne({ where: { name: 'iPhone 14 Pro' } });
    
    await Banner.findOrCreate({
      where: { title: 'New Arrivals' },
      defaults: {
        image: '/cdn/images/banners/banner_arrivals.jpg',
        title: 'New Arrivals',
        product_id: iphoneProduct ? iphoneProduct.id : null
      }
    });

    await Banner.findOrCreate({
      where: { title: 'Flash Sale' },
      defaults: {
        image: '/cdn/images/banners/banner_sale.jpg',
        title: 'Flash Sale',
        product_id: null
      }
    });
    console.log('✅ Banners seeded.');

    // Seed Notifications
    console.log('🔔 Seeding notifications...');
    const userId = user[0].id;
    
    const notifications = [
      {
        user_id: userId,
        title: 'Order Delivered',
        message: 'Your order #12345 has been delivered. Enjoy!',
        type: 'order',
        read: false,
        order_id: 101
      },
      {
        user_id: userId,
        title: 'New Arrival Alert!',
        message: 'Check out the new iPhone 14 Pro now available.',
        type: 'system',
        read: true,
        order_id: null
      },
      {
        user_id: userId,
        title: 'Flash Sale',
        message: 'Get up to 50% off on selected items this weekend.',
        type: 'system',
        read: false,
        order_id: null
      },
      {
        user_id: userId,
        title: 'Account Verified',
        message: 'Your account has been successfully verified.',
        type: 'system',
        read: true,
        order_id: null
      },
      {
        user_id: userId,
        title: 'Rate your purchase',
        message: 'Please rate your recent purchase of MacBook Pro.',
        type: 'order',
        read: false,
        order_id: 99
      }
    ];

    await Notification.bulkCreate(notifications, { ignoreDuplicates: true });
    console.log(`✅ Created ${notifications.length} notifications.`);

    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
