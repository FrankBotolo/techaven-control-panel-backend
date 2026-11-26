import test from 'node:test';
import assert from 'node:assert/strict';
import { convertRow, parseValues, SEED_TABLES } from '../../scripts/extract-commerce-seed.js';
import { loadSeedTable, ownerEmail } from '../../scripts/seeders/commerce.js';

test('parses mysqldump values with escapes, nulls and numbers', () => {
  assert.deepEqual(parseValues(String.raw`(1,'it\'s (a), ''b''\n',NULL,-2.50),(2,'','x;',0);`),
    [[1, "it's (a), 'b'\n", null, -2.5], [2, '', 'x;', 0]]);
  assert.throws(() => parseValues("(1,'unterminated"));
});

test('converts JSON, booleans and UTC datetimes', () => {
  const columns = [{ name: 'a', type: 'json' }, { name: 'b', type: 'tinyint(1)' }, { name: 'c', type: 'datetime' }];
  assert.deepEqual(convertRow(columns, ['{"k":1}', 1, '2026-10-10 11:40:20']), { a: { k: 1 }, b: true, c: '2026-10-10T11:40:20Z' });
});

test('seed data holds no private tables and every reference resolves', () => {
  for (const table of ['users', 'orders', 'auth_v2_sessions', 'shipping_addresses']) assert.ok(!SEED_TABLES.includes(table));
  const ids = (table) => new Set(loadSeedTable(table).map((row) => row.id));
  const [variants, shops, listings] = ['device_variants', 'shops', 'seller_listings'].map(ids);
  for (const row of loadSeedTable('seller_listings')) assert.ok(variants.has(row.device_variant_id) && shops.has(row.shop_id) && row.merchant_sku);
  for (const row of loadSeedTable('listing_images')) assert.ok(listings.has(row.listing_id));
});

test('every shop gets a distinct non-deliverable owner email', () => {
  const emails = loadSeedTable('shops').map((shop) => ownerEmail(shop.name));
  assert.equal(new Set(emails).size, emails.length);
  for (const email of emails) assert.match(email, /^[a-z0-9]+(-[a-z0-9]+)*@shops.techaven.test$/);
  assert.equal(ownerEmail('M&N Electronics MW'), 'mandn-electronics-mw@shops.techaven.test');
});
