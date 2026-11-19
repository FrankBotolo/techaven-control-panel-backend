import express from 'express';
import * as controller from '../../controllers/V2MarketplaceController.js';

const router = express.Router();
router.get('/devices', controller.listDevices);
router.get('/devices/:id', controller.getDevice);
router.get('/listings/:id', controller.getListing);

export default router;
