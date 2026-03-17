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

const {
  User,
  Category,
  Shop,
  Product,
  CourierService,
  DeliveryAgent,
  ShippingAddress,
  Wallet,
  PaymentMethod
} = db;

const seedDatabase = async () => {
  try {
    console.log('🌱 Techaven Database Seeding (following Flow Diagram v1.0)\n');

    await db.sequelize.authenticate();
    console.log('✅ Database connection established.\n');

    await db.sequelize.sync({ alter: false });
    console.log('✅ Database synchronized.\n');

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

    // 4. SELLER FLOW – Create Product Listing (Section 4, Step 6)
    // Seller creates listings: title, brand, condition, price, stock, images
    console.log('  [4.1] Seller: Create Product Listings...');
    const productsData = [
      { name: 'Samsung Galaxy A54', category_id: categories[0].id, shop_id: shop.id, price: 450000, stock: 10, image: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397000/techaven/products/samsung-a54.jpg', description: '5G smartphone, 128GB', vendor: 'Tech Haven Electronics', points: 45 },
      { name: 'HP Pavilion 15 Laptop', category_id: categories[1].id, shop_id: shop.id, price: 850000, stock: 5, image: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397000/techaven/products/hp-pavilion.jpg', description: 'Intel i5, 8GB RAM, 256GB SSD', vendor: 'Tech Haven Electronics', points: 85 },
      { name: 'Wireless Earbuds Pro', category_id: categories[2].id, shop_id: shop.id, price: 75000, stock: 25, image: 'https://res.cloudinary.com/dd1raaqnh/image/upload/v1772397000/techaven/products/earbuds.jpg', description: 'Noise cancelling, 24hr battery', vendor: 'Tech Haven Electronics', points: 7 }
    ];
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
    // PAYMENT METHODS – Malipo only: Airtel (psp_id=1), TNM (psp_id=2)
    // ═══════════════════════════════════════════════════════════════════

    console.log('─── Payment Methods (Malipo) ───\n');

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
