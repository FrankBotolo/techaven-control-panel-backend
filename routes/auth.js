import express from 'express';
import * as AuthController from '../controllers/AuthController.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.post('/register', AuthController.register);
router.post(
  '/register-seller',
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'business_license', maxCount: 1 },
    { name: 'id_document', maxCount: 3 }
  ]),
  AuthController.registerSeller
);
router.post('/login', AuthController.login);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/resend-otp', AuthController.resendOtp);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', AuthController.logout);

export default router;

