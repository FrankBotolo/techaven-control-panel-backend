import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as OrderController from '../controllers/OrderController.js';
import * as DisputeController from '../controllers/DisputeController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', OrderController.createOrder);
router.get('/', OrderController.getOrders);
router.get('/:order_id', OrderController.getOrder);
router.post('/:order_id/pay/wallet', OrderController.payWithWallet);
router.post('/:order_id/pay/malipo', OrderController.payWithMalipo);
router.post('/:order_id/cancel', OrderController.cancelOrder);
router.post('/:order_id/payment/complete', OrderController.completePayment);
router.post('/:order_id/delivery/confirm', OrderController.confirmDelivery);
router.patch('/:order_id/status', OrderController.updateOrderStatus);

router.post('/:order_id/disputes', DisputeController.openDispute);
router.get('/:order_id/disputes', DisputeController.getDisputeStatus);

export default router;









