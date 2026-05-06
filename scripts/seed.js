/**
 * Techaven — Combined Database Seed Script
 * Follows the Step-by-Step Flow from Techaven App Flow Diagram v1.0
 *
 * Seeds TWO shops in one run:
 *   1. Tech Haven Electronics  — seller@techaven.mw / seller12345
 *   2. Pixie Electronics       — frank@goexperiencecloud.com / 78789878
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
    console.log('🌱 Techaven Combined Database Seeding (Flow Diagram v1.0)\n');
    console.log('   Shops: Tech Haven Electronics + Pixie Electronics\n');

    await db.sequelize.authenticate();
    console.log('✅ Database connection established.\n');

    await db.sequelize.sync({ alter: false });
    console.log('✅ Database synchronized.\n');

    // ═══════════════════════════════════════════════════════════════════
    // 1. ONBOARDING SLIDES
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
    // 2. SHARED AUTHENTICATION — Users
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── 2. Shared Authentication Flow ───\n');

    // Admin
    console.log('  [2.1] Seeding Admin...');
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

    // Buyer
    console.log('  [2.2] Seeding Buyer...');
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

    // Seller — Tech Haven Electronics
    console.log('  [2.3] Seeding Seller — Tech Haven Electronics...');
    const [techHavenSellerUser] = await User.findOrCreate({
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

    // Seller — Pixie Electronics (Frank)
    console.log('  [2.4] Seeding Seller — Pixie Electronics (Frank)...');
    const [pixieSellerUser] = await User.findOrCreate({
      where: { email: 'frank@goexperiencecloud.com' },
      defaults: {
        name: 'Frank',
        email: 'frank@goexperiencecloud.com',
        phone_number: '+265997070495',
        password: '78789878',
        role: 'seller',
        is_verified: true,
        email_verified_at: new Date()
      }
    });
    console.log('       ✅ Seller (Pixie Owner): frank@goexperiencecloud.com / 78789878\n');

    // Delivery Agent
    console.log('  [2.5] Seeding Delivery Agent...');
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
    // 3. ADMIN FLOW — Approve Both Shops
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── 3. Admin Flow: Approve Shops ───\n');

    console.log('  [3.1] Creating Tech Haven Electronics shop...');
    const [techHavenShop] = await Shop.findOrCreate({
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
    await techHavenSellerUser.update({ shop_id: techHavenShop.id });
    console.log('       ✅ Shop approved: Tech Haven Electronics\n');

    console.log('  [3.2] Creating Pixie Electronics shop...');
    const [pixieShop] = await Shop.findOrCreate({
      where: { name: 'Pixie Electronics' },
      defaults: {
        name: 'Pixie Electronics',
        location: 'Lilongwe',
        address: 'Behind Game by Olympic Mall, Lilongwe',
        phone: '+265997070495',
        email: 'frank@goexperiencecloud.com',
        status: 'active',
        application_status: 'approved',
        is_verified: true,
        description:
          'Sealed and pre-owned phones at discount prices. 2 months warranty. Agent commission available. Call/WhatsApp: +265997070495'
      }
    });
    await pixieSellerUser.update({ shop_id: pixieShop.id });
    console.log('       ✅ Shop approved: Pixie Electronics\n');

    // ═══════════════════════════════════════════════════════════════════
    // 4. CATEGORIES
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── 4. Categories ───\n');

    const categoriesData = [
      { name: 'Smartphones',   description: 'Latest phones from top brands',       status: 'approved', shop_id: null, icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397092/techaven/categories/pl8ujarm4kerotmk5dch.png' },
      { name: 'Laptops',       description: 'Powerful machines for work and play',  status: 'approved', shop_id: null, icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397116/techaven/categories/bi9mbxwrf1uxzgi8exvy.png' },
      { name: 'Audio Devices', description: 'Premium sound experience',             status: 'approved', shop_id: null, icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397157/techaven/categories/gxgqycgsxyzvexigxcrq.png' },
      { name: 'Wearables',     description: 'Watches and fitness trackers',         status: 'approved', shop_id: null, icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397233/techaven/categories/p84plz1xxupif3wczqyf.png' },
      { name: 'Gaming',        description: 'Consoles and controllers',             status: 'approved', shop_id: null, icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397272/techaven/categories/erunrzg5kph0vu8dm4vo.png' },
      { name: 'Accessories',   description: 'Chargers, cables and more',            status: 'approved', shop_id: null, icon: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397320/techaven/categories/borz33xwf36rytawambp.png' }
    ];

    const categories = [];
    for (const c of categoriesData) {
      const [cat] = await Category.findOrCreate({ where: { name: c.name }, defaults: c });
      categories.push(cat);
    }
    console.log('       ✅ Categories seeded.\n');

    const categoryIds = {
      smartphones: categories[0].id,
      laptops:     categories[1].id,
      audio:       categories[2].id,
      wearables:   categories[3].id,
      gaming:      categories[4].id,
      accessories: categories[5].id
    };

    /** Resolve category from name/description when not explicitly set. */
    function resolveProductCategoryId(p) {
      if (p.category_id != null) return p.category_id;
      const name = (p.name || '').toLowerCase();
      const text = `${p.name || ''} ${p.description || ''}`.toLowerCase();

      if (
        /\b(apple watch|galaxy watch|smartwatch|smart watch|watch se|watch series|watch ultra|watchos)\b/i.test(text) ||
        (/\bwatch\b/i.test(name) && /\b(apple|galaxy|fitbit|garmin|amazfit)\b/i.test(name))
      ) return categoryIds.wearables;
      if (/\b(laptop|macbook|notebook|chromebook|\bipad\b|tablet\b)\b/i.test(text)) return categoryIds.laptops;
      if (/\b(playstation|ps5|ps4|xbox|nintendo switch|steam deck)\b/i.test(text)) return categoryIds.gaming;
      if (/charging case/i.test(name) && !/\bwith\b/i.test(name)) return categoryIds.accessories;
      if (/\b(airpods|earbuds?|earbud|headphone|headset|\bbuds\b|beats |sony wh-|soundcore|jbl |\bspeaker\b)\b/i.test(text)) return categoryIds.audio;
      if (/\b(case\b|charger|cable|adapter|power bank|screen protector|magsafe|mount|stand)\b/i.test(name)) return categoryIds.accessories;
      return categoryIds.smartphones;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. TECH HAVEN ELECTRONICS — Product Listings
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── 5. Tech Haven Electronics: Product Listings ───\n');

    const techHavenProducts = [
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
        vendor: 'Tech Haven Electronics'
      },
      {
        name: 'HP Pavilion 15 Laptop',
        description: 'Intel i5, 8GB RAM, 256GB SSD',
        price: 850000,
        original_price: null,
        discount: null,
        image: REDMI_13_IMAGE_FALLBACK,
        stock: 5,
        is_featured: false,
        is_hot: true,
        is_special: false,
        points: 85,
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
        specifications: { display: '6.5" PLS LCD, HD+', chipset: 'MediaTek Helio G85', ram_storage: '4GB / 64GB', main_camera: '50 MP + 2 MP depth', battery: '5000 mAh', os: 'Android 14 (One UI Core)' }
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
        specifications: { display: '6.7" PLS LCD, FHD+, 90 Hz', chipset: 'Snapdragon 680', ram_storage: '4GB / 64GB (expandable)', main_camera: '50 MP + 2 MP macro + 2 MP depth', battery: '5000 mAh, 25W charging', os: 'Android 14' }
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
        vendor: 'Tech Haven Electronics',
        specifications: { display: '6.5" Super AMOLED, FHD+, 90 Hz', chipset: 'MediaTek Helio G99', ram_storage: '6GB / 128GB', main_camera: '50 MP + 5 MP ultra-wide + 2 MP macro', battery: '5000 mAh', os: 'Android 14 (One UI 6)' }
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
        specifications: { display: '6.5" Super AMOLED, 120 Hz', chipset: 'Exynos 1280 (5G)', ram_storage: '6GB / 128GB', main_camera: '50 MP OIS + 8 MP ultra-wide + 2 MP macro', battery: '5000 mAh', os: 'Android 14' }
      },
      { name: 'Tecno Camon 40 Pro', description: 'Premium 4G experience featuring a brilliant AMOLED display and a high-resolution 50MP selfie camera.', price: 645000, original_price: 690000, discount: 7, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-camon-40-pro.jpg', stock: 15, is_featured: false, is_hot: true, is_special: false, is_new_arrival: true, vendor: 'Tech Haven Electronics', specifications: { display: '6.78" AMOLED, 1080 x 2436 px', chipset: 'Mediatek Helio G100 Ultimate (6 nm)', ram_storage: '8GB / 256GB', main_camera: '50 MP f/1.9 + 50 MP Front', battery: '5200 mAh', os: 'Android 15' } },
      { name: 'Tecno Camon 40', description: 'The perfect balance of style and performance with a vivid 6.78-inch AMOLED and rapid 45W charging.', price: 580000, original_price: null, discount: null, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-camon-40.jpg', stock: 20, is_featured: false, is_hot: false, is_special: false, is_new_arrival: true, vendor: 'Tech Haven Electronics', specifications: { display: '6.78" AMOLED, 1080 x 2436 px', chipset: 'Mediatek Helio G100 Ultimate (6 nm)', ram_storage: '8GB / 128GB/256GB', main_camera: '50 MP f/1.9', battery: '5200 mAh', os: 'Android 15' } },
      { name: 'Tecno Spark Go 1S', description: 'Essential performance meets modern design with a large 6.67-inch display and IP54 durability.', price: 145000, original_price: null, discount: null, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-go-1s.jpg', stock: 45, is_featured: false, is_hot: false, is_special: false, is_new_arrival: true, vendor: 'General Mobile', specifications: { display: '6.67" IPS LCD, 720 x 1600 px', chipset: 'Mediatek Helio G50', ram_storage: '3GB / 64GB', main_camera: '13 MP f/1.8', battery: '5000 mAh', os: 'Android 14 (Go edition)' } },
      { name: 'Tecno Camon 30S', description: 'Sleek and splash-resistant with an immersive AMOLED display and up to 2 major Android upgrades.', price: 415000, original_price: 440000, discount: 6, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-camon-30s.jpg', stock: 18, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.78" AMOLED, 1080 x 2436 px', chipset: 'Mediatek Helio G100 (6 nm)', ram_storage: '6GB/8GB / 128GB/256GB', main_camera: '50 MP f/1.9 OIS', battery: '5000 mAh', os: 'Android 14' } },
      { name: 'Tecno Phantom V Flip2', description: 'Compact elegance in a foldable form factor with a stunning 6.9-inch LTPO AMOLED primary screen.', price: 1250000, original_price: 1400000, discount: 10, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-phantom-v-flip2.jpg', stock: 5, is_featured: true, is_hot: true, is_special: true, is_new_arrival: false, vendor: 'Premium Tech', specifications: { display: '6.9" Foldable LTPO AMOLED', chipset: 'Mediatek Dimensity 8020 (6 nm)', ram_storage: '8GB / 256GB', main_camera: '50 MP Dual Setup (4K)', battery: '4720 mAh (70W Fast)', os: 'Android 14' } },
      { name: 'Tecno Camon 30S Pro', description: 'A refined photography expert with 45W charging, wireless charging support, and an curved AMOLED display.', price: 495000, original_price: null, discount: null, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-camon-30s-pro.jpg', stock: 12, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.78" AMOLED, 1080 x 2436 px', chipset: 'Mediatek Helio G100 (6 nm)', ram_storage: '8GB / 256GB', main_camera: '50 MP f/1.9 OIS', battery: '5000 mAh (Wireless Charging)', os: 'Android 14' } },
      { name: 'Tecno Pop 9 4G', description: 'Durable and efficient entry-level smartphone featuring IP54 dust and splash resistance.', price: 165000, original_price: null, discount: null, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-pop-9-4g.jpg', stock: 40, is_featured: false, is_hot: false, is_special: false, is_new_arrival: true, vendor: 'General Mobile', specifications: { display: '6.67" IPS LCD, 720 x 1600 px', chipset: 'Unisoc T615 / Helio G50', ram_storage: '3GB/4GB / 64GB/128GB', main_camera: '13 MP f/1.8', battery: '5000 mAh', os: 'Android 14 (Go edition)' } },
      { name: 'Tecno Pop 9', description: 'Smooth 5G connectivity for the masses with a balanced chipset and reliable battery life.', price: 230000, original_price: 250000, discount: 8, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-pop-9.jpg', stock: 30, is_featured: false, is_hot: false, is_special: false, is_new_arrival: true, vendor: 'General Mobile', specifications: { display: '6.6" IPS LCD, 720 x 1612 px', chipset: 'Mediatek Dimensity 6300 (6 nm)', ram_storage: '4GB / 64GB/128GB', main_camera: '48 MP Main Camera', battery: '5000 mAh', os: 'Android 14' } },
      { name: 'Tecno Pova 6 Neo 5G', description: 'A high-performance gaming companion featuring a 108MP camera and a massive 120Hz display.', price: 410000, original_price: null, discount: null, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-pova-6-neo-5g.jpg', stock: 25, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.67" IPS LCD, 120Hz', chipset: 'Mediatek Dimensity 6300 (6 nm)', ram_storage: '6GB/8GB / 128GB/256GB', main_camera: '108 MP f/1.9', battery: '5000 mAh', os: 'Android 14' } },
      { name: 'Tecno Spark 20 Pro 5G', description: 'Blazing fast 5G speeds paired with a super-sharp 108MP camera and high-resolution display.', price: 435000, original_price: 470000, discount: 7, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-20-pro-5g.jpg', stock: 15, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.78" IPS LCD, 1080 x 2460 px', chipset: 'Mediatek Dimensity 6080 (6 nm)', ram_storage: '8GB / 128GB/256GB', main_camera: '108 MP f/1.8', battery: '5000 mAh (33W Fast)', os: 'Android 14' } },
      { name: 'Tecno Spark 30 5G', description: 'Capture everything in detail with a 108MP camera on a large 120Hz smooth-motion screen.', price: 395000, original_price: null, discount: null, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-30-5g.jpg', stock: 25, is_featured: false, is_hot: false, is_special: false, is_new_arrival: true, vendor: 'General Mobile', specifications: { display: '6.67" IPS LCD, 720 x 1600 px', chipset: 'Mediatek Dimensity 6300 (6 nm)', ram_storage: '6GB/8GB / 128GB/256GB', main_camera: '108 MP f/1.9', battery: '5000 mAh', os: 'Android 14' } },
      { name: 'Tecno Spark 30', description: 'Modern aesthetics meet functionality with a high-res 64MP camera and durable IP64 rating.', price: 340000, original_price: null, discount: null, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-30.jpg', stock: 35, is_featured: false, is_hot: false, is_special: false, is_new_arrival: true, vendor: 'General Mobile', specifications: { display: '6.78" IPS LCD, 1080 x 2460 px', chipset: 'Mediatek Helio G91 (12 nm)', ram_storage: '8GB / 128GB/256GB', main_camera: '64 MP Quad-LED Flash', battery: '5000 mAh', os: 'Android 14' } },
      { name: 'Tecno Spark 30C', description: 'Reliable and robust with IP54 rating and a 50MP main camera for crisp daily captures.', price: 220000, original_price: 245000, discount: 10, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-30c.jpg', stock: 50, is_featured: false, is_hot: false, is_special: false, is_new_arrival: true, vendor: 'General Mobile', specifications: { display: '6.67" IPS LCD, 720 x 1600 px', chipset: 'Mediatek Helio G81', ram_storage: '4GB/6GB/8GB / 128GB/256GB', main_camera: '50 MP LED Flash', battery: '5000 mAh', os: 'Android 14' } },
      { name: 'Tecno Spark 30C 5G', description: 'The perfect entry point into 5G with a 120Hz display and a high-performance Dimensity chipset.', price: 285000, original_price: null, discount: null, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-30c-5g.jpg', stock: 20, is_featured: false, is_hot: false, is_special: false, is_new_arrival: true, vendor: 'General Mobile', specifications: { display: '6.67" IPS LCD, 120Hz', chipset: 'Mediatek Dimensity 6300 (6 nm)', ram_storage: '4GB / 64GB/128GB', main_camera: '48 MP Main Camera', battery: '5000 mAh', os: 'Android 14' } },
      { name: 'Tecno Spark Go 1', description: 'Simple, functional, and durable with a large screen and high-capacity battery for all-day use.', price: 135000, original_price: null, discount: null, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-go-1.jpg', stock: 60, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'General Mobile', specifications: { display: '6.67" IPS LCD, 720 x 1600 px', chipset: 'Unisoc T615 (12 nm)', ram_storage: '3GB/4GB / 64GB/128GB', main_camera: '13 MP f/1.8', battery: '5000 mAh', os: 'Android 14 (Go edition)' } },
      { name: 'Tecno Spark 20 Pro+', description: 'A design masterpiece with a curved AMOLED screen and a powerful 108MP main camera.', price: 465000, original_price: 510000, discount: 9, image: 'https://fdn2.gsmarena.com/vv/bigpic/tecno-spark-20-pro-plus.jpg', stock: 10, is_featured: true, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.78" AMOLED, 1080 x 2436 px', chipset: 'Mediatek Helio G99 Ultimate', ram_storage: '8GB / 256GB', main_camera: '108 MP f/1.8 OIS', battery: '5000 mAh (33W Fast)', os: 'Android 14' } },
      { name: 'Infinix Note 50 Pro 4G', description: 'Aerospace-grade durability meets high-end tech with a 90W fast charging and an AMOLED panel.', price: 745000, original_price: 790000, discount: 6, image: 'https://fdn2.gsmarena.com/vv/bigpic/infinix-note-50-pro-4g.jpg', stock: 8, is_featured: false, is_hot: true, is_special: false, is_new_arrival: true, vendor: 'Tech Haven Electronics', specifications: { display: '6.78" AMOLED, 1080 x 2436 px', chipset: 'Mediatek Helio G100 Ultimate (6 nm)', ram_storage: '8GB/12GB / 256GB', main_camera: '50 MP f/1.9 + 1440p Video', battery: '5200 mAh (90W Fast)', os: 'Android 15' } },
      { name: 'Infinix Note 50x', description: 'Rugged MIL-STD-810H compliant smartphone with 5G connectivity and a massive 5500mAh battery.', price: 620000, original_price: null, discount: null, image: 'https://fdn2.gsmarena.com/vv/bigpic/infinix-note-50x.jpg', stock: 10, is_featured: false, is_hot: false, is_special: true, is_new_arrival: true, vendor: 'Rugged Tech', specifications: { display: '6.67" IPS LCD, 120Hz', chipset: 'Mediatek Dimensity 7300 Ultimate', ram_storage: '6GB/8GB / 128GB', main_camera: '50 MP f/1.6 (4K Video)', battery: '5500 mAh', os: 'Android 15' } },
      { name: 'Infinix Hot 50', description: 'A stylish 5G all-rounder with a large 6.7-inch display and IP54 splash resistance.', price: 365000, original_price: 395000, discount: 7, image: 'https://fdn2.gsmarena.com/vv/bigpic/infinix-hot-50.jpg', stock: 25, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.7" IPS LCD, 720 x 1600 px', chipset: 'Mediatek Dimensity 6300 (6 nm)', ram_storage: '4GB/8GB / 128GB', main_camera: '48 MP f/1.8', battery: '5000 mAh', os: 'Android 14' } },
      { name: 'Infinix Note 50s', description: 'Unique scent-infused design with long-lasting fragrance and high-end Dimensity performance.', price: 710000, original_price: null, discount: null, image: 'https://fdn2.gsmarena.com/vv/bigpic/infinix-note-50s.jpg', stock: 7, is_featured: false, is_hot: false, is_special: true, is_new_arrival: true, vendor: 'Boutique Electronics', specifications: { display: '6.78" AMOLED, 1080 x 2436 px', chipset: 'Mediatek Dimensity 7300 Ultimate', ram_storage: '8GB / 128GB/256GB', main_camera: '64 MP f/1.8 (4K)', battery: '5500 mAh', os: 'Android 15' } },
      { name: 'Infinix Note 50 4G', description: 'Sleek and professional with an AMOLED screen and customizable RGB notification lighting.', price: 585000, original_price: null, discount: null, image: 'https://fdn2.gsmarena.com/vv/bigpic/infinix-note-50-4g.jpg', stock: 20, is_featured: false, is_hot: false, is_special: false, is_new_arrival: true, vendor: 'Tech Haven Electronics', specifications: { display: '6.78" AMOLED, 1080 x 2436 px', chipset: 'Mediatek Helio G100 Ultimate', ram_storage: '8GB / 256GB', main_camera: '50 MP f/1.9', battery: '5200 mAh', os: 'Android 15' } },
      { name: 'Infinix Hot 50i', description: 'Affordable performance with a large screen and reliable 48MP camera for daily use.', price: 215000, original_price: 230000, discount: 6, image: 'https://fdn2.gsmarena.com/vv/bigpic/infinix-hot-50i.jpg', stock: 40, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'General Mobile', specifications: { display: '6.7" IPS LCD, 720 x 1600 px', chipset: 'Mediatek Helio G81', ram_storage: '4GB/6GB / 128GB/256GB', main_camera: '48 MP f/1.8', battery: '5000 mAh', os: 'Android 14' } },
      { name: 'Infinix Note 40 5G', description: 'A high-speed 5G device with a massive 108MP camera and versatile wireless charging capabilities.', price: 525000, original_price: 560000, discount: 6, image: 'https://fdn2.gsmarena.com/vv/bigpic/infinix-note-40-5g.jpg', stock: 12, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.78" AMOLED, 1080 x 2436 px', chipset: 'Mediatek Dimensity 7020 (6 nm)', ram_storage: '8GB/12GB / 256GB/512GB', main_camera: '108 MP f/1.8 OIS', battery: '5000 mAh (Wireless Charging)', os: 'Android 14' } },
      { name: 'Infinix Hot 50 Pro+ 4G', description: 'Ultra-slim 6.8mm profile with a stunning 120Hz AMOLED display and powerful Helio performance.', price: 495000, original_price: 540000, discount: 8, image: 'https://fdn2.gsmarena.com/vv/bigpic/infinix-hot-50-pro-plus-4g.jpg', stock: 15, is_featured: true, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.78" AMOLED, 120Hz', chipset: 'Mediatek Helio G100 (6 nm)', ram_storage: '8GB / 128GB/256GB', main_camera: '50 MP f/1.6', battery: '5000 mAh (33W Fast)', os: 'Android 14' } },
      { name: 'Infinix Note 40X 5G', description: 'The definitive 5G powerhouse with a massive 108MP camera and a silky smooth 120Hz display.', price: 465000, original_price: null, discount: null, image: 'https://fdn2.gsmarena.com/vv/bigpic/infinix-note-40x-5g.jpg', stock: 18, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.78" IPS LCD, 1080 x 2460 px', chipset: 'Mediatek Dimensity 6300 (6 nm)', ram_storage: '8GB/12GB / 256GB', main_camera: '108 MP f/1.8', battery: '5000 mAh', os: 'Android 14' } },
      { name: 'Samsung Galaxy A35 5G', description: 'Glass back design with improved durability (IP67) and 5G.', price: 495000, original_price: 530000, discount: 7, image: 'https://phonesdata.com/files/models/Samsung-Galaxy-A35-1.jpg', stock: 10, is_featured: false, is_hot: false, is_special: true, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.6" Super AMOLED, FHD+, 120 Hz', chipset: 'Exynos 1380', ram_storage: '8GB / 128GB', main_camera: '50 MP OIS + 8 MP ultra-wide + 5 MP macro', battery: '5000 mAh', os: 'Android 14 (One UI 6.1)' } },
      { name: 'Samsung Galaxy A55 5G', description: 'Premium mid-range with metal frame and flagship camera tuning.', price: 729900, original_price: null, discount: null, image: 'https://phonesdata.com/files/models/Samsung-Galaxy-A55-1.jpg', stock: 8, is_featured: true, is_hot: false, is_special: true, is_new_arrival: true, vendor: 'Tech Haven Electronics', specifications: { display: '6.6" Super AMOLED, 120 Hz', chipset: 'Exynos 1480', ram_storage: '8GB / 256GB', main_camera: '50 MP OIS + 12 MP ultra-wide + 5 MP macro', battery: '5000 mAh', os: 'Android 14' } },
      { name: 'Samsung Galaxy M34 5G', description: 'Massive 6000 mAh battery — built for two-day usage.', price: 418000, original_price: 448000, discount: 7, image: 'https://phonesdata.com/files/models/Samsung-Galaxy-M34-5G-769.jpg', stock: 9, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.5" Super AMOLED, 120 Hz', chipset: 'Exynos 1280', ram_storage: '8GB / 128GB', main_camera: '50 MP + 8 MP ultra-wide + 2 MP macro', battery: '6000 mAh', os: 'Android 14' } },
      { name: 'Samsung Galaxy S23 FE', description: 'Flagship experience — versatile triple camera and long software support.', price: 1499000, original_price: 1690000, discount: 11, image: 'https://phonesdata.com/files/models/Samsung-Galaxy-S23-FE-646.jpg', stock: 5, is_featured: true, is_hot: false, is_special: true, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.4" Dynamic AMOLED 2X, 120 Hz', chipset: 'Snapdragon 8 Gen 1 (for Galaxy)', ram_storage: '8GB / 256GB', main_camera: '50 MP + 12 MP ultra-wide + 8 MP tele 3x', battery: '4500 mAh', os: 'Android 14' } },
      { name: 'AirPods 2', description: 'Wireless earbuds with H1 chip, hands-free "Hey Siri", and 24-hour battery life.', price: 349650, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/airpods-2nd-gen-select-2019?wid=470&hei=556&fmt=png-alpha&.v=1551489675', stock: 0, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'Apple Inc.', specifications: { display: 'N/A', chipset: 'Apple H1', ram_storage: 'N/A', main_camera: 'None', battery: '24 hours with case', os: 'N/A' } },
      { name: 'AirPods 3', description: 'Spatial audio, adaptive EQ, sweat and water resistant earbuds.', price: 384650, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/airpods-3rd-gen-select?wid=470&hei=556&fmt=png-alpha&.v=1635735019', stock: 0, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'Apple Inc.', specifications: { display: 'N/A', chipset: 'Apple H1', ram_storage: 'N/A', main_camera: 'None', battery: '30 hours with case', os: 'N/A' } },
      { name: 'AirPods 4', description: 'Redesigned for all-day comfort, improved sound quality.', price: 419650, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/airpods-4th-gen-select-202409?wid=470&hei=556&fmt=png-alpha&.v=1724019877', stock: 0, is_featured: false, is_hot: false, is_special: false, is_new_arrival: true, vendor: 'Apple Inc.', specifications: { display: 'N/A', chipset: 'Apple H2', ram_storage: 'N/A', main_camera: 'None', battery: '30 hours with case', os: 'N/A' } },
      { name: 'AirPods 4 (ANC)', description: 'Active Noise Cancellation, Transparency mode, and enhanced bass.', price: 489650, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/airpods-4th-gen-select-202409?wid=470&hei=556&fmt=png-alpha&.v=1724019877', stock: 0, is_featured: true, is_hot: true, is_special: false, is_new_arrival: true, vendor: 'Apple Inc.', specifications: { display: 'N/A', chipset: 'Apple H2', ram_storage: 'N/A', main_camera: 'None', battery: '30 hours with case', os: 'N/A' } },
      { name: 'AirPods Max 1 (Lightning)', description: 'Over-ear headphones with high-fidelity audio and computational audio.', price: 939750, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/airpods-max-select-201912?wid=470&hei=556&fmt=png-alpha&.v=1607640378', stock: 0, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'Apple Inc.', specifications: { display: 'N/A', chipset: 'Apple H1', ram_storage: 'N/A', main_camera: 'None', battery: '20 hours', os: 'N/A' } },
      { name: 'AirPods Max 1 (USB-C)', description: 'Over-ear headphones with USB-C charging and spatial audio.', price: 939750, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/airpods-max-select-201912?wid=470&hei=556&fmt=png-alpha&.v=1607640378', stock: 0, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'Apple Inc.', specifications: { display: 'N/A', chipset: 'Apple H1', ram_storage: 'N/A', main_camera: 'None', battery: '20 hours', os: 'N/A' } },
      { name: 'AirPods Max 2', description: 'Next-gen over-ear headphones with H2 chip and improved noise cancellation.', price: 999250, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/airpods-max-hero-select-202409?wid=470&hei=556&fmt=png-alpha&.v=1724868660', stock: 0, is_featured: false, is_hot: true, is_special: false, is_new_arrival: true, vendor: 'Apple Inc.', specifications: { display: 'N/A', chipset: 'Apple H2', ram_storage: 'N/A', main_camera: 'None', battery: '24 hours', os: 'N/A' } },
      { name: 'AirPods Pro 1', description: 'Active Noise Cancellation, Transparency mode, customizable fit.', price: 419650, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/airpods-pro-select-201910?wid=470&hei=556&fmt=png-alpha&.v=1570533087', stock: 0, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'Apple Inc.', specifications: { display: 'N/A', chipset: 'Apple H1', ram_storage: 'N/A', main_camera: 'None', battery: '24 hours with case', os: 'N/A' } },
      { name: 'AirPods Pro 1 Charging Case', description: 'Wireless charging case compatible with Qi-certified chargers.', price: 174650, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/airpods-pro-select-201910?wid=470&hei=556&fmt=png-alpha&.v=1570533087', stock: 0, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'Apple Inc.', specifications: { display: 'N/A', chipset: 'N/A', ram_storage: 'N/A', main_camera: 'None', battery: 'N/A', os: 'N/A' } },
      { name: 'AirPods Pro 2 with MagSafe Charging Case (Lightning)', description: 'H2 chip, 2x noise cancellation, personalized spatial audio.', price: 419650, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/airpods-pro-2nd-gen-select-202209?wid=470&hei=556&fmt=png-alpha&.v=1662574197', stock: 0, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'Apple Inc.', specifications: { display: 'N/A', chipset: 'Apple H2', ram_storage: 'N/A', main_camera: 'None', battery: '30 hours with case', os: 'N/A' } },
      { name: 'AirPods Pro 2 with MagSafe Charging Case (USB-C)', description: 'H2 chip with USB-C charging, advanced noise cancellation.', price: 419650, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/airpods-pro-2nd-gen-select-202209?wid=470&hei=556&fmt=png-alpha&.v=1662574197', stock: 0, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'Apple Inc.', specifications: { display: 'N/A', chipset: 'Apple H2', ram_storage: 'N/A', main_camera: 'None', battery: '30 hours with case', os: 'N/A' } },
      { name: 'AirPods Pro 3', description: 'Next-gen Pro earbuds with enhanced ANC and heart rate monitoring.', price: 489650, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/airpods-pro-3-select-202505?wid=470&hei=556&fmt=png-alpha', stock: 0, is_featured: true, is_hot: true, is_special: false, is_new_arrival: true, vendor: 'Apple Inc.', specifications: { display: 'N/A', chipset: 'Apple H3', ram_storage: 'N/A', main_camera: 'None', battery: '36 hours with case', os: 'N/A' } },
      { name: 'iPad 10.2" 9th Gen (Wi-Fi Only)', description: '10.2" Retina display with A13 Bionic chip and 12MP camera.', price: 575750, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-9th-gen-select-202109_GEO_US?wid=470&hei=556&fmt=png-alpha&.v=1631660435', stock: 0, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'Apple Inc.', specifications: { display: '10.2" Retina, 2160x1620 (264 ppi)', chipset: 'Apple A13 Bionic (6 Cores, 2.6 GHz)', ram_storage: '3GB / 64GB or 256GB', main_camera: '12 Megapixels', battery: '10 hours', os: 'iPadOS 15.0' } },
      { name: 'iPad 10.9" 10th Gen (Wi-Fi Only)', description: '10.9" Liquid Retina display with A14 Bionic chip and 12MP camera.', price: 785750, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-10th-gen-select-202210?wid=470&hei=556&fmt=png-alpha&.v=1664575407', stock: 0, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'Apple Inc.', specifications: { display: '10.9" Liquid Retina, 2360x1640 (264 ppi)', chipset: 'Apple A14 Bionic (6 Cores, 3.0 GHz)', ram_storage: '4GB / 64GB or 256GB', main_camera: '12 Megapixels', battery: '10 hours', os: 'iPadOS 16.1' } },
      { name: 'iPad Air M4 11" (Wi-Fi Only)', description: 'M4 chip with Wi-Fi 7, 11" Liquid Retina, 12GB RAM.', price: 1048250, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-air-m4-select-202405-11inch?wid=470&hei=556&fmt=png-alpha&.v=1713852024', stock: 0, is_featured: true, is_hot: true, is_special: false, is_new_arrival: true, vendor: 'Apple Inc.', specifications: { display: '11" Liquid Retina, 2360x1640 (264 ppi)', chipset: 'Apple M4 (8 Cores, 4.1 GHz)', ram_storage: '12GB / 128GB, 256GB, 512GB, or 1TB', main_camera: '12 Megapixels', battery: '10 hours', os: 'iPadOS 26.3.1' } },
      { name: 'iPad Air M4 13" (Wi-Fi Only)', description: 'M4 chip, 13" Liquid Retina, Wi-Fi 7 connectivity.', price: 1398250, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-air-m4-select-202405-13inch?wid=470&hei=556&fmt=png-alpha&.v=1713852025', stock: 0, is_featured: false, is_hot: true, is_special: false, is_new_arrival: true, vendor: 'Apple Inc.', specifications: { display: '13" Liquid Retina, 2732x2048 (264 ppi)', chipset: 'Apple M4 (8 Cores, 4.1 GHz)', ram_storage: '12GB / 128GB, 256GB, 512GB, or 1TB', main_camera: '12 Megapixels', battery: '10 hours', os: 'iPadOS 26.3.1' } },
      { name: 'iPad Pro M5 11" (Wi-Fi Only)', description: 'M5 chip, Wi-Fi 7, 11" Ultra Retina XDR display.', price: 1748250, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-pro-m5-select-202505-11inch?wid=470&hei=556&fmt=png-alpha', stock: 0, is_featured: true, is_hot: true, is_special: false, is_new_arrival: true, vendor: 'Apple Inc.', specifications: { display: '11" Ultra Retina XDR, 2420x1668 (264 ppi)', chipset: 'Apple M5 (9-10 Cores, 4.4 GHz)', ram_storage: '12GB or 16GB / 256GB to 2TB', main_camera: '12 Megapixels', battery: '10 hours', os: 'iPadOS 26.0' } },
      { name: 'iPad Pro M5 13" (Wi-Fi Only)', description: 'M5 chip, 13" Ultra Retina XDR, ultimate iPad experience.', price: 2273250, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-pro-m5-select-202505-13inch?wid=470&hei=556&fmt=png-alpha', stock: 0, is_featured: true, is_hot: true, is_special: false, is_new_arrival: true, vendor: 'Apple Inc.', specifications: { display: '13" Ultra Retina XDR, 2752x2064 (264 ppi)', chipset: 'Apple M5 (9-10 Cores, 4.4 GHz)', ram_storage: '12GB or 16GB / 256GB to 2TB', main_camera: '12 Megapixels', battery: '10 hours', os: 'iPadOS 26.0' } },
      { name: 'iPhone 16 (US/A3081)', description: '6.1" Super Retina XDR, A18 chip, Camera Control button.', price: 1398250, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-black-select-202409?wid=470&hei=556&fmt=png-alpha&.v=1724285820', stock: 0, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Apple Inc.', specifications: { display: '6.1" Super Retina XDR, 2556x1179 (460 ppi)', chipset: 'Apple A18 (6 Cores, 4.0 GHz)', ram_storage: '8GB / 128GB, 256GB, or 512GB', main_camera: '48 Megapixels (Dual)', battery: '80 hours audio', os: 'iOS 18.0' } },
      { name: 'iPhone 16 Pro (US/A3083)', description: '6.3" Super Retina XDR, A18 Pro, titanium, 5x optical zoom.', price: 1748250, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-blacktitanium-select-202409?wid=470&hei=556&fmt=png-alpha&.v=1725297029', stock: 0, is_featured: true, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Apple Inc.', specifications: { display: '6.3" Super Retina XDR with ProMotion, 2622x1206 (460 ppi)', chipset: 'Apple A18 Pro (6 Cores, 4.0 GHz)', ram_storage: '8GB / 128GB to 1TB', main_camera: '48 Megapixels (Triple + LiDAR)', battery: '85 hours audio', os: 'iOS 18.0' } },
      { name: 'iPhone 16 Pro Max (US/A3084)', description: '6.9" Super Retina XDR, A18 Pro, longest battery life ever.', price: 2098250, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-max-blacktitanium-select-202409?wid=470&hei=556&fmt=png-alpha&.v=1725297033', stock: 0, is_featured: true, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Apple Inc.', specifications: { display: '6.9" Super Retina XDR with ProMotion, 2868x1320 (460 ppi)', chipset: 'Apple A18 Pro (6 Cores, 4.0 GHz)', ram_storage: '8GB / 256GB, 512GB, or 1TB', main_camera: '48 Megapixels (Triple + LiDAR)', battery: '105 hours audio', os: 'iOS 18.0' } },
      { name: 'iPhone 17 Pro (US/A3256)', description: '6.3" Super Retina XDR, A19 Pro, 12GB RAM, enhanced cameras.', price: 1923250, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-17-pro-blacktitanium-select-202509?wid=470&hei=556&fmt=png-alpha', stock: 0, is_featured: true, is_hot: true, is_special: false, is_new_arrival: true, vendor: 'Apple Inc.', specifications: { display: '6.3" Super Retina XDR with ProMotion, 2622x1206 (460 ppi)', chipset: 'Apple A19 Pro (6 Cores, 4.25 GHz)', ram_storage: '12GB / 256GB, 512GB, or 1TB', main_camera: '48 Megapixels (Triple + LiDAR)', battery: '33 hours video', os: 'iOS 26.0' } },
      { name: 'iPhone 17 Pro Max (US/A3257)', description: '6.9" Super Retina XDR, A19 Pro, up to 2TB storage.', price: 2098250, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-17-pro-max-blacktitanium-select-202509?wid=470&hei=556&fmt=png-alpha', stock: 0, is_featured: true, is_hot: true, is_special: false, is_new_arrival: true, vendor: 'Apple Inc.', specifications: { display: '6.9" Super Retina XDR with ProMotion, 2868x1320 (460 ppi)', chipset: 'Apple A19 Pro (6 Cores, 4.25 GHz)', ram_storage: '12GB / 256GB to 2TB', main_camera: '48 Megapixels (Triple + LiDAR)', battery: '39 hours video', os: 'iOS 26.0' } },
      { name: 'iPhone Air (US/CA/MX/SA/A3260)', description: '6.5" Super Retina XDR, ultra-thin design, A19 Pro chip.', price: 1748250, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-17-air-ultramarine-select-202509?wid=470&hei=556&fmt=png-alpha', stock: 0, is_featured: true, is_hot: true, is_special: true, is_new_arrival: true, vendor: 'Apple Inc.', specifications: { display: '6.5" Super Retina XDR with ProMotion, 2736x1260 (460 ppi)', chipset: 'Apple A19 Pro (6 Cores, 4.25 GHz)', ram_storage: '12GB / 256GB, 512GB, or 1TB', main_camera: '48 Megapixels (Dual)', battery: '27 hours video', os: 'iOS 26.0' } },
      { name: 'Apple Watch Ultra 3 (49 mm)', description: 'S10 chip, 42-hour battery, thinner profile, advanced diving.', price: 1398250, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/apple-watch-ultra3-titanium-select-202509?wid=470&hei=556&fmt=png-alpha', stock: 0, is_featured: true, is_hot: true, is_special: false, is_new_arrival: true, vendor: 'Apple Inc.', specifications: { display: '1.95" OLED Retina, 422x514', chipset: 'Apple S10', ram_storage: '1GB / 64GB', main_camera: 'None', battery: '42 hours', os: 'watchOS 26.0' } },
      { name: 'Apple Watch Series 11 (Aluminum, GPS, 42 mm)', description: '24-hour battery, S10 chip, improved health features.', price: 698250, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/apple-watch-s11-aluminum-select-202509-45mm?wid=470&hei=556&fmt=png-alpha', stock: 0, is_featured: false, is_hot: false, is_special: false, is_new_arrival: true, vendor: 'Apple Inc.', specifications: { display: '2.0" OLED Retina, 374x446 (326 ppi)', chipset: 'Apple S10', ram_storage: '1GB / 64GB', main_camera: 'None', battery: '24 hours', os: 'watchOS 26.0' } },
      { name: 'Apple Watch Series 11 (Aluminum, GPS, 46 mm)', description: '24-hour battery, largest display, advanced sensors.', price: 838250, original_price: null, discount: null, image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/apple-watch-s11-aluminum-select-202509-45mm?wid=470&hei=556&fmt=png-alpha', stock: 0, is_featured: false, is_hot: false, is_special: false, is_new_arrival: true, vendor: 'Apple Inc.', specifications: { display: '2.1" OLED Retina, 416x496 (326 ppi)', chipset: 'Apple S10', ram_storage: '1GB / 64GB', main_camera: 'None', battery: '24 hours', os: 'watchOS 26.0' } },
      { name: 'Samsung Galaxy S24', description: 'Compact flagship with bright LTPO display and AI-assisted features.', price: 2189000, original_price: null, discount: null, image: 'https://phonesdata.com/files/models/Samsung-Galaxy-S24-1.jpg', stock: 4, is_featured: false, is_hot: false, is_special: true, is_new_arrival: true, vendor: 'Tech Haven Electronics', specifications: { display: '6.2" Dynamic AMOLED 2X LTPO, 1–120 Hz', chipset: 'Snapdragon 8 Gen 3 (region dependent)', ram_storage: '8GB / 256GB', main_camera: '50 MP OIS + 12 MP ultra-wide + 10 MP tele 3x', battery: '4000 mAh', os: 'Android 14 (One UI 6.1)' } },
      { name: 'Samsung Galaxy S24 Ultra', description: 'Ultimate Galaxy — S Pen, 200 MP camera, and titanium frame.', price: 3949000, original_price: 4250000, discount: 7, image: 'https://phonesdata.com/files/models/Samsung-Galaxy-S24-Ultra-1.jpg', stock: 3, is_featured: true, is_hot: true, is_special: true, is_new_arrival: true, vendor: 'Tech Haven Electronics', specifications: { display: '6.8" Dynamic AMOLED 2X LTPO', chipset: 'Snapdragon 8 Gen 3 for Galaxy', ram_storage: '12GB / 512GB', main_camera: '200 MP + 50 MP periscope + 10 MP tele + 12 MP ultra-wide', battery: '5000 mAh', os: 'Android 14' } },
      { name: 'Xiaomi Redmi A3', description: 'Large display budget phone — dual SIM and clean MIUI experience.', price: 158500, original_price: null, discount: null, image: 'https://phonesdata.com/files/models/Xiaomi-Redmi-A3-1.jpg', stock: 25, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.71" HD+ LCD, 90 Hz', chipset: 'MediaTek Helio G36', ram_storage: '3GB / 64GB', main_camera: '8 MP + auxiliary depth', battery: '5000 mAh', os: 'Android 14 (Go / MIUI)' } },
      { name: 'Xiaomi Redmi 13', description: '108 MP main camera on a mid-tier body — great value.', price: 285000, original_price: 312000, discount: 9, image: REDMI_13_IMAGE_FALLBACK, stock: 16, is_featured: true, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.79" LCD, FHD+, 90 Hz', chipset: 'MediaTek Helio G91-Ultra', ram_storage: '6GB / 128GB', main_camera: '108 MP + 2 MP macro', battery: '5030 mAh', os: 'Android 14' } },
      { name: 'Xiaomi Redmi 13C', description: 'Affordable daily driver with big battery.', price: 176900, original_price: null, discount: null, image: 'https://phonesdata.com/files/models/Xiaomi-Redmi-13C-4G-1.jpg', stock: 20, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.74" HD+ LCD, 90 Hz', chipset: 'MediaTek Helio G85', ram_storage: '4GB / 128GB', main_camera: '50 MP + 2 MP macro', battery: '5000 mAh', os: 'Android 14' } },
      { name: 'Xiaomi Redmi Note 13', description: 'Note line refresh with AMOLED and thin bezels.', price: 429900, original_price: null, discount: null, image: 'https://phonesdata.com/files/models/Xiaomi-Redmi-Note-13-4G-1.jpg', stock: 11, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.67" AMOLED, 120 Hz', chipset: 'Snapdragon 685', ram_storage: '6GB / 128GB', main_camera: '108 MP + 8 MP ultra-wide + 2 MP macro', battery: '5000 mAh', os: 'Android 14' } },
      { name: 'Xiaomi Redmi Note 13 Pro', description: '200 MP sensor and 67W fast charging in the Note series.', price: 595000, original_price: 649000, discount: 8, image: 'https://phonesdata.com/files/models/Xiaomi-Redmi-Note-13-Pro-973.jpg', stock: 10, is_featured: true, is_hot: false, is_special: true, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.67" AMOLED, 120 Hz', chipset: 'Snapdragon 7s Gen 2', ram_storage: '8GB / 256GB', main_camera: '200 MP OIS + 8 MP ultra-wide + 2 MP macro', battery: '5100 mAh, 67W', os: 'Android 14' } },
      { name: 'Xiaomi Redmi Note 13 Pro+ 5G', description: 'Curved AMOLED, IP68, and 120W charging — flagship Note.', price: 898000, original_price: null, discount: null, image: 'https://phonesdata.com/files/models/Xiaomi-Redmi-Note-13-Pro+-643.jpg', stock: 6, is_featured: false, is_hot: false, is_special: true, is_new_arrival: true, vendor: 'Tech Haven Electronics', specifications: { display: '6.67" curved AMOLED, 120 Hz', chipset: 'MediaTek Dimensity 7200-Ultra', ram_storage: '8GB / 256GB', main_camera: '200 MP OIS + 8 MP ultra-wide + 2 MP macro', battery: '5000 mAh, 120W', os: 'Android 14' } },
      { name: 'POCO M6 Pro', description: 'Performance-focused mid-range with strong GPU for gaming.', price: 525000, original_price: 565000, discount: 7, image: 'https://phonesdata.com/files/models/Xiaomi-Poco-M6-Pro-4G-1.jpg', stock: 9, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.67" AMOLED, 120 Hz', chipset: 'MediaTek Helio G99-Ultra', ram_storage: '8GB / 256GB', main_camera: '64 MP OIS + 8 MP ultra-wide + 2 MP macro', battery: '5000 mAh, 67W', os: 'Android 14' } },
      { name: 'POCO X6 Pro', description: 'Dimensity 8300-Ultra and flagship-grade display at aggressive price.', price: 1189000, original_price: null, discount: null, image: 'https://phonesdata.com/files/models/Xiaomi-Poco-X6-Pro-1.jpg', stock: 7, is_featured: true, is_hot: true, is_special: true, is_new_arrival: true, vendor: 'Tech Haven Electronics', specifications: { display: '6.67" AMOLED, 1.48T brightness peak, 120 Hz', chipset: 'MediaTek Dimensity 8300-Ultra', ram_storage: '12GB / 512GB', main_camera: '64 MP OIS + 8 MP ultra-wide + 2 MP macro', battery: '5000 mAh, 67W', os: 'Android 14' } },
      { name: 'Xiaomi 14', description: 'Leica-tuned compact flagship — excellent night photography.', price: 2679000, original_price: 2899000, discount: 8, image: 'https://phonesdata.com/files/models/Xiaomi-14-1.jpg', stock: 4, is_featured: true, is_hot: false, is_special: true, is_new_arrival: true, vendor: 'Tech Haven Electronics', specifications: { display: '6.36" LTPO AMOLED, 120 Hz', chipset: 'Snapdragon 8 Gen 3', ram_storage: '12GB / 512GB', main_camera: 'Leica triple: 50 MP + 50 MP ultra-wide + 50 MP tele', battery: '4610 mAh, 90W wired / 50W wireless', os: 'Android 14' } },
      { name: 'Oppo A18', description: 'Stereo-like loudspeaker experience and large battery.', price: 172500, original_price: null, discount: null, image: 'https://phonesdata.com/files/models/Oppo-A18-234.jpg', stock: 17, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.56" LCD, HD+, 90 Hz', chipset: 'MediaTek Helio G85', ram_storage: '4GB / 64GB', main_camera: '8 MP + 2 MP depth', battery: '5000 mAh', os: 'Android 13 (ColorOS)' } },
      { name: 'Oppo A38', description: 'Reliable family phone with 50 MP main sensor.', price: 268000, original_price: 295000, discount: 9, image: 'https://phonesdata.com/files/models/Oppo-A38-474.jpg', stock: 14, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.56" LCD, HD+, 90 Hz', chipset: 'MediaTek Helio G85', ram_storage: '4GB / 128GB', main_camera: '50 MP + 2 MP depth', battery: '5000 mAh', os: 'Android 13' } },
      { name: 'Oppo A58', description: 'FHD+ display upgrade in the A-series.', price: 352000, original_price: null, discount: null, image: 'https://phonesdata.com/files/models/Oppo-A58-4G-364.jpg', stock: 11, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.72" LCD, FHD+, 90 Hz', chipset: 'MediaTek Helio G85', ram_storage: '6GB / 128GB', main_camera: '50 MP + 2 MP mono', battery: '5000 mAh, 33W', os: 'Android 13' } },
      { name: 'Oppo A78', description: '67W charging and AMOLED in a slim chassis.', price: 529000, original_price: 575000, discount: 8, image: 'https://phonesdata.com/files/models/Oppo-A78-4G-858.jpg', stock: 8, is_featured: true, is_hot: false, is_special: true, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.43" AMOLED, FHD+, 90 Hz', chipset: 'Snapdragon 680', ram_storage: '8GB / 256GB', main_camera: '50 MP + 2 MP', battery: '5000 mAh, 67W', os: 'Android 13' } },
      { name: 'Oppo Reno 10 5G', description: 'Portrait-focused mid-range with telephoto lens.', price: 789000, original_price: null, discount: null, image: 'https://phonesdata.com/files/models/Oppo-Reno10-265.jpg', stock: 6, is_featured: false, is_hot: true, is_special: true, is_new_arrival: false, vendor: 'Tech Haven Electronics', specifications: { display: '6.7" AMOLED, 120 Hz', chipset: 'MediaTek Dimensity 7050', ram_storage: '8GB / 256GB', main_camera: '64 MP + 32 MP tele portrait + 8 MP ultra-wide', battery: '5000 mAh, 67W', os: 'Android 13' } },
      { name: 'Oppo Reno 11 5G', description: 'Refined Reno design with improved low-light portraits.', price: 935000, original_price: 999000, discount: 6, image: 'https://phonesdata.com/files/models/Oppo-Reno11-1.jpg', stock: 5, is_featured: true, is_hot: false, is_special: true, is_new_arrival: true, vendor: 'Tech Haven Electronics', specifications: { display: '6.7" AMOLED, 120 Hz', chipset: 'MediaTek Dimensity 7050 / 8200 (region)', ram_storage: '8GB / 256GB', main_camera: '50 MP LYT main + 32 MP tele + 8 MP ultra-wide', battery: '4800–5000 mAh', os: 'Android 14' } },
      { name: 'Oppo Find X7', description: 'Ultra-premium camera flagship — Hasselblad color science (series).', price: 2989000, original_price: 3250000, discount: 8, image: 'https://phonesdata.com/files/models/Oppo-Find-X7-1.jpg', stock: 3, is_featured: true, is_hot: true, is_special: true, is_new_arrival: true, vendor: 'Tech Haven Electronics', specifications: { display: '6.78" LTPO AMOLED, ProXDR', chipset: 'MediaTek Dimensity 9300', ram_storage: '16GB / 512GB', main_camera: 'Triple 50 MP flagship array (periscope on variant)', battery: '5000 mAh, 100W', os: 'Android 14' } },
    ].map((p) => ({ ...p, category_id: resolveProductCategoryId(p), shop_id: techHavenShop.id }));

    for (const p of techHavenProducts) {
      await Product.findOrCreate({
        where: { name: p.name, shop_id: techHavenShop.id },
        defaults: p
      });
    }
    console.log(`       ✅ ${techHavenProducts.length} products created for Tech Haven Electronics.\n`);

    // ═══════════════════════════════════════════════════════════════════
    // 6. PIXIE ELECTRONICS — Product Listings
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── 6. Pixie Electronics: Product Listings ───\n');

    const IMG = {
      iphone_11_pro:    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-11-pro-spacegray-select-2019?wid=470&hei=556&fmt=png-alpha&.v=1572998323',
      iphone_11_pro_max:'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-11-pro-max-spacegray-select-2019?wid=470&hei=556&fmt=png-alpha&.v=1572998324',
      iphone_11:        'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-11-black-select-2019?wid=470&hei=556&fmt=png-alpha&.v=1567945139',
      iphone_12:        'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-12-black-select-2020?wid=470&hei=556&fmt=png-alpha&.v=1604343705',
      iphone_12_pro:    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-12-pro-graphite-select-2020?wid=470&hei=556&fmt=png-alpha&.v=1604020000',
      iphone_12_pro_max:'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-12-pro-max-graphite-select-2020?wid=470&hei=556&fmt=png-alpha&.v=1604020000',
      iphone_13:        'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-black-select-2021?wid=470&hei=556&fmt=png-alpha&.v=1629842864',
      iphone_13_pro_max:'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-pro-max-graphite-select-2021?wid=470&hei=556&fmt=png-alpha&.v=1631652958',
      iphone_15_pro_max:'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-max-blacktitanium-select?wid=470&hei=556&fmt=png-alpha&.v=1693009284',
      iphone_16_plus:   'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-plus-black-select-202409?wid=470&hei=556&fmt=png-alpha&.v=1724285837',
      iphone_xr:        'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-xr-black-select-201809?wid=470&hei=556&fmt=png-alpha&.v=1551226036',
      iphone_xs:        'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-xs-spacegray-select-201809?wid=470&hei=556&fmt=png-alpha&.v=1550706891',
      samsung_a32:      'https://image.samsung.com/is/image/samsung/p6pim/levant/sm-a325fzkdmid/gallery/levant-galaxy-a32-sm-a325-sm-a325fzkdmid-thumb-531692255?$684_547_PNG$',
      samsung_a05_128:  'https://image.samsung.com/is/image/samsung/p6pim/levant/sm-a055fzkdmid/gallery/levant-galaxy-a05-sm-a055-sm-a055fzkdmid-thumb-537888099?$684_547_PNG$',
      samsung_a07:      'https://image.samsung.com/is/image/samsung/p6pim/levant/sm-a075fzkdmid/gallery/levant-galaxy-a07-sm-a075-sm-a075fzkdmid-thumb-535183533?$684_547_PNG$',
      samsung_s20:      'https://image.samsung.com/is/image/samsung/p6pim/levant/sm-g981bziddfe/gallery/levant-galaxy-s20-5g-sm-g981-sm-g981bziddfe-thumb-488652065?$684_547_PNG$',
      samsung_s21:      'https://image.samsung.com/is/image/samsung/p6pim/levant/sm-g991bzkdmid/gallery/levant-galaxy-s21-5g-sm-g991-sm-g991bzkdmid-thumb-509002421?$684_547_PNG$',
      samsung_s21_ultra:'https://image.samsung.com/is/image/samsung/p6pim/levant/sm-g998bzkdmid/gallery/levant-galaxy-s21-ultra-5g-sm-g998-sm-g998bzkdmid-thumb-509020415?$684_547_PNG$',
      samsung_s22_ultra:'https://image.samsung.com/is/image/samsung/p6pim/levant/sm-s908bzkdmid/gallery/levant-galaxy-s22-ultra-5g-sm-s908-sm-s908bzkdmid-thumb-521649902?$684_547_PNG$',
      pixel_6:          'https://phonesdata.com/files/models/Google-Pixel-6-1.jpg',
      pixel_6_pro:      'https://phonesdata.com/files/models/Google-Pixel-6-Pro-1.jpg',
      pixel_7:          'https://phonesdata.com/files/models/Google-Pixel-7-1.jpg',
      pixel_7_pro:      'https://phonesdata.com/files/models/Google-Pixel-7-Pro-1.jpg',
    };

    const pixieProducts = [
      // ── Sealed iPhones ───────────────────────────────────
      { name: 'iPhone 11 Pro 256GB (Sealed)', description: 'Sealed, brand-new iPhone 11 Pro 256GB. Triple-camera system with Night Mode, 5.8" Super Retina XDR display, A13 Bionic chip. 2-month Pixie warranty.', price: 1699000, original_price: null, discount: null, image: IMG.iphone_11_pro, stock: 3, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '5.8" Super Retina XDR, 2436×1125 (458 ppi)', chipset: 'Apple A13 Bionic', ram_storage: '4GB / 256GB', main_camera: '12 MP Triple (Wide + Ultra-wide + Telephoto)', battery: '3046 mAh', os: 'iOS 13 (upgradable)' } },
      { name: 'iPhone 11 Pro Max 256GB (Sealed)', description: 'Sealed iPhone 11 Pro Max 256GB. Largest Super Retina XDR display in the Pro line, triple-camera, A13 Bionic. 2-month Pixie warranty.', price: 1799000, original_price: null, discount: null, image: IMG.iphone_11_pro_max, stock: 2, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.5" Super Retina XDR, 2688×1242 (458 ppi)', chipset: 'Apple A13 Bionic', ram_storage: '4GB / 256GB', main_camera: '12 MP Triple (Wide + Ultra-wide + Telephoto)', battery: '3969 mAh', os: 'iOS 13 (upgradable)' } },
      { name: 'iPhone 12 128GB (Sealed)', description: 'Sealed iPhone 12 128GB. 5G capable, Ceramic Shield front glass, A14 Bionic, 6.1" Super Retina XDR with OLED. 2-month Pixie warranty.', price: 1699000, original_price: null, discount: null, image: IMG.iphone_12, stock: 4, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.1" Super Retina XDR OLED, 2532×1170 (460 ppi)', chipset: 'Apple A14 Bionic', ram_storage: '4GB / 128GB', main_camera: '12 MP Dual (Wide + Ultra-wide)', battery: '2815 mAh', os: 'iOS 14 (upgradable)' } },
      { name: 'iPhone 12 Pro Max 256GB (Sealed)', description: 'Sealed iPhone 12 Pro Max 256GB. Largest iPhone 12 screen, 5x optical zoom range, LiDAR scanner, 5G. 2-month Pixie warranty.', price: 2499000, original_price: null, discount: null, image: IMG.iphone_12_pro_max, stock: 2, is_featured: true, is_hot: true, is_special: true, is_new_arrival: false, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.7" Super Retina XDR OLED, 2778×1284 (458 ppi)', chipset: 'Apple A14 Bionic', ram_storage: '6GB / 256GB', main_camera: '12 MP Triple + LiDAR (Wide + Ultra-wide + Telephoto 2.5x)', battery: '3687 mAh', os: 'iOS 14 (upgradable)' } },
      { name: 'iPhone 16 Plus 128GB (Sealed)', description: 'Sealed iPhone 16 Plus 128GB. A18 chip with Apple Intelligence, Camera Control button, 6.7" display. 2-month Pixie warranty.', price: 4199000, original_price: null, discount: null, image: IMG.iphone_16_plus, stock: 2, is_featured: true, is_hot: true, is_special: true, is_new_arrival: true, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.7" Super Retina XDR OLED, 2796×1290 (460 ppi)', chipset: 'Apple A18', ram_storage: '8GB / 128GB', main_camera: '48 MP Dual (Fusion + Ultra-wide)', battery: '4674 mAh', os: 'iOS 18' } },
      // ── Sealed Google Pixel ──────────────────────────────
      { name: 'Google Pixel 6 128GB (Sealed)', description: 'Sealed Google Pixel 6 128GB. Google Tensor chip, 50 MP main camera, 6.4" AMOLED 90Hz display, 5G. 2-month Pixie warranty.', price: 1150000, original_price: null, discount: null, image: IMG.pixel_6, stock: 3, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.4" AMOLED, 2400×1080 (411 ppi), 90 Hz', chipset: 'Google Tensor', ram_storage: '8GB / 128GB', main_camera: '50 MP Wide + 12 MP Ultra-wide', battery: '4614 mAh, 30W', os: 'Android 12 (upgradable to 15)' } },
      { name: 'Google Pixel 6 Pro 128GB (Sealed)', description: 'Sealed Google Pixel 6 Pro 128GB. 6.7" LTPO AMOLED 120Hz, 50 MP main + 48 MP telephoto, Tensor chip. 2-month Pixie warranty.', price: 1499000, original_price: null, discount: null, image: IMG.pixel_6_pro, stock: 2, is_featured: false, is_hot: false, is_special: true, is_new_arrival: false, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.7" LTPO AMOLED, 3120×1440 (512 ppi), 10-120 Hz', chipset: 'Google Tensor', ram_storage: '12GB / 128GB', main_camera: '50 MP Wide + 48 MP Telephoto 4x + 12 MP Ultra-wide', battery: '5003 mAh, 30W', os: 'Android 12 (upgradable to 15)' } },
      { name: 'Google Pixel 7 128GB (Sealed)', description: 'Sealed Google Pixel 7 128GB. Tensor G2 chip, 50 MP main camera with improved low-light, 6.3" AMOLED 90Hz. 2-month Pixie warranty.', price: 1499000, original_price: null, discount: null, image: IMG.pixel_7, stock: 3, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.3" AMOLED, 2400×1080 (416 ppi), 90 Hz', chipset: 'Google Tensor G2', ram_storage: '8GB / 128GB', main_camera: '50 MP Wide + 12 MP Ultra-wide', battery: '4355 mAh, 30W', os: 'Android 13 (upgradable to 15)' } },
      { name: 'Google Pixel 7 Pro 128GB (Sealed)', description: 'Sealed Google Pixel 7 Pro 128GB. 6.7" LTPO AMOLED 120Hz, 50 MP + 48 MP 5x telephoto, Tensor G2. 2-month Pixie warranty.', price: 1899000, original_price: null, discount: null, image: IMG.pixel_7_pro, stock: 2, is_featured: true, is_hot: true, is_special: false, is_new_arrival: false, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.7" LTPO AMOLED, 3120×1440 (512 ppi), 10-120 Hz', chipset: 'Google Tensor G2', ram_storage: '12GB / 128GB', main_camera: '50 MP Wide + 48 MP Telephoto 5x + 12 MP Ultra-wide', battery: '5000 mAh, 30W', os: 'Android 13 (upgradable to 15)' } },
      // ── Sealed Samsung ───────────────────────────────────
      { name: 'Samsung A32 128GB (Sealed)', description: 'Sealed Samsung Galaxy A32 128GB. 6.4" Super AMOLED 90Hz, quad-camera with 64 MP main, 5000 mAh battery. 2-month Pixie warranty.', price: 750000, original_price: null, discount: null, image: IMG.samsung_a32, stock: 6, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.4" Super AMOLED, FHD+, 90 Hz', chipset: 'MediaTek Helio G80', ram_storage: '6GB / 128GB', main_camera: '64 MP + 8 MP ultra-wide + 5 MP macro + 5 MP depth', battery: '5000 mAh, 15W', os: 'Android 11 (upgradable to 13)' } },
      { name: 'Samsung A05 128GB (Sealed)', description: 'Sealed Samsung Galaxy A05 128GB. 6.7" PLS LCD, 50 MP main camera, MediaTek Helio G85, large 5000 mAh battery. 2-month Pixie warranty.', price: 749000, original_price: null, discount: null, image: IMG.samsung_a05_128, stock: 8, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.7" PLS LCD, HD+', chipset: 'MediaTek Helio G85', ram_storage: '4GB / 128GB', main_camera: '50 MP + 2 MP depth', battery: '5000 mAh', os: 'Android 14 (One UI Core)' } },
      { name: 'Samsung A07 128GB (Sealed)', description: 'Sealed Samsung Galaxy A07 128GB. 6.7" PLS LCD, 50 MP triple-camera, 5000 mAh. 2-month Pixie warranty.', price: 799000, original_price: null, discount: null, image: IMG.samsung_a07, stock: 7, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.7" PLS LCD, HD+', chipset: 'Exynos 850', ram_storage: '3GB / 128GB', main_camera: '50 MP + 2 MP depth + 2 MP macro', battery: '5000 mAh', os: 'Android 12' } },
      { name: 'Samsung S20 128GB (Sealed)', description: 'Sealed Samsung Galaxy S20 128GB. 6.2" Dynamic AMOLED 120Hz, 64 MP triple-camera, 5G, IP68. 2-month Pixie warranty.', price: 1000000, original_price: null, discount: null, image: IMG.samsung_s20, stock: 3, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.2" Dynamic AMOLED 2X, FHD+, 120 Hz', chipset: 'Exynos 990 / Snapdragon 865', ram_storage: '12GB / 128GB', main_camera: '64 MP + 12 MP ultra-wide + 64 MP telephoto 3x', battery: '4000 mAh, 25W', os: 'Android 10 (upgradable to 13)' } },
      { name: 'Samsung S21 128GB (Sealed)', description: 'Sealed Samsung Galaxy S21 128GB. 6.2" Dynamic AMOLED 120Hz, 64 MP triple-camera, 5G, Exynos 2100. 2-month Pixie warranty.', price: 1499000, original_price: null, discount: null, image: IMG.samsung_s21, stock: 4, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.2" Dynamic AMOLED 2X, FHD+, 120 Hz', chipset: 'Exynos 2100 / Snapdragon 888', ram_storage: '8GB / 128GB', main_camera: '64 MP + 12 MP ultra-wide + 10 MP telephoto 3x', battery: '4000 mAh, 25W', os: 'Android 11 (upgradable to 14)' } },
      { name: 'Samsung S21 Ultra 128GB (Sealed)', description: 'Sealed Samsung Galaxy S21 Ultra 128GB. S Pen support, 108 MP camera, 6.8" LTPO AMOLED 120Hz, 5G. 2-month Pixie warranty.', price: 1850000, original_price: null, discount: null, image: IMG.samsung_s21_ultra, stock: 2, is_featured: true, is_hot: true, is_special: true, is_new_arrival: false, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.8" Dynamic AMOLED 2X LTPO, WQHD+, 10-120 Hz', chipset: 'Exynos 2100 / Snapdragon 888', ram_storage: '12GB / 128GB', main_camera: '108 MP + 12 MP ultra-wide + 10 MP tele 3x + 10 MP tele 10x', battery: '5000 mAh, 25W', os: 'Android 11 (upgradable to 14)' } },
      { name: 'Samsung S22 Ultra 256GB (Sealed)', description: 'Sealed Samsung Galaxy S22 Ultra 256GB. Built-in S Pen, 200 MP camera, 6.8" LTPO AMOLED, Snapdragon 8 Gen 1. 2-month Pixie warranty.', price: 2499000, original_price: null, discount: null, image: IMG.samsung_s22_ultra, stock: 2, is_featured: true, is_hot: true, is_special: true, is_new_arrival: false, condition: 'new', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.8" Dynamic AMOLED 2X LTPO, WQHD+, 1-120 Hz', chipset: 'Snapdragon 8 Gen 1 / Exynos 2200', ram_storage: '12GB / 256GB', main_camera: '200 MP + 12 MP ultra-wide + 10 MP tele 3x + 10 MP tele 10x', battery: '5000 mAh, 45W', os: 'Android 12 (upgradable to 14)' } },
      // ── Pre-owned iPhones ────────────────────────────────
      { name: 'iPhone XR 64GB — Pre-owned 100%', description: 'Pre-owned iPhone XR 64GB. Battery health 100%. 6.1" Liquid Retina, A12 Bionic. Cosmetically excellent. 2-month Pixie warranty.', price: 750000, original_price: null, discount: null, image: IMG.iphone_xr, stock: 2, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, condition: 'used', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.1" Liquid Retina IPS, 1792×828 (326 ppi)', chipset: 'Apple A12 Bionic', ram_storage: '3GB / 64GB', main_camera: '12 MP Wide (Single)', battery: '2942 mAh — 100% health', os: 'iOS 12 (upgradable to 17)' } },
      { name: 'iPhone XS 64GB — Pre-owned 87%', description: 'Pre-owned iPhone XS 64GB. Battery health 87%. 5.8" Super Retina OLED, A12 Bionic, dual-camera. 2-month Pixie warranty.', price: 599000, original_price: null, discount: null, image: IMG.iphone_xs, stock: 2, is_featured: false, is_hot: false, is_special: false, is_new_arrival: false, condition: 'used', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '5.8" Super Retina OLED, 2436×1125 (458 ppi)', chipset: 'Apple A12 Bionic', ram_storage: '4GB / 64GB', main_camera: '12 MP Dual (Wide + Telephoto 2x)', battery: '2658 mAh — 87% health', os: 'iOS 12 (upgradable to 17)' } },
      { name: 'iPhone 11 64GB — Pre-owned 100%', description: 'Pre-owned iPhone 11 64GB. Battery health 100%. 6.1" Liquid Retina, A13 Bionic, dual-camera. Excellent condition. 2-month Pixie warranty.', price: 849000, original_price: null, discount: null, image: IMG.iphone_11, stock: 3, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, condition: 'used', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.1" Liquid Retina IPS, 1792×828 (326 ppi)', chipset: 'Apple A13 Bionic', ram_storage: '4GB / 64GB', main_camera: '12 MP Dual (Wide + Ultra-wide)', battery: '3110 mAh — 100% health', os: 'iOS 13 (upgradable to 17)' } },
      { name: 'iPhone 11 Pro Max 256GB — Pre-owned 87%', description: 'Pre-owned iPhone 11 Pro Max 256GB. Battery health 87%. Triple-camera, 6.5" Super Retina XDR. 2-month Pixie warranty.', price: 1250000, original_price: null, discount: null, image: IMG.iphone_11_pro_max, stock: 2, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, condition: 'used', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.5" Super Retina XDR OLED, 2688×1242 (458 ppi)', chipset: 'Apple A13 Bionic', ram_storage: '4GB / 256GB', main_camera: '12 MP Triple (Wide + Ultra-wide + Telephoto)', battery: '3969 mAh — 87% health', os: 'iOS 13 (upgradable to 17)' } },
      { name: 'iPhone 12 Pro 128GB — Pre-owned 100%', description: 'Pre-owned iPhone 12 Pro 128GB. Battery health 100%. LiDAR scanner, triple-camera, 6.1" OLED. 2-month Pixie warranty.', price: 1499000, original_price: null, discount: null, image: IMG.iphone_12_pro, stock: 2, is_featured: false, is_hot: false, is_special: true, is_new_arrival: false, condition: 'used', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.1" Super Retina XDR OLED, 2532×1170 (460 ppi)', chipset: 'Apple A14 Bionic', ram_storage: '6GB / 128GB', main_camera: '12 MP Triple + LiDAR (Wide + Ultra-wide + Telephoto 2x)', battery: '2815 mAh — 100% health', os: 'iOS 14 (upgradable to 17)' } },
      { name: 'iPhone 12 Pro Max 256GB — Pre-owned 100%', description: 'Pre-owned iPhone 12 Pro Max 256GB. Battery health 100%. 5x zoom range, LiDAR, 6.7" OLED. 2-month Pixie warranty.', price: 1899000, original_price: null, discount: null, image: IMG.iphone_12_pro_max, stock: 1, is_featured: true, is_hot: false, is_special: true, is_new_arrival: false, condition: 'used', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.7" Super Retina XDR OLED, 2778×1284 (458 ppi)', chipset: 'Apple A14 Bionic', ram_storage: '6GB / 256GB', main_camera: '12 MP Triple + LiDAR (Wide + Ultra-wide + Telephoto 2.5x)', battery: '3687 mAh — 100% health', os: 'iOS 14 (upgradable to 17)' } },
      { name: 'iPhone 13 128GB — Pre-owned 100%', description: 'Pre-owned iPhone 13 128GB. Battery health 100%. A15 Bionic, dual-camera with sensor-shift OIS, Cinematic mode. 2-month Pixie warranty.', price: 1450000, original_price: null, discount: null, image: IMG.iphone_13, stock: 3, is_featured: false, is_hot: true, is_special: false, is_new_arrival: false, condition: 'used', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.1" Super Retina XDR OLED, 2532×1170 (460 ppi)', chipset: 'Apple A15 Bionic', ram_storage: '4GB / 128GB', main_camera: '12 MP Dual (Wide + Ultra-wide)', battery: '3227 mAh — 100% health', os: 'iOS 15 (upgradable to 17)' } },
      { name: 'iPhone 13 Pro Max 128GB — Pre-owned 84%', description: 'Pre-owned iPhone 13 Pro Max 128GB. Battery health 84%. ProMotion 120Hz, triple-camera with macro, 6.7" OLED. 2-month Pixie warranty.', price: 2000000, original_price: null, discount: null, image: IMG.iphone_13_pro_max, stock: 1, is_featured: true, is_hot: true, is_special: false, is_new_arrival: false, condition: 'used', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.7" ProMotion Super Retina XDR OLED, 2778×1284 (458 ppi), 120 Hz', chipset: 'Apple A15 Bionic', ram_storage: '6GB / 128GB', main_camera: '12 MP Triple + LiDAR (Wide + Ultra-wide + Telephoto 3x + Macro)', battery: '4352 mAh — 84% health', os: 'iOS 15 (upgradable to 17)' } },
      { name: 'iPhone 15 Pro Max 256GB — Pre-owned 83%', description: 'Pre-owned iPhone 15 Pro Max 256GB. Battery health 83%. Titanium design, 5x optical zoom, A17 Pro chip, USB-C. 2-month Pixie warranty.', price: 2950000, original_price: null, discount: null, image: IMG.iphone_15_pro_max, stock: 1, is_featured: true, is_hot: true, is_special: true, is_new_arrival: false, condition: 'used', vendor: 'Pixie Electronics', category_id: categoryIds.smartphones, specifications: { display: '6.7" ProMotion Super Retina XDR OLED, 2796×1290 (460 ppi), 120 Hz', chipset: 'Apple A17 Pro', ram_storage: '8GB / 256GB', main_camera: '48 MP Triple + LiDAR (Fusion + Ultra-wide + Telephoto 5x)', battery: '4422 mAh — 83% health', os: 'iOS 17' } },
    ].map((p) => ({ ...p, shop_id: pixieShop.id }));

    for (const p of pixieProducts) {
      await Product.findOrCreate({
        where: { name: p.name, shop_id: pixieShop.id },
        defaults: p
      });
    }
    console.log(`       ✅ ${pixieProducts.length} products created for Pixie Electronics.\n`);

    // ═══════════════════════════════════════════════════════════════════
    // 7. BUYER — Shipping Address
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── 7. Buyer: Shipping Address ───\n');
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
    // 8. COURIER SERVICES
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── 8. Courier Services ───\n');
    const courierData = [
      { name: 'Airtel Money Express', description: 'Fast delivery via Airtel network', is_active: true, sort_order: 1 },
      { name: 'TNM Mpamba Delivery',  description: 'Reliable delivery via TNM',        is_active: true, sort_order: 2 },
      { name: 'DHL Malawi',           description: 'International and local courier',   is_active: true, sort_order: 3 },
      { name: 'FedEx',                description: 'Express shipping',                  is_active: true, sort_order: 4 }
    ];
    for (const c of courierData) {
      await CourierService.findOrCreate({ where: { name: c.name }, defaults: c });
    }
    console.log('       ✅ Courier services seeded.\n');

    // ═══════════════════════════════════════════════════════════════════
    // 9. PAYMENT METHODS
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── 9. Payment Methods ───\n');
    const paymentMethodsData = [
      { name: 'Airtel Money', slug: 'airtel', psp_id: 1, provider: 'malipo', icon: 'airtel', is_active: true, sort_order: 1 },
      { name: 'TNM Mpamba',   slug: 'tnm',    psp_id: 2, provider: 'malipo', icon: 'tnm',    is_active: true, sort_order: 2 }
    ];
    for (const pm of paymentMethodsData) {
      await PaymentMethod.findOrCreate({ where: { slug: pm.slug }, defaults: pm });
    }
    console.log('       ✅ Payment methods seeded.\n');

    // ═══════════════════════════════════════════════════════════════════
    // 10. ESCROW — Admin Wallet
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── 10. Escrow: Admin Wallet ───\n');
    await Wallet.findOrCreate({
      where: { user_id: adminUser.id },
      defaults: { user_id: adminUser.id, balance: 0, currency: 'MWK' }
    });
    console.log('       ✅ Admin wallet ready for escrow.\n');

    // ═══════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎉 Combined seeding complete! Test credentials:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Admin:                  admin@techaven.mw            / admin12345');
    console.log('  Buyer:                  buyer@techaven.mw            / password123');
    console.log('  Seller (Tech Haven):    seller@techaven.mw           / seller12345');
    console.log('  Seller (Pixie/Frank):   frank@goexperiencecloud.com  / 78789878');
    console.log('  Delivery Agent:         agent@techaven.mw            / agent12345');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nShops seeded:');
    console.log('  1. Tech Haven Electronics — 123 Commerce Street, Area 47');
    console.log(`     ${techHavenProducts.length} products (Samsung, Tecno, Infinix, Apple, Xiaomi, Oppo...)`);
    console.log('  2. Pixie Electronics — Behind Game by Olympic Mall');
    console.log(`     ${pixieProducts.length} products (Sealed + Pre-owned iPhones, Pixel, Samsung)`);
    console.log('\nFlow: Buyer browses → Checkout → Payment → Escrow holds');
    console.log('      → Seller accepts → Delivery → Buyer confirms → Released');
    console.log('═══════════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Combined seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();