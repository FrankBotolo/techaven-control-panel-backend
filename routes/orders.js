import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as OrderController from '../controllers/OrderController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', OrderController.createOrder);
router.get('/', OrderController.getOrders);
router.get('/:order_id', OrderController.getOrder);
router.post('/:order_id/cancel', OrderController.cancelOrder);

export default router;









