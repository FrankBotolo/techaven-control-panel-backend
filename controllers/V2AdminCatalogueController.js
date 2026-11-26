import db from '../models/index.js';
import { canonicalVariantKey, slugify } from '../services/catalogue/normalization.js';
import { CatalogueError, sendCatalogueError } from '../services/catalogue/errors.js';
import { enqueueBrandDevices, enqueueDevice } from '../services/catalogue/promotionSync.js';
import { Op } from 'sequelize';
import { cached, invalidate } from '../utils/ttlCache.js';

const { Brand, Category, Device, DeviceVariant, Color, DeviceVariantColor, DeviceMedia, sequelize } = db;

const ok = (res, message, data, status = 200) => res.status(status).json({ success: true, message, data });

export async function listBrands(req, res) {
  try { return ok(res, 'Brands retrieved', await Brand.findAll({ order: [['name', 'ASC']] })); }
  catch (error) { return sendCatalogueError(res, error); }
}

export async function createBrand(req, res) {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) throw new CatalogueError('INVALID_BRAND', 'name is required');
    const brand = await Brand.create({ name, slug: slugify(req.body.slug || name), is_active: req.body.is_active !== false });
    invalidate('catalogue:');
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
    invalidate('catalogue:');
    await enqueueBrandDevices(brand.id, { reason: `brand-update:${brand.updatedAt.toISOString()}` });
    return ok(res, 'Brand updated', brand);
  } catch (error) { return sendCatalogueError(res, error); }
}

/** Paging is opt-in so older clients keep the full list; any of these parameters switches it on. */
const pagedRequest = (query) => ['page', 'limit', 'search', 'brand_id'].some((key) => query[key] !== undefined);
const pageParams = (query, fallback = 50) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || fallback, 1), 200);
  return { page, limit, offset: (page - 1) * limit };
};
const pageInfo = (page, limit, total) => ({ page, limit, total, total_pages: Math.ceil(total / limit), has_more: page * limit < total });
// Large JSON blobs are not needed for list views (54k+ devices made the full list ~87 MB).
const DEVICE_LIST_FIELDS = ['id', 'name', 'slug', 'brand_id', 'category_id', 'soc', 'os_family', 'release_date', 'verification_status', 'is_active', 'primary_image_url', 'createdAt', 'updatedAt'];

export async function listDevices(req, res) {
  try {
    if (!pagedRequest(req.query)) {
      return ok(res, 'Devices retrieved', await Device.findAll({ include: [{ model: Brand, as: 'brand' }, { model: Category, as: 'category' }], order: [['id', 'DESC']] }));
    }
    const { page, limit, offset } = pageParams(req.query);
    const where = {};
    // Brands (~200) and global categories are tiny: keep them in memory and attach them to the
    // page in JS. Joining them per row stopped MySQL using the name index (12 ms -> 400+ ms).
    const [brands, categories] = await Promise.all([
      cached('catalogue:admin-brands', 60_000, () => Brand.findAll({ attributes: ['id', 'name', 'slug', 'is_active'], raw: true })),
      cached('catalogue:admin-categories', 60_000, () => Category.findAll({ attributes: ['id', 'name'], raw: true }))
    ]);
    const search = String(req.query.search || '').trim().slice(0, 100);
    if (search) {
      // Every word must match the device name/slug or its brand ("samsung a55" finds Galaxy A55).
      const words = search.split(/\s+/).filter(Boolean).slice(0, 5);
      where[Op.and] = words.map((word) => {
        const brandIds = brands.filter((brand) => brand.name.toLowerCase().includes(word.toLowerCase())).map((brand) => brand.id);
        return { [Op.or]: [
          { name: { [Op.like]: `%${word}%` } },
          { slug: { [Op.like]: `%${word}%` } },
          ...(brandIds.length ? [{ brand_id: brandIds }] : [])
        ] };
      });
    }
    if (req.query.brand_id) where.brand_id = Number(req.query.brand_id) || 0;
    const countKey = `catalogue:admin-device-count:${search}:${req.query.brand_id || ''}`;
    // Sorted by name over the (name, id) index: page 200 costs about as much as page 1.
    // Deferred join: page through ids only (covered by the index), then load just those rows.
    const [pageIds, count] = await Promise.all([
      Device.findAll({ where, attributes: ['id'], order: [['name', 'ASC'], ['id', 'ASC']], limit, offset, raw: true }),
      cached(countKey, 30_000, () => Device.count({ where }))
    ]);
    const ids = pageIds.map((row) => row.id);
    const byId = new Map((ids.length ? await Device.findAll({ where: { id: ids }, attributes: DEVICE_LIST_FIELDS, raw: true }) : []).map((row) => [row.id, row]));
    const found = ids.map((id) => byId.get(id)).filter(Boolean);
    const brandById = new Map(brands.map((brand) => [brand.id, brand]));
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const rows = found.map((device) => ({
      ...device,
      is_active: Boolean(device.is_active),
      brand: brandById.get(device.brand_id) ? { ...brandById.get(device.brand_id), is_active: Boolean(brandById.get(device.brand_id).is_active) } : null,
      category: categoryById.get(device.category_id) ?? null
    }));
    return ok(res, 'Devices retrieved', { devices: rows, pagination: pageInfo(page, limit, count) });
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
    invalidate('catalogue:');
    await enqueueDevice(device.id, { reason: `device-create:${device.updatedAt.toISOString()}` });
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
    invalidate('catalogue:');
    await enqueueDevice(device.id, { reason: `device-update:${device.updatedAt.toISOString()}` });
    return ok(res, 'Device updated', device);
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function listVariants(req, res) {
  try {
    const where = req.query.device_id ? { device_id: req.query.device_id } : {};
    // Without a device or paging, the full list is 100k+ variants (~200 MB); page it on request.
    if (!req.query.device_id && (req.query.page !== undefined || req.query.limit !== undefined)) {
      const { page, limit, offset } = pageParams(req.query, 100);
      const { rows, count } = await DeviceVariant.findAndCountAll({ where, include: [{ model: Device, as: 'device', attributes: ['id', 'name', 'slug', 'brand_id'] }], order: [['id', 'DESC']], limit, offset });
      return ok(res, 'Variants retrieved', { variants: rows, pagination: pageInfo(page, limit, count) });
    }
    return ok(res, 'Variants retrieved', await DeviceVariant.findAll({ where, include: [{ model: Device, as: 'device' }], order: [['id', 'DESC']] }));
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function createVariant(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const device = await Device.findByPk(req.body.device_id, { transaction });
    if (!device) throw new CatalogueError('DEVICE_NOT_FOUND', 'Device not found', 404);
    const canonical_key = canonicalVariantKey(device.slug, req.body);
    const variant = await DeviceVariant.create({ ...req.body, canonical_key }, { transaction });
    await enqueueDevice(device.id, { transaction, reason: `variant-create:${variant.id}:${variant.updatedAt.toISOString()}` });
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
    await enqueueDevice(variant.device_id, { reason: `variant-update:${variant.id}:${variant.updatedAt.toISOString()}` });
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

export async function listColors(req, res) {
  try { return ok(res, 'Colors retrieved', await Color.findAll({ order: [['name', 'ASC']] })); }
  catch (error) { return sendCatalogueError(res, error); }
}

export async function updateColor(req, res) {
  try {
    const color = await Color.findByPk(req.params.id);
    if (!color) throw new CatalogueError('COLOR_NOT_FOUND', 'Color not found', 404);
    if (req.body.name !== undefined) color.name = req.body.name;
    if (req.body.slug !== undefined) color.slug = slugify(req.body.slug);
    if (req.body.default_hex !== undefined) color.default_hex = req.body.default_hex || null;
    await color.save();
    return ok(res, 'Color updated', color);
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

export async function listMedia(req, res) {
  try {
    const where = req.query.device_id ? { device_id: req.query.device_id } : {};
    if (req.query.page !== undefined || req.query.limit !== undefined) {
      const { page, limit, offset } = pageParams(req.query, 100);
      const { rows, count } = await DeviceMedia.findAndCountAll({ where, order: [['sort_order', 'ASC'], ['id', 'ASC']], limit, offset });
      return ok(res, 'Media retrieved', { media: rows, pagination: pageInfo(page, limit, count) });
    }
    return ok(res, 'Media retrieved', await DeviceMedia.findAll({ where, order: [['sort_order', 'ASC'], ['id', 'ASC']] }));
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function updateMedia(req, res) {
  try {
    const media = await DeviceMedia.findByPk(req.params.id);
    if (!media) throw new CatalogueError('MEDIA_NOT_FOUND', 'Media not found', 404);
    for (const field of ['url', 'storage_key', 'media_type', 'sort_order', 'is_primary', 'source', 'device_variant_id', 'device_variant_color_id']) if (req.body[field] !== undefined) media[field] = req.body[field];
    await media.save();
    return ok(res, 'Media updated', media);
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function deactivate(req, res) {
  try {
    const models = { brands: Brand, devices: Device, variants: DeviceVariant };
    const model = models[req.params.resource];
    if (!model) throw new CatalogueError('INVALID_CATALOGUE_RESOURCE', 'Resource cannot be deactivated');
    const record = await model.findByPk(req.params.id);
    if (!record) throw new CatalogueError('CATALOGUE_RECORD_NOT_FOUND', 'Catalogue record not found', 404);
    record.is_active = false;
    await record.save();
    invalidate('catalogue:');
    if (req.params.resource === 'devices') await enqueueDevice(record.id, { reason: `device-deactivate:${record.updatedAt.toISOString()}` });
    if (req.params.resource === 'variants') await enqueueDevice(record.device_id, { reason: `variant-deactivate:${record.id}:${record.updatedAt.toISOString()}` });
    if (req.params.resource === 'brands') await enqueueBrandDevices(record.id, { reason: `brand-deactivate:${record.updatedAt.toISOString()}` });
    return ok(res, 'Catalogue record deactivated', record);
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function deleteColorAssignment(req, res) {
  try {
    const removed = await DeviceVariantColor.destroy({ where: { id: req.params.assignmentId, device_variant_id: req.params.id } });
    if (!removed) throw new CatalogueError('COLOR_ASSIGNMENT_NOT_FOUND', 'Color assignment not found', 404);
    return ok(res, 'Color assignment removed', null);
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function deleteMedia(req, res) {
  try {
    const removed = await DeviceMedia.destroy({ where: { id: req.params.id } });
    if (!removed) throw new CatalogueError('MEDIA_NOT_FOUND', 'Media not found', 404);
    return ok(res, 'Media removed', null);
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function deleteColor(req, res) {
  try {
    const removed = await Color.destroy({ where: { id: req.params.id } });
    if (!removed) throw new CatalogueError('COLOR_NOT_FOUND', 'Color not found', 404);
    return ok(res, 'Color removed', null);
  } catch (error) { return sendCatalogueError(res, error); }
}
