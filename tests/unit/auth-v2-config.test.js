import test from 'node:test';
import assert from 'node:assert/strict';
import { signingSecret, hash, opaque, equalHash, emailValue, passwordValue, requireCustomer, cookieOptions, originAllowed, readRefreshCookie } from '../../services/auth/config.js';
import { up } from '../../database/migrations-js/202610120001-create-auth-v2.js';

test('v2 auth fails closed without a dedicated strong secret', () => {
  const old = process.env.AUTH_V2_JWT_SECRET;
  delete process.env.AUTH_V2_JWT_SECRET;
  assert.throws(signingSecret, { code: 'AUTH_UNAVAILABLE', status: 503 });
  process.env.AUTH_V2_JWT_SECRET = 'short';
  assert.throws(signingSecret);
  process.env.AUTH_V2_JWT_SECRET = 'unit-test-secret-of-at-least-32-characters';
  assert.equal(signingSecret(), process.env.AUTH_V2_JWT_SECRET);
  if (old === undefined) delete process.env.AUTH_V2_JWT_SECRET; else process.env.AUTH_V2_JWT_SECRET = old;
});
test('opaque tokens and hashes preserve no raw credentials', () => {
  const token = opaque(); assert.match(token, /^[\w-]{43}$/);
  assert.equal(hash(token).length, 64); assert.notEqual(token, opaque());
  assert.equal(equalHash(hash(token), hash(token)), true);
  assert.equal(equalHash(hash(token), hash('other')), false);
});
test('customer inputs and roles are validated', () => {
  assert.equal(emailValue(' USER@Example.com '), 'user@example.com');
  assert.throws(() => emailValue('invalid'));
  assert.throws(() => passwordValue('short'));
  assert.throws(() => passwordValue('😀'.repeat(20)));
  assert.equal(passwordValue('a long test password'), 'a long test password');
  for (const role of ['seller', 'admin', 'delivery_agent']) assert.throws(() => requireCustomer({ role, is_active: true }));
  assert.throws(() => requireCustomer({ role: 'customer', is_active: false }));
});
test('cookies are host-only, HttpOnly, scoped and secure by default; origins match exactly', () => {
  const prior = process.env.AUTH_V2_ALLOW_HTTP;
  const origins = process.env.AUTH_V2_ALLOWED_ORIGINS;
  delete process.env.AUTH_V2_ALLOW_HTTP;
  assert.deepEqual(cookieOptions(), { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/v2/auth' });
  process.env.AUTH_V2_ALLOW_HTTP = 'true';
  process.env.AUTH_V2_ALLOWED_ORIGINS = 'http://localhost:3001,https://store.example';
  assert.equal(cookieOptions({ headers: { origin: 'http://localhost:3001' } }).secure, false);
  assert.equal(cookieOptions({ headers: { origin: 'https://store.example' } }).secure, true);
  assert.equal(cookieOptions({ headers: { origin: 'http://attacker.test' } }).secure, true);
  assert.equal(originAllowed('https://store.example'), true);
  assert.equal(originAllowed('https://store.example.attacker.test'), false);
  assert.equal(originAllowed(undefined), false);
  assert.equal(readRefreshCookie({ headers: { cookie: 'x=1; techaven_refresh_v2=abc; z=2' } }), 'abc');
  if (prior === undefined) delete process.env.AUTH_V2_ALLOW_HTTP; else process.env.AUTH_V2_ALLOW_HTTP = prior;
  if (origins === undefined) delete process.env.AUTH_V2_ALLOWED_ORIGINS; else process.env.AUTH_V2_ALLOWED_ORIGINS = origins;
});
test('auth migration creates only missing additive tables', async () => {
  const created = [], indices = [];
  const queryInterface = { showAllTables: async () => ['users'], createTable: async (name) => created.push(name), addIndex: async (name, fields) => indices.push([name, fields]) };
  await up({ queryInterface });
  assert.equal(created.length, 4); assert.equal(indices.length, 7);
  queryInterface.showAllTables = async () => ['users', ...created];
  await up({ queryInterface }); assert.equal(created.length, 4);
});
