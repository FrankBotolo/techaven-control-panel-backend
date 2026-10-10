import express from 'express';
import * as controller from '../../controllers/V2CatalogueController.js';

const router = express.Router();
router.get('/brands', controller.listBrands);
router.get('/devices', controller.listDevices);
router.get('/devices/:id', controller.getDevice);
router.get('/devices/:id/variants', controller.getVariants);
router.get('/variants/:id', controller.getVariant);
router.get('/variants/:id/colors', controller.getVariantColors);

export default router;
