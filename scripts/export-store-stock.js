import '../utils/loadEnv.js';
import fs from 'node:fs';
import db from '../models/index.js';
import { SHOP_FIELDS, STOCK_FIELDS, IMAGE_FIELDS, pick } from '../services/catalogue/store-stock-import.js';

const output = process.argv[2];
if (!output) throw new Error('Usage: node scripts/export-store-stock.js <private-new-json-file>');
try {
  const bundle = await db.sequelize.transaction({ isolationLevel: 'REPEATABLE READ' }, async transaction => {
    const get = model => model.findAll({ raw: true, transaction, order: [['id', 'ASC']] });
    const [shops, listings, devices, variants, colors, names, images] = await Promise.all([
      get(db.Shop), get(db.SellerListing), get(db.Device), get(db.DeviceVariant), get(db.DeviceVariantColor), get(db.Color), get(db.ListingImage),
    ]);
    const selectedShops = shops.filter(shop => shop.status === 'active' && shop.application_status === 'approved');
    const ids = new Set(selectedShops.map(shop => shop.id));
    const byId = rows => new Map(rows.map(row => [row.id, row]));
    const deviceMap = byId(devices), variantMap = byId(variants), colorMap = byId(colors), colorNames = byId(names);
    return { version: 1, exported_at: new Date().toISOString(),
      shops: selectedShops.map(shop => ({ source_id: shop.id, ...pick(shop, SHOP_FIELDS) })),
      listings: listings.filter(row => ids.has(row.shop_id) && row.status === 'active' && row.quantity > 0).map(row => {
        const variant = variantMap.get(row.device_variant_id), device = deviceMap.get(variant?.device_id), color = colorMap.get(row.device_variant_color_id);
        if (!variant || !device) throw new Error(`Broken catalogue reference for listing ${row.id}`);
        return { source_id: row.id, shop_source_id: row.shop_id, ...pick(row, STOCK_FIELDS), device_slug: device.slug,
          variant_key: variant.canonical_key, variant_facts: pick(variant, ['ram_gb', 'storage_gb', 'network_generation', 'region', 'sim_type', 'model_number', 'attributes']),
          color: color ? { slug: color.slug, color_slug: colorNames.get(color.color_id)?.slug, manufacturer_name: color.manufacturer_name } : null,
          images: images.filter(image => image.listing_id === row.id).map(image => pick(image, IMAGE_FIELDS)) };
      }),
    };
  });
  fs.writeFileSync(output, JSON.stringify(bundle, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ shops: bundle.shops.length, stocked_listings: bundle.listings.length, output }));
} finally { await db.sequelize.close(); }
