import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { cleanModelName, deviceSlug, isRegionalSku, modelKey } from '../../services/catalogue/deviceIdentity.js';
import { catalogueVariantKey, selectDevices } from '../../scripts/seed-device-catalogue.js';

test('model identity ignores brand prefix, memory noise and plus spelling', () => {
  assert.equal(cleanModelName('Samsung Galaxy A06 (4GB RAM + 128GB)', 'samsung'), 'Galaxy A06');
  assert.equal(modelKey('samsung', 'Galaxy S24+'), modelKey('samsung', 'Samsung Galaxy S24 Plus'));
  assert.notEqual(modelKey('samsung', 'Galaxy S24'), modelKey('samsung', 'Galaxy S24+'));
  assert.equal(deviceSlug('apple', 'iPhone 17'), 'iphone-17');
  assert.equal(deviceSlug('google', 'Pixel 10'), 'google-pixel-10');
});

test('regional SKU names are excluded, marketed names kept', () => {
  assert.ok(isRegionalSku('Samsung SM-S921B/DS Galaxy S24 5G Global Dual SIM TD-LTE 256GB (Samsung Muse 1)'));
  assert.ok(isRegionalSku('Apple iPhone 14 Pro UW'));
  for (const name of ['Samsung Galaxy S24', 'Redmi Note 13 Pro+', 'iPhone SE (3rd generation)']) assert.ok(!isRegionalSku(name));
});

test('committed catalogue has unique slugs, unique variant keys and no impossible memory', () => {
  const { devices, brands } = JSON.parse(gunzipSync(readFileSync(new URL('../../scripts/data/device-catalogue.json.gz', import.meta.url))));
  const brandSlugs = new Set(brands.map((brand) => brand.slug));
  const keys = new Set();
  let total = 0;
  for (const device of devices) {
    assert.ok(brandSlugs.has(device.brand));
    assert.ok(device.variants.length > 0, device.slug);
    for (const variant of device.variants) {
      total++;
      keys.add(catalogueVariantKey(device.slug, device.network, variant));
      assert.ok(variant.ram === null || variant.ram > 0);
      assert.ok(variant.storage === null || variant.storage >= 1);
    }
  }
  assert.equal(new Set(devices.map((device) => device.slug)).size, devices.length);
  assert.equal(keys.size, total);
  assert.ok(devices.filter((d) => /Watch/.test(d.name)).every((d) => d.category === 'Wearables'));
});

test('filters narrow the selection', () => {
  const devices = [{ slug: 'a', brand: 'tecno', category: 'Smartphones', release_date: '2024-01-01' }, { slug: 'b', brand: 'hp', category: 'Laptops', release_date: '2016-01-01' }];
  assert.deepEqual(selectDevices(devices, { since: '2018' }).map((d) => d.slug), ['a']);
  assert.deepEqual(selectDevices(devices, { brands: ['hp'] }).map((d) => d.slug), ['b']);
  assert.deepEqual(selectDevices(devices, { imagesOnly: true, images: { b: {} } }).map((d) => d.slug), ['b']);
});
