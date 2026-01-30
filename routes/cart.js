import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as CartController from '../controllers/CartController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', CartController.getCart);
router.post('/', CartController.addToCart);
router.put('/:id', CartController.updateCartItem);
router.delete('/:id', CartController.removeFromCart);
router.delete('/', CartController.clearCart);

export default router;



