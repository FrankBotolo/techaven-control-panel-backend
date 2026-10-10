import express from 'express';
import adminCatalogueRoutes from './admin-catalogue.js';
import sellerListingRoutes from './seller-listings.js';
import productRequestRoutes from './product-requests.js';
import catalogueRoutes from './catalogue.js';
import marketplaceRoutes from './marketplace.js';
import cartRoutes from './cart.js';
import orderRoutes from './orders.js';

const router = express.Router();
router.use('/admin/catalog', adminCatalogueRoutes);
router.use('/sellers', sellerListingRoutes);
router.use('/catalog/product-requests', productRequestRoutes);
router.use('/catalog', catalogueRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);

export default router;
