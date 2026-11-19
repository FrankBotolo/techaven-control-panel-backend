import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as PaymentMethodController from '../controllers/PaymentMethodController.js';

const router = express.Router();

router.use(authenticate);
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

router.get('/', PaymentMethodController.getPaymentMethods);
router.post('/', PaymentMethodController.addPaymentMethod);
router.delete('/:payment_method_id', PaymentMethodController.deletePaymentMethod);

export default router;

