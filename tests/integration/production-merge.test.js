import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import db from '../../models/index.js';
import { up as identity } from '../../database/migrations-js/202611110001-catalog-identity.js';
import { up as listingIdentity } from '../../database/migrations-js/202611170001-price-aware-listing-identity.js';
import { up as notices } from '../../database/migrations-js/202611170002-manual-checkout-notices.js';
import { listingIdentity as deriveIdentity } from '../../models/SellerListing.js';

if (process.env.DB_NAME !== 'techaven_production_merge_test' || !process.env.BASELINE_BACKEND_PATH)
  throw new Error('Requires isolated techaven_production_merge_test and a clean baseline checkout');

test('production fork upgrades preserve catalogue, users, stock and portal model contracts', async () => {
  const { default: baseline } = await import(pathToFileURL(path.join(process.env.BASELINE_BACKEND_PATH, 'models/index.js')).href);
  try {
    assert.equal(baseline.sequelize.getDatabaseName(), 'techaven_production_merge_test');
    await baseline.sequelize.sync();
    const suffix = Date.now().toString();
    const shop = await baseline.Shop.create({ name: `Preserved shop ${suffix}` });
    const user = await baseline.User.create({ name: 'Existing production customer', role: 'customer' });
    const brand = await baseline.Brand.create({ name: 'Existing brand', slug: `merge-brand-${suffix}` });
    const category = await baseline.Category.create({ name: 'Existing category' });
    const device = await baseline.Device.create({ name: 'Existing product', slug: `merge-product-${suffix}`, brand_id: brand.id, category_id: category.id });
    const variant = await baseline.DeviceVariant.create({ device_id: device.id, canonical_key: `merge-variant-${suffix}` });
    const oldListing = await baseline.SellerListing.create({ shop_id: shop.id, device_variant_id: variant.id, price: '1234.00', quantity: 3, condition: 'new', status: 'active' });
    const portalPromotion = await baseline.Promotion.create({ internalName: `Merge fixture ${suffix}`, headline: 'Preserved portal promotion', slug: `merge-${suffix}`, placement: 'home_hero', layout: 'hero', theme: 'light' });
    for (const up of [identity, listingIdentity, notices]) {
      await db.sequelize.transaction(transaction => up({ sequelize: db.sequelize, transaction }));
      await db.sequelize.transaction(transaction => up({ sequelize: db.sequelize, transaction }));
    }
    const restored = await db.SellerListing.findByPk(oldListing.id);
    assert.equal(restored.quantity, 3);
    assert.equal(Number(restored.price), 1234);
    assert.equal(restored.active_identity, deriveIdentity(restored));
    assert.equal((await db.Device.findByPk(device.id)).name, device.name);
    assert.equal((await db.User.findByPk(user.id)).name, user.name);
    assert.equal((await db.Promotion.findByPk(portalPromotion.id)).headline, portalPromotion.headline);
    // Archive must persist a NULL identity; relisting the same offer must then work.
    await restored.update({ status: 'archived' });
    assert.equal((await restored.reload()).active_identity, null);
    const replacement = await db.SellerListing.create({ shop_id: shop.id, device_variant_id: variant.id, price: '1234.00', quantity: 1, condition: 'new', status: 'active' });
    assert.equal(replacement.active_identity, deriveIdentity(replacement));
    assert(await db.sequelize.getQueryInterface().describeTable('manual_checkout_notices'));
  } finally { await baseline.sequelize.close(); await db.sequelize.close(); }
});
