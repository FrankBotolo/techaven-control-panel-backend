import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import * as SellerNotificationController from '../controllers/SellerNotificationController.js';

const router = express.Router();

// All routes require authentication and seller role
router.use(authenticate);
router.use(authorizeRoles('seller'));

// Get seller notifications with filtering
router.get('/', SellerNotificationController.getSellerNotifications);

// Get seller notification statistics
router.get('/stats', SellerNotificationController.getSellerNotificationStats);

// Get order-related notifications
router.get('/orders', SellerNotificationController.getSellerOrderNotifications);

// Get payment-related notifications
router.get('/payments', SellerNotificationController.getSellerPaymentNotifications);

export default router;

