import { Op } from 'sequelize';
import db from '../../models/index.js';

const { Brand, Category, Device, DeviceVariant, DeviceMedia, SellerListing, Shop, PromotionCatalogueEvent } = db;

const iso = (value) => new Date(value || Date.now()).toISOString();
const key = (kind, id, reason) => `${kind}:${id}:${reason}`.slice(0, 255);

export async function projectDevice(deviceId, transaction) {
  const device = await Device.findByPk(deviceId, {
    include: [
      { model: Brand, as: 'brand' },
      { model: Category, as: 'category', attributes: ['id', 'name'] },
      { model: DeviceMedia, as: 'media', separate: true, limit: 1, order: [['is_primary', 'DESC'], ['sort_order', 'ASC'], ['id', 'ASC']] },
      { model: DeviceVariant, as: 'variants', required: false, include: [{
        model: SellerListing, as: 'seller_listings', required: false,
        include: [{ model: Shop, as: 'shop', attributes: ['id', 'status', 'application_status'] }]
      }] }
    ],
    transaction
  });
  if (!device) return null;
  const active = Boolean(device.is_active && device.brand?.is_active && device.variants?.some((variant) =>
    variant.is_active && variant.seller_listings?.some((listing) =>
      listing.status === 'active' && listing.quantity > 0 && listing.shop?.status === 'active' && listing.shop?.application_status === 'approved'
    )
  ));
  return {
    externalId: `device:${device.id}`,
    slug: device.slug,
    name: device.name,
    brand: device.brand?.name || null,
    category: device.category?.name || null,
    thumbnailUrl: device.primary_image_url || device.media?.[0]?.url || null,
    active,
    sourceUpdatedAt: iso(device.updatedAt)
  };
}

export async function projectShop(shopId, transaction) {
  const shop = await Shop.findByPk(shopId, { transaction });
  if (!shop) return null;
  return {
    externalId: String(shop.id),
    slug: `shop-${shop.id}`,
    name: shop.name,
    logoUrl: shop.logo || null,
    locationLabel: shop.location || shop.address || null,
    verified: Boolean(shop.is_verified),
    active: shop.status === 'active' && shop.application_status === 'approved',
    sourceUpdatedAt: iso(shop.updatedAt)
  };
}

async function append(kind, externalId, payload, dedupeKey, transaction) {
  return PromotionCatalogueEvent.findOrCreate({
    where: { dedupe_key: dedupeKey },
    defaults: { kind, external_id: externalId, payload, dedupe_key: dedupeKey },
    transaction
  });
}

export async function enqueueDevice(deviceId, { transaction, reason = `change:${Date.now()}` } = {}) {
  const payload = await projectDevice(deviceId, transaction);
  if (!payload) return null;
  return append('device', payload.externalId, payload, key('device', deviceId, reason), transaction);
}

export async function enqueueShop(shopId, { transaction, reason = `change:${Date.now()}` } = {}) {
  const payload = await projectShop(shopId, transaction);
  if (!payload) return null;
  return append('shop', payload.externalId, payload, key('shop', shopId, reason), transaction);
}

export async function enqueueShopDevices(shopId, options = {}) {
  const listings = await SellerListing.findAll({
    where: { shop_id: shopId }, attributes: ['device_variant_id'],
    include: [{ model: DeviceVariant, as: 'variant', attributes: ['device_id'] }],
    transaction: options.transaction
  });
  const deviceIds = [...new Set(listings.map((listing) => listing.variant?.device_id).filter(Boolean))];
  for (const deviceId of deviceIds) {
    await enqueueDevice(deviceId, { ...options, reason: `${options.reason || `shop:${Date.now()}`}:device:${deviceId}` });
  }
  return deviceIds.length;
}

export async function enqueueBrandDevices(brandId, options = {}) {
  const devices = await Device.findAll({ where: { brand_id: brandId }, attributes: ['id'], transaction: options.transaction });
  for (const device of devices) {
    await enqueueDevice(device.id, { ...options, reason: `${options.reason || `brand:${Date.now()}`}:device:${device.id}` });
  }
  return devices.length;
}

export async function enqueueTombstone(kind, id, snapshot = {}, { transaction, reason = `deleted:${Date.now()}` } = {}) {
  const externalId = kind === 'device' ? `device:${id}` : String(id);
  const payload = {
    externalId,
    slug: snapshot.slug || `${kind}-${id}`,
    name: snapshot.name || `Deleted ${kind} ${id}`,
    ...(kind === 'shop' ? { logoUrl: null, locationLabel: null, verified: false } : { brand: null, category: null, thumbnailUrl: null }),
    active: false,
    sourceUpdatedAt: new Date().toISOString()
  };
  return append(kind, externalId, payload, key(kind, id, reason), transaction);
}

export async function feed(kind, after = 0, limit = 100) {
  const rows = await PromotionCatalogueEvent.findAll({
    where: { kind, id: { [Op.gt]: after } }, order: [['id', 'ASC']], limit: limit + 1
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    items: page.map((row) => row.payload),
    next_cursor: page.length ? String(page[page.length - 1].id) : String(after),
    has_more: hasMore
  };
}
