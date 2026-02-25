import express from 'express';
import { authenticate, authorizeRoles, requireApprovedSeller } from '../middleware/auth.js';
import * as SellerCategoryController from '../controllers/SellerCategoryController.js';
import * as SellerProductController from '../controllers/SellerProductController.js';
import * as SellerDashboardController from '../controllers/SellerDashboardController.js';
import * as SellerEarningsController from '../controllers/SellerEarningsController.js';
import * as SellerOnboardingController from '../controllers/SellerOnboardingController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('seller'));

// Onboarding status endpoint - accessible even while shop is pending approval
router.get('/status', SellerOnboardingController.getStatus);

// All routes below require approved shop
router.use(requireApprovedSeller);

// Dashboard
router.get('/dashboard', SellerDashboardController.getDashboard);

// Earnings & balance (available vs pending escrow; withdraw only after escrow release)
router.get('/earnings', SellerEarningsController.getEarnings);
router.post('/withdraw', SellerEarningsController.requestWithdrawal);
router.get('/withdrawals', SellerEarningsController.getWithdrawals);

// Category routes (sellers only list admin-created categories to select when adding products)
router.get('/:shopId/categories', SellerCategoryController.listForShop);

// Product routes
router.get('/:shopId/products', SellerProductController.listForShop);
router.post('/:shopId/products', SellerProductController.create);
router.patch('/:shopId/products/:productId', SellerProductController.update);
router.delete('/:shopId/products/:productId', SellerProductController.remove);

export default router;


