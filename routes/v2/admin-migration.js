import express from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';
import * as controller from '../../controllers/V2AdminMigrationController.js';

const router = express.Router();
router.use(authenticate, authorizeRoles('admin'));
router.get('/legacy-mappings', controller.listMappings);
router.patch('/legacy-mappings/:id', controller.reviewMapping);
router.get('/product-requests', controller.listProductRequests);
router.patch('/product-requests/:id', controller.reviewProductRequest);

export default router;
