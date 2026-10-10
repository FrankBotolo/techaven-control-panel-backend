import express from 'express';
import adminCatalogueRoutes from './admin-catalogue.js';
import sellerListingRoutes from './seller-listings.js';
import productRequestRoutes from './product-requests.js';
import catalogueRoutes from './catalogue.js';
import marketplaceRoutes from './marketplace.js';

const router = express.Router();
router.use('/admin/catalog', adminCatalogueRoutes);
router.use('/sellers', sellerListingRoutes);
router.use('/catalog/product-requests', productRequestRoutes);
router.use('/catalog', catalogueRoutes);
router.use('/marketplace', marketplaceRoutes);

export default router;
