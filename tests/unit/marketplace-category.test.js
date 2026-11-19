import test from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import { marketplaceCategoryFilter } from '../../services/marketplace/category-filter.js';
test('Loans filters seller offers without replacing the device category', () => {
  const filter = marketplaceCategoryFilter({ id: 5, name: 'Loans' });
  assert.deepEqual(filter.deviceWhere, {});
  assert.match(filter.listingWhere.id[Op.in].val, /category_id = 5/);
  assert.deepEqual(marketplaceCategoryFilter({ id: 1, name: 'Smartphones' }).deviceWhere, { category_id: 1 });
});
test('Loans rejects unsafe SQL category identities', () => {
  assert.throws(() => marketplaceCategoryFilter({ id: '5 OR 1=1', name: 'Loans' }));
});
