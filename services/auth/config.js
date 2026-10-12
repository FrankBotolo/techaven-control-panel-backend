import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const ISSUER = 'techaven-auth-v2';
export const AUDIENCE = 'techaven-storefront';
export const COOKIE_NAME = 'techaven_refresh_v2';
export const COOKIE_PATH = '/api/v2/auth';
export const ACCESS_SECONDS = 900;
export const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export class AuthError extends Error {
  constructor(code, message, status = 400, fields) {
    super(message); this.code = code; this.status = status; this.fields = fields;
  }
}
export function signingSecret() {
  const value = process.env.AUTH_V2_JWT_SECRET;
  if (!value || value.length < 32) throw new AuthError('AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable', 503);
  return value;
}
export const hash = (value) => createHash('sha256').update(value).digest('hex');
export const opaque = () => randomBytes(32).toString('base64url');
export function equalHash(a, b) {
  return typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
export function emailValue(value) {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    throw new AuthError('VALIDATION_ERROR', 'Enter a valid email address', 400, { email: 'Enter a valid email address' });
  }
  return value.trim().toLowerCase();
}
export function passwordValue(value) {
  if (typeof value !== 'string' || value.length < 12 || Buffer.byteLength(value) > 72) {
    throw new AuthError('VALIDATION_ERROR', 'Use a password of at least 12 characters and no more than 72 bytes', 400, { password: 'Use at least 12 characters and no more than 72 bytes' });
  }
  return value;
}
export function requireCustomer(user) {
  if (!user || !user.is_active || user.role !== 'customer') throw new AuthError('ACCOUNT_UNAVAILABLE', 'This account cannot sign in to the customer storefront', 403);
  return user;
}
export function cookieOptions(req) {
  const localHttp = process.env.AUTH_V2_ALLOW_HTTP === 'true' &&
    req?.headers?.origin?.startsWith('http://') && originAllowed(req.headers.origin);
  return { httpOnly: true, secure: !localHttp, sameSite: 'lax', path: COOKIE_PATH };
}
export function readRefreshCookie(req) {
  const part = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE_NAME}=`));
  return part ? part.slice(COOKIE_NAME.length + 1) : null;
}
export function originAllowed(origin) {
  return !!origin && (process.env.AUTH_V2_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).includes(origin);
}
