import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import db from '../../models/index.js';

if (process.env.DB_NAME !== 'techaven_store_stock_import_test') throw new Error('Requires isolated techaven_store_stock_import_test database');

test('selective stock importer is read-only in preview, transactional, repeatable and preserves unrelated data', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'store-stock-check-'));
  const input = path.join(folder, 'bundle.json');
  try {
    await db.sequelize.sync();
    const suffix = Date.now().toString();
    const category = await db.Category.create({ name: `Import category ${suffix}` });
    const brand = await db.Brand.create({ name: 'Import brand', slug: `import-brand-${suffix}` });
    const device = await db.Device.create({ name: 'Existing product', slug: `import-product-${suffix}`, brand_id: brand.id, category_id: category.id });
    const variant = await db.DeviceVariant.create({ device_id: device.id, canonical_key: `import-key-${suffix}`, storage_gb: 128 });
    const user = await db.User.create({ name: 'Preserved existing user' });
    const snapshot = async () => JSON.stringify({
      users: await db.User.findAll({ raw: true, order: [['id', 'ASC']] }),
      orders: await db.Order.findAll({ raw: true, order: [['id', 'ASC']] }),
      devices: await db.Device.findAll({ raw: true, order: [['id', 'ASC']] }),
      variants: await db.DeviceVariant.findAll({ raw: true, order: [['id', 'ASC']] }),
    });
    const before = await snapshot();
    const bundle = { version: 1, shops: [{ source_id: 888888, name: `Imported store ${suffix}`, status: 'active', application_status: 'approved' }],
      listings: [{ source_id: 777777, shop_source_id: 888888, device_slug: device.slug, variant_key: variant.canonical_key,
        variant_facts: { storage_gb: 128, ram_gb: null, attributes: null }, color: null,
        condition: 'new', currency: 'MWK', price: '1234.00', quantity: 4, status: 'active',
        images: [{ url: 'https://images.example/test.jpg', sort_order: 0, is_primary: true }] }] };
    const run = (tag, ...flags) => {
      fs.writeFileSync(input, JSON.stringify(bundle));
      return spawnSync(process.execPath, ['scripts/import-store-stock.js', input, '--report', path.join(folder, `${tag}.json`), '--media-base', 'https://images.example', ...flags],
        { encoding: 'utf8', env: process.env, timeout: 120000 });
    };
    const preview = run('preview');
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(await db.Shop.count({ where: { name: bundle.shops[0].name } }), 0);
    assert.equal(await snapshot(), before);
    bundle.listings.push({ ...bundle.listings[0], source_id: 999999, variant_key: 'missing-key' });
    const held = run('held', '--apply');
    assert.notEqual(held.status, 0);
    assert.equal(await db.Shop.count({ where: { name: bundle.shops[0].name } }), 0);
    bundle.listings.pop();
    bundle.listings[0].images[0].alt_text = 'x'.repeat(300);
    const rolledBack = run('rolled-back', '--apply');
    assert.notEqual(rolledBack.status, 0);
    assert.equal(await db.Shop.count({ where: { name: bundle.shops[0].name } }), 0);
    assert.equal(await snapshot(), before);
    delete bundle.listings[0].images[0].alt_text;
    const applied = run('applied', '--apply');
    assert.equal(applied.status, 0, applied.stderr);
    const shop = await db.Shop.findOne({ where: { name: bundle.shops[0].name } });
    const listing = await db.SellerListing.findOne({ where: { shop_id: shop.id } });
    assert.equal(listing.device_variant_id, variant.id);
    assert.equal(listing.quantity, 4);
    assert.equal(Number(listing.price), 1234);
    assert.equal(await db.ListingImage.count({ where: { listing_id: listing.id } }), 1);
    const rerun = run('rerun', '--apply');
    assert.equal(rerun.status, 0, rerun.stderr);
    assert.equal(await db.SellerListing.count({ where: { shop_id: shop.id } }), 1);
    assert.equal(await snapshot(), before);
    assert(await db.User.findByPk(user.id));
    await listing.update({ quantity: 2 });
    const changed = run('changed', '--apply');
    assert.notEqual(changed.status, 0);
    assert.equal((await listing.reload()).quantity, 2);
  } finally { await db.sequelize.close(); }
});
