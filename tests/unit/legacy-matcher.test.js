import test from 'node:test';
import assert from 'node:assert/strict';
import { bestLegacyCandidate } from '../../services/catalogue/legacyMatcher.js';

test('confirms only a unique high-confidence legacy match', () => {
  const product = { name: 'Galaxy A26 8GB RAM 256GB Storage 5G', vendor: 'Samsung', specifications: { ram_gb: 8, storage_gb: 256 } };
  const variants = [{ id: 1, ram_gb: 8, storage_gb: 256, network_generation: '5G', device: { name: 'Galaxy A26 8GB RAM 256GB Storage 5G', brand: { name: 'Samsung' } } }];
  assert.equal(bestLegacyCandidate(product, variants).highConfidence, true);
});

test('leaves tied matches for review', () => {
  const product = { name: 'Phone', vendor: 'Brand' };
  const variants = [1, 2].map((id) => ({ id, device: { name: 'Phone', brand: { name: 'Brand' } } }));
  assert.equal(bestLegacyCandidate(product, variants).highConfidence, false);
});
