import test from 'node:test';
import assert from 'node:assert/strict';
import { assertFinalPrice } from '../../services/marketplace/final-price.js';
test('tax-exclusive quotes cannot be charged as final prices', () => {
  assert.throws(() => assertFinalPrice({ details: { tax_exclusive: true } }), { code: 'FINAL_PRICE_REQUIRED' });
  assert.doesNotThrow(() => assertFinalPrice({ details: { tax_exclusive: false } }));
  assert.doesNotThrow(() => assertFinalPrice({}));
});
