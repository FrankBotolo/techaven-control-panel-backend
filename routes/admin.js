import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import * as AdminShopController from '../controllers/AdminShopController.js';
import * as AdminCategoryController from '../controllers/AdminCategoryController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('admin'));

// Shops
router.get('/shops', AdminShopController.listShops);
router.post('/shops', AdminShopController.createShop);
router.patch('/shops/:shopId', AdminShopController.updateShop);
router.delete('/shops/:shopId', AdminShopController.deleteShop);
router.post('/shops/:shopId/invite-owner', AdminShopController.inviteOwner);

// Categories
router.get('/categories/pending', AdminCategoryController.listPending);
router.post('/categories/:categoryId/approve', AdminCategoryController.approveCategory);

export default router;


