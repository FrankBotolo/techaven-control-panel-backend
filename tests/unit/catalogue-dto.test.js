import test from 'node:test';
import assert from 'node:assert/strict';
import { toDeviceDto } from '../../services/catalogue/dto.js';

test('marketplace DTO separates variants and price-sorted seller offers', () => {
  const device = { id: 1, slug: 'phone', name: 'Phone', variants: [{ id: 2, ram_gb: 8, storage_gb: 256, colors: [], seller_listings: [{ id: 4, price: '20.00', quantity: 1, images: [] }, { id: 3, price: '10.00', quantity: 2, images: [] }] }], media: [] };
  const dto = toDeviceDto(device, { includeOffers: true });
  assert.equal(dto.variants.length, 1);
  assert.deepEqual(dto.offers.map((offer) => offer.id), [3, 4]);
});
