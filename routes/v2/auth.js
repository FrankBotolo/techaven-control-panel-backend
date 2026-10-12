import express from 'express';
import * as controller from '../../controllers/v2/AuthController.js';
import { AuthError, originAllowed } from '../../services/auth/config.js';
import { rateLimit } from '../../services/auth/challenges.js';

const router = express.Router();
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method === 'GET' || originAllowed(req.headers.origin)) return next();
  return res.status(403).json({ success: false, code: 'ORIGIN_FORBIDDEN', message: 'This sign-in origin is not allowed', data: null });
});
router.use(async (req, res, next) => {
  try {
    if (req.method === 'POST' && !['/refresh', '/logout'].includes(req.path)) await rateLimit('ip', req.ip, 60, 900);
    next();
  } catch (error) {
    res.status(error instanceof AuthError ? error.status : 503).json({ success: false, code: error.code || 'AUTH_UNAVAILABLE', message: error instanceof AuthError ? error.message : 'Authentication is temporarily unavailable', data: null });
  }
});
router.get('/me', controller.me);
router.post('/google/challenge', controller.googleChallenge);
router.post('/google/link', controller.googleLink);
router.post('/google', controller.google);
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/verify-otp', controller.verifyOtp);
router.post('/resend-otp', controller.resendOtp);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
export default router;
