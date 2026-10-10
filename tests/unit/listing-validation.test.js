import test from 'node:test';
import assert from 'node:assert/strict';
import { validateListingInput } from '../../services/marketplace/listings.js';

test('accepts a valid new listing without seller images', () => {
  assert.equal(validateListingInput({ price: 940000, quantity: 3, condition: 'new' }).currency, 'MWK');
});
test('requires evidence images for used listings', () => {
  assert.throws(() => validateListingInput({ price: 10, quantity: 1, condition: 'used' }, 0), { code: 'LISTING_IMAGE_REQUIRED' });
});
test('rejects invalid price and quantity', () => {
  assert.throws(() => validateListingInput({ price: 0, quantity: 1, condition: 'new' }), { code: 'INVALID_PRICE' });
  assert.throws(() => validateListingInput({ price: 10, quantity: -1, condition: 'new' }), { code: 'INVALID_QUANTITY' });
});
