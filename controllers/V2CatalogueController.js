import { Op } from 'sequelize';
import db from '../models/index.js';
import { CatalogueError, sendCatalogueError } from '../services/catalogue/errors.js';
import { toDeviceDto, toVariantDto } from '../services/catalogue/dto.js';
import { cached } from '../utils/ttlCache.js';

const { Brand, Device, DeviceVariant, DeviceVariantColor, Color, Category, DeviceMedia } = db;
const pagination = (page, perPage, count) => ({ current_page: page, per_page: perPage, total_items: count, total_pages: Math.ceil(count / perPage), has_next: page * perPage < count, has_prev: page > 1 });

const deviceIncludes = () => [
  { model: Brand, as: 'brand', attributes: ['id', 'name', 'slug'] },
  { model: Category, as: 'category', attributes: ['id', 'name'] },
  { model: DeviceMedia, as: 'media', separate: true, order: [['sort_order', 'ASC']] },
  { model: DeviceVariant, as: 'variants', where: { is_active: true }, required: false, include: [{ model: DeviceVariantColor, as: 'colors', include: [{ model: Color, as: 'color' }] }] }
];

export async function listBrands(req, res) {
  try {
    const brands = await Brand.findAll({ where: { is_active: true }, order: [['name', 'ASC']] });
    return res.json({ success: true, message: 'Brands retrieved', data: brands });
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function listDevices(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const perPage = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const where = { is_active: true };
    if (req.query.category_id) where.category_id = req.query.category_id;
    if (req.query.search) where[Op.or] = [{ name: { [Op.like]: `%${req.query.search}%` } }, { slug: { [Op.like]: `%${req.query.search}%` } }];
    // Only devices of active brands are listed. Filtering by brand id lets MySQL read devices in
    // name order from the (is_active, name) index instead of sorting every device per request.
    const activeBrandIds = await cached('catalogue:active-brand-ids', 60_000, async () =>
      (await Brand.findAll({ where: { is_active: true }, attributes: ['id'], raw: true })).map((brand) => brand.id));
    if (req.query.brand) {
      const brand = await Brand.findOne({ where: { is_active: true, [Op.or]: [{ slug: String(req.query.brand) }, { id: Number(req.query.brand) || 0 }] }, attributes: ['id'], raw: true });
      where.brand_id = brand ? [brand.id] : [];
    } else where.brand_id = activeBrandIds;
    const countKey = `catalogue:device-count:${req.query.category_id || ''}:${req.query.brand || ''}:${req.query.search || ''}`;
    const [rows, count] = await Promise.all([
      Device.findAll({ where, include: [{ model: Brand, as: 'brand' }, { model: Category, as: 'category', attributes: ['id', 'name'] }], limit: perPage, offset: (page - 1) * perPage, order: [['name', 'ASC']] }),
      cached(countKey, 60_000, () => Device.count({ where }))
    ]);
    return res.json({ success: true, message: 'Devices retrieved', data: { devices: rows.map((row) => toDeviceDto(row)), pagination: pagination(page, perPage, count) } });
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function getDevice(req, res) {
  try {
    const device = await Device.findOne({ where: { id: req.params.id, is_active: true }, include: deviceIncludes() });
    if (!device) throw new CatalogueError('DEVICE_NOT_FOUND', 'Device not found', 404);
    return res.json({ success: true, message: 'Device retrieved', data: toDeviceDto(device) });
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function getVariants(req, res) {
  try {
    const device = await Device.findOne({ where: { id: req.params.id, is_active: true }, include: deviceIncludes() });
    if (!device) throw new CatalogueError('DEVICE_NOT_FOUND', 'Device not found', 404);
    const dto = toDeviceDto(device);
    return res.json({ success: true, message: 'Variants retrieved', data: { device: { id: dto.id, name: dto.name }, variant_axes: dto.variant_axes, variants: dto.variants } });
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function getVariant(req, res) {
  try {
    const variant = await DeviceVariant.findOne({ where: { id: req.params.id, is_active: true }, include: [{ model: Device, as: 'device', include: [{ model: Brand, as: 'brand' }] }, { model: DeviceVariantColor, as: 'colors', include: [{ model: Color, as: 'color' }] }] });
    if (!variant) throw new CatalogueError('VARIANT_NOT_FOUND', 'Variant not found', 404);
    return res.json({ success: true, message: 'Variant retrieved', data: { ...toVariantDto(variant), device: variant.device } });
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function getVariantColors(req, res) {
  try {
    const variant = await DeviceVariant.findOne({ where: { id: req.params.id, is_active: true }, include: [{ model: DeviceVariantColor, as: 'colors', include: [{ model: Color, as: 'color' }] }] });
    if (!variant) throw new CatalogueError('VARIANT_NOT_FOUND', 'Variant not found', 404);
    return res.json({ success: true, message: 'Variant colors retrieved', data: toVariantDto(variant).colors });
  } catch (error) { return sendCatalogueError(res, error); }
}
