import express from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import productRoutes from './products.js';
import categoryRoutes from './categories.js';
import shopRoutes from './shops.js';
import bannerRoutes from './banners.js';
import notificationRoutes from './notifications.js';
import adminRoutes from './admin.js';
import sellerRoutes from './sellers.js';
import invitationRoutes from './invitations.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/shops', shopRoutes);
router.use('/banners', bannerRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/sellers', sellerRoutes);
router.use('/invitations', invitationRoutes);

export default router;

