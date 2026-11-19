import express from 'express';
import { authenticateCommerceSync } from '../../middleware/commerceSyncAuth.js';
import * as controller from '../../controllers/V2PromotionSyncController.js';

const router = express.Router();
router.use(authenticateCommerceSync);
router.get('/devices', controller.devices);
router.get('/shops', controller.shops);
export default router;
