import { randomInt, randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import { AuthChallenge } from '../../models/AuthSession.js';
import { AuthError, equalHash, hash, opaque } from './config.js';
import { sendOtpEmail } from '../emailService.js';
export const challengeDelivery = { send: sendOtpEmail };

export async function rateLimit(scope, identifier, limit = 10, seconds = 900) {
  // Local development switch: set AUTH_RATE_LIMIT_DISABLED=true (ignored in production).
  if (process.env.AUTH_RATE_LIMIT_DISABLED === 'true' && process.env.NODE_ENV !== 'production') return;
  const key = hash(`${scope}:${identifier}`);
  const blocked = await sequelize.transaction(async transaction => {
    await sequelize.query('INSERT IGNORE INTO auth_v2_rate_limits (`key`, `count`, expires_at) VALUES (?, 0, ?)',
      { replacements: [key, new Date(Date.now() + seconds * 1000)], transaction });
    const [rows] = await sequelize.query('SELECT `count`, expires_at FROM auth_v2_rate_limits WHERE `key` = ? FOR UPDATE', { replacements: [key], transaction });
    const expired = new Date(rows[0].expires_at) <= new Date();
    const count = expired ? 1 : rows[0].count + 1;
    await sequelize.query('UPDATE auth_v2_rate_limits SET `count` = ?, expires_at = ? WHERE `key` = ?',
      { replacements: [count, expired ? new Date(Date.now() + seconds * 1000) : rows[0].expires_at, key], transaction });
    return count > limit;
  });
  if (blocked) throw new AuthError('RATE_LIMITED', 'Too many attempts. Please try again later', 429);
}
export async function createChallenge(type, { userId, identifier, data, secret = opaque(), milliseconds = 600000, transaction } = {}) {
  const row = await AuthChallenge.create({ id: randomUUID(), type, user_id: userId ?? null,
    identifier: identifier ?? null, data: data ?? null, secret_hash: hash(secret), expires_at: new Date(Date.now() + milliseconds) }, { transaction });
  return { row, secret };
}
export async function sendCode(user, type) {
  await rateLimit(`send:${type}`, user.email, 3, 600);
  // Serialize issuing codes for the same user so only the newest challenge remains usable.
  const code = String(randomInt(100000, 1000000));
  const row = await sequelize.transaction(async transaction => {
    const User = (await import('../../models/User.js')).default;
    await User.findByPk(user.id, { transaction, lock: transaction.LOCK.UPDATE });
    await AuthChallenge.update({ consumed_at: new Date() }, { where: { user_id: user.id, type, consumed_at: null }, transaction });
    return AuthChallenge.create({ id: randomUUID(), type, user_id: user.id, identifier: user.email,
      secret_hash: hash(code), expires_at: new Date(Date.now() + 600000) }, { transaction });
  });
  // Local development: print the code instead of failing when email can't be sent (ignored in production).
  const devLog = process.env.AUTH_DEV_LOG_OTP === 'true' && process.env.NODE_ENV !== 'production';
  if (devLog) console.log('[dev] ' + type + ' code for ' + user.email + ': ' + code);
  try {
    const delivered = await challengeDelivery.send(user.email, code, type, 10).catch(() => false);
    if (!delivered && devLog) return;
    if (!delivered) throw new Error('Email delivery failed');
  }
  catch {
    await row.update({ consumed_at: new Date() });
    throw new AuthError('DELIVERY_UNAVAILABLE', 'We could not send the verification email. Please try again', 503);
  }
}
// Return failures from transactions before throwing so failed attempts are persisted.
export async function consumeChallenge({ id, identifier, type, secret }, action) {
  if ((!id && !identifier) || (id && !/^[\da-f-]{36}$/i.test(id))) throw new AuthError('CHALLENGE_INVALID', 'This verification has expired. Please start again', 401);
  const where = { type, ...(id ? { id } : { identifier, consumed_at: null }) };
  const candidate = await AuthChallenge.findOne({ where, order: [['createdAt', 'DESC']] });
  if (!candidate) throw new AuthError('CHALLENGE_INVALID', 'This verification has expired. Please start again', 401);
  const result = await sequelize.transaction(async transaction => {
    if (candidate.user_id) {
      const User = (await import('../../models/User.js')).default;
      await User.findByPk(candidate.user_id, { transaction, lock: transaction.LOCK.UPDATE });
    }
    const row = await AuthChallenge.findByPk(candidate.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row || row.consumed_at || new Date(row.expires_at) <= new Date() || row.attempts >= 5) return { error: new AuthError('CHALLENGE_INVALID', 'This verification has expired. Please start again', 401) };
    await row.update({ attempts: row.attempts + 1 }, { transaction });
    if (!equalHash(row.secret_hash, hash(typeof secret === 'string' ? secret : ''))) return { error: new AuthError('CHALLENGE_INVALID', 'Incorrect verification code', 401) };
    try {
      const value = await action(row, transaction);
      await row.update({ consumed_at: new Date() }, { transaction });
      return { value };
    } catch (error) {
      if (error instanceof AuthError) return { error };
      throw error;
    }
  });
  if (result.error) throw result.error;
  return result.value;
}

export async function cleanupAuth() {
  // Keep used refresh tokens until their session expires so reuse remains detectable.
  const { AuthSession, AuthRateLimit } = await import('../../models/AuthSession.js');
  const before = new Date(Date.now() - 86400000);
  await AuthSession.destroy({ where: { expires_at: { [Op.lt]: before } } });
  await AuthChallenge.destroy({ where: { expires_at: { [Op.lt]: before } } });
  await AuthRateLimit.destroy({ where: { expires_at: { [Op.lt]: before } } });
}
