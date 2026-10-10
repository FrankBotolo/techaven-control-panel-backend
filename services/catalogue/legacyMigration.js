import db from '../../models/index.js';
import { bestLegacyCandidate } from './legacyMatcher.js';

const { Product, DeviceVariant, Device, Brand, LegacyProductCatalogueLink, SellerListing, ListingImage, sequelize } = db;

export async function createListingFromLegacy(product, variantId, transaction) {
  if (!product.shop_id) throw new Error('Legacy product has no shop');
  const [listing] = await SellerListing.findOrCreate({
    where: { active_identity: `${product.shop_id}:${variantId}:0:new` },
    defaults: { shop_id: product.shop_id, device_variant_id: variantId, condition: 'new', currency: 'MWK', price: product.price, quantity: Math.max(Number(product.stock) || 0, 0), status: 'active' },
    transaction
  });
  const urls = Array.isArray(product.images) && product.images.length ? product.images : product.image ? [product.image] : [];
  if (urls.length && await ListingImage.count({ where: { listing_id: listing.id }, transaction }) === 0) {
    await ListingImage.bulkCreate(urls.map((url, index) => ({ listing_id: listing.id, url, sort_order: index, is_primary: index === 0 })), { transaction });
  }
  return listing;
}

export async function migrateLegacyProducts({ dryRun = false, limit = 100 } = {}) {
  const variants = await DeviceVariant.findAll({ include: [{ model: Device, as: 'device', include: [{ model: Brand, as: 'brand' }] }] });
  const products = await Product.findAll({ limit, order: [['id', 'ASC']] });
  const report = { scanned: products.length, confirmed: 0, candidates: 0, unmatched: 0, errors: [] };
  for (const product of products) {
    const match = bestLegacyCandidate(product.get({ plain: true }), variants.map((item) => item.get({ plain: true })));
    const status = match.highConfidence ? 'confirmed' : match.best ? 'candidate' : 'unmatched';
    report[status === 'confirmed' ? 'confirmed' : status === 'candidate' ? 'candidates' : 'unmatched'] += 1;
    if (dryRun) continue;
    const transaction = await sequelize.transaction();
    try {
      let listing = null;
      if (match.highConfidence) listing = await createListingFromLegacy(product, match.best.variant.id, transaction);
      await LegacyProductCatalogueLink.upsert({ product_id: product.id, candidate_variant_id: match.best?.variant.id || null, seller_listing_id: listing?.id || null, match_status: status, confidence: match.best?.score || null, match_report: { evidence: match.best?.evidence || [], alternatives: match.alternatives } }, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      report.errors.push({ product_id: product.id, message: error.message });
    }
  }
  return report;
}
