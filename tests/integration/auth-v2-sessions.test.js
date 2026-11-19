import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import sequelize from '../../config/database.js';
import User from '../../models/User.js';
import { AuthSession, AuthRefreshToken } from '../../models/AuthSession.js';
import { up } from '../../database/migrations-js/202610120001-create-auth-v2.js';
import { createSession, rotateSession, authenticateV2, revokeSession } from '../../services/auth/sessions.js';
import { hash, ISSUER, AUDIENCE } from '../../services/auth/config.js';

let user;
before(async () => {
  assert.match(process.env.DB_NAME || '', /(^|[_-])test([_-]|$)/i);
  process.env.AUTH_V2_JWT_SECRET = 'integration-test-only-signing-secret-not-for-deployment';
  await sequelize.query('CREATE TABLE IF NOT EXISTS shops (id INT PRIMARY KEY)');
  await User.sync();
  await up({ queryInterface: sequelize.getQueryInterface() });
  user = await User.create({ name: 'Session Test', email: `session-${Date.now()}@example.test`, password: 'test-session-password', role: 'customer', is_active: true, email_verified_at: new Date() });
});
after(async () => { if (user) await user.destroy(); await sequelize.close(); });

test('sessions issue fifteen-minute access and hashed opaque refresh tokens', async () => {
  const issued = await sequelize.transaction(t => createSession(user, t));
  assert.equal(issued.payload.expires_in, 900);
  assert.equal('refresh_token' in issued.payload, false);
  const claims = jwt.verify(issued.payload.access_token, process.env.AUTH_V2_JWT_SECRET, { issuer: ISSUER, audience: AUDIENCE });
  assert.equal(claims.exp - claims.iat, 900); assert.equal(claims.type, 'access');
  const stored = await AuthRefreshToken.findByPk(hash(issued.refresh));
  assert.ok(stored); assert.notEqual(stored.hash, issued.refresh);
  assert.equal((await authenticateV2(issued.payload.access_token)).user.id, user.id);
  const rotated = await rotateSession(issued.refresh);
  assert.notEqual(rotated.refresh, issued.refresh); assert.equal(String(rotated.expiresAt), String(issued.expiresAt));
  await assert.rejects(() => rotateSession(issued.refresh), { code: 'SESSION_INVALID' });
  await assert.rejects(() => authenticateV2(rotated.payload.access_token), { code: 'SESSION_INVALID' });
  await assert.rejects(() => rotateSession(rotated.refresh), { code: 'SESSION_INVALID' });
});
test('logout revokes the active access and refresh credentials', async () => {
  const issued = await sequelize.transaction(t => createSession(user, t));
  await revokeSession(issued.refresh);
  await assert.rejects(() => authenticateV2(issued.payload.access_token), { code: 'SESSION_INVALID' });
  await assert.rejects(() => rotateSession(issued.refresh), { code: 'SESSION_INVALID' });
  await revokeSession('unknown');
});
test('concurrent rotation cannot issue two valid sessions from one refresh token', async () => {
  const issued = await sequelize.transaction(t => createSession(user, t));
  const results = await Promise.allSettled([rotateSession(issued.refresh), rotateSession(issued.refresh)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 1);
  const session = await AuthSession.findByPk(jwt.decode(issued.payload.access_token).sid);
  assert.ok(session.revoked_at);
});
test('wrong issuer, audience, type, expired tokens and deactivated accounts are rejected', async () => {
  const issued = await sequelize.transaction(t => createSession(user, t));
  const claims = jwt.decode(issued.payload.access_token);
  for (const overrides of [{ type: 'refresh' }, { iss: 'other' }, { aud: 'other' }]) {
    const token = jwt.sign({ id: user.id, sid: claims.sid, type: 'access', version: 2, iss: ISSUER, aud: AUDIENCE, ...overrides }, process.env.AUTH_V2_JWT_SECRET);
    await assert.rejects(() => authenticateV2(token), { code: 'SESSION_INVALID' });
  }
  const expired = jwt.sign({ id: user.id, sid: claims.sid, type: 'access', version: 2 }, process.env.AUTH_V2_JWT_SECRET, { issuer: ISSUER, audience: AUDIENCE, expiresIn: -1 });
  await assert.rejects(() => authenticateV2(expired), { code: 'ACCESS_EXPIRED' });
  await user.update({ is_active: false });
  await assert.rejects(() => authenticateV2(issued.payload.access_token), { code: 'ACCOUNT_UNAVAILABLE' });
  await assert.rejects(() => rotateSession(issued.refresh), { code: 'SESSION_INVALID' });
  await user.update({ is_active: true });
  const other = await sequelize.transaction(t => createSession(user, t));
  const sid = jwt.decode(other.payload.access_token).sid;
  await AuthSession.update({ expires_at: new Date(Date.now() - 1000) }, { where: { id: sid } });
  await assert.rejects(() => rotateSession(other.refresh), { code: 'SESSION_INVALID' });
});
