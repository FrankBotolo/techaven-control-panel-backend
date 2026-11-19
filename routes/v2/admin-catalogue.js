import express from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';
import * as controller from '../../controllers/V2AdminCatalogueController.js';

const router = express.Router();
router.use(authenticate, authorizeRoles('admin'));
router.get('/brands', controller.listBrands);
router.post('/brands', controller.createBrand);
router.patch('/brands/:id', controller.updateBrand);
router.get('/devices', controller.listDevices);
router.post('/devices', controller.createDevice);
router.patch('/devices/:id', controller.updateDevice);
router.get('/variants', controller.listVariants);
router.post('/variants', controller.createVariant);
router.patch('/variants/:id', controller.updateVariant);
router.get('/colors', controller.listColors);
router.post('/colors', controller.createColor);
router.patch('/colors/:id', controller.updateColor);
router.delete('/colors/:id', controller.deleteColor);
router.post('/variants/:id/colors', controller.assignColor);
router.delete('/variants/:id/colors/:assignmentId', controller.deleteColorAssignment);
router.get('/media', controller.listMedia);
router.post('/media', controller.createMedia);
router.patch('/media/:id', controller.updateMedia);
router.delete('/media/:id', controller.deleteMedia);
router.delete('/:resource/:id', controller.deactivate);

export default router;
