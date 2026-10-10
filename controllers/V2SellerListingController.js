import db from '../models/index.js';
import { CatalogueError, sendCatalogueError } from '../services/catalogue/errors.js';
import { validateListingInput } from '../services/marketplace/listings.js';

const { SellerListing, ListingImage, DeviceVariant, DeviceVariantColor, Device, Brand, Shop, sequelize } = db;
const include = [
  { model: ListingImage, as: 'images' },
  { model: DeviceVariant, as: 'variant', include: [{ model: Device, as: 'device', include: [{ model: Brand, as: 'brand' }] }] },
  { model: DeviceVariantColor, as: 'variant_color' },
  { model: Shop, as: 'shop', attributes: ['id', 'name'] }
];

async function validatedVariant(variantId, colorId, transaction) {
  const variant = await DeviceVariant.findByPk(variantId, { transaction });
  if (!variant) throw new CatalogueError('VARIANT_NOT_FOUND', 'Variant not found', 404);
  if (!variant.is_active) throw new CatalogueError('VARIANT_INACTIVE', 'Variant is inactive', 409);
  if (colorId != null) {
    const color = await DeviceVariantColor.findOne({ where: { id: colorId, device_variant_id: variant.id }, transaction });
    if (!color) throw new CatalogueError('COLOR_NOT_AVAILABLE_FOR_VARIANT', 'Color is not available for this variant', 400);
  }
  return variant;
}

export async function list(req, res) {
  try {
    const listings = await SellerListing.findAll({ where: { shop_id: req.params.shopId }, include, order: [['id', 'DESC']] });
    return res.json({ success: true, message: 'Listings retrieved', data: listings });
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function getOne(req, res) {
  try {
    const listing = await SellerListing.findOne({ where: { id: req.params.id, shop_id: req.params.shopId }, include });
    if (!listing) throw new CatalogueError('LISTING_NOT_FOUND', 'Listing not found', 404);
    return res.json({ success: true, message: 'Listing retrieved', data: listing });
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function create(req, res) {
  const transaction = await sequelize.transaction();
  try {
    if (req.body.images !== undefined && !Array.isArray(req.body.images)) throw new CatalogueError('INVALID_LISTING_IMAGES', 'images must be an array');
    const images = Array.isArray(req.body.images) ? req.body.images : [];
    const values = validateListingInput(req.body, images.length);
    await validatedVariant(req.body.device_variant_id, req.body.device_variant_color_id, transaction);
    const listing = await SellerListing.create({ ...req.body, ...values, shop_id: Number(req.params.shopId) }, { transaction });
    if (images.length) await ListingImage.bulkCreate(images.map((image, index) => ({ ...image, listing_id: listing.id, sort_order: image.sort_order ?? index, is_primary: image.is_primary ?? index === 0 })), { transaction });
    await transaction.commit();
    const full = await SellerListing.findByPk(listing.id, { include });
    return res.status(201).json({ success: true, message: 'Listing created', data: full });
  } catch (error) {
    await transaction.rollback();
    if (error.name === 'SequelizeUniqueConstraintError') return sendCatalogueError(res, new CatalogueError('DUPLICATE_LISTING', 'An active listing or merchant SKU already exists', 409));
    return sendCatalogueError(res, error);
  }
}

export async function update(req, res) {
  const transaction = await sequelize.transaction();
  try {
    if (req.body.images !== undefined && !Array.isArray(req.body.images)) throw new CatalogueError('INVALID_LISTING_IMAGES', 'images must be an array');
    const listing = await SellerListing.findOne({ where: { id: req.params.id, shop_id: req.params.shopId }, include: [{ model: ListingImage, as: 'images' }], transaction });
    if (!listing) throw new CatalogueError('LISTING_NOT_FOUND', 'Listing not found', 404);
    const next = { ...listing.get({ plain: true }), ...req.body };
    const images = req.body.images === undefined ? listing.images : req.body.images;
    const values = validateListingInput(next, images.length);
    await validatedVariant(next.device_variant_id, next.device_variant_color_id, transaction);
    const allowed = ['device_variant_id', 'device_variant_color_id', 'merchant_sku', 'condition', 'price', 'quantity', 'currency', 'warranty_months', 'status'];
    for (const field of allowed) if (next[field] !== undefined) listing[field] = next[field];
    Object.assign(listing, values);
    await listing.save({ transaction });
    if (req.body.images !== undefined) {
      await ListingImage.destroy({ where: { listing_id: listing.id }, transaction });
      await ListingImage.bulkCreate(images.map((image, index) => ({ ...image, listing_id: listing.id, sort_order: image.sort_order ?? index, is_primary: image.is_primary ?? index === 0 })), { transaction });
    }
    await transaction.commit();
    return res.json({ success: true, message: 'Listing updated', data: await SellerListing.findByPk(listing.id, { include }) });
  } catch (error) {
    await transaction.rollback();
    if (error.name === 'SequelizeUniqueConstraintError') return sendCatalogueError(res, new CatalogueError('DUPLICATE_LISTING', 'An active listing or merchant SKU already exists', 409));
    return sendCatalogueError(res, error);
  }
}

export async function remove(req, res) {
  try {
    const listing = await SellerListing.findOne({ where: { id: req.params.id, shop_id: req.params.shopId } });
    if (!listing) throw new CatalogueError('LISTING_NOT_FOUND', 'Listing not found', 404);
    listing.status = 'archived';
    await listing.save();
    return res.json({ success: true, message: 'Listing archived', data: null });
  } catch (error) { return sendCatalogueError(res, error); }
}
