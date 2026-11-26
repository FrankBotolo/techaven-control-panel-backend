import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../../models/index.js';
import routes from '../../routes/promotion-participation.js';
import { campaignGateway } from '../../services/promotion-participation.js';
import { up } from '../../database/migrations-js/202611250001-promotion-participation.js';

if (process.env.DB_NAME !== 'techaven_promotion_participation_test') throw Error('Requires isolated participation test database');
test('shop ownership, staff approval, duplicate safety and live offer eligibility are enforced', async () => {
  let server;
  const original = campaignGateway.load;
  try {
    await db.sequelize.sync(); await up({ sequelize: db.sequelize }); await up({ sequelize: db.sequelize });
    const tag = Date.now().toString();
    const slug = `campaign-${tag}`;
    campaignGateway.load = async () => [{ slug, headline: 'Fixture' }];
    process.env.JWT_SECRET = 'participation-fixture-only-secret';
    const shop = await db.Shop.create({ name: `Shop ${tag}` });
    const otherShop = await db.Shop.create({ name: `Other shop ${tag}` });
    const seller = await db.User.create({ name: 'Seller', role: 'seller', shop_id: shop.id, is_verified: true });
    const other = await db.User.create({ name: 'Other seller', role: 'seller', shop_id: otherShop.id, is_verified: true });
    const admin = await db.User.create({ name: 'Reviewer', role: 'admin' });
    const brand = await db.Brand.create({ name: 'Fixture', slug: `brand-${tag}` });
    const category = await db.Category.create({ name: 'Fixture category' });
    const device = await db.Device.create({ name: 'Fixture device', slug: `device-${tag}`, brand_id: brand.id, category_id: category.id });
    const variant = await db.DeviceVariant.create({ device_id: device.id, canonical_key: `variant-${tag}` });
    const listing = await db.SellerListing.create({ shop_id: shop.id, device_variant_id: variant.id, price: '100.00', quantity: 2, condition: 'new', status: 'active' });
    const app = express(); app.use(express.json()); app.use(routes);
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const call = (user, path, method = 'GET', body) => fetch(`http://127.0.0.1:${server.address().port}${path}`, { method,
      headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${jwt.sign({ id: user.id }, process.env.JWT_SECRET)}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    const request = { campaign_slug: slug, listing_id: listing.id, status: 'approved' };
    assert.equal((await call(null, '/requests')).status, 401);
    assert.equal((await call(other, '/requests', 'POST', request)).status, 403);
    const submitted = await call(seller, '/requests', 'POST', request);
    assert.equal(submitted.status, 200, await submitted.clone().text());
    const record = (await submitted.json()).data;
    assert.equal(record.status, 'pending');
    assert.equal((await (await call(null, `/offers/${slug}`)).json()).data.length, 0);
    assert.equal((await call(seller, `/requests/${record.id}`, 'PATCH', { status: 'approved' })).status, 403);
    assert.equal((await call(admin, `/requests/${record.id}`, 'PATCH', { status: 'rejected' })).status, 400);
    assert.equal((await call(admin, `/requests/${record.id}`, 'PATCH', { status: 'approved' })).status, 200);
    let approved = (await (await call(null, `/offers/${slug}`)).json()).data;
    assert.equal(approved[0].offers[0].id, listing.id);
    assert.equal(approved[0].offers[0].shop.id, shop.id);
    assert.equal((await (await call(seller, '/requests', 'POST', request)).json()).data.status, 'approved');
    await listing.update({ price: '101.00' });
    assert.equal((await (await call(null, `/offers/${slug}`)).json()).data.length, 0);
    assert.equal((await (await call(seller, '/requests', 'POST', request)).json()).data.status, 'pending');
    assert.equal((await call(admin, '/requests', 'POST', request)).status, 200);
    await listing.update({ quantity: 0 });
    assert.equal((await (await call(null, `/offers/${slug}`)).json()).data.length, 0);
    await listing.update({ quantity: 2 });
    assert.equal((await call(other, `/requests/${record.id}`, 'DELETE')).status, 404);
    assert.equal((await call(seller, `/requests/${record.id}`, 'DELETE')).status, 200);
    assert.equal((await (await call(null, `/offers/${slug}`)).json()).data.length, 0);
    campaignGateway.load = async () => [];
    assert.equal((await call(admin, '/requests', 'POST', request)).status, 404);
  } finally { campaignGateway.load = original; if (server) await new Promise(resolve => server.close(resolve)); await db.sequelize.close(); }
});
