import '../utils/loadEnv.js';
import db from '../models/index.js';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { canonicalVariantKey } from '../services/catalogue/normalization.js';
import { enqueueDevice, enqueueShop } from '../services/catalogue/promotionSync.js';
import { saeedShop as config, saeedOffers as offers } from './data/saeed-enterprise.js';

const apply = process.argv.includes('--apply');
const report = { applied: apply, offers: [], created: { categories: 0, devices: 0, variants: 0, listings: 0, images: 0 }, errors: [],
  assumptions: ['Local quantity 1; preserve quantities and highest existing price on rerun', 'Unlabelled condition new under agreed local defaults', 'Source claims remain unverified; unspecified memory/charging remain null; physical and extended RAM separate', 'No warranty or shop review/verification claims fabricated'] };
const base = 'http://localhost:8000/uploads/saeed-enterprise';
const photo = (file) => `${base}/${file}`;
async function protectedState() {
  const shops = (await db.Shop.findAll({ raw: true, order: [['id', 'ASC']] })).filter((shop) => shop.name !== config.name);
  const listings = await db.SellerListing.findAll({ where: { shop_id: shops.map((shop) => shop.id) }, raw: true, order: [['id', 'ASC']] });
  return { shops: shops.length, listings: listings.length, hash: createHash('sha256').update(JSON.stringify({ shops, listings })).digest('hex') };
}
try {
  await db.sequelize.authenticate();
  for (const file of new Set([config.logo_file, ...offers.flatMap((offer) => offer.images)])) await readFile(`/app/uploads/saeed-enterprise/${file}`);
  report.protected_before = await protectedState();
  const run = async (transaction) => {
    const categories = new Map();
    for (const name of new Set(offers.map((offer) => offer.category))) {
      let category = await db.Category.findOne({ where: { name, shop_id: null }, transaction });
      if (!category && apply) { category = await db.Category.create({ name, status: 'approved' }, { transaction }); report.created.categories++; }
      categories.set(name, category?.id ?? null);
    }
    const { logo_file, ...shopValues } = config;
    const matches = await db.Shop.findAll({ where: { name: config.name }, transaction });
    assert.ok(matches.length <= 1, 'Ambiguous shop name');
    let shop = matches[0];
    if (apply) {
      shop ??= await db.Shop.create({ ...shopValues, logo: photo(logo_file), status: 'active', application_status: 'approved', is_verified: false }, { transaction });
      await shop.update({ ...shopValues, logo: photo(logo_file) }, { transaction });
      assert.equal(shop.status, 'active'); assert.equal(shop.application_status, 'approved');
    }
    for (const offer of offers) {
      let device = await db.Device.findOne({ where: { slug: offer.slug }, transaction });
      assert.ok(!device || device.category_id === categories.get(offer.category), `Wrong category: ${offer.slug}`);
      const source = { provider: 'user-supplied-saeed-enterprise-advertisement', source_images: offer.images,
        verified: false, unresolved: offer.unresolved ?? null, correction: offer.correction ?? null };
      if (!device && apply) {
        const [brand] = await db.Brand.findOrCreate({ where: { slug: offer.brand }, defaults: { slug: offer.brand, name: offer.brand }, transaction });
        device = await db.Device.create({ slug: offer.slug, name: offer.name, brand_id: brand.id, category_id: categories.get(offer.category),
          soc: offer.cpu ?? null, battery_mah: offer.battery_mah ?? null, os_family: offer.os_family ?? null, specs: offer.specs ?? {}, verification_status: 'unverified', source_metadata: source }, { transaction });
        report.created.devices++;
      }
      let variant;
      const fields = { ram_gb: offer.ram_gb ?? null, storage_gb: offer.storage_gb ?? null, region: 'global', model_number: null, network_generation: offer.network_generation ?? null };
      const key = canonicalVariantKey(offer.slug, fields);
      if (device) variant = await db.DeviceVariant.findOne({ where: { device_id: device.id, canonical_key: key }, transaction });
      if (!variant && apply) {
        variant = await db.DeviceVariant.create({ ...fields, device_id: device.id, canonical_key: key, verification_status: 'unverified',
          attributes: { configuration: { cpu_name: offer.cpu ?? null, ...(offer.specs ?? {}) } }, source_metadata: source }, { transaction });
        report.created.variants++;
      }
      const row = { slug: offer.slug, category: offer.category, price: offer.price, storage_gb: offer.storage_gb ?? null,
        ram_gb: offer.ram_gb ?? null, condition: offer.condition, unresolved: offer.unresolved ?? null,
        device_id: device?.id ?? null, variant_id: variant?.id ?? null };
      if (apply) {
        const identity = `${shop.id}:${variant.id}:0:${offer.condition}`;
        const existing = await db.SellerListing.findOne({ where: { active_identity: identity }, transaction });
        const values = { shop_id: shop.id, device_variant_id: variant.id, condition: offer.condition, currency: 'MWK',
          price: Math.max(Number(existing?.price) || 0, offer.price), quantity: existing?.quantity ?? 1, status: 'active', merchant_sku: `saeed-enterprise-${offer.slug}` };
        const listing = existing ? await existing.update(values, { transaction }) : await db.SellerListing.create(values, { transaction });
        if (!existing) report.created.listings++;
        for (const [index, file] of offer.images.entries()) {
          const [, created] = await db.ListingImage.findOrCreate({ where: { listing_id: listing.id, url: photo(file) },
            defaults: { storage_key: `saeed-enterprise/${file}`, is_primary: index === 0, sort_order: index,
              alt_text: offer.battery_health_percent ? `Supplied ${offer.name} photo; seller states ${offer.battery_health_percent}% battery health.` : `${offer.name} — shop advertisement` }, transaction });
          if (created) report.created.images++;
        }
        if (offer.loan_available) {
          const [loans] = await db.Category.findOrCreate({ where: { name: 'Pay as you go (PAYGO)', shop_id: null }, defaults: { status: 'approved', description: 'Phones available on loan or installment terms from participating shops.' }, transaction });
          await db.sequelize.query('INSERT IGNORE INTO seller_listing_categories (listing_id, category_id) VALUES (?, ?)', { replacements: [listing.id, loans.id], transaction });
        }
        row.listing_id = listing.id;
      }
      report.offers.push(row);
    }
    if (apply) {
      const count = await db.SellerListing.count({ where: { shop_id: shop.id, status: 'active' }, transaction });
      await shop.update({ total_products: count }, { transaction });
      report.shop = { id: shop.id, name: shop.name, listings: count };
    }
  };
  if (apply) await db.sequelize.transaction(run); else await run(undefined);
  report.protected_after = await protectedState();
  assert.deepEqual(report.protected_after, report.protected_before, 'Existing unrelated shops/listings changed');
  if (apply) {
    await enqueueShop(report.shop.id, { reason: 'saeed-enterprise-supplied-seed' });
    for (const id of new Set(report.offers.map((row) => row.device_id))) await enqueueDevice(id, { reason: 'saeed-enterprise-supplied-seed' });
  }
  console.log(JSON.stringify({ applied: apply, offers: report.offers.length, shop: report.shop, created: report.created, protected_records_unchanged: true }, null, 2));
} catch (error) { report.errors.push(error.message); console.error(error.message); process.exitCode = 1; }
finally { await writeFile(`/tmp/saeed-enterprise-${apply ? 'result' : 'preview'}.json`, JSON.stringify(report, null, 2)); await db.sequelize.close(); }



