import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLaptopRecord, sharedLaptopDevices } from '../../services/catalogue/importers/techapi/laptop.js';

const record = { slug: 'sample-row-1', base_model_slug: 'sample', name: 'Sample Laptop', brand: 'acer',
  cpu_name: 'Intel Core i5', gpu_name: 'Integrated', ram_gb: 8, storage_gb: 256,
  display: { size_inch: 14, touchscreen: false }, os: 'Windows', weight_g: 0, verified: false };
const normalize = (changes = {}) => normalizeLaptopRecord({ record: { ...record, ...changes }, relativePath: 'acer/2020/sample/row.json' }, 'revision');

test('preserves laptop configuration, false and zero without inventing cellular or model identity', () => {
  const result = normalize();
  assert.equal(result.device.slug, 'laptop-sample');
  assert.equal(result.variant.ram_gb, 8);
  assert.equal(result.variant.storage_gb, 256);
  assert.equal(result.variant.network_generation, null);
  assert.equal(result.variant.model_number, null);
  assert.equal(result.variant.attributes.configuration.display.touchscreen, false);
  assert.equal(result.variant.attributes.configuration.weight_g, 0);
  assert.equal(result.device.source_metadata.source_revision, 'revision');
});
test('CPU, GPU, display and storage differences remain distinct; identical configurations deduplicate', () => {
  const baseline = normalize().variant.canonical_key;
  for (const difference of [{ cpu_name: 'Intel Core i7' }, { gpu_name: 'RTX' }, { storage_gb: 512 }, { display: { size_inch: 15 } }]) {
    assert.notEqual(normalize(difference).variant.canonical_key, baseline);
  }
  assert.equal(normalize({ slug: 'duplicate-row' }).variant.canonical_key, baseline);
  assert.equal(normalize({ display: { touchscreen: false, size_inch: 14 } }).variant.canonical_key, baseline);
});
test('model families expose only shared specifications and keep per-variant processors', () => {
  const first = normalize();
  const second = normalize({ cpu_name: 'Intel Core i7', verified: true });
  const shared = sharedLaptopDevices([first, second]).get('laptop-sample');
  assert.equal(shared.soc, null);
  assert.equal(shared.specs.cpu_name, null);
  assert.equal(shared.os_family, 'Windows');
  assert.equal(shared.verification_status, 'verified');
  assert.equal(first.variant.attributes.configuration.cpu_name, 'Intel Core i5');
});
test('rejects missing laptop identity', () => {
  assert.equal(normalize({ base_model_slug: null }).error.code, 'INVALID_RECORD');
});
