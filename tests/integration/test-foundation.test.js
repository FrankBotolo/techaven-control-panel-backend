import test from 'node:test';
import assert from 'node:assert/strict';

test('integration tests run only with an explicit test database', () => {
  assert.match(process.env.DB_NAME || '', /(^|[_-])test([_-]|$)/i);
});
