/**
 * Techaven Database Seed Script
 * Follows the Step-by-Step Flow from Techaven App Flow Diagram v1.0
 * (techavenflowdiagram chart.pdf)
 *
 * Flow order: Shared Auth → Admin (approve sellers) → Seller (listings) →
 * Buyer (browse/checkout) → Delivery Agent → Courier Services
 */

import db from '../models/index.js';
import dotenv from 'dotenv';

dotenv.config();

/** Xiaomi Redmi 13: use Cloudinary when no catalog JPG is linked for this model. */
const REDMI_13_IMAGE_FALLBACK =
  'https://res.cloudinary.com/dd1raaqnh/image/upload/v1773906889/techaven/products/laa7p73dfobk2zsduwn0.jpg';

const {
  User,
  Category,
  Shop,
  Product,
  CourierService,
  DeliveryAgent,
  ShippingAddress,
  Wallet,
  PaymentMethod,
  OnboardingSlide
} = db;

const seedDatabase = async () => {
  try {
    console.log('🌱 Techaven Database Seeding (following Flow Diagram v1.0)\n');

    await db.sequelize.authenticate();
    console.log('✅ Database connection established.\n');

    await db.sequelize.sync({ alter: false });
    console.log('✅ Database synchronized.\n');

    // ═══════════════════════════════════════════════════════════════════
    // 1. ONBOARDING SLIDES – App carousel (shown before login)
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── 1. Onboarding Slides ───\n');

    const onboardingSlidesData = [
      {
        title: 'All Your Favorite Electronics Shops, in One',
        description: 'Discover and buy top-quality electronics from Browse verified suppliers from across Malawi all in one app.',
        image_url: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1773905083/techaven/onboarding-slides/gg76jvo0dwkdbsqdddgk.png',
        order_index: 0,
        is_active: true
      },
      {
        title: 'All Your Favorite Products, in One',
        description: 'Find the best deals on phones, laptops, and accessories. Compare products and make smart buying decisions.',
        image_url: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1773905155/techaven/onboarding-slides/fxemvtofhuhlztsfh7qz.png',
        order_index: 1,
        is_active: true
      },
      {
        title: 'All Your Favorite Payment Gateways in One',
        description: 'Discover and buy top-quality electronics from Browse verified suppliers from across Malawi all in one app.',
        image_url: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1773905197/techaven/onboarding-slides/hwdsvz2m3blr79vropl2.png',
        order_index: 2,
        is_active: true
      }
    ];

    for (const slide of onboardingSlidesData) {
      await OnboardingSlide.findOrCreate({
        where: { title: slide.title },
        defaults: slide
      });
    }
    console.log('       ✅ Onboarding slides seeded.\n');

    // ═══════════════════════════════════════════════════════════════════
    // 2. SHARED AUTHENTICATION FLOW (Section 2 of Flow Doc)
    // All users: Sign Up → Verify OTP → Login → Home
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── 2. Shared Authentication Flow ───\n');

    // Step 1–2: Admin (required for Approve Seller, Disputes, Withdrawals)
    console.log('  [2.1] Seeding Admin (role: admin)...');
    const [adminUser] = await User.findOrCreate({
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
    console.log('       ✅ Admin: admin@techaven.mw / admin12345\n');

    // Step 5A: Buyer – Sign Up path (customer for Browse, Checkout, Payment, Escrow)
    console.log('  [2.2] Seeding Buyer (role: customer)...');
    const [buyerUser] = await User.findOrCreate({
      where: { email: 'buyer@techaven.mw' },
      defaults: {
        name: 'John Banda',
        email: 'buyer@techaven.mw',
        phone_number: '+265999123456',
        password: 'password123',
        role: 'customer',
        is_verified: true,
        email_verified_at: new Date()
      }
    });
    console.log('       ✅ Buyer: buyer@techaven.mw / password123\n');

    // Step 2–4: Seller – Apply to Become Seller → Submit Docs → Admin Approved (Section 4)
    console.log('  [2.3] Seeding Seller (role: seller)...');
    const [sellerUser] = await User.findOrCreate({
      where: { email: 'seller@techaven.mw' },
      defaults: {
        name: 'Tech Haven Store',
        email: 'seller@techaven.mw',
        phone_number: '+265888654321',
        password: 'seller12345',
        role: 'seller',
        is_verified: true,
        email_verified_at: new Date()
      }
    });
    console.log('       ✅ Seller: seller@techaven.mw / seller12345\n');

    // Step 1–3: Delivery Agent – Register as Agent → ID Verification (Section 5)
    console.log('  [2.4] Seeding Delivery Agent (role: delivery_agent)...');
    const [agentUser] = await User.findOrCreate({
      where: { email: 'agent@techaven.mw' },
      defaults: {
        name: 'Mike Courier',
        email: 'agent@techaven.mw',
        phone_number: '+265999000111',
        password: 'agent12345',
        role: 'delivery_agent',
        is_verified: true,
        email_verified_at: new Date()
      }
    });
    await DeliveryAgent.findOrCreate({
      where: { user_id: agentUser.id },
      defaults: {
        user_id: agentUser.id,
        vehicle_type: 'motorcycle',
        operating_zone: 'Lilongwe',
        id_document_url: 'https://example.com/agent-id.pdf',
        is_available: false
      }
    });
    console.log('       ✅ Delivery Agent: agent@techaven.mw / agent12345\n');

    // ═══════════════════════════════════════════════════════════════════
    // 6. ADMIN FLOW – Approve Seller (Section 6 of Flow Doc)
    // Step 4–6: Review Seller Application → Approve Seller
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── 6. Admin Flow: Approve Seller ───\n');

    console.log('  [6.1] Creating approved Shop for seller...');
    const [shop] = await Shop.findOrCreate({
      where: { name: 'Tech Haven Electronics' },
      defaults: {
        name: 'Tech Haven Electronics',
        location: 'Lilongwe',
        address: '123 Commerce Street, Area 47',
        phone: '+265888654321',
        email: 'seller@techaven.mw',
        status: 'active',
        application_status: 'approved',
        is_verified: true,
        description: 'Premium electronics and gadgets'
      }
    });
    await sellerUser.update({ shop_id: shop.id });
    console.log('       ✅ Shop approved: Tech Haven Electronics\n');

    // ═══════════════════════════════════════════════════════════════════
    // 3. BUYER FLOW – Categories & Products for Browse & Search (Section 3)
    // Buyer: Browse & Search → Product Page → Add to Cart → Checkout
    // Admin creates categories; Seller creates product listings
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── 3. Buyer Flow: Browse & Search Setup ───\n');

    // Categories (admin-created, used by sellers for product listing)
    console.log('  [3.1] Seeding Categories...');
    const categoriesData = [
      { name: 'Smartphones', description: 'Latest phones from top brands', status: 'approved', shop_id: null, icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397092/techaven/categories/pl8ujarm4kerotmk5dch.png' },
      { name: 'Laptops', description: 'Powerful machines for work and play', status: 'approved', shop_id: null, icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397116/techaven/categories/bi9mbxwrf1uxzgi8exvy.png' },
      { name: 'Audio Devices', description: 'Premium sound experience', status: 'approved', shop_id: null, icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397157/techaven/categories/gxgqycgsxyzvexigxcrq.png' },
      { name: 'Wearables', description: 'Watches and fitness trackers', status: 'approved', shop_id: null, icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397233/techaven/categories/p84plz1xxupif3wczqyf.png' },
      { name: 'Gaming', description: 'Consoles and controllers', status: 'approved', shop_id: null, icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397272/techaven/categories/erunrzg5kph0vu8dm4vo.png' },
      { name: 'Accessories', description: 'Chargers, cables and more', status: 'approved', shop_id: null, icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397320/techaven/categories/borz33xwf36rytawambp.png' }
    ];
    const categories = [];
    for (const c of categoriesData) {
      const [cat] = await Category.findOrCreate({ where: { name: c.name }, defaults: c });
      categories.push(cat);
    }
    console.log('       ✅ Categories seeded.\n');
   const categoryIds = {
      smartphones: categories[0].id,
      laptops: categories[1].id,
      audio: categories[2].id,
      wearables: categories[3].id,
      gaming: categories[4].id,
      accessories: categories[5].id
    };

    /** Assign category from name/description when not set on the product row. */
    function resolveProductCategoryId(p) {
      if (p.category_id != null) return p.category_id;
      const name = (p.name || '').toLowerCase();
      const text = `${p.name || ''} ${p.description || ''}`.toLowerCase();

      if (
        /\b(apple watch|galaxy watch|smartwatch|smart watch|watch se|watch series|watch ultra|watchos)\b/i.test(text) ||
        (/\bwatch\b/i.test(name) && /\b(apple|galaxy|fitbit|garmin|amazfit)\b/i.test(name))
      ) {
        return categoryIds.wearables;
      }
      if (/\b(laptop|macbook|notebook|chromebook|\bipad\b|tablet\b)\b/i.test(text)) {
        return categoryIds.laptops;
      }
      if (/\b(playstation|ps5|ps4|xbox|nintendo switch|steam deck)\b/i.test(text)) {
        return categoryIds.gaming;
      }
      if (/charging case/i.test(name) && !/\bwith\b/i.test(name)) {
        return categoryIds.accessories;
      }
      if (
        /\b(airpods|earbuds?|earbud|headphone|headset|\bbuds\b|beats |sony wh-|soundcore|jbl |\bspeaker\b)\b/i.test(text)
      ) {
        return categoryIds.audio;
      }
      if (/\b(case\b|charger|cable|adapter|power bank|screen protector|magsafe|mount|stand)\b/i.test(name)) {
        return categoryIds.accessories;
      }
      return categoryIds.smartphones;
    }

    // 4. SELLER FLOW – Create Product Listing (Section 4, Step 6)
    // Seller creates listings: title, brand, condition, price, stock, images
    console.log('  [4.1] Seller: Create Product Listings...');
    const productsData = [
      {
        name: 'Samsung Galaxy A54',
        description: '5G smartphone, 128GB',
        price: 450000,
        original_price: null,
        discount: null,
        image: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1773906969/techaven/products/oclqbv3g4wpkqvoji6mi.webp',
        stock: 10,
        is_featured: false,
        is_hot: false,
        is_special: true,
        points: 45,
        category_id: categories[0].id,
        shop_id: shop.id,
        vendor: 'Tech Haven Electronics'
      },
      {
        name: 'HP Pavilion 15 Laptop',
        description: 'Intel i5, 8GB RAM, 256GB SSD',
        price: 850000,
        original_price: null,
        discount: null,
        image: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1773906889/techaven/products/laa7p73dfobk2zsduwn0.jpg',
        stock: 5,
        is_featured: false,
        is_hot: true,
        is_special: false,
        points: 85,
        category_id: categories[1].id,
        shop_id: shop.id,
        vendor: 'Tech Haven Electronics'
      },
      {
        name: 'Wireless Earbuds Pro',
        description: 'Noise cancelling, 24hr battery',
        price: 100,
        original_price: 200,
        discount: 100,
        image: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1773906748/techaven/products/nahncp7ojljnmbpk38j8.jpg',
        stock: 25,
        is_featured: true,
        is_hot: false,
        is_special: false,
        points: 7,
        category_id: categories[2].id,
        shop_id: shop.id,
        vendor: 'Tech Haven Electronics'
      },
      {
        name: 'Apple smart watch',
        description: 'Apple Watch Ultra 3 [GPS + Cellular 49mm] Running & Multisport Smartwatch w/Rugged Titanium Case w/Light Blue Alpine Loop - S. Satellite Communications,...',
        price: 12000000,
        original_price: 14000000,
        discount: 10,
        image: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1773908208/techaven/products/sm1jh90plbjfq7xvic9j.jpg',
        stock: 10,
        is_featured: false,
        is_hot: false,
        is_special: true,
        points: 4,
        category_id: categories[3].id,
        shop_id: shop.id,
        vendor: 'techaven'
      },
      {
        name: 'Samsung Galaxy A05',
        description: '6.5" PLS LCD entry smartphone — dual SIM, large battery for everyday use.',
        price: 168500,
        original_price: 185000,
        discount: 9,
        image: 'https://phonesdata.com/files/models/Samsung-Galaxy-A05-825.jpg',
        stock: 18,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',                 
        specifications: {
          display: '6.5" PLS LCD, HD+',
          chipset: 'MediaTek Helio G85',
          ram_storage: '4GB / 64GB',
          main_camera: '50 MP + 2 MP depth',
          battery: '5000 mAh',
          os: 'Android 14 (One UI Core)'
        }
      },
      {
        name: 'Samsung Galaxy A05s',
        description: '6.7" display with 90 Hz refresh — smooth scrolling and solid battery life.',
        price: 198900,
        original_price: null,
        discount: null,
        image: 'https://phonesdata.com/files/models/Samsung-Galaxy-A05s-167.jpg',
        stock: 14,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',                 
        specifications: {
          display: '6.7" PLS LCD, FHD+, 90 Hz',
          chipset: 'Snapdragon 680',
          ram_storage: '4GB / 64GB (expandable)',
          main_camera: '50 MP + 2 MP macro + 2 MP depth',
          battery: '5000 mAh, 25W charging',
          os: 'Android 14'
        }
      },
      {
        name: 'Samsung Galaxy A15',
        description: 'Super AMOLED 6.5" — better contrast and colors in direct sunlight.',
        price: 252000,
        original_price: 279000,
        discount: 10,
        image: 'https://phonesdata.com/files/models/Samsung-Galaxy-A15-1.jpg',
        stock: 22,
        is_featured: true,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics'      ,


        specifications: {
          display: '6.5" Super AMOLED, FHD+, 90 Hz',
          chipset: 'MediaTek Helio G99',
          ram_storage: '6GB / 128GB',
          main_camera: '50 MP + 5 MP ultra-wide + 2 MP macro',
          battery: '5000 mAh',
          os: 'Android 14 (One UI 6)'
        }
      },
      {
        name: 'Samsung Galaxy A25 5G',
        description: '5G-ready A-series with vivid AMOLED and OIS main camera.',
        price: 389500,
        original_price: null,
        discount: null,
        image: 'https://phonesdata.com/files/models/Samsung-Galaxy-A25-1.jpg',
        stock: 12,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.5" Super AMOLED, 120 Hz',
          chipset: 'Exynos 1280 (5G)',
          ram_storage: '6GB / 128GB',
          main_camera: '50 MP OIS + 8 MP ultra-wide + 2 MP macro',
          battery: '5000 mAh',
          os: 'Android 14'
        }
      },
      {
        "name": "Tecno Camon 40 Pro",
        "description": "Premium 4G experience featuring a brilliant AMOLED display and a high-resolution 50MP selfie camera.",
        "price": 645000,
        "original_price": 690000,
        "discount": 7,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-camon-40-pro.jpg",
        "stock": 15,
        "is_featured": false,
        "is_hot": true,
        "is_special": false,
        "is_new_arrival": true,
        "vendor": "Tech Haven Electronics",
        "specifications": {
          "display": "6.78\" AMOLED, 1080 x 2436 px",
          "chipset": "Mediatek Helio G100 Ultimate (6 nm)",
          "ram_storage": "8GB / 256GB",
          "main_camera": "50 MP f/1.9 + 50 MP Front",
          "battery": "5200 mAh",
          "os": "Android 15"
        }
      },
      {
        "name": "Tecno Camon 40",
        "description": "The perfect balance of style and performance with a vivid 6.78-inch AMOLED and rapid 45W charging.",
        "price": 580000,
        "original_price": null,
        "discount": null,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-camon-40.jpg",
        "stock": 20,
        "is_featured": false,
        "is_hot": false,
        "is_special": false,
        "is_new_arrival": true,
        "vendor": "Tech Haven Electronics",
        "specifications": {
          "display": "6.78\" AMOLED, 1080 x 2436 px",
          "chipset": "Mediatek Helio G100 Ultimate (6 nm)",
          "ram_storage": "8GB / 128GB/256GB",
          "main_camera": "50 MP f/1.9",
          "battery": "5200 mAh",
          "os": "Android 15"
        }
      },
      {
        "name": "Tecno Spark Go 1S",
        "description": "Essential performance meets modern design with a large 6.67-inch display and IP54 durability.",
        "price": 145000,
        "original_price": null,
        "discount": null,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-go-1s.jpg",
        "stock": 45,
        "is_featured": false,
        "is_hot": false,
        "is_special": false,
        "is_new_arrival": true,
        "vendor": "General Mobile",
        "specifications": {
          "display": "6.67\" IPS LCD, 720 x 1600 px",
          "chipset": "Mediatek Helio G50",
          "ram_storage": "3GB / 64GB",
          "main_camera": "13 MP f/1.8",
          "battery": "5000 mAh",
          "os": "Android 14 (Go edition)"
        }
      },
      {
        "name": "Tecno Camon 30S",
        "description": "Sleek and splash-resistant with an immersive AMOLED display and up to 2 major Android upgrades.",
        "price": 415000,
        "original_price": 440000,
        "discount": 6,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-camon-30s.jpg",
        "stock": 18,
        "is_featured": false,
        "is_hot": false,
        "is_special": false,
        "is_new_arrival": false,
        "vendor": "Tech Haven Electronics",
        "specifications": {
          "display": "6.78\" AMOLED, 1080 x 2436 px",
          "chipset": "Mediatek Helio G100 (6 nm)",
          "ram_storage": "6GB/8GB / 128GB/256GB",
          "main_camera": "50 MP f/1.9 OIS",
          "battery": "5000 mAh",
          "os": "Android 14"
        }
      },
      {
        "name": "Tecno Phantom V Flip2",
        "description": "Compact elegance in a foldable form factor with a stunning 6.9-inch LTPO AMOLED primary screen.",
        "price": 1250000,
        "original_price": 1400000,
        "discount": 10,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-phantom-v-flip2.jpg",
        "stock": 5,
        "is_featured": true,
        "is_hot": true,
        "is_special": true,
        "is_new_arrival": false,
        "vendor": "Premium Tech",
        "specifications": {
          "display": "6.9\" Foldable LTPO AMOLED",
          "chipset": "Mediatek Dimensity 8020 (6 nm)",
          "ram_storage": "8GB / 256GB",
          "main_camera": "50 MP Dual Setup (4K)",
          "battery": "4720 mAh (70W Fast)",
          "os": "Android 14"
        }
      },
      {
        "name": "Tecno Camon 30S Pro",
        "description": "A refined photography expert with 45W charging, wireless charging support, and an curved AMOLED display.",
        "price": 495000,
        "original_price": null,
        "discount": null,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-camon-30s-pro.jpg",
        "stock": 12,
        "is_featured": false,
        "is_hot": true,
        "is_special": false,
        "is_new_arrival": false,
        "vendor": "Tech Haven Electronics",
        "specifications": {
          "display": "6.78\" AMOLED, 1080 x 2436 px",
          "chipset": "Mediatek Helio G100 (6 nm)",
          "ram_storage": "8GB / 256GB",
          "main_camera": "50 MP f/1.9 OIS",
          "battery": "5000 mAh (Wireless Charging)",
          "os": "Android 14"
        }
      },
      {
        "name": "Tecno Pop 9 4G",
        "description": "Durable and efficient entry-level smartphone featuring IP54 dust and splash resistance.",
        "price": 165000,
        "original_price": null,
        "discount": null,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-pop-9-4g.jpg",
        "stock": 40,
        "is_featured": false,
        "is_hot": false,
        "is_special": false,
        "is_new_arrival": true,
        "vendor": "General Mobile",
        "specifications": {
          "display": "6.67\" IPS LCD, 720 x 1600 px",
          "chipset": "Unisoc T615 / Helio G50",
          "ram_storage": "3GB/4GB / 64GB/128GB",
          "main_camera": "13 MP f/1.8",
          "battery": "5000 mAh",
          "os": "Android 14 (Go edition)"
        }
      },
      {
        "name": "Tecno Pop 9",
        "description": "Smooth 5G connectivity for the masses with a balanced chipset and reliable battery life.",
        "price": 230000,
        "original_price": 250000,
        "discount": 8,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-pop-9.jpg",
        "stock": 30,
        "is_featured": false,
        "is_hot": false,
        "is_special": false,
        "is_new_arrival": true,
        "vendor": "General Mobile",
        "specifications": {
          "display": "6.6\" IPS LCD, 720 x 1612 px",
          "chipset": "Mediatek Dimensity 6300 (6 nm)",
          "ram_storage": "4GB / 64GB/128GB",
          "main_camera": "48 MP Main Camera",
          "battery": "5000 mAh",
          "os": "Android 14"
        }
      },
      {
        "name": "Tecno Pova 6 Neo 5G",
        "description": "A high-performance gaming companion featuring a 108MP camera and a massive 120Hz display.",
        "price": 410000,
        "original_price": null,
        "discount": null,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-pova-6-neo-5g.jpg",
        "stock": 25,
        "is_featured": false,
        "is_hot": true,
        "is_special": false,
        "is_new_arrival": false,
        "vendor": "Tech Haven Electronics",
        "specifications": {
          "display": "6.67\" IPS LCD, 120Hz",
          "chipset": "Mediatek Dimensity 6300 (6 nm)",
          "ram_storage": "6GB/8GB / 128GB/256GB",
          "main_camera": "108 MP f/1.9",
          "battery": "5000 mAh",
          "os": "Android 14"
        }
      },
      {
        "name": "Tecno Spark 20 Pro 5G",
        "description": "Blazing fast 5G speeds paired with a super-sharp 108MP camera and high-resolution display.",
        "price": 435000,
        "original_price": 470000,
        "discount": 7,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-20-pro-5g.jpg",
        "stock": 15,
        "is_featured": false,
        "is_hot": true,
        "is_special": false,
        "is_new_arrival": false,
        "vendor": "Tech Haven Electronics",
        "specifications": {
          "display": "6.78\" IPS LCD, 1080 x 2460 px",
          "chipset": "Mediatek Dimensity 6080 (6 nm)",
          "ram_storage": "8GB / 128GB/256GB",
          "main_camera": "108 MP f/1.8",
          "battery": "5000 mAh (33W Fast)",
          "os": "Android 14"
        }
      },
      {
        "name": "Tecno Spark 30 5G",
        "description": "Capture everything in detail with a 108MP camera on a large 120Hz smooth-motion screen.",
        "price": 395000,
        "original_price": null,
        "discount": null,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-30-5g.jpg",
        "stock": 25,
        "is_featured": false,
        "is_hot": false,
        "is_special": false,
        "is_new_arrival": true,
        "vendor": "General Mobile",
        "specifications": {
          "display": "6.67\" IPS LCD, 720 x 1600 px",
          "chipset": "Mediatek Dimensity 6300 (6 nm)",
          "ram_storage": "6GB/8GB / 128GB/256GB",
          "main_camera": "108 MP f/1.9",
          "battery": "5000 mAh",
          "os": "Android 14"
        }
      },
      {
        "name": "Tecno Spark 30",
        "description": "Modern aesthetics meet functionality with a high-res 64MP camera and durable IP64 rating.",
        "price": 340000,
        "original_price": null,
        "discount": null,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-30.jpg",
        "stock": 35,
        "is_featured": false,
        "is_hot": false,
        "is_special": false,
        "is_new_arrival": true,
        "vendor": "General Mobile",
        "specifications": {
          "display": "6.78\" IPS LCD, 1080 x 2460 px",
          "chipset": "Mediatek Helio G91 (12 nm)",
          "ram_storage": "8GB / 128GB/256GB",
          "main_camera": "64 MP Quad-LED Flash",
          "battery": "5000 mAh",
          "os": "Android 14"
        }
      },
      {
        "name": "Tecno Spark 30C",
        "description": "Reliable and robust with IP54 rating and a 50MP main camera for crisp daily captures.",
        "price": 220000,
        "original_price": 245000,
        "discount": 10,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-30c.jpg",
        "stock": 50,
        "is_featured": false,
        "is_hot": false,
        "is_special": false,
        "is_new_arrival": true,
        "vendor": "General Mobile",
        "specifications": {
          "display": "6.67\" IPS LCD, 720 x 1600 px",
          "chipset": "Mediatek Helio G81",
          "ram_storage": "4GB/6GB/8GB / 128GB/256GB",
          "main_camera": "50 MP LED Flash",
          "battery": "5000 mAh",
          "os": "Android 14"
        }
      },
      {
        "name": "Tecno Spark 30C 5G",
        "description": "The perfect entry point into 5G with a 120Hz display and a high-performance Dimensity chipset.",
        "price": 285000,
        "original_price": null,
        "discount": null,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-30c-5g.jpg",
        "stock": 20,
        "is_featured": false,
        "is_hot": false,
        "is_special": false,
        "is_new_arrival": true,
        "vendor": "General Mobile",
        "specifications": {
          "display": "6.67\" IPS LCD, 120Hz",
          "chipset": "Mediatek Dimensity 6300 (6 nm)",
          "ram_storage": "4GB / 64GB/128GB",
          "main_camera": "48 MP Main Camera",
          "battery": "5000 mAh",
          "os": "Android 14"
        }
      },
      {
        "name": "Tecno Spark Go 1",
        "description": "Simple, functional, and durable with a large screen and high-capacity battery for all-day use.",
        "price": 135000,
        "original_price": null,
        "discount": null,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-go-1.jpg",
        "stock": 60,
        "is_featured": false,
        "is_hot": false,
        "is_special": false,
        "is_new_arrival": false,
        "vendor": "General Mobile",
        "specifications": {
          "display": "6.67\" IPS LCD, 720 x 1600 px",
          "chipset": "Unisoc T615 (12 nm)",
          "ram_storage": "3GB/4GB / 64GB/128GB",
          "main_camera": "13 MP f/1.8",
          "battery": "5000 mAh",
          "os": "Android 14 (Go edition)"
        }
      },
      {
        "name": "Tecno Spark 20 Pro+",
        "description": "A design masterpiece with a curved AMOLED screen and a powerful 108MP main camera.",
        "price": 465000,
        "original_price": 510000,
        "discount": 9,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-20-pro-plus.jpg",
        "stock": 10,
        "is_featured": true,
        "is_hot": true,
        "is_special": false,
        "is_new_arrival": false,
        "vendor": "Tech Haven Electronics",
        "specifications": {
          "display": "6.78\" AMOLED, 1080 x 2436 px",
          "chipset": "Mediatek Helio G99 Ultimate",
          "ram_storage": "8GB / 256GB",
          "main_camera": "108 MP f/1.8 OIS",
          "battery": "5000 mAh (33W Fast)",
          "os": "Android 14"
        }
      },
      {
        "name": "Infinix Note 50 Pro 4G",
        "description": "Aerospace-grade durability meets high-end tech with a 90W fast charging and an AMOLED panel.",
        "price": 745000,
        "original_price": 790000,
        "discount": 6,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/infinix-note-50-pro-4g.jpg",
        "stock": 8,
        "is_featured": false,
        "is_hot": true,
        "is_special": false,
        "is_new_arrival": true,
        "vendor": "Tech Haven Electronics",
        "specifications": {
          "display": "6.78\" AMOLED, 1080 x 2436 px",
          "chipset": "Mediatek Helio G100 Ultimate (6 nm)",
          "ram_storage": "8GB/12GB / 256GB",
          "main_camera": "50 MP f/1.9 + 1440p Video",
          "battery": "5200 mAh (90W Fast)",
          "os": "Android 15"
        }
      },
      {
        "name": "Infinix Note 50x",
        "description": "Rugged MIL-STD-810H compliant smartphone with 5G connectivity and a massive 5500mAh battery.",
        "price": 620000,
        "original_price": null,
        "discount": null,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/infinix-note-50x.jpg",
        "stock": 10,
        "is_featured": false,
        "is_hot": false,
        "is_special": true,
        "is_new_arrival": true,
        "vendor": "Rugged Tech",
        "specifications": {
          "display": "6.67\" IPS LCD, 120Hz",
          "chipset": "Mediatek Dimensity 7300 Ultimate",
          "ram_storage": "6GB/8GB / 128GB",
          "main_camera": "50 MP f/1.6 (4K Video)",
          "battery": "5500 mAh",
          "os": "Android 15"
        }
      },
      {
        "name": "Infinix Hot 50",
        "description": "A stylish 5G all-rounder with a large 6.7-inch display and IP54 splash resistance.",
        "price": 365000,
        "original_price": 395000,
        "discount": 7,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/infinix-hot-50.jpg",
        "stock": 25,
        "is_featured": false,
        "is_hot": false,
        "is_special": false,
        "is_new_arrival": false,
        "vendor": "Tech Haven Electronics",
        "specifications": {
          "display": "6.7\" IPS LCD, 720 x 1600 px",
          "chipset": "Mediatek Dimensity 6300 (6 nm)",
          "ram_storage": "4GB/8GB / 128GB",
          "main_camera": "48 MP f/1.8",
          "battery": "5000 mAh",
          "os": "Android 14"
        }
      },
      {
        "name": "Infinix Note 50s",
        "description": "Unique scent-infused design with long-lasting fragrance and high-end Dimensity performance.",
        "price": 710000,
        "original_price": null,
        "discount": null,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/infinix-note-50s.jpg",
        "stock": 7,
        "is_featured": false,
        "is_hot": false,
        "is_special": true,
        "is_new_arrival": true,
        "vendor": "Boutique Electronics",
        "specifications": {
          "display": "6.78\" AMOLED, 1080 x 2436 px",
          "chipset": "Mediatek Dimensity 7300 Ultimate",
          "ram_storage": "8GB / 128GB/256GB",
          "main_camera": "64 MP f/1.8 (4K)",
          "battery": "5500 mAh",
          "os": "Android 15"
        }
      },
      {
        "name": "Infinix Note 50 4G",
        "description": "Sleek and professional with an AMOLED screen and customizable RGB notification lighting.",
        "price": 585000,
        "original_price": null,
        "discount": null,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/infinix-note-50-4g.jpg",
        "stock": 20,
        "is_featured": false,
        "is_hot": false,
        "is_special": false,
        "is_new_arrival": true,
        "vendor": "Tech Haven Electronics",
        "specifications": {
          "display": "6.78\" AMOLED, 1080 x 2436 px",
          "chipset": "Mediatek Helio G100 Ultimate",
          "ram_storage": "8GB / 256GB",
          "main_camera": "50 MP f/1.9",
          "battery": "5200 mAh",
          "os": "Android 15"
        }
      },
      {
        "name": "Infinix Hot 50i",
        "description": "Affordable performance with a large screen and reliable 48MP camera for daily use.",
        "price": 215000,
        "original_price": 230000,
        "discount": 6,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/infinix-hot-50i.jpg",
        "stock": 40,
        "is_featured": false,
        "is_hot": false,
        "is_special": false,
        "is_new_arrival": false,
        "vendor": "General Mobile",
        "specifications": {
          "display": "6.7\" IPS LCD, 720 x 1600 px",
          "chipset": "Mediatek Helio G81",
          "ram_storage": "4GB/6GB / 128GB/256GB",
          "main_camera": "48 MP f/1.8",
          "battery": "5000 mAh",
          "os": "Android 14"
        }
      },
      {
        "name": "Infinix Note 40 5G",
        "description": "A high-speed 5G device with a massive 108MP camera and versatile wireless charging capabilities.",
        "price": 525000,
        "original_price": 560000,
        "discount": 6,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/infinix-note-40-5g.jpg",
        "stock": 12,
        "is_featured": false,
        "is_hot": true,
        "is_special": false,
        "is_new_arrival": false,
        "vendor": "Tech Haven Electronics",
        "specifications": {
          "display": "6.78\" AMOLED, 1080 x 2436 px",
          "chipset": "Mediatek Dimensity 7020 (6 nm)",
          "ram_storage": "8GB/12GB / 256GB/512GB",
          "main_camera": "108 MP f/1.8 OIS",
          "battery": "5000 mAh (Wireless Charging)",
          "os": "Android 14"
        }
      },
      {
        "name": "Infinix Hot 50 Pro+ 4G",
        "description": "Ultra-slim 6.8mm profile with a stunning 120Hz AMOLED display and powerful Helio performance.",
        "price": 495000,
        "original_price": 540000,
        "discount": 8,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/infinix-hot-50-pro-plus-4g.jpg",
        "stock": 15,
        "is_featured": true,
        "is_hot": true,
        "is_special": false,
        "is_new_arrival": false,
        "vendor": "Tech Haven Electronics",
        "specifications": {
          "display": "6.78\" AMOLED, 120Hz",
          "chipset": "Mediatek Helio G100 (6 nm)",
          "ram_storage": "8GB / 128GB/256GB",
          "main_camera": "50 MP f/1.6",
          "battery": "5000 mAh (33W Fast)",
          "os": "Android 14"
        }
      },
      {
        "name": "Infinix Note 40X 5G",
        "description": "The definitive 5G powerhouse with a massive 108MP camera and a silky smooth 120Hz display.",
        "price": 465000,
        "original_price": null,
        "discount": null,
        "image": "https://fdn2.gsmarena.com/vv/bigpic/infinix-note-40x-5g.jpg",
        "stock": 18,
        "is_featured": false,
        "is_hot": false,
        "is_special": false,
        "is_new_arrival": false,
        "vendor": "Tech Haven Electronics",
        "specifications": {
          "display": "6.78\" IPS LCD, 1080 x 2460 px",
          "chipset": "Mediatek Dimensity 6300 (6 nm)",
          "ram_storage": "8GB/12GB / 256GB",
          "main_camera": "108 MP f/1.8",
          "battery": "5000 mAh",
          "os": "Android 14"
        }
      },
      {
        name: 'Samsung Galaxy A35 5G',
        description: 'Glass back design with improved durability (IP67) and 5G.',
        price: 495000,
        original_price: 530000,
        discount: 7,
        image: 'https://phonesdata.com/files/models/Samsung-Galaxy-A35-1.jpg',
        stock: 10,
        is_featured: false,
        is_hot: false,
        is_special: true,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.6" Super AMOLED, FHD+, 120 Hz',
          chipset: 'Exynos 1380',
          ram_storage: '8GB / 128GB',
          main_camera: '50 MP OIS + 8 MP ultra-wide + 5 MP macro',
          battery: '5000 mAh',
          os: 'Android 14 (One UI 6.1)'
        }
      },
      {
        name: 'Samsung Galaxy A55 5G',
        description: 'Premium mid-range with metal frame and flagship camera tuning.',
        price: 729900,
        original_price: null,
        discount: null,
        image: 'https://phonesdata.com/files/models/Samsung-Galaxy-A55-1.jpg',
        stock: 8,
        is_featured: true,
        is_hot: false,
        is_special: true,
        is_new_arrival: true,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.6" Super AMOLED, 120 Hz',
          chipset: 'Exynos 1480',
          ram_storage: '8GB / 256GB',
          main_camera: '50 MP OIS + 12 MP ultra-wide + 5 MP macro',
          battery: '5000 mAh',
          os: 'Android 14'
        }
      },
      {
        name: 'Samsung Galaxy M34 5G',
        description: 'Massive 6000 mAh battery — built for two-day usage.',
        price: 418000,
        original_price: 448000,
        discount: 7,
        image: 'https://phonesdata.com/files/models/Samsung-Galaxy-M34-5G-769.jpg',
        stock: 9,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.5" Super AMOLED, 120 Hz',
          chipset: 'Exynos 1280',
          ram_storage: '8GB / 128GB',
          main_camera: '50 MP + 8 MP ultra-wide + 2 MP macro',
          battery: '6000 mAh',
          os: 'Android 14'
        }
      },
      {
        name: 'Samsung Galaxy S23 FE',
        description: 'Flagship experience — versatile triple camera and long software support.',
        price: 1499000,
        original_price: 1690000,
        discount: 11,
        image: 'https://phonesdata.com/files/models/Samsung-Galaxy-S23-FE-646.jpg',
        stock: 5,
        is_featured: true,
        is_hot: false,
        is_special: true,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.4" Dynamic AMOLED 2X, 120 Hz',
          chipset: 'Snapdragon 8 Gen 1 (for Galaxy)',
          ram_storage: '8GB / 256GB',
          main_camera: '50 MP + 12 MP ultra-wide + 8 MP tele 3x',
          battery: '4500 mAh',
          os: 'Android 14'
        }
      },
      {
        name: 'AirPods 2',
        description: 'Wireless earbuds with H1 chip, hands-free "Hey Siri", and 24-hour battery life.',
        price: 349650,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-airpods-2.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: 'N/A',
          chipset: 'Apple H1',
          ram_storage: 'N/A',
          main_camera: 'None',
          battery: '24 hours with case',
          os: 'N/A'
        }
      },
      {
        name: 'AirPods 3',
        description: 'Spatial audio, adaptive EQ, sweat and water resistant earbuds.',
        price: 384650,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-airpods-3.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: 'N/A',
          chipset: 'Apple H1',
          ram_storage: 'N/A',
          main_camera: 'None',
          battery: '30 hours with case',
          os: 'N/A'
        }
      },
      {
        name: 'AirPods 4',
        description: 'Redesigned for all-day comfort, improved sound quality.',
        price: 419650,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-airpods-4.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: 'N/A',
          chipset: 'Apple H2',
          ram_storage: 'N/A',
          main_camera: 'None',
          battery: '30 hours with case',
          os: 'N/A'
        }
      },
      {
        name: 'AirPods 4 (ANC)',
        description: 'Active Noise Cancellation, Transparency mode, and enhanced bass.',
        price: 489650,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-airpods-4.jpg',
        stock: 0,
        is_featured: true,
        is_hot: true,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: 'N/A',
          chipset: 'Apple H2',
          ram_storage: 'N/A',
          main_camera: 'None',
          battery: '30 hours with case',
          os: 'N/A'
        }
      },
      {
        name: 'AirPods Max 1 (Lightning)',
        description: 'Over-ear headphones with high-fidelity audio and computational audio.',
        price: 939750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-airpods-max-1.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: 'N/A',
          chipset: 'Apple H1',
          ram_storage: 'N/A',
          main_camera: 'None',
          battery: '20 hours',
          os: 'N/A'
        }
      },
      {
        name: 'AirPods Max 1 (USB-C)',
        description: 'Over-ear headphones with USB-C charging and spatial audio.',
        price: 939750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-airpods-max-1.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: 'N/A',
          chipset: 'Apple H1',
          ram_storage: 'N/A',
          main_camera: 'None',
          battery: '20 hours',
          os: 'N/A'
        }
      },
      {
        name: 'AirPods Max 2',
        description: 'Next-gen over-ear headphones with H2 chip and improved noise cancellation.',
        price: 999250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-airpods-max-2.jpg',
        stock: 0,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: 'N/A',
          chipset: 'Apple H2',
          ram_storage: 'N/A',
          main_camera: 'None',
          battery: '24 hours',
          os: 'N/A'
        }
      },
      {
        name: 'AirPods Pro 1',
        description: 'Active Noise Cancellation, Transparency mode, customizable fit.',
        price: 419650,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-airpods-pro-1.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: 'N/A',
          chipset: 'Apple H1',
          ram_storage: 'N/A',
          main_camera: 'None',
          battery: '24 hours with case',
          os: 'N/A'
        }
      },
      {
        name: 'AirPods Pro 1 Charging Case',
        description: 'Wireless charging case compatible with Qi-certified chargers.',
        price: 174650,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-airpods-pro-1-charging-case.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: 'N/A',
          chipset: 'N/A',
          ram_storage: 'N/A',
          main_camera: 'None',
          battery: 'N/A',
          os: 'N/A'
        }
      },
      {
        name: 'AirPods Pro 2 with MagSafe Charging Case (Lightning)',
        description: 'H2 chip, 2x noise cancellation, personalized spatial audio.',
        price: 419650,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-airpods-pro-2-with-magsafe-charging-case.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: 'N/A',
          chipset: 'Apple H2',
          ram_storage: 'N/A',
          main_camera: 'None',
          battery: '30 hours with case',
          os: 'N/A'
        }
      },
      {
        name: 'AirPods Pro 2 with MagSafe Charging Case (USB-C)',
        description: 'H2 chip with USB-C charging, advanced noise cancellation.',
        price: 419650,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-airpods-pro-2-with-magsafe-charging-case.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: 'N/A',
          chipset: 'Apple H2',
          ram_storage: 'N/A',
          main_camera: 'None',
          battery: '30 hours with case',
          os: 'N/A'
        }
      },
      {
        name: 'AirPods Pro 3',
        description: 'Next-gen Pro earbuds with enhanced ANC and heart rate monitoring.',
        price: 489650,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-airpods-pro-3.jpg',
        stock: 0,
        is_featured: true,
        is_hot: true,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: 'N/A',
          chipset: 'Apple H3',
          ram_storage: 'N/A',
          main_camera: 'None',
          battery: '36 hours with case',
          os: 'N/A'
        }
      },
    
      // ==================== iPADS ====================
      {
        name: 'iPad 10.2" 7th Gen (Wi-Fi Only)',
        description: '10.2" Retina display with A10 Fusion chip and 8MP camera.',
        price: 575750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-10-2-7th-gen.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '10.2" Retina, 2160x1620 (264 ppi)',
          chipset: 'Apple A10 Fusion (4 Cores, 2.33 GHz)',
          ram_storage: '3GB / 32GB or 128GB',
          main_camera: '8 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 13.1'
        }
      },
      {
        name: 'iPad 10.2" 8th Gen (Wi-Fi Only)',
        description: '10.2" Retina display with A12 Bionic chip and 8MP camera.',
        price: 575750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-10-2-8th-gen.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '10.2" Retina, 2160x1620 (264 ppi)',
          chipset: 'Apple A12 Bionic (6 Cores, 2.49 GHz)',
          ram_storage: '3GB / 32GB or 128GB',
          main_camera: '8 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 14.0'
        }
      },
      {
        name: 'iPad 10.2" 9th Gen (Wi-Fi Only)',
        description: '10.2" Retina display with A13 Bionic chip and 12MP camera.',
        price: 575750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-10-2-9th-gen.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '10.2" Retina, 2160x1620 (264 ppi)',
          chipset: 'Apple A13 Bionic (6 Cores, 2.6 GHz)',
          ram_storage: '3GB / 64GB or 256GB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 15.0'
        }
      },
      {
        name: 'iPad 10.9" 10th Gen (Wi-Fi Only)',
        description: '10.9" Liquid Retina display with A14 Bionic chip and 12MP camera.',
        price: 785750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-10-9-10th-gen.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '10.9" Liquid Retina, 2360x1640 (264 ppi)',
          chipset: 'Apple A14 Bionic (6 Cores, 3.0 GHz)',
          ram_storage: '4GB / 64GB or 256GB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 16.1'
        }
      },
      {
        name: 'iPad A16 - 11th Gen (Wi-Fi Only)',
        description: '11" Liquid Retina display with A16 chip and 12MP camera. Current model.',
        price: 610750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-a16-11th-gen.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: '11" Liquid Retina, 2360x1640 (264 ppi)',
          chipset: 'Apple A16 (5 Cores, 3.4 GHz)',
          ram_storage: '6GB / 128GB, 256GB, or 512GB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 18.3'
        }
      },
      {
        name: 'iPad Air 3rd Gen (Wi-Fi Only)',
        description: '10.5" Retina display with A12 Bionic chip, supports Apple Pencil.',
        price: 873250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-air-3rd-gen.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '10.5" Retina, 2224x1668 (264 ppi)',
          chipset: 'Apple A12 Bionic (6 Cores, 2.49 GHz)',
          ram_storage: '3GB / 64GB or 256GB',
          main_camera: '8 Megapixels',
          battery: '10 hours',
          os: 'iOS 12.2'
        }
      },
      {
        name: 'iPad Air 4th Gen (Wi-Fi Only)',
        description: '10.9" Liquid Retina with A14 Bionic, USB-C, supports Magic Keyboard.',
        price: 1048250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-air-4th-gen.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '10.9" Liquid Retina, 2360x1640 (264 ppi)',
          chipset: 'Apple A14 Bionic (6 Cores, 3.0 GHz)',
          ram_storage: '4GB / 64GB or 256GB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 14.1'
        }
      },
      {
        name: 'iPad Air M1 5th Gen (Wi-Fi Only)',
        description: 'M1 chip performance, 10.9" Liquid Retina, Center Stage camera.',
        price: 1048250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-air-m1-5th-gen.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '10.9" Liquid Retina, 2360x1640 (264 ppi)',
          chipset: 'Apple M1 (8 Cores, 3.2 GHz)',
          ram_storage: '8GB / 64GB or 256GB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 15.4'
        }
      },
      {
        name: 'iPad Air M2 11" (Wi-Fi Only)',
        description: 'M2 chip, 11" Liquid Retina, supports Apple Pencil hover.',
        price: 1048250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-air-m2-11.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '11" Liquid Retina, 2360x1640 (264 ppi)',
          chipset: 'Apple M2 (8 Cores, 3.49 GHz)',
          ram_storage: '8GB / 128GB, 256GB, 512GB, or 1TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 17.5'
        }
      },
      {
        name: 'iPad Air M2 13" (Wi-Fi Only)',
        description: 'M2 chip, 13" Liquid Retina, perfect for multitasking.',
        price: 1398250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-air-m2-13.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '13" Liquid Retina, 2732x2048 (264 ppi)',
          chipset: 'Apple M2 (8 Cores, 3.49 GHz)',
          ram_storage: '8GB / 128GB, 256GB, 512GB, or 1TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 17.5'
        }
      },
      {
        name: 'iPad Air M3 11" (Wi-Fi Only)',
        description: 'M3 chip power, 11" Liquid Retina, ray tracing graphics.',
        price: 1048250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-air-m3-11.jpg',
        stock: 0,
        is_featured: true,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '11" Liquid Retina, 2360x1640 (264 ppi)',
          chipset: 'Apple M3 (8 Cores, 4.05 GHz)',
          ram_storage: '8GB / 128GB, 256GB, 512GB, or 1TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 18.3'
        }
      },
      {
        name: 'iPad Air M3 13" (Wi-Fi Only)',
        description: 'M3 chip, 13" Liquid Retina, pro-level performance.',
        price: 1398250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-air-m3-13.jpg',
        stock: 0,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '13" Liquid Retina, 2732x2048 (264 ppi)',
          chipset: 'Apple M3 (8 Cores, 4.05 GHz)',
          ram_storage: '8GB / 128GB, 256GB, 512GB, or 1TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 18.3'
        }
      },
      {
        name: 'iPad Air M4 11" (Wi-Fi Only)',
        description: 'M4 chip with Wi-Fi 7, 11" Liquid Retina, 12GB RAM.',
        price: 1048250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-air-m4-11.jpg',
        stock: 0,
        is_featured: true,
        is_hot: true,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: '11" Liquid Retina, 2360x1640 (264 ppi)',
          chipset: 'Apple M4 (8 Cores, 4.1 GHz)',
          ram_storage: '12GB / 128GB, 256GB, 512GB, or 1TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 26.3.1'
        }
      },
      {
        name: 'iPad Air M4 13" (Wi-Fi Only)',
        description: 'M4 chip, 13" Liquid Retina, Wi-Fi 7 connectivity.',
        price: 1398250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-air-m4-13.jpg',
        stock: 0,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: '13" Liquid Retina, 2732x2048 (264 ppi)',
          chipset: 'Apple M4 (8 Cores, 4.1 GHz)',
          ram_storage: '12GB / 128GB, 256GB, 512GB, or 1TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 26.3.1'
        }
      },
      {
        name: 'iPad mini 5th Gen (Wi-Fi Only)',
        description: '7.9" Retina display with A12 Bionic, Apple Pencil support.',
        price: 698250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-mini-5th-gen.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '7.9" Retina, 2048x1536 (326 ppi)',
          chipset: 'Apple A12 Bionic (6 Cores, 2.49 GHz)',
          ram_storage: '3GB / 64GB or 256GB',
          main_camera: '8 Megapixels',
          battery: '10 hours',
          os: 'iOS 12.2'
        }
      },
      {
        name: 'iPad mini 6th Gen (Wi-Fi Only)',
        description: '8.3" Liquid Retina with A15 Bionic, USB-C, 5G ready.',
        price: 873250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-mini-6th-gen.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '8.3" Liquid Retina, 2266x1488 (326 ppi)',
          chipset: 'Apple A15 Bionic (6 Cores, 2.9 GHz)',
          ram_storage: '4GB / 64GB or 256GB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 15.0'
        }
      },
      {
        name: 'iPad mini A17 Pro - 7th Gen (Wi-Fi Only)',
        description: 'A17 Pro chip, 8.3" Liquid Retina, AI-powered performance.',
        price: 873250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-mini-a17-pro-7th-gen.jpg',
        stock: 0,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '8.3" Liquid Retina, 2266x1488 (326 ppi)',
          chipset: 'Apple A17 Pro (6 Cores, 3.78 GHz)',
          ram_storage: '8GB / 128GB, 256GB, or 512GB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 18'
        }
      },
      {
        name: 'iPad Pro 11" (Wi-Fi Only)',
        description: '11" Liquid Retina with A12X Bionic, Face ID, ProMotion.',
        price: 1398250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-pro-11.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '11" Liquid Retina, 2388x1668 (264 ppi)',
          chipset: 'Apple A12X Bionic (8 Cores, 2.5 GHz)',
          ram_storage: '4GB or 6GB / 64GB to 1TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iOS 12.1'
        }
      },
      {
        name: 'iPad Pro 11" (Wi-Fi Only - 2nd Gen)',
        description: '11" Liquid Retina with A12Z Bionic, LiDAR scanner.',
        price: 1398250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-pro-11.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '11" Liquid Retina, 2388x1668 (264 ppi)',
          chipset: 'Apple A12Z Bionic (8 Cores, 2.5 GHz)',
          ram_storage: '6GB / 128GB, 256GB, 512GB, or 1TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 13.4'
        }
      },
      {
        name: 'iPad Pro 11" (Wi-Fi Only - 3rd Gen)',
        description: 'M1 chip, Thunderbolt port, 11" Liquid Retina.',
        price: 1398250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-pro-11.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '11" Liquid Retina, 2388x1668 (264 ppi)',
          chipset: 'Apple M1 (8 Cores, 3.2 GHz)',
          ram_storage: '8GB or 16GB / 128GB to 2TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 14.5.1'
        }
      },
      {
        name: 'iPad Pro 11" (Wi-Fi Only - 4th Gen)',
        description: 'M2 chip, Wi-Fi 6E, 11" Liquid Retina display.',
        price: 1398250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-pro-11.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '11" Liquid Retina, 2388x1668 (264 ppi)',
          chipset: 'Apple M2 (8 Cores, 3.49 GHz)',
          ram_storage: '8GB or 16GB / 128GB to 2TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 16.1'
        }
      },
      {
        name: 'iPad Pro 12.9" (Wi-Fi Only - 3rd Gen)',
        description: '12.9" Liquid Retina with A12X Bionic, Face ID.',
        price: 1748250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-pro-12-9.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '12.9" Liquid Retina, 2732x2048 (264 ppi)',
          chipset: 'Apple A12X Bionic (8 Cores, 2.5 GHz)',
          ram_storage: '4GB or 6GB / 64GB to 1TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iOS 12.1'
        }
      },
      {
        name: 'iPad Pro 12.9" (Wi-Fi Only - 4th Gen)',
        description: '12.9" Liquid Retina with A12Z Bionic, LiDAR.',
        price: 1748250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-pro-12-9.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '12.9" Liquid Retina, 2732x2048 (264 ppi)',
          chipset: 'Apple A12Z Bionic (8 Cores, 2.5 GHz)',
          ram_storage: '6GB / 128GB, 256GB, 512GB, or 1TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 13.4'
        }
      },
      {
        name: 'iPad Pro 12.9" (Wi-Fi Only - 5th Gen)',
        description: 'M1 chip, Liquid Retina XDR display, Thunderbolt.',
        price: 1923250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-pro-12-9.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '12.9" Liquid Retina XDR, 2732x2048 (264 ppi)',
          chipset: 'Apple M1 (8 Cores, 3.2 GHz)',
          ram_storage: '8GB or 16GB / 128GB to 2TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 14.5.1'
        }
      },
      {
        name: 'iPad Pro 12.9" (Wi-Fi Only - 6th Gen)',
        description: 'M2 chip, Liquid Retina XDR, Wi-Fi 6E.',
        price: 1923250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-pro-12-9.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '12.9" Liquid Retina XDR, 2732x2048 (264 ppi)',
          chipset: 'Apple M2 (8 Cores, 3.49 GHz)',
          ram_storage: '8GB or 16GB / 128GB to 2TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 16.1'
        }
      },
      {
        name: 'iPad Pro M4 11" (Wi-Fi Only)',
        description: 'M4 chip, Ultra Retina XDR display, tandem OLED technology.',
        price: 1748250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-pro-m4-11.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '11" Ultra Retina XDR, 2420x1668 (264 ppi)',
          chipset: 'Apple M4 (9-10 Cores, 4.4 GHz)',
          ram_storage: '8GB or 16GB / 256GB to 2TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 17.5'
        }
      },
      {
        name: 'iPad Pro M4 13" (Wi-Fi Only)',
        description: 'M4 chip, 13" Ultra Retina XDR, thinnest iPad ever.',
        price: 2273250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-pro-m4-13.jpg',
        stock: 0,
        is_featured: true,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '13" Ultra Retina XDR, 2752x2064 (264 ppi)',
          chipset: 'Apple M4 (9-10 Cores, 4.4 GHz)',
          ram_storage: '8GB or 16GB / 256GB to 2TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 17.5'
        }
      },
      {
        name: 'iPad Pro M5 11" (Wi-Fi Only)',
        description: 'M5 chip, Wi-Fi 7, 11" Ultra Retina XDR display.',
        price: 1748250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-pro-m5-11.jpg',
        stock: 0,
        is_featured: true,
        is_hot: true,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: '11" Ultra Retina XDR, 2420x1668 (264 ppi)',
          chipset: 'Apple M5 (9-10 Cores, 4.4 GHz)',
          ram_storage: '12GB or 16GB / 256GB to 2TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 26.0'
        }
      },
      {
        name: 'iPad Pro M5 13" (Wi-Fi Only)',
        description: 'M5 chip, 13" Ultra Retina XDR, ultimate iPad experience.',
        price: 2273250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/ipad-pro-m5-13.jpg',
        stock: 0,
        is_featured: true,
        is_hot: true,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: '13" Ultra Retina XDR, 2752x2064 (264 ppi)',
          chipset: 'Apple M5 (9-10 Cores, 4.4 GHz)',
          ram_storage: '12GB or 16GB / 256GB to 2TB',
          main_camera: '12 Megapixels',
          battery: '10 hours',
          os: 'iPadOS 26.0'
        }
      },
    
      // ==================== iPHONES ====================
      {
        name: 'iPhone 11 (US/Canada/A2111)',
        description: '6.1" Liquid Retina HD, A13 Bionic, dual-camera system.',
        price: 1223250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-11.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.1" Liquid Retina HD, 1792x828 (326 ppi)',
          chipset: 'Apple A13 Bionic (6 Cores, 2.66 GHz)',
          ram_storage: '4GB / 64GB, 128GB, or 256GB',
          main_camera: '12.0 Megapixels (Dual)',
          battery: '65 hours audio',
          os: 'iOS 13.0'
        }
      },
      {
        name: 'iPhone 11 Pro (US/Canada/A2160)',
        description: '5.8" Super Retina XDR, triple-camera system, stainless steel.',
        price: 1748250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-11-pro.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '5.8" Super Retina XDR, 2436x1125 (458 ppi)',
          chipset: 'Apple A13 Bionic (6 Cores, 2.66 GHz)',
          ram_storage: '4GB / 64GB, 256GB, or 512GB',
          main_camera: '12.0 Megapixels (Triple)',
          battery: '65 hours audio',
          os: 'iOS 13.0'
        }
      },
      {
        name: 'iPhone 11 Pro Max (US/CA/A2161)',
        description: '6.5" Super Retina XDR, triple-camera, best battery life of its time.',
        price: 1923250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-11-pro-max.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.5" Super Retina XDR, 2688x1242 (458 ppi)',
          chipset: 'Apple A13 Bionic (6 Cores, 2.66 GHz)',
          ram_storage: '4GB / 64GB, 256GB, or 512GB',
          main_camera: '12.0 Megapixels (Triple)',
          battery: '80 hours audio',
          os: 'iOS 13.0'
        }
      },
      {
        name: 'iPhone 12 (US/A2172)',
        description: '6.1" Super Retina XDR, A14 Bionic, 5G capable.',
        price: 1450750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-12.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.1" Super Retina XDR, 2532x1170 (460 ppi)',
          chipset: 'Apple A14 Bionic (6 Cores, 3.0 GHz)',
          ram_storage: '4GB / 64GB, 128GB, or 256GB',
          main_camera: '12.0 Megapixels (Dual)',
          battery: '65 hours audio',
          os: 'iOS 14.1'
        }
      },
      {
        name: 'iPhone 12 mini (US/A2176)',
        description: '5.4" Super Retina XDR, smallest 5G iPhone, A14 Bionic.',
        price: 1275750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-12-mini.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '5.4" Super Retina XDR, 2340x1080 (476 ppi)',
          chipset: 'Apple A14 Bionic (6 Cores, 3.0 GHz)',
          ram_storage: '4GB / 64GB, 128GB, or 256GB',
          main_camera: '12.0 Megapixels (Dual)',
          battery: '50 hours audio',
          os: 'iOS 14.2'
        }
      },
      {
        name: 'iPhone 12 Pro (US/A2341)',
        description: '6.1" Super Retina XDR, triple-camera with LiDAR, stainless steel.',
        price: 1748250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-12-pro.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.1" Super Retina XDR, 2532x1170 (460 ppi)',
          chipset: 'Apple A14 Bionic (6 Cores, 3.0 GHz)',
          ram_storage: '6GB / 128GB, 256GB, or 512GB',
          main_camera: '12.0 Megapixels (Triple + LiDAR)',
          battery: '65 hours audio',
          os: 'iOS 14.1'
        }
      },
      {
        name: 'iPhone 12 Pro Max (US/A2342)',
        description: '6.7" Super Retina XDR, best camera system, stainless steel.',
        price: 1923250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-12-pro-max.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.7" Super Retina XDR, 2778x1284 (458 ppi)',
          chipset: 'Apple A14 Bionic (6 Cores, 3.0 GHz)',
          ram_storage: '6GB / 128GB, 256GB, or 512GB',
          main_camera: '12.0 Megapixels (Triple + LiDAR)',
          battery: '80 hours audio',
          os: 'iOS 14.2'
        }
      },
      {
        name: 'iPhone 13 (US/A2482)',
        description: '6.1" Super Retina XDR, A15 Bionic, advanced dual-camera.',
        price: 1398250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-13.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.1" Super Retina XDR, 2532x1170 (460 ppi)',
          chipset: 'Apple A15 Bionic (6 Cores, 3.2 GHz)',
          ram_storage: '4GB / 128GB, 256GB, or 512GB',
          main_camera: '12.0 Megapixels (Dual)',
          battery: '75 hours audio',
          os: 'iOS 15.0'
        }
      },
      {
        name: 'iPhone 13 mini (US/A2481)',
        description: '5.4" Super Retina XDR, A15 Bionic, compact power.',
        price: 1223250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-13-mini.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '5.4" Super Retina XDR, 2340x1080 (476 ppi)',
          chipset: 'Apple A15 Bionic (6 Cores, 3.2 GHz)',
          ram_storage: '4GB / 128GB, 256GB, or 512GB',
          main_camera: '12.0 Megapixels (Dual)',
          battery: '55 hours audio',
          os: 'iOS 15.0'
        }
      },
      {
        name: 'iPhone 13 Pro (US/A2483)',
        description: '6.1" Super Retina XDR with ProMotion, triple-camera, stainless steel.',
        price: 1748250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-13-pro.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.1" Super Retina XDR with ProMotion, 2532x1170 (460 ppi)',
          chipset: 'Apple A15 Bionic (6 Cores, 3.2 GHz)',
          ram_storage: '6GB / 128GB to 1TB',
          main_camera: '12.0 Megapixels (Triple + LiDAR)',
          battery: '75 hours audio',
          os: 'iOS 15.0'
        }
      },
      {
        name: 'iPhone 13 Pro Max (US/A2484)',
        description: '6.7" Super Retina XDR with ProMotion, best battery life.',
        price: 1923250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-13-pro-max.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.7" Super Retina XDR with ProMotion, 2778x1284 (458 ppi)',
          chipset: 'Apple A15 Bionic (6 Cores, 3.2 GHz)',
          ram_storage: '6GB / 128GB to 1TB',
          main_camera: '12.0 Megapixels (Triple + LiDAR)',
          battery: '95 hours audio',
          os: 'iOS 15.0'
        }
      },
      {
        name: 'iPhone 14 (US/A2649)',
        description: '6.1" Super Retina XDR, A15 Bionic, crash detection.',
        price: 1398250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-14.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.1" Super Retina XDR, 2532x1170 (460 ppi)',
          chipset: 'Apple A15 Bionic (6 Cores, 3.2 GHz)',
          ram_storage: '6GB / 128GB, 256GB, or 512GB',
          main_camera: '12.0 Megapixels (Dual)',
          battery: '80 hours audio',
          os: 'iOS 16.0'
        }
      },
      {
        name: 'iPhone 14 Plus (US/A2632)',
        description: '6.7" Super Retina XDR, A15 Bionic, big screen.',
        price: 1573250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-14-plus.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.7" Super Retina XDR, 2778x1284 (458 ppi)',
          chipset: 'Apple A15 Bionic (6 Cores, 3.2 GHz)',
          ram_storage: '6GB / 128GB, 256GB, or 512GB',
          main_camera: '12.0 Megapixels (Dual)',
          battery: '100 hours audio',
          os: 'iOS 16.0'
        }
      },
      {
        name: 'iPhone 14 Pro (US/A2650)',
        description: '6.1" Super Retina XDR with Dynamic Island, A16 Bionic, 48MP camera.',
        price: 1748250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-14-pro.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.1" Super Retina XDR with ProMotion, 2556x1179 (460 ppi)',
          chipset: 'Apple A16 Bionic (6 Cores, 3.5 GHz)',
          ram_storage: '6GB / 128GB to 1TB',
          main_camera: '48 Megapixels (Triple + LiDAR)',
          battery: '75 hours audio',
          os: 'iOS 16.0'
        }
      },
      {
        name: 'iPhone 14 Pro Max (US/A2651)',
        description: '6.7" Super Retina XDR, Dynamic Island, A16 Bionic.',
        price: 1923250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-14-pro-max.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.7" Super Retina XDR with ProMotion, 2796x1290 (460 ppi)',
          chipset: 'Apple A16 Bionic (6 Cores, 3.5 GHz)',
          ram_storage: '6GB / 128GB to 1TB',
          main_camera: '48 Megapixels (Triple + LiDAR)',
          battery: '95 hours audio',
          os: 'iOS 16.0'
        }
      },
      {
        name: 'iPhone 15 (US/A2846)',
        description: '6.1" Super Retina XDR, Dynamic Island, USB-C, 48MP main camera.',
        price: 1398250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-15.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.1" Super Retina XDR, 2556x1179 (460 ppi)',
          chipset: 'Apple A16 Bionic (6 Cores, 3.5 GHz)',
          ram_storage: '6GB / 128GB, 256GB, or 512GB',
          main_camera: '48 Megapixels (Dual)',
          battery: '80 hours audio',
          os: 'iOS 17.0.2'
        }
      },
      {
        name: 'iPhone 15 Plus (US/A2847)',
        description: '6.7" Super Retina XDR, Dynamic Island, USB-C.',
        price: 1573250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-15-plus.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.7" Super Retina XDR, 2796x1290 (460 ppi)',
          chipset: 'Apple A16 Bionic (6 Cores, 3.5 GHz)',
          ram_storage: '6GB / 128GB, 256GB, or 512GB',
          main_camera: '48 Megapixels (Dual)',
          battery: '100 hours audio',
          os: 'iOS 17.0.2'
        }
      },
      {
        name: 'iPhone 15 Pro (US/A2848)',
        description: '6.1" Super Retina XDR, titanium design, A17 Pro, Action button.',
        price: 1748250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-15-pro.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.1" Super Retina XDR with ProMotion, 2556x1179 (460 ppi)',
          chipset: 'Apple A17 Pro (6 Cores, 3.78 GHz)',
          ram_storage: '8GB / 128GB, 256GB, 512GB, or 1TB',
          main_camera: '48 Megapixels (Triple + LiDAR)',
          battery: '75 hours audio',
          os: 'iOS 17.0.2'
        }
      },
      {
        name: 'iPhone 15 Pro Max (US/A2849)',
        description: '6.7" Super Retina XDR, titanium, 5x optical zoom, A17 Pro.',
        price: 2098250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-15-pro-max.jpg',
        stock: 0,
        is_featured: true,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.7" Super Retina XDR with ProMotion, 2796x1290 (460 ppi)',
          chipset: 'Apple A17 Pro (6 Cores, 3.78 GHz)',
          ram_storage: '8GB / 256GB, 512GB, or 1TB',
          main_camera: '48 Megapixels (Triple + LiDAR)',
          battery: '95 hours audio',
          os: 'iOS 17.0.2'
        }
      },
      {
        name: 'iPhone 16 (US/A3081)',
        description: '6.1" Super Retina XDR, A18 chip, Camera Control button.',
        price: 1398250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-16.jpg',
        stock: 0,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.1" Super Retina XDR, 2556x1179 (460 ppi)',
          chipset: 'Apple A18 (6 Cores, 4.0 GHz)',
          ram_storage: '8GB / 128GB, 256GB, or 512GB',
          main_camera: '48 Megapixels (Dual)',
          battery: '80 hours audio',
          os: 'iOS 18.0'
        }
      },
      {
        name: 'iPhone 16 Plus (US/A3082)',
        description: '6.7" Super Retina XDR, A18 chip, Camera Control.',
        price: 1573250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-16-plus.jpg',
        stock: 0,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.7" Super Retina XDR, 2796x1290 (460 ppi)',
          chipset: 'Apple A18 (6 Cores, 4.0 GHz)',
          ram_storage: '8GB / 128GB, 256GB, or 512GB',
          main_camera: '48 Megapixels (Dual)',
          battery: '80 hours audio',
          os: 'iOS 18.0'
        }
      },
      {
        name: 'iPhone 16 Pro (US/A3083)',
        description: '6.3" Super Retina XDR, A18 Pro, titanium, 5x optical zoom.',
        price: 1748250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-16-pro.jpg',
        stock: 0,
        is_featured: true,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.3" Super Retina XDR with ProMotion, 2622x1206 (460 ppi)',
          chipset: 'Apple A18 Pro (6 Cores, 4.0 GHz)',
          ram_storage: '8GB / 128GB to 1TB',
          main_camera: '48 Megapixels (Triple + LiDAR)',
          battery: '85 hours audio',
          os: 'iOS 18.0'
        }
      },
      {
        name: 'iPhone 16 Pro Max (US/A3084)',
        description: '6.9" Super Retina XDR, A18 Pro, longest battery life ever.',
        price: 2098250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-16-pro-max.jpg',
        stock: 0,
        is_featured: true,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.9" Super Retina XDR with ProMotion, 2868x1320 (460 ppi)',
          chipset: 'Apple A18 Pro (6 Cores, 4.0 GHz)',
          ram_storage: '8GB / 256GB, 512GB, or 1TB',
          main_camera: '48 Megapixels (Triple + LiDAR)',
          battery: '105 hours audio',
          os: 'iOS 18.0'
        }
      },
      {
        name: 'iPhone 16e (US/A3212)',
        description: '6.1" Super Retina XDR, A18 chip, affordable entry.',
        price: 1048250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-16e.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.1" Super Retina XDR, 2532x1170 (460 ppi)',
          chipset: 'Apple A18 (6 Cores, 4.0 GHz)',
          ram_storage: '8GB / 128GB, 256GB, or 512GB',
          main_camera: '48 Megapixels (Single)',
          battery: '90 hours audio',
          os: 'iOS 18.3.1'
        }
      },
      {
        name: 'iPhone 17 (US/A3258)',
        description: '6.3" Super Retina XDR, A19 chip, new design language.',
        price: 1398250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-17.jpg',
        stock: 0,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.3" Super Retina XDR with ProMotion, 2622x1206 (460 ppi)',
          chipset: 'Apple A19 (6 Cores, 4.25 GHz)',
          ram_storage: '8GB / 256GB or 512GB',
          main_camera: '48 Megapixels (Dual)',
          battery: '30 hours video',
          os: 'iOS 26.0'
        }
      },
      {
        name: 'iPhone 17 Pro (US/A3256)',
        description: '6.3" Super Retina XDR, A19 Pro, 12GB RAM, enhanced cameras.',
        price: 1923250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-17-pro.jpg',
        stock: 0,
        is_featured: true,
        is_hot: true,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.3" Super Retina XDR with ProMotion, 2622x1206 (460 ppi)',
          chipset: 'Apple A19 Pro (6 Cores, 4.25 GHz)',
          ram_storage: '12GB / 256GB, 512GB, or 1TB',
          main_camera: '48 Megapixels (Triple + LiDAR)',
          battery: '33 hours video',
          os: 'iOS 26.0'
        }
      },
      {
        name: 'iPhone 17 Pro Max (US/A3257)',
        description: '6.9" Super Retina XDR, A19 Pro, up to 2TB storage.',
        price: 2098250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-17-pro-max.jpg',
        stock: 0,
        is_featured: true,
        is_hot: true,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.9" Super Retina XDR with ProMotion, 2868x1320 (460 ppi)',
          chipset: 'Apple A19 Pro (6 Cores, 4.25 GHz)',
          ram_storage: '12GB / 256GB to 2TB',
          main_camera: '48 Megapixels (Triple + LiDAR)',
          battery: '39 hours video',
          os: 'iOS 26.0'
        }
      },
      {
        name: 'iPhone Air (US/CA/MX/SA/A3260)',
        description: '6.5" Super Retina XDR, ultra-thin design, A19 Pro chip.',
        price: 1748250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-air.jpg',
        stock: 0,
        is_featured: true,
        is_hot: true,
        is_special: true,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.5" Super Retina XDR with ProMotion, 2736x1260 (460 ppi)',
          chipset: 'Apple A19 Pro (6 Cores, 4.25 GHz)',
          ram_storage: '12GB / 256GB, 512GB, or 1TB',
          main_camera: '48 Megapixels (Dual)',
          battery: '27 hours video',
          os: 'iOS 26.0'
        }
      },
      {
        name: 'iPhone SE (2nd Gen) (US/CA/A2275)',
        description: '4.7" Retina HD, A13 Bionic, Touch ID, affordable classic.',
        price: 698250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-se.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '4.7" Retina HD, 1334x750 (326 ppi)',
          chipset: 'Apple A13 Bionic (6 Cores, 2.66 GHz)',
          ram_storage: '3GB / 64GB, 128GB, or 256GB',
          main_camera: '12.0 Megapixels (Single)',
          battery: '40 hours audio',
          os: 'iOS 13.4.1'
        }
      },
      {
        name: 'iPhone SE (3rd Gen) (US/CA/A2595)',
        description: '4.7" Retina HD, A15 Bionic, 5G, Touch ID.',
        price: 750750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-se.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '4.7" Retina HD, 1334x750 (326 ppi)',
          chipset: 'Apple A15 Bionic (6 Cores, 3.2 GHz)',
          ram_storage: '4GB / 64GB, 128GB, or 256GB',
          main_camera: '12.0 Megapixels (Single)',
          battery: '50 hours audio',
          os: 'iOS 15.4'
        }
      },
      {
        name: 'iPhone XR (US/Canada/A1984)',
        description: '6.1" Liquid Retina HD, A12 Bionic, colorful design.',
        price: 1310750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-xr.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.1" Liquid Retina HD, 1792x828 (326 ppi)',
          chipset: 'Apple A12 Bionic (6 Cores, 2.49 GHz)',
          ram_storage: '3GB / 64GB, 128GB, or 256GB',
          main_camera: '12.0 Megapixels (Single)',
          battery: '65 hours audio',
          os: 'iOS 12.0'
        }
      },
      {
        name: 'iPhone Xs (US/Canada/Hong Kong/A1920)',
        description: '5.8" Super Retina, A12 Bionic, dual-camera, stainless steel.',
        price: 1748250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-xs.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '5.8" Super Retina, 2436x1125 (458 ppi)',
          chipset: 'Apple A12 Bionic (6 Cores, 2.49 GHz)',
          ram_storage: '4GB / 64GB, 256GB, or 512GB',
          main_camera: '12.0 Megapixels (Dual)',
          battery: '60 hours audio',
          os: 'iOS 12.0'
        }
      },
      {
        name: 'iPhone Xs Max (US/Canada/A1921)',
        description: '6.5" Super Retina, A12 Bionic, largest iPhone of its generation.',
        price: 1923250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/iphone-xs-max.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '6.5" Super Retina, 2688x1242 (458 ppi)',
          chipset: 'Apple A12 Bionic (6 Cores, 2.49 GHz)',
          ram_storage: '4GB / 64GB, 256GB, or 512GB',
          main_camera: '12.0 Megapixels (Dual)',
          battery: '65 hours audio',
          os: 'iOS 12.0'
        }
      },
    
      // ==================== WATCHES ====================
      {
        name: 'Apple Watch SE (GPS, 40 mm)',
        description: 'Essential features, large Retina display, crash detection.',
        price: 488250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-watch-se.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '1.8" OLED Retina, 324x394',
          chipset: 'Apple S5',
          ram_storage: '1GB / 32GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 7.0'
        }
      },
      {
        name: 'Apple Watch SE (GPS, 44 mm)',
        description: 'Larger display, essential features, family setup.',
        price: 540750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-watch-se.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '2.0" OLED Retina, 368x448',
          chipset: 'Apple S5',
          ram_storage: '1GB / 32GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 7.0'
        }
      },
      {
        name: 'Apple Watch SE 2 (GPS, 40 mm)',
        description: 'S8 chip, crash detection, affordable smartwatch.',
        price: 435750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-watch-se-2.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '1.8" OLED Retina, 324x394',
          chipset: 'Apple S8',
          ram_storage: '1GB / 32GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 9'
        }
      },
      {
        name: 'Apple Watch SE 2 (GPS, 44 mm)',
        description: 'S8 chip, larger display, all-day battery life.',
        price: 488250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-watch-se-2.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '2.0" OLED Retina, 368x448',
          chipset: 'Apple S8',
          ram_storage: '1GB / 32GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 9'
        }
      },
      {
        name: 'Apple Watch SE 3 (GPS, 40 mm)',
        description: 'S10 chip, 64GB storage, brighter display.',
        price: 435750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-watch-se-3.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: '1.8" OLED Retina, 324x394',
          chipset: 'Apple S10',
          ram_storage: '1GB / 64GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 26.0'
        }
      },
      {
        name: 'Apple Watch SE 3 (GPS, 44 mm)',
        description: 'S10 chip, larger screen, 64GB storage.',
        price: 488250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/bigpic/apple-watch-se-3.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: '2.0" OLED Retina, 368x448',
          chipset: 'Apple S10',
          ram_storage: '1GB / 64GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 26.0'
        }
      },
      {
        name: 'Apple Watch Series 4 (Aluminum, GPS, 40 mm)',
        description: 'First with ECG, larger display, faster S4 chip.',
        price: 698250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-watch-series-4-steel-1.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '1.8" OLED Retina, 324x394',
          chipset: 'Apple S4',
          ram_storage: '1GB / 8GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 5.0'
        }
      },
      {
        name: 'Apple Watch Series 4 (Aluminum, GPS, 44 mm)',
        description: 'ECG app, fall detection, larger 44mm case.',
        price: 750750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-watch-series-4-steel-1.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '2.0" OLED Retina, 368x448',
          chipset: 'Apple S4',
          ram_storage: '1GB / 8GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 5.0'
        }
      },
      {
        name: 'Apple Watch Series 5 (Aluminum, GPS, 40 mm)',
        description: 'Always-On Retina display, compass, elevation.',
        price: 698250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-watch-5-ss.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '1.8" OLED Retina, 324x394',
          chipset: 'Apple S5',
          ram_storage: '1GB / 32GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 6.0'
        }
      },
      {
        name: 'Apple Watch Series 5 (Aluminum, GPS, 44 mm)',
        description: 'Always-On display, built-in compass, 32GB storage.',
        price: 750750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-watch-5-ss.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '2.0" OLED Retina, 368x448',
          chipset: 'Apple S5',
          ram_storage: '1GB / 32GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 6.0'
        }
      },
      {
        name: 'Apple Watch Series 6 (Aluminum, GPS, 40 mm)',
        description: 'Blood Oxygen sensor, always-on altimeter, S6 chip.',
        price: 698250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-watch-s6-steel-1.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '1.8" OLED Retina, 324x394',
          chipset: 'Apple S6',
          ram_storage: '1GB / 32GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 7.0'
        }
      },
      {
        name: 'Apple Watch Series 6 (Aluminum, GPS, 44 mm)',
        description: 'Blood Oxygen monitoring, fast charging, U1 chip.',
        price: 750750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-watch-s6-steel-1.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '2.0" OLED Retina, 368x448',
          chipset: 'Apple S6',
          ram_storage: '1GB / 32GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 7.0'
        }
      },
      {
        name: 'Apple Watch Series 7 (Aluminum, GPS, 41 mm)',
        description: 'Largest display yet, faster charging, crack-resistant glass.',
        price: 698250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-watch-series-7-stainless-steel-1.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '1.8" OLED Retina, 352x430',
          chipset: 'Apple S7',
          ram_storage: '1GB / 32GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 8'
        }
      },
      {
        name: 'Apple Watch Series 7 (Aluminum, GPS, 45 mm)',
        description: 'Nearly 20% larger screen, durable design, fast charging.',
        price: 750750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-watch-series-7-stainless-steel-1.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '1.9" OLED Retina, 396x484',
          chipset: 'Apple S7',
          ram_storage: '1GB / 32GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 8'
        }
      },
      {
        name: 'Apple Watch Series 8 (Aluminum, GPS, 41 mm)',
        description: 'Temperature sensing, crash detection, ovulation tracking.',
        price: 698250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-watch-8-2.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '1.8" OLED Retina, 352x430',
          chipset: 'Apple S8',
          ram_storage: '1GB / 32GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 9'
        }
      },
      {
        name: 'Apple Watch Series 8 (Aluminum, GPS, 45 mm)',
        description: 'Advanced health sensors, crash detection, low power mode.',
        price: 750750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-watch-8-2.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '1.9" OLED Retina, 396x484',
          chipset: 'Apple S8',
          ram_storage: '1GB / 32GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 9'
        }
      },
      {
        name: 'Apple Watch Series 9 (Aluminum, GPS, 41 mm)',
        description: 'S9 chip, double tap gesture, brighter display.',
        price: 698250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-watch-series9-1.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '1.8" OLED Retina, 352x430',
          chipset: 'Apple S9',
          ram_storage: '1GB / 64GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 10.0.1'
        }
      },
      {
        name: 'Apple Watch Series 9 (Aluminum, GPS, 45 mm)',
        description: 'S9 chip, on-device Siri, 2000 nits brightness.',
        price: 750750,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-watch-series9-1.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '1.9" OLED Retina, 396x484',
          chipset: 'Apple S9',
          ram_storage: '1GB / 64GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 10.0.1'
        }
      },
      {
        name: 'Apple Watch Series 10 (Aluminum, GPS, 42 mm)',
        description: 'Thinner design, larger display, S10 chip.',
        price: 698250,
        original_price: null,
        discount: null,
        image: 'https://cdsassets.apple.com/live/7WUAS350/images/tech-specs/121202-apple-watch-series-10.png',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '2.0" OLED Retina, 374x446 (326 ppi)',
          chipset: 'Apple S10',
          ram_storage: '1GB / 64GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 11'
        }
      },
      {
        name: 'Apple Watch Series 10 (Aluminum, GPS, 46 mm)',
        description: 'Largest Apple Watch display, S10 chip, thin design.',
        price: 750750,
        original_price: null,
        discount: null,
        image: 'https://cdsassets.apple.com/live/7WUAS350/images/tech-specs/121202-apple-watch-series-10.png',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '2.1" OLED Retina, 416x496 (326 ppi)',
          chipset: 'Apple S10',
          ram_storage: '1GB / 64GB',
          main_camera: 'None',
          battery: '18 hours',
          os: 'watchOS 11'
        }
      },
      {
        name: 'Apple Watch Series 11 (Aluminum, GPS, 42 mm)',
        description: '24-hour battery, S10 chip, improved health features.',
        price: 698250,
        original_price: null,
        discount: null,
        image: 'https://www.apple.com/v/apple-watch-series-11/c/images/overview/health/health_sleep_score__d4pcoy8v0cwi_large_2x.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: '2.0" OLED Retina, 374x446 (326 ppi)',
          chipset: 'Apple S10',
          ram_storage: '1GB / 64GB',
          main_camera: 'None',
          battery: '24 hours',
          os: 'watchOS 26.0'
        }
      },
      {
        name: 'Apple Watch Series 11 (Aluminum, GPS, 46 mm)',
        description: '24-hour battery, largest display, advanced sensors.',
        price: 838250,
        original_price: null,
        discount: null,
        image: 'https://www.apple.com/v/apple-watch-series-11/c/images/overview/health/health_sleep_score__d4pcoy8v0cwi_large_2x.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: '2.1" OLED Retina, 416x496 (326 ppi)',
          chipset: 'Apple S10',
          ram_storage: '1GB / 64GB',
          main_camera: 'None',
          battery: '24 hours',
          os: 'watchOS 26.0'
        }
      },
      {
        name: 'Apple Watch Ultra (US/CA, 49 mm)',
        description: 'Titanium case, 49mm, action button, 100m water resistant.',
        price: 1398250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-watch-ultra-1.jpg',
        stock: 0,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '1.92" OLED Retina, 410x502',
          chipset: 'Apple S8',
          ram_storage: '1GB / 32GB',
          main_camera: 'None',
          battery: '36 hours',
          os: 'watchOS 9'
        }
      },
      {
        name: 'Apple Watch Ultra 2 (US/CA, 49 mm)',
        description: 'S9 chip, 3000 nits brightness, double tap gesture.',
        price: 1398250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-watch-ultra2-black.jpg',
        stock: 0,
        is_featured: true,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Apple Inc.',
        specifications: {
          display: '1.92" OLED Retina, 410x502',
          chipset: 'Apple S9',
          ram_storage: '1GB / 64GB',
          main_camera: 'None',
          battery: '36 hours',
          os: 'watchOS 10.0.1'
        }
      },
      {
        name: 'Apple Watch Ultra 3 (49 mm)',
        description: 'S10 chip, 42-hour battery, thinner profile, advanced diving.',
        price: 1398250,
        original_price: null,
        discount: null,
        image: 'https://fdn2.gsmarena.com/vv/pics/apple/apple-watch-ultra3-1.jpg',
        stock: 0,
        is_featured: true,
        is_hot: true,
        is_special: false,
        is_new_arrival: true,
        vendor: 'Apple Inc.',
        specifications: {
          display: '1.95" OLED Retina, 422x514',
          chipset: 'Apple S10',
          ram_storage: '1GB / 64GB',
          main_camera: 'None',
          battery: '42 hours',
          os: 'watchOS 26.0'
        }
      },
      {
        name: 'Samsung Galaxy S24',
        description: 'Compact flagship with bright LTPO display and AI-assisted features.',
        price: 2189000,
        original_price: null,
        discount: null,
        image: 'https://phonesdata.com/files/models/Samsung-Galaxy-S24-1.jpg',
        stock: 4,
        is_featured: false,
        is_hot: false,
        is_special: true,
        is_new_arrival: true,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.2" Dynamic AMOLED 2X LTPO, 1–120 Hz',
          chipset: 'Snapdragon 8 Gen 3 (region dependent)',
          ram_storage: '8GB / 256GB',
          main_camera: '50 MP OIS + 12 MP ultra-wide + 10 MP tele 3x',
          battery: '4000 mAh',
          os: 'Android 14 (One UI 6.1)'
        }
      },
      {
        name: 'Samsung Galaxy S24 Ultra',
        description: 'Ultimate Galaxy — S Pen, 200 MP camera, and titanium frame.',
        price: 3949000,
        original_price: 4250000,
        discount: 7,
        image: 'https://phonesdata.com/files/models/Samsung-Galaxy-S24-Ultra-1.jpg',
        stock: 3,
        is_featured: true,
        is_hot: true,
        is_special: true,
        is_new_arrival: true,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.8" Dynamic AMOLED 2X LTPO',
          chipset: 'Snapdragon 8 Gen 3 for Galaxy',
          ram_storage: '12GB / 512GB',
          main_camera: '200 MP + 50 MP periscope + 10 MP tele + 12 MP ultra-wide',
          battery: '5000 mAh',
          os: 'Android 14'
        }
      },
      {
        name: 'Xiaomi Redmi A3',
        description: 'Large display budget phone — dual SIM and clean MIUI experience.',
        price: 158500,
        original_price: null,
        discount: null,
        image: 'https://phonesdata.com/files/models/Xiaomi-Redmi-A3-1.jpg',
        stock: 25,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.71" HD+ LCD, 90 Hz',
          chipset: 'MediaTek Helio G36',
          ram_storage: '3GB / 64GB',
          main_camera: '8 MP + auxiliary depth',
          battery: '5000 mAh',
          os: 'Android 14 (Go / MIUI)'
        }
      },
      {
        name: 'Xiaomi Redmi 13',
        description: '108 MP main camera on a mid-tier body — great value.',
        price: 285000,
        original_price: 312000,
        discount: 9,
        image: REDMI_13_IMAGE_FALLBACK,
        stock: 16,
        is_featured: true,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.79" LCD, FHD+, 90 Hz',
          chipset: 'MediaTek Helio G91-Ultra',
          ram_storage: '6GB / 128GB',
          main_camera: '108 MP + 2 MP macro',
          battery: '5030 mAh',
          os: 'Android 14'
        }
      },
      {
        name: 'Xiaomi Redmi 13C',
        description: 'Affordable daily driver with big battery.',
        price: 176900,
        original_price: null,
        discount: null,
        image: 'https://phonesdata.com/files/models/Xiaomi-Redmi-13C-4G-1.jpg',
        stock: 20,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.74" HD+ LCD, 90 Hz',
          chipset: 'MediaTek Helio G85',
          ram_storage: '4GB / 128GB',
          main_camera: '50 MP + 2 MP macro',
          battery: '5000 mAh',
          os: 'Android 14'
        }
      },
      {
        name: 'Xiaomi Redmi Note 13',
        description: 'Note line refresh with AMOLED and thin bezels.',
        price: 429900,
        original_price: null,
        discount: null,
        image: 'https://phonesdata.com/files/models/Xiaomi-Redmi-Note-13-4G-1.jpg',
        stock: 11,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.67" AMOLED, 120 Hz',
          chipset: 'Snapdragon 685',
          ram_storage: '6GB / 128GB',
          main_camera: '108 MP + 8 MP ultra-wide + 2 MP macro',
          battery: '5000 mAh',
          os: 'Android 14'
        }
      },
      {
        name: 'Xiaomi Redmi Note 13 Pro',
        description: '200 MP sensor and 67W fast charging in the Note series.',
        price: 595000,
        original_price: 649000,
        discount: 8,
        image: 'https://phonesdata.com/files/models/Xiaomi-Redmi-Note-13-Pro-973.jpg',
        stock: 10,
        is_featured: true,
        is_hot: false,
        is_special: true,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.67" AMOLED, 120 Hz',
          chipset: 'Snapdragon 7s Gen 2',
          ram_storage: '8GB / 256GB',
          main_camera: '200 MP OIS + 8 MP ultra-wide + 2 MP macro',
          battery: '5100 mAh, 67W',
          os: 'Android 14'
        }
      },
      {
        name: 'Xiaomi Redmi Note 13 Pro+ 5G',
        description: 'Curved AMOLED, IP68, and 120W charging — flagship Note.',
        price: 898000,
        original_price: null,
        discount: null,
        image: 'https://phonesdata.com/files/models/Xiaomi-Redmi-Note-13-Pro+-643.jpg',
        stock: 6,
        is_featured: false,
        is_hot: false,
        is_special: true,
        is_new_arrival: true,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.67" curved AMOLED, 120 Hz',
          chipset: 'MediaTek Dimensity 7200-Ultra',
          ram_storage: '8GB / 256GB',
          main_camera: '200 MP OIS + 8 MP ultra-wide + 2 MP macro',
          battery: '5000 mAh, 120W',
          os: 'Android 14'
        }
      },
      {
        name: 'POCO M6 Pro',
        description: 'Performance-focused mid-range with strong GPU for gaming.',
        price: 525000,
        original_price: 565000,
        discount: 7,
        image: 'https://phonesdata.com/files/models/Xiaomi-Poco-M6-Pro-4G-1.jpg',
        stock: 9,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.67" AMOLED, 120 Hz',
          chipset: 'MediaTek Helio G99-Ultra',
          ram_storage: '8GB / 256GB',
          main_camera: '64 MP OIS + 8 MP ultra-wide + 2 MP macro',
          battery: '5000 mAh, 67W',
          os: 'Android 14'
        }
      },
      {
        name: 'POCO X6 Pro',
        description: 'Dimensity 8300-Ultra and flagship-grade display at aggressive price.',
        price: 1189000,
        original_price: null,
        discount: null,
        image: 'https://phonesdata.com/files/models/Xiaomi-Poco-X6-Pro-1.jpg',
        stock: 7,
        is_featured: true,
        is_hot: true,
        is_special: true,
        is_new_arrival: true,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.67" AMOLED, 1.48T brightness peak, 120 Hz',
          chipset: 'MediaTek Dimensity 8300-Ultra',
          ram_storage: '12GB / 512GB',
          main_camera: '64 MP OIS + 8 MP ultra-wide + 2 MP macro',
          battery: '5000 mAh, 67W',
          os: 'Android 14'
        }
      },
      {
        name: 'Xiaomi 14',
        description: 'Leica-tuned compact flagship — excellent night photography.',
        price: 2679000,
        original_price: 2899000,
        discount: 8,
        image: 'https://phonesdata.com/files/models/Xiaomi-14-1.jpg',
        stock: 4,
        is_featured: true,
        is_hot: false,
        is_special: true,
        is_new_arrival: true,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.36" LTPO AMOLED, 120 Hz',
          chipset: 'Snapdragon 8 Gen 3',
          ram_storage: '12GB / 512GB',
          main_camera: 'Leica triple: 50 MP + 50 MP ultra-wide + 50 MP tele',
          battery: '4610 mAh, 90W wired / 50W wireless',
          os: 'Android 14'
        }
      },
      {
        name: 'Oppo A18',
        description: 'Stereo-like loudspeaker experience and large battery.',
        price: 172500,
        original_price: null,
        discount: null,
        image: 'https://phonesdata.com/files/models/Oppo-A18-234.jpg',
        stock: 17,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.56" LCD, HD+, 90 Hz',
          chipset: 'MediaTek Helio G85',
          ram_storage: '4GB / 64GB',
          main_camera: '8 MP + 2 MP depth',
          battery: '5000 mAh',
          os: 'Android 13 (ColorOS)'
        }
      },
      {
        name: 'Oppo A38',
        description: 'Reliable family phone with 50 MP main sensor.',
        price: 268000,
        original_price: 295000,
        discount: 9,
        image: 'https://phonesdata.com/files/models/Oppo-A38-474.jpg',
        stock: 14,
        is_featured: false,
        is_hot: false,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.56" LCD, HD+, 90 Hz',
          chipset: 'MediaTek Helio G85',
          ram_storage: '4GB / 128GB',
          main_camera: '50 MP + 2 MP depth',
          battery: '5000 mAh',
          os: 'Android 13'
        }
      },
      {
        name: 'Oppo A58',
        description: 'FHD+ display upgrade in the A-series.',
        price: 352000,
        original_price: null,
        discount: null,
        image: 'https://phonesdata.com/files/models/Oppo-A58-4G-364.jpg',
        stock: 11,
        is_featured: false,
        is_hot: true,
        is_special: false,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.72" LCD, FHD+, 90 Hz',
          chipset: 'MediaTek Helio G85',
          ram_storage: '6GB / 128GB',
          main_camera: '50 MP + 2 MP mono',
          battery: '5000 mAh, 33W',
          os: 'Android 13'
        }
      },
      {
        name: 'Oppo A78',
        description: '67W charging and AMOLED in a slim chassis.',
        price: 529000,
        original_price: 575000,
        discount: 8,
        image: 'https://phonesdata.com/files/models/Oppo-A78-4G-858.jpg',
        stock: 8,
        is_featured: true,
        is_hot: false,
        is_special: true,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.43" AMOLED, FHD+, 90 Hz',
          chipset: 'Snapdragon 680',
          ram_storage: '8GB / 256GB',
          main_camera: '50 MP + 2 MP',
          battery: '5000 mAh, 67W',
          os: 'Android 13'
        }
      },
      {
        name: 'Oppo Reno 10 5G',
        description: 'Portrait-focused mid-range with telephoto lens.',
        price: 789000,
        original_price: null,
        discount: null,
        image: 'https://phonesdata.com/files/models/Oppo-Reno10-265.jpg',
        stock: 6,
        is_featured: false,
        is_hot: true,
        is_special: true,
        is_new_arrival: false,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.7" AMOLED, 120 Hz',
          chipset: 'MediaTek Dimensity 7050',
          ram_storage: '8GB / 256GB',
          main_camera: '64 MP + 32 MP tele portrait + 8 MP ultra-wide',
          battery: '5000 mAh, 67W',
          os: 'Android 13'
        }
      },
      {
        name: 'Oppo Reno 11 5G',
        description: 'Refined Reno design with improved low-light portraits.',
        price: 935000,
        original_price: 999000,
        discount: 6,
        image: 'https://phonesdata.com/files/models/Oppo-Reno11-1.jpg',
        stock: 5,
        is_featured: true,
        is_hot: false,
        is_special: true,
        is_new_arrival: true,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.7" AMOLED, 120 Hz',
          chipset: 'MediaTek Dimensity 7050 / 8200 (region)',
          ram_storage: '8GB / 256GB',
          main_camera: '50 MP LYT main + 32 MP tele + 8 MP ultra-wide',
          battery: '4800–5000 mAh',
          os: 'Android 14'
        }
      },
      {
        name: 'Oppo Find X7',
        description: 'Ultra-premium camera flagship — Hasselblad color science (series).',
        price: 2989000,
        original_price: 3250000,
        discount: 8,
        image: 'https://phonesdata.com/files/models/Oppo-Find-X7-1.jpg',
        stock: 3,
        is_featured: true,
        is_hot: true,
        is_special: true,
        is_new_arrival: true,
        vendor: 'Tech Haven Electronics',
        specifications: {
          display: '6.78" LTPO AMOLED, ProXDR',
          chipset: 'MediaTek Dimensity 9300',
          ram_storage: '16GB / 512GB',
          main_camera: 'Triple 50 MP flagship array (periscope on variant)',
          battery: '5000 mAh, 100W',
          os: 'Android 14'
        }
      },







    ].map((p) => ({
      ...p,
      category_id: resolveProductCategoryId(p)
    }));
    for (const p of productsData) {
      await Product.findOrCreate({
        where: { name: p.name, shop_id: shop.id },
        defaults: p
      });
    }
    console.log('       ✅ Products created for Buyer to browse.\n');

    // Buyer Shipping Address (required for Checkout – Step 5)
    console.log('  [3.2] Buyer: Shipping Address for Checkout...');
    await ShippingAddress.findOrCreate({
      where: { user_id: buyerUser.id, is_default: true },
      defaults: {
        user_id: buyerUser.id,
        label: 'Home',
        name: 'John Banda',
        phone: '+265999123456',
        address: '45 Delivery Lane, Area 10',
        city: 'Lilongwe',
        region: 'Central',
        is_default: true
      }
    });
    console.log('       ✅ Shipping address added.\n');

    // ═══════════════════════════════════════════════════════════════════
    // 4. SELLER FLOW – Delivery Method Options (Section 4, Step 11)
    // Self-Ship | Platform Agent | Third-Party Courier
    // Courier Services = Third-Party Courier option at checkout
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── 4. Seller Flow: Courier Services (Third-Party Option) ───\n');

    console.log('  [4.1] Seeding Courier Services...');
    const courierData = [
      { name: 'Airtel Money Express', description: 'Fast delivery via Airtel network', is_active: true, sort_order: 1 },
      { name: 'TNM Mpamba Delivery', description: 'Reliable delivery via TNM', is_active: true, sort_order: 2 },
      { name: 'DHL Malawi', description: 'International and local courier', is_active: true, sort_order: 3 },
      { name: 'FedEx', description: 'Express shipping', is_active: true, sort_order: 4 }
    ];
    for (const c of courierData) {
      await CourierService.findOrCreate({ where: { name: c.name }, defaults: c });
    }
    console.log('       ✅ Courier services seeded (for checkout delivery_method).\n');

    // ═══════════════════════════════════════════════════════════════════
    // PAYMENT METHODS – PayChangu mobile money: Airtel (psp_id=1), TNM (psp_id=2)
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── Payment Methods (PayChangu) ───\n');

    const paymentMethodsData = [
      { name: 'Airtel Money', slug: 'airtel', psp_id: 1, provider: 'malipo', icon: 'airtel', is_active: true, sort_order: 1 },
      { name: 'TNM Mpamba', slug: 'tnm', psp_id: 2, provider: 'malipo', icon: 'tnm', is_active: true, sort_order: 2 }
    ];
    for (const pm of paymentMethodsData) {
      await PaymentMethod.findOrCreate({ where: { slug: pm.slug }, defaults: pm });
    }
    console.log('       ✅ Payment methods seeded: Airtel (psp_id=1), TNM (psp_id=2).\n');

    // ═══════════════════════════════════════════════════════════════════
    // 7. ESCROW SYSTEM – Admin wallet for platform escrow operations
    // (Section 7: Escrow Holds → Release to Seller)
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── 7. Escrow System: Admin Wallet ───\n');

    await Wallet.findOrCreate({
      where: { user_id: adminUser.id },
      defaults: { user_id: adminUser.id, balance: 0, currency: 'MWK' }
    });
    console.log('       ✅ Admin wallet ready for escrow operations.\n');

    // ═══════════════════════════════════════════════════════════════════
    // SUMMARY – Test credentials for each role
    // ═══════════════════════════════════════════════════════════════════

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 Seeding complete. Test credentials (Flow Diagram roles):');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Admin:         admin@techaven.mw      / admin12345');
    console.log('  Buyer:         buyer@techaven.mw      / password123');
    console.log('  Seller:        seller@techaven.mw     / seller12345');
    console.log('  Delivery Agent: agent@techaven.mw    / agent12345');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nFlow: Buyer browses products → Checkout → Payment → Escrow holds');
    console.log('      → Seller accepts → Delivery → Buyer confirms → Escrow released');
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
