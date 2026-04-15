import express from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import * as ShopController from '../controllers/ShopController.js';
import * as ShopFollowController from '../controllers/ShopFollowController.js';

const router = express.Router();

router.get('/', ShopController.index);
router.get('/owner/:ownerId', ShopController.getByOwner);
router.post('/:id/follow', authenticate, ShopFollowController.followShop);
router.delete('/:id/follow', authenticate, ShopFollowController.unfollowShop);
router.get('/:id', optionalAuthenticate, ShopController.show);
router.get('/:id/products', ShopController.products);
router.patch('/:id', authenticate, ShopController.updateShop);

export default router;

