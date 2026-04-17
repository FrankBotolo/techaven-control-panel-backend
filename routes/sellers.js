import express from 'express';
import { authenticate, authorizeRoles, requireApprovedSeller, requireShopOwnerForShopParam } from '../middleware/auth.js';
import * as SellerCategoryController from '../controllers/SellerCategoryController.js';
import * as SellerProductController from '../controllers/SellerProductController.js';
import * as SellerDashboardController from '../controllers/SellerDashboardController.js';
import * as SellerEarningsController from '../controllers/SellerEarningsController.js';
import * as SellerOnboardingController from '../controllers/SellerOnboardingController.js';
import * as SellerOrderController from '../controllers/SellerOrderController.js';
import * as SellerSubscriptionController from '../controllers/SellerSubscriptionController.js';
import * as SellerShopFollowController from '../controllers/SellerShopFollowController.js';
import * as SellerShopController from '../controllers/SellerShopController.js';

const router = express.Router();
const shopOwner = requireShopOwnerForShopParam('shopId');

router.use(authenticate);
router.use(authorizeRoles('seller'));

// Onboarding status endpoint - accessible even while shop is pending approval
router.get('/status', SellerOnboardingController.getStatus);

// All routes below require approved shop
router.use(requireApprovedSeller);

// Orders - accept or reject new orders (must be before :shopId routes)
router.get('/orders', SellerOrderController.listSellerOrders);
router.post('/orders/:order_id/accept', SellerOrderController.acceptOrder);
router.post('/orders/:order_id/reject', SellerOrderController.rejectOrder);

// Dashboard
router.get('/dashboard', SellerDashboardController.getDashboard);

// Earnings & balance (available vs pending escrow; withdraw only after escrow release)
router.get('/earnings', SellerEarningsController.getEarnings);
router.post('/withdraw', SellerEarningsController.requestWithdrawal);
router.get('/withdrawals', SellerEarningsController.getWithdrawals);

// Subscription (shop must match authenticated seller)
router.get('/:shopId/subscription', shopOwner, SellerSubscriptionController.getCurrent);
router.post('/:shopId/subscription/subscribe', shopOwner, SellerSubscriptionController.subscribe);
router.post('/:shopId/subscription/pay/paychangu', shopOwner, SellerSubscriptionController.payWithPayChangu);
router.post('/:shopId/subscription/cancel', shopOwner, SellerSubscriptionController.cancel);
router.post('/:shopId/subscription/resume', shopOwner, SellerSubscriptionController.resume);

// Shop followers (seller must own :shopId)
router.get('/:shopId/followers', shopOwner, SellerShopFollowController.listFollowers);

// Shop profile / storefront details (seller must own :shopId)
router.patch('/:shopId/shop', shopOwner, SellerShopController.updateMyShop);

// Category routes (sellers only list admin-created categories to select when adding products)
router.get('/:shopId/categories', SellerCategoryController.listForShop);

// Product routes
router.get('/:shopId/products', SellerProductController.listForShop);
router.post('/:shopId/products', SellerProductController.create);
router.patch('/:shopId/products/:productId', SellerProductController.update);
router.delete('/:shopId/products/:productId', SellerProductController.remove);

export default router;


