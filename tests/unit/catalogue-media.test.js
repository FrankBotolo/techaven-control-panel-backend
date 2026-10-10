import test from 'node:test';
import assert from 'node:assert/strict';
import { rankMedia } from '../../services/catalogue/media.js';

test('exact color and variant media outranks generic device media', () => {
  const ranked = rankMedia([
    { id: 1, sort_order: 0, device_variant_id: null, device_variant_color_id: null },
    { id: 2, sort_order: 0, device_variant_id: 10, device_variant_color_id: 20 }
  ], 10, 20);
  assert.equal(ranked[0].id, 2);
});
