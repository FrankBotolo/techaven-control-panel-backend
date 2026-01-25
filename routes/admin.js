import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import * as AdminShopController from '../controllers/AdminShopController.js';
import * as AdminCategoryController from '../controllers/AdminCategoryController.js';
import * as AdminUserController from '../controllers/AdminUserController.js';
import * as DashboardController from '../controllers/DashboardController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('admin'));

// Shops
router.get('/shops', AdminShopController.listShops);
router.post('/shops', AdminShopController.createShop);
router.patch('/shops/:shopId', AdminShopController.updateShop);
router.delete('/shops/:shopId', AdminShopController.deleteShop);
router.post('/shops/:shopId/assign-owner', AdminShopController.assignOwner);
router.post('/shops/:shopId/invite-owner', AdminShopController.inviteOwner);

// Categories
router.get('/categories/pending', AdminCategoryController.listPending);
router.get('/categories/rejected', AdminCategoryController.listRejected);
router.get('/categories/approved', AdminCategoryController.listApproved);
router.post('/categories/:categoryId/approve', AdminCategoryController.approveCategory);

// Users
router.get('/users', AdminUserController.listUsers);
router.get('/users/:userId', AdminUserController.getUser);

// Dashboard
router.get('/dashboard', DashboardController.getDashboard);

export default router;


