import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import * as AdminShopController from '../controllers/AdminShopController.js';
import * as AdminCategoryController from '../controllers/AdminCategoryController.js';
import * as AdminProductController from '../controllers/AdminProductController.js';
import * as DashboardController from '../controllers/DashboardController.js';
import * as OrderController from '../controllers/OrderController.js';
import * as AdminWithdrawalController from '../controllers/AdminWithdrawalController.js';
import * as AdminCourierController from '../controllers/AdminCourierController.js';
import * as AdminMalipoController from '../controllers/AdminMalipoController.js';
import * as AdminOnboardingSlideController from '../controllers/AdminOnboardingSlideController.js';
import * as AdminBannerController from '../controllers/AdminBannerController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('admin'));

// Shops
router.get('/shops', AdminShopController.listShops);
router.post('/shops', AdminShopController.createShop);
router.patch('/shops/:shopId', AdminShopController.updateShop);
router.delete('/shops/:shopId', AdminShopController.deleteShop);
router.post('/shops/:shopId/invite-owner', AdminShopController.inviteOwner);
router.post('/shops/:shopId/approve', AdminShopController.approveShopApplication);
router.post('/shops/:shopId/reject', AdminShopController.rejectShopApplication);

// Categories (admin creates and manages; sellers only select when adding products)
router.get('/categories', AdminCategoryController.listAll);
router.post('/categories', AdminCategoryController.createCategory);
router.patch('/categories/:categoryId', AdminCategoryController.updateCategory);
router.get('/categories/pending', AdminCategoryController.listPending);
router.get('/categories/rejected', AdminCategoryController.listRejected);
router.get('/categories/approved', AdminCategoryController.listApproved);
router.post('/categories/:categoryId/approve', AdminCategoryController.approveCategory);
router.post('/categories/:categoryId/reject', AdminCategoryController.rejectCategory);
router.delete('/categories/:categoryId', AdminCategoryController.deleteCategory);

// Products
router.delete('/products/:productId', AdminProductController.deleteProduct);

// Dashboard
router.get('/dashboard', DashboardController.getDashboard);

// Orders - Admin can view all orders and manage delivery
router.get('/orders', OrderController.getAllOrdersAdmin);
router.patch('/orders/:id/status', OrderController.updateOrderStatus);

// Courier services - Admin manages courier options for customer checkout
router.get('/courier-services', AdminCourierController.listCourierServices);
router.post('/courier-services', AdminCourierController.createCourierService);
router.patch('/courier-services/:id', AdminCourierController.updateCourierService);
router.delete('/courier-services/:id', AdminCourierController.deleteCourierService);

// Malipo transactions - View all Malipo payment webhooks and status
router.get('/malipo-transactions', AdminMalipoController.listMalipoTransactions);

// Onboarding slides - CRUD for app onboarding carousel
router.get('/onboarding-slides', AdminOnboardingSlideController.list);
router.get('/onboarding-slides/:id', AdminOnboardingSlideController.getOne);
router.post('/onboarding-slides', AdminOnboardingSlideController.create);
router.patch('/onboarding-slides/:id', AdminOnboardingSlideController.update);
router.delete('/onboarding-slides/:id', AdminOnboardingSlideController.remove);

// Banners - CRUD for homepage carousel
router.get('/banners', AdminBannerController.list);
router.get('/banners/:id', AdminBannerController.getOne);
router.post('/banners', AdminBannerController.create);
router.patch('/banners/:id', AdminBannerController.update);
router.delete('/banners/:id', AdminBannerController.remove);

// Withdrawals - Process seller withdrawal requests (approve/reject)
router.get('/withdrawals', AdminWithdrawalController.listWithdrawals);
router.get('/withdrawals/:id', AdminWithdrawalController.getWithdrawal);
router.patch('/withdrawals/:id', AdminWithdrawalController.processWithdrawal);

export default router;


