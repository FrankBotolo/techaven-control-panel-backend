import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as OrderController from '../controllers/OrderController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/checkout', OrderController.checkout);
router.get('/', OrderController.getOrders);
router.get('/:id', OrderController.getOrder);
router.patch('/:id/status', OrderController.updateOrderStatus);
router.post('/:id/cancel', OrderController.cancelOrder);

export default router;



