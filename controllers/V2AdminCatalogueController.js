import db from '../models/index.js';
import { canonicalVariantKey, slugify } from '../services/catalogue/normalization.js';
import { CatalogueError, sendCatalogueError } from '../services/catalogue/errors.js';

const { Brand, Category, Device, DeviceVariant, Color, DeviceVariantColor, DeviceMedia, sequelize } = db;

const ok = (res, message, data, status = 200) => res.status(status).json({ success: true, message, data });

export async function createBrand(req, res) {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) throw new CatalogueError('INVALID_BRAND', 'name is required');
    const brand = await Brand.create({ name, slug: slugify(req.body.slug || name), is_active: req.body.is_active !== false });
    return ok(res, 'Brand created', brand, 201);
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function updateBrand(req, res) {
  try {
    const brand = await Brand.findByPk(req.params.id);
    if (!brand) throw new CatalogueError('BRAND_NOT_FOUND', 'Brand not found', 404);
    for (const field of ['name', 'is_active']) if (req.body[field] !== undefined) brand[field] = req.body[field];
    if (req.body.slug !== undefined) brand.slug = slugify(req.body.slug);
    await brand.save();
    return ok(res, 'Brand updated', brand);
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function createDevice(req, res) {
  try {
    const { brand_id, category_id, name } = req.body;
    if (!brand_id || !category_id || !name) throw new CatalogueError('INVALID_DEVICE', 'brand_id, category_id and name are required');
    const [brand, category] = await Promise.all([Brand.findByPk(brand_id), Category.findByPk(category_id)]);
    if (!brand) throw new CatalogueError('BRAND_NOT_FOUND', 'Brand not found', 404);
    if (!category || category.shop_id !== null || category.status !== 'approved') throw new CatalogueError('CATEGORY_NOT_FOUND', 'Approved global category not found', 404);
    const device = await Device.create({ ...req.body, slug: slugify(req.body.slug || name) });
    return ok(res, 'Device created', device, 201);
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function updateDevice(req, res) {
  try {
    const device = await Device.findByPk(req.params.id);
    if (!device) throw new CatalogueError('DEVICE_NOT_FOUND', 'Device not found', 404);
    const allowed = ['name', 'release_date', 'soc', 'battery_mah', 'os_family', 'verification_status', 'specs', 'source_metadata', 'primary_image_url', 'is_active'];
    for (const field of allowed) if (req.body[field] !== undefined) device[field] = req.body[field];
    if (req.body.slug !== undefined) device.slug = slugify(req.body.slug);
    await device.save();
    return ok(res, 'Device updated', device);
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function createVariant(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const device = await Device.findByPk(req.body.device_id, { transaction });
    if (!device) throw new CatalogueError('DEVICE_NOT_FOUND', 'Device not found', 404);
    const canonical_key = canonicalVariantKey(device.slug, req.body);
    const variant = await DeviceVariant.create({ ...req.body, canonical_key }, { transaction });
    await transaction.commit();
    return ok(res, 'Variant created', variant, 201);
  } catch (error) {
    await transaction.rollback();
    if (error.name === 'SequelizeUniqueConstraintError') return sendCatalogueError(res, new CatalogueError('DUPLICATE_VARIANT', 'Canonical variant already exists', 409));
    return sendCatalogueError(res, error);
  }
}

export async function updateVariant(req, res) {
  try {
    const variant = await DeviceVariant.findByPk(req.params.id, { include: [{ model: Device, as: 'device' }] });
    if (!variant) throw new CatalogueError('VARIANT_NOT_FOUND', 'Variant not found', 404);
    const allowed = ['model_number', 'ram_gb', 'storage_gb', 'network_generation', 'region', 'sim_type', 'attributes', 'source_metadata', 'verification_status', 'is_active'];
    for (const field of allowed) if (req.body[field] !== undefined) variant[field] = req.body[field];
    variant.canonical_key = canonicalVariantKey(variant.device.slug, variant);
    await variant.save();
    return ok(res, 'Variant updated', variant);
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function createColor(req, res) {
  try {
    if (!req.body.name) throw new CatalogueError('INVALID_COLOR', 'name is required');
    const color = await Color.create({ name: req.body.name, slug: slugify(req.body.slug || req.body.name), default_hex: req.body.default_hex || null });
    return ok(res, 'Color created', color, 201);
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function assignColor(req, res) {
  try {
    const [variant, color] = await Promise.all([DeviceVariant.findByPk(req.params.id), Color.findByPk(req.body.color_id)]);
    if (!variant) throw new CatalogueError('VARIANT_NOT_FOUND', 'Variant not found', 404);
    if (!color) throw new CatalogueError('COLOR_NOT_FOUND', 'Color not found', 404);
    const manufacturerName = req.body.manufacturer_name || color.name;
    const assignment = await DeviceVariantColor.create({ device_variant_id: variant.id, color_id: color.id, manufacturer_name: manufacturerName, slug: slugify(req.body.slug || manufacturerName), hex_override: req.body.hex_override || null, verified: !!req.body.verified });
    return ok(res, 'Color assigned', assignment, 201);
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function createMedia(req, res) {
  try {
    if (!req.body.device_id || !req.body.url) throw new CatalogueError('INVALID_MEDIA', 'device_id and url are required');
    const media = await DeviceMedia.create(req.body);
    return ok(res, 'Media created', media, 201);
  } catch (error) { return sendCatalogueError(res, error); }
}
