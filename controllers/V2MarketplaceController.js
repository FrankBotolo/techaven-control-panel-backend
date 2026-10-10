import { Op } from 'sequelize';
import db from '../models/index.js';
import { CatalogueError, sendCatalogueError } from '../services/catalogue/errors.js';
import { toDeviceDto } from '../services/catalogue/dto.js';

const { Brand, Category, Device, DeviceVariant, DeviceVariantColor, Color, DeviceMedia, SellerListing, ListingImage, Shop } = db;

const offerInclude = (query = {}) => ({
  model: SellerListing,
  as: 'seller_listings',
  required: true,
  where: {
    status: 'active', quantity: { [Op.gt]: 0 },
    ...(query.min_price || query.max_price ? { price: { ...(query.min_price ? { [Op.gte]: Number(query.min_price) } : {}), ...(query.max_price ? { [Op.lte]: Number(query.max_price) } : {}) } } : {}),
    ...(query.condition ? { condition: query.condition } : {}),
    ...(query.shop_id ? { shop_id: Number(query.shop_id) } : {}),
    ...(query.color_id ? { device_variant_color_id: query.color_id } : {})
  },
  include: [{ model: Shop, as: 'shop', required: true, where: { status: 'active', application_status: 'approved' }, attributes: ['id', 'name'] }, { model: ListingImage, as: 'images' }]
});

function include(query = {}) {
  const variantWhere = { is_active: true };
  for (const field of ['ram_gb', 'storage_gb', 'network_generation']) if (query[field]) variantWhere[field] = query[field];
  return [
    { model: Brand, as: 'brand', where: { is_active: true, ...(query.brand ? { slug: query.brand } : {}) } },
    { model: Category, as: 'category', attributes: ['id', 'name'] },
    { model: DeviceMedia, as: 'media', separate: true, order: [['sort_order', 'ASC']] },
    { model: DeviceVariant, as: 'variants', required: true, where: variantWhere, include: [{ model: DeviceVariantColor, as: 'colors', include: [{ model: Color, as: 'color' }] }, offerInclude(query)] }
  ];
}

export async function listDevices(req, res) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const perPage = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const where = { is_active: true };
    let requestedIds = null;
    if (req.query.ids !== undefined) {
      const raw = String(req.query.ids).split(',').map((item) => item.trim());
      if (!raw.length || raw.some((item) => !/^\d+$/.test(item) || Number(item) < 1) || raw.length > 50) {
        throw new CatalogueError('INVALID_DEVICE_IDS', 'ids must contain 1 to 50 positive integers');
      }
      requestedIds = [...new Set(raw.map(Number))];
      where.id = { [Op.in]: requestedIds };
    }
    if (req.query.category_id) where.category_id = req.query.category_id;
    if (req.query.search) where.name = { [Op.like]: `%${req.query.search}%` };
    const { count, rows } = await Device.findAndCountAll({ where, include: include(req.query), distinct: true, subQuery: false, limit: requestedIds ? 50 : perPage, offset: requestedIds ? 0 : (page - 1) * perPage, order: [['name', 'ASC']] });
    const dtoRows = rows.map((row) => toDeviceDto(row, { includeOffers: true }));
    const devices = requestedIds ? requestedIds.flatMap((id) => dtoRows.filter((row) => row.id === id)) : dtoRows;
    const missing_ids = requestedIds ? requestedIds.filter((id) => !devices.some((row) => row.id === id)) : undefined;
    return res.json({ success: true, message: 'Marketplace devices retrieved', data: { devices, ...(requestedIds ? { missing_ids } : {}), pagination: { current_page: page, per_page: requestedIds ? 50 : perPage, total_items: count, total_pages: requestedIds ? 1 : Math.ceil(count / perPage) } } });
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function getDevice(req, res) {
  try {
    const identifier = String(req.params.id);
    const identity = /^\d+$/.test(identifier) ? { id: Number(identifier) } : { slug: identifier };
    const device = await Device.findOne({ where: { ...identity, is_active: true }, include: include(req.query) });
    if (!device) throw new CatalogueError('DEVICE_NOT_FOUND', 'Device with available offers not found', 404);
    return res.json({ success: true, message: 'Marketplace device retrieved', data: toDeviceDto(device, { includeOffers: true }) });
  } catch (error) { return sendCatalogueError(res, error); }
}

export async function getListing(req, res) {
  try {
    const listing = await SellerListing.findOne({ where: { id: req.params.id, status: 'active', quantity: { [Op.gt]: 0 } }, include: [{ model: Shop, as: 'shop', required: true, where: { status: 'active', application_status: 'approved' }, attributes: ['id', 'name'] }, { model: ListingImage, as: 'images' }, { model: DeviceVariantColor, as: 'variant_color', include: [{ model: Color, as: 'color' }] }, { model: DeviceVariant, as: 'variant', required: true, where: { is_active: true }, include: [{ model: Device, as: 'device', required: true, where: { is_active: true }, include: [{ model: Brand, as: 'brand', required: true, where: { is_active: true } }, { model: DeviceMedia, as: 'media' }] }] }] });
    if (!listing) throw new CatalogueError('LISTING_NOT_FOUND', 'Listing not found', 404);
    return res.json({ success: true, message: 'Listing retrieved', data: listing });
  } catch (error) { return sendCatalogueError(res, error); }
}
