import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticateCommerceSync } from '../../middleware/commerceSyncAuth.js';

function response() {
  return {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('commerce sync authentication fails closed when unconfigured', () => {
  const prior = process.env.COMMERCE_SYNC_TOKEN;
  delete process.env.COMMERCE_SYNC_TOKEN;
  const res = response();
  let called = false;
  authenticateCommerceSync({ headers: { authorization: 'Bearer token' } }, res, () => { called = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(called, false);
  if (prior === undefined) delete process.env.COMMERCE_SYNC_TOKEN;
  else process.env.COMMERCE_SYNC_TOKEN = prior;
});

test('commerce sync authentication accepts only the configured bearer token', () => {
  const prior = process.env.COMMERCE_SYNC_TOKEN;
  process.env.COMMERCE_SYNC_TOKEN = 'test-commerce-token';
  const rejected = response();
  authenticateCommerceSync({ headers: { authorization: 'Bearer wrong' } }, rejected, () => assert.fail('must reject'));
  assert.equal(rejected.statusCode, 401);

  const accepted = response();
  let called = false;
  authenticateCommerceSync({ headers: { authorization: 'Bearer test-commerce-token' } }, accepted, () => { called = true; });
  assert.equal(called, true);
  if (prior === undefined) delete process.env.COMMERCE_SYNC_TOKEN;
  else process.env.COMMERCE_SYNC_TOKEN = prior;
});
