import { Op } from 'sequelize';
import { OAuth2Client } from 'google-auth-library';
import sequelize from '../../config/database.js';
import User from '../../models/User.js';
import { AuthSession } from '../../models/AuthSession.js';
import { AuthError, emailValue, passwordValue, requireCustomer, signingSecret } from './config.js';
import { createChallenge, consumeChallenge, rateLimit, sendCode } from './challenges.js';
import { createSession } from './sessions.js';
export const googleIdentity = {
  verify: async (idToken, audience) => {
    const ticket = await new OAuth2Client(audience).verifyIdToken({ idToken, audience });
    return ticket.getPayload();
  }
};

const credentialError = () => new AuthError('INVALID_CREDENTIALS', 'Email or password is incorrect', 401);
export async function loginCustomer(body) {
  signingSecret();
  const email = emailValue(body.email);
  await rateLimit('login', email);
  return sequelize.transaction(async transaction => {
    const user = await User.findOne({ where: { email }, transaction, lock: transaction.LOCK.UPDATE });
    if (!user?.password || typeof body.password !== 'string' || Buffer.byteLength(body.password) > 72 || !(await user.comparePassword(body.password))) throw credentialError();
    requireCustomer(user);
    if (!user.email_verified_at) throw new AuthError('EMAIL_UNVERIFIED', 'Verify your email before signing in', 403);
    return createSession(user, transaction);
  });
}
export async function registerCustomer(body) {
  signingSecret();
  const email = emailValue(body.email);
  const password = passwordValue(body.password);
  const name = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  if (!name || name.length > 120) throw new AuthError('VALIDATION_ERROR', 'Enter your full name', 400, { full_name: 'Enter your full name' });
  await rateLimit('register', email, 3, 600);
  let user = await User.findOne({ where: { email } });
  if (!user) {
    const phone = typeof body.phone_number === 'string' ? body.phone_number.trim() : '';
    if (phone && !/^\+?[0-9 ()-]{7,25}$/.test(phone)) throw new AuthError('VALIDATION_ERROR', 'Enter a valid phone number', 400, { phone_number: 'Enter a valid phone number' });
    try { user = await User.create({ name, email, password, phone_number: phone || null, role: 'customer', is_verified: false }); }
    catch (error) { if (error.name === 'SequelizeUniqueConstraintError') throw new AuthError('REGISTRATION_UNAVAILABLE', 'Unable to register with these details. Try signing in or recovering your account', 409); throw error; }
  }
  // Never replace credentials on an existing account through registration.
  if (user.role === 'customer' && user.is_active && !user.email_verified_at) await sendCode(user, 'signup');
  return { message: 'If these details are eligible, a verification code has been sent by email and SMS' };
}
export async function verifySignup(body) {
  signingSecret();
  if (body.type !== 'signup') throw new AuthError('VALIDATION_ERROR', 'Choose signup verification');
  const email = emailValue(body.email);
  await rateLimit('verify', email);
  return consumeChallenge({ identifier: email, type: 'signup', secret: body.otp }, async (row, transaction) => {
    const user = requireCustomer(await User.findByPk(row.user_id, { transaction, lock: transaction.LOCK.UPDATE }));
    await user.update({ email_verified_at: new Date(), is_verified: true }, { transaction });
    return createSession(user, transaction);
  });
}
export async function requestCode(body, type) {
  const email = emailValue(body.email);
  await rateLimit(`request:${type}`, email, 3, 600);
  const user = await User.findOne({ where: { email } });
  if (user?.is_active && user.role === 'customer' && (type === 'password_reset' || !user.email_verified_at)) {
    try { await sendCode(user, type); }
    catch (error) {
      // Recovery responses must not disclose whether the account exists, even on delivery failure.
      if (!['DELIVERY_UNAVAILABLE', 'RATE_LIMITED'].includes(error.code)) throw error;
      console.warn('Auth v2 verification code not sent:', error.code);
    }
  }
  return { message: 'If this account is eligible, a verification code has been sent by email and SMS' };
}
export async function resetCustomerPassword(body) {
  const email = emailValue(body.email);
  const password = passwordValue(body.new_password);
  await rateLimit('reset', email);
  return consumeChallenge({ identifier: email, type: 'password_reset', secret: body.otp }, async (row, transaction) => {
    const user = requireCustomer(await User.findByPk(row.user_id, { transaction, lock: transaction.LOCK.UPDATE }));
    await user.update({ password, email_verified_at: new Date(), is_verified: true }, { transaction });
    await AuthSession.update({ revoked_at: new Date() }, { where: { user_id: user.id }, transaction });
    return { message: 'Password updated. Please sign in again' };
  });
}
export async function googleChallenge() {
  signingSecret();
  if (!process.env.GOOGLE_CLIENT_ID) throw new AuthError('GOOGLE_UNAVAILABLE', 'Google sign-in is not configured yet', 503);
  const { row, secret } = await createChallenge('google', { milliseconds: 300000 });
  return { challenge_id: row.id, nonce: secret, client_id: process.env.GOOGLE_CLIENT_ID };
}
export function validateGooglePayload(payload, nonce, clientId) {
  if (!payload || !payload.sub || payload.email_verified !== true || !payload.email || payload.nonce !== nonce ||
      payload.aud !== clientId || !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss) ||
      !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) {
    throw new AuthError('GOOGLE_TOKEN_INVALID', 'Google sign-in could not be verified. Please try again', 401);
  }
  return payload;
}
export async function googleCustomer(body) {
  signingSecret();
  if (!process.env.GOOGLE_CLIENT_ID) throw new AuthError('GOOGLE_UNAVAILABLE', 'Google sign-in is not configured yet', 503);
  if (typeof body.id_token !== 'string' || body.id_token.length > 12000 || typeof body.nonce !== 'string' || typeof body.challenge_id !== 'string') throw new AuthError('VALIDATION_ERROR', 'Google sign-in credentials are required');
  let payload;
  try { payload = validateGooglePayload(await googleIdentity.verify(body.id_token, process.env.GOOGLE_CLIENT_ID), body.nonce, process.env.GOOGLE_CLIENT_ID); }
  catch (error) { if (error instanceof AuthError) throw error; throw new AuthError('GOOGLE_TOKEN_INVALID', 'Google sign-in could not be verified. Please try again', 401); }
  return consumeChallenge({ id: body.challenge_id, type: 'google', secret: body.nonce }, async (row, transaction) => {
    let user = await User.findOne({ where: { google_id: payload.sub }, transaction, lock: transaction.LOCK.UPDATE });
    if (user) return createSession(requireCustomer(user), transaction);
    const email = emailValue(payload.email);
    user = await User.findOne({ where: { email }, transaction, lock: transaction.LOCK.UPDATE });
    if (user) {
      requireCustomer(user);
      if (user.google_id) throw new AuthError('GOOGLE_IDENTITY_CONFLICT', 'This account is linked to a different Google identity', 409);
      if (!user.password) throw new AuthError('ACCOUNT_RECOVERY_REQUIRED', 'Reset your password before linking this Google account', 409);
      const link = await createChallenge('google_link', { userId: user.id, data: { sub: payload.sub }, milliseconds: 300000, transaction });
      return { link_required: true, linking_challenge: `${link.row.id}.${link.secret}` };
    }
    user = await User.create({ name: String(payload.name || email.split('@')[0]).slice(0, 120), email, google_id: payload.sub,
      avatar_url: typeof payload.picture === 'string' ? payload.picture : null, password: null,
      role: 'customer', is_verified: true, email_verified_at: new Date() }, { transaction });
    return createSession(user, transaction);
  });
}
export async function linkGoogleCustomer(body) {
  signingSecret();
  if (typeof body.linking_challenge !== 'string' || typeof body.password !== 'string' || Buffer.byteLength(body.password) > 72) throw credentialError();
  const [id, secret] = body.linking_challenge.split('.');
  if (!id || !secret || body.linking_challenge.split('.').length !== 2) throw new AuthError('CHALLENGE_INVALID', 'This verification has expired. Please start again', 401);
  return consumeChallenge({ id, type: 'google_link', secret }, async (row, transaction) => {
    const user = requireCustomer(await User.findByPk(row.user_id, { transaction, lock: transaction.LOCK.UPDATE }));
    if (!user.password || !(await user.comparePassword(body.password))) throw credentialError();
    if (user.google_id && user.google_id !== row.data.sub) throw new AuthError('GOOGLE_IDENTITY_CONFLICT', 'This account is linked to another Google identity', 409);
    const conflict = await User.findOne({ where: { google_id: row.data.sub, id: { [Op.ne]: user.id } }, transaction });
    if (conflict) throw new AuthError('GOOGLE_IDENTITY_CONFLICT', 'This Google identity is already linked', 409);
    await user.update({ google_id: row.data.sub, email_verified_at: user.email_verified_at || new Date(), is_verified: true }, { transaction });
    return createSession(user, transaction);
  });
}
