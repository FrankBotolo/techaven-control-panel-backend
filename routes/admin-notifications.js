import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import * as AdminNotificationController from '../controllers/AdminNotificationController.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorizeRoles('admin'));

// Get admin notifications with filtering
router.get('/', AdminNotificationController.getAdminNotifications);

// Get admin notification statistics dashboard
router.get('/stats', AdminNotificationController.getAdminNotificationStats);

// Get notifications by category
router.get('/category/:category', AdminNotificationController.getAdminNotificationsByCategory);

// Get urgent/priority notifications
router.get('/urgent', AdminNotificationController.getUrgentNotifications);

export default router;

