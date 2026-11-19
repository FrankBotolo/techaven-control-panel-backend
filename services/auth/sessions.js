import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import sequelize from '../../config/database.js';
import User from '../../models/User.js';
import { AuthSession, AuthRefreshToken } from '../../models/AuthSession.js';
import { ACCESS_SECONDS, AUDIENCE, ISSUER, SESSION_MS, AuthError, hash, opaque, requireCustomer, signingSecret } from './config.js';

export function userDto(user) {
  return { id: user.id, name: user.name, email: user.email, phone_number: user.phone_number,
    avatar: user.avatar_url || null, is_verified: user.is_verified, role: user.role,
    shop_id: user.shop_id ?? null, points: user.points ?? 0,
    created_at: user.createdAt,
    member_since: new Date(user.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' }) };
}
export function accessPayload(user, session) {
  return { access_token: jwt.sign({ id: user.id, sid: session.id, type: 'access', version: 2 }, signingSecret(),
    { algorithm: 'HS256', expiresIn: ACCESS_SECONDS, issuer: ISSUER, audience: AUDIENCE }),
  token_type: 'Bearer', expires_in: ACCESS_SECONDS, user: userDto(user) };
}
export async function createSession(user, transaction) {
  signingSecret(); requireCustomer(user);
  const session = await AuthSession.create({ id: randomUUID(), user_id: user.id, expires_at: new Date(Date.now() + SESSION_MS) }, { transaction });
  const refresh = opaque();
  await AuthRefreshToken.create({ hash: hash(refresh), session_id: session.id }, { transaction });
  return { payload: accessPayload(user, session), refresh, expiresAt: session.expires_at };
}
export async function rotateSession(refresh) {
  signingSecret();
  if (!refresh || !/^[\w-]{43}$/.test(refresh)) throw new AuthError('SESSION_INVALID', 'Please sign in again', 401);
  // Lock user before session/token, consistent with password reset and credential checks.
  const known = await AuthRefreshToken.findByPk(hash(refresh));
  if (!known) throw new AuthError('SESSION_INVALID', 'Please sign in again', 401);
  const knownSession = await AuthSession.findByPk(known.session_id);
  if (!knownSession) throw new AuthError('SESSION_INVALID', 'Please sign in again', 401);
  const result = await sequelize.transaction(async transaction => {
    const user = await User.findByPk(knownSession.user_id, { transaction, lock: transaction.LOCK.UPDATE });
    const session = await AuthSession.findByPk(known.session_id, { transaction, lock: transaction.LOCK.UPDATE });
    const token = await AuthRefreshToken.findByPk(known.hash, { transaction, lock: transaction.LOCK.UPDATE });
    if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) return null;
    if (token.used_at) { await session.update({ revoked_at: new Date() }, { transaction }); return null; }
    if (!user || !user.is_active || user.role !== 'customer') { await session.update({ revoked_at: new Date() }, { transaction }); return null; }
    await token.update({ used_at: new Date() }, { transaction });
    const next = opaque();
    await AuthRefreshToken.create({ hash: hash(next), session_id: session.id }, { transaction });
    return { payload: accessPayload(user, session), refresh: next, expiresAt: session.expires_at };
  });
  if (!result) throw new AuthError('SESSION_INVALID', 'Please sign in again', 401);
  return result;
}
export async function authenticateV2(token) {
  let claims;
  try { claims = jwt.verify(token, signingSecret(), { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE }); }
  catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(error.name === 'TokenExpiredError' ? 'ACCESS_EXPIRED' : 'SESSION_INVALID', 'Please sign in again', 401);
  }
  if (claims.type !== 'access' || claims.version !== 2 || !claims.sid) throw new AuthError('SESSION_INVALID', 'Please sign in again', 401);
  const session = await AuthSession.findByPk(claims.sid);
  if (!session || session.user_id !== claims.id || session.revoked_at || new Date(session.expires_at) <= new Date()) throw new AuthError('SESSION_INVALID', 'Please sign in again', 401);
  const user = requireCustomer(await User.findByPk(claims.id));
  return { user, session };
}
export async function revokeSession(refresh) {
  if (!refresh) return;
  const token = await AuthRefreshToken.findByPk(hash(refresh));
  if (token) await AuthSession.update({ revoked_at: new Date() }, { where: { id: token.session_id } });
}
