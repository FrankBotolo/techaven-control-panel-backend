import express from 'express';
import adminCatalogueRoutes from './admin-catalogue.js';
import sellerListingRoutes from './seller-listings.js';
import productRequestRoutes from './product-requests.js';

const router = express.Router();
router.use('/admin/catalog', adminCatalogueRoutes);
router.use('/sellers', sellerListingRoutes);
router.use('/catalog/product-requests', productRequestRoutes);

export default router;
