import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import * as SellerCategoryController from '../controllers/SellerCategoryController.js';
import * as SellerProductController from '../controllers/SellerProductController.js';
import * as SellerDashboardController from '../controllers/SellerDashboardController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('seller'));

// Dashboard
router.get('/dashboard', SellerDashboardController.getDashboard);

// Category routes
router.get('/:shopId/categories', SellerCategoryController.listForShop);
router.post('/:shopId/categories', SellerCategoryController.create);

// Product routes
router.get('/:shopId/products', SellerProductController.listForShop);
router.post('/:shopId/products', SellerProductController.create);
router.patch('/:shopId/products/:productId', SellerProductController.update);
router.delete('/:shopId/products/:productId', SellerProductController.remove);

export default router;


