import '../utils/loadEnv.js';
import db from '../models/index.js';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { shops, offers } from './data/apple-edgicate.js';
import { normalizeLaptopRecord } from '../services/catalogue/importers/techapi/laptop.js';
import { enqueueDevice, enqueueShop } from '../services/catalogue/promotionSync.js';

const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
const apply = args.includes('--apply');
const mediaBase = option('--media-base', 'http://localhost:8000/uploads/apple-edgicate').replace(/\/$/, '');
const mediaDir = option('--media-dir', '/app/uploads/apple-edgicate');
const reportPath = option('--report', `/tmp/apple-edgicate-${apply ? 'result' : 'preview'}.json`);
const report = { dry_run: !apply, offers: [], shops: [], created: { devices: 0, variants: 0, listings: 0, images: 0 },
  assumptions: ['Local seed quantity 1 per offer, preserving existing quantities on rerun', 'All offers used; Dell Precision/EliteBook condition confirmed by user', 'Both disputed storage values confirmed as 128 GB', 'Retail ProBook price 530,000; wholesale 490,000 retained in source notes only', 'Shop verification and review ratings are not invented', 'Laptop seller claims are unverified catalogue data'], errors: [] };
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const media = (file) => `${mediaBase}/${file}`;

async function protectedState(transaction) {
  const targetNames = Object.values(shops).map((shop) => shop.name);
  const all = await db.Shop.findAll({ raw: true, order: [['id', 'ASC']], transaction });
  const protectedShops = all.filter((shop) => !targetNames.includes(shop.name));
  const listings = await db.SellerListing.findAll({ where: { shop_id: protectedShops.map((shop) => shop.id) }, raw: true, order: [['id', 'ASC']], transaction });
  return { shops: protectedShops.length, listings: listings.length, hash: hash({ shops: protectedShops, listings }) };
}

try {
  await db.sequelize.authenticate();
  const files = new Set([...Object.values(shops).map((shop) => shop.logo_file), ...offers.flatMap((offer) => offer.images)]);
  const fileHashes = new Map();
  for (const file of files) fileHashes.set(file, createHash('sha256').update(await readFile(path.join(mediaDir, file))).digest('hex'));
  const categories = await db.Category.findAll({ where: { name: ['Smartphones', 'Laptops'], shop_id: null }, raw: true });
  const categoryIds = new Map(categories.map((category) => [category.name, category.id]));
  assert.ok(categoryIds.get('Smartphones') && categoryIds.get('Laptops'), 'Both catalogue categories must exist');
  const plan = [];
  for (const offer of offers) {
    assert.ok(Number.isInteger(offer.price) && offer.price > 0);
    let normalized = null;
    if (offer.category === 'Laptops') {
      normalized = normalizeLaptopRecord({ record: {
        slug: offer.sku, base_model_slug: offer.model.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: offer.model, brand: offer.brand, ram_gb: offer.ram_gb, storage_gb: offer.storage_gb,
        cpu_name: offer.cpu_name, gpu_name: offer.gpu_name, gpu_type: offer.gpu_type,
        display: offer.display, device_category: offer.claims?.convertible ? 'Convertible' : 'Notebook',
        verified: false, source_urls: []
      }, relativePath: `user-advertisements/2026-10-13/${offer.sku}` }, null);
      assert.ok(!normalized.error);
      const claims = { ...offer.claims, storage_type: offer.storage_type === undefined ? 'SSD' : offer.storage_type };
      normalized.device.specs = { ...normalized.device.specs, seller_advertised: claims };
      normalized.device.source_metadata = { provider: 'user-supplied-shop-advertisement', verified: false,
        source_images: offer.images, correction: offer.correction ?? null };
      normalized.variant.attributes = { configuration: normalized.variant.attributes.configuration, seller_advertised: claims };
      normalized.variant.source_metadata = normalized.device.source_metadata;
    }
    const slug = offer.slug ?? normalized.device.slug;
    const device = await db.Device.findOne({ where: { slug } });
    assert.ok(!device || device.category_id === categoryIds.get(offer.category), `Category mismatch: ${offer.model}`);
    if (!normalized) assert.ok(device, `Phone missing from catalogue: ${offer.model}`);
    let variant = null;
    if (device) {
      if (normalized) variant = await db.DeviceVariant.findOne({ where: { device_id: device.id, canonical_key: normalized.variant.canonical_key } });
      else {
        const candidates = await db.DeviceVariant.findAll({ where: { device_id: device.id, storage_gb: offer.storage_gb, is_active: true }, order: [['id', 'ASC']] });
        variant = candidates.find((candidate) => candidate.region === 'global' && candidate.network_generation === '5G') ?? candidates[0];
        assert.ok(variant, `No phone storage match: ${offer.model} ${offer.storage_gb} GB`);
      }
    }
    plan.push({ offer, normalized, slug, device, variant });
    report.offers.push({ sku: offer.sku, model: offer.model, shop: shops[offer.shop].name, price: offer.price,
      ram_gb: offer.ram_gb ?? null, storage_gb: offer.storage_gb, condition: offer.condition,
      device_id: device?.id ?? null, variant_id: variant?.id ?? null, create_device: !device,
      create_variant: !variant, device_slug: slug });
  }
  report.protected_before = await protectedState();
  if (apply) {
    await db.sequelize.transaction(async (transaction) => {
      const shopModels = new Map();
      for (const [key, config] of Object.entries(shops)) {
        const { logo_file, ...values } = config;
        const matches = await db.Shop.findAll({ where: { name: config.name }, transaction });
        assert.ok(matches.length <= 1, `Ambiguous shop name: ${config.name}`);
        const shop = matches[0] ?? await db.Shop.create({ ...values, logo: media(logo_file), status: 'active', application_status: 'approved', is_verified: false }, { transaction });
        await shop.update({ ...values, logo: media(logo_file) }, { transaction });
        assert.equal(shop.status, 'active');
        assert.equal(shop.application_status, 'approved');
        shopModels.set(key, shop);
      }
      for (const [index, entry] of plan.entries()) {
        const { offer, normalized } = entry;
        let { device, variant } = entry;
        if (!device) {
          const [brand] = await db.Brand.findOrCreate({ where: { slug: normalized.brand.slug }, defaults: normalized.brand, transaction });
          device = await db.Device.create({ ...normalized.device, brand_id: brand.id, category_id: categoryIds.get(offer.category) }, { transaction });
          report.created.devices++;
        }
        if (!variant) {
          variant = await db.DeviceVariant.create({ ...normalized.variant, device_id: device.id }, { transaction });
          report.created.variants++;
        }
        const shop = shopModels.get(offer.shop);
        const merchant_sku = `supplied-20261013-${offer.sku}`;
        const identity = `${shop.id}:${variant.id}:0:${offer.condition}`;
        const existing = await db.SellerListing.findOne({ where: { active_identity: identity }, transaction });
        const values = { shop_id: shop.id, device_variant_id: variant.id, condition: offer.condition,
          currency: 'MWK', price: Math.max(Number(existing?.price) || 0, offer.price), quantity: existing?.quantity ?? 1,
          status: 'active', merchant_sku: existing?.merchant_sku ?? merchant_sku };
        const listing = existing ? await existing.update(values, { transaction }) : await db.SellerListing.create(values, { transaction });
        if (!existing) report.created.listings++;
        const seen = new Set();
        let sortOrder = 0;
        for (const file of offer.images) {
          if (seen.has(fileHashes.get(file))) continue;
          seen.add(fileHashes.get(file));
          const [, created] = await db.ListingImage.findOrCreate({ where: { listing_id: listing.id, url: media(file) },
            defaults: { storage_key: `apple-edgicate/${file}`, alt_text: offer.image_notes?.[file] ?? `${offer.model} — supplied shop advertisement`,
              sort_order: sortOrder, is_primary: sortOrder === 0 }, transaction });
          if (created) report.created.images++;
          sortOrder++;
        }
        Object.assign(report.offers[index], { device_id: device.id, variant_id: variant.id, listing_id: listing.id,
          selected_price: Number(listing.price), image_count: sortOrder });
      }
      for (const [key, shop] of shopModels) {
        const count = await db.SellerListing.count({ where: { shop_id: shop.id, status: 'active' }, transaction });
        await shop.update({ total_products: count }, { transaction });
        report.shops.push({ key, id: shop.id, name: shop.name, offers: count });
      }
      report.protected_after = await protectedState(transaction);
      assert.deepEqual(report.protected_after, report.protected_before, 'Existing unrelated shops or listings changed');
    });
    for (const shop of report.shops) await enqueueShop(shop.id, { reason: 'supplied-apple-edgicate-seed' });
    for (const id of new Set(report.offers.map((offer) => offer.device_id))) await enqueueDevice(id, { reason: 'supplied-apple-edgicate-seed' });
  }
  console.log(JSON.stringify({ dry_run: !apply, offers: report.offers.length, new_models: plan.filter((entry) => !entry.device).length,
    created: report.created, shops: report.shops, protected_records_unchanged: !apply || report.protected_before.hash === report.protected_after.hash }, null, 2));
} catch (error) {
  report.errors.push(error.message);
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await db.sequelize.close();
}
