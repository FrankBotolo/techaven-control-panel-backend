import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeListingDetails } from '../../services/marketplace/listings.js';

test('seller facts remain editable while private existing metadata is preserved', () => {
  const existing = { seed_unit: 'unit-a', private_source: 'source-reference', tax_exclusive: true };
  const result = sanitizeListingDetails({ warranty_available: true, condition_details: { battery_health_percent: 87 }, seed_unit: 'forged' }, existing);
  assert.equal(result.seed_unit, 'unit-a');
  assert.equal(result.private_source, 'source-reference');
  assert.equal(result.tax_exclusive, undefined);
  assert.equal(result.warranty_available, true);
  assert.equal(result.condition_details.battery_health_percent, 87);
  assert.throws(() => sanitizeListingDetails({ condition_details: { battery_health_percent: 101 } }));
});
