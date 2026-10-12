import * as customers from '../../services/auth/customers.js';
import { authenticateV2, rotateSession, revokeSession, userDto } from '../../services/auth/sessions.js';
import { AuthError, COOKIE_NAME, cookieOptions, readRefreshCookie } from '../../services/auth/config.js';

export const handle = (action) => async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const value = await action(req);
    if (value?.refresh) res.cookie(COOKIE_NAME, value.refresh, { ...cookieOptions(req), expires: new Date(value.expiresAt) });
    if (req.path === '/logout' || req.path === '/reset-password') res.clearCookie(COOKIE_NAME, cookieOptions(req));
    return res.json({ success: true, message: value?.message || 'Success', data: value?.payload || value || null });
  } catch (error) {
    if (error.code === 'SESSION_INVALID') res.clearCookie(COOKIE_NAME, cookieOptions(req));
    if (!(error instanceof AuthError)) console.error('Auth v2 operation failed:', error.name);
    const known = error instanceof AuthError;
    return res.status(known ? error.status : 503).json({ success: false, code: known ? error.code : 'AUTH_UNAVAILABLE', message: known ? error.message : 'Authentication is temporarily unavailable', ...(error.fields ? { fields: error.fields } : {}), data: null });
  }
};
export const register = handle(req => customers.registerCustomer(req.body));
export const login = handle(req => customers.loginCustomer(req.body));
export const verifyOtp = handle(req => customers.verifySignup(req.body));
export const resendOtp = handle(req => {
  if (!['signup', 'password_reset'].includes(req.body.type)) throw new AuthError('VALIDATION_ERROR', 'Choose a supported verification type');
  return customers.requestCode(req.body, req.body.type);
});
export const forgotPassword = handle(req => customers.requestCode(req.body, 'password_reset'));
export const resetPassword = handle(req => customers.resetCustomerPassword(req.body));
export const googleChallenge = handle(() => customers.googleChallenge());
export const google = handle(req => customers.googleCustomer(req.body));
export const googleLink = handle(req => customers.linkGoogleCustomer(req.body));
export const refresh = handle(req => rotateSession(readRefreshCookie(req)));
export const logout = handle(async req => { await revokeSession(readRefreshCookie(req)); return null; });
export const me = handle(async req => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  const { user } = await authenticateV2(token);
  return userDto(user);
});
