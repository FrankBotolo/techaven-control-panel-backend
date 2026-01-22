import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ShopController from '../controllers/ShopController.js';

const router = express.Router();

router.get('/', ShopController.index);
router.get('/owner/:ownerId', ShopController.getByOwner);
router.get('/:id', ShopController.show);
router.get('/:id/products', ShopController.products);
router.patch('/:id', authenticate, ShopController.updateShop);

export default router;

