import express from 'express';
import * as NotificationController from '../controllers/NotificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Use authenticate middleware for all notification routes
router.use(authenticate);

router.get('/', NotificationController.index);
router.get('/unread-count', NotificationController.unreadCount);
router.post('/read-all', NotificationController.markAllAsRead);
router.post('/:notification_id/read', NotificationController.markAsRead);
router.post('/register-device', NotificationController.registerDevice);
router.delete('/:id', NotificationController.destroy);

export default router;

