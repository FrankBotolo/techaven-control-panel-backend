import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const SHOP_FIELDS = ['name', 'location', 'status', 'logo', 'images', 'description', 'address', 'phone', 'email', 'application_status', 'is_verified', 'profile'];
export const STOCK_FIELDS = ['condition', 'currency', 'price', 'quantity', 'warranty_months', 'status', 'merchant_sku', 'details'];
export const IMAGE_FIELDS = ['url', 'alt_text', 'sort_order', 'is_primary'];
export const pick = (row, fields) => Object.fromEntries(fields.filter(key => row[key] !== undefined).map(key => [key, row[key]]));
const shopKey = name => String(name).normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
const json = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const nullable = value => value == null || value === '' ? null : String(value);
export const stockSku = row => row.merchant_sku || `stock-import-v1-${row.source_id}`;

export function rewriteMedia(value, mediaBase) {
  if (Array.isArray(value)) return value.map(item => rewriteMedia(item, mediaBase));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteMedia(item, mediaBase)]));
  if (typeof value !== 'string') return value;
  const local = value.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/uploads\/(.+)$/);
  if (!local) return value;
  return `${mediaBase.replace(/\/$/, '')}/${local[1]}`;
}

export function planStoreStock(bundle, target) {
  assert.equal(bundle.version, 1, 'Unsupported store-stock bundle');
  assert(Array.isArray(bundle.shops) && Array.isArray(bundle.listings), 'Invalid bundle');
  const held = [], shops = [], listings = [], existing = [];
  const sourceShops = new Map(), mapping = new Map(), sourceNames = new Set();
  for (const source of bundle.shops) {
    assert(source.source_id != null && source.name?.trim(), 'Invalid source shop');
    assert(!sourceShops.has(source.source_id), 'Duplicate source shop ID');
    assert(!sourceNames.has(shopKey(source.name)), 'Duplicate source shop name');
    sourceNames.add(shopKey(source.name));
    sourceShops.set(source.source_id, source);
    const matches = target.shops.filter(shop => shopKey(shop.name) === shopKey(source.name));
    if (matches.length > 1) { held.push({ shop: source.name, reason: 'Ambiguous existing shop name' }); continue; }
    if (matches.length === 1) {
      const found = matches[0];
      if (['phone', 'email'].some(key => source[key] && found[key] && source[key] !== found[key])) {
        held.push({ shop: source.name, reason: 'Existing shop contact differs; ownership review required' }); continue;
      }
      mapping.set(source.source_id, found.id);
    } else {
      const id = `new:${source.source_id}`;
      mapping.set(source.source_id, id);
      shops.push({ source_id: source.source_id, values: pick(source, SHOP_FIELDS), planned_id: id });
    }
  }
  const sourceIds = new Set(), plannedIdentities = new Set(), plannedSkus = new Set();
  for (const source of bundle.listings) {
    assert(source.source_id != null && !sourceIds.has(source.source_id), 'Duplicate or missing source listing ID');
    sourceIds.add(source.source_id);
    assert(['new', 'used', 'refurbished', 'open_box'].includes(source.condition), 'Invalid stock condition');
    assert(source.status === 'active' && Number.isSafeInteger(source.quantity) && source.quantity > 0, 'Only active positive stock is supported');
    assert(/^\d+(?:\.\d{1,2})?$/.test(String(source.price)) && Number(source.price) > 0, 'Invalid stock price');
    const info = { source_id: source.source_id, shop: sourceShops.get(source.shop_source_id)?.name, product: source.device_slug, variant: source.variant_key };
    const hold = reason => held.push({ ...info, reason });
    const shopId = mapping.get(source.shop_source_id);
    if (shopId === undefined) { hold('Shop missing or held'); continue; }
    const devices = target.devices.filter(device => device.slug === source.device_slug && !device.canonical_device_id);
    if (devices.length !== 1) { hold('Exact product slug not found in production catalogue'); continue; }
    const device = devices[0];
    const variants = target.variants.filter(variant => variant.device_id === device.id && variant.canonical_key === source.variant_key);
    if (variants.length !== 1) { hold('Exact variant key not found in production catalogue'); continue; }
    const variant = variants[0];
    if (!device.is_active || !variant.is_active) { hold('Production product or variant is inactive'); continue; }
    if (['ram_gb', 'storage_gb', 'network_generation', 'region', 'sim_type', 'model_number'].some(key => {
      const a = source.variant_facts?.[key], b = variant[key];
      if (['ram_gb', 'storage_gb'].includes(key) && a != null && b != null) return Number(a) !== Number(b);
      return nullable(a) !== nullable(b);
    }) || json(source.variant_facts?.attributes ?? null) !== json(variant.attributes ?? null)) {
      hold('Variant specifications differ despite matching key'); continue;
    }
    let colorId = null;
    if (source.color) {
      const colors = target.colors.filter(color => color.device_variant_id === variant.id && color.slug === source.color.slug && color.color_slug === source.color.color_slug && color.manufacturer_name === source.color.manufacturer_name);
      if (colors.length !== 1) { hold('Exact variant color not found in production catalogue'); continue; }
      colorId = colors[0].id;
    }
    const sku = stockSku(source), skuKey = `${shopId}:${sku}`;
    if (plannedSkus.has(skuKey)) { hold('Duplicate source merchant SKU'); continue; }
    plannedSkus.add(skuKey);
    const candidates = target.listings.filter(row => row.shop_id === shopId && row.merchant_sku === sku);
    if (candidates.length) {
      const old = candidates[0];
      const equal = candidates.length === 1 && old.device_variant_id === variant.id && (old.device_variant_color_id ?? null) === colorId &&
        ['condition', 'currency', 'status'].every(key => old[key] === source[key]) && Number(old.price) === Number(source.price) &&
        old.quantity === source.quantity && nullable(old.warranty_months) === nullable(source.warranty_months) && json(old.details ?? null) === json(source.details ?? null);
      if (equal) existing.push(source.source_id); else hold('Existing stock differs; existing price and quantity preserved');
      continue;
    }
    const identity = [shopId, variant.id, colorId || 0, source.condition, source.currency, Number(source.price).toFixed(2)];
    if (sku.startsWith('seed-20261117-') && source.details?.seed_unit) identity.push(source.details.seed_unit);
    const identityKey = identity.join(':');
    if (plannedIdentities.has(identityKey) || target.listings.some(row => row.active_identity === identityKey)) {
      hold('An active offer with this identity already exists'); continue;
    }
    plannedIdentities.add(identityKey);
    listings.push({ source_id: source.source_id, shop_id: shopId, device_id: device.id, device_variant_id: variant.id,
      device_variant_color_id: colorId, values: { ...pick(source, STOCK_FIELDS), merchant_sku: sku },
      images: (source.images || []).map(image => pick(image, IMAGE_FIELDS)) });
  }
  return { shops, listings, existing, held, fingerprint: createHash('sha256').update(json(bundle)).digest('hex') };
}
