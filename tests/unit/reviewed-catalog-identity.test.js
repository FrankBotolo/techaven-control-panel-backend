import test from 'node:test';
import assert from 'node:assert/strict';
import { planReviewedMerges, reviewedCanonicalSlug } from '../../services/catalogue/reviewedIdentity.js';

const global5g = 'xiaomi-redmi-note-14-5g-standard-edition-global-dual-sim-td-lte-256gb-24094rad4g-xiaomi-beryl';
const device = (slug, battery_mah, soc, id, brand = 'xiaomi') =>
  ({ id, slug, battery_mah, soc, category_id: 1, is_active: true, brand: { slug: brand } });

test('reviewed Redmi alias uses the same model key on onboarding and cleanup', () => {
  const source = device(global5g, 5110, 'mediatek-dimensity-7025-mt6855v-atza', 1);
  const target = device('redmi-note-14-5g', 5110, '0', 2);
  const lte = device('redmi-note-14-4g', 5500, 'mediatek-helio', 3);
  assert.equal(reviewedCanonicalSlug('xiaomi', source.slug), target.slug);
  assert.equal(reviewedCanonicalSlug('xiaomi', lte.slug), lte.slug);
  assert.deepEqual(planReviewedMerges([source, target, lte]).merges.map(({ source, target }) => ({ source, target })), [{ source, target }]);
  assert.deepEqual(planReviewedMerges([{ ...source, is_active: false, canonical_device_id: 2 }, target, lte]).merges, []);
});

test('conflicting hardware, brand, and ambiguous AirPods stay separate', () => {
  const target = device('redmi-note-14-5g', 5110, '0', 2);
  const source = device(global5g, 6000, 'mediatek-dimensity-7025-mt6855v-atza', 1);
  const devices = [source, target, device('airpods-gen-4', null, null, 3, 'apple')];
  const report = planReviewedMerges(devices);
  assert.equal(report.merges.length, 0);
  assert.equal(report.ambiguous.length, 2);
  assert.notEqual(reviewedCanonicalSlug('apple', 'airpods-4'), reviewedCanonicalSlug('apple', 'airpods-4-anc'));
  assert.equal(reviewedCanonicalSlug('another-brand', global5g), global5g);
});
