import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalVariantKey, normalizeNetwork, slugify, variantAxes } from '../../services/catalogue/normalization.js';

test('slugify creates stable URL identifiers', () => assert.equal(slugify(' Galaxy S25 Ultra '), 'galaxy-s25-ultra'));
test('normalizes network values', () => assert.equal(normalizeNetwork('LTE / 5g capable'), '5G'));
test('canonical keys normalize equivalent values', () => {
  assert.equal(canonicalVariantKey('Galaxy A26', { ram_gb: 8, storage_gb: 256, network_generation: '5g', region: 'Global' }), 'galaxy-a26|8|256|5G|global|na');
});
test('variant axes include only changing selection fields', () => {
  assert.deepEqual(variantAxes([{ ram_gb: 8, storage_gb: 128 }, { ram_gb: 8, storage_gb: 256 }]), ['storage_gb']);
});
