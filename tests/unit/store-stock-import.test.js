import test from 'node:test';
import assert from 'node:assert/strict';
import { planStoreStock, rewriteMedia } from '../../services/catalogue/store-stock-import.js';

const fixture = () => ({
  bundle: { version: 1,
    shops: [{ source_id: 8, name: 'Reviewed Shop', phone: '123', status: 'active', application_status: 'approved', total_sales: 99, owner_id: 77 }],
    listings: [{ source_id: 90, shop_source_id: 8, device_slug: 'example-phone', variant_key: 'example-phone|128',
      variant_facts: { storage_gb: 128, attributes: { network: 'LTE' } }, color: null,
      condition: 'new', price: '500.00', quantity: 3, currency: 'MWK', status: 'active', details: null,
      images: [{ url: 'https://example.com/image.jpg', id: 100, listing_id: 90 }] }],
  },
  target: { shops: [], listings: [], devices: [{ id: 101, slug: 'example-phone', is_active: true }],
    variants: [{ id: 202, device_id: 101, canonical_key: 'example-phone|128', storage_gb: 128, attributes: { network: 'LTE' }, is_active: true }], colors: [] },
});

test('selective import remaps catalogue IDs and never copies users, sales or source IDs', () => {
  const { bundle, target } = fixture();
  const original = JSON.stringify({ bundle, target });
  const plan = planStoreStock(bundle, target);
  assert.equal(plan.listings[0].device_variant_id, 202);
  assert.equal(plan.listings[0].values.quantity, 3);
  assert.equal(plan.listings[0].values.price, '500.00');
  assert.equal(plan.shops[0].values.total_sales, undefined);
  assert.equal(plan.shops[0].values.owner_id, undefined);
  assert.equal(plan.listings[0].images[0].id, undefined);
  assert.equal(plan.listings[0].images[0].listing_id, undefined);
  assert.equal(JSON.stringify({ bundle, target }), original);
});

test('missing exact catalogue matches are held rather than creating products or choosing similar variants', () => {
  const { bundle, target } = fixture();
  target.variants[0].canonical_key = 'different';
  assert.equal(planStoreStock(bundle, target).held.length, 1);
  assert.equal(planStoreStock(bundle, target).listings.length, 0);
  target.variants[0].canonical_key = bundle.listings[0].variant_key;
  target.variants[0].storage_gb = 256;
  assert.match(planStoreStock(bundle, target).held[0].reason, /specifications differ/);
  target.devices[0].slug = 'other-phone';
  assert.match(planStoreStock(bundle, target).held[0].reason, /product slug/);
});

test('reruns skip identical offers and preserve changed production stock or prices', () => {
  const { bundle, target } = fixture();
  target.shops = [{ id: 900, name: ' reviewed shop ', phone: '123' }];
  const first = planStoreStock(bundle, target).listings[0];
  target.listings = [{ ...first.values, id: 555, shop_id: 900, device_variant_id: 202, device_variant_color_id: null }];
  let plan = planStoreStock(bundle, target);
  assert.equal(plan.existing.length, 1);
  assert.equal(plan.shops.length + plan.listings.length + plan.held.length, 0);
  target.listings[0].quantity = 1;
  plan = planStoreStock(bundle, target);
  assert.equal(plan.held.length, 1);
  assert.equal(target.listings[0].quantity, 1);
});

test('conflicting shop contacts and colors cannot silently attach inventory', () => {
  const { bundle, target } = fixture();
  target.shops = [{ id: 900, name: 'Reviewed Shop', phone: 'different' }];
  assert.equal(planStoreStock(bundle, target).listings.length, 0);
  target.shops = [];
  bundle.listings[0].color = { slug: 'black', color_slug: 'black', manufacturer_name: 'Black' };
  assert.match(planStoreStock(bundle, target).held[0].reason, /color/);
});

test('duplicate identity and malformed stock fail before any write', () => {
  const { bundle, target } = fixture();
  bundle.listings.push({ ...bundle.listings[0], source_id: 91 });
  assert.equal(planStoreStock(bundle, target).listings.length, 1);
  assert.equal(planStoreStock(bundle, target).held.length, 1);
  bundle.listings[0].quantity = -1;
  assert.throws(() => planStoreStock(bundle, target), /positive stock/);
});

test('only local commerce media paths change; manufacturer media stays untouched', () => {
  const original = { logo: 'http://localhost:8000/uploads/shops/a.png', profile: { gallery: ['https://manufacturer.example/a.png'] } };
  const changed = rewriteMedia(original, 'https://api.techavenmw.com/uploads');
  assert.equal(changed.logo, 'https://api.techavenmw.com/uploads/shops/a.png');
  assert.equal(changed.profile.gallery[0], original.profile.gallery[0]);
  assert.equal(original.logo, 'http://localhost:8000/uploads/shops/a.png');
});
