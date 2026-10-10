import express from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';
import * as controller from '../../controllers/V2AdminCatalogueController.js';

const router = express.Router();
router.use(authenticate, authorizeRoles('admin'));
router.post('/brands', controller.createBrand);
router.patch('/brands/:id', controller.updateBrand);
router.post('/devices', controller.createDevice);
router.patch('/devices/:id', controller.updateDevice);
router.post('/variants', controller.createVariant);
router.patch('/variants/:id', controller.updateVariant);
router.post('/colors', controller.createColor);
router.post('/variants/:id/colors', controller.assignColor);
router.post('/media', controller.createMedia);

export default router;
