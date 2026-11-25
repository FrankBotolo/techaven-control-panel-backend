import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import sequelize from '../../config/database.js';
import User from '../../models/User.js';
import { AuthChallenge, AuthRateLimit, AuthSession } from '../../models/AuthSession.js';
import { up } from '../../database/migrations-js/202610120001-create-auth-v2.js';
import authRoutes from '../../routes/v2/auth.js';
import { authenticate } from '../../middleware/auth.js';
import { challengeDelivery, createChallenge, rateLimit } from '../../services/auth/challenges.js';
import { googleIdentity } from '../../services/auth/customers.js';

test('customer auth endpoints, Google linking and legacy compatibility', async t => {
  assert.match(process.env.DB_NAME || '', /(^|[_-])test([_-]|$)/i);
  process.env.AUTH_V2_JWT_SECRET = 'integration-test-only-signing-secret-not-for-deployment';
  process.env.JWT_SECRET = 'legacy-integration-test-secret';
  process.env.GOOGLE_CLIENT_ID = 'test-web-client.apps.googleusercontent.com';
  process.env.AUTH_V2_ALLOWED_ORIGINS = 'http://localhost:3001,https://store.example';
  process.env.AUTH_V2_ALLOW_HTTP = 'true';
  await sequelize.query('CREATE TABLE IF NOT EXISTS shops (id INT PRIMARY KEY)');
  await User.sync(); await up({ queryInterface: sequelize.getQueryInterface() });
  await AuthRateLimit.destroy({ where: {} });
  const codes = new Map();
  const deliver = challengeDelivery.send;
  const deliverSms = challengeDelivery.sms;
  challengeDelivery.sms = async () => false;
  challengeDelivery.send = async (email, code, type, minutes) => { assert.match(code, /^\d{6}$/); assert.equal(minutes, 10); codes.set(`${email}:${type}`, code); return true; };
  const googleVerify = googleIdentity.verify;
  const googlePayloads = new Map();
  googleIdentity.verify = async token => { if (!googlePayloads.has(token)) throw new Error('invalid token'); return googlePayloads.get(token); };
  const app = express(); app.use(express.json()); app.use('/api/v2/auth', authRoutes);
  app.get('/api/legacy-private', authenticate, (req, res) => res.json({ success: true, data: { user_id: req.user.id } }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const suffix = Date.now(); const email = `auth-endpoints-${suffix}@example.test`;
  let session, cookie;
  const request = async (path, body, { origin = 'http://localhost:3001', token, refreshCookie, method = 'POST' } = {}) => {
    const response = await fetch(`${base}${path.startsWith('/api/') ? path : `/api/v2/auth${path}`}`, {
      method, headers: { ...(origin ? { Origin: origin } : {}), 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(refreshCookie ? { Cookie: refreshCookie } : {}) },
      ...(method !== 'GET' ? { body: JSON.stringify(body || {}) } : {})
    });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') };
  };
  const google = async (address, sub, extra = {}, origin) => {
    const challenge = await request('/google/challenge', {}, { origin });
    assert.equal(challenge.status, 200);
    const data = challenge.body.data;
    const token = `fake-${sub}-${data.challenge_id}`;
    googlePayloads.set(token, { sub, email: address, name: 'Google Customer', email_verified: true, nonce: data.nonce,
      aud: process.env.GOOGLE_CLIENT_ID, iss: 'https://accounts.google.com', exp: Math.floor(Date.now() / 1000) + 300, ...extra });
    const body = { id_token: token, nonce: data.nonce, challenge_id: data.challenge_id };
    return { response: await request('/google', body, { origin }), body };
  };
  try {
    await t.test('origin allowlist rejects missing and foreign origins', async () => {
      for (const origin of [undefined, 'https://attacker.test']) {
        const result = await request('/login', {}, { origin: origin ?? '' });
        assert.equal(result.status, 403); assert.equal(result.body.code, 'ORIGIN_FORBIDDEN');
      }
    });
    await t.test('registration fixes customer role, verifies six-digit OTP, and issues an HttpOnly cookie', async () => {
      const result = await request('/register', { email, full_name: 'Customer Auth Test', password: 'long-test-password', role: 'admin' });
      assert.equal(result.status, 200);
      const user = await User.findOne({ where: { email } }); assert.equal(user.role, 'customer');
      assert.notEqual(user.password, 'long-test-password');
      const rejected = await request('/login', { email, password: 'long-test-password' }); assert.equal(rejected.body.code, 'EMAIL_UNVERIFIED');
      const wrong = await request('/verify-otp', { email, otp: '000000', type: 'signup' }); assert.equal(wrong.status, 401);
      const verified = await request('/verify-otp', { email, otp: codes.get(`${email}:signup`), type: 'signup' });
      assert.equal(verified.status, 200); session = verified.body.data; cookie = verified.cookie.split(';')[0];
      assert.match(verified.cookie, /HttpOnly/); assert.match(verified.cookie, /Path=\/api\/v2\/auth/); assert.match(verified.cookie, /SameSite=Lax/); assert.doesNotMatch(verified.cookie, /Secure/);
      assert.equal('refresh_token' in session, false);
      assert.equal((await request('/verify-otp', { email, otp: codes.get(`${email}:signup`), type: 'signup' })).status, 401);
    });
    await t.test('v2 bearer sessions authenticate legacy private routes; v1 access survives but refresh bearer is rejected', async () => {
      const result = await request('/api/legacy-private', null, { method: 'GET', token: session.access_token });
      assert.equal(result.body.data.user_id, session.user.id);
      const legacy = jwt.sign({ id: session.user.id, type: 'access' }, process.env.JWT_SECRET);
      assert.equal((await request('/api/legacy-private', null, { method: 'GET', token: legacy })).status, 200);
      const legacyRefresh = jwt.sign({ id: session.user.id, type: 'refresh' }, process.env.JWT_SECRET);
      assert.equal((await request('/api/legacy-private', null, { method: 'GET', token: legacyRefresh })).status, 401);
    });
    await t.test('Google match requires password linking and retains the same customer ID', async () => {
      const first = await google(email, `google-existing-${suffix}`);
      assert.equal(first.response.body.data.link_required, true);
      assert.equal((await request('/google', first.body)).status, 401);
      const linking_challenge = first.response.body.data.linking_challenge;
      const wrong = await request('/google/link', { linking_challenge, password: 'wrong' }); assert.equal(wrong.status, 401);
      const linked = await request('/google/link', { linking_challenge, password: 'long-test-password' });
      assert.equal(linked.status, 200); assert.equal(linked.body.data.user.id, session.user.id);
      assert.equal((await request('/google/link', { linking_challenge, password: 'long-test-password' })).status, 401);
      const returning = await google(email, `google-existing-${suffix}`); assert.equal(returning.response.body.data.user.id, session.user.id);
      const conflicting = await google(email, `different-google-${suffix}`); assert.equal(conflicting.response.body.code, 'GOOGLE_IDENTITY_CONFLICT');
    });
    await t.test('Google creates a customer with Secure cookies on HTTPS and rejects invalid identities', async () => {
      const address = `auth-google-${suffix}@example.test`;
      const created = await google(address, `google-new-${suffix}`, {}, 'https://store.example');
      assert.equal(created.response.status, 200); assert.equal(created.response.body.data.user.role, 'customer'); assert.match(created.response.cookie, /Secure/);
      for (const extra of [{ email_verified: false }, { aud: 'wrong' }, { iss: 'wrong' }, { nonce: 'wrong' }, { exp: 1 }, { sub: '' }]) {
        const invalid = await google(`invalid-${suffix}@example.test`, `invalid-${suffix}`, extra); assert.equal(invalid.response.status, 401);
      }
      assert.equal((await request('/google', { id_token: 'invalid', nonce: 'test', challenge_id: 'test' })).status, 401);
      const unlinked = await User.create({ name: 'No password', email: `auth-nopass-${suffix}@example.test`, role: 'customer' });
      assert.equal((await google(unlinked.email, `nopass-${suffix}`)).response.body.code, 'ACCOUNT_RECOVERY_REQUIRED');
    });
    await t.test('Google and password storefront sign-in reject inactive and privileged accounts', async () => {
      for (const role of ['seller', 'admin', 'delivery_agent']) {
        const user = await User.create({ name: 'Role Test', email: `auth-${role}-${suffix}@example.test`, password: 'long-test-password', role, is_active: true, email_verified_at: new Date() });
        assert.equal((await request('/login', { email: user.email, password: 'long-test-password' })).status, 403);
        assert.equal((await google(user.email, `google-${role}-${suffix}`)).response.status, 403);
      }
      const user = await User.findByPk(session.user.id); await user.update({ is_active: false });
      assert.equal((await request('/me', null, { token: session.access_token, method: 'GET' })).status, 403);
      await user.update({ is_active: true });
    });
    await t.test('reset responses do not enumerate accounts; resetting revokes all sessions', async () => {
      const known = await request('/forgot-password', { email });
      const unknown = await request('/forgot-password', { email: `missing-${suffix}@example.test` });
      assert.deepEqual(known.body, unknown.body);
      challengeDelivery.send = async () => false;
      const failedDelivery = await request('/forgot-password', { email }); assert.deepEqual(failedDelivery.body, unknown.body);
      challengeDelivery.send = async (address, code) => { codes.set(`${address}:password_reset`, code); return true; };
      await request('/forgot-password', { email });
      const reset = await request('/reset-password', { email, otp: codes.get(`${email}:password_reset`), new_password: 'new-long-test-password' });
      assert.equal(reset.status, 200);
      assert.equal((await request('/refresh', {}, { refreshCookie: cookie })).status, 401);
      const active = await AuthSession.count({ where: { user_id: session.user.id, revoked_at: null } }); assert.equal(active, 0);
      assert.equal((await request('/login', { email, password: 'new-long-test-password' })).status, 200);
    });
    await t.test('five failed verification attempts lock a challenge and database counters persist limits', async () => {
      const challenge = await createChallenge('signup', { userId: session.user.id, identifier: email, secret: '654321' });
      for (let i = 0; i < 5; i++) assert.equal((await request('/verify-otp', { email, otp: '000000', type: 'signup' })).status, 401);
      assert.equal((await request('/verify-otp', { email, otp: '654321', type: 'signup' })).status, 401);
      assert.equal((await AuthChallenge.findByPk(challenge.row.id)).attempts, 5);
      await rateLimit('isolated-test', `${suffix}`, 1, 600);
      await assert.rejects(() => rateLimit('isolated-test', `${suffix}`, 1, 600), { code: 'RATE_LIMITED' });
    });
    await t.test('logout clears the cookie and immediately revokes access', async () => {
      const logged = await request('/login', { email, password: 'new-long-test-password' });
      const response = await request('/logout', {}, { refreshCookie: logged.cookie.split(';')[0] });
      assert.equal(response.status, 200); assert.match(response.cookie, /Expires=Thu, 01 Jan 1970/);
      assert.equal((await request('/me', null, { token: logged.body.data.access_token, method: 'GET' })).status, 401);
    });
  } finally {
    challengeDelivery.send = deliver; challengeDelivery.sms = deliverSms; googleIdentity.verify = googleVerify;
    await new Promise(resolve => server.close(resolve));
    await User.destroy({ where: sequelize.where(sequelize.col('email'), 'LIKE', `%${suffix}@example.test`) });
    await sequelize.close();
  }
});
