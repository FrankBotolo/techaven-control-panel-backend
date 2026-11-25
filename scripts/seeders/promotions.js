/**
 * Starter promotions — ported from the Techaven Promotions CMS starter set
 * (techaven_CMS/src/seed/default-promotions.ts), plus commerce-backed rails that the
 * CMS could not seed without synced references (here we link v2 catalogue devices/shops).
 *
 * Idempotent upsert keyed by slug. Records whose `notes` is empty or equals STARTER_MARKER
 * are owned by the seeder and get refreshed; once marketing edits `notes` to anything else
 * the record is left alone on later runs.
 */
import db from '../../models/index.js';
import * as PromotionService from '../../services/promotionService.js';

export const STARTER_MARKER = 'starter-owned:v2';

const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=84&w=1600`;

/** Editorial starter set (no commerce references required). */
export const STARTER_PROMOTIONS = [
  {
    internalName: 'Starter — Home marketplace hero',
    slug: 'starter-home-marketplace-hero',
    headline: 'Every electronics shop in one place.',
    subheadline:
      'Phones, laptops, audio and home electronics from verified Malawian shops, with comparison, trade-in and buyer protection built in.',
    placement: 'home_hero',
    layout: 'hero',
    presentation: 'product_led',
    imagePosition: 'right',
    theme: 'brand_soft',
    ctaLabel: 'View all products',
    targetType: 'internal_path',
    targetValue: '/products',
    secondaryCtaLabel: 'Shop the deals',
    secondaryTargetType: 'deals',
    secondaryTargetValue: '/deals',
    priority: 80,
    imageUrl: image('photo-1498049794561-7780e7231661')
  },
  {
    internalName: 'Starter — Compare page hero',
    slug: 'starter-compare-devices',
    headline: 'Compare the details that matter.',
    subheadline: 'Put two to four phones side by side and see exactly what changes.',
    placement: 'compare_hero',
    layout: 'hero',
    presentation: 'dark_editorial',
    theme: 'dark',
    ctaLabel: 'Compare phones',
    targetType: 'compare',
    targetValue: '/compare',
    priority: 60,
    imageUrl: image('photo-1523206489230-c012c64b2b48')
  },
  {
    internalName: 'Starter — Shop local specialists',
    slug: 'starter-shop-local-specialists',
    headline: 'Shop with people who know their tech.',
    subheadline: 'Discover specialist storefronts, live listings and clear shop information.',
    placement: 'home_banner_1',
    layout: 'split',
    presentation: 'image_top',
    slotGroup: 'home-upgrade-pair',
    groupOrder: 1,
    theme: 'brand_soft',
    ctaLabel: 'Browse shops',
    targetType: 'internal_path',
    targetValue: '/shops',
    priority: 70,
    imageUrl: image('photo-1550009158-9ebf69173e03')
  },
  {
    internalName: 'Starter — Work and study setup',
    slug: 'starter-trade-in',
    headline: 'Build a setup that works as hard as you do.',
    subheadline: 'Find laptops, audio and accessories for study, work and everything between.',
    placement: 'home_banner_1',
    layout: 'split',
    presentation: 'image_top',
    slotGroup: 'home-upgrade-pair',
    groupOrder: 2,
    theme: 'neutral',
    ctaLabel: 'Browse all products',
    targetType: 'internal_path',
    targetValue: '/products',
    priority: 69,
    imageUrl: image('photo-1601784551446-20c9e07cdbdb')
  },
  {
    internalName: 'Starter — Student savings',
    slug: 'starter-student-savings',
    headline: 'Set up for the new term.',
    subheadline: 'Browse practical tech for study, work and everything between.',
    placement: 'home_banner_2',
    layout: 'card_rail',
    presentation: 'image_top',
    slotGroup: 'home-ways-to-save',
    groupOrder: 1,
    theme: 'brand_soft',
    ctaLabel: 'Browse laptops',
    targetType: 'category',
    targetValue: 'laptops',
    priority: 55,
    imageUrl: image('photo-1496181133206-80ce9b88a853')
  },
  {
    internalName: 'Starter — Audio offers',
    slug: 'starter-audio-offers',
    headline: 'Better sound for less.',
    subheadline: 'Headphones and speakers from shops across Techaven.',
    placement: 'home_banner_2',
    layout: 'card_rail',
    presentation: 'image_top',
    slotGroup: 'home-ways-to-save',
    groupOrder: 2,
    theme: 'neutral',
    ctaLabel: 'Browse audio',
    targetType: 'category',
    targetValue: 'audio',
    priority: 54,
    imageUrl: image('photo-1505740420928-5e560c06d30e')
  },
  {
    internalName: 'Starter — Shop the mall',
    slug: 'starter-shop-the-mall',
    headline: 'Find a shop that knows your tech.',
    subheadline: 'Browse specialist storefronts and their live listings.',
    placement: 'home_banner_2',
    layout: 'card_rail',
    presentation: 'image_top',
    slotGroup: 'home-ways-to-save',
    groupOrder: 3,
    theme: 'light',
    ctaLabel: 'Browse shops',
    targetType: 'internal_path',
    targetValue: '/shops',
    priority: 53,
    imageUrl: image('photo-1550009158-9ebf69173e03')
  },
  {
    internalName: 'Starter — Shopping support',
    slug: 'starter-service-trade-in',
    headline: 'Get help before and after you buy.',
    subheadline: 'Understand delivery, warranties and buyer protection in one place.',
    placement: 'home_inline_1',
    layout: 'service_grid',
    presentation: 'image_top',
    slotGroup: 'home-services',
    groupOrder: 1,
    theme: 'brand_soft',
    ctaLabel: 'Visit help centre',
    targetType: 'internal_path',
    targetValue: '/help',
    priority: 50,
    imageUrl: image('photo-1601784551446-20c9e07cdbdb')
  },
  {
    internalName: 'Starter — Buyer protection',
    slug: 'starter-service-protection',
    headline: 'Shop with buyer protection.',
    subheadline: 'Clear shop information and a checkout designed around trust.',
    placement: 'home_inline_1',
    layout: 'service_grid',
    presentation: 'image_top',
    slotGroup: 'home-services',
    groupOrder: 2,
    theme: 'neutral',
    ctaLabel: 'How Techaven works',
    targetType: 'internal_path',
    targetValue: '/help',
    priority: 49,
    imageUrl: image('photo-1563013544-824ae1b704d3')
  },
  {
    internalName: 'Starter — Delivery',
    slug: 'starter-service-delivery',
    headline: 'Delivery that fits the shop.',
    subheadline: 'See delivery and collection choices before you complete checkout.',
    placement: 'home_inline_1',
    layout: 'service_grid',
    presentation: 'image_top',
    slotGroup: 'home-services',
    groupOrder: 3,
    theme: 'light',
    ctaLabel: 'Browse products',
    targetType: 'internal_path',
    targetValue: '/products',
    priority: 48,
    imageUrl: image('photo-1580674285054-bed31e145f59')
  },
  {
    internalName: 'Starter — Category discovery',
    slug: 'starter-category-trade-in',
    headline: 'More choice from specialist shops',
    subheadline: 'Explore live listings and find the model that fits how you use it.',
    placement: 'category_inline_2',
    layout: 'banner',
    presentation: 'image_right',
    theme: 'brand_soft',
    ctaLabel: 'Browse products',
    targetType: 'internal_path',
    targetValue: '/products',
    priority: 50,
    imageUrl: image('photo-1601784551446-20c9e07cdbdb')
  },
  {
    internalName: 'Starter — Deals hero',
    slug: 'starter-deals-hero',
    headline: 'Hot sales & special offers',
    subheadline: 'Current offers from live Techaven shop listings.',
    placement: 'deals_hero',
    layout: 'lifestyle_banner',
    presentation: 'background_image',
    imagePosition: 'background',
    theme: 'dark',
    targetType: 'none',
    priority: 50,
    imageUrl: image('photo-1607083206968-13611e3d76db')
  },
  {
    internalName: 'Starter — Header delivery notice',
    slug: 'starter-header-delivery',
    headline: 'Free delivery on orders over MWK 900,000',
    placement: 'site_announcement',
    layout: 'announcement',
    presentation: 'compact',
    theme: 'dark',
    ctaLabel: "See this week's deals",
    targetType: 'deals',
    targetValue: '/deals',
    priority: 50
  },
  {
    internalName: 'Starter — Mega menu discovery',
    slug: 'starter-mega-menu-compare',
    headline: 'Fresh technology from shops across Techaven',
    subheadline: 'Browse live listings from specialist electronics stores.',
    placement: 'header_mega_menu',
    layout: 'announcement',
    presentation: 'compact',
    theme: 'brand_soft',
    ctaLabel: 'Explore products',
    targetType: 'internal_path',
    targetValue: '/products',
    priority: 50,
    imageUrl: image('photo-1523206489230-c012c64b2b48')
  },
  {
    internalName: 'Starter — Categories hero',
    slug: 'starter-categories-hero',
    headline: 'Find technology for every part of your day.',
    subheadline: 'Browse phones, laptops, gaming, audio, wearables and home electronics from Techaven shops.',
    placement: 'categories_hero',
    layout: 'hero',
    presentation: 'lifestyle',
    imagePosition: 'right',
    theme: 'neutral',
    ctaLabel: 'See all categories',
    targetType: 'internal_path',
    targetValue: '/categories',
    priority: 60,
    imageUrl: image('photo-1498049794561-7780e7231661')
  },
  {
    internalName: 'Starter — Products hero',
    slug: 'starter-products-hero',
    headline: 'One marketplace. More ways to find the right device.',
    subheadline: 'Browse live electronics listings from shops across Techaven.',
    placement: 'products_hero',
    layout: 'hero',
    presentation: 'product_led',
    imagePosition: 'right',
    theme: 'brand_soft',
    ctaLabel: 'See current deals',
    targetType: 'deals',
    targetValue: '/deals',
    priority: 60,
    imageUrl: image('photo-1517336714731-489689fd1ca8')
  },
  {
    internalName: 'Starter — Shops hero',
    slug: 'starter-shops-hero',
    headline: 'Meet the shops behind the technology.',
    subheadline: 'Browse specialist storefronts, compare their live listings and choose how you want to shop.',
    placement: 'shops_hero',
    layout: 'hero',
    presentation: 'lifestyle',
    imagePosition: 'right',
    theme: 'brand_soft',
    ctaLabel: 'Browse all shops',
    targetType: 'internal_path',
    targetValue: '/shops',
    priority: 60,
    imageUrl: image('photo-1550009158-9ebf69173e03')
  },
  {
    internalName: 'Starter — Catalogs hero',
    slug: 'starter-catalogs-hero',
    headline: 'Collections built around how you live.',
    subheadline: 'Explore practical combinations for study, work, entertainment and everyday upgrades.',
    placement: 'catalogs_hero',
    layout: 'hero',
    presentation: 'dark_editorial',
    imagePosition: 'right',
    theme: 'dark',
    ctaLabel: 'Browse collections',
    targetType: 'internal_path',
    targetValue: '/catalogs',
    priority: 60,
    imageUrl: image('photo-1496181133206-80ce9b88a853')
  },
  {
    internalName: 'Starter — Trade-in hero',
    slug: 'starter-trade-in-hero',
    headline: 'Give your old device another life.',
    subheadline: 'See the trade-in path offered by participating Techaven shops before your next upgrade.',
    placement: 'trade_in_hero',
    layout: 'hero',
    presentation: 'lifestyle',
    imagePosition: 'right',
    theme: 'brand_soft',
    ctaLabel: 'Browse upgrade options',
    targetType: 'deals',
    targetValue: '/deals',
    priority: 60,
    imageUrl: image('photo-1601784551446-20c9e07cdbdb')
  },
  {
    internalName: 'Starter — Help hero',
    slug: 'starter-help-hero',
    headline: 'Clear answers for a more confident purchase.',
    subheadline: 'Learn about delivery, collection, warranties, buyer protection and shopping across Techaven.',
    placement: 'help_hero',
    layout: 'hero',
    presentation: 'lifestyle',
    imagePosition: 'right',
    theme: 'neutral',
    ctaLabel: 'Browse shops',
    targetType: 'internal_path',
    targetValue: '/shops',
    priority: 60,
    imageUrl: image('photo-1563013544-824ae1b704d3')
  },
  {
    internalName: 'Starter — Search hero',
    slug: 'starter-search-hero',
    headline: 'Search every Techaven shop at once.',
    subheadline: 'Find products across live listings without visiting each storefront separately.',
    placement: 'search_hero',
    layout: 'hero',
    presentation: 'product_led',
    imagePosition: 'right',
    theme: 'neutral',
    ctaLabel: 'Browse all products',
    targetType: 'internal_path',
    targetValue: '/products',
    priority: 60,
    imageUrl: image('photo-1523275335684-37898b6baf30')
  },
  {
    internalName: 'Starter — Welcome coupon',
    slug: 'starter-welcome-coupon',
    eyebrow: 'New to Techaven?',
    headline: 'Your first order, made simpler.',
    subheadline: 'Follow these steps at checkout.',
    placement: 'deals_inline_1',
    layout: 'coupon',
    presentation: 'standard',
    theme: 'brand',
    instructionOne: 'Add any eligible product to your cart.',
    instructionTwo: 'Choose a courier and payment method at checkout.',
    instructionThree: 'Confirm delivery to release payment to the shop.',
    finePrint: 'Payments are held in escrow until you confirm delivery.',
    ctaLabel: 'Start shopping',
    targetType: 'internal_path',
    targetValue: '/products',
    priority: 50
  }
];

/**
 * Rails that link real catalogue devices/shops from this database. Built at seed time and
 * only emitted when enough purchasable devices / active shops exist (skipped on an empty catalogue).
 */
function commerceStarters({ devices, shopIds }) {
  const out = [];
  const now = new Date();
  const deviceIds = devices.map((d) => d.id);
  if (deviceIds.length >= 2) {
    out.push({
      internalName: 'Starter — Home featured products rail',
      slug: 'starter-home-product-rail',
      eyebrow: 'Trending now',
      headline: 'Popular devices this week',
      subheadline: 'Live listings from verified Techaven shops.',
      placement: 'home_product_rail_1',
      layout: 'product_rail',
      presentation: 'standard',
      theme: 'light',
      ctaLabel: 'View all products',
      targetType: 'internal_path',
      targetValue: '/products',
      priority: 60,
      deviceIds: deviceIds.slice(0, 8)
    });
    out.push({
      internalName: 'Starter — Flash deals',
      slug: 'starter-flash-deals',
      eyebrow: 'Limited time',
      headline: 'Flash deals',
      subheadline: 'Grab these before the timer runs out.',
      placement: 'deals_inline_1',
      layout: 'flash_deals',
      presentation: 'standard',
      theme: 'dark',
      showCountdown: true,
      startsAt: now.toISOString(),
      endsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      ctaLabel: 'See all deals',
      targetType: 'deals',
      targetValue: '/deals',
      priority: 70,
      deviceIds: deviceIds.slice(0, 6)
    });
    out.push({
      internalName: 'Starter — Product inline hero',
      slug: 'starter-product-spotlight',
      eyebrow: 'Spotlight',
      headline: 'A closer look at a shopper favourite.',
      placement: 'product_inline_1',
      layout: 'hero_product',
      presentation: 'product_led',
      theme: 'brand_soft',
      ctaLabel: 'View product',
      targetType: 'product',
      targetValue: devices[0].slug, // storefront product pages are /product/<device slug>
      anchorDeviceId: deviceIds[0],
      secondaryDeviceIds: deviceIds.slice(1, 4),
      priority: 50
    });
  }
  if (shopIds.length >= 2) {
    out.push({
      internalName: 'Starter — Home shop rail',
      slug: 'starter-home-shop-rail',
      eyebrow: 'Verified sellers',
      headline: 'Shops people trust',
      subheadline: 'Specialist electronics stores across Malawi.',
      placement: 'home_shop_rail',
      layout: 'shop_rail',
      presentation: 'standard',
      theme: 'neutral',
      ctaLabel: 'Browse all shops',
      targetType: 'internal_path',
      targetValue: '/shops',
      priority: 55,
      shopIds: shopIds.slice(0, 8)
    });
  }
  return out;
}

function toServiceInput({ imageUrl, ...source }) {
  const data = { ...source, notes: STARTER_MARKER, status: 'published' };
  if (imageUrl) data.desktopBackground = { url: imageUrl, alt: source.headline };
  return data;
}

/**
 * Upsert starter promotions. Returns counts.
 * @param {{ log?: (msg: string) => void }} [opts]
 */
export async function seedPromotions({ log = console.log } = {}) {
  const { Promotion, Shop, sequelize } = db;

  // Devices the storefront can actually render: active, with at least one in-stock active listing.
  const [devices] = await sequelize.query(
    `SELECT d.id, d.slug
       FROM devices d
       JOIN device_variants v ON v.device_id = d.id AND v.is_active = 1
       JOIN seller_listings l ON l.device_variant_id = v.id AND l.status = 'active' AND l.quantity > 0
      WHERE d.is_active = 1
      GROUP BY d.id, d.slug
      ORDER BY MAX(l.published_at) DESC, d.id ASC
      LIMIT 12`
  );
  if (devices.length < 2) {
    log('       ℹ️  Fewer than 2 purchasable catalogue devices — device rails/flash deals/spotlight skipped.');
  }
  const shops = await Shop.findAll({
    attributes: ['id'],
    where: { status: 'active', application_status: 'approved' },
    order: [['id', 'ASC']],
    limit: 8
  });

  const all = [
    ...STARTER_PROMOTIONS,
    ...commerceStarters({ devices, shopIds: shops.map((s) => s.id) })
  ];

  const counts = { created: 0, updated: 0, skipped: 0, failed: 0, total: all.length };
  for (const source of all) {
    try {
      const existing = await Promotion.findOne({ where: { slug: source.slug }, attributes: ['id', 'notes'] });
      if (existing?.notes && existing.notes !== STARTER_MARKER) {
        counts.skipped++;
        continue;
      }
      const input = toServiceInput(source);
      if (existing) {
        delete input.slug;
        await PromotionService.updatePromotion(existing.id, input);
        counts.updated++;
      } else {
        await PromotionService.createPromotion(input);
        counts.created++;
      }
    } catch (error) {
      counts.failed++;
      const detail = error.errors ? JSON.stringify(error.errors) : error.message;
      log(`       ⚠️  ${source.slug}: ${detail}`);
    }
  }
  log(
    `       ✅ Promotions: ${counts.created} created, ${counts.updated} updated, ` +
      `${counts.skipped} skipped (marketing-owned), ${counts.failed} failed — ${counts.total} total.`
  );
  return counts;
}
