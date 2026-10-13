import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStockEntry } from '../../scripts/backfill-stock-photos.js';
const entry = { slug: 'laptop-dell-precision-5550', model: 'Dell Precision 5550', brand: 'dell',
  source_page_title: 'Precision 5550 Workstation', match_scope: 'exact model family',
  source_page: 'https://www.dell.com/product/5550', image_url: 'https://i.dell.com/5550.png' };
test('stock photos require identity and traced source evidence', () => {
  assert.doesNotThrow(() => validateStockEntry(entry));
  assert.throws(() => validateStockEntry({ ...entry, source_page_title: '' }));
  assert.throws(() => validateStockEntry({ ...entry, image_url: 'https://i.dell.com.attacker.test/image.png' }));
  assert.throws(() => validateStockEntry({ ...entry, image_url: 'http://i.dell.com/image.png' }));
  assert.throws(() => validateStockEntry({ ...entry, image_url: 'https://user:password@i.dell.com/image.png' }));
});
test('only the documented Microsoft and Lenovo CDNs are accepted', () => {
  assert.doesNotThrow(() => validateStockEntry({ ...entry, brand: 'microsoft', source_page: 'https://www.microsoft.com/surface', image_url: 'https://img-prod-cms-rt-microsoft-com.akamaized.net/photo.jpg' }));
  assert.throws(() => validateStockEntry({ ...entry, brand: 'microsoft', source_page: 'https://www.microsoft.com/surface', image_url: 'https://other.akamaized.net/photo.jpg' }));
});
