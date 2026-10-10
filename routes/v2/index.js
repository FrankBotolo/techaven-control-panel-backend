import express from 'express';
import adminCatalogueRoutes from './admin-catalogue.js';

const router = express.Router();
router.use('/admin/catalog', adminCatalogueRoutes);

export default router;
